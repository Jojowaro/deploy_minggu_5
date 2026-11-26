'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bell, Menu, LogOut, User as UserIcon, ChevronDown } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { getAuthenticatedUserProfile, UserProfile } from '@/utils/auth';
import { useLanguage } from '@/lib/i18n/LanguageContext';

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
  const pathname = usePathname();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const { language, setLanguage, t } = useLanguage();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Dynamic path label resolution according to current route
  const getPathLabel = () => {
    if (pathname?.includes('/kanban')) {
      return t('nav.recruitmentPipeline', 'Recruitment Pipeline');
    }
    if (pathname?.includes('/fit-proper')) {
      return t('nav.fitProper', 'Fit & Proper');
    }
    if (
      pathname?.includes('/job') ||
      pathname?.includes('/register') ||
      pathname?.includes('/registration-form')
    ) {
      return t('nav.jobListRegister', 'Job List & Register');
    }
    return badgeTitle || t('nav.recruitmentPipeline', 'Recruitment Pipeline');
  };

  const pathLabel = getPathLabel();

  const handleToggleSidebar = () => {
    if (onMenuClick) {
      onMenuClick();
    } else {
      window.dispatchEvent(new Event('toggle-sidebar'));
    }
  };

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
    <header className="h-16 border-b border-slate-200/90 bg-white sticky top-0 z-30 flex items-center justify-between px-3 sm:px-6 md:px-8 shadow-xs">
      {/* Sisi Kiri: Tombol Hamburger #3B6FF5 + Separator + HRMS / Path */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        <button
          type="button"
          onClick={handleToggleSidebar}
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#3B6FF5] hover:bg-[#2b5fe8] active:scale-95 flex items-center justify-center text-white shadow-xs cursor-pointer transition-all shrink-0"
          aria-label="Toggle Navigasi"
          title="Buka/Tutup Navigasi"
        >
          <Menu className="w-5 h-5 text-white" strokeWidth={2.4} />
        </button>

        {/* Separator Garis Vertikal (Hidden di smartphone agar tidak penuh) */}
        <div className="hidden sm:block h-4.5 w-[1.5px] bg-slate-300 mx-0.5" />

        {/* Breadcrumb Path: HRMS / Path (Hidden di smartphone agar navbar tidak penuh dan pas) */}
        <div className="hidden sm:flex items-center gap-1.5 text-xs sm:text-sm font-semibold select-none min-w-0">
          <span className="text-slate-700 shrink-0">HRMS</span>
          <span className="text-slate-400 font-normal shrink-0">/</span>
          <span className="text-slate-900 font-bold tracking-tight truncate max-w-[110px] sm:max-w-[200px] md:max-w-none">{pathLabel}</span>
        </div>
      </div>

      {/* Sisi Kanan: Toggle Bahasa (EN/ID) + Notifikasi (Bell 3) + Garis Pemisah + Profil Pengguna Dinamis */}
      <div className="flex items-center gap-1.5 sm:gap-3 md:gap-4 shrink-0">
        {/* Toggle Bahasa (EN / ID) matching design & i18n */}
        <div 
          role="group"
          aria-label={t('nav.selectLanguage', 'Select language')}
          className="flex items-center bg-[#eef2f6] border border-slate-200/80 rounded-full p-0.5 sm:p-1 select-none shadow-2xs shrink-0"
        >
          <button
            type="button"
            onClick={() => setLanguage('en')}
            className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold transition-all cursor-pointer ${
              language === 'en'
                ? 'bg-white text-[#3B6FF5] shadow-xs'
                : 'text-slate-500 hover:text-slate-800 bg-transparent'
            }`}
            aria-label={t('nav.switchToEnglish', 'Switch language to English')}
            aria-pressed={language === 'en'}
          >
            EN
          </button>
          <button
            type="button"
            onClick={() => setLanguage('id')}
            className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold transition-all cursor-pointer ${
              language === 'id'
                ? 'bg-white text-[#3B6FF5] shadow-xs'
                : 'text-slate-500 hover:text-slate-800 bg-transparent'
            }`}
            aria-label={t('nav.switchToIndonesian', 'Switch language to Indonesian')}
            aria-pressed={language === 'id'}
          >
            ID
          </button>
        </div>

        {/* Notifikasi Bell dengan badge merah */}
        <div
          className="relative p-1 text-slate-500 hover:text-slate-700 cursor-pointer transition-colors shrink-0"
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
        <div className="h-6 w-px bg-slate-200 shrink-0 hidden sm:block" />

        {/* Kartu Profil Pengguna dengan Dropdown */}
        <div ref={dropdownRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-1.5 sm:gap-2 select-none p-1 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer text-left"
            title="Klik untuk opsi akun"
          >
            {/* Logo Avatar Profil */}
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 shadow-xs ring-1 ${
                activeRole.toLowerCase().includes('manager')
                  ? 'bg-purple-100 text-purple-800 ring-purple-300/70'
                  : 'bg-emerald-100 text-emerald-800 ring-emerald-300/70'
              }`}
            >
              {activeInitials}
            </div>
            {/* Teks Nama & Jabatan: Di-hide di smartphone, hanya tampil di layar tablet/desktop */}
            <div className="hidden md:flex flex-col text-left max-w-[100px] md:max-w-[140px] lg:max-w-none">
              <span className="text-xs font-bold text-slate-900 leading-tight truncate">
                {activeName}
              </span>
              <span className="text-[10px] font-semibold text-slate-500 leading-tight mt-0.5 truncate">
                {activeRole}
              </span>
            </div>
            {/* Chevron: Di-hide di smartphone sehingga tinggal logo profil saja */}
            <ChevronDown
              className={`hidden md:block w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0 ${
                isDropdownOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* User Account Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 max-w-[calc(100vw-24px)] bg-white rounded-2xl shadow-xl border border-slate-200/90 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-4 py-2.5 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-900 truncate">{activeName}</p>
                <p className="text-[11px] text-slate-500 truncate mt-0.5">
                  {profile?.email || 'Logged in user'}
                </p>
                <span
                  className={`inline-block mt-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                    activeRole.toLowerCase().includes('manager')
                      ? 'bg-purple-50 text-purple-700 border-purple-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}
                >
                  {activeRole}
                </span>
              </div>

              <div className="p-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsDropdownOpen(false);
                    setIsLogoutModalOpen(true);
                  }}
                  className="w-full px-3 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4 text-rose-500" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          )}

          {/* Modal Dialog Konfirmasi Logout */}
          {isLogoutModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
              <div
                className="bg-white rounded-3xl p-6 sm:p-7 max-w-sm w-full shadow-2xl border border-slate-100 flex flex-col items-center text-center animate-in zoom-in-95 duration-150 text-slate-800"
                role="dialog"
                aria-modal="true"
                aria-labelledby="header-logout-modal-title"
              >
                <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4 shadow-2xs">
                  <LogOut className="w-6 h-6" />
                </div>

                <h3 id="header-logout-modal-title" className="text-base sm:text-lg font-bold text-slate-900">
                  Konfirmasi Logout
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1.5 mb-6">
                  Apakah Anda yakin ingin logout?
                </p>

                <div className="grid grid-cols-2 gap-3 w-full">
                  <button
                    type="button"
                    onClick={() => setIsLogoutModalOpen(false)}
                    disabled={isSigningOut}
                    className="w-full py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      setIsSigningOut(true);
                      await handleSignOut();
                    }}
                    disabled={isSigningOut}
                    className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs sm:text-sm font-bold shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {isSigningOut ? (
                      <span>Sedang logout...</span>
                    ) : (
                      <span>Logout</span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
