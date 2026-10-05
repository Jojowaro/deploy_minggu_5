'use server';

import { CandidateSubmissionResult } from '../../types/candidate';

/**
 * Server Action: Submit Multi-Track Candidate Registration
 * Data flow: Form / Action -> /api/squad-d2/register -> Supabase
 */
export async function submitCandidateRegistration(
  formData: FormData
): Promise<CandidateSubmissionResult> {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:3000';

    const res = await fetch(`${appUrl}/api/squad-d2/register`, {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();
    return data as CandidateSubmissionResult;
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown server error';
    console.error('[Squad D2 Action] Error forwarding registration to API:', error);
    return {
      success: false,
      message: `Gagal menghubungi endpoint pendaftaran: ${errorMsg}`,
    };
  }
}
