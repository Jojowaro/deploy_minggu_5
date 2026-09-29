"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import {
  BriefcaseBusiness,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  LayoutDashboard,
  Menu,
  ShieldCheck,
  UsersRound,
  X,
} from "lucide-react";

type SidebarProps = {
  userName?: string;
  userRole?: string;
  userInitials?: string;
  onSignOut?: () => void;
  isSigningOut?: boolean;
};

type NavigationItemProps = {
  icon: ReactNode;
  label: string;
  href?: string;
  suffix?: ReactNode;
};

type Account = {
  name: string;
  role: string;
  initials: string;
};

const fallbackAccount: Account = {
  name: "Andima User",
  role: "HRMS User",
  initials: "AU",
};

function NavigationItem({ icon, label, href = "#", suffix }: NavigationItemProps) {
  return (
    <Link
      href={href}
      className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-[#d9e2fc] transition-colors hover:bg-[#1e3765] hover:text-white"
    >
      <span className="flex items-center gap-3">{icon}{label}</span>
      {suffix}
    </Link>
  );
}

function HrmsLink({ label, href }: { label: string; href: string }) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={`flex w-full items-center rounded-md px-3 py-2 text-xs transition-colors ${
        isActive ? "bg-[#1e3765] text-white" : "text-[#d9e2fc]/80 hover:bg-[#1e3765] hover:text-white"
      }`}
    >
      {label}
    </Link>
  );
}


export default function Sidebar({ userName, userRole, userInitials, onSignOut, isSigningOut = false }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isPublicRoute = pathname === "/login" || pathname === "/register" || pathname.startsWith("/auth/");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isHrmsOpen, setIsHrmsOpen] = useState(true);
  const [isInternalSigningOut, setIsInternalSigningOut] = useState(false);
  const [loadedAccount, setLoadedAccount] = useState<Account | null>(null);
  const hasSuppliedAccount = Boolean(userName && userRole && userInitials);
  const suppliedAccount = hasSuppliedAccount
    ? { name: userName, role: userRole, initials: userInitials }
    : null;
  const account = suppliedAccount ?? loadedAccount ?? fallbackAccount;

  useEffect(() => {
    if (isPublicRoute || hasSuppliedAccount) return;

    let isMounted = true;
    async function loadAccount() {
      try {
        const supabase = createClient();
        const { data: userData } = await supabase.auth.getUser();
        const user = userData.user;
        if (!user || !isMounted) return;

        const { data: access } = await supabase
          .from("d2_user_access")
          .select("app_role")
          .eq("auth_user_id", user.id)
          .maybeSingle();

        const metadataName = user.user_metadata?.full_name;
        const name = typeof metadataName === "string" && metadataName.trim()
          ? metadataName.trim()
          : user.email?.split("@")[0] ?? "Andima User";
        const role = access?.app_role === "HR" ? "HR" : access?.app_role === "MANAGER" ? "Manager" : access?.app_role === "EMPLOYEE" ? "Employee" : "HRMS User";
        const initials = name.split(" ").filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "AU";
        if (isMounted) setLoadedAccount({ name, role, initials });
      } catch {
        // The navigation remains available even if the account label cannot load.
      }
    }

    void loadAccount();
    return () => { isMounted = false; };
  }, [hasSuppliedAccount, isPublicRoute]);

  async function handleSignOut() {
    if (onSignOut) {
      onSignOut();
      return;
    }
    setIsInternalSigningOut(true);
    try {
      await createClient().auth.signOut({ scope: "local" });
      router.replace("/login");
      router.refresh();
    } finally {
      setIsInternalSigningOut(false);
    }
  }

  if (isPublicRoute) return null;

  return (
    <>
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col bg-[#0f2342] px-4 py-5 text-[#d9e2fc] shadow-lg transition-transform lg:translate-x-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-3 px-2">
          <div className="grid size-9 place-items-center rounded-lg bg-[#069494] shadow-sm"><BriefcaseBusiness size={19} className="text-white" /></div>
          <div><p className="text-xl font-bold tracking-[-0.5px] text-white">ANDIMA</p><p className="text-xs text-[#d9e2fc]/80">Logistics Suite</p></div>
          <button type="button" onClick={() => setIsSidebarOpen(false)} className="ml-auto rounded p-1 text-[#d9e2fc] lg:hidden" aria-label="Tutup navigasi"><X size={18} /></button>
        </div>

        <nav className="mt-8 space-y-1.5 text-sm font-semibold">
          <NavigationItem icon={<LayoutDashboard size={16} />} label="Dashboard" href="/home" />
          <NavigationItem icon={<BriefcaseBusiness size={16} />} label="POS" />
          <NavigationItem icon={<UsersRound size={16} />} label="CRM" suffix={<ChevronRight size={15} />} />
          <div>
            <button
              type="button"
              onClick={() => setIsHrmsOpen((value) => !value)}
              className="flex w-full items-center justify-between rounded-lg bg-[#069494] px-3 py-2.5 text-white shadow-sm"
            >
              <span className="flex items-center gap-3"><ClipboardList size={17} /> HRMS</span>
              <ChevronDown size={16} className={`transition-transform ${isHrmsOpen ? "rotate-0" : "-rotate-90"}`} />
            </button>
            {isHrmsOpen && (
              <div className="ml-5 mt-2 space-y-1 border-l border-[#d9e2fc]/20 pl-3">
                <HrmsLink label="Job List & Register" href="/jobs" />
                <HrmsLink label="Kanban & Fit - Proper" href="/kanban" />
              </div>
            )}
          </div>
          <NavigationItem icon={<ShieldCheck size={16} />} label="MID" suffix={<ChevronRight size={15} />} />
        </nav>

        <div className="mt-auto pt-6 pb-2">
          <button
            type="button"
            onClick={() => void handleSignOut()}
            disabled={isSigningOut || isInternalSigningOut}
            className="w-full rounded-full border-2 border-[#e63946] py-2 px-4 text-center text-sm font-semibold text-[#e63946] transition-colors hover:bg-[#e63946]/10 disabled:opacity-50"
          >
            {isSigningOut || isInternalSigningOut ? "Logging out..." : "Logout"}
          </button>
        </div>
      </aside>

      <button
        type="button"
        onClick={() => setIsSidebarOpen(true)}
        className="fixed left-4 top-4 z-30 rounded-lg bg-[#0f2342] p-2 text-white lg:hidden"
        aria-label="Buka navigasi"
      >
        <Menu size={20} />
      </button>
    </>
  );
}