import { createClient } from '@/utils/supabase/client';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  initials: string;
}

/**
 * Validates if the user role is authorized to access Kanban & Fit-Proper system
 */
export function isAuthorizedRole(role?: string | null, email?: string | null): boolean {
  if (!email && !role) return false;

  // Valid internal roles for HRMS system
  const authorizedRoles = [
    'hr',
    'hr administrator',
    'hr specialist',
    'hr manager',
    'manager',
    'recruiter',
    'it staff',
    'tim it',
    'employee',
    'hrms user',
    'management',
  ];

  const normalizedRole = (role || '').trim().toLowerCase();
  if (authorizedRoles.some((r) => normalizedRole.includes(r))) {
    return true;
  }

  // Company domain users (@andima.co.id) are authorized internal employees
  if (email && email.toLowerCase().endsWith('@andima.co.id')) {
    return true;
  }

  return false;
}

/**
 * Checks if the user is an HR Manager (Authorized for Fit & Proper Decision Making & Threshold Settings)
 */
export function isHRManager(role?: string | null, email?: string | null): boolean {
  if (!role && !email) return false;
  const r = (role || '').toLowerCase();
  const e = (email || '').toLowerCase();

  // Known HR Manager accounts
  if (
    e === 'yohana@andima.co.id' ||
    e.includes('reynardalbert') ||
    e.includes('nickne6768') ||
    e.includes('raymondopurba') ||
    e.includes('demo.d3.manager')
  ) {
    return true;
  }

  return r === 'hr manager' || (r.includes('manager') && !r.includes('cash') && !r.includes('tax'));
}

/**
 * Checks if the user is an HR Recruiter (Responsible for Candidate Pipeline Kanban & Status Transitions)
 */
export function isHRRecruiter(role?: string | null, email?: string | null): boolean {
  if (!role && !email) return false;
  if (isHRManager(role, email)) return false; // Distinct roles

  const r = (role || '').toLowerCase();
  const e = (email || '').toLowerCase();

  if (
    e.includes('recruiter') ||
    e.includes('demo.d3.employee') ||
    e.includes('demo.d3.hr')
  ) {
    return true;
  }

  return (
    r.includes('recruiter') ||
    r.includes('associate officer') ||
    r.includes('hr specialist') ||
    r.includes('hr staff') ||
    r.includes('specialist')
  );
}

/**
 * Checks if the user can execute decisions on Fit & Proper (FR-D2-003: exclusively HR Manager)
 */
export function canMakeFitProperDecision(role?: string | null, email?: string | null): boolean {
  return isHRManager(role, email);
}

/**
 * Resolves the authenticated user profile with matching name, role, and initials
 */
export async function getAuthenticatedUserProfile(): Promise<UserProfile | null> {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    const email = user.email || '';
    const emailLower = email.toLowerCase();

    // 1. Resolve Name
    const metaName = user.user_metadata?.full_name || user.user_metadata?.name;
    let name = '';
    if (typeof metaName === 'string' && metaName.trim()) {
      name = metaName.trim();
    } else if (email) {
      name = email.split('@')[0];
    } else {
      name = 'Andima Staff';
    }

    // Standardize Yohana's name
    if (emailLower === 'yohana@andima.co.id' || name.toLowerCase().includes('yohana')) {
      name = 'Yohana Gayatri';
    }

    // Capitalize if all lowercase
    if (name && !name.includes(' ') && name === name.toLowerCase()) {
      name = name.charAt(0).toUpperCase() + name.slice(1);
    }

    // 2. Resolve Role
    let role = '';

    // Direct match for Yohana: explicitly HR Manager
    if (emailLower === 'yohana@andima.co.id') {
      role = 'HR Manager';
    } else if (emailLower.includes('recruiter')) {
      role = 'HR Recruiter';
    }

    // If not direct, look up d3_view_employee_360 by email
    if (!role && email) {
      try {
        const { data: emp } = await supabase
          .from('d3_view_employee_360')
          .select('position_title, department_name, full_name')
          .eq('email', email)
          .maybeSingle();

        if (emp?.position_title) {
          const titleLower = emp.position_title.toLowerCase();
          if (titleLower.includes('hr manager')) {
            role = 'HR Manager';
          } else if (titleLower.includes('associate officer') || emp.department_name === 'Human Capital & Culture') {
            role = 'HR Recruiter';
          } else {
            role = emp.position_title;
          }
          if (emp.full_name && !metaName) {
            name = emp.full_name;
          }
        }
      } catch (err) {
        console.warn('[Auth] Employee view lookup error:', err);
      }
    }

    // Fallback to user_metadata if role isn't the dummy default
    if (!role) {
      const metaRole = user.user_metadata?.role;
      if (metaRole && !metaRole.toLowerCase().includes('director of finance')) {
        role = metaRole;
      }
    }

    // Fallback to d3_user_access
    if (!role) {
      try {
        const { data: access } = await supabase
          .from('d3_user_access')
          .select('app_role')
          .eq('auth_user_id', user.id)
          .maybeSingle();

        if (access?.app_role) {
          if (access.app_role === 'HR') role = 'HR Recruiter';
          else if (access.app_role === 'MANAGER') role = 'HR Manager';
          else if (access.app_role === 'EMPLOYEE') role = 'HR Recruiter';
          else role = access.app_role;
        } else if (user.user_metadata?.position_id) {
          const { data: pos } = await supabase
            .from('d3_positions')
            .select('title')
            .eq('id', user.user_metadata.position_id)
            .maybeSingle();

          if (pos?.title) {
            role = pos.title;
          }
        }
      } catch (err) {
        console.warn('[Auth] Role lookup fallback error:', err);
      }
    }

    // Default fallbacks
    if (!role) {
      if (isHRManager(null, email)) {
        role = 'HR Manager';
      } else if (isHRRecruiter(null, email)) {
        role = 'HR Recruiter';
      } else {
        role = emailLower.endsWith('@andima.co.id') ? 'HR Recruiter' : 'HRMS User';
      }
    }

    // 3. Compute Initials
    const initials =
      name
        .split(' ')
        .filter(Boolean)
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase() || 'AU';

    return {
      id: user.id,
      email,
      name,
      role,
      initials,
    };
  } catch (err) {
    console.error('[Auth] Failed to load authenticated user profile:', err);
    return null;
  }
}

