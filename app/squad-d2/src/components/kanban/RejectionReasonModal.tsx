'use client';

import React, { useState } from 'react';
import { X, AlertTriangle, ShieldAlert } from 'lucide-react';
import { CandidateWithJob } from '../../types/candidate';

export interface RejectionReasonModalProps {
  isOpen: boolean;
  candidate: CandidateWithJob | null;
  onClose: () => void;
  onConfirm: (reason: string, isNotEligible: boolean) => void;
}

export const RejectionReasonModal: React.FC<RejectionReasonModalProps> = ({
  isOpen,
  candidate,
  onClose,
  onConfirm,
}) => {
  const [reason, setReason] = useState('');
  const [isNotEligible, setIsNotEligible] = useState(false);

  if (!isOpen || !candidate) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(reason, isNotEligible);
    setReason('');
    setIsNotEligible(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="relative bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 z-10 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-red-100 text-red-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Reject Candidate
              </h3>
              <p className="text-xs text-slate-500">
                Moving <span className="font-semibold text-slate-800">{candidate.full_name}</span> to Rejected
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Rejection Reason (Audit Trail Record)
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Qualifications do not match core requirements, failed interview phase..."
              className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 resize-none"
            />
          </div>

          {/* Not Eligible / Permanent Flag Checkbox */}
          <div className="p-3 bg-red-50/70 border border-red-100 rounded-xl flex items-start gap-2.5">
            <input
              id="not-eligible-toggle"
              type="checkbox"
              checked={isNotEligible}
              onChange={(e) => setIsNotEligible(e.target.checked)}
              className="mt-0.5 rounded text-red-600 focus:ring-red-500"
            />
            <label htmlFor="not-eligible-toggle" className="text-xs text-red-900 cursor-pointer">
              <span className="font-bold flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
                Mark as Permanently &ldquo;Not Eligible&rdquo;
              </span>
              <span className="text-[11px] text-red-700 block mt-0.5">
                Displays the red <strong>Not Eligible</strong> badge (FR-D2-005) and flags record for future applications.
              </span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors shadow-xs"
            >
              Confirm Rejection
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RejectionReasonModal;
