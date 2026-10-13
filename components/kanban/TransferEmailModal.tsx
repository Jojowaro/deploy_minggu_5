'use client';

import React, { useState, useEffect } from 'react';
import { X, Calendar, Video, Clock } from 'lucide-react';
import { CandidateWithJob } from '@/app/squad-d2/src/types/candidate';

export interface InterviewScheduleData {
  date: string;
  hour: string;
  minute: string;
  meetLink: string;
}

export interface TransferEmailModalProps {
  isOpen: boolean;
  candidate: CandidateWithJob | null;
  initialData?: InterviewScheduleData | null;
  isEditMode?: boolean;
  onClose: () => void;
  onSave: (data: InterviewScheduleData) => Promise<void> | void;
}

export const TransferEmailModal: React.FC<TransferEmailModalProps> = ({
  isOpen,
  candidate,
  initialData,
  isEditMode = false,
  onClose,
  onSave,
}) => {
  const [date, setDate] = useState('');
  const [hour, setHour] = useState('00');
  const [minute, setMinute] = useState('00');
  const [meetLink, setMeetLink] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setDate(initialData.date || '');
      setHour(initialData.hour || '00');
      setMinute(initialData.minute || '00');
      setMeetLink(initialData.meetLink || '');
    } else {
      // Default to tomorrow 10:00
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const yyyy = tomorrow.getFullYear();
      const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
      const dd = String(tomorrow.getDate()).padStart(2, '0');
      setDate(`${yyyy}-${mm}-${dd}`);
      setHour('10');
      setMinute('00');
      setMeetLink('https://meet.google.com/andima-interview');
    }
    setErrorMsg(null);
  }, [initialData, isOpen]);

  if (!isOpen || !candidate) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) {
      setErrorMsg('Silakan pilih tanggal interview.');
      return;
    }
    if (!meetLink.trim()) {
      setErrorMsg('Silakan masukkan tautan meet link.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({
        date,
        hour: hour.padStart(2, '0'),
        minute: minute.padStart(2, '0'),
        meetLink: meetLink.trim(),
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
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden transform animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Banner matching the user image (royal blue gradient) */}
        <div className="h-16 w-full bg-gradient-to-r from-blue-600 via-blue-700 to-[#102a54] relative">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="absolute top-4 right-4 p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-10">
          {/* Main Title matching user screenshot */}
          <h2 className="text-2xl sm:text-[26px] font-black text-center text-slate-900 tracking-tight uppercase">
            TRANSFER EMAIL SETTING
          </h2>

          <p className="text-center text-xs text-slate-500 mt-1 mb-6">
            {isEditMode ? 'Perbarui jadwal interview untuk' : 'Atur jadwal interview dan pengiriman link kepada'}{' '}
            <strong className="text-slate-800 font-semibold">{candidate.full_name}</strong> ({candidate.job_title || 'Pelamar'})
          </p>

          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium text-center">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Table Card Container matching Image exactly */}
            <div className="bg-[#f0f4f8] rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs">
              {/* Header Row: Condition | Control */}
              <div className="grid grid-cols-2 px-6 py-4 border-b border-slate-200 font-bold text-slate-800 text-[15px] sm:text-base">
                <div>Condition</div>
                <div className="text-right pr-2">Control</div>
              </div>

              {/* Row 1: Date */}
              <div className="grid grid-cols-2 items-center px-6 py-4 border-b border-slate-200">
                <div className="text-sm font-semibold text-slate-700">Date</div>
                <div className="flex justify-end">
                  <div className="relative w-full max-w-[240px]">
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      placeholder="Select Date"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-800 bg-[#f8fafc] text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Row 2: Time */}
              <div className="grid grid-cols-2 items-center px-6 py-4 border-b border-slate-200">
                <div className="text-sm font-semibold text-slate-700">Time</div>
                <div className="flex justify-end items-center gap-2.5">
                  <input
                    type="number"
                    min="0"
                    max="23"
                    value={hour}
                    onChange={(e) => setHour(e.target.value.padStart(2, '0').slice(-2))}
                    placeholder="00"
                    className="w-16 px-2 py-2 rounded-2xl border border-slate-400 text-center font-bold text-slate-800 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-colors shadow-2xs"
                  />
                  <span className="font-bold text-slate-400">:</span>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={minute}
                    onChange={(e) => setMinute(e.target.value.padStart(2, '0').slice(-2))}
                    placeholder="00"
                    className="w-16 px-2 py-2 rounded-2xl border border-slate-400 text-center font-bold text-slate-800 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-colors shadow-2xs"
                  />
                </div>
              </div>

              {/* Row 3: Meet Link */}
              <div className="grid grid-cols-2 items-center px-6 py-4">
                <div className="text-sm font-semibold text-slate-700">Meet Link</div>
                <div className="flex justify-end">
                  <input
                    type="url"
                    value={meetLink}
                    onChange={(e) => setMeetLink(e.target.value)}
                    placeholder="Enter Link"
                    className="w-full max-w-[240px] px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-800 bg-[#f8fafc] text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="mt-8 flex items-center justify-end gap-3.5">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-[#0F2342] hover:bg-blue-900 text-white text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <span>{isEditMode ? 'Simpan Perubahan' : 'Confirm & Schedule'}</span>
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
