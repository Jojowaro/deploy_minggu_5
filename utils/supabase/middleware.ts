import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ufjbbwqaztgkqmpdmcyv.supabase.co";
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_0GFbshHOM6k80Wxde_iZVQ_v6DpVj1D";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    supabaseUrl!,
    supabaseKey!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Static assets and internal next paths are excluded
  const isStaticAsset =
    pathname.startsWith("/_next") ||
    pathname.startsWith("/images") ||
    pathname === "/favicon.ico" ||
    pathname.match(/\.(svg|png|jpg|jpeg|gif|webp)$/i);

  if (isStaticAsset) {
    return supabaseResponse;
  }

  // Public paths allowed without login (Jobs & Registration Form)
  const isPublicRoute =
    pathname === "/login" ||
    pathname === "/register" ||
    pathname.startsWith("/register") ||
    pathname === "/registration-form" ||
    pathname.startsWith("/registration-form") ||
    pathname === "/jobs" ||
    pathname.startsWith("/jobs") ||
    pathname.startsWith("/squad-d2/src/app/register") ||
    pathname.startsWith("/squad-d2/src/app/jobs") ||
    pathname.startsWith("/api/squad-d2/jobs") ||
    pathname.startsWith("/api/squad-d2/register") ||
    pathname.startsWith("/api/squad-d2/repeat-applicants") ||
    pathname.startsWith("/auth/");

  // Protected system routes (Kanban and Fit & Proper)
  const isSystemRoute =
    pathname === "/kanban" ||
    pathname.startsWith("/kanban") ||
    pathname === "/fit-proper" ||
    pathname.startsWith("/fit-proper") ||
    pathname.startsWith("/squad-d2/src/app/kanban") ||
    pathname.startsWith("/squad-d2/src/app/fit-proper") ||
    pathname === "/home" ||
    pathname.startsWith("/home");

  // If NOT logged in:
  if (!user) {
    // If accessing root '/' or any protected system URL (kanban, fit-proper, etc.)
    if (!isPublicRoute || pathname === "/" || isSystemRoute) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/login";
      redirectUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(redirectUrl);
    }
  } else {
    // User IS logged in:
    // If they attempt to open /login or root '/', redirect directly to /kanban
    if (pathname === "/login" || pathname === "/") {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/kanban";
      return NextResponse.redirect(redirectUrl);
    }

    // Role Check for System Pages (Kanban & Fit & Proper)
    if (isSystemRoute) {
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

      // If user lacks authorized role, redirect to login with error
      if (!hasAllowedRole) {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = "/login";
        redirectUrl.searchParams.set("error", "unauthorized_role");
        return NextResponse.redirect(redirectUrl);
      }
    }
  }

  return supabaseResponse;
}

export const createClient = (request: NextRequest) => {
  return updateSession(request);
};  