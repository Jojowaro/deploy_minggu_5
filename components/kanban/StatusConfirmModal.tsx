'use client';

import React, { useState, useEffect } from 'react';
import { 
  AlertCircle, 
  ArrowRight, 
  X, 
  CheckSquare, 
  Square, 
  ShieldCheck, 
  Lock, 
  Unlock, 
  CheckCircle2, 
  FileCheck2 
} from 'lucide-react';
import { CandidateWithJob, CandidateStatus } from '@/app/squad-d2/src/types/candidate';
import { getColumnConfig } from '@/app/squad-d2/src/types/kanban';
import { useLanguage } from '@/lib/i18n/LanguageContext';

export interface StageGatePrerequisite {
  id: string;
  label: string;
  description: string;
}

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
  const { language, t } = useLanguage();
  const [checkedIds, setCheckedIds] = useState<Record<string, boolean>>({});

  // Generate Stage Gate Checklist items based on Source -> Target Transition (Section 3A)
  const prerequisites: StageGatePrerequisite[] = React.useMemo(() => {
    if (!targetStatus) return [];

    const normTarget = targetStatus.toLowerCase();
    const isEn = language === 'en';

    // 1. Candidate -> Screening (Verifikasi Kelengkapan Identitas)
    if (normTarget === 'assessment' || normTarget === 'screening') {
      return [
        {
          id: 'nik_valid',
          label: isEn ? 'NIK Verification (16 Digits)' : 'Verifikasi NIK (16 Digit)',
          description: candidate?.nik
            ? (isEn ? `NIK: ${candidate.nik} (Registered 16-digit format)` : `NIK: ${candidate.nik} (Format 16 digit terdaftar)`)
            : (isEn ? '16-digit NIK format verified and valid' : 'Format NIK 16 digit telah diperiksa dan valid'),
        },
        {
          id: 'email_active',
          label: isEn ? 'Active Email Address Verification' : 'Verifikasi Alamat Email Aktif',
          description: isEn
            ? `Active & verified email: ${candidate?.email || 'candidate'}`
            : `Email aktif & terverifikasi: ${candidate?.email || 'kandidat'}`,
        },
        {
          id: 'cv_pdf_valid',
          label: isEn ? 'CV Document Validation (PDF Format)' : 'Validasi Berkas CV (Format PDF)',
          description: isEn
            ? 'Valid .pdf format CV/Resume (max 5MB) and basic data completed'
            : 'Dokumen CV/Resume format .pdf valid (maks 5MB) dan kelengkapan data dasar terisi',
        },
      ];
    }

    // 2. Screening -> Interview (Evaluasi Kualifikasi Selesai)
    if (normTarget === 'interview' || normTarget === 'interviewed') {
      return [
        {
          id: 'fit_proper_evaluated',
          label: isEn ? 'Qualification Evaluation Completed' : 'Evaluasi Kualifikasi Selesai',
          description: isEn
            ? 'Qualification status is no longer "Not Counted Yet" and competency data is reviewed'
            : 'Status kualifikasi bukan lagi "Not Counted Yet" dan data kompetensi telah ditinjau',
        },
        {
          id: 'threshold_met',
          label: isEn ? 'Competency Match Threshold Met' : 'Ambang Batas Kecocokan (Threshold)',
          description: isEn
            ? 'Candidate meets the minimum competency match threshold for the applied position'
            : 'Kandidat memenuhi target kecocokan kompetensi minimum posisi yang dilamar',
        },
        {
          id: 'competency_aligned',
          label: isEn ? 'Team / Position Requirement Verification' : 'Verifikasi Kebutuhan Tim / Posisi',
          description: isEn
            ? 'Candidate competency standards align with the position master module'
            : 'Standar kompetensi kandidat selaras dengan master posisi modul Squad D1',
        },
      ];
    }

    // 3. Interview -> Offered (Penilaian Wawancara Disetujui)
    if (normTarget === 'offered') {
      return [
        {
          id: 'scorecard_completed',
          label: isEn ? 'Complete Interview Assessment Form' : 'Form Penilaian Wawancara Lengkap',
          description: isEn
            ? 'Interview scorecard and technical/behavioral evaluation filled by interviewer'
            : 'Interview scorecard & evaluasi teknis/perilaku telah diisi oleh interviewer',
        },
        {
          id: 'interviewer_approval',
          label: isEn ? 'Interview Result Approval' : 'Persetujuan Hasil Wawancara',
          description: isEn
            ? 'Interview results approved by interviewer to proceed to offering stage'
            : 'Hasil wawancara disetujui interviewer untuk diajukan ke tahap offering',
        },
        {
          id: 'salary_availability',
          label: isEn ? 'Compensation & Start Date Alignment' : 'Ekspektasi Kompensasi & Tanggal Mulai',
          description: isEn
            ? 'Candidate has agreed to compensation range and estimated onboarding schedule'
            : 'Kandidat telah menyepakati rentang remunerasi dan estimasi jadwal onboarding',
        },
      ];
    }

    // 4. Offered -> Hired / Accepted (Penerbitan Kontrak Kerja)
    if (normTarget === 'hired') {
      return [
        {
          id: 'offering_signed',
          label: isEn ? 'Signed Offering Letter' : 'Offering Letter Ditandatangani',
          description: isEn
            ? 'Official job offering letter agreed and signed by the candidate'
            : 'Dokumen penawaran kerja (offering letter) resmi telah disepakati dan ditandatangani kandidat',
        },
        {
          id: 'background_check',
          label: isEn ? 'Document Verification & Background Check' : 'Verifikasi Dokumen & Background Check',
          description: isEn
            ? 'Original documents and candidate employment references declared complete and clear'
            : 'Pemeriksaan berkas asli dan referensi kerja kandidat dinyatakan lengkap dan bersih',
        },
      ];
    }

    // Generic Fallback
    return [
      {
        id: 'generic_review',
        label: isEn ? 'Stage Eligibility Verification' : 'Verifikasi Kelayakan Tahapan',
        description: isEn
          ? 'Confirmed candidate documents and history are ready to move to this stage'
          : 'Telah memastikan berkas dan riwayat kandidat siap dipindahkan ke kolom ini',
      },
    ];
  }, [candidate, targetStatus, language]);

  // Reset checklist when modal opens or target changes
  useEffect(() => {
    if (isOpen) {
      // Auto-precheck items that already have data verified in candidate record
      const initial: Record<string, boolean> = {};
      if (candidate?.nik && candidate.nik.length === 16) {
        initial['nik_valid'] = true;
      }
      if (candidate?.email && candidate.email.includes('@')) {
        initial['email_active'] = true;
      }
      if (candidate?.cv_file_path) {
        initial['cv_pdf_valid'] = true;
      }
      setCheckedIds(initial);
    } else {
      setCheckedIds({});
    }
  }, [isOpen, candidate, targetStatus]);

  if (!isOpen || !candidate || !targetStatus) return null;

  const currentConfig = getColumnConfig(candidate.status);
  const targetConfig = getColumnConfig(targetStatus);

  const totalRequired = prerequisites.length;
  const currentChecked = prerequisites.filter((p) => checkedIds[p.id]).length;
  const isAllChecked = totalRequired > 0 && currentChecked === totalRequired;

  const toggleCheck = (id: string) => {
    setCheckedIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleSelectAll = () => {
    const all: Record<string, boolean> = {};
    prerequisites.forEach((p) => {
      all[p.id] = true;
    });
    setCheckedIds(all);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="relative w-full max-w-[calc(100vw-32px)] sm:max-w-xl max-h-[92vh] flex flex-col bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden transform animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar Accent */}
        <div className="h-2 w-full shrink-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-[#0F2342]" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-4 sm:p-7 overflow-y-auto">
          {/* Icon & Badge */}
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl border flex items-center justify-center shrink-0 transition-colors ${
              isAllChecked ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-blue-50 border-blue-200 text-blue-600'
            }`}>
              {isAllChecked ? <Unlock className="w-5 h-5 sm:w-6 sm:h-6" /> : <Lock className="w-5 h-5 sm:w-6 sm:h-6" />}
            </div>
            <div>
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full">
                {t('kanban.stageGate.badge', 'Stage Gate Validation (FR-D2-002)')}
              </span>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-1 leading-snug">
                {t('kanban.stageGate.title', 'Verifikasi Checklist Prasyarat Perpindahan')}
              </h3>
            </div>
          </div>

          {/* Candidate Info Pill */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 sm:p-3.5 mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="min-w-0 pr-0 sm:pr-2 w-full sm:w-auto">
              <p className="text-sm font-bold text-slate-900 truncate">
                {candidate.full_name}
              </p>
              <p className="text-xs text-slate-500 truncate">
                {candidate.job_title || 'Pelamar'}
              </p>
              {candidate.email && (
                <p className="text-[11px] text-blue-600 font-semibold truncate mt-0.5 flex items-center gap-1">
                  <span>✉</span>
                  <span>{candidate.email}</span>
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
              <span className={`w-[96px] h-[26px] flex items-center justify-center text-center text-[11px] font-medium text-white rounded-full shadow-xs ${currentConfig.badgeBg}`}>
                {t(`kanban.stages.${currentConfig.id}`, currentConfig.badgeLabel)}
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              <span className={`w-[96px] h-[26px] flex items-center justify-center text-center text-[11px] font-medium text-white rounded-full shadow-xs ${targetConfig.badgeBg}`}>
                {t(`kanban.stages.${targetConfig.id}`, targetConfig.badgeLabel)}
              </span>
            </div>
          </div>

          {/* Prompt Message */}
          <p className="text-xs text-slate-600 leading-relaxed font-medium mb-3">
            {t('kanban.stageGate.subtitle', 'Sesuai standar stage gate PT Andima, kartu pelamar terkunci hingga seluruh prasyarat evaluasi terpenuhi:')}
          </p>

          {/* Checklist Container */}
          <div className="space-y-2 mb-4 bg-[#f8fafc] p-3 rounded-2xl border border-slate-200/80">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 px-1 mb-1">
              <span>{t('kanban.stageGate.prerequisitesHeader', { current: currentChecked, total: totalRequired }, `PRASYARAT WAJIB (${currentChecked}/${totalRequired} Lengkap)`)}</span>
              {currentChecked < totalRequired && (
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-blue-600 hover:text-blue-800 hover:underline font-semibold"
                >
                  {t('kanban.stageGate.selectAll', 'Centang Semua')}
                </button>
              )}
            </div>

            {prerequisites.map((p) => {
              const isChecked = Boolean(checkedIds[p.id]);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggleCheck(p.id)}
                  className={`w-full p-2.5 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                    isChecked
                      ? 'bg-emerald-50/70 border-emerald-200 text-slate-800 shadow-2xs'
                      : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    {isChecked ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs font-bold leading-tight ${isChecked ? 'text-emerald-900' : 'text-slate-800'}`}>
                      {p.label}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                      {p.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Lock Status Banner */}
          {!isAllChecked && (
            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2 font-medium mb-4">
              <Lock className="w-4 h-4 shrink-0 text-amber-600" />
              <span>Harap centang seluruh prasyarat di atas untuk membuka kunci tombol konfirmasi.</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors text-center"
            >
              {t('common.cancel', 'Batal')}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={!isAllChecked || isLoading}
              className={`w-full sm:w-auto px-5 py-2.5 rounded-xl text-white text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2 ${
                isAllChecked && !isLoading
                  ? 'bg-[#0F2342] hover:bg-blue-900 hover:shadow-lg cursor-pointer'
                  : 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
              }`}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{t('common.loading', 'Memproses...')}</span>
                </>
              ) : isAllChecked ? (
                <>
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>{t('kanban.stageGate.confirmMove', 'Konfirmasi & Pindahkan')}</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>{language === 'id' ? `Terkunci (${currentChecked}/${totalRequired})` : `Locked (${currentChecked}/${totalRequired})`}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatusConfirmModal;
