'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  UserCheck, 
  ShieldCheck, 
  Lock, 
  BadgeCheck, 
  AlertCircle 
} from 'lucide-react';
import { CandidateWithJob, EmployeeTier } from '@/app/squad-d2/src/types/candidate';
import { UserProfile, isHRManager } from '@/utils/auth';
import { useLanguage } from '@/lib/i18n/LanguageContext';

export interface EmployeeProvisioningData {
  candidateId: string;
  employeeTier: EmployeeTier;
  employeeId: string;
  department: string;
  positionTitle: string;
  startDate: string;
  initialPassword?: string;
}

export interface EmployeeProvisioningModalProps {
  isOpen: boolean;
  candidate: CandidateWithJob | null;
  currentUser: UserProfile | null;
  onClose: () => void;
  onConfirmHiring: (data: EmployeeProvisioningData) => Promise<void> | void;
}

export const EmployeeProvisioningModal: React.FC<EmployeeProvisioningModalProps> = ({
  isOpen,
  candidate,
  currentUser,
  onClose,
  onConfirmHiring,
}) => {
  const { t } = useLanguage();
  const isManager = isHRManager(currentUser?.role);

  const [tier, setTier] = useState<EmployeeTier>('trainee');
  const [employeeId, setEmployeeId] = useState('');
  const [department, setDepartment] = useState('Operasional Armada');
  const [positionTitle, setPositionTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Auto-generate formal Employee ID (NIP) based on tier
  const generateNip = (selectedTier: EmployeeTier) => {
    const year = new Date().getFullYear();
    const randomSuffix = Math.floor(100 + Math.random() * 900); // 3 digits
    let prefix = 'TRN';
    if (selectedTier === 'associate_trainee') prefix = 'AST';
    if (selectedTier === 'probationary_staff') prefix = 'PRB';
    if (selectedTier === 'permanent' || selectedTier === 'contract') prefix = 'EMP';

    return `ANDIMA-${year}-${prefix}-${randomSuffix}`;
  };

  useEffect(() => {
    if (isOpen && candidate) {
      const generated = generateNip('trainee');
      setTier('trainee');
      setEmployeeId(generated);
      setPositionTitle(candidate.job_title || 'Staf Operasional');
      setDepartment('Operasional Transportasi & Logistik');

      // Default start date: next Monday
      const d = new Date();
      d.setDate(d.getDate() + ((7 - d.getDay() + 1) % 7 || 7));
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      setStartDate(`${yyyy}-${mm}-${dd}`);
      setErrorMsg(null);
    }
  }, [isOpen, candidate]);

  if (!isOpen || !candidate) return null;

  const handleTierChange = (newTier: EmployeeTier) => {
    setTier(newTier);
    setEmployeeId(generateNip(newTier));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isManager) {
      setErrorMsg(t('kanban.provisioning.errors.accessDenied', 'Akses ditolak: Hanya HR Manager yang berwenang mengeksekusi konversi ke karyawan resmi.'));
      return;
    }
    if (!employeeId.trim()) {
      setErrorMsg(t('kanban.provisioning.errors.nipRequired', 'Nomor Induk Pegawai (NIP) wajib diisi.'));
      return;
    }
    if (!startDate) {
      setErrorMsg(t('kanban.provisioning.errors.startDateRequired', 'Silakan pilih tanggal mulai bekerja.'));
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirmHiring({
        candidateId: candidate.id,
        employeeTier: tier,
        employeeId: employeeId.trim(),
        department,
        positionTitle,
        startDate,
      });
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('kanban.provisioning.errors.failed', 'Gagal memproses konversi karyawan');
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const tierOptions = [
    {
      id: 'trainee' as EmployeeTier,
      label: t('kanban.provisioning.tiers.trainee.label', 'Trainee'),
      desc: t('kanban.provisioning.tiers.trainee.desc', 'Program Pelatihan Magang / Pengemudi Baru'),
    },
    {
      id: 'associate_trainee' as EmployeeTier,
      label: t('kanban.provisioning.tiers.associateTrainee.label', 'Associate Trainee'),
      desc: t('kanban.provisioning.tiers.associateTrainee.desc', 'Junior / Operasional Lapangan'),
    },
    {
      id: 'probationary_staff' as EmployeeTier,
      label: t('kanban.provisioning.tiers.probation.label', 'Probation (Percobaan)'),
      desc: t('kanban.provisioning.tiers.probation.desc', 'Masa Percobaan 3 Bulan'),
    },
    {
      id: 'permanent' as EmployeeTier,
      label: t('kanban.provisioning.tiers.permanent.label', 'Contract / Permanent'),
      desc: t('kanban.provisioning.tiers.permanent.desc', 'Karyawan Kontrak / Tetap'),
    },
  ];

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="relative w-full max-w-[calc(100vw-32px)] sm:max-w-xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden transform animate-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar Accent */}
        <div className="h-3 w-full bg-gradient-to-r from-emerald-500 via-teal-600 to-[#0F2342] shrink-0" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute top-4 right-4 sm:top-5 sm:right-5 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-4 sm:p-8 overflow-y-auto">
          {/* Header Title */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0 shadow-2xs">
              <UserCheck className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                {t('kanban.provisioning.badge', 'Employee Provisioning (Section 3C)')}
              </span>
              <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 mt-1 leading-snug">
                {t('kanban.provisioning.title', 'Konversi Pelamar Menjadi Karyawan')}
              </h3>
            </div>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed font-medium mb-4">
            {t(
              'kanban.provisioning.subtitle',
              'Menerbitkan Nomor Induk Pegawai (NIP), akun sistem internal, dan mengintegrasikan data pelamar lolos ke struktur organisasi resmi PT Andima Transportindo.'
            )}
          </p>

          {/* Role Check Alert if not HR Manager */}
          {!isManager && (
            <div className="mb-4 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2 font-medium">
              <Lock className="w-4 h-4 shrink-0 text-amber-600" />
              <span>
                <strong>{t('kanban.provisioning.previewModeLabel', 'Mode Pratinjau:')}</strong>{' '}
                {t('kanban.provisioning.previewWarning', 'Eksekusi konversi karyawan adalah hak prerogatif eksekutif HR Manager (RBAC Mas Bram).')}
              </span>
            </div>
          )}

          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium text-center flex items-center justify-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Candidate Profile Summary */}
          <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-bold text-slate-900">{candidate.full_name}</p>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">
                  {candidate.job_title || t('kanban.provisioning.candidateFallback', 'Kandidat')}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                <span>✉ {candidate.email}</span>
                {candidate.nik && <span>• NIK: {candidate.nik}</span>}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 1. Tingkatan Kerja Awal (Employee Tier) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                {t('kanban.provisioning.selectTierLabel', 'Pilih Tingkatan Kerja Awal (Initial Status):')}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {tierOptions.map((item) => {
                  const isSelected = tier === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleTierChange(item.id)}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-950 ring-1 ring-emerald-500 shadow-2xs'
                          : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold">{item.label}</span>
                        {isSelected && <BadgeCheck className="w-4 h-4 text-emerald-600" />}
                      </div>
                      <p className="text-[11px] text-slate-500 leading-tight">{item.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Generated Employee ID (NIP) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  {t('kanban.provisioning.nipLabel', 'Nomor Induk Pegawai (NIP Resmi):')}
                </label>
                <button
                  type="button"
                  onClick={() => setEmployeeId(generateNip(tier))}
                  className="text-[11px] font-semibold text-blue-600 hover:underline cursor-pointer"
                >
                  {t('kanban.provisioning.regenerateNip', 'Regenerate NIP')}
                </button>
              </div>
              <input
                type="text"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white font-mono font-bold text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                required
              />
            </div>

            {/* 3. Posisi & Departemen */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  {t('kanban.provisioning.positionLabel', 'Jabatan / Posisi Resmi:')}
                </label>
                <input
                  type="text"
                  value={positionTitle}
                  onChange={(e) => setPositionTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  {t('kanban.provisioning.departmentLabel', 'Departemen:')}
                </label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  required
                />
              </div>
            </div>

            {/* 4. Tanggal Mulai Bekerja (Start Date) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                {t('kanban.provisioning.startDateLabel', 'Tanggal Mulai Bekerja (Join / Onboarding Date):')}
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                required
              />
            </div>

            {/* Bottom Actions */}
            <div className="pt-3 border-t border-slate-100 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition-colors cursor-pointer text-center"
              >
                {t('kanban.provisioning.cancel', 'Batal')}
              </button>
              <button
                type="submit"
                disabled={!isManager || isSubmitting}
                className={`w-full sm:w-auto px-6 py-2.5 rounded-xl text-white text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 ${
                  isManager && !isSubmitting
                    ? 'bg-emerald-600 hover:bg-emerald-700 hover:shadow-lg cursor-pointer'
                    : 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>{t('kanban.provisioning.issuing', 'Menerbitkan User ID...')}</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>{t('kanban.provisioning.confirm', 'Konfirmasi & Terbitkan Karyawan')}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EmployeeProvisioningModal;
