"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { createClient } from "@/utils/supabase/client";

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  // Routes that do NOT require authentication redirect (Public: Jobs & Registration Form & Login)
  const isNoAuthRoute =
    pathname === "/login" ||
    pathname.startsWith("/auth/") ||
    pathname === "/register" ||
    pathname.startsWith("/register") ||
    pathname === "/registration-form" ||
    pathname.startsWith("/registration-form") ||
    pathname === "/jobs" ||
    pathname.startsWith("/jobs") ||
    pathname.startsWith("/squad-d2/src/app/register") ||
    pathname.startsWith("/squad-d2/src/app/jobs");

  // Routes where sidebar should NOT be rendered (Job list, Registration form, Login)
  const isNoSidebarRoute =
    pathname === "/login" ||
    pathname.startsWith("/auth/") ||
    pathname === "/register" ||
    pathname.startsWith("/register") ||
    pathname === "/registration-form" ||
    pathname.startsWith("/registration-form") ||
    pathname === "/jobs" ||
    pathname.startsWith("/jobs") ||
    pathname.startsWith("/squad-d2/src/app/register") ||
    pathname.startsWith("/squad-d2/src/app/jobs");

  useEffect(() => {
    // If user is trying to access protected internal pages (kanban, fit-proper), check auth and role
    if (!isNoAuthRoute) {
      try {
        const supabase = createClient();
        supabase.auth.getUser().then(({ data: { user } }) => {
          if (!user) {
            router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
            return;
          }

          // Role check for system routes
          const email = user.email || "";
          const userRole = (user.user_metadata?.role || "").toLowerCase();
          const isCompanyStaff =
            email.toLowerCase().endsWith("@andima.co.id") ||
            email.toLowerCase().endsWith("@andimatransport.com") ||
            Boolean(user.user_metadata?.position_id) ||
            Boolean(user.user_metadata?.full_name);

          const hasAllowedRole =
            isCompanyStaff ||
            userRole.includes("hr") ||
            userRole.includes("manager") ||
            userRole.includes("recruiter") ||
            userRole.includes("admin") ||
            userRole.includes("employee") ||
            userRole.includes("staff");

          if (!hasAllowedRole) {
            router.replace("/login?error=unauthorized_role");
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