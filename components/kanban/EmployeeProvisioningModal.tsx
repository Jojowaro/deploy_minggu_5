'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  UserCheck, 
  ShieldCheck, 
  Lock, 
  Briefcase, 
  Building2, 
  Calendar, 
  Mail, 
  Sparkles, 
  BadgeCheck, 
  AlertCircle 
} from 'lucide-react';
import { CandidateWithJob, EmployeeTier } from '@/app/squad-d2/src/types/candidate';
import { UserProfile, isHRManager } from '@/utils/auth';

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
      setPositionTitle(candidate.job_title || candidate.d2_job_posts?.title || 'Staf Operasional');
      setDepartment(candidate.d2_job_posts?.department || 'Operasional Transportasi & Logistik');

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
      setErrorMsg('Akses ditolak: Hanya HR Manager yang berwenang mengeksekusi konversi ke karyawan resmi.');
      return;
    }
    if (!employeeId.trim()) {
      setErrorMsg('Nomor Induk Pegawai (NIP) wajib diisi.');
      return;
    }
    if (!startDate) {
      setErrorMsg('Silakan pilih tanggal mulai bekerja.');
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
      const msg = err instanceof Error ? err.message : 'Gagal memproses konversi karyawan';
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden transform animate-in zoom-in-95 duration-150 max-h-[94vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar Accent */}
        <div className="h-3 w-full bg-gradient-to-r from-emerald-500 via-teal-600 to-[#0F2342] shrink-0" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute top-5 right-5 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 sm:p-8 overflow-y-auto">
          {/* Header Title */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0 shadow-2xs">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Employee Provisioning (Section 3C)
              </span>
              <h3 className="text-xl font-extrabold text-slate-900 mt-1 leading-snug">
                Konversi Pelamar Menjadi Karyawan
              </h3>
            </div>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed font-medium mb-4">
            Menerbitkan Nomor Induk Pegawai (NIP), akun sistem internal, dan mengintegrasikan data pelamar lolos ke struktur organisasi resmi PT Andima Transportindo.
          </p>

          {/* Role Check Alert if not HR Manager */}
          {!isManager && (
            <div className="mb-4 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2 font-medium">
              <Lock className="w-4 h-4 shrink-0 text-amber-600" />
              <span>
                <strong>Mode Pratinjau:</strong> Eksekusi konversi karyawan adalah hak prerogatif eksekutif <strong>HR Manager</strong> (RBAC Mas Bram).
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
          <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-slate-900">{candidate.full_name}</p>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">
                  {candidate.job_title || 'Kandidat'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                <span>✉ {candidate.email}</span>
                {candidate.nik && <span>• NIK: {candidate.nik}</span>}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 1. Tingkatan Kerja Awal (Employee Tier) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Pilih Tingkatan Kerja Awal (Initial Status):
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { id: 'trainee' as EmployeeTier, label: 'Trainee', desc: 'Program Pelatihan Magang / Pengemudi Baru' },
                  { id: 'associate_trainee' as EmployeeTier, label: 'Associate Trainee', desc: 'Junior / Operasional Lapangan' },
                  { id: 'probationary_staff' as EmployeeTier, label: 'Probation (Percobaan)', desc: 'Masa Percobaan 3 Bulan' },
                  { id: 'permanent' as EmployeeTier, label: 'Contract / Permanent', desc: 'Karyawan Kontrak / Tetap' },
                ].map((item) => {
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
                  Nomor Induk Pegawai (NIP Resmi):
                </label>
                <button
                  type="button"
                  onClick={() => setEmployeeId(generateNip(tier))}
                  className="text-[11px] font-semibold text-blue-600 hover:underline"
                >
                  Regenerate NIP
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
                  Jabatan / Posisi Resmi:
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
                  Departemen:
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
                Tanggal Mulai Bekerja (Join / Onboarding Date):
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
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={!isManager || isSubmitting}
                className={`px-6 py-2.5 rounded-xl text-white text-xs font-bold shadow-md transition-all flex items-center gap-2 ${
                  isManager && !isSubmitting
                    ? 'bg-emerald-600 hover:bg-emerald-700 hover:shadow-lg cursor-pointer'
                    : 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Menerbitkan User ID...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Konfirmasi &amp; Terbitkan Karyawan</span>
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
