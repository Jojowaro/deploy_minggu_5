'use client';

import React from 'react';
import { AlertCircle, ArrowRight, X } from 'lucide-react';
import { CandidateWithJob, CandidateStatus } from '@/app/squad-d2/src/types/candidate';
import { getColumnConfig } from '@/app/squad-d2/src/types/kanban';

export interface StatusConfirmModalProps {
  isOpen: boolean;
  candidate: CandidateWithJob | null;
  targetStatus: CandidateStatus | null;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const StatusConfirmModal: React.FC<StatusConfirmModalProps> = ({
  isOpen,
  candidate,
  targetStatus,
  onConfirm,
  onCancel,
  isLoading = false,
}) => {
  if (!isOpen || !candidate || !targetStatus) return null;

  const currentConfig = getColumnConfig(candidate.status);
  const targetConfig = getColumnConfig(targetStatus);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="relative w-full max-w-md bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden transform animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar Accent */}
        <div className="h-2 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-[#0F2342]" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 sm:p-7">
          {/* Icon & Badge */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full">
                Konfirmasi Pembaruan Status
              </span>
              <h3 className="text-lg font-bold text-slate-900 mt-1 leading-snug">
                Pindahkan Status Pelamar?
              </h3>
            </div>
          </div>

          {/* Candidate Info Pill */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 mb-4 flex items-center justify-between">
            <div className="min-w-0 pr-2">
              <p className="text-sm font-bold text-slate-900 truncate">
                {candidate.full_name}
              </p>
              <p className="text-xs text-slate-500 truncate">
                {candidate.job_title || 'Backend Engineer'}
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className={`text-[10px] font-bold text-white px-2 py-0.5 rounded-full ${currentConfig.badgeBg}`}>
                {currentConfig.badgeLabel}
              </span>
              <ArrowRight className="w-3 h-3 text-slate-400" />
              <span className={`text-[10px] font-bold text-white px-2 py-0.5 rounded-full ${targetConfig.badgeBg}`}>
                {targetConfig.badgeLabel}
              </span>
            </div>
          </div>

          {/* Explicit User Prompt Message */}
          <p className="text-sm text-slate-600 leading-relaxed font-medium">
            Apakah anda yakin ingin mengubah status pelamar menjadi{' '}
            <strong className="text-slate-900 font-bold underline decoration-blue-500 decoration-2">
              {targetConfig.badgeLabel}
            </strong>
            ? informasi status akan dikirimkan kepada pelamar.
          </p>

          {/* Action Buttons */}
          <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              className="px-5 py-2.5 rounded-xl bg-[#0F2342] hover:bg-blue-900 text-white text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Memproses...</span>
                </>
              ) : (
                <span>Confirm</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatusConfirmModal;
