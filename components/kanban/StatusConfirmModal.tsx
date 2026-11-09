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
  const [checkedIds, setCheckedIds] = useState<Record<string, boolean>>({});

  // Generate Stage Gate Checklist items based on Source -> Target Transition (Section 3A)
  const prerequisites: StageGatePrerequisite[] = React.useMemo(() => {
    if (!targetStatus) return [];

    const normTarget = targetStatus.toLowerCase();

    // 1. Candidate -> Screening (Verifikasi Kelengkapan Identitas)
    if (normTarget === 'assessment' || normTarget === 'screening') {
      return [
        {
          id: 'nik_valid',
          label: 'Verifikasi NIK (16 Digit)',
          description: candidate?.nik ? `NIK: ${candidate.nik} (Format 16 digit terdaftar)` : 'Format NIK 16 digit telah diperiksa dan valid',
        },
        {
          id: 'email_active',
          label: 'Verifikasi Alamat Email Aktif',
          description: `Email aktif & terverifikasi: ${candidate?.email || 'kandidat'}`,
        },
        {
          id: 'cv_pdf_valid',
          label: 'Validasi Berkas CV (Format PDF)',
          description: 'Dokumen CV/Resume format .pdf valid (maks 5MB) dan kelengkapan data dasar terisi',
        },
      ];
    }

    // 2. Screening -> Interview (Evaluasi Kualifikasi Selesai)
    if (normTarget === 'interview' || normTarget === 'interviewed') {
      return [
        {
          id: 'fit_proper_evaluated',
          label: 'Evaluasi Kualifikasi Selesai',
          description: 'Status kualifikasi bukan lagi "Not Counted Yet" dan data kompetensi telah ditinjau',
        },
        {
          id: 'threshold_met',
          label: 'Ambang Batas Kecocokan (Threshold)',
          description: 'Kandidat memenuhi target kecocokan kompetensi minimum posisi yang dilamar',
        },
        {
          id: 'competency_aligned',
          label: 'Verifikasi Kebutuhan Tim / Posisi',
          description: 'Standar kompetensi kandidat selaras dengan master posisi modul Squad D1',
        },
      ];
    }

    // 3. Interview -> Offered (Penilaian Wawancara Disetujui)
    if (normTarget === 'offered') {
      return [
        {
          id: 'scorecard_completed',
          label: 'Form Penilaian Wawancara Lengkap',
          description: 'Interview scorecard & evaluasi teknis/perilaku telah diisi oleh interviewer',
        },
        {
          id: 'interviewer_approval',
          label: 'Persetujuan Hasil Wawancara',
          description: 'Hasil wawancara disetujui interviewer untuk diajukan ke tahap offering',
        },
        {
          id: 'salary_availability',
          label: 'Ekspektasi Kompensasi & Tanggal Mulai',
          description: 'Kandidat telah menyepakati rentang remunerasi dan estimasi jadwal onboarding',
        },
      ];
    }

    // 4. Offered -> Hired / Accepted (Penerbitan Kontrak Kerja)
    if (normTarget === 'hired') {
      return [
        {
          id: 'offering_signed',
          label: 'Offering Letter Ditandatangani',
          description: 'Dokumen penawaran kerja (offering letter) resmi telah disepakati dan ditandatangani kandidat',
        },
        {
          id: 'background_check',
          label: 'Verifikasi Dokumen & Background Check',
          description: 'Pemeriksaan berkas asli dan referensi kerja kandidat dinyatakan lengkap dan bersih',
        },
      ];
    }

    // Generic Fallback
    return [
      {
        id: 'generic_review',
        label: 'Verifikasi Kelayakan Tahapan',
        description: 'Telah memastikan berkas dan riwayat kandidat siap dipindahkan ke kolom ini',
      },
    ];
  }, [candidate, targetStatus]);

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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="relative w-full max-w-lg bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden transform animate-in zoom-in-95 duration-150"
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
            <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 transition-colors ${
              isAllChecked ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-blue-50 border-blue-200 text-blue-600'
            }`}>
              {isAllChecked ? <Unlock className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full">
                Stage Gate Validation (FR-D2-002)
              </span>
              <h3 className="text-lg font-bold text-slate-900 mt-1 leading-snug">
                Verifikasi Checklist Prasyarat Perpindahan
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
                {candidate.job_title || 'Pelamar'}
              </p>
              {candidate.email && (
                <p className="text-[11px] text-blue-600 font-semibold truncate mt-0.5 flex items-center gap-1">
                  <span>✉</span>
                  <span>{candidate.email}</span>
                </p>
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className={`text-[10px] font-bold text-white px-2.5 py-0.5 rounded-full ${currentConfig.badgeBg}`}>
                {currentConfig.badgeLabel}
              </span>
              <ArrowRight className="w-3 h-3 text-slate-400" />
              <span className={`text-[10px] font-bold text-white px-2.5 py-0.5 rounded-full ${targetConfig.badgeBg}`}>
                {targetConfig.badgeLabel}
              </span>
            </div>
          </div>

          {/* Prompt Message */}
          <p className="text-xs text-slate-600 leading-relaxed font-medium mb-3">
            Sesuai standar stage gate PT Andima, kartu pelamar terkunci hingga seluruh prasyarat evaluasi terpenuhi:
          </p>

          {/* Checklist Container */}
          <div className="space-y-2 mb-4 bg-[#f8fafc] p-3 rounded-2xl border border-slate-200/80">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 px-1 mb-1">
              <span>PRASYARAT WAJIB ({currentChecked}/{totalRequired} Lengkap)</span>
              {currentChecked < totalRequired && (
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-blue-600 hover:text-blue-800 hover:underline font-semibold"
                >
                  Centang Semua
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
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={!isAllChecked || isLoading}
              className={`px-5 py-2.5 rounded-xl text-white text-sm font-bold shadow-md transition-all flex items-center gap-2 ${
                isAllChecked && !isLoading
                  ? 'bg-[#0F2342] hover:bg-blue-900 hover:shadow-lg cursor-pointer'
                  : 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
              }`}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Memproses...</span>
                </>
              ) : isAllChecked ? (
                <>
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Konfirmasi &amp; Pindahkan</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Terkunci ({currentChecked}/{totalRequired})</span>
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
