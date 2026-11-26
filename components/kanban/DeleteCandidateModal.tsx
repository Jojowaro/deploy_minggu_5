'use client';

import React from 'react';
import { Trash2, X, AlertTriangle } from 'lucide-react';
import { CandidateWithJob } from '@/app/squad-d2/src/types/candidate';
import { useLanguage } from '@/lib/i18n/LanguageContext';

export interface DeleteCandidateModalProps {
  isOpen: boolean;
  candidate: CandidateWithJob | null;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const DeleteCandidateModal: React.FC<DeleteCandidateModalProps> = ({
  isOpen,
  candidate,
  onConfirm,
  onCancel,
  isLoading = false,
}) => {
  const { t } = useLanguage();
  if (!isOpen || !candidate) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-[calc(100vw-32px)] sm:max-w-md max-h-[92vh] flex flex-col bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden transform animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Danger Header Accent Bar */}
        <div className="h-2 w-full shrink-0 bg-red-600" />

        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-4 sm:p-7 overflow-y-auto">
          <div className="flex items-center gap-3.5 mb-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600 shrink-0">
              <Trash2 className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-red-600 bg-red-50 px-2.5 py-0.5 rounded-full">
                {t('kanban.modal.deleteBadge', 'Hapus Pelamar')}
              </span>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-1">
                {t('kanban.modal.deleteTitle', 'Hapus Pelamar dari Kanban?')}
              </h3>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 sm:p-3.5 mb-4">
            <p className="text-sm font-bold text-slate-900">{candidate.full_name}</p>
            <p className="text-xs text-slate-500 mt-0.5">{candidate.job_title || 'Pelamar'}</p>
          </div>

          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            {t('kanban.modal.deleteConfirmText', 'Apakah Anda yakin ingin menghapus pelamar ini? Pelamar tidak akan ditampilkan lagi di halaman Kanban, namun data tetap tersimpan di database (soft delete).')}
          </p>

          <div className="mt-6 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors text-center"
            >
              {t('kanban.modal.cancel', 'Batal')}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{t('common.deleting', 'Menghapus...')}</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>{t('kanban.modal.confirmDelete', 'Ya, Hapus Pelamar')}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteCandidateModal;
