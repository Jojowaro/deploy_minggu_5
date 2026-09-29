'use client';

import React, { useState, useRef, useTransition, useId, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  CheckCircle2,
  AlertCircle,
  FileText,
  X,
  Loader2,
  Menu,
  Briefcase,
  MapPin,
  ArrowLeft,
} from 'lucide-react';
import { submitCandidateRegistration } from './actions';
import { RegistrationWayUi, JobPost } from '../../types/candidate';
import Sidebar from '@/components/Sidebar';
import { DEFAULT_ACTIVE_JOB_POSTS } from '../../lib/supabaseServer';

function RegistrationFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawJobId = searchParams.get('jobId');

  const [jobId, setJobId] = useState<string | null>(rawJobId);
  const [selectedJob, setSelectedJob] = useState<JobPost | null>(null);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [registrationWay, setRegistrationWay] = useState<RegistrationWayUi>('recommendation');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ message: string; candidateId?: string } | null>(null);

  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const fullNameId = useId();
  const emailId = useId();

  // Find job information if jobId is present
  useEffect(() => {
    if (rawJobId) {
      setJobId(rawJobId);
      const fallbackMatch = DEFAULT_ACTIVE_JOB_POSTS.find((j) => j.id === rawJobId);
      if (fallbackMatch) {
        setSelectedJob(fallbackMatch);
      }

      // Check live database for latest job metadata
      import('../jobs/actions').then(({ getJobsAction }) => {
        getJobsAction().then((liveJobs) => {
          const matched = liveJobs.find((j) => j.id === rawJobId);
          if (matched) {
            setSelectedJob(matched);
          } else if (!fallbackMatch) {
            setSelectedJob({
              id: rawJobId,
              title: 'Specialized Position',
              department: 'PT Andima Transportindo',
              status: 'active',
              location: 'Indonesia',
            });
          }
        });
      });
    } else {
      setSelectedJob(null);
      setJobId(null);
    }
  }, [rawJobId]);

  // Validate form fields locally before submission
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!fullName.trim()) {
      errors.fullName = 'Full Name must be filled!';
    } else if (fullName.trim().length < 2) {
      errors.fullName = 'Full name must be at least 2 characters!';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      errors.email = 'Email must be filled!';
    } else if (!emailRegex.test(email.trim())) {
      errors.email = 'Invalid email format (example: nama@domain.com).';
    }

    if (!selectedFile) {
      errors.cvFile = 'Curriculum Vitae (PDF) must be uploaded!';
    } else {
      if (!selectedFile.name.toLowerCase().endsWith('.pdf') && selectedFile.type !== 'application/pdf') {
        errors.cvFile = 'Invalid file format. The resume must be in .pdf format.';
      }
      if (selectedFile.size > 5 * 1024 * 1024) {
        errors.cvFile = 'The CV file size exceeds the 5 MB limit!';
      }
    }

    if (!registrationWay) {
      errors.registrationWay = 'Select one of the registration options.';
    }

    setClientErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFileChange = (file: File | null) => {
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setClientErrors((prev) => ({
        ...prev,
        cvFile: 'Invalid file format. The resume must be in .pdf format.',
      }));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setClientErrors((prev) => ({
        ...prev,
        cvFile: 'The CV file size exceeds the 5 MB limit.',
      }));
      return;
    }

    setClientErrors((prev) => {
      const next = { ...prev };
      delete next.cvFile;
      return next;
    });
    setSelectedFile(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const resetForm = () => {
    setFullName('');
    setEmail('');
    setPhoneNumber('');
    setRegistrationWay('recommendation');
    setSelectedFile(null);
    setClientErrors({});
    setServerError(null);
    setSuccessInfo(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!validateForm()) {
      return;
    }

    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('fullName', fullName);
    formData.append('email', email);
    if (phoneNumber) formData.append('phoneNumber', phoneNumber);
    formData.append('registrationWay', registrationWay);
    if (jobId) {
      formData.append('jobId', jobId);
    }
    formData.append('cvFile', selectedFile);

    startTransition(async () => {
      try {
        const result = await submitCandidateRegistration(formData);

        if (!result.success) {
          if (result.errors) {
            const mappedErrors: Record<string, string> = {};
            Object.entries(result.errors).forEach(([k, msgs]) => {
              mappedErrors[k] = msgs.join(', ');
            });
            setClientErrors(mappedErrors);
          }
          setServerError(result.message);
        } else {
          setSuccessInfo({
            message: result.message,
            candidateId: result.candidateId,
          });
          resetForm();
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Terjadi kendala saat mengirim form';
        setServerError(msg);
      }
    });
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col lg:flex-row text-slate-800 font-sans antialiased">
      {/* ========================================================================= */}
      {/* 1. SIDEBAR NAVIGASI KIRI                                                  */}
      {/* ========================================================================= */}
      <Sidebar />

      {/* ========================================================================= */}
      {/* 2. AREA KONTEN UTAMA                                                      */}
      {/* ========================================================================= */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar: h-16, border bawah tipis, teks tengah ANDIMA HRMS */}
        <header className="h-16 border-b border-slate-200/80 bg-white/70 backdrop-blur-sm sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 md:px-8">
          <div className="flex items-center lg:hidden">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="p-2 -ml-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 text-center">
            <span className="text-sm md:text-base font-medium tracking-[0.2em] text-slate-800 uppercase">
              ANDIMA HRMS
            </span>
          </div>

          <div className="w-8 lg:w-0" />
        </header>

        {/* Page Body Container */}
        <div className="flex-1 px-4 sm:px-6 md:px-12 py-8 max-w-5xl w-full mx-auto">
          {/* Back link to Job List */}
          <div className="mb-4">
            <button
              type="button"
              onClick={() => router.push('/jobs')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Job List</span>
            </button>
          </div>

          {/* Page Title & Subtitle */}
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-extrabold text-[#0d1527] tracking-tight">
              REGISTRATION FORM
            </h1>
            <p className="text-xs md:text-sm text-slate-500 mt-1">
              Multi-track candidate application portal for PT Andima Transportindo.
            </p>
          </div>

          {/* Selected Job Post Banner (FR-01.2: Relasi ke ID Lowongan Spesifik) */}
          {selectedJob && (
            <div className="mb-6 p-4 rounded-2xl bg-blue-50/80 border border-blue-200/80 text-blue-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs animate-in fade-in duration-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md">
                      Selected Position
                    </span>
                    {selectedJob.location && (
                      <span className="text-xs text-blue-800 flex items-center gap-1 font-medium">
                        <MapPin className="w-3 h-3" />
                        {selectedJob.location}
                      </span>
                    )}
                  </div>
                  <h2 className="font-extrabold text-slate-900 text-base md:text-lg mt-0.5">
                    {selectedJob.title}
                  </h2>
                  {selectedJob.department && (
                    <p className="text-xs text-slate-600">
                      {selectedJob.department}
                    </p>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => router.push('/jobs')}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-white hover:bg-blue-50 px-3.5 py-1.5 rounded-lg border border-blue-200 transition-colors shrink-0"
              >
                Change Position
              </button>
            </div>
          )}

          {/* Success Banner */}
          {successInfo && (
            <div className="mb-6 p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-4 shadow-sm animate-in fade-in duration-200">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-bold text-emerald-950 text-base">Pendaftaran Berhasil Terkirim!</h3>
                <p className="text-sm text-emerald-800 mt-1">{successInfo.message}</p>
                {successInfo.candidateId && (
                  <p className="text-xs text-emerald-700 mt-2 font-mono bg-emerald-100/70 inline-block px-2.5 py-1 rounded-md">
                    Candidate ID: {successInfo.candidateId}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSuccessInfo(null)}
                className="text-emerald-700 hover:text-emerald-950 p-1"
                aria-label="Tutup notifikasi sukses"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Server Error Alert */}
          {serverError && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start gap-3 shadow-sm animate-in fade-in duration-200">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-bold text-rose-950 text-sm">Gagal Mengirim Formulir</h4>
                <p className="text-xs text-rose-800 mt-1">{serverError}</p>
              </div>
              <button
                type="button"
                onClick={() => setServerError(null)}
                className="text-rose-700 hover:text-rose-950 p-1"
                aria-label="Tutup pesan error"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Main White Card Container */}
          <div className="bg-white rounded-2xl md:rounded-3xl border border-slate-100 shadow-[0_10px_35px_-5px_rgba(0,0,0,0.06)] p-6 md:p-10">
            <form ref={formRef} onSubmit={handleSubmit} noValidate className="space-y-6">
              {/* ================================================================= */}
              {/* FIELD 1: FULL NAME                                                */}
              {/* ================================================================= */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full bg-[#3b82f6] shrink-0" />
                  <label htmlFor={fullNameId} className="text-xs font-bold tracking-wider text-slate-800 uppercase">
                    FULL NAME
                  </label>
                </div>

                <div
                  className={`relative rounded-xl border border-neutral-700 bg-neutral-100 transition-all duration-150 shadow-[1px_2px_0px_rgba(0,0,0,0.35)] focus-within:shadow-[1px_3px_0px_rgba(59,130,246,0.6)] focus-within:border-blue-600 ${
                    clientErrors.fullName ? 'border-rose-500 shadow-[1px_2px_0px_rgba(239,68,68,0.4)]' : ''
                  }`}
                >
                  <input
                    id={fullNameId}
                    name="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      if (clientErrors.fullName) {
                        setClientErrors((prev) => {
                          const n = { ...prev };
                          delete n.fullName;
                          return n;
                        });
                      }
                    }}
                    placeholder="Enter your full name..."
                    className="w-full h-12 md:h-14 px-5 bg-transparent text-sm md:text-base font-normal text-slate-800 placeholder:text-neutral-400 focus:outline-none rounded-xl"
                    disabled={isPending}
                  />
                </div>
                {clientErrors.fullName && (
                  <p className="mt-1 text-xs text-rose-600 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {clientErrors.fullName}
                  </p>
                )}
              </div>

              {/* ================================================================= */}
              {/* FIELD 2: EMAIL                                                    */}
              {/* ================================================================= */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full bg-[#3b82f6] shrink-0" />
                  <label htmlFor={emailId} className="text-xs font-bold tracking-wider text-slate-800 uppercase">
                    EMAIL
                  </label>
                </div>

                <div
                  className={`relative rounded-xl border border-neutral-700 bg-neutral-100 transition-all duration-150 shadow-[1px_2px_0px_rgba(0,0,0,0.35)] focus-within:shadow-[1px_3px_0px_rgba(59,130,246,0.6)] focus-within:border-blue-600 ${
                    clientErrors.email ? 'border-rose-500 shadow-[1px_2px_0px_rgba(239,68,68,0.4)]' : ''
                  }`}
                >
                  <input
                    id={emailId}
                    name="email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (clientErrors.email) {
                        setClientErrors((prev) => {
                          const n = { ...prev };
                          delete n.email;
                          return n;
                        });
                      }
                    }}
                    placeholder="Enter your Email..."
                    className="w-full h-12 md:h-14 px-5 bg-transparent text-sm md:text-base font-normal text-slate-800 placeholder:text-neutral-400 focus:outline-none rounded-xl"
                    disabled={isPending}
                  />
                </div>
                {clientErrors.email && (
                  <p className="mt-1 text-xs text-rose-600 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {clientErrors.email}
                  </p>
                )}
              </div>

              {/* ================================================================= */}
              {/* FIELD 3: CURRICULUM VITAE (PDF)                                   */}
              {/* ================================================================= */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full bg-[#3b82f6] shrink-0" />
                  <label className="text-xs font-bold tracking-wider text-slate-800 uppercase">
                    CURRICULUM VITAE (PDF)
                  </label>
                </div>

                {/* Upload Dropzone Box (Exact Figma Styling) */}
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative w-full rounded-2xl border-2 border-dashed transition-all duration-200 flex flex-col items-center justify-center p-8 md:p-12 cursor-pointer ${
                    dragActive
                      ? 'border-blue-600 bg-blue-50/60'
                      : clientErrors.cvFile
                      ? 'border-rose-500 bg-rose-50/30'
                      : 'border-neutral-700 bg-neutral-200/80 hover:bg-neutral-200'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf,.pdf"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileChange(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                    disabled={isPending}
                  />

                  {/* Clean Mockup Upload Icon (Tray with upward arrow) */}
                  <div className="mb-4 text-neutral-600 flex items-center justify-center">
                    <svg
                      className="w-14 h-14"
                      viewBox="0 0 56 56"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M28 10L16 22H24V34H32V22H40L28 10Z"
                        fill="currentColor"
                      />
                      <path
                        d="M12 36V44H44V36H40V40H16V36H12Z"
                        fill="currentColor"
                      />
                    </svg>
                  </div>

                  <p className="text-xs md:text-sm font-bold tracking-widest text-neutral-600 uppercase text-center">
                    UPLOAD YOUR FILE HERE
                  </p>
                  <p className="text-[11px] text-neutral-500 mt-1">
                    Format: PDF document (Max 5 MB)
                  </p>

                  {/* Selected File Card Preview */}
                  {selectedFile && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="mt-4 flex items-center gap-3 bg-white px-4 py-2.5 rounded-xl border border-slate-300 shadow-sm text-xs font-semibold text-slate-800"
                    >
                      <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                      <span className="truncate max-w-[200px] md:max-w-xs">{selectedFile.name}</span>
                      <span className="text-slate-400 font-normal">
                        ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedFile(null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="text-slate-400 hover:text-rose-600 p-0.5 rounded-full ml-1"
                        aria-label="Hapus file terpilih"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {clientErrors.cvFile && (
                  <p className="mt-1 text-xs text-rose-600 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {clientErrors.cvFile}
                  </p>
                )}
              </div>

              {/* ================================================================= */}
              {/* FIELD 4: REGISTRATION WAY                                         */}
              {/* ================================================================= */}
              <div className="pt-2">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 rounded-full bg-[#3b82f6] shrink-0" />
                  <label className="text-xs font-bold tracking-wider text-slate-800 uppercase">
                    REGISTRATION WAY
                  </label>
                </div>

                <div className="flex items-center gap-8 pl-1">
                  {/* Option 1: Scouting */}
                  <label className="flex items-center gap-3 cursor-pointer select-none group">
                    <div className="relative flex items-center justify-center">
                      <input
                        type="radio"
                        name="registrationWay"
                        value="scouting"
                        checked={registrationWay === 'scouting'}
                        onChange={() => setRegistrationWay('scouting')}
                        className="sr-only"
                        disabled={isPending}
                      />
                      <div
                        className={`w-5 h-5 rounded-full border-2 transition-all flex items-center justify-center ${
                          registrationWay === 'scouting'
                            ? 'border-blue-600 bg-white'
                            : 'border-slate-400 group-hover:border-slate-600 bg-white'
                        }`}
                      >
                        {registrationWay === 'scouting' && (
                          <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                        )}
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-slate-800">Scouting</span>
                  </label>

                  {/* Option 2: Recommendation */}
                  <label className="flex items-center gap-3 cursor-pointer select-none group">
                    <div className="relative flex items-center justify-center">
                      <input
                        type="radio"
                        name="registrationWay"
                        value="recommendation"
                        checked={registrationWay === 'recommendation'}
                        onChange={() => setRegistrationWay('recommendation')}
                        className="sr-only"
                        disabled={isPending}
                      />
                      <div
                        className={`w-5 h-5 rounded-full border-2 transition-all flex items-center justify-center ${
                          registrationWay === 'recommendation'
                            ? 'border-blue-600 bg-white'
                            : 'border-slate-400 group-hover:border-slate-600 bg-white'
                        }`}
                      >
                        {registrationWay === 'recommendation' && (
                          <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                        )}
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-slate-800">Recommendation</span>
                  </label>
                </div>

                {clientErrors.registrationWay && (
                  <p className="mt-1 text-xs text-rose-600 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {clientErrors.registrationWay}
                  </p>
                )}
              </div>

              {/* ================================================================= */}
              {/* SUBMIT BUTTON (Right Aligned, Solid Blue)                         */}
              {/* ================================================================= */}
              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  disabled={isPending}
                  className={`bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-xl px-12 py-3.5 shadow-md shadow-blue-500/25 transition-all duration-150 flex items-center gap-2 text-base select-none ${
                    isPending ? 'opacity-70 cursor-not-allowed' : 'hover:scale-[1.01]'
                  }`}
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Mengirim...</span>
                    </>
                  ) : (
                    <span>Submit</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function RegistrationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      }
    >
      <RegistrationFormContent />
    </Suspense>
  );
}
