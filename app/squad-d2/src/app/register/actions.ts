'use server';

import { headers } from 'next/headers';
import { 
  CandidateSubmissionResult, 
  normalizeRegistrationWay 
} from '../../types/candidate';
import { 
  uploadApplicantCv, 
  insertCandidate, 
  getActiveJobPostId 
} from '../../lib/supabaseServer';

// ==============================================================================
// 1. In-Memory Rate Limiter (TR-D2-001 TR-07: 10 req / IP / minute)
// ==============================================================================
interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitRecord>();

function checkRateLimit(ip: string, limit = 10, windowMs = 60 * 1000): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (record.count >= limit) {
    return false;
  }

  record.count += 1;
  return true;
}

// ==============================================================================
// 2. XSS Sanitization & Input Cleaner (TR-D2-001 TR-08)
// ==============================================================================
function sanitizeText(input: string): string {
  if (!input) return '';
  return input
    .replace(/<[^>]*>/g, '') // Strip HTML tags
    .replace(/[<>'"&]/g, (char) => {
      switch (char) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case "'": return '&#39;';
        case '"': return '&quot;';
        case '&': return '&amp;';
        default: return char;
      }
    })
    .trim();
}

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

// ==============================================================================
// 3. Server Action: Submit Multi-Track Candidate Registration (FR-D2-001)
// ==============================================================================
export async function submitCandidateRegistration(
  formData: FormData
): Promise<CandidateSubmissionResult> {
  const actionStartTime = Date.now();

  try {
    // A. Rate Limiting Check (TR-07)
    const headerList = await headers();
    const forwardedFor = headerList.get('x-forwarded-for');
    const realIp = headerList.get('x-real-ip');
    const clientIp = (forwardedFor ? forwardedFor.split(',')[0].trim() : realIp) || '127.0.0.1';

    if (!checkRateLimit(clientIp, 10, 60 * 1000)) {
      return {
        success: false,
        message: 'There are too many registration requests from your network. The maximum limit is 10 registrations per minute.',
        errors: {
          rateLimit: ['Rate limit exceeded (10 requests/minute). Please try again later']
        },
      };
    }

    // B. Extract Form Fields
    const rawFullName = formData.get('fullName') as string | null;
    const rawEmail = formData.get('email') as string | null;
    const rawPhoneNumber = formData.get('phoneNumber') as string | null;
    const rawRegistrationWay = formData.get('registrationWay') as string | null;
    const rawJobId = formData.get('jobId') as string | null;
    const cvFile = formData.get('cvFile') as File | null;

    const errors: Record<string, string[]> = {};

    // C. Validation: Full Name (VR-01.2 & TR-08)
    const fullName = sanitizeText(rawFullName || '');
    if (!fullName) {
      errors.fullName = ['Full Name must be filled!'];
    } else if (fullName.length < 2) {
      errors.fullName = ['Full name must be at least 2 characters!'];
    } else if (fullName.length > 255) {
      errors.fullName = ['Your full name cannot exceed 255 characters!'];
    }

    // D. Validation: Email (VR-01.3)
    const email = (rawEmail || '').trim().toLowerCase();
    if (!email) {
      errors.email = ['Email must be filled.'];
    } else if (!EMAIL_REGEX.test(email) || email.length > 255) {
      errors.email = ['The email format is invalid'];
    }

    // E. Validation: Registration Way (VR-01.1)
    if (!rawRegistrationWay) {
      errors.registrationWay = ['Please select an application track (Scouting or Recommendation).'];
    }
    const dbRegistrationWay = normalizeRegistrationWay(rawRegistrationWay || '');

    // F. Validation: CV File Upload (FR-01.3, TR-05)
    if (!cvFile || typeof cvFile !== 'object' || !(cvFile instanceof Blob) || cvFile.size === 0) {
      errors.cvFile = ['Curriculum Vitae (PDF) must be uploaded'];
    } else {
      const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
      if (cvFile.size > MAX_SIZE) {
        errors.cvFile = ['The CV file size exceeds the 5 MB limit.'];
      }

      const fileName = cvFile.name || '';
      if (!fileName.toLowerCase().endsWith('.pdf') && cvFile.type !== 'application/pdf') {
        errors.cvFile = ['Invalid file format. The resume must be in .pdf format.'];
      }
    }

    // Return early if any validation failed
    if (Object.keys(errors).length > 0) {
      return {
        success: false,
        message: 'There is an error in the form you submitted. Please double-check the fields marked in red.',
        errors,
      };
    }

    // G. Verify CV Magic Bytes (%PDF-)
    const fileArrayBuffer = await (cvFile as File).arrayBuffer();
    const headerBytes = new Uint8Array(fileArrayBuffer.slice(0, 5));
    const headerString = String.fromCharCode(...headerBytes);
    if (!headerString.startsWith('%PDF-')) {
      return {
        success: false,
        message: 'The uploaded file is not a valid PDF or is corrupted.',
        errors: {
          cvFile: ['The file header signature does not match the original PDF specifications.']
        },
      };
    }

    // H. Target Lowongan Kerja Aktif (FR-01.2, VR-01.4)
    const validJobId = await getActiveJobPostId(rawJobId || undefined);

    // I. Secure File Upload dengan Pengacakan UUID v4 (TR-05, TR-06)
    const fileUuid = crypto.randomUUID();
    const storagePath = `resumes/${fileUuid}.pdf`;

    const uploadResult = await uploadApplicantCv(storagePath, fileArrayBuffer, 'application/pdf');
    if (uploadResult.error) {
      console.error('[Squad D2 ServerAction] CV Upload error:', uploadResult.error);
      return {
        success: false,
        message: `Failed to upload the resume file to storage: ${uploadResult.error.message}`,
      };
    }

    // J. Database Record Insertion (FR-01.6, TR-01, TR-02)
    const insertResult = await insertCandidate({
      job_id: validJobId,
      full_name: fullName,
      email: email,
      phone_number: rawPhoneNumber ? sanitizeText(rawPhoneNumber) : null,
      registration_way: dbRegistrationWay,
      cv_file_path: uploadResult.data?.path || storagePath,
      stage: 'screening',
      status: 'applied',
    });

    if (insertResult.error) {
      console.error('[Squad D2 ServerAction] Candidate insert error:', insertResult.error);
      return {
        success: false,
        message: `Failed to save candidate data: ${insertResult.error.message}`,
      };
    }

    const elapsedTotal = Date.now() - actionStartTime;
    if (elapsedTotal > 500) {
      console.info(`[Squad D2 TR-05] Total Server Action execution latency: ${elapsedTotal}ms`);
    }

    return {
      success: true,
      message: 'Your application has been successfully submitted! The recruitment team at PT Andima Transportindo will review your application shortly.',
      candidateId: insertResult.data?.id,
      cvFilePath: uploadResult.data?.path,
      timestamp: new Date().toISOString(),
    };

  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown server error';
    console.error('[Squad D2 ServerAction] Unexpected exception during registration:', error);
    return {
      success: false,
      message: `A system issue has occurred on the server: ${errorMsg}`,
    };
  }
}
