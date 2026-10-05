import { NextRequest, NextResponse } from 'next/server';
import { 
  uploadApplicantCv, 
  insertCandidate, 
  getActiveJobPostId 
} from '@/app/squad-d2/src/lib/supabaseServer';
import { 
  CandidateSubmissionResult, 
  normalizeRegistrationWay 
} from '@/app/squad-d2/src/types/candidate';

export const dynamic = 'force-dynamic';

// ==============================================================================
// 1. Rate Limiting Check (10 requests / IP / minute)
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
// 2. Input Sanitization
// ==============================================================================
function sanitizeText(input: string): string {
  if (!input) return '';
  return input
    .replace(/<[^>]*>/g, '')
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

/**
 * POST /api/squad-d2/register
 * Memproses pendaftaran pelamar multi-jalur, upload CV ke Supabase Storage,
 * dan menyimpan profil ke tabel d2_candidates di Supabase.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const actionStartTime = Date.now();

  try {
    // 1. Rate Limiting
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const clientIp = (forwardedFor ? forwardedFor.split(',')[0].trim() : realIp) || '127.0.0.1';

    if (!checkRateLimit(clientIp, 10, 60 * 1000)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Batas pendaftaran tercapai (maksimal 10 pendaftaran per menit dari jaringan Anda). Silakan tunggu sejenak.',
          errors: {
            rateLimit: ['Rate limit exceeded (10 requests/minute).'],
          },
        },
        { status: 429 }
      );
    }

    // 2. Extract Data from Content-Type
    const contentType = request.headers.get('content-type') || '';
    let rawFullName = '';
    let rawEmail = '';
    let rawPhoneNumber = '';
    let rawRegistrationWay = '';
    let rawJobId = '';
    let fileArrayBuffer: ArrayBuffer | null = null;
    let fileName = 'resume.pdf';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      rawFullName = (formData.get('fullName') as string) || '';
      rawEmail = (formData.get('email') as string) || '';
      rawPhoneNumber = (formData.get('phoneNumber') as string) || '';
      rawRegistrationWay = (formData.get('registrationWay') as string) || '';
      rawJobId = (formData.get('jobId') as string) || '';

      const cvFile = formData.get('cvFile') as File | null;
      if (cvFile && typeof cvFile.arrayBuffer === 'function') {
        fileName = cvFile.name || 'resume.pdf';
        fileArrayBuffer = await cvFile.arrayBuffer();
      }
    } else if (contentType.includes('application/json')) {
      const json = await request.json();
      rawFullName = json.fullName || '';
      rawEmail = json.email || '';
      rawPhoneNumber = json.phoneNumber || '';
      rawRegistrationWay = json.registrationWay || '';
      rawJobId = json.jobId || '';

      // Dummy minimal PDF if testing via pure JSON
      const dummyPdfBytes = new Uint8Array([
        0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a, 0x25, 0xd0, 0xd4, 0xc5, 0xd8, 0x0a,
        0x31, 0x20, 0x30, 0x20, 0x6f, 0x62, 0x6a, 0x0a, 0x3c, 0x3c, 0x0a, 0x2f, 0x54, 0x79, 0x70,
        0x65, 0x20, 0x2f, 0x43, 0x61, 0x74, 0x61, 0x6c, 0x6f, 0x67, 0x0a, 0x3e, 0x3e, 0x0a, 0x65,
        0x6e, 0x64, 0x6f, 0x62, 0x6a, 0x0a, 0x25, 0x25, 0x45, 0x4f, 0x46,
      ]);
      fileArrayBuffer = dummyPdfBytes.buffer;
    } else {
      return NextResponse.json(
        {
          success: false,
          message: 'Content-Type harus multipart/form-data atau application/json',
        },
        { status: 415 }
      );
    }

    // 3. Validations
    const errors: Record<string, string[]> = {};
    const fullName = sanitizeText(rawFullName);
    if (!fullName) {
      errors.fullName = ['Nama Lengkap wajib diisi.'];
    } else if (fullName.length < 2) {
      errors.fullName = ['Nama Lengkap minimal 2 karakter.'];
    } else if (fullName.length > 100) {
      errors.fullName = ['Nama Lengkap maksimal 100 karakter.'];
    }

    const email = sanitizeText(rawEmail).toLowerCase();
    if (!email) {
      errors.email = ['Email wajib diisi.'];
    } else if (!EMAIL_REGEX.test(email)) {
      errors.email = ['Format email tidak valid (contoh: nama@domain.com).'];
    } else if (email.length > 255) {
      errors.email = ['Email maksimal 255 karakter.'];
    }

    const dbRegistrationWay = normalizeRegistrationWay(rawRegistrationWay);

    if (!fileArrayBuffer || fileArrayBuffer.byteLength === 0) {
      errors.cvFile = ['File Curriculum Vitae (PDF) wajib diunggah.'];
    } else {
      const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
      if (fileArrayBuffer.byteLength > MAX_SIZE) {
        errors.cvFile = ['Ukuran file PDF melebihi batas maksimal 5 MB.'];
      }

      // Check PDF header signature '%PDF-'
      const headerBytes = new Uint8Array(fileArrayBuffer.slice(0, 5));
      const headerString = String.fromCharCode(...headerBytes);
      if (!headerString.startsWith('%PDF-')) {
        errors.cvFile = ['File yang diunggah bukan file PDF yang valid atau rusak.'];
      }
    }

    if (Object.keys(errors).length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Data formulir tidak valid. Mohon periksa kembali kolom yang diisi.',
          errors,
        },
        { status: 400 }
      );
    }

    // 4. Resolve Active Job ID from d1_job_positions
    const validJobId = await getActiveJobPostId(rawJobId || undefined);

    // 5. Upload Resume to Supabase Storage
    const fileUuid = crypto.randomUUID();
    const storagePath = `resumes/${fileUuid}.pdf`;

    const uploadResult = await uploadApplicantCv(storagePath, fileArrayBuffer!, 'application/pdf');
    if (uploadResult.error) {
      console.error('[Squad D2 API] Storage upload error:', uploadResult.error);
      return NextResponse.json(
        {
          success: false,
          message: `Gagal mengunggah file resume ke storage: ${uploadResult.error.message}`,
        },
        { status: 500 }
      );
    }

    // 6. Insert Candidate into Supabase Database
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
      console.error('[Squad D2 API] Candidate insert error:', insertResult.error);
      return NextResponse.json(
        {
          success: false,
          message: `Gagal menyimpan data kandidat: ${insertResult.error.message}`,
        },
        { status: 400 }
      );
    }

    const elapsedTotal = Date.now() - actionStartTime;

    const result: CandidateSubmissionResult = {
      success: true,
      message: 'Pendaftaran Anda berhasil dikirim! Tim rekrutmen PT Andima Transportindo akan segera meninjau berkas Anda.',
      candidateId: insertResult.data?.id,
      cvFilePath: uploadResult.data?.path,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(result, { status: 201 });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown server error';
    console.error('[Squad D2 API] Exception during candidate registration:', error);
    return NextResponse.json(
      {
        success: false,
        message: `Terjadi kendala sistem pada server: ${errorMsg}`,
      },
      { status: 500 }
    );
  }
}
