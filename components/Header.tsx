'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bell, Menu, LogOut, User as UserIcon, ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { getAuthenticatedUserProfile, UserProfile } from '@/utils/auth';

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
  userName: propUserName,
  userRole: propUserRole,
  userInitials: propUserInitials,
  notificationCount = 3,
}) => {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadUser() {
      const data = await getAuthenticatedUserProfile();
      if (isMounted && data) {
        setProfile(data);
      }
    }

    loadUser();

    // Subscribe to auth state changes
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadUser();
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Handle outside click for profile dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut({ scope: 'local' });
      router.replace('/login');
      router.refresh();
    } catch (err) {
      console.error('Sign out error:', err);
      router.replace('/login');
    }
  };

  // Determine active profile details
  const activeName = propUserName || profile?.name || 'Andima Staff';
  const activeRole = propUserRole || profile?.role || 'HR Specialist';
  const activeInitials =
    propUserInitials ||
    profile?.initials ||
    activeName
      .split(' ')
      .filter(Boolean)
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() ||
    'AS';

  return (
    <header className="h-16 border-b border-slate-200/90 bg-white sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 md:px-8 shadow-xs">
      {/* Sisi Kiri: Tombol drawer mobile (jika ada) + Judul Brand & Sub-kategori */}
      <div className="flex items-center gap-3">
        {onMenuClick && (
          <button
            type="button"
            onClick={onMenuClick}
            className="p-1.5 -ml-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors lg:hidden cursor-pointer"
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

      {/* Sisi Kanan: Notifikasi (Bell 3) + Garis Pemisah + Profil Pengguna Dinamis */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Notifikasi Bell dengan badge merah */}
        <div
          className="relative p-1 text-slate-500 hover:text-slate-700 cursor-pointer transition-colors"
          title="Notifications"
        >
          <Bell className="w-5 h-5" />
          {notificationCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#e63946] text-[9px] font-bold text-white shadow-xs">
              {notificationCount}
            </span>
          )}
        </div>

        {/* Divider Vertikal */}
        <div className="h-6 w-px bg-slate-200" />

        {/* Kartu Profil Pengguna dengan Dropdown */}
        <div ref={dropdownRef} className="relative">
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2.5 select-none p-1 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer text-left"
            title="Klik untuk opsi akun"
          >
            <div className="w-8 h-8 rounded-full bg-[#a7f3d0] text-[#065f46] flex items-center justify-center text-xs font-bold shrink-0 shadow-xs ring-1 ring-emerald-300/60">
              {activeInitials}
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs font-bold text-slate-900 leading-tight">
                {activeName}
              </span>
              <span className="text-[10px] font-medium text-slate-500 leading-tight mt-0.5">
                {activeRole}
              </span>
            </div>
            <ChevronDown
              className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                isDropdownOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* User Account Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200/90 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-4 py-2.5 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-900 truncate">{activeName}</p>
                <p className="text-[11px] text-slate-500 truncate mt-0.5">
                  {profile?.email || 'Logged in user'}
                </p>
                <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {activeRole}
                </span>
              </div>

              <div className="p-1">
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-full px-3 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4 text-rose-500" />
                  <span>Logout (Keluar)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
