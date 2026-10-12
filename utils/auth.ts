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

    // 1. Resolve Name
    const metaName = user.user_metadata?.full_name || user.user_metadata?.name;
    let name = '';
    if (typeof metaName === 'string' && metaName.trim()) {
      name = metaName.trim();
    } else if (user.email) {
      name = user.email.split('@')[0];
    } else {
      name = 'Andima Staff';
    }

    // Capitalize if all lowercase
    if (name && !name.includes(' ') && name === name.toLowerCase()) {
      name = name.charAt(0).toUpperCase() + name.slice(1);
    }

    // 2. Resolve Role
    let role = user.user_metadata?.role || '';

    // If role not directly in metadata, look up d3_user_access or d3_positions
    if (!role) {
      try {
        const { data: access } = await supabase
          .from('d3_user_access')
          .select('app_role')
          .eq('auth_user_id', user.id)
          .maybeSingle();

        if (access?.app_role) {
          if (access.app_role === 'HR') role = 'HR Specialist';
          else if (access.app_role === 'MANAGER') role = 'HR Manager';
          else if (access.app_role === 'EMPLOYEE') role = 'HR Staff';
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

    if (!role) {
      role = user.email?.endsWith('@andima.co.id') ? 'HR Administrator' : 'HRMS User';
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
      email: user.email || '',
      name,
      role,
      initials,
    };
  } catch (err) {
    console.error('[Auth] Failed to load authenticated user profile:', err);
    return null;
  }
}
