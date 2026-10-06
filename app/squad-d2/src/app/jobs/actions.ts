'use server';

import { JobItem } from '../../types/job';

/**
 * Server Action to fetch active job positions via the Squad D2 API endpoint
 * Data flow: Action -> /api/squad-d2/jobs -> Supabase (d1_job_positions)
 */
export async function getJobsAction(): Promise<JobItem[]> {
  try {
    // In server action, fetch from relative URL via internal origin or headers
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:3000';

    const res = await fetch(`${appUrl}/api/squad-d2/jobs`, {
      cache: 'no-store',
    });

    if (res.ok) {
      const result = await res.json();
      if (result.success && Array.isArray(result.data)) {
        return result.data as JobItem[];
      }
    }

    // Direct fallback to API handler if internal HTTP fetch is unavailable
    const { getActiveJobPosts } = await import('../../lib/supabaseServer');
    return (await getActiveJobPosts()) as JobItem[];
  } catch (error) {
    console.error('[Squad D2 Action] Error fetching jobs from API:', error);
    const { DEFAULT_ACTIVE_JOB_POSTS } = await import('../../lib/supabaseServer');
    return DEFAULT_ACTIVE_JOB_POSTS as JobItem[];
  }
}
