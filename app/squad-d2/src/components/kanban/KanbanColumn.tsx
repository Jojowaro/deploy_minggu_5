'use client';

import React, { useState } from 'react';
import { KanbanColumnConfig } from '../../types/kanban';
import { CandidateWithJob, CandidateStatus } from '../../types/candidate';
import { CandidateCard } from './CandidateCard';

export interface KanbanColumnProps {
  column: KanbanColumnConfig;
  candidates: CandidateWithJob[];
  onDropCandidate: (candidateId: string, targetStatus: CandidateStatus) => void;
  onDragStartCandidate: (e: React.DragEvent, candidate: CandidateWithJob) => void;
  onSelectCandidate?: (candidate: CandidateWithJob) => void;
  onQuickMove?: (candidate: CandidateWithJob, targetStatus: CandidateStatus) => void;
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  column,
  candidates,
  onDropCandidate,
  onDragStartCandidate,
  onSelectCandidate,
  onQuickMove,
}) => {
  const [isOver, setIsOver] = useState(false);

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
      {/* 1. Header Pill Row matching Figma HRMS D - HR.jpg */}
      <div className="p-3 pb-2">
        <div className="w-full bg-[#e7edf8] rounded-xl py-2 px-3 text-center transition-colors">
          <span className="text-[13px] font-bold tracking-wider text-slate-700 uppercase">
            {column.label}
          </span>
          <span className="ml-1.5 text-xs font-semibold text-slate-400">
            ({candidates.length})
          </span>
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
