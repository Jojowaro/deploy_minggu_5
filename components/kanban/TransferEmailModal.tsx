'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronDown, AlertCircle } from 'lucide-react';
import { CandidateWithJob } from '@/app/squad-d2/src/types/candidate';

export interface InterviewScheduleData {
  date: string;
  hour: string;
  minute: string;
  scheduleType: 'online' | 'onsite';
  meetLink?: string;
  locationAddress?: string;
  roomName?: string;
  contactPerson?: string;
  notes?: string;
}

export interface TransferEmailModalProps {
  isOpen: boolean;
  candidate: CandidateWithJob | null;
  initialData?: InterviewScheduleData | null;
  isEditMode?: boolean;
  onClose: () => void;
  onSave: (data: InterviewScheduleData) => Promise<void> | void;
}

const ANDIMA_BRANCHES = ['Jakarta', 'Balikpapan', 'Samarinda', 'Surabaya'];

export const TransferEmailModal: React.FC<TransferEmailModalProps> = ({
  isOpen,
  candidate,
  initialData,
  isEditMode = false,
  onClose,
  onSave,
}) => {
  const [scheduleType, setScheduleType] = useState<'online' | 'onsite'>('online');
  const [date, setDate] = useState('');
  const [hour, setHour] = useState('00');
  const [minute, setMinute] = useState('00');
  const [meetLink, setMeetLink] = useState('');
  const [locationAddress, setLocationAddress] = useState('');
  const [locationDropdownOpen, setLocationDropdownOpen] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setLocationDropdownOpen(false);
      }
    }
    if (locationDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [locationDropdownOpen]);

  useEffect(() => {
    if (initialData) {
      setScheduleType(initialData.scheduleType || 'online');
      setDate(initialData.date || '');
      setHour(initialData.hour || '00');
      setMinute(initialData.minute || '00');
      setMeetLink(initialData.meetLink || '');
      setLocationAddress(initialData.locationAddress || '');
    } else {
      setDate('');
      setHour('00');
      setMinute('00');
      setScheduleType('online');
      setMeetLink('');
      setLocationAddress('');
    }
    setErrorMsg(null);
    setLocationDropdownOpen(false);
  }, [initialData, isOpen]);

  if (!isOpen || !candidate) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) {
      setErrorMsg('Silakan tentukan tanggal wawancara (Select Date).');
      return;
    }

    if (scheduleType === 'online' && !meetLink.trim()) {
      setErrorMsg('Silakan masukkan tautan meet link (input link).');
      return;
    }

    if (scheduleType === 'onsite' && (!locationAddress.trim() || locationAddress === 'Select Location')) {
      setErrorMsg('Silakan pilih lokasi kantor cabang Andima.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({
        date,
        hour: hour ? hour.padStart(2, '0') : '00',
        minute: minute ? minute.padStart(2, '0') : '00',
        scheduleType,
        meetLink: scheduleType === 'online' ? meetLink.trim() : undefined,
        locationAddress: scheduleType === 'onsite' ? locationAddress.trim() : undefined,
      });
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan jadwal interview';
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden transform animate-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Banner matching user design (deep royal blue gradient) */}
        <div className="h-16 w-full bg-gradient-to-r from-blue-600 via-blue-700 to-[#0e274a] relative shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="absolute top-4 right-4 p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/20 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 overflow-y-auto">
          {/* Main Title matching user screenshot */}
          <h2 className="text-2xl sm:text-[26px] font-black text-center text-slate-900 tracking-tight uppercase">
            INTERVIEW SETTING
          </h2>

          <p className="text-center text-xs text-slate-500 mt-1 mb-4">
            {isEditMode ? 'Perbarui jadwal interview untuk' : 'Atur jadwal interview untuk'}{' '}
            <strong className="text-slate-800 font-semibold">{candidate.full_name}</strong> ({candidate.job_title || 'Pelamar'})
          </p>

          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium text-center flex items-center justify-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Tab Pill Switcher (Online vs Onsite per UI screenshot) */}
            <div className="flex justify-center mb-6">
              <div className="inline-flex p-1 rounded-full bg-slate-100 border border-slate-200 shadow-inner">
                <button
                  type="button"
                  onClick={() => setScheduleType('online')}
                  className={`px-6 py-2 rounded-l-full text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                    scheduleType === 'online'
                      ? 'bg-[#1E3765] text-white shadow-sm'
                      : 'text-slate-700 hover:text-slate-900 bg-transparent'
                  }`}
                >
                  Online (Video Call)
                </button>
                <button
                  type="button"
                  onClick={() => setScheduleType('onsite')}
                  className={`px-6 py-2 rounded-r-full text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                    scheduleType === 'onsite'
                      ? 'bg-[#1E3765] text-white shadow-sm'
                      : 'text-slate-700 hover:text-slate-900 bg-transparent'
                  }`}
                >
                  Onsite (Pool Armada)
                </button>
              </div>
            </div>

            {/* Condition & Control Table Container matching Image layout */}
            <div className="bg-[#f0f4f8] rounded-2xl border border-slate-200/90 overflow-visible shadow-xs p-5 sm:p-6 mb-6">
              {/* Header Row: Condition | Control */}
              <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 font-bold text-slate-800 text-base">
                <span>Condition</span>
                <span>Control</span>
              </div>

              {/* Row 1: Date */}
              <div className="flex items-center justify-between py-4 border-b border-slate-200">
                <span className="text-sm font-medium text-slate-700">Date</span>
                <div className="relative">
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    placeholder="Select Date"
                    className="w-[200px] sm:w-[240px] px-3.5 py-2 rounded-xl border border-slate-300 text-slate-700 bg-[#f8fafc] text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              {/* Row 2: Time (two separate rounded input boxes: [ 00 ] [ 00 ]) */}
              <div className="flex items-center justify-between py-4 border-b border-slate-200">
                <span className="text-sm font-medium text-slate-700">Time</span>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    maxLength={2}
                    value={hour}
                    onChange={(e) => setHour(e.target.value.replace(/\D/g, '').slice(0, 2))}
                    placeholder="00"
                    className="w-16 h-10 px-2 rounded-2xl border border-slate-400 text-center font-normal text-slate-700 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-xs"
                  />
                  <input
                    type="text"
                    maxLength={2}
                    value={minute}
                    onChange={(e) => setMinute(e.target.value.replace(/\D/g, '').slice(0, 2))}
                    placeholder="00"
                    className="w-16 h-10 px-2 rounded-2xl border border-slate-400 text-center font-normal text-slate-700 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-xs"
                  />
                </div>
              </div>

              {/* Row 3: Location (Onsite) OR Link (Online) */}
              {scheduleType === 'onsite' ? (
                /* Onsite: Location Dropdown with Andima branch offices */
                <div className="flex items-center justify-between py-4 relative">
                  <span className="text-sm font-medium text-slate-700">Location</span>
                  <div className="relative" ref={dropdownRef}>
                    <button
                      type="button"
                      onClick={() => setLocationDropdownOpen((prev) => !prev)}
                      className="w-[200px] sm:w-[240px] px-4 py-2 rounded-xl border border-slate-400 bg-white text-slate-700 text-xs font-medium flex items-center justify-between shadow-xs hover:border-slate-500 transition-colors cursor-pointer"
                    >
                      <span className={locationAddress ? 'text-slate-800 font-semibold' : 'text-slate-400 font-normal'}>
                        {locationAddress || 'Select Location'}
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 text-slate-500 transition-transform ${
                          locationDropdownOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    {locationDropdownOpen && (
                      <div className="absolute right-0 top-full mt-1.5 w-[200px] sm:w-[240px] bg-white rounded-2xl shadow-xl border border-slate-200 py-1 z-50 animate-in fade-in zoom-in-95 duration-100 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => {
                            setLocationAddress('');
                            setLocationDropdownOpen(false);
                          }}
                          className="w-full px-4 py-2.5 text-left text-xs font-semibold text-slate-400 hover:bg-slate-50 cursor-pointer"
                        >
                          Select Location
                        </button>
                        {ANDIMA_BRANCHES.map((branch) => (
                          <button
                            key={branch}
                            type="button"
                            onClick={() => {
                              setLocationAddress(branch);
                              setLocationDropdownOpen(false);
                            }}
                            className={`w-full px-4 py-2.5 text-left text-xs font-bold transition-colors cursor-pointer ${
                              locationAddress === branch ? 'bg-[#d9dfe8] text-slate-900' : 'text-slate-800 hover:bg-slate-100'
                            }`}
                          >
                            {branch}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Online: Input Link with placeholder "input link" and empty default value */
                <div className="flex items-center justify-between py-4">
                  <span className="text-sm font-medium text-slate-700">Link Meeting</span>
                  <div>
                    <input
                      type="text"
                      value={meetLink}
                      onChange={(e) => setMeetLink(e.target.value)}
                      placeholder="Input link"
                      className="w-[200px] sm:w-[240px] px-3.5 py-2 rounded-xl border border-slate-300 text-slate-800 bg-[#f8fafc] text-xs font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors placeholder:text-slate-400 placeholder:font-sans"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions: Cancel & Send buttons matching screenshot */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-5 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 rounded-xl bg-[#1d64f2] hover:bg-blue-700 text-white text-sm font-semibold shadow-xs hover:shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <span>Send</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TransferEmailModal;
