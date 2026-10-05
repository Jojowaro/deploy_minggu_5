'use server';

import { CandidateWithJob, AuditLog, CandidateStatus } from '../../types/candidate';

export interface UpdateStatusInput {
  candidateId: string;
  newStatus: CandidateStatus;
  oldStatus: string;
  actorName?: string;
  reason?: string;
  isNotEligible?: boolean;
}

export interface UpdateStatusResult {
  success: boolean;
  candidate?: CandidateWithJob;
  auditLogId?: string;
  error?: string;
  latencyMs: number;
}

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}` 
    : 'http://localhost:3000';
}

/**
 * Server Action: Fetch all candidates via /api/squad-d2/candidates
 */
export async function getKanbanCandidatesAction(): Promise<CandidateWithJob[]> {
  try {
    const res = await fetch(`${getBaseUrl()}/api/squad-d2/candidates`, {
      cache: 'no-store',
    });

    if (res.ok) {
      const result = await res.json();
      if (result.success && Array.isArray(result.data)) {
        return result.data;
      }
    }

    const { getCandidatesWithJobs } = await import('../../lib/supabaseServer');
    return await getCandidatesWithJobs();
  } catch (error) {
    console.error('[Squad D2 Action] Failed to load Kanban candidates via API:', error);
    const { getCandidatesWithJobs } = await import('../../lib/supabaseServer');
    return await getCandidatesWithJobs();
  }
}

/**
 * Server Action: Update Candidate Status via PATCH /api/squad-d2/candidates
 */
export async function updateCandidateStatusAction(
  input: UpdateStatusInput
): Promise<UpdateStatusResult> {
  const startTime = Date.now();
  try {
    const res = await fetch(`${getBaseUrl()}/api/squad-d2/candidates`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });

    const result = await res.json();
    return {
      success: result.success,
      candidate: result.data,
      auditLogId: result.auditLogId,
      error: result.message,
      latencyMs: result.latencyMs || (Date.now() - startTime),
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: msg,
      latencyMs: Date.now() - startTime,
    };
  }
}

/**
 * Server Action: Fetch Audit Trail Logs via GET /api/squad-d2/audit-logs
 */
export async function getAuditLogsAction(candidateId?: string): Promise<AuditLog[]> {
  try {
    const url = candidateId
      ? `${getBaseUrl()}/api/squad-d2/audit-logs?candidateId=${encodeURIComponent(candidateId)}`
      : `${getBaseUrl()}/api/squad-d2/audit-logs`;

    const res = await fetch(url, { cache: 'no-store' });
    if (res.ok) {
      const result = await res.json();
      if (result.success && Array.isArray(result.data)) {
        return result.data;
      }
    }

    const { getAuditLogs } = await import('../../lib/supabaseServer');
    return await getAuditLogs(candidateId);
  } catch (error) {
    console.error('[Squad D2 Action] Failed to load audit logs via API:', error);
    const { getAuditLogs } = await import('../../lib/supabaseServer');
    return await getAuditLogs(candidateId);
  }
}
