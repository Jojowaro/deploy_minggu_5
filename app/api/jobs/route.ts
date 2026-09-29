import { NextRequest, NextResponse } from 'next/server';
import { getActiveJobPosts, getJobPostById } from '@/app/squad-d2/src/lib/supabaseServer';

/**
 * GET /api/jobs
 * Mengambil daftar lowongan kerja aktif atau spesifik berdasarkan ID
 * Query param: ?id=<job-id> (opsional)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      const job = await getJobPostById(id);
      if (!job) {
        return NextResponse.json(
          { success: false, message: `Lowongan kerja dengan ID ${id} tidak ditemukan.` },
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
    const message = error instanceof Error ? error.message : 'Terjadi kesalahan server';
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
}
