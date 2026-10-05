'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical } from 'lucide-react';
import { KanbanColumnConfig } from '@/app/squad-d2/src/types/kanban';
import { CandidateWithJob, CandidateStatus } from '@/app/squad-d2/src/types/candidate';
import { CandidateCard } from './CandidateCard';

export interface KanbanColumnProps {
  column: KanbanColumnConfig;
  candidates: CandidateWithJob[];
  onDropCandidate: (candidateId: string, targetStatus: CandidateStatus) => void;
  onDragStartCandidate: (e: React.DragEvent, candidate: CandidateWithJob) => void;
  onSelectCandidate?: (candidate: CandidateWithJob) => void;
  onQuickMove?: (candidate: CandidateWithJob, targetStatus: CandidateStatus) => void;
  onEditColumn?: (column: KanbanColumnConfig) => void;
  onDeleteColumn?: (column: KanbanColumnConfig) => void;
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  column,
  candidates,
  onDropCandidate,
  onDragStartCandidate,
  onSelectCandidate,
  onQuickMove,
  onEditColumn,
  onDeleteColumn,
}) => {
  const [isOver, setIsOver] = useState(false);
  const [columnMenuOpen, setColumnMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setColumnMenuOpen(false);
      }
    }
    if (columnMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [columnMenuOpen]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!isOver) setIsOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(false);
    const candidateId = e.dataTransfer.getData('text/plain');
    if (candidateId) {
      onDropCandidate(candidateId, column.id as CandidateStatus);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative flex flex-col rounded-2xl md:rounded-3xl border transition-all duration-200 overflow-hidden min-h-[580px] bg-[#f8fafd] ${
        isOver
          ? 'border-2 border-dashed border-blue-400 bg-blue-50/50 shadow-inner'
          : 'border-slate-200/80 hover:border-slate-300'
      }`}
    >
      {/* 1. Header Pill Row matching Figma HRMS D - HR.jpg & Image 1 */}
      <div className="p-3 pb-2">
        <div className="w-full bg-[#e7edf8] rounded-xl py-2 px-3 flex items-center justify-between transition-colors relative">
          <div className="flex-1 text-center pl-5">
            <span className="text-[13px] font-bold tracking-wider text-slate-700 uppercase">
              {column.label}
            </span>
            <span className="ml-1.5 text-xs font-semibold text-slate-400">
              ({candidates.length})
            </span>
          </div>

          {/* Three dots menu button matching Image 1 & Image 2 */}
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setColumnMenuOpen((prev) => !prev);
              }}
              className="p-1 rounded-lg hover:bg-slate-300/50 text-slate-500 hover:text-slate-800 transition-colors"
              title="Column options"
              aria-label="Column options"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {/* Dropdown Menu (Edit / Delete) matching Image 2 */}
            {columnMenuOpen && (
              <div
                ref={menuRef}
                className="absolute right-0 top-full mt-1.5 w-28 bg-white rounded-2xl shadow-xl border border-slate-200/90 py-1.5 z-30 animate-in fade-in zoom-in-95 duration-100 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setColumnMenuOpen(false);
                    onEditColumn?.(column);
                  }}
                  className="w-full px-4 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setColumnMenuOpen(false);
                    onDeleteColumn?.(column);
                  }}
                  className="w-full px-4 py-2 text-left text-xs font-bold text-[#ea384c] hover:bg-red-50 transition-colors"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Scrollable / Stacked Card Dropzone */}
      <div className="flex-1 p-3 pt-1 space-y-3.5 overflow-y-auto max-h-[calc(100vh-280px)] min-h-[460px] flex flex-col">
        {candidates.map((candidate) => (
          <CandidateCard
            key={candidate.id}
            candidate={candidate}
            onDragStart={onDragStartCandidate}
            onSelectCandidate={onSelectCandidate}
            onQuickMove={onQuickMove}
          />
        ))}

        {candidates.length === 0 && (
          <div
            className={`flex-1 flex flex-col items-center justify-center p-6 text-center rounded-xl border border-dashed transition-colors ${
              isOver
                ? 'border-blue-300 bg-blue-50/60 text-blue-600'
                : 'border-slate-200/70 text-slate-400 bg-slate-50/30'
            }`}
          >
            <p className="text-xs font-medium">
              {isOver ? 'Release to drop here' : 'No candidates'}
            </p>
          </div>
        )}
      </div>

      {/* 3. Subtle bottom decorative curved swoosh/wave matching Figma */}
      <div
        className="pointer-events-none h-10 w-full overflow-hidden relative mt-auto opacity-70"
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 200 40"
          preserveAspectRatio="none"
          className="w-full h-full text-blue-200/40"
          fill="currentColor"
        >
          <path d="M0,40 Q100,0 200,40 L200,40 L0,40 Z" opacity="0.6" />
          <path d="M0,40 Q130,10 200,32 L200,40 L0,40 Z" opacity="0.4" fill="#93c5fd" />
        </svg>
      </div>
    </div>
  );
};

export default KanbanColumn;
