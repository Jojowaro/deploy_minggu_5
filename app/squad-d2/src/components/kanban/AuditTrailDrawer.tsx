'use client';

import React, { useState } from 'react';
import { X, History, Search, ShieldCheck, ArrowRight, User } from 'lucide-react';
import { AuditLog } from '../../types/candidate';
import { getColumnConfig } from '../../types/kanban';

export interface AuditTrailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  auditLogs: AuditLog[];
  isLoading?: boolean;
}

export const AuditTrailDrawer: React.FC<AuditTrailDrawerProps> = ({
  isOpen,
  onClose,
  auditLogs,
  isLoading = false,
}) => {
  const [filterText, setFilterText] = useState('');

  if (!isOpen) return null;

  const filteredLogs = auditLogs.filter((log) => {
    if (!filterText) return true;
    const q = filterText.toLowerCase();
    const candidateName = log.d2_candidates?.full_name?.toLowerCase() || '';
    const actor = log.actor_name?.toLowerCase() || '';
    const reason = log.change_reason?.toLowerCase() || '';
    const oldS = log.old_status?.toLowerCase() || '';
    const newS = log.new_status?.toLowerCase() || '';
    return (
      candidateName.includes(q) ||
      actor.includes(q) ||
      reason.includes(q) ||
      oldS.includes(q) ||
      newS.includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 overflow-hidden select-none">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
          {/* Drawer Header */}
          <div className="px-6 py-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-100 text-blue-700">
                <History className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Immutable Audit Trail
                </h3>
                <p className="text-xs text-slate-500">
                  TR-09 Immutable Log &bull; {auditLogs.length} events recorded
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search / Filter Input */}
          <div className="p-4 border-b border-slate-100 bg-white">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                placeholder="Filter logs by candidate, actor, or reason..."
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white transition-colors"
              />
            </div>
          </div>

          {/* Logs List Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="p-4 rounded-xl border border-slate-100 bg-slate-50/60 animate-pulse space-y-2"
                  >
                    <div className="h-4 bg-slate-200 rounded w-1/3" />
                    <div className="h-3 bg-slate-200 rounded w-2/3" />
                  </div>
                ))}
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                <ShieldCheck className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="font-semibold text-slate-600">No audit log records found</p>
                <p className="mt-1">
                  Status changes made via Drag-and-Drop are recorded immutably to <code className="text-blue-600">d2_audit_logs</code>.
                </p>
              </div>
            ) : (
              filteredLogs.map((log) => {
                const oldCfg = getColumnConfig(log.old_status);
                const newCfg = getColumnConfig(log.new_status);
                const formattedDate = new Date(log.created_at).toLocaleString('id-ID', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                });

                return (
                  <div
                    key={log.id}
                    className="p-3.5 rounded-xl border border-slate-200/90 bg-white hover:border-blue-200 transition-colors shadow-2xs"
                  >
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
                      <div className="flex items-center gap-1.5 font-medium text-slate-700">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>{log.actor_name || 'Budi Santoso'}</span>
                      </div>
                      <time>{formattedDate}</time>
                    </div>

                    <div className="text-xs font-bold text-slate-900 mb-2">
                      {log.d2_candidates?.full_name || 'Candidate'}
                    </div>

                    {/* Stage Transition Pills */}
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold text-white ${oldCfg.badgeBg}`}
                      >
                        {oldCfg.badgeLabel}
                      </span>
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold text-white ${newCfg.badgeBg}`}
                      >
                        {newCfg.badgeLabel}
                      </span>
                    </div>

                    {log.change_reason && (
                      <p className="text-[11px] text-slate-600 bg-slate-50 rounded-lg p-2 border border-slate-100 italic">
                        &ldquo;{log.change_reason}&rdquo;
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Drawer Footer */}
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
            <span>Table: <code className="text-blue-600 font-mono">d2_audit_logs</code></span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditTrailDrawer;
