'use server';

import { JobItem } from '../../types/job';
import { getActiveJobPosts, DEFAULT_ACTIVE_JOB_POSTS } from '../../lib/supabaseServer';

/**
 * Server Action to fetch active job positions directly via Supabase
 * Directly queries Supabase to prevent loopback HTTP fetch issues on Vercel deployments
 */
export async function getJobsAction(): Promise<JobItem[]> {
  try {
    const jobs = await getActiveJobPosts();
    return (jobs || []) as JobItem[];
  } catch (error) {
    console.error('[Squad D2 Action] Error fetching jobs from Supabase:', error);
    return DEFAULT_ACTIVE_JOB_POSTS as JobItem[];
  }
}

