/**
 * Squad D2 (Recruitment Management) - Job Post Types
 * Specification: US-D2-001, FR-D2-001 (FR-01.2, VR-01.4), TR-D2-001, TR-D2-002
 * Target Table: d2_job_posts
 */

export type JobStatus = 'active' | 'inactive' | 'closed' | 'coming_soon';

export interface JobItem {
  id: string;
  title: string;
  department: string;
  description: string;
  tags: string[];
  location: string;
  status: JobStatus;
  isPlaceholder?: boolean;
  postedAt?: string;
  deadline?: string;
}

export interface JobFilterParams {
  query?: string;
  department?: string;
  location?: string;
}
