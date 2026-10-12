'use client';

import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Header from '@/components/Header';
import {
  MoreVertical,
  ChevronDown,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  FileText,
  User,
  Mail,
  Phone,
  Briefcase,
  Calendar,
  Layers,
  ArrowLeft,
  Loader2,
  Sparkles,
  Info,
  Search,
} from 'lucide-react';
import { CandidateWithJob, FitProperRequirement, RequirementStatus } from '../../types/candidate';

type ActiveTab = 'general' | 'calculation' | 'rejected_history';

function FitProperContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const candidateId = searchParams.get('candidateId') || searchParams.get('id') || 'c-rusdi-default';

  // Candidate Data State
  const [candidate, setCandidate] = useState<CandidateWithJob | null>(null);
  const [isLoadingCandidate, setIsLoadingCandidate] = useState(true);

  // Active Tab State: default to 'calculation' as shown in Image 1
  const [activeTab, setActiveTab] = useState<ActiveTab>('calculation');

  // Fit & Proper Requirements State
  const [requirements, setRequirements] = useState<FitProperRequirement[]>([]);
  const [threshold, setThreshold] = useState<number>(80);
  const [isLoadingReqs, setIsLoadingReqs] = useState(true);

  // Search Bar & Dropdown State (Image 1 & Image 2 Frame 12)
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // UI Interactive States
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);

  // Capability Fit Setting Modal State (Image 3 + Requirement Management)
  const [isSettingModalOpen, setIsSettingModalOpen] = useState(false);
  const [tempThreshold, setTempThreshold] = useState<number>(80);
  const [isThresholdSelectOpen, setIsThresholdSelectOpen] = useState(false);
  const [isAddingReqInModal, setIsAddingReqInModal] = useState(false);
  const [newReqNameInModal, setNewReqNameInModal] = useState('');
  const [editingReqIdInModal, setEditingReqIdInModal] = useState<string | null>(null);
  const [editingReqNameInModal, setEditingReqNameInModal] = useState('');
  const [modalActionMenuId, setModalActionMenuId] = useState<string | null>(null);

  // Legacy Modals (compatibility)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newRequirementName, setNewRequirementName] = useState('');
  const [editingRequirement, setEditingRequirement] = useState<FitProperRequirement | null>(null);
  const [editRequirementName, setEditRequirementName] = useState('');

  // Decision States (FR-03.3 & FR-03.4)
  const [isDecisionPending, setIsDecisionPending] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [decisionState, setDecisionState] = useState<string | null>(null);

  // Repeat Applicant Info (FR-D2-005)
  const [repeatInfo, setRepeatInfo] = useState<{
    isRepeat: boolean;
    count: number;
    label: string | null;
    history: any[];
  } | null>(null);

  useEffect(() => {
    if (candidateId) {
      fetch(`/api/squad-d2/repeat-applicants?candidateId=${encodeURIComponent(candidateId)}`)
        .then((r) => r.json())
        .then((json) => {
          if (json.success) {
            setRepeatInfo({
              isRepeat: json.isRepeatApplicant,
              count: json.applicationCount,
              label: json.repeatLabel,
              history: json.history || [],
            });
          }
        })
        .catch((err) => console.warn('Repeat lookup error:', err));
    }
  }, [candidateId]);

  // Feedback toast
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showFeedback = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback(null), 3500);
  };

  // Close menus on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchDropdownOpen(false);
      }
      setOpenDropdownId(null);
      setOpenActionMenuId(null);
      setModalActionMenuId(null);
      setIsThresholdSelectOpen(false);
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  // 1. Fetch Candidate details via /api/squad-d2/candidates
  useEffect(() => {
    let isMounted = true;
    async function fetchCandidate() {
      setIsLoadingCandidate(true);
      try {
        const res = await fetch(`/api/squad-d2/candidates?candidateId=${encodeURIComponent(candidateId)}`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data) && json.data.length > 0) {
            if (isMounted) setCandidate(json.data[0]);
            return;
          }
        }
      } catch (err) {
        console.warn('Could not fetch candidate via API:', err);
      }

      // Fallback matching mockup (Rusdi - Backend Engineer)
      if (isMounted) {
        setCandidate({
          id: candidateId,
          job_id: 'default-job',
          full_name: 'Rusdi',
          email: 'rusdi.andima@example.com',
          phone_number: '+62 812-3456-7890',
          registration_way: 'recommendation-based',
          cv_file_path: 'resumes/rusdi-cv.pdf',
          stage: 'assessment',
          status: 'assessment',
          application_count: 3,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          job_title: 'Backend Engineer',
        });
      }
      if (isMounted) setIsLoadingCandidate(false);
    }

    fetchCandidate();
    return () => {
      isMounted = false;
    };
  }, [candidateId]);

  // 2. Fetch Fit & Proper Requirements via /api/squad-d2/fit-proper
  useEffect(() => {
    let isMounted = true;
    async function fetchRequirements() {
      setIsLoadingReqs(true);
      try {
        const res = await fetch(`/api/squad-d2/fit-proper?candidateId=${encodeURIComponent(candidateId)}`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.requirements)) {
            if (isMounted) {
              setRequirements(json.requirements);
              setThreshold(typeof json.threshold === 'number' ? json.threshold : 80);
              setTempThreshold(typeof json.threshold === 'number' ? json.threshold : 80);
              setIsLoadingReqs(false);
            }
            return;
          }
        }
      } catch (err) {
        console.warn('Failed to load requirements from API:', err);
      }

      // Default requirements matching Image 1 & Image 2
      if (isMounted) {
        const initialList: FitProperRequirement[] = [
          { id: `req-1-${candidateId}`, candidate_id: candidateId, name: 'Leadership', status: 'Fullfilled', is_deleted: false, created_at: new Date().toISOString() },
          { id: `req-2-${candidateId}`, candidate_id: candidateId, name: 'Capability', status: 'Fullfilled', is_deleted: false, created_at: new Date().toISOString() },
          { id: `req-3-${candidateId}`, candidate_id: candidateId, name: 'Experience', status: 'Fullfilled', is_deleted: false, created_at: new Date().toISOString() },
          { id: `req-4-${candidateId}`, candidate_id: candidateId, name: 'Certification', status: 'Fullfilled', is_deleted: false, created_at: new Date().toISOString() },
          { id: `req-5-${candidateId}`, candidate_id: candidateId, name: 'Skill', status: 'Fullfilled', is_deleted: false, created_at: new Date().toISOString() },
          { id: `req-6-${candidateId}`, candidate_id: candidateId, name: 'Communication', status: null, is_deleted: false, created_at: new Date().toISOString() },
          { id: `req-7-${candidateId}`, candidate_id: candidateId, name: 'Teamwork', status: null, is_deleted: false, created_at: new Date().toISOString() },
          { id: `req-8-${candidateId}`, candidate_id: candidateId, name: 'Respect', status: null, is_deleted: false, created_at: new Date().toISOString() },
          { id: `req-9-${candidateId}`, candidate_id: candidateId, name: 'Kindness', status: null, is_deleted: false, created_at: new Date().toISOString() },
        ];
        setRequirements(initialList);
        setThreshold(80);
        setTempThreshold(80);
        setIsLoadingReqs(false);
      }
    }

    fetchRequirements();
    return () => {
      isMounted = false;
    };
  }, [candidateId]);

  // Active Requirements (filtering out soft-deleted items: is_deleted = false)
  const activeRequirements = useMemo(() => {
    return requirements.filter((r) => !r.is_deleted);
  }, [requirements]);

  // Active tags currently met by candidate and displayed on page (status === 'Fullfilled')
  const activeTags = useMemo(() => {
    return activeRequirements.filter((r) => r.status === 'Fullfilled');
  }, [activeRequirements]);

  // Available options for the search dropdown pool (status !== 'Fullfilled')
  const availableOptions = useMemo(() => {
    return activeRequirements.filter((r) => r.status !== 'Fullfilled');
  }, [activeRequirements]);

  // Filtered available options by search query
  const filteredAvailableOptions = useMemo(() => {
    if (!searchQuery.trim()) return availableOptions;
    return availableOptions.filter((r) =>
      r.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
    );
  }, [availableOptions, searchQuery]);

  // Calculation Metrics
  const fulfilledCount = activeTags.length;
  const totalActiveCount = activeRequirements.length;

  const currentPercentage = useMemo(() => {
    if (totalActiveCount === 0) return 0;
    return Math.round((fulfilledCount / totalActiveCount) * 100);
  }, [fulfilledCount, totalActiveCount]);

  const isCapabilityFit = useMemo(() => {
    return totalActiveCount > 0 && currentPercentage >= threshold;
  }, [totalActiveCount, currentPercentage, threshold]);

  // Algoritma Pengurangan (Target Syarat - Pelamar Penuhi = Missing Requirements)
  const missingRequirements = Math.max(0, totalActiveCount - fulfilledCount);

  // Decision Making Handler (FR-03.3 & FR-03.4)
  const handleExecuteDecision = async (decision: 'Lolos Fit & Proper' | 'Tolak', reason?: string) => {
    setIsDecisionPending(true);
    try {
      const res = await fetch('/api/squad-d2/fit-proper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateId,
          action: 'decision',
          decision,
          reason,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setDecisionState(decision);
        showFeedback(`Keputusan "${decision}" berhasil dieksekusi ke database.`);
        setCandidate((prev) => (prev ? { ...prev, status: json.status as any } : prev));
        setIsRejectModalOpen(false);
        setRejectReason('');
      } else {
        showFeedback(json.message || 'Gagal menyimpan keputusan', 'error');
      }
    } catch (err) {
      showFeedback('Kendala jaringan saat menyimpan keputusan', 'error');
    } finally {
      setIsDecisionPending(false);
    }
  };

  // =========================================================================
  // REQUIREMENT ACTIONS (Tags on Page, Dropdown, Modal Management)
  // =========================================================================

  // Remove Tag from Page (User clicks tag -> tag disappears from page & goes to dropdown pool)
  const handleRemoveTag = async (reqId: string) => {
    const target = requirements.find((r) => r.id === reqId);
    setRequirements((prev) =>
      prev.map((r) => (r.id === reqId ? { ...r, status: null } : r))
    );
    showFeedback(`Requirement "${target?.name || ''}" dihilangkan dari halaman.`, 'info');

    try {
      await fetch('/api/squad-d2/fit-proper', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateId,
          requirementId: reqId,
          status: null,
        }),
      });
    } catch (err) {
      console.error('Failed to remove tag on server:', err);
    }
  };

  // Add Tag from Dropdown (User selects from dropdown / search -> tag appears on page)
  const handleAddTagFromDropdown = async (reqId: string) => {
    const target = requirements.find((r) => r.id === reqId);
    setRequirements((prev) =>
      prev.map((r) => (r.id === reqId ? { ...r, status: 'Fullfilled' } : r))
    );
    setSearchQuery('');
    setIsSearchDropdownOpen(false);
    showFeedback(`Requirement "${target?.name || ''}" ditambahkan ke halaman.`);

    try {
      await fetch('/api/squad-d2/fit-proper', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateId,
          requirementId: reqId,
          status: 'Fullfilled',
        }),
      });
    } catch (err) {
      console.error('Failed to add tag on server:', err);
    }
  };

  // Add New Requirement from Modal (Create button in Capability Fit Setting overlay)
  const handleAddNewRequirementInModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReqNameInModal.trim()) return;

    const name = newReqNameInModal.trim();
    const tempId = `req-${candidateId}-${Date.now()}`;

    const newReq: FitProperRequirement = {
      id: tempId,
      candidate_id: candidateId,
      name,
      status: null, // added to pool, available in dropdown
      is_deleted: false,
      created_at: new Date().toISOString(),
    };

    setRequirements((prev) => [...prev, newReq]);
    setNewReqNameInModal('');
    setIsAddingReqInModal(false);
    showFeedback(`Requirement baru "${name}" berhasil ditambahkan ke daftar.`);

    try {
      const res = await fetch('/api/squad-d2/fit-proper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId, name, id: tempId }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setRequirements((prev) =>
            prev.map((r) =>
              r.id === tempId ? { ...json.data, is_deleted: r.is_deleted, name: r.name } : r
            )
          );
        }
      }
    } catch (err) {
      console.error('Failed to create requirement on server:', err);
    }
  };

  // Save Edited Requirement Name from Modal
  const handleSaveEditRequirementInModal = async (reqId: string) => {
    if (!editingReqNameInModal.trim()) return;
    const updatedName = editingReqNameInModal.trim();

    setRequirements((prev) =>
      prev.map((r) => (r.id === reqId ? { ...r, name: updatedName } : r))
    );
    setEditingReqIdInModal(null);
    setEditingReqNameInModal('');
    showFeedback(`Requirement diperbarui menjadi "${updatedName}".`);

    try {
      await fetch('/api/squad-d2/fit-proper', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateId,
          requirementId: reqId,
          name: updatedName,
        }),
      });
    } catch (err) {
      console.error('Failed to edit requirement on server:', err);
    }
  };

  // Add New Requirement (Legacy Modal Handler)
  const handleAddNewRequirement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRequirementName.trim()) return;

    const name = newRequirementName.trim();
    const tempId = `req-${candidateId}-${Date.now()}`;

    const newReq: FitProperRequirement = {
      id: tempId,
      candidate_id: candidateId,
      name,
      status: null,
      is_deleted: false,
      created_at: new Date().toISOString(),
    };

    setRequirements((prev) => [...prev, newReq]);
    setNewRequirementName('');
    setIsAddModalOpen(false);
    showFeedback(`Requirement "${name}" berhasil ditambahkan.`);

    try {
      const res = await fetch('/api/squad-d2/fit-proper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId, name }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setRequirements((prev) =>
            prev.map((r) => (r.id === tempId ? json.data : r))
          );
        }
      }
    } catch (err) {
      console.error('Failed to create requirement on server:', err);
    }
  };

  // Save Edit Requirement (Legacy Modal Handler)
  const handleSaveEditRequirement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRequirement || !editRequirementName.trim()) return;

    const updatedName = editRequirementName.trim();
    const targetId = editingRequirement.id;

    setRequirements((prev) =>
      prev.map((r) => (r.id === targetId ? { ...r, name: updatedName } : r))
    );
    setEditingRequirement(null);
    showFeedback(`Requirement diperbarui menjadi "${updatedName}".`);

    try {
      await fetch('/api/squad-d2/fit-proper', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateId,
          requirementId: targetId,
          name: updatedName,
        }),
      });
    } catch (err) {
      console.error('Failed to edit requirement on server:', err);
    }
  };

  // Soft Delete Requirement from Modal (Never Hard Delete!)
  const handleSoftDeleteRequirement = async (req: FitProperRequirement) => {
    setRequirements((prev) =>
      prev.map((r) => (r.id === req.id ? { ...r, is_deleted: true } : r))
    );
    setModalActionMenuId(null);
    showFeedback(`Requirement "${req.name}" berhasil dihapus.`, 'info');

    try {
      await fetch('/api/squad-d2/fit-proper', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateId,
          requirementId: req.id,
          is_deleted: true,
        }),
      });
    } catch (err) {
      console.error('Failed to soft delete requirement on server:', err);
    }
  };

  // Legacy Status Selector (for backward compatibility)
  const handleSelectStatus = async (reqId: string, status: RequirementStatus) => {
    setRequirements((prev) =>
      prev.map((r) => (r.id === reqId ? { ...r, status } : r))
    );
    setOpenDropdownId(null);

    try {
      await fetch('/api/squad-d2/fit-proper', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateId,
          requirementId: reqId,
          status,
        }),
      });
    } catch (err) {
      console.error('Failed to update status on server:', err);
    }
  };

  // Save Capability Fit Setting (Threshold Percentage)
  const handleSaveSetting = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanThreshold = Math.max(0, Math.min(100, Number(tempThreshold) || 80));
    setThreshold(cleanThreshold);
    setIsSettingModalOpen(false);
    setIsThresholdSelectOpen(false);
    setIsAddingReqInModal(false);
    setEditingReqIdInModal(null);
    setModalActionMenuId(null);

    try {
      await fetch('/api/squad-d2/fit-proper', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateId,
          threshold: cleanThreshold,
        }),
      });
      showFeedback(`Target persentase capability fit disimpan: ${cleanThreshold}%.`);
    } catch (err) {
      console.error('Failed to save threshold on server:', err);
    }
  };

  // Candidate Name & Initials
  const candidateName = candidate?.full_name || 'Rusdi';
  const candidateRole = candidate?.job_title || candidate?.d2_job_posts?.title || 'Backend Engineer';
  const candidateInitials = useMemo(() => {
    const parts = candidateName.trim().split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return candidateName.slice(0, 2).toUpperCase() || 'BS';
  }, [candidateName]);

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col text-slate-800 font-sans antialiased w-full">
      {/* Top Navbar Header */}
      <Header onMenuClick={() => window.dispatchEvent(new Event('open-sidebar'))} />

      {/* Main Container */}
      <main className="flex-1 px-4 sm:px-6 md:px-8 lg:px-12 py-6 w-full max-w-[1400px] mx-auto flex flex-col">
        {/* Navigation & Breadcrumbs */}
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.push('/kanban')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Kanban Board</span>
          </button>
        </div>

        {/* Page Title matching Image 2 */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0d1527] tracking-tight">
            FIT &amp; PROPER
          </h1>
        </div>

        {/* ========================================================================= */}
        {/* BIG CARD CONTAINER (Light Blue/Lavender Background matching Image 2)      */}
        {/* ========================================================================= */}
        <div className="flex-1 bg-[#eef4fe] rounded-3xl p-5 sm:p-7 md:p-9 border border-blue-100/70 shadow-sm flex flex-col">
          {/* 1. Candidate Info Banner Card matching Image 2 */}
          <div className="bg-transparent mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Green circle avatar BS matching Image 2 */}
              <div className="w-14 h-14 rounded-full bg-[#bbf7d0] text-[#15803d] font-bold text-lg flex items-center justify-center shrink-0 shadow-2xs">
                {candidateInitials}
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-snug">
                    {candidateName}
                  </h2>
                  {(repeatInfo?.isRepeat || (candidate?.application_count || 1) >= 2) && (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#d97706] text-white shadow-2xs">
                      {repeatInfo?.label || `Pelamar ke-${candidate?.application_count || 2} Kali`}
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm font-medium text-slate-500">
                  {candidateRole}
                </p>
              </div>
            </div>

            {/* Notification / Toast Banner */}
            {feedback && (
              <div
                className={`self-start sm:self-center px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in zoom-in-95 duration-150 ${
                  feedback.type === 'error'
                    ? 'bg-rose-100 text-rose-800 border border-rose-200'
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{feedback.message}</span>
              </div>
            )}
          </div>

          {/* 2. Navigation Tabs Container: 1 Card Full-Width Corner-to-Corner with Centered Buttons */}
          <div className="w-full rounded-2xl sm:rounded-full mb-8">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full">
              {/* Tab 1: General information */}
              <button
                type="button"
                onClick={() => setActiveTab('general')}
                className={`w-full py-2.5 sm:py-3 px-4 rounded-xl sm:rounded-full text-xs sm:text-sm font-semibold flex items-center justify-center text-center transition-all duration-200 cursor-pointer shadow-xs ${
                  activeTab === 'general'
                    ? 'bg-[#0F2342] text-white font-bold shadow-sm'
                    : 'bg-[#009688] hover:bg-[#0F2342] text-white opacity-90 hover:opacity-100'
                }`}
              >
                General information
              </button>

              {/* Tab 2: Fit & Proper Calculation */}
              <button
                type="button"
                onClick={() => setActiveTab('calculation')}
                className={`w-full py-2.5 sm:py-3 px-4 rounded-xl sm:rounded-full text-xs sm:text-sm font-semibold flex items-center justify-center text-center transition-all duration-200 cursor-pointer shadow-xs ${
                  activeTab === 'calculation'
                    ? 'bg-[#0F2342] text-white font-bold shadow-sm'
                    : 'bg-[#009688] hover:bg-[#0F2342] text-white opacity-90 hover:opacity-100'
                }`}
              >
                Fit &amp; Proper Calculation
              </button>

              {/* Tab 3: Rejected History */}
              <button
                type="button"
                onClick={() => setActiveTab('rejected_history')}
                className={`w-full py-2.5 sm:py-3 px-4 rounded-xl sm:rounded-full text-xs sm:text-sm font-semibold flex items-center justify-center text-center transition-all duration-200 cursor-pointer shadow-xs ${
                  activeTab === 'rejected_history'
                    ? 'bg-[#0F2342] text-white font-bold shadow-sm'
                    : 'bg-[#009688] hover:bg-[#0F2342] text-white opacity-90 hover:opacity-100'
                }`}
              >
                Rejected History
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* TAB CONTENT 1: FIT & PROPER CALCULATION (Image 1 & Image 2)               */}
          {/* ========================================================================= */}
          {activeTab === 'calculation' && (
            <div className="flex-1 bg-white rounded-3xl p-6 sm:p-8 md:p-10 shadow-sm border border-slate-100 flex flex-col">
              {/* Centered CALCULATION Title matching Image 1 */}
              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-wider text-center uppercase mb-8">
                CALCULATION
              </h3>

              {/* Requirement Panel Card matching Image 1 */}
              {/* <div className="bg-[#fbf9f8] sm:bg-[#faf7f5] rounded-2xl p-6 sm:p-7 border border-[#ede7e3] mb-6"> */}
              <div className='mb-6'>
                <div className="mb-5">
                  <h4 className="text-base sm:text-lg font-bold text-[#71544d]">
                    Requirement
                  </h4>
                  <p className="text-xs sm:text-sm font-medium text-[#9b8984]">
                    Add the requirements met by the candidate
                  </p>
                </div>

                {/* Tags on Page: Blue pill buttons with Checkmark matching Image 1 */}
                <div className="flex flex-wrap items-center gap-3 sm:gap-4 min-h-[44px]">
                  {isLoadingReqs ? (
                    <div className="text-xs text-slate-400 flex items-center gap-2 py-2">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                      <span>Memuat requirement...</span>
                    </div>
                  ) : activeTags.length === 0 ? (
                    <p className="text-xs sm:text-sm text-slate-400 italic py-1">
                      Belum ada requirement yang dipilih. Klik kolom pencarian di bawah untuk menambahkan.
                    </p>
                  ) : (
                    activeTags.map((req) => (
                      <button
                        key={req.id}
                        type="button"
                        onClick={() => handleRemoveTag(req.id)}
                        className="inline-flex items-center gap-2 bg-[#2563eb] hover:bg-blue-700 active:scale-95 text-white font-semibold text-xs sm:text-sm px-5 py-2 rounded-xl shadow-xs transition-all cursor-pointer group"
                        title="Klik untuk menghapus requirement ini dari halaman"
                      >
                        <span>{req.name}</span>
                        <Check className="w-4 h-4 text-white stroke-[2.5] group-hover:scale-110 transition-transform" />
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Search Bar & Dropdown matching Image 1 & Image 2 (Frame 12) */}
              <div ref={searchContainerRef} className="relative mb-6">
                <div
                  className="relative flex items-center bg-white rounded-xl border border-blue-200/90 shadow-2xs hover:border-blue-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Search className="w-4 h-4 text-slate-400 absolute left-4 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setIsSearchDropdownOpen(true);
                    }}
                    onFocus={() => setIsSearchDropdownOpen(true)}
                    placeholder="Search by Requirement Set"
                    className="w-full h-11 pl-11 pr-10 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 bg-transparent focus:outline-none"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Dropdown: All Requirement Set Options matching Image 2 */}
                {isSearchDropdownOpen && (
                  <div
                    className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-40 animate-in fade-in zoom-in-95 duration-100 max-h-72 overflow-y-auto"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Header line matching Image 2: All Requirement Set Options */}
                    <div className="px-5 py-3 text-xs sm:text-sm font-bold text-slate-800 border-b border-slate-100 bg-slate-50/70">
                      All Requirement Set Options
                    </div>

                    {filteredAvailableOptions.length === 0 ? (
                      <div className="px-5 py-6 text-center text-xs text-slate-400">
                        {searchQuery
                          ? `Tidak ditemukan requirement dengan kata "${searchQuery}".`
                          : 'Semua requirement sudah ditambahkan ke halaman.'}
                      </div>
                    ) : (
                      <div className="py-1">
                        {filteredAvailableOptions.map((req) => (
                          <button
                            key={req.id}
                            type="button"
                            onClick={() => handleAddTagFromDropdown(req.id)}
                            className="w-full px-5 py-3 text-left text-xs sm:text-sm font-semibold text-slate-800 hover:bg-[#dde4ee] flex items-center justify-between transition-colors cursor-pointer group"
                          >
                            <span>{req.name}</span>
                            <span className="text-[11px] font-medium text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                              + Tambah ke Halaman
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Capability Fit Bar matching Image 1 */}
              <div className="mt-auto bg-[#dce6fb] rounded-2xl p-4 sm:p-5 flex items-center justify-between border border-blue-200/80 shadow-2xs">
                <div className="flex items-center gap-2">
                  <span className="text-sm sm:text-base font-bold text-slate-900">
                    Capability Fit
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Status Pill Badge: UNFULLFILLED (Red) / FULLFILLED (Teal) */}
                  <div
                    className={`px-6 sm:px-8 py-1.5 rounded-full text-xs sm:text-sm font-extrabold tracking-wider uppercase text-white shadow-xs transition-colors ${
                      isCapabilityFit ? 'bg-[#0d9488]' : 'bg-[#e11d48]'
                    }`}
                  >
                    {isCapabilityFit ? 'FULLFILLED' : 'UNFULLFILLED'}
                  </div>

                  {/* 3-dots button opening Capability Fit Setting Modal */}
                  <button
                    type="button"
                    onClick={() => {
                      setTempThreshold(threshold);
                      setIsSettingModalOpen(true);
                    }}
                    className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white/50 transition-colors cursor-pointer"
                    title="Capability Fit Setting"
                    aria-label="Capability Fit Setting"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}


          {/* ========================================================================= */}
          {/* TAB CONTENT 2: REJECTED HISTORY (Image 5)                                 */}
          {/* ========================================================================= */}
          {activeTab === 'rejected_history' && (
            <div className="flex-1 flex flex-col">
              {/* Centered Title */}
              <div className="mb-6 text-center">
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-wider uppercase">
                  REJECTED HISTORY
                </h3>
              </div>

              {/* Table Container Card matching Image 5 */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                {/* Header Row */}
                <div className="bg-[#f1f5f9] px-6 py-3 flex items-center justify-between text-xs sm:text-sm font-bold text-slate-900">
                  <span>Position</span>
                  <span className="mr-8">Evidence</span>
                </div>

                {/* Rows matching Image 5 & FR-D2-005 */}
                {repeatInfo && !repeatInfo.isRepeat && (!repeatInfo.history || repeatInfo.history.length === 0) ? (
                  /* FR-D2-005 3.a.ii: Pesan standar jika tidak ada riwayat lamaran */
                  <div className="p-8 text-center text-xs text-slate-500">
                    <p className="font-semibold text-slate-700">Tidak ada riwayat lamaran sebelumnya.</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Kandidat terdaftar sebagai pelamar pertama kali (First-Time Applicant).
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {(repeatInfo?.history && repeatInfo.history.length > 0
                      ? repeatInfo.history
                      : [
                          {
                            job_title: 'Backend Engineer – June 2026',
                            status: 'REJECTED',
                            assessment_score: 72.5,
                            rejection_reason: 'Nilai technical coding test dan system design belum mencapai batas kelulusan.',
                          },
                          {
                            job_title: 'Backend Engineer – June 2025',
                            status: 'REJECTED',
                            assessment_score: 68.0,
                            rejection_reason: 'Kompetensi microservices dan pengalaman optimasi database belum mencukupi.',
                          },
                          {
                            job_title: 'Backend Engineer – June 2024',
                            status: 'REJECTED',
                            assessment_score: 60.0,
                            rejection_reason: 'Kualifikasi pengalaman kerja minimal belum terpenuhi saat pembukaan lowongan.',
                          },
                        ]
                    ).map((row: any, idx: number) => (
                      <div
                        key={`reject-${idx}`}
                        className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors"
                      >
                        <div className="min-w-0">
                          <span className="text-xs sm:text-sm font-semibold text-slate-700 block">
                            {row.job_title || row.position}
                          </span>
                          {/* FR-05.4 & FR-05.5: Assessment score & Rejection note */}
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            {row.assessment_score !== undefined && row.assessment_score !== null && (
                              <span className="inline-block text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                                Skor Asesmen: {row.assessment_score} / 100
                              </span>
                            )}
                            {row.rejection_reason && (
                              <span className="text-[11px] text-rose-800 italic">
                                &bull; {row.rejection_reason}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="bg-[#e11d48] text-white font-bold text-[11px] sm:text-xs px-5 py-1 rounded-full uppercase tracking-wider shadow-xs shrink-0 self-start sm:self-center">
                          {row.status || 'REJECTED'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Additional candidate specific rejection log if candidate was rejected */}
              {candidate?.status === 'rejected' && candidate.rejection_reason && (
                <div className="mt-4 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs">
                  <span className="font-bold">Alasan Penolakan Terakhir: </span>
                  <span>{candidate.rejection_reason}</span>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB CONTENT 3: GENERAL INFORMATION                                        */}
          {/* ========================================================================= */}
          {activeTab === 'general' && (
            <div className="flex-1 flex flex-col">
              <div className="mb-6 text-center">
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-wider uppercase">
                  GENERAL INFORMATION
                </h3>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Full Name */}
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 shrink-0">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-semibold uppercase">Nama Lengkap</p>
                      <p className="text-sm font-bold text-slate-900 mt-0.5">{candidate?.full_name}</p>
                    </div>
                  </div>

                  {/* Email */}
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 shrink-0">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-semibold uppercase">Alamat Email</p>
                      <p className="text-sm font-bold text-slate-900 mt-0.5">{candidate?.email}</p>
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 shrink-0">
                      <Phone className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-semibold uppercase">Nomor Telepon</p>
                      <p className="text-sm font-bold text-slate-900 mt-0.5">{candidate?.phone_number || '-'}</p>
                    </div>
                  </div>

                  {/* Position */}
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 shrink-0">
                      <Briefcase className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-semibold uppercase">Posisi Dilamar</p>
                      <p className="text-sm font-bold text-slate-900 mt-0.5">{candidateRole}</p>
                    </div>
                  </div>

                  {/* Registration Way */}
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 shrink-0">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-semibold uppercase">Jalur Pendaftaran</p>
                      <p className="text-sm font-bold text-slate-900 mt-0.5 capitalize">
                        {candidate?.registration_way.replace(/-/g, ' ')}
                      </p>
                    </div>
                  </div>

                  {/* Stage / Status */}
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 shrink-0">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-semibold uppercase">Tahapan Rekrutmen</p>
                      <span className="inline-block mt-1 px-3 py-0.5 rounded-full text-xs font-bold uppercase bg-blue-100 text-blue-800">
                        {candidate?.status || 'Screening'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* CV File Download */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span>Curriculum Vitae (PDF Document)</span>
                  </div>
                  <a
                    href={`/api/squad-d2/candidates`}
                    download
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-xl transition-colors"
                  >
                    Unduh Dokumen CV
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ========================================================================= */}
      {/* MODAL 1: CAPABILITY FIT SETTING (Image 3 + Requirement Management)         */}
      {/* ========================================================================= */}
      {isSettingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl overflow-hidden max-w-2xl w-full shadow-2xl animate-in zoom-in-95 duration-150 border border-slate-100 flex flex-col max-h-[90vh]">
            {/* Blue curved top header banner matching Image 3 */}
            <div className="h-16 bg-gradient-to-r from-[#155DFC]  to-[#142B45]  shadow-sm shrink-0 flex items-center justify-end px-6">
              <button
                type="button"
                onClick={() => {
                  setIsSettingModalOpen(false);
                  setIsAddingReqInModal(false);
                  setEditingReqIdInModal(null);
                  setIsThresholdSelectOpen(false);
                }}
                className="p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/20 transition-colors cursor-pointer"
                title="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 sm:p-8 pt-4 overflow-y-auto flex-1 space-y-6">
              {/* Centered Modal Title matching Image 3 */}
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 text-center uppercase tracking-wide">
                CAPABILITY FIT SETTING
              </h3>

              {/* Table condition vs evidence matching Image 3 */}
              <div className="rounded-2xl border border-slate-200 overflow-visible shadow-2xs relative z-30">
                {/* Table Header */}
                <div className="bg-[#f1f5f9] px-5 py-3 grid grid-cols-12 text-xs sm:text-sm font-bold text-slate-800 rounded-t-2xl">
                  <div className="col-span-8">Condition</div>
                  <div className="col-span-4 text-right sm:text-left sm:pl-3">Evidence</div>
                </div>

                {/* Table Row */}
                <div className="p-4 sm:p-5 bg-white grid grid-cols-12 items-center gap-3 rounded-b-2xl relative">
                  <div className="col-span-8 pr-2">
                    <p className="text-xs sm:text-sm text-slate-700 leading-relaxed italic">
                      &ldquo;Percentage number of requirements that must be met to achieve FULLFILLED status&rdquo;
                    </p>
                  </div>

                  {/* Dropdown "Select Number ⌵" matching Image 3 - Highest z-index */}
                  <div className="col-span-4 flex items-center justify-end sm:justify-start sm:pl-3 relative z-[9999]">
                    <div className="relative w-full max-w-[150px] z-[9999]" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => setIsThresholdSelectOpen(!isThresholdSelectOpen)}
                        className="w-full h-10 px-3.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-semibold text-slate-700 flex items-center justify-between gap-1.5 hover:border-slate-400 bg-white shadow-2xs cursor-pointer relative z-[9999]"
                      >
                        <span>{tempThreshold ? `${tempThreshold}%` : 'Select Number'}</span>
                        <ChevronDown
                          className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${
                            isThresholdSelectOpen ? 'rotate-180' : ''
                          }`}
                        />
                      </button>

                      {/* Threshold select dropdown options - Displayed at the very front */}
                      {isThresholdSelectOpen && (
                        <div className="absolute right-0 top-full mt-1.5 w-full bg-white rounded-xl shadow-2xl border border-slate-200 py-1.5 z-[99999] animate-in fade-in zoom-in-95 duration-100 max-h-48 overflow-y-auto">
                          {[50, 60, 70, 75, 80, 85, 90, 100].map((num) => (
                            <button
                              key={num}
                              type="button"
                              onClick={() => {
                                setTempThreshold(num);
                                setIsThresholdSelectOpen(false);
                              }}
                              className={`w-full px-3.5 py-2 text-left text-xs font-semibold flex items-center justify-between hover:bg-blue-50 transition-colors cursor-pointer ${
                                tempThreshold === num ? 'text-blue-600 bg-blue-50/70' : 'text-slate-700'
                              }`}
                            >
                              <span>{num}%</span>
                              {tempThreshold === num && <Check className="w-3.5 h-3.5 text-blue-600" />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* ================================================================= */}
              {/* REQUIREMENT LISTS SECTION (USER EXPLICIT REQUIREMENT)             */}
              {/* ================================================================= */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm sm:text-base font-bold text-slate-900">
                      Requirement List
                    </h4>
                    <p className="text-xs text-slate-500">
                      Kelola daftar seluruh requirements (kriteria) untuk kandidat
                    </p>
                  </div>

                  {/* Add Requirement (Create) Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingReqInModal(true);
                      setNewReqNameInModal('');
                    }}
                    className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Requirement</span>
                  </button>
                </div>

                {/* Inline Add Requirement Form */}
                {isAddingReqInModal && (
                  <form
                    onSubmit={handleAddNewRequirementInModal}
                    className="p-3.5 bg-blue-50/70 rounded-2xl border border-blue-200/80 animate-in fade-in duration-100 flex flex-col sm:flex-row items-center gap-2.5"
                  >
                    <input
                      type="text"
                      value={newReqNameInModal}
                      onChange={(e) => setNewReqNameInModal(e.target.value)}
                      placeholder="Masukkan nama requirement baru..."
                      className="flex-1 w-full h-10 px-3.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-medium bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      autoFocus
                      required
                    />
                    <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                      <button
                        type="button"
                        onClick={() => setIsAddingReqInModal(false)}
                        className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/60 cursor-pointer"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        disabled={!newReqNameInModal.trim()}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 shadow-xs cursor-pointer"
                      >
                        Simpan
                      </button>
                    </div>
                  </form>
                )}

                {/* Requirement Items List */}
                <div className="rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden bg-white shadow-2xs">
                  {activeRequirements.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400">
                      Belum ada requirement. Klik tombol &ldquo;Add Requirement&rdquo; di atas untuk menambahkan.
                    </div>
                  ) : (
                    activeRequirements.map((req) => {
                      const isEditing = editingReqIdInModal === req.id;
                      const isActionOpen = modalActionMenuId === req.id;

                      return (
                        <div
                          key={req.id}
                          className="px-4 sm:px-5 py-3 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
                        >
                          {/* If editing inline */}
                          {isEditing ? (
                            <div className="flex-1 flex items-center gap-2">
                              <input
                                type="text"
                                value={editingReqNameInModal}
                                onChange={(e) => setEditingReqNameInModal(e.target.value)}
                                className="flex-1 h-9 px-3 rounded-lg border border-blue-400 text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveEditRequirementInModal(req.id)}
                                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
                              >
                                Simpan
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingReqIdInModal(null);
                                  setEditingReqNameInModal('');
                                }}
                                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-100 cursor-pointer"
                              >
                                Batal
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className="text-xs sm:text-sm font-semibold text-slate-800 truncate">
                                  {req.name}
                                </span>
                                {req.status === 'Fullfilled' ? (
                                  <span className="text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/80 px-2 py-0.5 rounded-full shrink-0">
                                    Aktif di Halaman
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-medium bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full shrink-0">
                                    Di Dropdown Pool
                                  </span>
                                )}
                              </div>

                              {/* Separate Edit & Delete Icon Buttons */}
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingReqIdInModal(req.id);
                                    setEditingReqNameInModal(req.name);
                                  }}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                                  title="Edit Requirement"
                                  aria-label="Edit Requirement"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleSoftDeleteRequirement(req)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                  title="Hapus Requirement (Soft Delete)"
                                  aria-label="Hapus Requirement"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Simulation Status Info */}
              <div className="bg-blue-50/80 border border-blue-100 rounded-xl p-3.5 text-xs text-blue-900 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Simulasi Perhitungan Kandidat:</p>
                  <p className="mt-0.5 text-slate-600">
                    Kandidat saat ini memenuhi {fulfilledCount} dari {totalActiveCount} requirement (
                    {currentPercentage}%). Status target ({tempThreshold}%):&nbsp;
                    <strong
                      className={`font-bold ${
                        currentPercentage >= (Number(tempThreshold) || 0)
                          ? 'text-emerald-700'
                          : 'text-rose-600'
                      }`}
                    >
                      {currentPercentage >= (Number(tempThreshold) || 0)
                        ? 'FULLFILLED'
                        : 'UNFULLFILLED'}
                    </strong>
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsSettingModalOpen(false);
                  setIsAddingReqInModal(false);
                  setEditingReqIdInModal(null);
                  setIsThresholdSelectOpen(false);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleSaveSetting()}
                className="px-6 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-sm active:scale-95 cursor-pointer"
              >
                Simpan Pengaturan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ADD NEW REQUIREMENT                                              */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-150 border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900">
                Tambah Requirement Baru
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddNewRequirement} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nama Requirement
                </label>
                <input
                  type="text"
                  value={newRequirementName}
                  onChange={(e) => setNewRequirementName(e.target.value)}
                  placeholder="Contoh: Problem Solving, Komunikasi, Sertifikasi AWS"
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  autoFocus
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={!newRequirementName.trim()}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
                >
                  Tambah Requirement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: EDIT REQUIREMENT                                                 */}
      {/* ========================================================================= */}
      {editingRequirement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-150 border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900">
                Edit Requirement
              </h3>
              <button
                type="button"
                onClick={() => setEditingRequirement(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditRequirement} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nama Requirement
                </label>
                <input
                  type="text"
                  value={editRequirementName}
                  onChange={(e) => setEditRequirementName(e.target.value)}
                  placeholder="Nama Requirement..."
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  autoFocus
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingRequirement(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={!editRequirementName.trim()}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: REJECTION CONFIRMATION & REASON (FR-03.3 & FR-03.4)               */}
      {/* ========================================================================= */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-150 border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900">
                Konfirmasi Penolakan Kandidat
              </h3>
              <button
                type="button"
                onClick={() => setIsRejectModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Apakah Anda yakin ingin menolak kandidat <strong>{candidateName}</strong>? Status pelamar akan diubah ke <em>Rejected</em> dan dicatat pada audit log.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Alasan Penolakan (Catatan Fit &amp; Proper)
                </label>
                <textarea
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder={`Contoh: Kualifikasi teknis belum memenuhi target minimal ${threshold}% (${missingRequirements} syarat belum terpenuhi).`}
                  className="w-full p-3 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRejectModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isDecisionPending}
                  onClick={() => handleExecuteDecision('Tolak', rejectReason)}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#e11d48] hover:bg-rose-700 transition-colors shadow-sm disabled:opacity-50"
                >
                  {isDecisionPending ? 'Menyimpan...' : 'Konfirmasi Tolak'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FitProperPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      }
    >
      <FitProperContent />
    </Suspense>
  );
}
