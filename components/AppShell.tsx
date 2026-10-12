"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { createClient } from "@/utils/supabase/client";

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  // Routes that do NOT require authentication redirect
  const isNoAuthRoute =
    pathname === "/login" ||
    pathname.startsWith("/auth/") ||
    pathname === "/register" ||
    pathname === "/registration-form" ||
    pathname === "/jobs" ||
    pathname.startsWith("/jobs") ||
    pathname.startsWith("/registration-form") ||
    pathname.startsWith("/register") ||
    pathname === "/fit-proper" ||
    pathname.startsWith("/fit-proper") ||
    pathname.startsWith("/squad-d2/src/app/fit-proper") ||
    pathname.startsWith("/squad-d2/src/app/register") ||
    pathname.startsWith("/squad-d2/src/app/jobs");

  // Routes where sidebar should NOT be rendered (Job list, Registration form, Login, Register)
  const isNoSidebarRoute =
    pathname === "/login" ||
    pathname.startsWith("/auth/") ||
    pathname === "/register" ||
    pathname === "/registration-form" ||
    pathname === "/jobs" ||
    pathname.startsWith("/jobs") ||
    pathname.startsWith("/registration-form") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/squad-d2/src/app/register") ||
    pathname.startsWith("/squad-d2/src/app/jobs");

  useEffect(() => {
    // If user is trying to access protected internal pages, check auth
    if (!isNoAuthRoute) {
      try {
        const supabase = createClient();
        supabase.auth.getUser().then(({ data: { user } }) => {
          if (!user) {
            router.replace("/login");
          }
        });
      } catch {
        router.replace("/login");
      }
    }
  }, [pathname, isNoAuthRoute, router]);

  if (isNoSidebarRoute) {
    return <>{children}</>;
  }

  return (
    <>
      <Sidebar />
      <div className="min-h-full lg:pl-[260px] flex flex-col">{children}</div>
    </>
  );
}