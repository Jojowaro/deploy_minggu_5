/**
 * Squad D2 (Recruitment Management) - Kanban Pipeline Type Definitions
 * Specification: US-D2-002, FR-D2-002 (FR-02.1 s/d FR-02.6), FR-D2-005, TR-D2-001, TR-D2-002
 * Target Table: d2_candidates, d2_job_posts, d2_audit_logs
 */

import { CandidateStatus, CandidateStage } from './candidate';

export type KanbanColumnId = 'applied' | 'assessment' | 'interview' | 'offered' | 'rejected';

export interface KanbanColumnConfig {
  id: KanbanColumnId;
  label: string; // Header pill label (e.g. "APPLIED", "ASSESSEMENT")
  badgeLabel: string; // Card badge label (e.g. "Applied", "Assessement")
  colorHex: string;
  badgeBg: string;
  badgeText: string;
  headerBg: string;
  headerText: string;
  targetStage: CandidateStage;
}

/**
 * 5 Main Pipeline Columns strictly matching Figma Reference: HRMS D - HR.jpg
 */
export const KANBAN_COLUMNS: KanbanColumnConfig[] = [
  {
    id: 'applied',
    label: 'APPLIED',
    badgeLabel: 'Applied',
    colorHex: '#3b82f6',
    badgeBg: 'bg-[#3b82f6]',
    badgeText: 'text-white',
    headerBg: 'bg-[#e7eef8]',
    headerText: 'text-slate-700',
    targetStage: 'screening',
  },
  {
    id: 'assessment',
    label: 'ASSESSEMENT',
    badgeLabel: 'Assessement',
    colorHex: '#f59e0b',
    badgeBg: 'bg-[#f59e0b]',
    badgeText: 'text-white',
    headerBg: 'bg-[#e7eef8]',
    headerText: 'text-slate-700',
    targetStage: 'assessment',
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
  const normalized = status === 'interviewed' ? 'interview' : status;
  return (
    KANBAN_COLUMNS.find((col) => col.id === normalized) || KANBAN_COLUMNS[0]
  );
}

export function mapStatusToStage(status: CandidateStatus | string): CandidateStage {
  switch (status) {
    case 'applied':
      return 'screening';
    case 'assessment':
      return 'assessment';
    case 'interview':
    case 'interviewed':
      return 'interview';
    case 'offered':
      return 'offering';
    case 'rejected':
      return 'rejected';
    default:
      return 'screening';
  }
}
