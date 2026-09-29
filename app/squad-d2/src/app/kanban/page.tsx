'use client';

import React, { useState, useEffect, useTransition, useMemo, useRef } from 'react';
import { 
  Menu, 
  Search, 
  RefreshCw, 
  History, 
  ChevronDown, 
  Check, 
  X, 
  Sparkles, 
  ShieldCheck, 
  AlertCircle,
  Filter
} from 'lucide-react';
import { ApplicantSidebar } from '../../components/portal/ApplicantSidebar';
import { KanbanColumn } from '../../components/kanban/KanbanColumn';
import { AuditTrailDrawer } from '../../components/kanban/AuditTrailDrawer';
import { CandidateDetailModal } from '../../components/kanban/CandidateDetailModal';
import { RejectionReasonModal } from '../../components/kanban/RejectionReasonModal';
import { CandidateWithJob, CandidateStatus, AuditLog } from '../../types/candidate';
import { KANBAN_COLUMNS, KanbanColumnConfig, getColumnConfig } from '../../types/kanban';
import { 
  getKanbanCandidatesAction, 
  updateCandidateStatusAction, 
  getAuditLogsAction 
} from './actions';

interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  description?: string;
}

export default function KanbanPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [candidates, setCandidates] = useState<CandidateWithJob[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Filter States
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Drawers
  const [auditDrawerOpen, setAuditDrawerOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateWithJob | null>(null);
  const [rejectionTarget, setRejectionTarget] = useState<CandidateWithJob | null>(null);
  const [rejectionModalOpen, setRejectionModalOpen] = useState(false);

  // Toast notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Ref to close status dropdown on outside click
  const dropdownRef = useRef<HTMLDivElement>(null);

  const addToast = (type: 'success' | 'error' | 'info', title: string, description?: string) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, type, title, description }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  // Close status filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setStatusDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Initial Data Fetching (Candidates & Audit Logs)
  const loadData = async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    try {
      const [fetchedCandidates, fetchedLogs] = await Promise.all([
        getKanbanCandidatesAction(),
        getAuditLogsAction(),
      ]);
      setCandidates(fetchedCandidates);
      setAuditLogs(fetchedLogs);
      setIsLoading(false);
      if (isManualRefresh) {
        addToast('info', 'Kanban Board Synchronized', `Loaded ${fetchedCandidates.length} candidate records from database.`);
      }
    } catch (err) {
      console.error('Failed to load Kanban data:', err);
      setIsLoading(false);
      addToast('error', 'Sync Failed', 'Could not retrieve latest data from Supabase.');
    } finally {
      if (isManualRefresh) setIsRefreshing(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    startTransition(() => {
      loadData(false).then(() => {
        if (!isMounted) return;
      });
    });

    return () => {
      isMounted = false;
    };
  }, []);

  // Filter candidates by search query
  const filteredCandidates = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return candidates;

    return candidates.filter((c) => {
      const matchName = c.full_name.toLowerCase().includes(q);
      const matchJob = (c.job_title || c.d2_job_posts?.title || '').toLowerCase().includes(q);
      const matchEmail = (c.email || '').toLowerCase().includes(q);
      const matchStatus = (c.status || '').toLowerCase().includes(q);
      const matchRepeater = (c.application_count || 1) > 1 && 'repeater'.includes(q);
      const matchEligible = (c.rejection_reason || '').toLowerCase().includes('not eligible') && 'not eligible'.includes(q);
      const matchQualified = 'qualified'.includes(q) && c.status !== 'rejected';

      return matchName || matchJob || matchEmail || matchStatus || matchRepeater || matchEligible || matchQualified;
    });
  }, [candidates, searchQuery]);

  // Group candidates into the 5 Columns
  const columnCandidates = useMemo(() => {
    const map: Record<string, CandidateWithJob[]> = {
      applied: [],
      assessment: [],
      interview: [],
      offered: [],
      rejected: [],
    };

    filteredCandidates.forEach((c) => {
      const rawStatus = (c.status || 'applied').toLowerCase();
      // Normalize 'interviewed' -> 'interview'
      const key = rawStatus === 'interviewed' ? 'interview' : rawStatus;
      if (map[key]) {
        map[key].push(c);
      } else {
        map.applied.push(c);
      }
    });

    return map;
  }, [filteredCandidates]);

  // Which columns to display (based on selectedStatusFilter)
  const visibleColumns = useMemo(() => {
    if (selectedStatusFilter === 'all') {
      return KANBAN_COLUMNS;
    }
    return KANBAN_COLUMNS.filter((col) => col.id === selectedStatusFilter);
  }, [selectedStatusFilter]);

  // ============================================================================
  // DRAG & DROP & OPTIMISTIC UI LOGIC (TR-D2-002 TR-06 < 50ms)
  // ============================================================================
  const handleDragStart = (e: React.DragEvent, candidate: CandidateWithJob) => {
    // Already set in CandidateCard, but exposed here if needed
  };

  const executeStatusTransition = async (
    candidateId: string,
    targetStatus: CandidateStatus,
    reason?: string,
    isNotEligible?: boolean
  ) => {
    const optimisticStartTime = performance.now();

    // Find the candidate
    const candidate = candidates.find((c) => c.id === candidateId);
    if (!candidate) return;

    const oldStatus = candidate.status;
    if (oldStatus === targetStatus) return; // No change

    // 1. OPTIMISTIC UI UPDATE (< 50ms Target)
    const previousCandidates = [...candidates];
    setCandidates((prev) =>
      prev.map((c) => {
        if (c.id === candidateId) {
          return {
            ...c,
            status: targetStatus,
            rejection_reason: targetStatus === 'rejected' && isNotEligible ? 'Not Eligible: Permanent rejection' : c.rejection_reason,
            updated_at: new Date().toISOString(),
          };
        }
        return c;
      })
    );

    const uiLatency = Math.round(performance.now() - optimisticStartTime);
    console.info(`[TR-D2-002 TR-06] Optimistic UI rendered in ${uiLatency}ms (< 50ms target)`);

    // 2. BACKGROUND PERSISTENCE & AUDIT LOGGING (TR-09 & TR-06 < 200ms)
    try {
      const result = await updateCandidateStatusAction({
        candidateId,
        newStatus: targetStatus,
        oldStatus,
        actorName: 'Budi Santoso',
        reason,
        isNotEligible,
      });

      if (!result.success) {
        // Rollback state on server failure
        setCandidates(previousCandidates);
        addToast('error', 'Status Update Failed', result.error || 'Server rejected status transition.');
        return;
      }

      console.info(`[TR-D2-002 TR-06] Database update completed in ${result.latencyMs}ms`);

      // Refresh Audit logs silently in background
      getAuditLogsAction().then((logs) => setAuditLogs(logs));

      const targetCol = getColumnConfig(targetStatus);
      addToast(
        'success',
        `Moved to ${targetCol.badgeLabel}`,
        `${candidate.full_name} is now in ${targetCol.badgeLabel} stage (Audit log created in ${result.latencyMs}ms)`
      );
    } catch (err: unknown) {
      // Rollback on network exception
      setCandidates(previousCandidates);
      const msg = err instanceof Error ? err.message : String(err);
      addToast('error', 'Network Error', `Failed to persist status: ${msg}`);
    }
  };

  const handleDropCandidate = (candidateId: string, targetStatus: CandidateStatus) => {
    const candidate = candidates.find((c) => c.id === candidateId);
    if (!candidate) return;

    // If moving to Rejected, open the Rejection Modal to prompt for reason
    if (targetStatus === 'rejected') {
      setRejectionTarget(candidate);
      setRejectionModalOpen(true);
      return;
    }

    executeStatusTransition(candidateId, targetStatus);
  };

  const handleQuickMove = (candidate: CandidateWithJob, targetStatus: CandidateStatus) => {
    if (targetStatus === 'rejected') {
      setRejectionTarget(candidate);
      setRejectionModalOpen(true);
      return;
    }
    executeStatusTransition(candidate.id, targetStatus);
  };

  const handleConfirmRejection = (reason: string, isNotEligible: boolean) => {
    if (!rejectionTarget) return;
    executeStatusTransition(rejectionTarget.id, 'rejected', reason, isNotEligible);
    setRejectionModalOpen(false);
    setRejectionTarget(null);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col lg:flex-row text-slate-800 font-sans antialiased">
      {/* ========================================================================= */}
      {/* 1. LEFT SIDEBAR (Dark Navy #0b1329 with KANBAN PORTAL expanded)           */}
      {/* ========================================================================= */}
      <ApplicantSidebar
        mobileOpen={sidebarOpen}
        onMobileClose={() => setSidebarOpen(false)}
        activeItem="kanban"
      />

      {/* ========================================================================= */}
      {/* 2. MAIN WORKSPACE AREA                                                    */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Top Navigation Bar: sticky top, h-16, centered ANDIMA HRMS */}
        <header className="h-16 border-b border-slate-200/80 bg-white/70 backdrop-blur-sm sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 md:px-8">
          {/* Mobile Drawer Trigger (< 1024px) */}
          <div className="flex items-center lg:hidden">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="p-2 -ml-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              aria-label="Open sidebar navigation"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>

          {/* Center Brand Title */}
          <div className="flex-1 text-center">
            <span className="text-sm md:text-base font-medium tracking-[0.2em] text-slate-800 uppercase">
              ANDIMA HRMS
            </span>
          </div>

          {/* Right Spacer for balance */}
          <div className="w-8 lg:w-0" />
        </header>

        {/* Main Content Body */}
        <main className="flex-1 px-4 sm:px-6 md:px-8 py-6 w-full max-w-[1600px] mx-auto flex flex-col">
          {/* Page Heading matching Figma HRMS D - HR.jpg */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
                KANBAN
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Applicant tracking pipeline with real-time database synchronization &amp; immutable audit logging.
              </p>
            </div>

            {/* Quick Action Badges */}
            <div className="flex items-center gap-2.5">
              {/* Audit Trail Drawer Button */}
              <button
                type="button"
                onClick={() => setAuditDrawerOpen(true)}
                className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-slate-700 hover:text-blue-700 text-xs font-semibold rounded-xl transition-all shadow-2xs group"
              >
                <History className="w-4 h-4 text-blue-600 group-hover:scale-110 transition-transform" />
                <span>Audit Trail</span>
                {auditLogs.length > 0 && (
                  <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {auditLogs.length}
                  </span>
                )}
              </button>

              {/* Refresh Button */}
              <button
                type="button"
                onClick={() => loadData(true)}
                disabled={isRefreshing}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors shadow-2xs disabled:opacity-50"
                title="Sync latest applicants from database"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 3. KANBAN WHITE CONTAINER BOX (matching Figma HRMS D - HR.jpg)            */}
          {/* ========================================================================= */}
          <div className="flex-1 bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-[0_8px_30px_rgb(0,0,0,0.05)] flex flex-col">
            {/* Top Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 mb-6">
              {/* Dropdown: Select Status */}
              <div ref={dropdownRef} className="relative shrink-0 sm:w-48">
                <button
                  type="button"
                  onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
                  className="w-full h-11 px-4 rounded-xl border border-slate-200/90 bg-white hover:border-slate-300 text-left text-xs font-semibold text-slate-700 flex items-center justify-between shadow-2xs transition-all"
                >
                  <div className="flex items-center gap-2 truncate">
                    <Filter className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate">
                      {selectedStatusFilter === 'all'
                        ? 'Select Status'
                        : getColumnConfig(selectedStatusFilter).badgeLabel}
                    </span>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                      statusDropdownOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {/* Status Options Menu */}
                {statusDropdownOpen && (
                  <div className="absolute left-0 mt-1.5 w-full min-w-[200px] bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-40 animate-in fade-in zoom-in-95 duration-100">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedStatusFilter('all');
                        setStatusDropdownOpen(false);
                      }}
                      className={`w-full px-3.5 py-2 text-left text-xs font-semibold flex items-center justify-between transition-colors ${
                        selectedStatusFilter === 'all'
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span>All Columns (5 Statuses)</span>
                      {selectedStatusFilter === 'all' && <Check className="w-3.5 h-3.5 text-blue-600" />}
                    </button>
                    <div className="border-t border-slate-100 my-1" />
                    {KANBAN_COLUMNS.map((col) => {
                      const isSelected = selectedStatusFilter === col.id;
                      return (
                        <button
                          key={col.id}
                          type="button"
                          onClick={() => {
                            setSelectedStatusFilter(col.id);
                            setStatusDropdownOpen(false);
                          }}
                          className={`w-full px-3.5 py-2 text-left text-xs font-semibold flex items-center justify-between transition-colors ${
                            isSelected
                              ? 'bg-blue-50 text-blue-700'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${col.badgeBg}`} />
                            <span>{col.badgeLabel}</span>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-blue-600" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Search Input: Search Spesific Card */}
              <div className="relative flex-1">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  id="search-specific-card"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search Spesific Card"
                  className="w-full h-11 pl-10 pr-9 rounded-xl border border-slate-200/90 bg-[#f1f5f9]/40 text-slate-800 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all shadow-2xs"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200/50"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Active Search / Filter Feedback Bar */}
            {(searchQuery || selectedStatusFilter !== 'all') && (
              <div className="mb-4 flex items-center justify-between bg-blue-50/70 border border-blue-100 px-4 py-2 rounded-xl text-xs text-blue-900">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span>
                    Filtered view:
                    {selectedStatusFilter !== 'all' && (
                      <span className="font-semibold ml-1">Status: {getColumnConfig(selectedStatusFilter).badgeLabel} &bull;</span>
                    )}
                    {searchQuery && (
                      <span className="ml-1">Query: &ldquo;<strong className="font-semibold">{searchQuery}</strong>&rdquo;</span>
                    )}
                    <span className="text-slate-500 ml-1.5">
                      ({filteredCandidates.length} candidate{filteredCandidates.length === 1 ? '' : 's'} matching)
                    </span>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedStatusFilter('all');
                  }}
                  className="text-blue-600 hover:text-blue-800 font-bold underline underline-offset-2 ml-2"
                >
                  Reset Filters
                </button>
              </div>
            )}

            {/* Loading Skeleton */}
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4.5">
                {[1, 2, 3, 4, 5].map((idx) => (
                  <div
                    key={`skeleton-col-${idx}`}
                    className="bg-[#f8fafd] rounded-3xl p-3 border border-slate-200/80 min-h-[500px] animate-pulse flex flex-col justify-between"
                  >
                    <div className="h-9 bg-slate-200 rounded-xl mb-4" />
                    <div className="space-y-3 flex-1">
                      <div className="h-28 bg-white rounded-2xl border border-slate-200 p-4" />
                      <div className="h-28 bg-white rounded-2xl border border-slate-200 p-4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* ========================================================================= */
              /* 4. THE 5 KANBAN COLUMNS (Responsive 5-column layout)                      */
              /* ========================================================================= */
              <div
                className={`grid gap-4.5 items-stretch flex-1 ${
                  visibleColumns.length === 1
                    ? 'grid-cols-1 max-w-md mx-auto w-full'
                    : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-5'
                }`}
              >
                {visibleColumns.map((col) => (
                  <KanbanColumn
                    key={col.id}
                    column={col}
                    candidates={columnCandidates[col.id] || []}
                    onDropCandidate={handleDropCandidate}
                    onDragStartCandidate={handleDragStart}
                    onSelectCandidate={(c) => setSelectedCandidate(c)}
                    onQuickMove={handleQuickMove}
                  />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ========================================================================= */}
      {/* 5. MODALS & SLIDE-OVER DRAWERS                                            */}
      {/* ========================================================================= */}
      {/* A. Immutable Audit Trail Drawer */}
      <AuditTrailDrawer
        isOpen={auditDrawerOpen}
        onClose={() => setAuditDrawerOpen(false)}
        auditLogs={auditLogs}
        isLoading={isPending}
      />

      {/* B. Candidate Detail Modal */}
      <CandidateDetailModal
        isOpen={Boolean(selectedCandidate)}
        candidate={selectedCandidate}
        onClose={() => setSelectedCandidate(null)}
        onMoveCandidate={(id, status) => {
          setSelectedCandidate(null);
          handleDropCandidate(id, status);
        }}
      />

      {/* C. Rejection Reason & Not Eligible Modal */}
      <RejectionReasonModal
        isOpen={rejectionModalOpen}
        candidate={rejectionTarget}
        onClose={() => {
          setRejectionModalOpen(false);
          setRejectionTarget(null);
        }}
        onConfirm={handleConfirmRejection}
      />

      {/* D. Toast Alerts */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto p-4 rounded-2xl shadow-xl border flex items-start gap-3 animate-in slide-in-from-bottom-3 duration-200 ${
              toast.type === 'error'
                ? 'bg-red-50 border-red-200 text-red-900'
                : toast.type === 'info'
                ? 'bg-blue-50 border-blue-200 text-blue-900'
                : 'bg-emerald-50 border-emerald-200 text-emerald-900'
            }`}
          >
            {toast.type === 'error' ? (
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            ) : toast.type === 'info' ? (
              <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            ) : (
              <Check className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 text-xs">
              <h5 className="font-bold leading-snug">{toast.title}</h5>
              {toast.description && (
                <p className="mt-0.5 opacity-90 leading-relaxed">{toast.description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              className="text-slate-400 hover:text-slate-700 shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
