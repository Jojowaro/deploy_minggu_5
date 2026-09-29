/**
 * Squad D2 (Recruitment Management) - Supabase Server Client
 * Technical Standards: TR-D2-001 (TR-01 s/d TR-06), TR-D2-002 (TR-01, TR-05 < 500ms)
 * 
 * Native lightweight Supabase client wrapper with zero external runtime dependencies.
 * Provides PostgREST and Object Storage capabilities with sub-500ms latency.
 */

import { Candidate, CandidateWithJob, AuditLog, CandidateStatus, JobPost } from '../types/candidate';
import { mapStatusToStage } from '../types/kanban';

export function getSupabaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    'https://ufjbbwqaztgkqmpdmcyv.supabase.co'
  );
}

export function getSupabaseKey(): string {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmamJid3FhenRna3FtcGRtY3l2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDAzMTM2NywiZXhwIjoyMTA1NjA3MzY3fQ.qbUVYCttTseHC_9v1hEY9dTh75E3hDtx5DuYw2hqdXQ'
  );
}

export function getBucketName(): string {
  return process.env.SUPABASE_STORAGE_BUCKET || 'd2-applicant-resumes';
}

export const SUPABASE_URL = getSupabaseUrl();
export const SUPABASE_KEY = getSupabaseKey();
export const BUCKET_NAME = getBucketName();
export const isSupabaseConfigured = true;

interface StorageUploadResult {
  data: { path: string } | null;
  error: { message: string; statusCode?: number } | null;
}

interface DbInsertResult<T> {
  data: T | null;
  error: { message: string; details?: string; hint?: string; code?: string } | null;
}

/**
 * Upload applicant resume PDF to Supabase Storage bucket (Private) (TR-05, TR-06)
 */
export async function uploadApplicantCv(
  fileName: string,
  fileBuffer: ArrayBuffer | Uint8Array,
  contentType = 'application/pdf'
): Promise<StorageUploadResult> {
  const supabaseUrl = getSupabaseUrl().replace(/\/$/, '');
  const supabaseKey = getSupabaseKey();
  const bucketName = getBucketName();

  const endpoint = `${supabaseUrl}/storage/v1/object/${bucketName}/${fileName}`;

  try {
    const startTime = Date.now();
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
        'Content-Type': contentType,
        'x-upsert': 'true',
      },
      body: fileBuffer as unknown as BodyInit,
    });

    const elapsed = Date.now() - startTime;
    if (elapsed > 500) {
      console.warn(`[TR-D2-002 TR-05] CV Upload took ${elapsed}ms, exceeding 500ms target.`);
    }

    if (!response.ok) {
      const errorText = await response.text();
      return {
        data: null,
        error: { message: `Storage upload failed (${response.status}): ${errorText}`, statusCode: response.status },
      };
    }

    return {
      data: { path: `${bucketName}/${fileName}` },
      error: null,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      data: null,
      error: { message: `Storage network error: ${message}` },
    };
  }
}

/**
 * Fetch or verify active job post ID from d2_job_posts (FR-01.2, VR-01.4)
 */
export async function getActiveJobPostId(preferredJobId?: string): Promise<string> {
  const fallbackJobId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
  const baseUrl = getSupabaseUrl().replace(/\/$/, '');
  const supabaseKey = getSupabaseKey();

  try {
    // If a specific jobId was provided, verify it is active in database
    if (preferredJobId) {
      const verifyUrl = `${baseUrl}/rest/v1/d2_job_posts?id=eq.${encodeURIComponent(preferredJobId)}&status=eq.active&select=id`;
      const verifyRes = await fetch(verifyUrl, {
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey,
        },
      });

      if (verifyRes.ok) {
        const matches: Array<{ id: string }> = await verifyRes.json();
        if (matches.length > 0) {
          return matches[0].id;
        }
      }
    }

    // Otherwise find the first available active job post
    const queryUrl = `${baseUrl}/rest/v1/d2_job_posts?status=eq.active&select=id&limit=1`;
    const res = await fetch(queryUrl, {
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
      },
    });

    if (res.ok) {
      const rows: Array<{ id: string }> = await res.json();
      if (rows && rows.length > 0) {
        return rows[0].id;
      }
    }
  } catch (err) {
    console.warn('[Squad D2 Supabase] Job post lookup error, using default active pool ID:', err);
  }

  return fallbackJobId;
}

/**
 * Default fallback active job posts for PT Andima Transportindo
 * Strictly matches Figma Reference: HRMS D - Applicant Portal
 */
export const DEFAULT_ACTIVE_JOB_POSTS: JobPost[] = [
  {
    id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    title: 'Backend Engineer',
    department: 'Engineering',
    status: 'active',
    description: 'Developing scalable server architecture, microservices, and high-performance databases for PT Andima Transportindo logistics ecosystem.',
    tags: ['Golang', 'PostgreSQL', 'Docker', 'REST API', 'Min 2 Yrs Exp'],
    location: 'Jakarta, Indonesia',
  },
  {
    id: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    title: 'Logistic Staff',
    department: 'Operations',
    status: 'active',
    description: 'Managing logistics fleet and dispatch, track delivery manifests, ensure dispatch schedule compliance, and maintain real-time warehouse inventory accuracy.',
    tags: ['Warehouse Mgmt', 'Dispatching', 'Supply Chain', 'Microsoft Excel', 'Full Time'],
    location: 'Balikpapan, Indonesia',
  },
  {
    id: 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
    title: 'Sales & Marketing',
    department: 'Commercial',
    status: 'active',
    description: 'B2B client acquisition for transport services, prepare freight tender proposals, and expand cargo client portfolios.',
    tags: ['B2B Sales', 'Client Relations', 'Market Analysis', 'Negotiation', 'Communication'],
    location: 'Surabaya, Indonesia',
  },
  {
    id: 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44',
    title: 'Operations Supervisor',
    department: 'Fleet & Cargo Operations',
    status: 'active',
    description: 'Oversee daily fleet distribution routes, monitor truck driver safety protocols, inspect transport equipment standards, and optimize turnaround times across terminal hubs.',
    tags: ['Fleet Operations', 'Safety ISO', 'Route Planning', 'Leadership', 'Min 3 Yrs Exp'],
    location: 'Balikpapan, Indonesia',
  },
  {
    id: 'e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55',
    title: 'Fleet Maintenance Technician',
    department: 'Maintenance & Engineering',
    status: 'active',
    description: 'Perform routine mechanical diagnostics, preventive vehicle servicing, heavy vehicle engine maintenance, and troubleshooting for prime movers and heavy trailers.',
    tags: ['Heavy Machinery', 'Preventive Service', 'Diagnostics', 'Hydraulics', 'Certification'],
    location: 'Balikpapan, Indonesia',
  },
  {
    id: 'f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a66',
    title: 'XXX',
    department: 'Future Operations',
    status: 'coming_soon' as any,
    isPlaceholder: true,
    description: '',
    tags: [],
    location: 'Location Pending',
  },
];

/**
 * Fetch list of active job posts from Supabase d2_job_posts
 */
export async function getActiveJobPosts(): Promise<JobPost[]> {
  const baseUrl = getSupabaseUrl().replace(/\/$/, '');
  const supabaseKey = getSupabaseKey();

  try {
    const url = `${baseUrl}/rest/v1/d2_job_posts?status=eq.active&select=*&order=created_at.desc`;
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
      },
      next: { revalidate: 60 },
    });

    if (res.ok) {
      const data: any[] = await res.json();
      if (data && data.length > 0) {
        // Normalize any missing tags/description from remote rows
        const mapped: JobPost[] = data.map((item) => ({
          id: item.id,
          title: item.title,
          department: item.department,
          status: item.status || 'active',
          created_at: item.created_at,
          description: item.description || 'Join our dedicated team at PT Andima Transportindo and drive excellence across our nationwide logistics and supply chain network.',
          tags: Array.isArray(item.requirements) && item.requirements.length > 0
            ? item.requirements
            : Array.isArray(item.tags) && item.tags.length > 0
            ? item.tags
            : ['Full Time', 'Logistics', 'Professional', 'Competitive Salary', 'Career Growth'],
          location: item.location || 'Jakarta, Indonesia',
        }));

        // Append coming soon placeholder card if not present in DB
        if (!mapped.some((j) => j.isPlaceholder || j.title === 'XXX')) {
          mapped.push({
            id: 'f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a66',
            title: 'XXX',
            department: 'Future Operations',
            status: 'coming_soon' as any,
            isPlaceholder: true,
            description: '',
            tags: [],
            location: 'Location Pending',
          });
        }

        return mapped;
      }
    }
  } catch (err) {
    console.warn('[Squad D2 Supabase] Failed to fetch active job posts from DB, using fallback list', err);
  }

  return DEFAULT_ACTIVE_JOB_POSTS;
}

/**
 * Fetch a single job post by ID
 */
export async function getJobPostById(id: string): Promise<JobPost | null> {
  const baseUrl = getSupabaseUrl().replace(/\/$/, '');
  const supabaseKey = getSupabaseKey();

  try {
    const url = `${baseUrl}/rest/v1/d2_job_posts?id=eq.${encodeURIComponent(id)}&select=*`;
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
      },
    });

    if (res.ok) {
      const rows: any[] = await res.json();
      if (rows.length > 0) {
        const item = rows[0];
        return {
          id: item.id,
          title: item.title,
          department: item.department,
          status: item.status || 'active',
          created_at: item.created_at,
          description: item.description || 'Join our dedicated team at PT Andima Transportindo and drive excellence across our nationwide logistics and supply chain network.',
          tags: Array.isArray(item.requirements) && item.requirements.length > 0
            ? item.requirements
            : Array.isArray(item.tags) && item.tags.length > 0
            ? item.tags
            : ['Full Time', 'Logistics', 'Professional', 'Competitive Salary', 'Career Growth'],
          location: item.location || 'Jakarta, Indonesia',
        };
      }
    }
  } catch (err) {
    console.warn('[Squad D2 Supabase] Failed to fetch job post by ID:', err);
  }

  const allPosts = await getActiveJobPosts();
  return allPosts.find((j) => j.id === id) || null;
}

/**
 * Insert candidate record into d2_candidates table in Supabase (FR-01.6, TR-01, TR-02)
 */
export async function insertCandidate(
  payload: Omit<Candidate, 'id' | 'created_at' | 'updated_at'>
): Promise<DbInsertResult<Candidate>> {
  const baseUrl = getSupabaseUrl().replace(/\/$/, '');
  const supabaseKey = getSupabaseKey();
  const endpoint = `${baseUrl}/rest/v1/d2_candidates`;

  try {
    const startTime = Date.now();
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(payload),
    });

    const elapsed = Date.now() - startTime;
    if (elapsed > 500) {
      console.warn(`[TR-D2-002 TR-05] Database insert took ${elapsed}ms, exceeding 500ms target.`);
    }

    if (!response.ok) {
      const errorData = await response.text();
      return {
        data: null,
        error: { message: `Database insert failed (${response.status}): ${errorData}` },
      };
    }

    const insertedRows: Candidate[] = await response.json();
    return {
      data: insertedRows[0] || null,
      error: null,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      data: null,
      error: { message: `Database connection error: ${message}` },
    };
  }
}

/**
 * Fetch all candidates with linked job post titles for Kanban board (FR-D2-002, TR-01, TR-06 < 200ms)
 */
export async function getCandidatesWithJobs(): Promise<CandidateWithJob[]> {
  const baseUrl = getSupabaseUrl().replace(/\/$/, '');
  const supabaseKey = getSupabaseKey();
  const startTime = Date.now();

  try {
    const url = `${baseUrl}/rest/v1/d2_candidates?select=*,d2_job_posts(title)&order=created_at.desc`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    const elapsed = Date.now() - startTime;
    if (elapsed > 200) {
      console.warn(`[TR-D2-002 TR-06] Query candidates took ${elapsed}ms, target < 200ms.`);
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Squad D2 Supabase] Failed to fetch candidates:', errorText);
      return [];
    }

    const rows: any[] = await response.json();
    return rows.map((row) => ({
      ...row,
      job_title: row.d2_job_posts?.title || 'Unknown Position',
      application_count: typeof row.application_count === 'number' ? row.application_count : 1,
    }));
  } catch (err) {
    console.error('[Squad D2 Supabase] Network exception fetching candidates:', err);
    return [];
  }
}

/**
 * Update candidate status & append immutable audit log entry in d2_audit_logs (FR-02.6, TR-09, TR-06)
 */
export async function updateCandidateStatusAndLog(params: {
  candidateId: string;
  newStatus: CandidateStatus;
  oldStatus: string;
  actorName?: string;
  reason?: string;
}): Promise<{
  success: boolean;
  candidate?: CandidateWithJob;
  auditLogId?: string;
  error?: string;
  latencyMs: number;
}> {
  const { candidateId, newStatus, oldStatus, actorName = 'Budi Santoso', reason } = params;
  const baseUrl = getSupabaseUrl().replace(/\/$/, '');
  const supabaseKey = getSupabaseKey();
  const startTime = Date.now();

  try {
    const targetStage = mapStatusToStage(newStatus);
    const nowIso = new Date().toISOString();

    const patchPayload: Record<string, any> = {
      status: newStatus,
      stage: targetStage,
      updated_at: nowIso,
    };

    if (reason !== undefined) {
      patchPayload.rejection_reason = reason;
    }

    // 1. Update candidate record in d2_candidates
    const patchUrl = `${baseUrl}/rest/v1/d2_candidates?id=eq.${encodeURIComponent(candidateId)}&select=*,d2_job_posts(title)`;
    const patchRes = await fetch(patchUrl, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(patchPayload),
    });

    if (!patchRes.ok) {
      const errText = await patchRes.text();
      console.error('[Squad D2 Supabase] PATCH candidate error:', errText);
      return {
        success: false,
        error: `Failed to update candidate status (${patchRes.status}): ${errText}`,
        latencyMs: Date.now() - startTime,
      };
    }

    const updatedRows: any[] = await patchRes.json();
    const updatedCandidate: CandidateWithJob = updatedRows[0]
      ? {
          ...updatedRows[0],
          job_title: updatedRows[0].d2_job_posts?.title || 'Unknown Position',
          application_count: typeof updatedRows[0].application_count === 'number' ? updatedRows[0].application_count : 1,
        }
      : (null as any);

    // 2. Insert Immutable Audit Log Record into d2_audit_logs (TR-09)
    const auditPayload = {
      candidate_id: candidateId,
      actor_name: actorName,
      old_status: oldStatus,
      new_status: newStatus,
      change_reason: reason || `Pipeline stage transitioned from ${oldStatus} to ${newStatus}`,
      created_at: nowIso,
    };

    const auditUrl = `${baseUrl}/rest/v1/d2_audit_logs`;
    const auditRes = await fetch(auditUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(auditPayload),
    });

    let auditLogId: string | undefined;
    if (auditRes.ok) {
      const auditResult: any[] = await auditRes.json();
      auditLogId = auditResult[0]?.id;
    } else {
      console.warn('[Squad D2 Supabase] Warning: Audit log entry failed to record:', await auditRes.text());
    }

    const totalElapsed = Date.now() - startTime;
    if (totalElapsed > 200) {
      console.info(`[TR-D2-002 TR-06] Status update + audit log took ${totalElapsed}ms`);
    }

    return {
      success: true,
      candidate: updatedCandidate,
      auditLogId,
      latencyMs: totalElapsed,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Squad D2 Supabase] Exception in updateCandidateStatusAndLog:', err);
    return {
      success: false,
      error: `Network error updating status: ${msg}`,
      latencyMs: Date.now() - startTime,
    };
  }
}

/**
 * Fetch Immutable Audit Trail Logs from d2_audit_logs (TR-09)
 */
export async function getAuditLogs(candidateId?: string, limit = 50): Promise<AuditLog[]> {
  const baseUrl = getSupabaseUrl().replace(/\/$/, '');
  const supabaseKey = getSupabaseKey();

  try {
    let url = `${baseUrl}/rest/v1/d2_audit_logs?select=*,d2_candidates(full_name,email)&order=created_at.desc&limit=${limit}`;
    if (candidateId) {
      url += `&candidate_id=eq.${encodeURIComponent(candidateId)}`;
    }

    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      console.error('[Squad D2 Supabase] Failed to fetch audit logs:', await res.text());
      return [];
    }

    const data: AuditLog[] = await res.json();
    return data;
  } catch (err) {
    console.error('[Squad D2 Supabase] Exception fetching audit logs:', err);
    return [];
  }
}