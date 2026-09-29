'use client';

import React from 'react';
import { Bell, Menu } from 'lucide-react';

export interface HeaderProps {
  onMenuClick?: () => void;
  brandTitle?: string;
  badgeTitle?: string;
  userName?: string;
  userRole?: string;
  userInitials?: string;
  notificationCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  onMenuClick,
  brandTitle = 'ANDIMA HRMS',
  badgeTitle = 'HRMS',
  userName = 'Joko Rusdi',
  userRole = 'Guest',
  userInitials = 'A',
  notificationCount = 3,
}) => {
  return (
    <header className="h-16 border-b border-slate-200/90 bg-white sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 md:px-8 shadow-xs">
      {/* Sisi Kiri: Tombol drawer mobile (jika ada) + Judul Brand & Sub-kategori */}
      <div className="flex items-center gap-3">
        {onMenuClick && (
          <button
            type="button"
            onClick={onMenuClick}
            className="p-1.5 -ml-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors lg:hidden"
            aria-label="Buka navigasi"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div className="flex items-center gap-2.5">
          <span className="text-xs sm:text-sm font-bold tracking-tight text-slate-900">
            {brandTitle}
          </span>
          <span className="text-[10px] sm:text-[11px] font-medium text-slate-400 pl-2.5 border-l border-slate-300">
            {badgeTitle}
          </span>
        </div>
      </div>

      {/* Sisi Kanan: Notifikasi (Bell 3) + Garis Pemisah + Profil Pengguna (Avatar A, Joko Rusdi, Guest) */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Notifikasi Bell dengan badge merah */}
        <div className="relative p-1 text-slate-500 hover:text-slate-700 cursor-pointer transition-colors" title="Notifications">
          <Bell className="w-5 h-5" />
          {notificationCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#e63946] text-[9px] font-bold text-white shadow-xs">
              {notificationCount}
            </span>
          )}
        </div>

        {/* Divider Vertikal */}
        <div className="h-6 w-px bg-slate-200" />

        {/* Kartu Profil Pengguna */}
        <div className="flex items-center gap-2.5 select-none">
          <div className="w-8 h-8 rounded-full bg-[#a7f3d0] text-[#065f46] flex items-center justify-center text-xs font-bold shrink-0 shadow-xs">
            {userInitials}
          </div>
          <div className="flex flex-col text-left">
            <span className="text-xs font-bold text-slate-900 leading-tight">
              {userName}
            </span>
            <span className="text-[10px] font-normal text-slate-500 leading-tight mt-0.5">
              {userRole}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
