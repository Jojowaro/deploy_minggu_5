'use server';

import { 
  getCandidatesWithJobs, 
  updateCandidateStatusAndLog, 
  getAuditLogs 
} from '../../lib/supabaseServer';
import { CandidateWithJob, AuditLog, CandidateStatus } from '../../types/candidate';

/**
 * Server Action: Fetch all candidates with job titles (FR-D2-002, TR-01, TR-06)
 */
export async function getKanbanCandidatesAction(): Promise<CandidateWithJob[]> {
  try {
    const candidates = await getCandidatesWithJobs();
    return candidates;
  } catch (error) {
    console.error('[Squad D2 Server Action] Failed to load Kanban candidates:', error);
    return [];
  }
}

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
 * Server Action: Update Candidate Status with Immutable Audit Trail (FR-02.1 s/d FR-02.6, TR-09, TR-06)
 */
export async function updateCandidateStatusAction(
  input: UpdateStatusInput
): Promise<UpdateStatusResult> {
  const { candidateId, newStatus, oldStatus, actorName = 'Budi Santoso', reason, isNotEligible } = input;

  let finalReason = reason;
  if (newStatus === 'rejected') {
    if (isNotEligible) {
      finalReason = `Not Eligible: ${reason || 'Permanent rejection recorded by recruitment team'}`;
    } else if (!reason) {
      finalReason = 'Moved to Rejected column';
    }
  }

  const result = await updateCandidateStatusAndLog({
    candidateId,
    newStatus,
    oldStatus,
    actorName,
    reason: finalReason,
  });

  return result;
}

/**
 * Server Action: Fetch Audit Trail Logs from d2_audit_logs (FR-02.6, TR-09)
 */
export async function getAuditLogsAction(candidateId?: string): Promise<AuditLog[]> {
  try {
    const logs = await getAuditLogs(candidateId);
    return logs;
  } catch (error) {
    console.error('[Squad D2 Server Action] Failed to load audit logs:', error);
    return [];
  }
}
