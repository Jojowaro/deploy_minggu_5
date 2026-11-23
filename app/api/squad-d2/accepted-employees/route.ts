import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseUrl, getSupabaseKey } from '@/app/squad-d2/src/lib/supabaseServer';

export const dynamic = 'force-dynamic';

/**
 * GET /api/squad-d2/accepted-employees
 * Specification: Definition Of Done Item 5
 * Target View: v_d2_accepted_employees (with fallback to d2_accepted_employees)
 * Consumed by: Squad D3 (Employee Management) & Internal HRMS
 */
export async function GET(request: NextRequest) {
  try {
    const baseUrl = getSupabaseUrl().replace(/\/$/, '');
    const supabaseKey = getSupabaseKey();
    const { searchParams } = new URL(request.url);
    const candidateId = searchParams.get('candidateId');
    const employeeId = searchParams.get('employeeId');

    // 1. Try querying v_d2_accepted_employees first
    let viewEndpoint = `${baseUrl}/rest/v1/v_d2_accepted_employees?select=*&order=accepted_at.desc`;
    if (candidateId) {
      viewEndpoint += `&candidate_id=eq.${encodeURIComponent(candidateId)}`;
    }
    if (employeeId) {
      viewEndpoint += `&generated_user_id=eq.${encodeURIComponent(employeeId)}`;
    }

    let res = await fetch(viewEndpoint, {
      headers: {
        Authorization: `Bearer ${supabaseKey}`,
        apikey: supabaseKey,
      },
      cache: 'no-store',
    });

    // 2. Fallback to d2_accepted_employees if v_d2_accepted_employees alias is not yet executed in DB
    if (!res.ok && res.status === 404) {
      let fallbackEndpoint = `${baseUrl}/rest/v1/d2_accepted_employees?select=*&order=accepted_at.desc`;
      if (candidateId) {
        fallbackEndpoint += `&candidate_id=eq.${encodeURIComponent(candidateId)}`;
      }
      if (employeeId) {
        fallbackEndpoint += `&generated_user_id=eq.${encodeURIComponent(employeeId)}`;
      }

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
          message: `Failed to query accepted employees view (${res.status}): ${errText}`,
        },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(
      {
        success: true,
        count: Array.isArray(data) ? data.length : 0,
        view: 'v_d2_accepted_employees',
        data,
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
