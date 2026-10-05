import { NextRequest, NextResponse } from 'next/server';
import { FitProperRequirement, RequirementStatus } from '@/app/squad-d2/src/types/candidate';
import { getSupabaseUrl, getSupabaseKey, updateCandidateStatusAndLog } from '@/app/squad-d2/src/lib/supabaseServer';

export const dynamic = 'force-dynamic';

interface CandidateEvaluationState {
  candidateId: string;
  positionId?: string;
  positionTitle?: string;
  threshold: number; // Percentage, e.g. 80
  requirements: FitProperRequirement[];
  decision?: 'Lolos Fit & Proper' | 'Tolak' | null;
  decisionNotes?: string | null;
  updatedAt: string;
}

// In-memory fallback cache across API calls
const evaluationStore: Map<string, CandidateEvaluationState> = new Map();

const DEFAULT_REQUIREMENT_NAMES = [
  'Leadership',
  'Certification',
  'Experience',
  'Capability',
  'Experience',
];

/**
 * Fetch candidate and cross-schema JOIN data from Squad D1 (d1_job_positions & d1_position_certifications)
 * Specification: FR-D2-003 FR-03.1, TR-D2-002 TR-03 (< 500ms target)
 */
async function getJoinedCandidateAndPosition(candidateId: string) {
  const baseUrl = getSupabaseUrl().replace(/\/$/, '');
  const supabaseKey = getSupabaseKey();

  let candidate: any = null;
  let position: any = null;
  let certifications: any[] = [];

  try {
    // 1. Fetch candidate from d2_candidates
    const candRes = await fetch(
      `${baseUrl}/rest/v1/d2_candidates?id=eq.${encodeURIComponent(candidateId)}&select=*`,
      {
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey,
        },
        cache: 'no-store',
      }
    );

    if (candRes.ok) {
      const candidates = await candRes.json();
      if (candidates && candidates.length > 0) {
        candidate = candidates[0];
      }
    }

    const jobId = candidate?.job_id;
    if (jobId) {
      // 2. Cross-schema query JOIN to Squad D1 tables
      const [posRes, certRes] = await Promise.all([
        fetch(
          `${baseUrl}/rest/v1/d1_job_positions?id=eq.${encodeURIComponent(jobId)}&select=*`,
          {
            headers: {
              'Authorization': `Bearer ${supabaseKey}`,
              'apikey': supabaseKey,
            },
            cache: 'no-store',
          }
        ),
        fetch(
          `${baseUrl}/rest/v1/d1_position_certifications?position_id=eq.${encodeURIComponent(jobId)}&select=*`,
          {
            headers: {
              'Authorization': `Bearer ${supabaseKey}`,
              'apikey': supabaseKey,
            },
            cache: 'no-store',
          }
        ),
      ]);

      if (posRes.ok) {
        const positions = await posRes.json();
        if (positions && positions.length > 0) position = positions[0];
      }

      if (certRes.ok) {
        const certs = await certRes.json();
        if (Array.isArray(certs)) certifications = certs;
      }
    }
  } catch (err) {
    console.warn('[Fit & Proper API] Direct Supabase JOIN query error:', err);
  }

  return { candidate, position, certifications };
}

/**
 * Initialize or get candidate evaluation state
 */
async function getOrCreateCandidateState(candidateId: string): Promise<CandidateEvaluationState> {
  let state = evaluationStore.get(candidateId);
  if (!state) {
    // Fetch live joined data from Supabase D1
    const { candidate, position, certifications } = await getJoinedCandidateAndPosition(candidateId);

    // Build initial requirement list based on D1 certifications and standard dimensions
    const initialNames: string[] = [];

    // Add required certifications from D1
    certifications.forEach((c) => {
      if (c.certification_name) {
        initialNames.push(`Sertifikasi: ${c.certification_name}`);
      }
    });

    // Add standard dimensions (Image 2)
    DEFAULT_REQUIREMENT_NAMES.forEach((name) => {
      if (!initialNames.includes(name)) {
        initialNames.push(name);
      }
    });

    // Ensure we don't have empty list
    const finalNames = initialNames.length > 0 ? initialNames.slice(0, 6) : DEFAULT_REQUIREMENT_NAMES;

    const defaultReqs: FitProperRequirement[] = finalNames.map((name, index) => ({
      id: `req-${candidateId}-${index + 1}-${Date.now() + index}`,
      candidate_id: candidateId,
      name,
      status: null,
      is_deleted: false,
      created_at: new Date(Date.now() - (finalNames.length - index) * 60000).toISOString(),
    }));

    state = {
      candidateId,
      positionId: position?.id || candidate?.job_id,
      positionTitle: position?.nama_posisi || 'Backend Engineer',
      threshold: 80,
      requirements: defaultReqs,
      decision: null,
      decisionNotes: null,
      updatedAt: new Date().toISOString(),
    };
    evaluationStore.set(candidateId, state);
  }
  return state;
}

/**
 * Persist evaluation to Supabase d2_fit_proper_evaluations if table exists
 */
async function tryPersistToSupabase(state: CandidateEvaluationState, calculation: any) {
  const baseUrl = getSupabaseUrl().replace(/\/$/, '');
  const supabaseKey = getSupabaseKey();

  try {
    await fetch(`${baseUrl}/rest/v1/d2_fit_proper_evaluations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates',
      },
      body: JSON.stringify({
        candidate_id: state.candidateId,
        position_id: state.positionId,
        threshold_percentage: state.threshold,
        total_requirements: calculation.totalCount,
        fulfilled_requirements: calculation.fulfilledCount,
        missing_requirements: calculation.missingRequirements,
        overall_match_percentage: calculation.percentage,
        capability_fit_status: calculation.capabilityFit,
        evaluation_details: state.requirements,
        decision: state.decision,
        notes: state.decisionNotes,
        is_deleted: false,
        updated_at: new Date().toISOString(),
      }),
    });
  } catch {
    // Graceful fallback if table not yet created in Supabase
  }
}

/**
 * GET /api/squad-d2/fit-proper?candidateId=...
 * FR-D2-003, Trello DOD: Response time < 500ms, accurate missing requirements algorithm
 */
export async function GET(request: NextRequest) {
  const startTime = performance.now();

  try {
    const { searchParams } = new URL(request.url);
    const candidateId = searchParams.get('candidateId') || 'default-candidate';
    const includeDeleted = searchParams.get('includeDeleted') === 'true';

    const state = await getOrCreateCandidateState(candidateId);

    const filteredReqs = includeDeleted
      ? state.requirements
      : state.requirements.filter((r) => !r.is_deleted);

    // =========================================================================
    // FIT & PROPER CALCULATION ALGORITHM (Trello Card: Target - Penuhi = Missing)
    // =========================================================================
    const activeReqs = state.requirements.filter((r) => !r.is_deleted);
    const totalCount = activeReqs.length;
    const fulfilledCount = activeReqs.filter((r) => r.status === 'Fullfilled').length;
    
    // Algoritma pengurangan sesuai Trello Card:
    // Contoh: Target 10 syarat - pelamar penuhi 7 syarat = simpan angka 3 ke database
    const missingRequirements = Math.max(0, totalCount - fulfilledCount);

    // Overall match percentage
    const percentage = totalCount > 0 ? Math.round((fulfilledCount / totalCount) * 100) : 0;
    const isFit = totalCount > 0 && percentage >= state.threshold;

    const executionTimeMs = Math.round(performance.now() - startTime);

    return NextResponse.json({
      success: true,
      candidateId,
      positionId: state.positionId,
      positionTitle: state.positionTitle,
      threshold: state.threshold,
      totalCount,
      fulfilledCount,
      missingRequirements, // Angka missing requirements akurat 100% (DOD)
      percentage,
      capabilityFit: isFit ? 'FULLFILLED' : 'UNFULLFILLED',
      decision: state.decision,
      decisionNotes: state.decisionNotes,
      requirements: filteredReqs,
      executionTimeMs, // DOD: di bawah 500 milidetik
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch fit & proper data';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

/**
 * POST /api/squad-d2/fit-proper
 * Create a new requirement or execute Decision (Lolos / Tolak)
 * FR-03.3 & FR-03.4
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { candidateId, name, action, decision, reason, actorName = 'HR Manager' } = body;

    if (!candidateId) {
      return NextResponse.json(
        { success: false, message: 'candidateId is required.' },
        { status: 400 }
      );
    }

    const state = await getOrCreateCandidateState(candidateId);

    // =========================================================================
    // FR-03.3 & FR-03.4: Aksi Keputusan (Decision Making: Lolos / Tolak)
    // =========================================================================
    if (action === 'decision' && decision) {
      state.decision = decision;
      state.decisionNotes = reason || null;
      state.updatedAt = new Date().toISOString();

      const newStatus = decision === 'Lolos Fit & Proper' ? 'offered' : 'rejected';
      const changeReason = decision === 'Lolos Fit & Proper'
        ? `Lolos Fit & Proper (Match Score: ${Math.round((state.requirements.filter((r) => r.status === 'Fullfilled').length / Math.max(1, state.requirements.filter((r) => !r.is_deleted).length)) * 100)}%)`
        : reason || 'Tidak memenuhi kualifikasi standar posisi (Gagal Fit & Proper)';

      // Update candidate status and write immutable audit log to d2_audit_logs
      await updateCandidateStatusAndLog({
        candidateId,
        newStatus,
        oldStatus: 'assessment',
        actorName,
        reason: changeReason,
      });

      return NextResponse.json({
        success: true,
        message: `Keputusan "${decision}" berhasil disimpan dan status kandidat diperbarui.`,
        decision,
        status: newStatus,
      });
    }

    // Add New Requirement
    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, message: 'Requirement name is required.' },
        { status: 400 }
      );
    }

    const newReq: FitProperRequirement = {
      id: `req-${candidateId}-${Date.now()}`,
      candidate_id: candidateId,
      name: name.trim(),
      status: null,
      is_deleted: false,
      created_at: new Date().toISOString(),
    };

    state.requirements.push(newReq);
    state.updatedAt = new Date().toISOString();

    return NextResponse.json(
      {
        success: true,
        message: 'Requirement created successfully',
        data: newReq,
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to process request';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

/**
 * PATCH /api/squad-d2/fit-proper
 * Update requirement status, edit name, set threshold, or soft delete (is_deleted = true)
 * Standar: NEVER perform hard delete!
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { candidateId, requirementId, name, status, is_deleted, threshold } = body;

    if (!candidateId) {
      return NextResponse.json(
        { success: false, message: 'candidateId is required.' },
        { status: 400 }
      );
    }

    const state = await getOrCreateCandidateState(candidateId);

    // Update threshold if provided
    if (typeof threshold === 'number' && !isNaN(threshold)) {
      state.threshold = Math.max(0, Math.min(100, threshold));
    }

    // Update requirement if requirementId provided
    if (requirementId) {
      const target = state.requirements.find((r) => r.id === requirementId);
      if (!target) {
        return NextResponse.json(
          { success: false, message: 'Requirement not found.' },
          { status: 404 }
        );
      }

      if (name !== undefined) {
        target.name = String(name).trim();
      }

      if (status !== undefined) {
        target.status = status as RequirementStatus;
      }

      // Soft delete: is_deleted = true (Never hard delete)
      if (is_deleted !== undefined) {
        target.is_deleted = Boolean(is_deleted);
      }
    }

    state.updatedAt = new Date().toISOString();

    // Recalculate
    const activeReqs = state.requirements.filter((r) => !r.is_deleted);
    const totalCount = activeReqs.length;
    const fulfilledCount = activeReqs.filter((r) => r.status === 'Fullfilled').length;
    const missingRequirements = Math.max(0, totalCount - fulfilledCount);
    const percentage = totalCount > 0 ? Math.round((fulfilledCount / totalCount) * 100) : 0;
    const isFit = totalCount > 0 && percentage >= state.threshold;

    // Persist to Supabase in background
    tryPersistToSupabase(state, { totalCount, fulfilledCount, missingRequirements, percentage, capabilityFit: isFit ? 'FULLFILLED' : 'UNFULLFILLED' });

    return NextResponse.json({
      success: true,
      message: 'Updated successfully',
      candidateId,
      threshold: state.threshold,
      totalCount,
      fulfilledCount,
      missingRequirements,
      percentage,
      capabilityFit: isFit ? 'FULLFILLED' : 'UNFULLFILLED',
      requirements: state.requirements.filter((r) => !r.is_deleted),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update requirement';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
