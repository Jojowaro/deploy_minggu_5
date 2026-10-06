'use client';

import React, { useState, useEffect, useTransition, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
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
  Filter,
  Plus
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { KanbanColumn } from '@/components/kanban/KanbanColumn';
import { AuditTrailDrawer } from '@/components/kanban/AuditTrailDrawer';
import { CandidateDetailModal } from '@/components/kanban/CandidateDetailModal';
import { RejectionReasonModal } from '@/components/kanban/RejectionReasonModal';
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
  const router = useRouter();
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

  // Dynamic Column Pipeline States (with localStorage persistence)
  const [columns, setColumns] = useState<KanbanColumnConfig[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('andima_kanban_columns');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // fallback
        }
      }
    }
    return KANBAN_COLUMNS;
  });

  useEffect(() => {
    try {
      localStorage.setItem('andima_kanban_columns', JSON.stringify(columns));
    } catch {
      // ignore
    }
  }, [columns]);

  // Column CRUD Modals
  const [deleteTargetColumn, setDeleteTargetColumn] = useState<KanbanColumnConfig | null>(null);
  const [editingColumn, setEditingColumn] = useState<KanbanColumnConfig | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [addStatusModalOpen, setAddStatusModalOpen] = useState(false);
  const [newStatusLabel, setNewStatusLabel] = useState('');
  const [selectedColor, setSelectedColor] = useState({
    hex: '#6366f1',
    bg: 'bg-[#6366f1]',
  });

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

  // Initial Data Fetching via Squad D2 API Endpoints
  const loadData = async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    try {
      const [candRes, logsRes] = await Promise.all([
        fetch('/api/squad-d2/candidates'),
        fetch('/api/squad-d2/audit-logs'),
      ]);

      let fetchedCandidates: CandidateWithJob[] = [];
      let fetchedLogs: AuditLog[] = [];

      if (candRes.ok) {
        const candJson = await candRes.json();
        if (candJson.success && Array.isArray(candJson.data)) {
          fetchedCandidates = candJson.data;
        }
      }
      if (fetchedCandidates.length === 0) {
        fetchedCandidates = await getKanbanCandidatesAction();
      }

      if (logsRes.ok) {
        const logsJson = await logsRes.json();
        if (logsJson.success && Array.isArray(logsJson.data)) {
          fetchedLogs = logsJson.data;
        }
      }
      if (fetchedLogs.length === 0) {
        fetchedLogs = await getAuditLogsAction();
      }

      setCandidates(fetchedCandidates);
      setAuditLogs(fetchedLogs);
      setIsLoading(false);
      if (isManualRefresh) {
        addToast('info', 'Kanban Board Synchronized', `Loaded ${fetchedCandidates.length} candidate records from database.`);
      }
    } catch (err) {
      console.error('Failed to load Kanban data:', err);
      setIsLoading(false);
      addToast('error', 'Sync Failed', 'Could not retrieve latest data from API.');
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

  const activeColumns = useMemo(() => {
    return columns.filter((col) => !col.isDeleted);
  }, [columns]);

  // Group candidates into Active Columns
  const columnCandidates = useMemo(() => {
    const map: Record<string, CandidateWithJob[]> = {};
    activeColumns.forEach((col) => {
      map[col.id] = [];
    });
    // Ensure standard columns exist in map so fallback works
    ['applied', 'assessment', 'interview', 'offered', 'rejected'].forEach((k) => {
      if (!map[k]) map[k] = [];
    });

    filteredCandidates.forEach((c) => {
      const rawStatus = (c.status || 'applied').toLowerCase();
      const key = rawStatus === 'interviewed' ? 'interview' : rawStatus;
      if (map[key]) {
        map[key].push(c);
      } else {
        if (!map.applied) map.applied = [];
        map.applied.push(c);
      }
    });

    return map;
  }, [activeColumns, filteredCandidates]);

  // Which columns to display (based on selectedStatusFilter)
  const visibleColumns = useMemo(() => {
    if (selectedStatusFilter === 'all') {
      return activeColumns;
    }
    return activeColumns.filter((col) => col.id === selectedStatusFilter);
  }, [activeColumns, selectedStatusFilter]);

  const handleOpenDeleteModal = (col: KanbanColumnConfig) => {
    setDeleteTargetColumn(col);
  };

  const handleConfirmSoftDelete = (columnId: string) => {
    setColumns((prev) =>
      prev.map((c) => (c.id === columnId ? { ...c, isDeleted: true } : c))
    );
    if (selectedStatusFilter === columnId) {
      setSelectedStatusFilter('all');
    }
    addToast('info', 'Status Deleted', 'Status column has been soft deleted.');
    setDeleteTargetColumn(null);
  };

  const handleOpenEditModal = (col: KanbanColumnConfig) => {
    setEditingColumn(col);
    setEditLabel(col.label);
  };

  const handleSaveEditColumn = () => {
    if (!editingColumn || !editLabel.trim()) return;
    const updatedLabel = editLabel.trim().toUpperCase();
    setColumns((prev) =>
      prev.map((c) =>
        c.id === editingColumn.id
          ? { ...c, label: updatedLabel, badgeLabel: editLabel.trim() }
          : c
      )
    );
    addToast('success', 'Status Updated', `Status changed to ${updatedLabel}.`);
    setEditingColumn(null);
  };

  const handleAddStatus = () => {
    const label = newStatusLabel.trim();
    if (!label) return;
    const id = label.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || `custom-${Date.now()}`;

    if (columns.some((c) => c.id === id && !c.isDeleted)) {
      addToast('error', 'Status Exists', 'A status with this name already exists.');
      return;
    }

    const newCol: KanbanColumnConfig = {
      id,
      label: label.toUpperCase(),
      badgeLabel: label,
      colorHex: selectedColor.hex,
      badgeBg: selectedColor.bg,
      badgeText: 'text-white',
      headerBg: 'bg-[#e7eef8]',
      headerText: 'text-slate-700',
      targetStage: 'assessment',
    };

    setColumns((prev) => [...prev, newCol]);
    addToast('success', 'Status Added', `New status "${newCol.label}" has been added.`);
    setNewStatusLabel('');
    setAddStatusModalOpen(false);
  };

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
    <div className="min-h-screen bg-[#f8fafc] flex flex-col text-slate-800 font-sans antialiased">
      {/* Top Navigation Bar */}
      <Header onMenuClick={() => window.dispatchEvent(new Event('open-sidebar'))} />

      {/* Main Content Body */}
      <main className="flex-1 px-4 sm:px-6 md:px-8 py-6 w-full max-w-[1600px] mx-auto flex flex-col">
          {/* Page Heading matching Figma HRMS D - HR.jpg & Image 1 */}
          <div className="mb-5">
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
              KANBAN
            </h1>
          </div>

          {/* ========================================================================= */}
          {/* 3. KANBAN WHITE CONTAINER BOX (matching Figma HRMS D - HR.jpg & Image 1)  */}
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
                    <span className="truncate">
                      {selectedStatusFilter === 'all'
                        ? 'Select Status'
                        : activeColumns.find((c) => c.id === selectedStatusFilter)?.badgeLabel || getColumnConfig(selectedStatusFilter).badgeLabel}
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
                      <span>All Columns ({activeColumns.length} Statuses)</span>
                      {selectedStatusFilter === 'all' && <Check className="w-3.5 h-3.5 text-blue-600" />}
                    </button>
                    <div className="border-t border-slate-100 my-1" />
                    {activeColumns.map((col) => {
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
                      <span className="font-semibold ml-1">Status: {activeColumns.find((c) => c.id === selectedStatusFilter)?.badgeLabel || getColumnConfig(selectedStatusFilter).badgeLabel} &bull;</span>
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
              <div className="flex gap-4 items-stretch flex-1 overflow-x-auto pb-4 pt-1 w-full scrollbar-thin">
                {[1, 2, 3, 4, 5].map((idx) => (
                  <div
                    key={`skeleton-col-${idx}`}
                    className="min-w-[280px] w-[280px] shrink-0 bg-[#f8fafd] rounded-3xl p-3 border border-slate-200/80 min-h-[580px] animate-pulse flex flex-col justify-between"
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
              /* 4. THE KANBAN COLUMNS (Horizontal scrollable with Add Status column)      */
              /* ========================================================================= */
              <div className="flex gap-4 items-stretch flex-1 overflow-x-auto pb-4 pt-1 w-full scrollbar-thin">
                {visibleColumns.map((col) => (
                  <div key={col.id} className="min-w-[280px] w-[280px] shrink-0 flex flex-col">
                    <KanbanColumn
                      column={col}
                      candidates={columnCandidates[col.id] || []}
                      onDropCandidate={handleDropCandidate}
                      onDragStartCandidate={handleDragStart}
                      onSelectCandidate={(c) => {
                        router.push(`/fit-proper?candidateId=${encodeURIComponent(c.id)}`);
                      }}
                      onQuickMove={handleQuickMove}
                      onEditColumn={handleOpenEditModal}
                      onDeleteColumn={handleOpenDeleteModal}
                    />
                  </div>
                ))}

                {/* Card Add New Status Column matching Image 1 */}
                {selectedStatusFilter === 'all' && (
                  <button
                    type="button"
                    onClick={() => setAddStatusModalOpen(true)}
                    className="min-w-[280px] w-[280px] shrink-0 border-2 border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50/20 rounded-2xl md:rounded-3xl flex flex-col items-center justify-center p-6 text-slate-400 hover:text-blue-600 transition-all group min-h-[580px] bg-slate-50/30"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 group-hover:border-blue-300 text-slate-400 group-hover:text-blue-600 flex items-center justify-center mb-3 transition-all shadow-2xs group-hover:scale-105">
                      <Plus className="w-7 h-7" />
                    </div>
                    <span className="text-sm font-bold text-slate-700 group-hover:text-blue-600">
                      Add New Status
                    </span>
                    <p className="text-[11px] text-slate-400 mt-1 text-center">
                      Click to add a custom column
                    </p>
                  </button>
                )}
              </div>
            )}
          </div>
        </main>

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

      {/* E. Confirm To Delete Modal matching Image 2 */}
      {deleteTargetColumn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border-2 border-[#ea384c] p-7 max-w-xs sm:max-w-sm w-full mx-auto shadow-2xl text-center animate-in zoom-in-95 duration-150 relative">
            {/* Big Red Circle with Question Mark */}
            <div className="w-16 h-16 rounded-full border-[3.5px] border-[#ea384c] text-[#ea384c] flex items-center justify-center mx-auto text-3xl font-extrabold mb-4 select-none">
              ?
            </div>

            {/* Title */}
            <h3 className="text-xl font-bold text-slate-900 mb-6">
              Confirm To Delete?
            </h3>

            {/* Buttons: Yes (Blue), No (Red) matching Image 2 */}
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => handleConfirmSoftDelete(deleteTargetColumn.id)}
                className="bg-[#1a62ff] hover:bg-blue-700 text-white font-bold text-xs px-8 py-2.5 rounded-xl transition-all shadow-sm active:scale-95"
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => setDeleteTargetColumn(null)}
                className="bg-[#ea384c] hover:bg-rose-600 text-white font-bold text-xs px-8 py-2.5 rounded-xl transition-all shadow-sm active:scale-95"
              >
                No
              </button>
            </div>
          </div>
        </div>
      )}

      {/* F. Edit Column Modal */}
      {editingColumn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 max-w-md w-full mx-auto shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900">
                Edit Status Column
              </h3>
              <button
                type="button"
                onClick={() => setEditingColumn(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Status Label
                </label>
                <input
                  type="text"
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  placeholder="e.g. APPLIED, ASSESSMENT"
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingColumn(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!editLabel.trim()}
                  onClick={handleSaveEditColumn}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* G. Add New Status Modal */}
      {addStatusModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 max-w-md w-full mx-auto shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900">
                Add New Status Column
              </h3>
              <button
                type="button"
                onClick={() => {
                  setAddStatusModalOpen(false);
                  setNewStatusLabel('');
                }}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Status Name
                </label>
                <input
                  type="text"
                  value={newStatusLabel}
                  onChange={(e) => setNewStatusLabel(e.target.value)}
                  placeholder="e.g. TECHNICAL TEST, PROBATION"
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Badge Color
                </label>
                <div className="flex items-center gap-2.5">
                  {[
                    { hex: '#3b82f6', bg: 'bg-[#3b82f6]' },
                    { hex: '#f59e0b', bg: 'bg-[#f59e0b]' },
                    { hex: '#8b5cf6', bg: 'bg-[#8b5cf6]' },
                    { hex: '#0d9488', bg: 'bg-[#0d9488]' },
                    { hex: '#ef4444', bg: 'bg-[#ef4444]' },
                    { hex: '#6366f1', bg: 'bg-[#6366f1]' },
                    { hex: '#ec4899', bg: 'bg-[#ec4899]' },
                    { hex: '#14b8a6', bg: 'bg-[#14b8a6]' },
                  ].map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setSelectedColor(c)}
                      className={`w-7 h-7 rounded-full ${c.bg} transition-all ${
                        selectedColor.hex === c.hex
                          ? 'ring-2 ring-offset-2 ring-blue-600 scale-110'
                          : 'opacity-70 hover:opacity-100'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setAddStatusModalOpen(false);
                    setNewStatusLabel('');
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!newStatusLabel.trim()}
                  onClick={handleAddStatus}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
                >
                  Add Status
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
