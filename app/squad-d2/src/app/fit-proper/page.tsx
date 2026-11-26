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
  ShieldCheck,
  Lock,
  AlertCircle,
  CheckCircle2,
  Video,
  Globe,
  ExternalLink,
  FolderGit2,
} from 'lucide-react';
import { CandidateWithJob, FitProperRequirement, RequirementStatus } from '../../types/candidate';
import { createClient } from '@/utils/supabase/client';
import { getAuthenticatedUserProfile, UserProfile, isHRManager, isHRRecruiter } from '@/utils/auth';
import { useLanguage } from '@/lib/i18n/LanguageContext';

function formatOrdinal(n: number): string {
  const pr = new Intl.PluralRules('en-US', { type: 'ordinal' });
  const suffixes: Record<string, string> = {
    one: 'st',
    two: 'nd',
    few: 'rd',
    other: 'th',
  };
  return `${n}${suffixes[pr.select(n)] || 'th'}`;
}

type ActiveTab = 'general' | 'calculation' | 'rejected_history';

function FitProperContent() {
  const { language, t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const candidateId = searchParams.get('candidateId') || searchParams.get('id') || 'c-rusdi-default';

  // Current Logged-in User Profile & Role Permissions
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  // Candidate Data State
  const [candidate, setCandidate] = useState<CandidateWithJob | null>(null);
  const [isLoadingCandidate, setIsLoadingCandidate] = useState(true);

  // Candidate Name, Role & Initials
  const candidateName = candidate?.full_name || 'Rusdi';
  const candidateRole = candidate?.job_title || 'Backend Engineer';
  const candidateInitials = useMemo(() => {
    const parts = candidateName.trim().split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return candidateName.slice(0, 2).toUpperCase() || 'BS';
  }, [candidateName]);

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

  // Percentage Input Modal Target
  const [percentageModalTarget, setPercentageModalTarget] = useState<{
    requirement: FitProperRequirement;
    isEditing: boolean;
  } | null>(null);
  const [inputPercentage, setInputPercentage] = useState<number>(50);

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
  const [isPassModalOpen, setIsPassModalOpen] = useState(false);
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

  // Authentication & Role Authorization Guard (FR-D2 Security)
  useEffect(() => {
    let isMounted = true;
    async function verifyAuthAndRole() {
      try {
        const supabase = createClient();
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (error || !user) {
          router.replace(`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`);
          return;
        }

        const email = user.email || '';
        const userRole = (user.user_metadata?.role || '').toLowerCase();
        const isCompanyStaff =
          email.toLowerCase().endsWith('@andima.co.id') ||
          email.toLowerCase().endsWith('@andimatransport.com') ||
          Boolean(user.user_metadata?.position_id) ||
          Boolean(user.user_metadata?.full_name);

        const hasAllowedRole =
          isCompanyStaff ||
          userRole.includes('hr') ||
          userRole.includes('manager') ||
          userRole.includes('recruiter') ||
          userRole.includes('admin') ||
          userRole.includes('employee') ||
          userRole.includes('staff');

        if (!hasAllowedRole && isMounted) {
          router.replace('/login?error=unauthorized_role');
          return;
        }

        const profile = await getAuthenticatedUserProfile();
        if (profile && isMounted) {
          setCurrentUser(profile);
        }
      } catch {
        if (isMounted) {
          router.replace('/login?redirect=/fit-proper');
        }
      }
    }

    verifyAuthAndRole();
    return () => {
      isMounted = false;
    };
  }, [router]);

  // Derived role permission
  const isManager = useMemo(() => {
    return isHRManager(currentUser?.role, currentUser?.email);
  }, [currentUser]);

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
          social_media: '@rusdi.dev',
          portfolio_url: 'https://github.com/rusdi-dev',
          skills: 'Spesialis Backend dengan keahlian Node.js, optimasi query PostgreSQL, arsitektur microservices, dan perancangan REST API berskala besar.',
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
              const defaultPercs: Record<string, number> = {
                Leadership: 80,
                Capability: 50,
                Experience: 50,
                Certification: 50,
                Skill: 50,
                Communication: 10,
              };
              const enrichedReqs = json.requirements.map((r: FitProperRequirement) => ({
                ...r,
                percentage: typeof r.percentage === 'number' ? r.percentage : (defaultPercs[r.name] ?? 50),
              }));
              setRequirements(enrichedReqs);
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

      // Default requirements matching Image 1 & Image 2 (exact 6 with percentages)
      if (isMounted) {
        const initialList: FitProperRequirement[] = [
          { id: `req-1-${candidateId}`, candidate_id: candidateId, name: 'Leadership', status: 'Fullfilled', percentage: 80, is_deleted: false, created_at: new Date().toISOString() },
          { id: `req-2-${candidateId}`, candidate_id: candidateId, name: 'Capability', status: 'Fullfilled', percentage: 50, is_deleted: false, created_at: new Date().toISOString() },
          { id: `req-3-${candidateId}`, candidate_id: candidateId, name: 'Experience', status: 'Fullfilled', percentage: 50, is_deleted: false, created_at: new Date().toISOString() },
          { id: `req-4-${candidateId}`, candidate_id: candidateId, name: 'Certification', status: 'Fullfilled', percentage: 50, is_deleted: false, created_at: new Date().toISOString() },
          { id: `req-5-${candidateId}`, candidate_id: candidateId, name: 'Skill', status: 'Fullfilled', percentage: 50, is_deleted: false, created_at: new Date().toISOString() },
          { id: `req-6-${candidateId}`, candidate_id: candidateId, name: 'Communication', status: 'Fullfilled', percentage: 10, is_deleted: false, created_at: new Date().toISOString() },
          { id: `req-7-${candidateId}`, candidate_id: candidateId, name: 'Teamwork', status: null, percentage: 50, is_deleted: false, created_at: new Date().toISOString() },
          { id: `req-8-${candidateId}`, candidate_id: candidateId, name: 'Respect', status: null, percentage: 50, is_deleted: false, created_at: new Date().toISOString() },
          { id: `req-9-${candidateId}`, candidate_id: candidateId, name: 'Kindness', status: null, percentage: 50, is_deleted: false, created_at: new Date().toISOString() },
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

  // Calculation Metrics (Requirement percentages)
  const fulfilledCount = activeTags.length;
  const totalActiveCount = activeRequirements.length;

  const currentPercentage = useMemo(() => {
    if (activeTags.length === 0) return 0;
    const sum = activeTags.reduce(
      (acc, r) => acc + (typeof r.percentage === 'number' ? r.percentage : 50),
      0
    );
    return Math.round(sum / activeTags.length);
  }, [activeTags]);

  const isCapabilityFit = useMemo(() => {
    return activeTags.length > 0 && currentPercentage >= threshold;
  }, [activeTags, currentPercentage, threshold]);

  // Algoritma Pengurangan (Target Syarat - Pelamar Penuhi = Missing Requirements)
  const missingRequirements = Math.max(0, totalActiveCount - fulfilledCount);

  // Mark candidate as calculated in Fit & Proper in localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && candidateId && candidateId !== 'default-candidate' && requirements.length > 0) {
      try {
        const stored = JSON.parse(localStorage.getItem('andima_fit_proper_calculated') || '[]');
        if (!stored.includes(candidateId)) {
          stored.push(candidateId);
          localStorage.setItem('andima_fit_proper_calculated', JSON.stringify(stored));
        }
      } catch {}
    }
  }, [candidateId, requirements]);

  // Derived formatting for General Information matching Image 1 & 2
  const formattedAppDate = useMemo(() => {
    const rawDate = candidate?.applied_at || candidate?.created_at;
    const defaultDate = language === 'id' ? '19 Oktober 2026' : 'October 19, 2026';
    if (!rawDate) return defaultDate;
    try {
      const d = new Date(rawDate);
      if (isNaN(d.getTime())) return defaultDate;
      return d.toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return defaultDate;
    }
  }, [candidate?.applied_at, candidate?.created_at, language]);

  const isInterviewStage = useMemo(() => {
    const st = (candidate?.status || candidate?.stage || '').toLowerCase();
    return st.includes('interview');
  }, [candidate?.status, candidate?.stage]);

  const hasCertificate = useMemo(() => {
    const path = candidate?.certificate_file_path;
    return Boolean(
      path &&
      typeof path === 'string' &&
      path.trim() !== '' &&
      path.toLowerCase() !== 'null' &&
      path.toLowerCase() !== 'undefined'
    );
  }, [candidate?.certificate_file_path]);

  const interviewWay = useMemo(() => {
    if (typeof window !== 'undefined') {
      try {
        const schedules = JSON.parse(localStorage.getItem('andima_interview_schedules') || '{}');
        if (schedules[candidateId]?.scheduleType) {
          return schedules[candidateId].scheduleType === 'online' ? 'Online' : 'Onsite';
        }
      } catch {}
    }
    const rReason = candidate?.rejection_reason || '';
    if (rReason.toLowerCase().includes('onsite') || rReason.toLowerCase().includes('pool')) {
      return 'Onsite';
    }
    if (rReason.toLowerCase().includes('online') || rReason.toLowerCase().includes('meet.google.com') || rReason.toLowerCase().includes('zoom')) {
      return 'Online';
    }
    return 'Onsite';
  }, [candidateId, candidate?.rejection_reason]);

  const displayJobApplied = useMemo(() => {
    return candidate?.job_title || candidateRole || 'Backend Engineer';
  }, [candidate?.job_title, candidateRole]);

  const displayRegistrationWay = useMemo(() => {
    const raw = candidate?.registration_way || 'Scouting/Interview Based';
    if (raw.toLowerCase().includes('scout') && raw.toLowerCase().includes('interview')) {
      return 'Scouting/Interview Based';
    }
    if (raw.toLowerCase() === 'scouting-based' || raw.toLowerCase() === 'scouting') {
      return 'Scouting/Interview Based';
    }
    if (raw.toLowerCase().includes('rec')) return 'Recommendation';
    return raw;
  }, [candidate?.registration_way]);

  const displayStage = useMemo(() => {
    const st = candidate?.status || candidate?.stage || 'Screening';
    if (st.toLowerCase() === 'applied' || st.toLowerCase() === 'candidate') return 'APPLIED';
    if (st.toLowerCase() === 'assessment' || st.toLowerCase() === 'screening') return 'SCREENING';
    if (st.toLowerCase() === 'interview' || st.toLowerCase() === 'interviewed') return 'INTERVIEW';
    if (st.toLowerCase() === 'offered' || st.toLowerCase() === 'offering') return 'OFFERED';
    if (st.toLowerCase() === 'hired') return 'HIRED';
    if (st.toLowerCase() === 'rejected') return 'REJECTED';
    return st.toUpperCase();
  }, [candidate?.status, candidate?.stage]);

  const candidateSocialMedia = useMemo(() => {
    if (candidate?.social_media) return candidate.social_media;
    const rReason = candidate?.rejection_reason || '';
    if (rReason.includes('SocialMedia: ')) {
      return rReason.split('SocialMedia: ')[1]?.split(' | ')[0]?.trim() || '@rusdi.dev';
    }
    return '@rusdi.dev';
  }, [candidate?.social_media, candidate?.rejection_reason]);

  const parsedSocialMedias = useMemo(() => {
    if (!candidateSocialMedia || !candidateSocialMedia.trim()) return [];
    const trimmed = candidateSocialMedia.trim();

    try {
      const json = JSON.parse(trimmed);
      if (Array.isArray(json)) {
        return json
          .filter((item) => item && (item.handle || item.url || item.username))
          .map((item) => ({
            platform: item.platform || 'Social Media',
            handle: item.handle || item.url || item.username || '',
          }));
      }
    } catch {}

    const delimiter = trimmed.includes('|') ? '|' : trimmed.includes(';') ? ';' : ',';
    const parts = trimmed.split(delimiter).map((p: string) => p.trim()).filter(Boolean);

    const results: { platform: string; handle: string }[] = [];
    for (const part of parts) {
      if (part.includes(':')) {
        const idx = part.indexOf(':');
        const platform = part.slice(0, idx).trim();
        const handle = part.slice(idx + 1).trim();
        if (handle) {
          results.push({ platform, handle });
        }
      } else {
        results.push({ platform: 'Social Media', handle: part });
      }
    }
    return results.length > 0 ? results : [{ platform: 'Social Media', handle: trimmed }];
  }, [candidateSocialMedia]);

  const candidatePortfolio = useMemo(() => {
    if (candidate?.portfolio_url) return candidate.portfolio_url;
    const rReason = candidate?.rejection_reason || '';
    if (rReason.includes('Portfolio: ')) {
      return rReason.split('Portfolio: ')[1]?.split(' | ')[0]?.trim() || 'https://github.com/rusdi-dev';
    }
    return 'https://github.com/rusdi-dev';
  }, [candidate?.portfolio_url, candidate?.rejection_reason]);

  const portfolioHref = useMemo(() => {
    const raw = candidatePortfolio || 'https://github.com/rusdi-dev';
    if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
    return `https://${raw}`;
  }, [candidatePortfolio]);

  const candidateSkillDescription = useMemo(() => {
    if (candidate?.skills) return candidate.skills;
    const rReason = candidate?.rejection_reason || '';
    if (rReason.includes('Skill: ')) {
      return (
        rReason.split('Skill: ')[1]?.split(' | ')[0]?.trim() ||
        'Spesialis Backend dengan keahlian Node.js, optimasi query PostgreSQL, arsitektur microservices, dan perancangan REST API berskala besar.'
      );
    }
    return 'Spesialis Backend dengan keahlian Node.js, optimasi query PostgreSQL, arsitektur microservices, dan perancangan REST API berskala besar.';
  }, [candidate?.skills, candidate?.rejection_reason]);

  // Combined Rejected History (All previous applications + current rejection if rejected)
  const allRejectedHistory = useMemo(() => {
    let list: any[] = [];
    if (repeatInfo?.history && repeatInfo.history.length > 0) {
      list = [...repeatInfo.history];
    }

    if (candidate?.status === 'rejected' || candidate?.stage === 'rejected') {
      const currentReason = candidate.rejection_reason || 'Kandidat belum memenuhi kualifikasi standar posisi.';
      const alreadyIncluded = list.some(
        (item) => item.candidate_id === candidate.id || (item.rejection_reason && item.rejection_reason === currentReason)
      );
      if (!alreadyIncluded) {
        list.unshift({
          id: `hist-curr-${candidate.id}`,
          candidate_id: candidate.id,
          email: candidate.email,
          full_name: candidate.full_name,
          job_title: candidateRole,
          status: 'REJECTED',
          rejection_reason: currentReason,
          application_date: candidate.updated_at || candidate.created_at || new Date().toISOString(),
          is_read_only: true,
        });
      }
    }

    if (list.length === 0) {
      const lower = (candidateName || '').toLowerCase();
      if (lower.includes('rusdi')) {
        list = [
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
        ];
      }
    }

    return list;
  }, [repeatInfo?.history, candidate?.status, candidate?.stage, candidate?.rejection_reason, candidate?.id, candidate?.email, candidate?.full_name, candidateRole, candidateName]);

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
        setCandidate((prev) => (prev ? { 
          ...prev, 
          status: json.status as any,
          rejection_reason: decision === 'Tolak' ? (reason || 'Tidak memenuhi kualifikasi standar posisi (Gagal Fit & Proper)') : prev.rejection_reason,
        } : prev));
        setIsRejectModalOpen(false);
        setRejectReason('');

        if (decision === 'Tolak') {
          const newRejectionItem = {
            id: `hist-new-${Date.now()}`,
            candidate_id: candidateId,
            email: candidate?.email || '',
            full_name: candidate?.full_name || candidateName,
            job_title: candidateRole,
            status: 'REJECTED',
            rejection_reason: reason || 'Tidak memenuhi kualifikasi standar posisi (Gagal Fit & Proper)',
            application_date: new Date().toISOString(),
            is_read_only: true,
          };
          setRepeatInfo((prev) => ({
            isRepeat: true,
            count: (prev?.count || 1) + 1,
            label: `Pelamar ke-${(prev?.count || 1) + 1} Kali`,
            history: [newRejectionItem, ...(prev?.history || [])],
          }));

          fetch(`/api/squad-d2/repeat-applicants?candidateId=${encodeURIComponent(candidateId)}`)
            .then((r) => r.json())
            .then((rJson) => {
              if (rJson.success && Array.isArray(rJson.history)) {
                setRepeatInfo({
                  isRepeat: rJson.isRepeatApplicant,
                  count: rJson.applicationCount,
                  label: rJson.repeatLabel,
                  history: rJson.history,
                });
              }
            })
            .catch(() => {});
        }
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

  // Open modal when adding tag from dropdown search
  const handleSelectReqFromDropdown = (req: FitProperRequirement) => {
    setPercentageModalTarget({ requirement: req, isEditing: false });
    setInputPercentage(typeof req.percentage === 'number' ? req.percentage : 50);
    setIsSearchDropdownOpen(false);
  };

  // Open modal when clicking tag on page to edit percentage
  const handleOpenEditPercentage = (req: FitProperRequirement) => {
    setPercentageModalTarget({ requirement: req, isEditing: true });
    setInputPercentage(typeof req.percentage === 'number' ? req.percentage : 50);
  };

  // Save percentage (adds to page if not already or updates percentage)
  const handleSavePercentage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!percentageModalTarget) return;

    const cleanPercent = Math.max(0, Math.min(100, Number(inputPercentage) || 0));
    const targetReq = percentageModalTarget.requirement;
    const isEditing = percentageModalTarget.isEditing;

    setRequirements((prev) =>
      prev.map((r) =>
        r.id === targetReq.id ? { ...r, status: 'Fullfilled', percentage: cleanPercent } : r
      )
    );

    setPercentageModalTarget(null);
    showFeedback(
      isEditing
        ? `Persentase "${targetReq.name}" diperbarui menjadi ${cleanPercent}%.`
        : `Requirement "${targetReq.name}" (${cleanPercent}%) ditambahkan ke halaman.`
    );

    try {
      await fetch('/api/squad-d2/fit-proper', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateId,
          requirementId: targetReq.id,
          status: 'Fullfilled',
          percentage: cleanPercent,
        }),
      });
    } catch (err) {
      console.error('Failed to update requirement percentage on server:', err);
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

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col text-slate-800 font-sans antialiased w-full">
      {/* Top Navbar Header */}
      <Header onMenuClick={() => window.dispatchEvent(new Event('toggle-sidebar'))} />

      {/* Main Container */}
      <main className="flex-1 px-3 sm:px-6 md:px-8 lg:px-12 py-4 sm:py-6 w-full max-w-[1400px] mx-auto flex flex-col">
        {/* Navigation & Breadcrumbs */}
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.push('/kanban')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t('common.back', 'Kembali')}</span>
          </button>
        </div>

        {/* Page Title with Functional Qualification Matrix Definition */}
        <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0d1527] tracking-tight">
              FIT &amp; PROPER
            </h1>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">
              {t('fitProper.subtitle', 'Qualification Matrix & Employees Competency Chart (Matriks Komparasi Standar Posisi)')}
            </p>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* BIG CARD CONTAINER (Light Blue/Lavender Background matching Image 2)      */}
        {/* ========================================================================= */}
        <div className="flex-1 bg-[#eef4fe] rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 md:p-9 border border-blue-100/70 shadow-sm flex flex-col">
          {/* 1. Candidate Info Banner Card matching Image 2 */}
          <div className="bg-transparent mb-5 sm:mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-3 sm:gap-4">
              {/* Green circle avatar BS matching Image 2 */}
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#bbf7d0] text-[#15803d] font-bold text-base sm:text-lg flex items-center justify-center shrink-0 shadow-2xs">
                {candidateInitials}
              </div>
              <div>
                <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
                  <h2 className="text-lg sm:text-2xl font-bold text-slate-900 tracking-tight leading-snug">
                    {candidateName}
                  </h2>
                  {(repeatInfo?.isRepeat || (candidate?.application_count || 1) >= 2) && (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#d97706] text-white shadow-2xs">
                      {t('kanban.card.nthApplicant', {
                        count: candidate?.application_count || repeatInfo?.count || 2,
                        ordinal: formatOrdinal(candidate?.application_count || repeatInfo?.count || 2),
                      }, `${formatOrdinal(candidate?.application_count || repeatInfo?.count || 2)} Applicant`)}
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

          {/* Role Access & Authority Banner */}
          {currentUser && (
            <div
              className={`mb-5 sm:mb-6 p-3.5 sm:p-4 rounded-2xl border text-xs sm:text-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs ${
                isManager
                  ? 'bg-purple-50/90 border-purple-200 text-purple-950'
                  : 'bg-amber-50/90 border-amber-200 text-amber-950'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    isManager ? 'bg-purple-600 text-white' : 'bg-amber-500 text-white'
                  }`}
                >
                  {isManager ? <ShieldCheck className="w-5 h-5" /> : <Info className="w-5 h-5" />}
                </div>
                <div>
                  <p className="font-bold">
                    {isManager
                      ? t('fitProper.authority.managerRole', { name: currentUser.name }, `Role: HR Manager (${currentUser.name}) – Otoritas Pengambilan Keputusan Fit & Proper`)
                      : t('fitProper.authority.recruiterRole', { name: currentUser.name }, `Role: HR Recruiter (${currentUser.name}) – Mode Evaluasi & Pratinjau`)}
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {isManager
                      ? t('fitProper.authority.managerDesc', 'Sebagai HR Manager, Anda berwenang mengatur kriteria kompetensi standar dan memutuskan status kandidat ("Lolos Fit & Proper" atau "Tolak") sesuai FR-D2-003.')
                      : t('fitProper.authority.recruiterDesc', 'Sebagai HR Recruiter, Anda dapat meninjau kalkulasi kecocokan dan riwayat pelamar. Pengambilan keputusan akhir dan modifikasi ambang batas dikunci khusus untuk HR Manager (FR-D2-003).')}
                  </p>
                </div>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider shrink-0 self-start sm:self-center ${
                  isManager ? 'bg-purple-200 text-purple-900' : 'bg-amber-200 text-amber-900'
                }`}
              >
                {isManager ? t('fitProper.authority.managerBadge', 'HR Manager Authority') : t('fitProper.authority.recruiterBadge', 'Recruiter Preview')}
              </span>
            </div>
          )}

          {/* 2. Navigation Tabs Container: Capsule Pill matching UI/UX design */}
          <div className="flex justify-center mb-6 sm:mb-8 w-full">
            <div className="inline-flex max-w-3xl w-full p-1 rounded-full bg-slate-100/90 border border-slate-200/90 shadow-inner">
              {/* Tab 1: General information */}
              <button
                type="button"
                onClick={() => setActiveTab('general')}
                className={`flex-1 py-2 sm:py-2.5 md:py-3 px-1.5 sm:px-3 md:px-4 rounded-l-full text-[11px] sm:text-xs md:text-sm font-semibold flex items-center justify-center text-center transition-all duration-150 cursor-pointer leading-tight ${
                  activeTab === 'general'
                    ? 'bg-[#1E3765] text-white font-bold shadow-sm'
                    : 'text-slate-800 hover:text-slate-900 bg-transparent'
                }`}
              >
                {t('fitProper.tabs.general', 'General information')}
              </button>

              {/* Tab 2: Fit & Proper Calculation */}
              <button
                type="button"
                onClick={() => setActiveTab('calculation')}
                className={`flex-1 py-2 sm:py-2.5 md:py-3 px-1.5 sm:px-3 md:px-4 text-[11px] sm:text-xs md:text-sm font-semibold flex items-center justify-center text-center transition-all duration-150 cursor-pointer leading-tight ${
                  activeTab === 'calculation'
                    ? 'bg-[#1E3765] text-white font-bold shadow-sm'
                    : 'text-slate-800 hover:text-slate-900 bg-transparent'
                }`}
              >
                {t('fitProper.tabs.calculation', 'Fit & Proper Calculation')}
              </button>

              {/* Tab 3: Rejected History */}
              <button
                type="button"
                onClick={() => setActiveTab('rejected_history')}
                className={`flex-1 py-2 sm:py-2.5 md:py-3 px-1.5 sm:px-3 md:px-4 rounded-r-full text-[11px] sm:text-xs md:text-sm font-semibold flex items-center justify-center text-center transition-all duration-150 cursor-pointer leading-tight ${
                  activeTab === 'rejected_history'
                    ? 'bg-[#1E3765] text-white font-bold shadow-sm'
                    : 'text-slate-800 hover:text-slate-900 bg-transparent'
                }`}
              >
                {t('fitProper.tabs.rejectedHistory', 'Rejected History')}
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* TAB CONTENT 1: FIT & PROPER CALCULATION (Image 1 & Image 2)               */}
          {/* ========================================================================= */}
          {activeTab === 'calculation' && (
            <div className="flex-1 bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-7 md:p-10 shadow-sm border border-slate-100 flex flex-col">
              {/* Centered CALCULATION Title matching Image 1 */}
              <h3 className="text-xl sm:text-3xl font-extrabold text-slate-900 tracking-wider text-center uppercase mb-6 sm:mb-8">
                {t('fitProper.calculation.title', 'CALCULATION')}
              </h3>

              {/* Requirement Panel Card matching Image 1 */}
              <div className='mb-6'>
                <div className="mb-4 sm:mb-5">
                  <h4 className="text-base sm:text-lg font-bold text-[#71544d]">
                    {t('fitProper.calculation.requirementSection', 'Requirement')}
                  </h4>
                  <p className="text-xs sm:text-sm font-medium text-[#9b8984]">
                    {t('fitProper.calculation.requirementSubtitle', 'Add the requirements met by the candidate')}
                  </p>
                </div>

                {/* Tags on Page: Blue pill buttons with Name and Percentage matching Image */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 md:gap-4 min-h-[44px]">
                  {isLoadingReqs ? (
                    <div className="text-xs text-slate-400 flex items-center gap-2 py-2">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                      <span>{t('common.loading', 'Memuat requirement...')}</span>
                    </div>
                  ) : activeTags.length === 0 ? (
                    <p className="text-xs sm:text-sm text-slate-400 italic py-1">
                      {language === 'en'
                        ? 'No requirements selected yet. Click the search bar below to add.'
                        : 'Belum ada requirement yang dipilih. Klik kolom pencarian di bawah untuk menambahkan.'}
                    </p>
                  ) : (
                    activeTags.map((req) => (
                      <button
                        key={req.id}
                        type="button"
                        onClick={() => handleOpenEditPercentage(req)}
                        className="inline-flex items-center justify-between gap-3 sm:gap-5 bg-[#1d64f2] hover:bg-blue-700 active:scale-95 text-white font-semibold text-xs sm:text-sm px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl shadow-xs transition-all cursor-pointer group min-w-[120px] sm:min-w-[145px]"
                        title={language === 'en' ? 'Click to change percentage or remove this requirement' : 'Klik untuk mengubah persentase atau menghapus requirement ini'}
                      >
                        <span className="truncate max-w-[140px] sm:max-w-none">{req.name}</span>
                        <span className="font-bold flex items-center gap-1 shrink-0">
                          {req.percentage !== undefined ? `${req.percentage}%` : '50%'}
                          <ChevronDown className="w-3.5 h-3.5 opacity-80 group-hover:opacity-100 transition-opacity" />
                        </span>
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
                    placeholder={t('fitProper.calculation.searchRequirement', 'Search by Requirement Set')}
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
                      {language === 'en' ? 'All Requirement Set Options' : 'Semua Opsi Set Persyaratan'}
                    </div>

                    {filteredAvailableOptions.length === 0 ? (
                      <div className="px-5 py-6 text-center text-xs text-slate-400">
                        {searchQuery
                          ? (language === 'en' ? `No requirements found matching "${searchQuery}".` : `Tidak ditemukan requirement dengan kata "${searchQuery}".`)
                          : (language === 'en' ? 'All requirements have already been added to the page.' : 'Semua requirement sudah ditambahkan ke halaman.')}
                      </div>
                    ) : (
                      <div className="py-1">
                        {filteredAvailableOptions.map((req) => (
                          <button
                            key={req.id}
                            type="button"
                            onClick={() => handleSelectReqFromDropdown(req)}
                            className="w-full px-5 py-3 text-left text-xs sm:text-sm font-semibold text-slate-800 hover:bg-[#dde4ee] flex items-center justify-between transition-colors cursor-pointer group"
                          >
                            <span>{req.name}</span>
                            <span className="text-[11px] font-medium text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                              {language === 'en' ? '+ Input Percentage & Add' : '+ Input Persentase & Tambah'}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Capability Fit Bar matching Image 1 */}
              <div className="mt-auto bg-[#dce6fb] rounded-2xl p-3.5 sm:p-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border border-blue-200/80 shadow-2xs">
                <div className="flex items-center gap-2">
                  <span className="text-sm sm:text-base font-bold text-slate-900">
                    {t('fitProper.calculation.capabilityFit', 'Capability Fit')}
                  </span>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-2">
                  {/* Status Pill Badge: UNFULLFILLED (Red) / FULLFILLED (Teal) */}
                  <div
                    className={`px-5 sm:px-8 py-1.5 rounded-full text-xs sm:text-sm font-extrabold tracking-wider uppercase text-white shadow-xs transition-colors text-center ${
                      isCapabilityFit ? 'bg-[#0d9488]' : 'bg-[#e11d48]'
                    }`}
                  >
                    {isCapabilityFit ? t('fitProper.calculation.fulfilled', 'FULLFILLED') : t('fitProper.calculation.unfulfilled', 'UNFULLFILLED')}
                  </div>

                  {/* 3-dots button opening Capability Fit Setting Modal */}
                  <button
                    type="button"
                    onClick={() => {
                      setTempThreshold(threshold);
                      setIsSettingModalOpen(true);
                    }}
                    className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white/50 transition-colors cursor-pointer shrink-0"
                    title={isManager ? t('fitProper.calculation.settingTooltipManager', 'Capability Fit Setting (Kelola Kriteria & Ambang Batas)') : t('fitProper.calculation.settingTooltipViewer', 'Lihat Pengaturan Capability Fit')}
                    aria-label="Capability Fit Setting"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Decision Action Bar (FR-D2-003 FR-03.3 & FR-03.4) */}
              <div className="mt-5 pt-5 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    {t('fitProper.calculation.recruitmentDecision', 'Keputusan Rekrutmen:')}
                  </span>
                  {candidate?.status === 'offered' && (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{language === 'en' ? 'Candidate Passed Fit & Proper' : 'Kandidat Lolos Fit & Proper'}</span>
                    </span>
                  )}
                  {candidate?.status === 'rejected' && (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1.5">
                      <X className="w-3.5 h-3.5 text-rose-600" />
                      <span>{language === 'en' ? 'Candidate Rejected' : 'Kandidat Ditolak'}</span>
                    </span>
                  )}
                  {candidate?.status !== 'offered' && candidate?.status !== 'rejected' && (
                    <span className="text-xs text-slate-500 font-medium">
                      {language === 'en' ? 'Current candidate status: ' : 'Status kandidat saat ini: '}
                      <strong className="text-slate-800 uppercase">
                        {t(`kanban.stages.${(candidate?.status || 'assessment').toLowerCase()}`, candidate?.status || 'Assessment')}
                      </strong>
                    </span>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 justify-end">
                  {/* Button 1: Lolos Fit & Proper */}
                  <button
                    type="button"
                    disabled={!isManager || isDecisionPending}
                    onClick={() => setIsPassModalOpen(true)}
                    className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-xs ${
                      isManager
                        ? 'bg-[#0d9488] hover:bg-[#0f766e] active:scale-95 text-white cursor-pointer'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                    }`}
                    title={
                      isManager
                        ? (language === 'en' ? 'Approve candidate to pass Fit & Proper (FR-03.3)' : 'Setujui kandidat ini lolos Fit & Proper (FR-03.3)')
                        : (language === 'en' ? 'Locked: Only HR Manager is authorized to make Fit & Proper decisions (FR-D2-003)' : 'Wewenang Terkunci: Hanya HR Manager yang berwenang mengambil keputusan Fit & Proper (FR-D2-003)')
                    }
                  >
                    {isManager ? <Check className="w-4 h-4 stroke-[2.5]" /> : <Lock className="w-4 h-4 text-slate-400" />}
                    <span>{t('fitProper.calculation.passButton', 'Lolos Fit & Proper')}</span>
                  </button>

                  {/* Button 2: Tolak */}
                  <button
                    type="button"
                    disabled={!isManager || isDecisionPending}
                    onClick={() => setIsRejectModalOpen(true)}
                    className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-xs ${
                      isManager
                        ? 'bg-[#e11d48] hover:bg-rose-700 active:scale-95 text-white cursor-pointer'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                    }`}
                    title={
                      isManager
                        ? (language === 'en' ? 'Reject candidate based on competency evaluation (FR-03.3)' : 'Tolak kandidat berdasarkan evaluasi kompetensi (FR-03.3)')
                        : (language === 'en' ? 'Locked: Only HR Manager is authorized to make Fit & Proper decisions (FR-D2-003)' : 'Wewenang Terkunci: Hanya HR Manager yang berwenang mengambil keputusan Fit & Proper (FR-D2-003)')
                    }
                  >
                    {isManager ? <X className="w-4 h-4 stroke-[2.5]" /> : <Lock className="w-4 h-4 text-slate-400" />}
                    <span>{t('fitProper.calculation.rejectButton', 'Tolak')}</span>
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
                  {t('fitProper.tabs.rejectedHistory', 'REJECTED HISTORY').toUpperCase()}
                </h3>
              </div>

              {/* Table Container Card matching Image 5 */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                {/* Header Row */}
                <div className="bg-[#f1f5f9] px-6 py-3 flex items-center justify-between text-xs sm:text-sm font-bold text-slate-900">
                  <span>{language === 'en' ? 'Position' : 'Posisi'}</span>
                  <span className="mr-8">{t('fitProper.settingModal.evidence', 'Evidence')}</span>
                </div>

                {/* Rows matching Image 5 & FR-D2-005 */}
                {allRejectedHistory.length === 0 ? (
                  /* FR-D2-005 3.a.ii: Pesan standar jika tidak ada riwayat lamaran */
                  <div className="p-8 text-center text-xs text-slate-500">
                    <p className="font-semibold text-slate-700">
                      {language === 'en' ? 'No prior application history.' : 'Tidak ada riwayat lamaran sebelumnya.'}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {language === 'en' ? 'Candidate is registered as a first-time applicant.' : 'Kandidat terdaftar sebagai pelamar pertama kali (First-Time Applicant).'}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {allRejectedHistory.map((row: any, idx: number) => (
                      <div
                        key={`reject-${row.id || idx}`}
                        className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors"
                      >
                        <div className="min-w-0">
                          <span className="text-xs sm:text-sm font-semibold text-slate-700 block">
                            {row.job_title || row.position || candidateRole}
                          </span>
                          {/* FR-05.4 & FR-05.5: Assessment score & Rejection note */}
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            {row.rejected_at_stage && (
                              <span className="inline-block text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                                {language === 'en' ? 'Stage:' : 'Tahap:'} {t(`kanban.stages.${row.rejected_at_stage.toLowerCase()}`, row.rejected_at_stage)}
                              </span>
                            )}
                            {row.assessment_score !== undefined && row.assessment_score !== null && (
                              <span className="inline-block text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                                {language === 'en' ? 'Assessment Score:' : 'Skor Asesmen:'} {row.assessment_score} / 100
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
                          {t(`kanban.stages.${(row.status || 'rejected').toLowerCase()}`, row.status || 'REJECTED').toUpperCase()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Additional candidate specific rejection log if candidate was rejected */}
              {candidate?.status === 'rejected' && candidate.rejection_reason && (
                <div className="mt-4 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex flex-col gap-1">
                  <div>
                    <span className="font-bold">{language === 'en' ? 'Last Rejection Reason: ' : 'Alasan Penolakan Terakhir: '}</span>
                    <span>{candidate.rejection_reason}</span>
                  </div>
                  {candidate.rejected_at_stage && (
                    <div className="text-[11px] text-rose-700">
                      <span className="font-semibold">{language === 'en' ? 'Rejection Stage: ' : 'Tahap Penolakan: '}</span>
                      <span className="font-medium">{t(`kanban.stages.${candidate.rejected_at_stage.toLowerCase()}`, candidate.rejected_at_stage)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB CONTENT 3: GENERAL INFORMATION                                        */}
          {/* ========================================================================= */}
          {activeTab === 'general' && (
            <div className="flex-1 bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-8 md:p-10 shadow-sm border border-slate-100 flex flex-col">
              {/* Form Grid 2 Kolom matching media_1794844951978_53119498.png */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-5 sm:gap-y-7 gap-x-6 lg:gap-x-16 max-w-4xl mx-auto w-full">
                {/* Kolom Kiri 1: NAMA LENGKAP */}
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <User className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-[11px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      {t('fitProper.fields.fullName', 'NAMA LENGKAP')}
                    </p>
                    <p className="text-sm sm:text-base font-bold text-slate-900 mt-0.5">
                      {candidate?.full_name || candidateName}
                    </p>
                  </div>
                </div>

                {/* Kolom Kanan 1: ALAMAT EMAIL */}
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Mail className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-[11px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      {t('fitProper.fields.email', 'ALAMAT EMAIL')}
                    </p>
                    <p className="text-sm sm:text-base font-bold text-slate-900 mt-0.5">
                      {candidate?.email || '-'}
                    </p>
                  </div>
                </div>

                {/* Kolom Kiri 2: NOMOR TELEPON */}
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Phone className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-[11px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      {t('fitProper.fields.phone', 'NOMOR TELEPON')}
                    </p>
                    <p className="text-sm sm:text-base font-bold text-slate-900 mt-0.5">
                      {candidate?.phone_number || '-'}
                    </p>
                  </div>
                </div>

                {/* Kolom Kanan 2: POSISI DILAMAR */}
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Briefcase className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-[11px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      {t('fitProper.fields.appliedPosition', 'POSISI DILAMAR')}
                    </p>
                    <p className="text-sm sm:text-base font-bold text-slate-900 mt-0.5">
                      {displayJobApplied}
                    </p>
                  </div>
                </div>

                {/* Kolom Kiri 3: JALUR PENDAFTARAN */}
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Layers className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-[11px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      {t('fitProper.fields.registrationMethod', 'JALUR PENDAFTARAN')}
                    </p>
                    <p className="text-sm sm:text-base font-bold text-slate-900 mt-0.5">
                      {displayRegistrationWay.toLowerCase().includes('recommend')
                        ? t('fitProper.fields.recommendation', 'Recommendation')
                        : t('fitProper.fields.scouting', 'Scouting / Interview')}
                    </p>
                  </div>
                </div>

                {/* Kolom Kanan 3: TAHAPAN REKRUTMEN */}
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Calendar className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-[11px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      {t('fitProper.fields.recruitmentStage', 'TAHAPAN REKRUTMEN')}
                    </p>
                    <div className="mt-1">
                      <span className="inline-block px-3.5 py-0.5 rounded-full text-xs font-bold uppercase bg-blue-100 text-blue-800 tracking-wider">
                        {t(`kanban.columns.${displayStage.toLowerCase()}`, displayStage).toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Kolom Kiri 4: SOCIAL MEDIA (Field terpisah per akun) */}
                <div className="flex items-start gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Globe className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                      {t('fitProper.fields.socialMedia', 'SOCIAL MEDIA ACCOUNTS')}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {parsedSocialMedias.length > 0 ? (
                        parsedSocialMedias.map((item, idx) => (
                          <div
                            key={idx}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm shadow-2xs"
                          >
                            <span className="font-bold text-blue-600">{item.platform}:</span>
                            <span className="font-semibold text-slate-800">{item.handle}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm font-medium text-slate-400 italic">
                          {language === 'en' ? 'Not provided' : 'Tidak dicantumkan'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Kolom Kanan 4: SKILL PORTOFOLIO (Clickable Link Open New Tab) */}
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <FolderGit2 className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      {t('fitProper.fields.portfolio', 'SKILL PORTOFOLIO')}
                    </p>
                    <div className="mt-0.5">
                      <a
                        href={portfolioHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs sm:text-sm font-bold text-blue-600 hover:text-blue-800 underline inline-flex items-center gap-1.5 transition-colors"
                        title={language === 'en' ? 'Open Portfolio in New Tab' : 'Buka Portofolio di Tab Baru'}
                      >
                        <span className="truncate max-w-[200px] sm:max-w-xs">{candidatePortfolio}</span>
                        <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                      </a>
                    </div>
                  </div>
                </div>

                {/* Baris Span 2 Kolom: SKILL DESCRIPTION */}
                <div className="col-span-1 md:col-span-2 flex items-start gap-3.5 pt-1">
                  <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      {t('fitProper.fields.skills', 'SKILL DESCRIPTION')}
                    </p>
                    <p className="text-xs sm:text-sm font-medium text-slate-700 mt-1 leading-relaxed">
                      {candidateSkillDescription}
                    </p>
                  </div>
                </div>
              </div>

              {/* Baris Berkas Dokumen (Curriculum Vitae & Certificate) */}
              <div className="max-w-4xl mx-auto w-full mt-10 pt-6 border-t border-slate-100 space-y-4">
                {/* CV Row matching Image */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2.5">
                    <FileText className="w-5 h-5 text-blue-600 shrink-0" />
                    <span className="text-xs sm:text-sm font-semibold text-slate-700">
                      {t('fitProper.fields.cvDocument', 'Curriculum Vitae (PDF Document)')}
                    </span>
                  </div>
                  <a
                    href={`/api/squad-d2/download?type=cv&candidateId=${candidate?.id || candidateId}`}
                    download
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-xl transition-colors inline-flex items-center justify-center cursor-pointer shrink-0"
                  >
                    {language === 'en' ? 'Download CV Document' : 'Unduh Dokumen CV'}
                  </a>
                </div>

                {/* Certificate Row - HANYA tampil jika pelamar melampirkan certificate */}
                {hasCertificate && (
                  <div className="flex items-center justify-between gap-4 pt-3 border-t border-slate-100/80">
                    <div className="flex items-center gap-2.5">
                      <FileText className="w-5 h-5 text-blue-600 shrink-0" />
                      <span className="text-xs sm:text-sm font-semibold text-slate-700">
                        {t('fitProper.fields.certificateDocument', 'Certificate (PDF Document)')}
                      </span>
                    </div>
                    <a
                      href={`/api/squad-d2/download?type=certificate&candidateId=${candidate?.id || candidateId}`}
                      download
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-xl transition-colors inline-flex items-center justify-center cursor-pointer shrink-0"
                    >
                      {language === 'en' ? 'Download Certificate' : 'Unduh Dokumen Sertifikat'}
                    </a>
                  </div>
                )}
              </div>

              {/* Footer Section: Application Date & Interview Info */}
              <div className="max-w-4xl mx-auto w-full">
                {isInterviewStage ? (
                  /* Ketika sudah interview: Sebaris (justify-between) */
                  <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    {/* Sisi Kiri: Informasi Metode Wawancara */}
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <Video className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-[11px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          {language === 'en' ? 'INTERVIEW METHOD' : 'METODE WAWANCARA'}
                        </p>
                        <p className="text-sm sm:text-base font-bold text-slate-900 mt-0.5">
                          {language === 'en'
                            ? (interviewWay === 'Online' ? 'Online (Video Call)' : 'Onsite (Fleet Pool)')
                            : (interviewWay === 'Online' ? 'Online (Panggilan Video)' : 'Onsite (Pool Armada)')}
                        </p>
                      </div>
                    </div>

                    {/* Sisi Kanan: Application Date */}
                    <div className="inline-flex items-center px-6 py-2.5 rounded-xl border border-slate-200/90 bg-slate-50/50 text-slate-500 font-bold text-xs sm:text-sm shadow-2xs shrink-0 self-center sm:self-auto">
                      {language === 'en' ? 'Application Date:' : 'Tanggal Lamaran:'} {formattedAppDate}
                    </div>
                  </div>
                ) : (
                  /* Ketika belum interview: Posisi Center */
                  <div className="mt-8 pt-6 border-t border-slate-100 flex justify-center items-center">
                    <div className="inline-flex items-center px-6 py-2.5 rounded-xl border border-slate-200/90 bg-slate-50/50 text-slate-500 font-bold text-xs sm:text-sm shadow-2xs">
                      {language === 'en' ? 'Application Date:' : 'Tanggal Lamaran:'} {formattedAppDate}
                    </div>
                  </div>
                )}
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
          <div className="bg-white rounded-3xl overflow-hidden max-w-[calc(100vw-32px)] sm:max-w-2xl w-full shadow-2xl animate-in zoom-in-95 duration-150 border border-slate-100 flex flex-col max-h-[90vh]">
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
                title={t('common.close', 'Tutup')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 sm:p-8 pt-4 overflow-y-auto flex-1 space-y-6">
              {/* Centered Modal Title matching Image 3 */}
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 text-center uppercase tracking-wide">
                {t('fitProper.settingModal.title', 'CAPABILITY FIT SETTING')}
              </h3>

              {/* Table condition vs evidence matching Image 3 */}
              <div className="rounded-2xl border border-slate-200 overflow-visible shadow-2xs relative z-30">
                {/* Table Header */}
                <div className="bg-[#f1f5f9] px-5 py-3 grid grid-cols-12 text-xs sm:text-sm font-bold text-slate-800 rounded-t-2xl">
                  <div className="col-span-8">{t('fitProper.settingModal.condition', 'Condition')}</div>
                  <div className="col-span-4 text-right sm:text-left sm:pl-3">{t('fitProper.settingModal.evidence', 'Evidence')}</div>
                </div>

                {/* Table Row */}
                <div className="p-4 sm:p-5 bg-white grid grid-cols-12 items-center gap-3 rounded-b-2xl relative">
                  <div className="col-span-8 pr-2">
                    <p className="text-xs sm:text-sm text-slate-700 leading-relaxed italic">
                      {t('fitProper.settingModal.conditionText', '"Percentage number of requirements that must be met to achieve FULLFILLED status"')}
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
                        <span>{tempThreshold ? `${tempThreshold}%` : t('fitProper.settingModal.selectNumber', 'Select Number')}</span>
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
                      {t('fitProper.settingModal.requirementListTitle', 'Requirement List')}
                    </h4>
                    <p className="text-xs text-slate-500">
                      {isManager
                        ? t('fitProper.settingModal.requirementListSubtitle', 'Kelola daftar seluruh requirements (kriteria) untuk kandidat')
                        : (language === 'en' ? 'Standard requirements list for this position (Preview)' : 'Daftar seluruh requirement standar untuk posisi ini (Pratinjau)')}
                    </p>
                  </div>

                  {/* Add Requirement (Create) Button - Only for HR Manager */}
                  {isManager && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingReqInModal(true);
                        setNewReqNameInModal('');
                      }}
                      className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{t('fitProper.settingModal.addRequirement', '+ Add Requirement')}</span>
                    </button>
                  )}
                </div>

                {/* Inline Add Requirement Form */}
                {isAddingReqInModal && isManager && (
                  <form
                    onSubmit={handleAddNewRequirementInModal}
                    className="p-3.5 bg-blue-50/70 rounded-2xl border border-blue-200/80 animate-in fade-in duration-100 flex flex-col sm:flex-row items-center gap-2.5"
                  >
                    <input
                      type="text"
                      value={newReqNameInModal}
                      onChange={(e) => setNewReqNameInModal(e.target.value)}
                      placeholder={language === 'en' ? 'Enter new requirement name...' : 'Masukkan nama requirement baru...'}
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
                        {t('common.cancel', 'Batal')}
                      </button>
                      <button
                        type="submit"
                        disabled={!newReqNameInModal.trim()}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 shadow-xs cursor-pointer"
                      >
                        {t('common.save', 'Simpan')}
                      </button>
                    </div>
                  </form>
                )}

                {/* Requirement Items List */}
                <div className="rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden bg-white shadow-2xs">
                  {activeRequirements.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400">
                      {language === 'en'
                        ? 'No requirements yet. Click "Add Requirement" above to add.'
                        : 'Belum ada requirement. Klik tombol "Add Requirement" di atas untuk menambahkan.'}
                    </div>
                  ) : (
                    activeRequirements.map((req) => {
                      const isEditing = editingReqIdInModal === req.id;

                      return (
                        <div
                          key={req.id}
                          className="px-4 sm:px-5 py-3 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
                        >
                          {/* If editing inline */}
                          {isEditing && isManager ? (
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
                                {t('common.save', 'Simpan')}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingReqIdInModal(null);
                                  setEditingReqNameInModal('');
                                }}
                                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-100 cursor-pointer"
                              >
                                {t('common.cancel', 'Batal')}
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
                                    {t('fitProper.settingModal.activeOnPage', 'Aktif di Halaman')}
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-medium bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full shrink-0">
                                    {t('fitProper.settingModal.inDropdownPool', 'Di Dropdown Pool')}
                                  </span>
                                )}
                              </div>

                              {/* Separate Edit & Delete Icon Buttons - Enabled only for HR Manager */}
                              {isManager ? (
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingReqIdInModal(req.id);
                                      setEditingReqNameInModal(req.name);
                                    }}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                                    title={language === 'en' ? 'Edit Requirement' : 'Ubah Persyaratan'}
                                    aria-label={language === 'en' ? 'Edit Requirement' : 'Ubah Persyaratan'}
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleSoftDeleteRequirement(req)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                    title={language === 'en' ? 'Delete Requirement' : 'Hapus Persyaratan'}
                                    aria-label={language === 'en' ? 'Delete Requirement' : 'Hapus Persyaratan'}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[10px] text-slate-400 italic">
                                  {language === 'en' ? 'Fixed Standard' : 'Standar Tetap'}
                                </span>
                              )}
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
                  <p className="font-semibold">
                    {language === 'en' ? 'Candidate Calculation Simulation:' : 'Simulasi Perhitungan Kandidat:'}
                  </p>
                  <p className="mt-0.5 text-slate-600">
                    {language === 'en'
                      ? `Candidate currently meets ${fulfilledCount} of ${totalActiveCount} requirements (${currentPercentage}%). Target threshold (${tempThreshold}%): `
                      : `Kandidat saat ini memenuhi ${fulfilledCount} dari ${totalActiveCount} requirement (${currentPercentage}%). Status target (${tempThreshold}%): `}
                    <strong
                      className={`font-bold ${
                        currentPercentage >= (Number(tempThreshold) || 0)
                          ? 'text-emerald-700'
                          : 'text-rose-600'
                      }`}
                    >
                      {currentPercentage >= (Number(tempThreshold) || 0)
                        ? t('fitProper.calculation.fulfilled', 'FULLFILLED')
                        : t('fitProper.calculation.unfulfilled', 'UNFULLFILLED')}
                    </strong>
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0">
              {!isManager ? (
                <>
                  <div className="flex items-center gap-1.5 text-xs text-amber-800 font-medium">
                    <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>
                      {language === 'en'
                        ? 'Preview Mode: Standard configuration authority belongs to HR Manager.'
                        : 'Mode Pratinjau: Wewenang pengubahan standar dimiliki oleh HR Manager.'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSettingModalOpen(false);
                      setIsThresholdSelectOpen(false);
                    }}
                    className="px-5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-200 hover:bg-slate-300 transition-colors cursor-pointer"
                  >
                    {t('common.close', 'Tutup')}
                  </button>
                </>
              ) : (
                <>
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
                    {t('common.cancel', 'Batal')}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveSetting()}
                    className="px-6 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-sm active:scale-95 cursor-pointer"
                  >
                    {t('fitProper.settingModal.saveSettings', 'Simpan Pengaturan')}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ADD NEW REQUIREMENT                                              */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-5 sm:p-7 max-w-[calc(100vw-32px)] sm:max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-150 border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900">
                {language === 'en' ? 'Add New Requirement' : 'Tambah Requirement Baru'}
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
                  {language === 'en' ? 'Requirement Name' : 'Nama Requirement'}
                </label>
                <input
                  type="text"
                  value={newRequirementName}
                  onChange={(e) => setNewRequirementName(e.target.value)}
                  placeholder={language === 'en' ? 'e.g. Problem Solving, Communication, AWS Certification' : 'Contoh: Problem Solving, Komunikasi, Sertifikasi AWS'}
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
                  {t('common.cancel', 'Batal')}
                </button>
                <button
                  type="submit"
                  disabled={!newRequirementName.trim()}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
                >
                  {language === 'en' ? 'Add Requirement' : 'Tambah Requirement'}
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
          <div className="bg-white rounded-3xl p-5 sm:p-7 max-w-[calc(100vw-32px)] sm:max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-150 border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900">
                {language === 'en' ? 'Edit Requirement' : 'Edit Requirement'}
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
                  {language === 'en' ? 'Requirement Name' : 'Nama Requirement'}
                </label>
                <input
                  type="text"
                  value={editRequirementName}
                  onChange={(e) => setEditRequirementName(e.target.value)}
                  placeholder={language === 'en' ? 'Requirement Name...' : 'Nama Requirement...'}
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  autoFocus
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingRequirement(null)}
                  className="px-4 py-2 border rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  {t('common.cancel', 'Batal')}
                </button>
                <button
                  type="submit"
                  disabled={!editRequirementName.trim()}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
                >
                  {t('common.save', 'Simpan Perubahan')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: PASS CONFIRMATION (FR-03.3 & FR-03.4: Lolos Fit & Proper)        */}
      {/* ========================================================================= */}
      {isPassModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-5 sm:p-7 max-w-[calc(100vw-32px)] sm:max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-150 border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  {t('fitProper.passModal.title', 'Konfirmasi Lolos Fit & Proper')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPassModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                {t('fitProper.passModal.confirmQuestion', { name: candidateName }, `Sebagai HR Manager, apakah Anda yakin ingin menetapkan kandidat ${candidateName} sebagai Lolos Fit & Proper?`)}
              </p>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 space-y-1">
                <p className="font-bold flex items-center justify-between">
                  <span>{t('fitProper.passModal.qualificationAchievement', 'Pencapaian Kualifikasi:')}</span>
                  <span>{currentPercentage}% / {t('fitProper.passModal.target', 'Target')} {threshold}%</span>
                </p>
                <p className="text-[11px] text-emerald-700">
                  {t('fitProper.passModal.databaseNote', 'Status kandidat di database akan diperbarui ke tahapan penawaran (Offered) dan dicatat pada audit log.')}
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPassModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  {t('common.cancel', 'Batal')}
                </button>
                <button
                  type="button"
                  disabled={isDecisionPending}
                  onClick={() => {
                    setIsPassModalOpen(false);
                    handleExecuteDecision('Lolos Fit & Proper');
                  }}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#0d9488] hover:bg-teal-700 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {isDecisionPending ? t('common.loading', 'Menyimpan...') : t('fitProper.passModal.approvePass', 'Setujui Lolos')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: REJECTION CONFIRMATION & REASON (FR-03.3 & FR-03.4)               */}
      {/* ========================================================================= */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-5 sm:p-7 max-w-[calc(100vw-32px)] sm:max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-150 border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900">
                {t('fitProper.rejectModal.title', 'Konfirmasi Penolakan Kandidat')}
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
                {t('fitProper.rejectModal.confirmQuestion', { name: candidateName }, `Apakah Anda yakin ingin menolak kandidat ${candidateName}? Status pelamar akan diubah ke Rejected dan dicatat pada audit log.`)}
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {t('fitProper.rejectModal.rejectionReasonLabel', 'Alasan Penolakan (Catatan Fit & Proper)')}
                </label>
                <textarea
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder={t('fitProper.rejectModal.rejectionReasonPlaceholder', { threshold, missing: missingRequirements }, `Contoh: Kualifikasi teknis belum memenuhi target minimal ${threshold}% (${missingRequirements} syarat belum terpenuhi).`)}
                  className="w-full p-3 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRejectModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  {t('common.cancel', 'Batal')}
                </button>
                <button
                  type="button"
                  disabled={isDecisionPending}
                  onClick={() => handleExecuteDecision('Tolak', rejectReason)}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#e11d48] hover:bg-rose-700 transition-colors shadow-sm disabled:opacity-50"
                >
                  {isDecisionPending ? t('common.loading', 'Menyimpan...') : t('fitProper.rejectModal.confirmReject', 'Konfirmasi Tolak')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: INPUT / UBAH PERSENTASE REQUIREMENT                              */}
      {/* ========================================================================= */}
      {percentageModalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="bg-white rounded-3xl p-5 sm:p-7 max-w-[calc(100vw-32px)] sm:max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-150 border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900">
                {percentageModalTarget.isEditing ? t('fitProper.percentageModal.editTitle', 'Ubah Persentase Requirement') : t('fitProper.percentageModal.inputTitle', 'Input Persentase Requirement')}
              </h3>
              <button
                type="button"
                onClick={() => setPercentageModalTarget(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4">
              <p className="text-xs text-slate-500 mb-2">
                {t('fitProper.percentageModal.subtitle', 'Perbarui persentase pemenuhan untuk requirement:')}
              </p>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-blue-50 text-blue-700 font-bold text-sm border border-blue-100">
                <span>{percentageModalTarget.requirement.name}</span>
              </div>
            </div>

            <form onSubmit={handleSavePercentage} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {t('fitProper.percentageModal.percentageLabel', 'Persentase Pemenuhan (0 - 100%)')}
                </label>
                <div className="flex items-center justify-center gap-2 py-2">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={inputPercentage}
                    onChange={(e) => {
                      const val = e.target.value === '' ? 0 : Math.max(0, Math.min(100, Number(e.target.value)));
                      setInputPercentage(val);
                    }}
                    className="w-24 h-12 text-center text-xl font-bold rounded-2xl border-2 border-blue-500 text-slate-800 bg-[#f8faff] focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/20 shadow-xs"
                    autoFocus
                  />
                  <span className="text-2xl font-bold text-slate-600">%</span>
                </div>

                {/* Quick preset percentage pills */}
                <div className="flex items-center justify-center gap-1.5 mt-3 flex-wrap">
                  {[10, 25, 50, 75, 80, 100].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setInputPercentage(preset)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        inputPercentage === preset
                          ? 'bg-[#1d64f2] text-white shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {preset}%
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-100">
                {percentageModalTarget.isEditing ? (
                  <button
                    type="button"
                    onClick={() => {
                      handleRemoveTag(percentageModalTarget.requirement.id);
                      setPercentageModalTarget(null);
                    }}
                    className="px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                  >
                    {t('fitProper.percentageModal.removeFromPage', 'Hapus dari Halaman')}
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPercentageModalTarget(null)}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    {t('common.cancel', 'Batal')}
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#1d64f2] hover:bg-blue-700 transition-colors shadow-sm cursor-pointer"
                  >
                    {percentageModalTarget.isEditing ? t('fitProper.percentageModal.save', 'Simpan') : t('fitProper.percentageModal.add', 'Tambahkan')}
                  </button>
                </div>
              </div>
            </form>
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
