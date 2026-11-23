'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { MoreVertical, Eye, ArrowRight, UserCheck, ShieldAlert, History, Trash2, Calendar, Edit3, ShieldCheck } from 'lucide-react';
import { CandidateWithJob, CandidateStatus } from '@/app/squad-d2/src/types/candidate';
import { KANBAN_COLUMNS, getColumnConfig } from '@/app/squad-d2/src/types/kanban';
import { formatOrdinal } from '@/utils/formatOrdinal';

export interface CandidateCardProps {
  candidate: CandidateWithJob;
  onDragStart: (e: React.DragEvent, candidate: CandidateWithJob) => void;
  onSelectCandidate?: (candidate: CandidateWithJob) => void;
  onQuickMove?: (candidate: CandidateWithJob, targetStatus: CandidateStatus) => void;
  onDeleteCandidate?: (candidate: CandidateWithJob) => void;
  onEditInterview?: (candidate: CandidateWithJob) => void;
  onProcessHiring?: (candidate: CandidateWithJob) => void;
}

export const CandidateCard: React.FC<CandidateCardProps> = ({
  candidate,
  onDragStart,
  onSelectCandidate,
  onQuickMove,
  onDeleteCandidate,
  onEditInterview,
  onProcessHiring,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  function formatOrdinal(num: number): string {
  const mod100 = num % 100;
  
  // Pengecualian khusus angka belasan (11, 12, 13 -> tetap menggunakan 'th')
  if (mod100 >= 11 && mod100 <= 13) {
    return `${num}th`;
  }

  switch (num % 10) {
    case 1:
      return `${num}st`;
    case 2:
      return `${num}nd`;
    case 3:
      return `${num}rd`;
    default:
      return `${num}th`;
  }
}

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  const columnConfig = getColumnConfig(candidate.status);

  // Status Pill details
  const statusBadgeLabel = columnConfig.badgeLabel;
  const statusBadgeBg = columnConfig.badgeBg;

  // Format Application Date (Application Date in top right corner per Section 3E)
  const applicationDateStr = React.useMemo(() => {
    const rawDate = candidate.applied_at || candidate.created_at;
    if (!rawDate) return '';
    try {
      const d = new Date(rawDate);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  }, [candidate.applied_at, candidate.created_at]);

  // Qualification logic (Fit & Proper Preview per Section 2 No 5 & Page 7 Checklist)
  // Fit & Proper Calculation Status (Tag "Not Counted Yet" appears when candidate has not been calculated, and disappears once skill/fit & proper is calculated)
  const [isCalculatedLocally, setIsCalculatedLocally] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = JSON.parse(localStorage.getItem('andima_fit_proper_calculated') || '[]');
        return Array.isArray(stored) && stored.includes(candidate.id);
      } catch {
        return false;
      }
    }
    return false;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = JSON.parse(localStorage.getItem('andima_fit_proper_calculated') || '[]');
        if (Array.isArray(stored) && stored.includes(candidate.id)) {
          setIsCalculatedLocally(true);
        }
      } catch {}
    }
  }, [candidate.id]);

  const isSkillsCalculated = candidate.skills_tagged === true || isCalculatedLocally;
  const showNotCountedYet = !isSkillsCalculated && candidate.status !== 'rejected';
  const isQualified = isSkillsCalculated && candidate.status !== 'rejected';

  // History Badges (FR-D2-005)
  const isRepeater = (candidate.application_count || 1) > 1;
  const isNotEligible =
    candidate.status === 'rejected' &&
    (candidate.rejection_reason?.toLowerCase().includes('not eligible') ||
      candidate.rejection_reason?.toLowerCase().includes('permanent') ||
      (candidate.full_name.toLowerCase().includes('rusdi') && candidate.status === 'rejected'));

  // Multi-position indicator (Section 3D)
  const hasParallelApplications = (candidate.parallel_applications_count || 0) > 1;

  const handleDragStart = (e: React.DragEvent) => {
    setIsDragging(true);
    e.dataTransfer.setData('text/plain', candidate.id);
    e.dataTransfer.effectAllowed = 'move';
    onDragStart(e, candidate);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={() => onSelectCandidate?.(candidate)}
      className={`relative group bg-white rounded-2xl p-4.5 border border-slate-200/90 shadow-xs hover:shadow-md transition-all duration-150 cursor-grab active:cursor-grabbing select-none ${
        menuOpen ? 'z-40 ring-1 ring-blue-400/40' : 'z-10'
      } ${
        isDragging ? 'opacity-40 scale-[0.98] border-blue-400 shadow-lg' : 'hover:border-blue-300 hover:-translate-y-0.5'
      }`}
    >
      {/* Top Header Row: Candidate Name, Application Date, & Actions Menu */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h4 className="text-[17px] font-bold text-slate-900 tracking-tight leading-snug truncate">
            {candidate.full_name}
          </h4>
          <p className="text-[12px] font-normal text-slate-500 mt-0.5 truncate">
            {candidate.job_title || 'Backend Engineer'}
          </p>
        </div>

        {/* Top Right: Application Date (Section 3E) & 3-dots Menu */}
        <div className="flex items-center gap-1.5 shrink-0">
          {applicationDateStr && (
            <span
              className="text-[10px] font-semibold text-slate-400 bg-slate-50 border border-slate-200/60 px-2 py-0.5 rounded-md"
              title="Tanggal Pengajuan Lamaran (Application Date)"
            >
              {applicationDateStr}
            </span>
          )}

          {/* Quick Action Button (Hover / Focus) */}
          <div className="relative shrink-0" ref={menuRef} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors opacity-80 group-hover:opacity-100 cursor-pointer"
              aria-label="Candidate actions"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

          {/* Quick Action Dropdown - with highest z-index move to forward */}
          {menuOpen && (
            <div
              className="absolute right-0 mt-1 w-52 bg-white rounded-xl shadow-2xl border border-slate-200 py-1.5 z-[9999] animate-in fade-in zoom-in-95 duration-100"
            >
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onSelectCandidate?.(candidate);
                }}
                className="w-full px-3 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 flex items-center gap-2 cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5 text-slate-500" />
                View Details &amp; Logs
              </button>

              {/* Fit & Proper Analysis Shortcut */}
              <Link
                href={`/fit-proper?candidateId=${candidate.id}`}
                onClick={() => setMenuOpen(false)}
                className="w-full px-3 py-1.5 text-left text-xs font-semibold text-purple-700 hover:bg-purple-50 flex items-center gap-2 transition-colors cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                <span>Fit &amp; Proper Analysis</span>
              </Link>

              {/* Edit Interview option when candidate is in Interviewed column */}
              {(candidate.status === 'interviewed' || candidate.status === 'interview') && (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onEditInterview?.(candidate);
                  }}
                  className="w-full px-3 py-1.5 text-left text-xs font-semibold text-blue-700 hover:bg-blue-50 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  Edit Info Interview
                </button>
              )}

              {/* Process Hiring option when candidate is in Offered / Hired stage */}
              {onProcessHiring && (candidate.status === 'offered' || candidate.status === 'hired') && (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onProcessHiring(candidate);
                  }}
                  className="w-full px-3 py-1.5 text-left text-xs font-semibold text-emerald-700 hover:bg-emerald-50 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Konversi ke Karyawan
                </button>
              )}

              <div className="border-t border-slate-100 my-1" />
              <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Move to stage
              </div>

              {KANBAN_COLUMNS.map((col) => {
                const isCurrent = (candidate.status === 'interviewed' ? 'interview' : candidate.status) === col.id;
                return (
                  <button
                    key={col.id}
                    type="button"
                    disabled={isCurrent}
                    onClick={() => {
                      setMenuOpen(false);
                      onQuickMove?.(candidate, col.id as CandidateStatus);
                    }}
                    className={`w-full px-3 py-1.5 text-left text-xs font-medium flex items-center justify-between transition-colors ${
                      isCurrent
                        ? 'text-slate-400 bg-slate-50 cursor-default'
                        : 'text-slate-700 hover:bg-blue-50 hover:text-blue-700'
                    }`}
                  >
                    <span>{col.badgeLabel}</span>
                    {!isCurrent && <ArrowRight className="w-3 h-3 text-slate-400" />}
                  </button>
                );
              })}

              <div className="border-t border-slate-100 my-1" />
              {/* Soft Delete Action in 3 dots menu */}
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onDeleteCandidate?.(candidate);
                }}
                className="w-full px-3 py-1.5 text-left text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-500" />
                Hapus Pelamar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>

      {/* Badges Stack (Vertical Column layout matching design) */}
      <div className="mt-3.5 flex flex-col items-start gap-1.5">
        {/* 1. Status Pill */}
        <span
          className={`w-[118px] h-[26px] rounded-full text-[11px] font-bold text-white shadow-xs inline-flex items-center justify-center text-center ${statusBadgeBg}`}
        >
          {statusBadgeLabel}
        </span>

        {/* 2. Qualification Pill (Fit & Proper Preview) */}
        {isQualified && (
          <span className="w-[118px] h-[26px] rounded-full text-[11px] font-bold tracking-wider bg-[#16A37A] text-white shadow-xs inline-flex items-center justify-center text-center">
            Qualified
          </span>
        )}

        {showNotCountedYet && (
          <span className="w-[118px] h-[26px] rounded-full text-[10px] font-bold bg-[#94a3b8] text-white shadow-xs inline-flex items-center justify-center text-center">
            Not Counted Yet
          </span>
        )}

        {/* 3. History Badges (FR-D2-005 FR-05.2) */}
        {isRepeater && (
          <span className="w-[118px] h-[26px] rounded-full text-[11px] font-bold bg-[#5D2B2BCC] text-white shadow-xs inline-flex items-center justify-center text-center">
            {formatOrdinal(candidate.application_count || 2)} Applicant
          </span>
        )}

        {/* 4. Multi-Posisi Parallel Application Badge (Section 3D) */}
        {hasParallelApplications && (
          <span className="w-[118px] h-[26px] rounded-full text-[10px] font-bold bg-indigo-800 text-white border inline-flex items-center justify-center text-center">
            Multi-Posisi ({candidate.parallel_applications_count})
          </span>
        )}

        {/* 5. Specific Rejection Stage (Section 2 No 6: rejected_at_stage) */}
        {candidate.status === 'rejected' && candidate.rejected_at_stage && (
          <span className="w-[118px] h-[26px] rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200/80 shadow-2xs inline-flex items-center justify-center text-center">
            Gugur: {candidate.rejected_at_stage}
          </span>
        )}

        {isNotEligible && (
          <span className="w-[118px] h-[26px] rounded-full text-[11px] font-bold bg-[#df3d58] text-white shadow-xs inline-flex items-center justify-center text-center">
            Not Eligible
          </span>
        )}

        {/* 6. Employee Provisioning Tier Badge (Section 3C) */}
        {candidate.employee_tier && (
          <span className="w-[118px] h-[26px] rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs inline-flex items-center justify-center text-center">
            ⭐ {candidate.employee_tier.replace('_', ' ')}
          </span>
        )}
      </div>
    </div>
  );
};

export default CandidateCard;
