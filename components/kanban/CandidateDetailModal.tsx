'use client';

import React, { useEffect, useState } from 'react';
import { 
  X, 
  User, 
  Briefcase, 
  Mail, 
  Phone, 
  FileText, 
  History, 
  ArrowRight, 
  CheckCircle, 
  AlertCircle,
  ExternalLink 
} from 'lucide-react';
import { CandidateWithJob, CandidateStatus, AuditLog } from '@/app/squad-d2/src/types/candidate';
import { KANBAN_COLUMNS, getColumnConfig } from '@/app/squad-d2/src/types/kanban';
import { getAuditLogsAction } from '@/app/squad-d2/src/app/kanban/actions';

export interface CandidateDetailModalProps {
  isOpen: boolean;
  candidate: CandidateWithJob | null;
  onClose: () => void;
  onMoveCandidate: (candidateId: string, targetStatus: CandidateStatus) => void;
}

export const CandidateDetailModal: React.FC<CandidateDetailModalProps> = ({
  isOpen,
  candidate,
  onClose,
  onMoveCandidate,
}) => {
  const [candidateLogs, setCandidateLogs] = useState<AuditLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  useEffect(() => {
    if (isOpen && candidate?.id) {
      let isMounted = true;
      setLoadingLogs(true);
      getAuditLogsAction(candidate.id)
        .then((logs) => {
          if (isMounted) {
            setCandidateLogs(logs);
            setLoadingLogs(false);
          }
        })
        .catch(() => {
          if (isMounted) setLoadingLogs(false);
        });

      return () => {
        isMounted = false;
      };
    }
  }, [isOpen, candidate?.id]);

  if (!isOpen || !candidate) return null;

  const currentColumn = getColumnConfig(candidate.status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="relative bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 md:p-8 shadow-2xl border border-slate-200 z-10 animate-in fade-in zoom-in-95 duration-150 flex flex-col">
        {/* Top Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-lg flex items-center justify-center shadow-md">
              {candidate.full_name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 leading-tight">
                {candidate.full_name}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                {candidate.job_title || candidate.d2_job_posts?.title || 'Backend Engineer'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Candidate Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-5 border-b border-slate-100 text-xs">
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <Mail className="w-4 h-4 text-blue-600 shrink-0" />
            <div className="truncate">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Email</span>
              <span className="font-semibold text-slate-800 truncate">{candidate.email}</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Phone</span>
              <span className="font-semibold text-slate-800">
                {candidate.phone_number || 'Not provided'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <User className="w-4 h-4 text-purple-600 shrink-0" />
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Registration Track</span>
              <span className="font-semibold text-slate-800 capitalize">
                {candidate.registration_way}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <FileText className="w-4 h-4 text-amber-600 shrink-0" />
            <div className="truncate flex-1">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Curriculum Vitae</span>
              <span className="font-medium text-slate-700 truncate block">
                {candidate.cv_file_path ? candidate.cv_file_path.split('/').pop() : 'No CV'}
              </span>
            </div>
          </div>
        </div>

        {/* Pipeline Stage Transitions Selector */}
        <div className="py-4 border-b border-slate-100">
          <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5 flex items-center justify-between">
            <span>Current Pipeline Status</span>
            <span
              className={`px-3 py-0.5 rounded-full text-[11px] font-semibold text-white ${currentColumn.badgeBg}`}
            >
              {currentColumn.badgeLabel}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {KANBAN_COLUMNS.map((col) => {
              const isCurrent = (candidate.status === 'interviewed' ? 'interview' : candidate.status) === col.id;
              return (
                <button
                  key={col.id}
                  type="button"
                  disabled={isCurrent}
                  onClick={() => {
                    onMoveCandidate(candidate.id, col.id as CandidateStatus);
                    onClose();
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    isCurrent
                      ? 'bg-slate-100 text-slate-400 cursor-default border border-slate-200'
                      : 'bg-white border border-slate-200 text-slate-700 hover:border-blue-500 hover:text-blue-600 hover:shadow-xs active:scale-[0.98]'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${col.badgeBg}`} />
                  <span>Move to {col.badgeLabel}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* History / Audit Logs for this candidate */}
        <div className="py-4 flex-1">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <History className="w-3.5 h-3.5 text-slate-400" />
            Audit Trail History (Candidate Transitions)
          </h4>

          {loadingLogs ? (
            <div className="py-6 text-center text-xs text-slate-400">Loading audit records...</div>
          ) : candidateLogs.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
              No transition logs recorded yet for this candidate.
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {candidateLogs.map((log) => {
                const oldCfg = getColumnConfig(log.old_status);
                const newCfg = getColumnConfig(log.new_status);
                return (
                  <div
                    key={log.id}
                    className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/60 text-xs flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold text-white ${oldCfg.badgeBg}`}>
                          {oldCfg.badgeLabel}
                        </span>
                        <ArrowRight className="w-3 h-3 text-slate-400" />
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold text-white ${newCfg.badgeBg}`}>
                          {newCfg.badgeLabel}
                        </span>
                        <span className="text-slate-500 ml-1">by {log.actor_name}</span>
                      </div>
                      {log.change_reason && (
                        <p className="text-[10px] text-slate-600 italic">{log.change_reason}</p>
                      )}
                    </div>
                    <time className="text-[10px] text-slate-400 shrink-0 ml-2">
                      {new Date(log.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </time>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default CandidateDetailModal;
