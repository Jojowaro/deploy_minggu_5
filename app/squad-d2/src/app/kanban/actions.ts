'use server';

import { CandidateWithJob, AuditLog, CandidateStatus } from '../../types/candidate';
import { 
  getCandidatesWithJobs, 
  updateCandidateStatusAndLog, 
  getAuditLogs 
} from '../../lib/supabaseServer';

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

/**
 * Server Action: Fetch all candidates directly via Supabase Server client
 * Eliminates loopback HTTP fetch to prevent "Protected by Vercel Authentication" errors
 */
export async function getKanbanCandidatesAction(): Promise<CandidateWithJob[]> {
  try {
    return await getCandidatesWithJobs();
  } catch (error) {
    console.error('[Squad D2 Action] Failed to load Kanban candidates:', error);
    return [];
  }
}

/**
 * Server Action: Update Candidate Status directly via Supabase Server client
 * Direct database mutation & immutable audit logging without loopback HTTP fetch,
 * completely solving the "Protected by Vercel Authentication" error on Vercel deployments.
 */
export async function updateCandidateStatusAction(
  input: UpdateStatusInput
): Promise<UpdateStatusResult> {
  const startTime = Date.now();
  try {
    let finalReason = input.reason;
    if (input.newStatus === 'rejected') {
      if (input.isNotEligible) {
        finalReason = `Not Eligible: ${input.reason || 'Permanent rejection recorded via Kanban'}`;
      } else if (!input.reason) {
        finalReason = 'Moved to Rejected status via Kanban';
      }
    }

    const result = await updateCandidateStatusAndLog({
      candidateId: input.candidateId,
      newStatus: input.newStatus,
      oldStatus: input.oldStatus,
      actorName: input.actorName || 'HR Specialist',
      reason: finalReason,
    });

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Failed to update candidate status',
        latencyMs: result.latencyMs || (Date.now() - startTime),
      };
    }

    return {
      success: true,
      candidate: result.candidate,
      auditLogId: result.auditLogId,
      latencyMs: result.latencyMs || (Date.now() - startTime),
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Squad D2 Action] Error updating candidate status:', error);
    return {
      success: false,
      error: msg,
      latencyMs: Date.now() - startTime,
    };
  }
}

/**
 * Server Action: Fetch Audit Trail Logs directly via Supabase Server client
 */
export async function getAuditLogsAction(candidateId?: string): Promise<AuditLog[]> {
  try {
    return await getAuditLogs(candidateId);
  } catch (error) {
    console.error('[Squad D2 Action] Failed to load audit logs:', error);
    return [];
  }
}

