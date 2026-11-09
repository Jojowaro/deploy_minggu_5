/**
 * Squad D2 (Recruitment Management) - Kanban Pipeline Type Definitions
 * Specification: US-D2-002, FR-D2-002 (FR-02.1 s/d FR-02.6), FR-D2-005, TR-D2-001, TR-D2-002
 * Target Table: d2_candidates, d2_job_posts, d2_audit_logs
 */

import { CandidateStatus, CandidateStage } from './candidate';

export type KanbanColumnId = 'applied' | 'assessment' | 'interview' | 'offered' | 'rejected' | string;

export interface KanbanColumnConfig {
  id: KanbanColumnId;
  label: string; // Header pill label (e.g. "APPLIED", "ASSESSEMENT")
  badgeLabel: string; // Card badge label (e.g. "Applied", "Assessement")
  colorHex: string;
  badgeBg: string;
  badgeText: string;
  headerBg: string;
  headerText: string;
  targetStage?: CandidateStage;
  isDeleted?: boolean;
}

/**
 * 5 Main Pipeline Columns updated per Mas Bram's specification:
 * 1. CANDIDATE (formerly APPLIED) - menampung seluruh berkas masuk sebelum diperiksa
 * 2. SCREENING (formerly ASSESSMENT) - penyaringan berkas & kualifikasi awal
 * 3. INTERVIEWED
 * 4. OFFERED
 * 5. REJECTED (dengan pencatatan rejected_at_stage)
 */
export const KANBAN_COLUMNS: KanbanColumnConfig[] = [
  {
    id: 'applied',
    label: 'CANDIDATE',
    badgeLabel: 'Candidate',
    colorHex: '#3b82f6',
    badgeBg: 'bg-[#3b82f6]',
    badgeText: 'text-white',
    headerBg: 'bg-[#e7eef8]',
    headerText: 'text-slate-700',
    targetStage: 'candidate',
  },
  {
    id: 'assessment',
    label: 'SCREENING',
    badgeLabel: 'Screening',
    colorHex: '#f59e0b',
    badgeBg: 'bg-[#f59e0b]',
    badgeText: 'text-white',
    headerBg: 'bg-[#e7eef8]',
    headerText: 'text-slate-700',
    targetStage: 'screening',
  },
  {
    id: 'interview',
    label: 'INTERVIEWED',
    badgeLabel: 'Interviewed',
    colorHex: '#8b5cf6',
    badgeBg: 'bg-[#8b5cf6]',
    badgeText: 'text-white',
    headerBg: 'bg-[#e7eef8]',
    headerText: 'text-slate-700',
    targetStage: 'interview',
  },
  {
    id: 'offered',
    label: 'OFFERED',
    badgeLabel: 'Offered',
    colorHex: '#0d9488',
    badgeBg: 'bg-[#0d9488]',
    badgeText: 'text-white',
    headerBg: 'bg-[#e7eef8]',
    headerText: 'text-slate-700',
    targetStage: 'offering',
  },
  {
    id: 'rejected',
    label: 'REJECTED',
    badgeLabel: 'Rejected',
    colorHex: '#ef4444',
    badgeBg: 'bg-[#ef4444]',
    badgeText: 'text-white',
    headerBg: 'bg-[#e7eef8]',
    headerText: 'text-slate-700',
    targetStage: 'rejected',
  },
];

export function getColumnConfig(status: CandidateStatus | string): KanbanColumnConfig {
  const s = (status || '').toLowerCase();
  let normalized = s;
  if (s === 'interviewed') normalized = 'interview';
  if (s === 'candidate') normalized = 'applied';
  if (s === 'screening') normalized = 'assessment';

  return (
    KANBAN_COLUMNS.find((col) => col.id === normalized) || KANBAN_COLUMNS[0]
  );
}

export function mapStatusToStage(status: CandidateStatus | string): CandidateStage {
  const s = (status || '').toLowerCase();
  switch (s) {
    case 'candidate':
    case 'applied':
      return 'candidate';
    case 'screening':
    case 'assessment':
      return 'screening';
    case 'interview':
    case 'interviewed':
      return 'interview';
    case 'offered':
      return 'offering';
    case 'hired':
      return 'hired';
    case 'rejected':
      return 'rejected';
    default:
      return 'candidate';
  }
}
