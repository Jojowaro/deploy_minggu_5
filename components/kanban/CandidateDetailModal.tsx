'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  X, 
  User, 
  Briefcase, 
  Mail, 
  Phone, 
  FileText, 
  History, 
  ArrowRight, 
  ShieldCheck, 
  UserCheck, 
  Calendar 
} from 'lucide-react';
import { CandidateWithJob, CandidateStatus, AuditLog } from '@/app/squad-d2/src/types/candidate';
import { KANBAN_COLUMNS, getColumnConfig } from '@/app/squad-d2/src/types/kanban';
import { getAuditLogsAction } from '@/app/squad-d2/src/app/kanban/actions';
import { formatOrdinal } from '@/utils/formatOrdinal';
import { useLanguage } from '@/lib/i18n/LanguageContext';

export interface CandidateDetailModalProps {
  isOpen: boolean;
  candidate: CandidateWithJob | null;
  onClose: () => void;
  onMoveCandidate: (candidateId: string, targetStatus: CandidateStatus) => void;
  onProcessHiring?: (candidate: CandidateWithJob) => void;
}

export const CandidateDetailModal: React.FC<CandidateDetailModalProps> = ({
  isOpen,
  candidate,
  onClose,
  onMoveCandidate,
  onProcessHiring,
}) => {
  const { language, t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'details' | 'history' | 'audit'>('details');
  const [candidateLogs, setCandidateLogs] = useState<AuditLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [repeatHistory, setRepeatHistory] = useState<any[]>([]);
  const [repeatInfo, setRepeatInfo] = useState<{ isRepeat: boolean; count: number; label: string | null } | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

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

      // Fetch repeat applicant history via /api/squad-d2/repeat-applicants
      setLoadingHistory(true);
      fetch(`/api/squad-d2/repeat-applicants?candidateId=${encodeURIComponent(candidate.id)}&email=${encodeURIComponent(candidate.email || '')}`)
        .then((r) => r.json())
        .then((json) => {
          if (isMounted && json.success) {
            setRepeatHistory(json.history || []);
            setRepeatInfo({
              isRepeat: json.isRepeatApplicant,
              count: json.applicationCount,
              label: json.repeatLabel,
            });
          }
        })
        .catch((err) => console.warn('History lookup error:', err))
        .finally(() => {
          if (isMounted) setLoadingHistory(false);
        });

      return () => {
        isMounted = false;
      };
    }
  }, [isOpen, candidate?.id, candidate?.email]);

  if (!isOpen || !candidate) return null;

  const currentColumn = getColumnConfig(candidate.status);
  const applicationCount = repeatInfo?.count || candidate.application_count || 1;
  const isRepeater = applicationCount >= 2;
  const repeatLabel = t(
    'kanban.card.nthApplicant',
    {
      count: applicationCount,
      ordinal: formatOrdinal(applicationCount),
    },
    `${formatOrdinal(applicationCount)} Applicant`
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="relative bg-white rounded-2xl sm:rounded-3xl max-w-[calc(100vw-32px)] sm:max-w-2xl w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 md:p-8 shadow-2xl border border-slate-200 z-10 animate-in fade-in zoom-in-95 duration-150 flex flex-col">
        {/* Top Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-base sm:text-lg flex items-center justify-center shadow-md shrink-0">
              {candidate.full_name.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight truncate">
                  {candidate.full_name}
                </h2>
                {isRepeater && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#b47614] text-white shadow-2xs">
                    {repeatLabel}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5 truncate">
                <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{candidate.job_title || 'Backend Engineer'}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shrink-0 ml-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation (FR-D2-005 FR-05.3: Tab khusus History) */}
        <div className="flex items-center gap-2 pt-4 pb-2 border-b border-slate-100 text-xs overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={`px-3.5 sm:px-4 py-2 rounded-xl font-semibold transition-all cursor-pointer shrink-0 ${
              activeTab === 'details'
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {t('kanban.candidateDetail.tabs.details', 'Details & Pipeline')}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-3.5 sm:px-4 py-2 rounded-xl font-semibold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'history'
                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>{t('kanban.candidateDetail.tabs.history', 'History')}</span>
            {isRepeater && (
              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            className={`px-3.5 sm:px-4 py-2 rounded-xl font-semibold transition-all cursor-pointer shrink-0 ${
              activeTab === 'audit'
                ? 'bg-slate-100 text-slate-900 border border-slate-200 font-bold'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {t('kanban.candidateDetail.tabs.audit', 'Audit Trail')}
          </button>
        </div>

        {/* TAB 1: DETAILS & PIPELINE */}
        {activeTab === 'details' && (
          <div className="space-y-4 pt-4">
            {/* Candidate Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs">
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <Mail className="w-4 h-4 text-blue-600 shrink-0" />
                <div className="truncate">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    {t('common.email', 'Email')}
                  </span>
                  <span className="font-semibold text-slate-800 truncate">{candidate.email}</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    {t('common.phone', 'Nomor Telepon')}
                  </span>
                  <span className="font-semibold text-slate-800">
                    {candidate.phone_number || t('kanban.candidateDetail.phoneNotListed', 'Tidak dicantumkan')}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <User className="w-4 h-4 text-purple-600 shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    {t('register.nikLabel', 'Nomor Induk Kependudukan (NIK)')}
                  </span>
                  <span className="font-semibold text-slate-800 font-mono">
                    {candidate.nik || t('kanban.candidateDetail.nikRequiredScreening', 'Belum diisi (Wajib saat screening)')}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <Calendar className="w-4 h-4 text-indigo-600 shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    {t('kanban.card.applicationDate', 'Tanggal Melamar')}
                  </span>
                  <span className="font-semibold text-slate-800">
                    {candidate.applied_at || candidate.created_at
                      ? new Date(candidate.applied_at || candidate.created_at).toLocaleDateString(
                          language === 'id' ? 'id-ID' : 'en-US',
                          {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          }
                        )
                      : '-'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <Briefcase className="w-4 h-4 text-amber-600 shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    {t('register.registrationWayLabel', 'Jalur Pendaftaran')}
                  </span>
                  <span className="font-semibold text-slate-800 capitalize">
                    {candidate.registration_way}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <FileText className="w-4 h-4 text-rose-600 shrink-0" />
                <div className="truncate flex-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    {t('register.cvUploadLabel', 'Berkas CV (PDF)')}
                  </span>
                  <span className="font-medium text-slate-700 truncate block">
                    {candidate.cv_file_path
                      ? candidate.cv_file_path.split('/').pop()
                      : t('kanban.candidateDetail.noFile', 'Tidak ada berkas')}
                  </span>
                </div>
              </div>
            </div>

            {/* Rejection Stage Context (Section 2 No 6) */}
            {candidate.status === 'rejected' && candidate.rejected_at_stage && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-center justify-between">
                <span>
                  {t(
                    'kanban.candidateDetail.rejectionContext',
                    {
                      stage: t(
                        `kanban.stages.${candidate.rejected_at_stage.toLowerCase()}`,
                        candidate.rejected_at_stage
                      ),
                    },
                    `Konteks Riwayat Penolakan: Pelamar gugur pada tahap ${candidate.rejected_at_stage}.`
                  )}
                </span>
              </div>
            )}

            {/* Pipeline Stage Transitions Selector */}
            <div className="py-4 border-t border-slate-100">
              <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5 flex items-center justify-between">
                <span>{t('kanban.candidateDetail.currentPipelineStatus', 'Current Pipeline Status')}</span>
                <span
                  className={`px-3 py-0.5 rounded-full text-[11px] font-semibold text-white ${currentColumn.badgeBg}`}
                >
                  {t(`kanban.stages.${currentColumn.id.toLowerCase()}`, currentColumn.badgeLabel)}
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {KANBAN_COLUMNS.map((col) => {
                  const isCurrent = (candidate.status === 'interviewed' ? 'interview' : candidate.status) === col.id;
                  const localizedStage = t(`kanban.stages.${col.id.toLowerCase()}`, col.badgeLabel);
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
                          : 'bg-white border border-slate-200 text-slate-700 hover:border-blue-500 hover:text-blue-600 hover:shadow-xs active:scale-[0.98] cursor-pointer'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${col.badgeBg}`} />
                      <span>
                        {t('kanban.candidateDetail.moveTo', { stage: localizedStage }, `Move to ${localizedStage}`)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: HISTORY (FR-D2-005 FR-05.3, FR-05.4, FR-05.5) */}
        {activeTab === 'history' && (
          <div className="py-4 space-y-4">
            <div className="flex items-center justify-between bg-amber-50 border border-amber-200 p-3 rounded-2xl text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-600" />
                <span className="font-bold text-amber-900">
                  {isRepeater ? repeatLabel : t('kanban.candidateDetail.firstTimeApplicant', 'Kandidat Pertama Kali')}
                </span>
              </div>
              <span className="text-[10px] font-semibold text-amber-700 uppercase bg-amber-100 px-2 py-0.5 rounded-md">
                {t('kanban.candidateDetail.readOnlyHistory', 'TR-10 Read-Only History')}
              </span>
            </div>

            {loadingHistory ? (
              <div className="py-8 text-center text-xs text-slate-400">
                {t('kanban.candidateDetail.loadingHistory', 'Loading history records...')}
              </div>
            ) : repeatHistory.length === 0 ? (
              /* FR-D2-005 3.a.ii: Pesan standar jika tidak ada riwayat */
              <div className="py-12 text-center text-xs text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <p className="font-medium text-slate-700 mb-1">
                  {t('kanban.candidateDetail.noHistoryTitle', 'Tidak ada riwayat lamaran sebelumnya.')}
                </p>
                <p className="text-[11px] text-slate-400">
                  {t(
                    'kanban.candidateDetail.noHistoryDesc',
                    'Kandidat belum terdaftar pada periode rekrutmen masa lalu berdasarkan pencocokan Email / NIK.'
                  )}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {repeatHistory.map((item, idx) => (
                  <div
                    key={item.id || `hist-${idx}`}
                    className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 text-xs space-y-2 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{item.job_title}</h4>
                        <time className="text-[11px] text-slate-500">
                          {t('kanban.candidateDetail.applicationDate', 'Tanggal Lamaran:')}{' '}
                          {new Date(item.application_date).toLocaleDateString(
                            language === 'id' ? 'id-ID' : 'en-US',
                            { month: 'long', year: 'numeric' }
                          )}
                        </time>
                      </div>
                      <span className="px-3 py-1 rounded-full text-[10px] font-bold text-white uppercase bg-[#e11d48] shadow-2xs">
                        {t(`kanban.stages.${(item.status || 'rejected').toLowerCase()}`, item.status || 'REJECTED')}
                      </span>
                    </div>

                    {/* FR-05.4: Nilai Penilaian (Assessment Score) */}
                    {item.assessment_score !== undefined && item.assessment_score !== null && (
                      <div className="flex items-center gap-2 p-2 rounded-xl bg-white border border-slate-200/80">
                        <span className="font-semibold text-slate-700">
                          {t('kanban.candidateDetail.assessmentScore', 'Skor Asesmen Terdahulu:')}
                        </span>
                        <span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                          {item.assessment_score} / 100
                        </span>
                        {item.assessment_notes && (
                          <span className="text-[11px] text-slate-500 italic truncate max-w-xs">
                            ({item.assessment_notes})
                          </span>
                        )}
                      </div>
                    )}

                    {/* FR-05.5: Catatan Alasan Tertulis Mengapa Ditolak */}
                    {item.rejection_reason && (
                      <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-100 text-[11px] text-rose-900 leading-relaxed">
                        <span className="font-bold">
                          {t('kanban.candidateDetail.rejectionReason', 'Alasan Penolakan Tertulis:')}{' '}
                        </span>
                        <span>{item.rejection_reason}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: AUDIT TRAIL */}
        {activeTab === 'audit' && (
          <div className="py-4 flex-1">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-slate-400" />
              {t('kanban.candidateDetail.auditHistoryTitle', 'Audit Trail History (Candidate Transitions)')}
            </h4>

            {loadingLogs ? (
              <div className="py-6 text-center text-xs text-slate-400">
                {t('kanban.candidateDetail.loadingAudit', 'Loading audit records...')}
              </div>
            ) : candidateLogs.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                {t('kanban.candidateDetail.noAudit', 'No transition logs recorded yet for this candidate.')}
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
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
                            {t(`kanban.stages.${oldCfg.id.toLowerCase()}`, oldCfg.badgeLabel)}
                          </span>
                          <ArrowRight className="w-3 h-3 text-slate-400" />
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold text-white ${newCfg.badgeBg}`}>
                            {t(`kanban.stages.${newCfg.id.toLowerCase()}`, newCfg.badgeLabel)}
                          </span>
                          <span className="text-slate-500 ml-1">
                            {t('kanban.candidateDetail.by', 'by')} {log.actor_name}
                          </span>
                        </div>
                        {log.change_reason && (
                          <p className="text-[10px] text-slate-600 italic">{log.change_reason}</p>
                        )}
                      </div>
                      <time className="text-[10px] text-slate-400 shrink-0 ml-2">
                        {new Date(log.created_at).toLocaleTimeString(
                          language === 'id' ? 'id-ID' : 'en-US',
                          { hour: '2-digit', minute: '2-digit' }
                        )}
                      </time>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Modal Footer */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Link
              href={`/fit-proper?candidateId=${candidate.id}`}
              onClick={onClose}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 shadow-xs transition-colors cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{t('kanban.candidateDetail.fitProperBtn', 'Fit & Proper')}</span>
            </Link>

            {onProcessHiring && (candidate.status === 'offered' || candidate.status === 'hired') && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onProcessHiring(candidate);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs transition-colors cursor-pointer"
              >
                <UserCheck className="w-4 h-4" />
                <span>{t('kanban.candidateDetail.convertBtn', 'Konversi ke Karyawan')}</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            {t('kanban.candidateDetail.closeBtn', 'Tutup')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CandidateDetailModal;
