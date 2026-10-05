import { NextRequest, NextResponse } from 'next/server';
import { getActiveJobPosts, getJobPostById } from '@/app/squad-d2/src/lib/supabaseServer';

export const dynamic = 'force-dynamic';

/**
 * GET /api/squad-d2/jobs
 * Mengambil daftar lowongan kerja aktif dari tabel Supabase d1_job_positions
 * atau data posisi spesifik jika query ?id=<job-id> disertakan.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      const job = await getJobPostById(id);
      if (!job) {
        return NextResponse.json(
          { success: false, message: `Posisi pekerjaan dengan ID ${id} tidak ditemukan.` },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, data: job }, { status: 200 });
    }

    const jobs = await getActiveJobPosts();
    return NextResponse.json(
      {
        success: true,
        count: jobs.length,
        data: jobs,
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Terjadi kesalahan server saat mengambil data posisi';
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
}
