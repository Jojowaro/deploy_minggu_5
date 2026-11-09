'use client';

import React, { useState, useEffect } from 'react';
import { X, Calendar, Video, MapPin, Clock, User, Building, AlertCircle } from 'lucide-react';
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
  const [hour, setHour] = useState('10');
  const [minute, setMinute] = useState('00');
  const [meetLink, setMeetLink] = useState('https://meet.google.com/andima-interview');
  
  // Onsite fields (Section 3B)
  const [locationAddress, setLocationAddress] = useState('Pool Andima Cakung, Jl. Raya Bekasi KM 24, Jakarta Timur');
  const [roomName, setRoomName] = useState('Ruang Rapat Operasional B Lantai 2');
  const [contactPerson, setContactPerson] = useState('Bpk. Hendra (Koordinator Pool - 0812-3456-7890)');
  const [notes, setNotes] = useState('Membawa KTP asli, SIM yang relevan, dan berkas lamaran cetak.');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setScheduleType(initialData.scheduleType || 'online');
      setDate(initialData.date || '');
      setHour(initialData.hour || '10');
      setMinute(initialData.minute || '00');
      if (initialData.meetLink) setMeetLink(initialData.meetLink);
      if (initialData.locationAddress) setLocationAddress(initialData.locationAddress);
      if (initialData.roomName) setRoomName(initialData.roomName);
      if (initialData.contactPerson) setContactPerson(initialData.contactPerson);
      if (initialData.notes) setNotes(initialData.notes);
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
      setScheduleType('online');
      setMeetLink('https://meet.google.com/andima-interview');
      setLocationAddress('Pool Andima Cakung, Jl. Raya Bekasi KM 24, Jakarta Timur');
      setRoomName('Ruang Rapat Operasional B Lantai 2');
      setContactPerson('Bpk. Hendra (Koordinator Pool - 0812-3456-7890)');
      setNotes('Membawa KTP asli, SIM yang relevan, dan berkas lamaran fisik.');
    }
    setErrorMsg(null);
  }, [initialData, isOpen]);

  if (!isOpen || !candidate) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) {
      setErrorMsg('Silakan tentukan tanggal wawancara.');
      return;
    }

    if (scheduleType === 'online' && !meetLink.trim()) {
      setErrorMsg('Silakan masukkan tautan meet link (Google Meet / Zoom).');
      return;
    }

    if (scheduleType === 'onsite' && !locationAddress.trim()) {
      setErrorMsg('Silakan masukkan alamat fisik lokasi wawancara onsite.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({
        date,
        hour: hour.padStart(2, '0'),
        minute: minute.padStart(2, '0'),
        scheduleType,
        meetLink: scheduleType === 'online' ? meetLink.trim() : undefined,
        locationAddress: scheduleType === 'onsite' ? locationAddress.trim() : undefined,
        roomName: scheduleType === 'onsite' ? roomName.trim() : undefined,
        contactPerson: scheduleType === 'onsite' ? contactPerson.trim() : undefined,
        notes: notes.trim(),
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
        {/* Top Header Banner matching the user image (royal blue gradient) */}
        <div className="h-16 w-full bg-gradient-to-r from-blue-600 via-blue-700 to-[#102a54] relative shrink-0">
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
        <div className="p-6 sm:p-8 overflow-y-auto">
          {/* Main Title matching user screenshot */}
          <h2 className="text-2xl sm:text-[26px] font-black text-center text-slate-900 tracking-tight uppercase">
            TRANSFER EMAIL SETTING
          </h2>

          <p className="text-center text-xs text-slate-500 mt-1 mb-2">
            {isEditMode ? 'Perbarui jadwal interview untuk' : 'Atur jadwal interview dan pengiriman notifikasi kepada'}{' '}
            <strong className="text-slate-800 font-semibold">{candidate.full_name}</strong> ({candidate.job_title || 'Pelamar'})
          </p>

          {candidate.email && (
            <div className="flex items-center justify-center gap-1.5 text-xs text-blue-600 font-semibold mb-5">
              <span>✉ Email Tujuan:</span>
              <span className="bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100 font-mono">{candidate.email}</span>
            </div>
          )}

          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium text-center flex items-center justify-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Metode Interview Switch (Online vs Onsite per Section 3B) */}
            <div className="bg-slate-50 p-2 rounded-2xl border border-slate-200 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setScheduleType('online')}
                className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  scheduleType === 'online'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                }`}
              >
                <Video className="w-4 h-4" />
                <span>Online (Video Call / Google Meet)</span>
              </button>
              <button
                type="button"
                onClick={() => setScheduleType('onsite')}
                className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  scheduleType === 'onsite'
                    ? 'bg-[#0F2342] text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                }`}
              >
                <MapPin className="w-4 h-4" />
                <span>Onsite (Tatap Muka / Pool Armada)</span>
              </button>
            </div>

            {/* Table Card Container matching Image layout */}
            <div className="bg-[#f0f4f8] rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs">
              {/* Header Row: Condition | Control */}
              <div className="grid grid-cols-2 px-6 py-3.5 border-b border-slate-200 font-bold text-slate-800 text-sm">
                <div>Parameter</div>
                <div className="text-right pr-2">Pengaturan Jadwal</div>
              </div>

              {/* Row 1: Date */}
              <div className="grid grid-cols-2 items-center px-6 py-3.5 border-b border-slate-200">
                <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  <span>Tanggal Wawancara</span>
                </div>
                <div className="flex justify-end">
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full max-w-[240px] px-3 py-2 rounded-xl border border-slate-300 text-slate-800 bg-[#f8fafc] text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                    required
                  />
                </div>
              </div>

              {/* Row 2: Time */}
              <div className="grid grid-cols-2 items-center px-6 py-3.5 border-b border-slate-200">
                <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  <span>Waktu (WIB)</span>
                </div>
                <div className="flex justify-end items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="23"
                    value={hour}
                    onChange={(e) => setHour(e.target.value.padStart(2, '0').slice(-2))}
                    className="w-14 px-2 py-1.5 rounded-xl border border-slate-400 text-center font-bold text-slate-800 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 shadow-2xs"
                  />
                  <span className="font-bold text-slate-400">:</span>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={minute}
                    onChange={(e) => setMinute(e.target.value.padStart(2, '0').slice(-2))}
                    className="w-14 px-2 py-1.5 rounded-xl border border-slate-400 text-center font-bold text-slate-800 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 shadow-2xs"
                  />
                  <span className="text-xs font-semibold text-slate-500 ml-1">WIB</span>
                </div>
              </div>

              {/* Dynamic Rows based on scheduleType */}
              {scheduleType === 'online' ? (
                /* Online: Meet Link */
                <div className="grid grid-cols-2 items-center px-6 py-3.5">
                  <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Video className="w-3.5 h-3.5 text-blue-600" />
                    <span>Tautan Video Call (Link)</span>
                  </div>
                  <div className="flex justify-end">
                    <input
                      type="url"
                      value={meetLink}
                      onChange={(e) => setMeetLink(e.target.value)}
                      placeholder="https://meet.google.com/..."
                      className="w-full max-w-[240px] px-3 py-2 rounded-xl border border-slate-300 text-slate-800 bg-[#f8fafc] text-xs font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                      required
                    />
                  </div>
                </div>
              ) : (
                /* Onsite: Location, Room, and Contact Person */
                <>
                  <div className="grid grid-cols-2 items-center px-6 py-3.5 border-b border-slate-200">
                    <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Alamat Pool / Kantor</span>
                    </div>
                    <div className="flex justify-end">
                      <input
                        type="text"
                        value={locationAddress}
                        onChange={(e) => setLocationAddress(e.target.value)}
                        placeholder="Contoh: Pool Cakung, Jl. Raya Bekasi"
                        className="w-full max-w-[240px] px-3 py-2 rounded-xl border border-slate-300 text-slate-800 bg-[#f8fafc] text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 items-center px-6 py-3.5 border-b border-slate-200">
                    <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Ruangan Wawancara</span>
                    </div>
                    <div className="flex justify-end">
                      <input
                        type="text"
                        value={roomName}
                        onChange={(e) => setRoomName(e.target.value)}
                        placeholder="Contoh: Ruang Rapat B Lantai 2"
                        className="w-full max-w-[240px] px-3 py-2 rounded-xl border border-slate-300 text-slate-800 bg-[#f8fafc] text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 items-center px-6 py-3.5">
                    <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-emerald-600" />
                      <span>PIC Lapangan yang Ditemui</span>
                    </div>
                    <div className="flex justify-end">
                      <input
                        type="text"
                        value={contactPerson}
                        onChange={(e) => setContactPerson(e.target.value)}
                        placeholder="Nama & No HP PIC"
                        className="w-full max-w-[240px] px-3 py-2 rounded-xl border border-slate-300 text-slate-800 bg-[#f8fafc] text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-[#0F2342] hover:bg-blue-900 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <span>{isEditMode ? 'Simpan Perubahan Jadwal' : 'Jadwalkan & Kirim Email'}</span>
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
