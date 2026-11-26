import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseUrl, getSupabaseKey } from '@/app/squad-d2/src/lib/supabaseServer';

export const dynamic = 'force-dynamic';

/**
 * GET /api/squad-d2/applications
 * Specification: Restrukturisasi Skema Multi-Posisi & Relasi One-to-Many (Squad D2)
 * Acceptance Criteria 1: Pemisahan profil d2_candidates dan lamaran d2_applications
 * Target View: d2_applications / v_d2_applications (dengan fallback ke d2_application_history)
 */
export async function GET(request: NextRequest) {
  try {
    const baseUrl = getSupabaseUrl().replace(/\/$/, '');
    const supabaseKey = getSupabaseKey();
    const { searchParams } = new URL(request.url);

    const candidateId = searchParams.get('candidateId') || searchParams.get('candidate_id');
    const jobId = searchParams.get('jobId') || searchParams.get('job_id');
    const status = searchParams.get('status');
    const email = searchParams.get('email');

    // Build filter query
    const filters: string[] = ['is_deleted=neq.true'];
    if (candidateId) filters.push(`candidate_id=eq.${encodeURIComponent(candidateId)}`);
    if (jobId) filters.push(`job_id=eq.${encodeURIComponent(jobId)}`);
    if (status) filters.push(`status=eq.${encodeURIComponent(status)}`);
    if (email) filters.push(`email=eq.${encodeURIComponent(email)}`);

    const queryStr = filters.join('&');

    // 1. Try querying d2_applications view first
    let viewEndpoint = `${baseUrl}/rest/v1/d2_applications?${queryStr}&order=application_date.desc`;
    let res = await fetch(viewEndpoint, {
      headers: {
        Authorization: `Bearer ${supabaseKey}`,
        apikey: supabaseKey,
      },
      cache: 'no-store',
    });

    // 2. Fallback to v_d2_applications or d2_application_history if view is not yet executed in DB
    if (!res.ok && (res.status === 404 || res.status === 400)) {
      const fallbackEndpoint = `${baseUrl}/rest/v1/d2_application_history?${queryStr}&order=application_date.desc`;
      res = await fetch(fallbackEndpoint, {
        headers: {
          Authorization: `Bearer ${supabaseKey}`,
          apikey: supabaseKey,
        },
        cache: 'no-store',
      });
    }

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json(
        {
          success: false,
          message: `Gagal mengambil data lamaran (${res.status}): ${errText}`,
        },
        { status: res.status }
      );
    }

    const rawData = await res.json();
    const formattedData = Array.isArray(rawData)
      ? rawData.map((item: any) => ({
          application_id: item.application_id || item.id,
          id: item.id,
          candidate_id: item.candidate_id,
          full_name: item.full_name,
          email: item.email,
          nik: item.nik,
          phone_number: item.phone_number,
          job_id: item.job_id,
          job_title: item.job_title,
          application_date: item.application_date,
          application_round: item.application_round || 1,
          status: item.status,
          rejected_at_stage: item.rejected_at_stage || null,
          employee_user_id: item.employee_user_id || item.generated_user_id || null,
          initial_level: item.initial_level || item.employment_type || null,
          is_deleted: item.is_deleted || false,
          created_at: item.created_at,
        }))
      : [];

    return NextResponse.json(
      {
        success: true,
        count: formattedData.length,
        data: formattedData,
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
