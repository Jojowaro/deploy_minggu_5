'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronDown, AlertCircle, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { CandidateWithJob } from '@/app/squad-d2/src/types/candidate';
import { useLanguage } from '@/lib/i18n/LanguageContext';

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

const MONTH_NAMES_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const MONTH_NAMES_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const DAY_NAMES_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_NAMES_ID = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

const formatDateDisplay = (dateStr: string, isIndonesian: boolean) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const d = parseInt(parts[2], 10);
  const monthList = isIndonesian ? MONTH_NAMES_ID : MONTH_NAMES_EN;
  const monthName = monthList[m - 1] || '';
  return `${d} ${monthName} ${y}`;
};

const isValidMeetingUrl = (url: string): boolean => {
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (/\s/.test(trimmed)) return false;
  const urlPattern = /^(https?:\/\/)?([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}(:\d+)?(\/.*)?$/i;
  if (!urlPattern.test(trimmed)) return false;
  try {
    const fullUrl = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const parsed = new URL(fullUrl);
    return Boolean(parsed.hostname && parsed.hostname.includes('.') && parsed.hostname.length >= 4);
  } catch {
    return false;
  }
};

export const TransferEmailModal: React.FC<TransferEmailModalProps> = ({
  isOpen,
  candidate,
  initialData,
  isEditMode = false,
  onClose,
  onSave,
}) => {
  const { language, t } = useLanguage();
  const [scheduleType, setScheduleType] = useState<'online' | 'onsite'>('online');
  const [date, setDate] = useState('');
  const [hour, setHour] = useState(initialData?.hour || '');
  const [minute, setMinute] = useState(initialData?.minute || '');
  const [meetLink, setMeetLink] = useState('');
  const [locationAddress, setLocationAddress] = useState('');
  const [locationDropdownOpen, setLocationDropdownOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const dropdownRef = useRef<HTMLDivElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const todayDateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const [viewYear, setViewYear] = useState(currentYear);
  const [viewMonth, setViewMonth] = useState(currentMonth);

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

  // Close calendar on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setCalendarOpen(false);
      }
    }
    if (calendarOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [calendarOpen]);

  useEffect(() => {
    const today = new Date();
    if (initialData) {
      setScheduleType(initialData.scheduleType || 'online');
      setDate(initialData.date || '');
      setHour(initialData.hour || '');
      setMinute(initialData.minute || '');
      setMeetLink(initialData.meetLink || '');
      setLocationAddress(initialData.locationAddress || '');
      if (initialData.date) {
        const parts = initialData.date.split('-');
        if (parts.length === 3) {
          setViewYear(parseInt(parts[0], 10));
          setViewMonth(parseInt(parts[1], 10) - 1);
        } else {
          setViewYear(today.getFullYear());
          setViewMonth(today.getMonth());
        }
      } else {
        setViewYear(today.getFullYear());
        setViewMonth(today.getMonth());
      }
    } else {
      setDate('');
      setHour('');
      setMinute('');
      setScheduleType('online');
      setMeetLink('');
      setLocationAddress('');
      setViewYear(today.getFullYear());
      setViewMonth(today.getMonth());
    }
    setErrors({});
    setLocationDropdownOpen(false);
    setCalendarOpen(false);
  }, [initialData, isOpen]);

  const isPrevDisabled =
    viewYear < currentYear || (viewYear === currentYear && viewMonth <= currentMonth);

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isPrevDisabled) return;
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((prev) => prev - 1);
    } else {
      setViewMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((prev) => prev + 1);
    } else {
      setViewMonth((prev) => prev + 1);
    }
  };

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();

  if (!isOpen || !candidate) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    if (!date) {
      newErrors.date = t('kanban.interviewModal.errorDate', 'Date must be filled');
    } else if (date < todayStr) {
      newErrors.date = t('kanban.interviewModal.errorPastDate', 'Tidak bisa memilih hari yang sudah lewat');
    }

    if (!hour.trim() || !minute.trim()) {
      newErrors.time = t('kanban.interviewModal.errorTime', 'Must be filled');
    } else {
      const h = parseInt(hour, 10);
      const m = parseInt(minute, 10);
      if (isNaN(h) || h < 0 || h > 23 || isNaN(m) || m < 0 || m > 59) {
        newErrors.time = t('kanban.interviewModal.errorInvalidTime', 'Format waktu tidak valid (00-23 : 00-59)');
      }
    }

    if (scheduleType === 'online') {
      if (!meetLink.trim()) {
        newErrors.meetLink = t('kanban.interviewModal.errorMeetLink', 'Meeting link must be filled');
      } else if (!isValidMeetingUrl(meetLink)) {
        newErrors.meetLink = t(
          'kanban.interviewModal.errorInvalidMeetUrl',
          'Format tautan rapat tidak valid (contoh: https://meet.google.com/abc-xyz)'
        );
      }
    }

    if (
      scheduleType === 'onsite' &&
      (!locationAddress.trim() || locationAddress === 'Select Location')
    ) {
      newErrors.locationAddress = t('kanban.interviewModal.errorLocation', 'Location must be selected');
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const trimmedMeetLink = meetLink.trim();
      const formattedMeetLink = /^https?:\/\//i.test(trimmedMeetLink)
        ? trimmedMeetLink
        : `https://${trimmedMeetLink}`;

      await onSave({
        date,
        hour: hour.trim().padStart(2, '0'),
        minute: minute.trim().padStart(2, '0'),
        scheduleType,
        meetLink: scheduleType === 'online' ? formattedMeetLink : undefined,
        locationAddress: scheduleType === 'onsite' ? locationAddress.trim() : undefined,
      });
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan jadwal interview';
      setErrors({ general: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-[calc(100vw-32px)] sm:max-w-xl md:max-w-2xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden transform animate-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col"
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
        <div className="p-4 sm:p-8 overflow-y-auto">
          {/* Main Title matching user screenshot */}
          <h2 className="text-xl sm:text-[26px] font-black text-center text-slate-900 tracking-tight uppercase">
            {t('kanban.interviewModal.title', 'INTERVIEW SETTING')}
          </h2>

          <p className="text-center text-xs text-slate-500 mt-1 mb-5">
            {isEditMode ? t('kanban.interviewModal.subtitleUpdate', 'Perbarui jadwal interview untuk') : t('kanban.interviewModal.subtitleSet', 'Atur jadwal interview untuk')}{' '}
            <strong className="text-slate-800 font-semibold">{candidate.full_name}</strong> ({candidate.job_title || 'Pelamar'})
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Tab Pill Switcher (Online vs Onsite per UI screenshot) */}
            <div className="flex justify-center mb-5 sm:mb-6">
              <div className="inline-flex p-1 rounded-full bg-slate-100 border border-slate-200 shadow-inner">
                <button
                  type="button"
                  onClick={() => {
                    setScheduleType('online');
                    setErrors((prev) => {
                      const next = { ...prev };
                      delete next.meetLink;
                      delete next.locationAddress;
                      return next;
                    });
                  }}
                  className={`px-4 sm:px-6 py-2 rounded-l-full text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                    scheduleType === 'online'
                      ? 'bg-[#1E3765] text-white shadow-sm'
                      : 'text-slate-700 hover:text-slate-900 bg-transparent'
                  }`}
                >
                  {t('kanban.interviewModal.online', 'Online (Video Call)')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setScheduleType('onsite');
                    setErrors((prev) => {
                      const next = { ...prev };
                      delete next.meetLink;
                      delete next.locationAddress;
                      return next;
                    });
                  }}
                  className={`px-4 sm:px-6 py-2 rounded-r-full text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                    scheduleType === 'onsite'
                      ? 'bg-[#1E3765] text-white shadow-sm'
                      : 'text-slate-700 hover:text-slate-900 bg-transparent'
                  }`}
                >
                  {t('kanban.interviewModal.onsite', 'Onsite (Pool Armada)')}
                </button>
              </div>
            </div>

            {/* Condition & Control Table Container matching Image layout */}
            <div className="bg-[#f0f4f8] rounded-2xl border border-slate-200/90 overflow-visible shadow-xs p-4 sm:p-6 mb-5 sm:mb-6">
              {/* Row 1: Date */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between py-3.5 sm:py-4 border-b border-slate-200 gap-2">
                <span className="text-sm font-medium text-slate-700 pt-0 sm:pt-2">{t('kanban.interviewModal.date', 'Date')}</span>
                <div className="flex flex-col items-start sm:items-end w-full sm:w-auto">
                  <div className="relative w-full sm:w-auto" ref={calendarRef}>
                    <button
                      type="button"
                      onClick={() => setCalendarOpen((prev) => !prev)}
                      className={`w-full sm:w-[240px] px-3.5 py-2 rounded-xl border bg-white text-slate-700 text-xs font-semibold flex items-center justify-between shadow-xs transition-colors cursor-pointer ${
                        errors.date
                          ? 'border-rose-500 shadow-[0_0_0_1px_rgba(244,63,94,0.3)]'
                          : 'border-slate-300 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
                      }`}
                    >
                      <span className={date ? 'text-slate-800 font-semibold' : 'text-slate-400 font-normal'}>
                        {date ? formatDateDisplay(date, language === 'id') : t('kanban.interviewModal.selectDate', 'Select Date')}
                      </span>
                      <Calendar className="w-4 h-4 text-slate-500 shrink-0" />
                    </button>

                    {/* Calendar Popover matching reference design */}
                    {calendarOpen && (
                      <div className="absolute right-0 top-full mt-2 w-[280px] sm:w-[310px] max-w-[calc(100vw-48px)] bg-white rounded-2xl border-2 border-[#93c5fd] shadow-2xl p-4 sm:p-5 z-50 animate-in fade-in zoom-in-95 duration-100 select-none">
                        {/* Header: Month Year + Navigation Controls */}
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                            {(language === 'id' ? MONTH_NAMES_ID : MONTH_NAMES_EN)[viewMonth]} {viewYear}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={handlePrevMonth}
                              disabled={isPrevDisabled}
                              className={`p-1 rounded-lg transition-colors ${
                                isPrevDisabled
                                  ? 'text-blue-200 cursor-not-allowed'
                                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer'
                              }`}
                              aria-label="Previous Month"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={handleNextMonth}
                              className="p-1 rounded-lg text-slate-800 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                              aria-label="Next Month"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Day Name Headers (Sun and Sat are coral/red) */}
                        <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold mb-3">
                          {(language === 'id' ? DAY_NAMES_ID : DAY_NAMES_EN).map((day, idx) => (
                            <div
                              key={day}
                              className={idx === 0 || idx === 6 ? 'text-[#f87171]' : 'text-slate-800'}
                            >
                              {day}
                            </div>
                          ))}
                        </div>

                        {/* Days Grid */}
                        <div className="grid grid-cols-7 gap-y-2 gap-x-1 text-center text-xs sm:text-sm">
                          {/* Empty leading slots */}
                          {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
                            <div key={`blank-${idx}`} className="h-8 w-8" />
                          ))}

                          {/* Month Days */}
                          {Array.from({ length: daysInMonth }).map((_, idx) => {
                            const dayNum = idx + 1;
                            const dayStr = String(dayNum).padStart(2, '0');
                            const monthStr = String(viewMonth + 1).padStart(2, '0');
                            const fullDateStr = `${viewYear}-${monthStr}-${dayStr}`;
                            const isPast = fullDateStr < todayDateStr;
                            const isSelected = date === fullDateStr;
                            const dayOfWeek = (firstDayOfWeek + idx) % 7;
                            const isSunday = dayOfWeek === 0;

                            return (
                              <button
                                key={fullDateStr}
                                type="button"
                                disabled={isPast}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (isPast) return;
                                  setDate(fullDateStr);
                                  setCalendarOpen(false);
                                  setErrors((prev) => {
                                    const next = { ...prev };
                                    delete next.date;
                                    return next;
                                  });
                                }}
                                className={`h-8 w-8 sm:h-9 sm:w-9 mx-auto flex items-center justify-center rounded-xl text-xs sm:text-sm transition-all select-none ${
                                  isSelected
                                    ? 'bg-[#2563eb] text-white font-semibold shadow-xs cursor-pointer'
                                    : isPast
                                    ? 'text-slate-300 cursor-not-allowed opacity-40'
                                    : isSunday
                                    ? 'text-[#f87171] hover:bg-rose-50 hover:text-rose-600 cursor-pointer font-medium'
                                    : 'text-slate-800 hover:bg-blue-50 hover:text-blue-600 cursor-pointer font-medium'
                                }`}
                              >
                                {dayNum}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                  {errors.date && (
                    <p className="mt-1.5 text-xs text-rose-600 font-semibold flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                      <span>{errors.date}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Row 2: Time (two separate rounded input boxes: [ 00 ] [ 00 ]) */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between py-3.5 sm:py-4 border-b border-slate-200 gap-2">
                <span className="text-sm font-medium text-slate-700 pt-0 sm:pt-2">{t('kanban.interviewModal.time', 'Time')}</span>
                <div className="flex flex-col items-start sm:items-end w-full sm:w-auto">
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      maxLength={2}
                      value={hour}
                      onChange={(e) => {
                        setHour(e.target.value.replace(/\D/g, '').slice(0, 2));
                        setErrors((prev) => {
                          const next = { ...prev };
                          delete next.time;
                          return next;
                        });
                      }}
                      placeholder="00"
                      className={`w-16 h-10 px-2 rounded-2xl border text-center font-normal text-slate-700 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-xs ${
                        errors.time ? 'border-rose-500 shadow-[0_0_0_1px_rgba(244,63,94,0.3)]' : 'border-slate-400'
                      }`}
                    />
                    <input
                      type="text"
                      maxLength={2}
                      value={minute}
                      onChange={(e) => {
                        setMinute(e.target.value.replace(/\D/g, '').slice(0, 2));
                        setErrors((prev) => {
                          const next = { ...prev };
                          delete next.time;
                          return next;
                        });
                      }}
                      placeholder="00"
                      className={`w-16 h-10 px-2 rounded-2xl border text-center font-normal text-slate-700 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-xs ${
                        errors.time ? 'border-rose-500 shadow-[0_0_0_1px_rgba(244,63,94,0.3)]' : 'border-slate-400'
                      }`}
                    />
                  </div>
                  {errors.time && (
                    <p className="mt-1.5 text-xs text-rose-600 font-semibold flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                      <span>{errors.time}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Row 3: Location (Onsite) OR Link (Online) */}
              {scheduleType === 'onsite' ? (
                /* Onsite: Location Dropdown with Andima branch offices */
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between py-3.5 sm:py-4 gap-2 relative">
                  <span className="text-sm font-medium text-slate-700 pt-0 sm:pt-2">{t('kanban.interviewModal.location', 'Location')}</span>
                  <div className="flex flex-col items-start sm:items-end w-full sm:w-auto">
                    <div className="relative w-full sm:w-auto" ref={dropdownRef}>
                      <button
                        type="button"
                        onClick={() => setLocationDropdownOpen((prev) => !prev)}
                        className={`w-full sm:w-[240px] px-4 py-2 rounded-xl border bg-white text-slate-700 text-xs font-medium flex items-center justify-between shadow-xs transition-colors cursor-pointer ${
                          errors.locationAddress
                            ? 'border-rose-500 shadow-[0_0_0_1px_rgba(244,63,94,0.3)]'
                            : 'border-slate-400 hover:border-slate-500'
                        }`}
                      >
                        <span className={locationAddress ? 'text-slate-800 font-semibold' : 'text-slate-400 font-normal'}>
                          {locationAddress || t('kanban.interviewModal.selectLocation', 'Select Location')}
                        </span>
                        <ChevronDown
                          className={`w-4 h-4 text-slate-500 transition-transform ${
                            locationDropdownOpen ? 'rotate-180' : ''
                          }`}
                        />
                      </button>

                      {locationDropdownOpen && (
                        <div className="absolute right-0 top-full mt-1.5 w-full sm:w-[240px] bg-white rounded-2xl shadow-xl border border-slate-200 py-1 z-50 animate-in fade-in zoom-in-95 duration-100 overflow-hidden">
                          <button
                            type="button"
                            onClick={() => {
                              setLocationAddress('');
                              setLocationDropdownOpen(false);
                              setErrors((prev) => ({ ...prev, locationAddress: 'Belum mengisi' }));
                            }}
                            className="w-full px-4 py-2.5 text-left text-xs font-semibold text-slate-400 hover:bg-slate-50 cursor-pointer"
                          >
                            {t('kanban.interviewModal.selectLocation', 'Select Location')}
                          </button>
                          {ANDIMA_BRANCHES.map((branch) => (
                            <button
                              key={branch}
                              type="button"
                              onClick={() => {
                                setLocationAddress(branch);
                                locationDropdownOpen && setLocationDropdownOpen(false);
                                setErrors((prev) => {
                                  const next = { ...prev };
                                  delete next.locationAddress;
                                  return next;
                                });
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
                    {errors.locationAddress && (
                      <p className="mt-1.5 text-xs text-rose-600 font-semibold flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                        <span>{errors.locationAddress}</span>
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                /* Online: Input Link with placeholder "input link" and empty default value */
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between py-3.5 sm:py-4 gap-2">
                  <span className="text-sm font-medium text-slate-700 pt-0 sm:pt-2">{t('kanban.interviewModal.meetLink', 'Meeting Link')}</span>
                  <div className="flex flex-col items-start sm:items-end w-full sm:w-auto">
                    <div className="w-full sm:w-auto">
                      <input
                        type="text"
                        value={meetLink}
                        onChange={(e) => {
                          setMeetLink(e.target.value);
                          setErrors((prev) => {
                            if (!prev.meetLink) return prev;
                            const next = { ...prev };
                            delete next.meetLink;
                            return next;
                          });
                        }}
                        placeholder={t('kanban.interviewModal.inputMeetingLink', 'Input meeting link')}
                        className={`w-full sm:w-[240px] px-3.5 py-2 rounded-xl border text-slate-800 bg-[#f8fafc] text-xs font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors placeholder:text-slate-400 placeholder:font-sans ${
                          errors.meetLink ? 'border-rose-500 shadow-[0_0_0_1px_rgba(244,63,94,0.3)]' : 'border-slate-300'
                        }`}
                      />
                    </div>
                    {errors.meetLink && (
                      <p className="mt-1.5 text-xs text-rose-600 font-semibold flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                        <span>{errors.meetLink}</span>
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* General submit error if any */}
            {errors.general && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium text-center flex items-center justify-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{errors.general}</span>
              </div>
            )}

            {/* Bottom Actions: Cancel & Send buttons matching screenshot */}
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="w-full sm:w-auto px-5 py-2 text-sm font-medium border rounded-xl text-slate-700 hover:text-slate-900 transition-colors cursor-pointer text-center"
              >
                {t('kanban.interviewModal.cancel', 'Cancel')}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto px-6 py-2 rounded-xl bg-[#1d64f2] hover:bg-blue-700 text-white text-sm font-semibold shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>{language === 'id' ? 'Mengirim...' : 'Sending...'}</span>
                  </>
                ) : (
                  <span>{t('kanban.interviewModal.send', 'Send')}</span>
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
