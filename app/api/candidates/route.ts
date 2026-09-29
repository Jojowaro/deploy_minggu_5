import { NextRequest, NextResponse } from 'next/server';
import { 
  getCandidatesWithJobs, 
  insertCandidate, 
  updateCandidateStatusAndLog,
  getActiveJobPostId 
} from '@/app/squad-d2/src/lib/supabaseServer';
import { CandidateStatus, normalizeRegistrationWay } from '@/app/squad-d2/src/types/candidate';

/**
 * GET /api/candidates
 * Mengambil seluruh kandidat pelamar beserta relasi lowongan pekerjaan
 * Query param: ?status=applied|assessment|interview|offered|rejected (opsional)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status');

    let candidates = await getCandidatesWithJobs();

    if (statusFilter) {
      candidates = candidates.filter(
        (c) => c.status.toLowerCase() === statusFilter.toLowerCase()
      );
    }

    return NextResponse.json(
      {
        success: true,
        count: candidates.length,
        data: candidates,
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal mengambil data kandidat';
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/candidates
 * Menyimpan data pelamar baru secara langsung via JSON payload
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      job_id,
      full_name,
      email,
      phone_number,
      registration_way = 'scouting',
      cv_file_path = 'resumes/manual-upload.pdf',
      stage = 'screening',
      status = 'applied',
    } = body;

    if (!full_name || !email) {
      return NextResponse.json(
        { success: false, message: 'Field full_name dan email wajib diisi.' },
        { status: 400 }
      );
    }

    const validJobId = await getActiveJobPostId(job_id);
    const validRegistrationWay = normalizeRegistrationWay(registration_way);

    const result = await insertCandidate({
      job_id: validJobId,
      full_name: String(full_name).trim(),
      email: String(email).trim().toLowerCase(),
      phone_number: phone_number ? String(phone_number).trim() : null,
      registration_way: validRegistrationWay,
      cv_file_path,
      stage,
      status,
    });

    if (result.error) {
      return NextResponse.json(
        { success: false, message: result.error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Kandidat berhasil ditambahkan.',
        data: result.data,
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal memproses data kandidat';
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/candidates
 * Memperbarui status kandidat (Kanban) dan mencatat Immutable Audit Log
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      candidateId,
      newStatus,
      oldStatus = 'applied',
      actorName = 'Budi Santoso (HR)',
      reason,
      isNotEligible = false,
    } = body;

    if (!candidateId || !newStatus) {
      return NextResponse.json(
        { success: false, message: 'candidateId dan newStatus wajib diisi.' },
        { status: 400 }
      );
    }

    let finalReason = reason;
    if (newStatus === 'rejected') {
      if (isNotEligible) {
        finalReason = `Not Eligible: ${reason || 'Permanent rejection recorded via API'}`;
      } else if (!reason) {
        finalReason = 'Moved to Rejected status via API';
      }
    }

    const result = await updateCandidateStatusAndLog({
      candidateId,
      newStatus: newStatus as CandidateStatus,
      oldStatus,
      actorName,
      reason: finalReason,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.error || 'Gagal memperbarui status kandidat.' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: `Status kandidat berhasil diubah ke ${newStatus}.`,
        data: result.candidate,
        auditLogId: result.auditLogId,
        latencyMs: result.latencyMs,
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal memperbarui status kandidat';
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
}
