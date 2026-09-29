import { NextRequest, NextResponse } from 'next/server';
import { getAuditLogs } from '@/app/squad-d2/src/lib/supabaseServer';

/**
 * GET /api/audit-logs
 * Mengambil riwayat immutable audit trail perpindahan status kandidat
 * Query params:
 * - ?candidateId=<id> (opsional, memfilter log untuk kandidat tertentu)
 * - ?limit=<number> (opsional, batas jumlah log yang ditarik, default 50)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const candidateId = searchParams.get('candidateId') || undefined;
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 50;

    const logs = await getAuditLogs(candidateId, isNaN(limit) ? 50 : limit);

    return NextResponse.json(
      {
        success: true,
        count: logs.length,
        data: logs,
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal mengambil audit trail';
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
}
