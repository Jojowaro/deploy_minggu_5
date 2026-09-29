'use server';

import { getActiveJobPosts, DEFAULT_ACTIVE_JOB_POSTS } from '../../lib/supabaseServer';
import { JobItem } from '../../types/job';

/**
 * Server Action to fetch active job posts from d2_job_posts table (FR-01.2, VR-01.4)
 * Complies with TR-D2-001 (Security) & TR-D2-002 (Performance < 500ms)
 */
export async function getJobsAction(): Promise<JobItem[]> {
  try {
    const startTime = Date.now();
    const posts = await getActiveJobPosts();
    const elapsed = Date.now() - startTime;

    if (elapsed > 500) {
      console.warn(`[TR-D2-002] Job fetching latency ${elapsed}ms exceeded 500ms target.`);
    }

    return posts as JobItem[];
  } catch (error) {
    console.error('[Squad D2] Error fetching active job posts:', error);
    return DEFAULT_ACTIVE_JOB_POSTS as JobItem[];
  }
}
