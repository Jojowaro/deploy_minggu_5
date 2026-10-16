import nodemailer from 'nodemailer';

export interface InterviewDetails {
  date: string;
  hour: string;
  minute: string;
  meetLink: string;
}

export interface StatusEmailParams {
  candidateEmail: string;
  candidateName: string;
  jobTitle?: string;
  oldStatus: string;
  newStatus: string;
  actorName?: string;
  reason?: string;
  interviewDetails?: InterviewDetails;
}

/**
 * Configure Nodemailer Transporter
 * Supports custom SMTP if env variables are defined, otherwise uses JSON/stream transport
 * to guarantee robust, non-blocking execution in any environment.
 */
function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }

  // Development / Test transporter: safely logs and handles email dispatch
  return nodemailer.createTransport({
    jsonTransport: true,
  });
}

function getStatusBadgeColor(status: string): { bg: string; text: string; label: string } {
  switch (status.toLowerCase()) {
    case 'applied':
      return { bg: '#3b82f6', text: '#ffffff', label: 'Applied (Screening)' };
    case 'assessment':
      return { bg: '#f59e0b', text: '#ffffff', label: 'Assessment' };
    case 'interview':
    case 'interviewed':
      return { bg: '#8b5cf6', text: '#ffffff', label: 'Interviewed' };
    case 'offered':
      return { bg: '#10b981', text: '#ffffff', label: 'Offered' };
    case 'rejected':
      return { bg: '#ef4444', text: '#ffffff', label: 'Rejected' };
    default:
      return { bg: '#64748b', text: '#ffffff', label: status.toUpperCase() };
  }
}

/**
 * Generate branded HTML email content
 */
function generateEmailHtml(params: StatusEmailParams): { subject: string; html: string; text: string } {
  const { candidateName, jobTitle = 'Posisi yang Dilamar', newStatus, interviewDetails } = params;
  const badge = getStatusBadgeColor(newStatus);
  const normalizedStatus = newStatus.toLowerCase();

  let subject = `[Andima HRMS] Pembaruan Status Lamaran Kerja - ${jobTitle}`;
  let stageDescription = '';
  let interviewBoxHtml = '';

  if (normalizedStatus === 'applied') {
    subject = `[Andima HRMS] Berkas Lamaran Diterima - ${jobTitle}`;
    stageDescription = `
      <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #334155;">
        Berkas lamaran Anda untuk posisi <strong>${jobTitle}</strong> telah kami terima dan saat ini sedang berada pada tahap <strong>Pemeriksaan Berkas (Screening)</strong>.
      </p>
      <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #334155;">
        Tim rekrutmen kami akan melakukan evaluasi profil dan kelengkapan dokumen Anda. Kami akan mengabari Anda kembali mengenai tahapan berikutnya.
      </p>
    `;
  } else if (normalizedStatus === 'assessment') {
    subject = `[Andima HRMS] Undangan Tahap Asesmen - ${jobTitle}`;
    stageDescription = `
      <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #334155;">
        Selamat! Berdasarkan hasil peninjauan berkas, Anda dinyatakan memenuhi kualifikasi awal dan dipersilakan melanjutkan ke tahap <strong>Asesmen (Assessment)</strong> untuk posisi <strong>${jobTitle}</strong>.
      </p>
      <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #334155;">
        Tim HR kami akan mengirimkan instruksi detail mengenai materi asesmen teknis/kompetensi secara berkala. Mohon pastikan email dan kontak Anda tetap aktif.
      </p>
    `;
  } else if (normalizedStatus === 'interview' || normalizedStatus === 'interviewed') {
    subject = `[Andima HRMS] Undangan Wawancara Kerja (Interview) - ${jobTitle}`;
    stageDescription = `
      <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #334155;">
        Kabar baik! Anda telah lolos ke tahap <strong>Wawancara (Interview)</strong> untuk posisi <strong>${jobTitle}</strong> di PT Andima Transportindo.
      </p>
    `;

    if (interviewDetails && interviewDetails.date) {
      interviewBoxHtml = `
        <div style="margin: 24px 0; padding: 20px; background-color: #f1f5f9; border-left: 4px solid #8b5cf6; border-radius: 8px;">
          <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #1e293b; font-weight: 700;">
            📅 Informasi Jadwal Interview
          </h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #334155;">
            <tr>
              <td style="padding: 6px 0; font-weight: 600; width: 140px;">Tanggal:</td>
              <td style="padding: 6px 0;">${interviewDetails.date}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: 600;">Waktu:</td>
              <td style="padding: 6px 0;">${interviewDetails.hour}:${interviewDetails.minute} WIB</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: 600;">Platform / Link:</td>
              <td style="padding: 6px 0;">
                <a href="${interviewDetails.meetLink}" style="color: #2563eb; text-decoration: underline; word-break: break-all;" target="_blank">
                  ${interviewDetails.meetLink}
                </a>
              </td>
            </tr>
          </table>
          <p style="margin: 14px 0 0 0; font-size: 12px; color: #64748b;">
            Mohon hadir 5-10 menit sebelum waktu wawancara dimulai dengan koneksi internet yang stabil.
          </p>
        </div>
      `;
    }
  } else if (normalizedStatus === 'offered') {
    subject = `[Andima HRMS] Penawaran Pekerjaan (Job Offer) - ${jobTitle}`;
    stageDescription = `
      <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #334155;">
        Selamat! Kami dengan senang hati menginformasikan bahwa Anda telah mencapai tahap <strong>Penawaran Kerja (Offering)</strong> untuk posisi <strong>${jobTitle}</strong>.
      </p>
      <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #334155;">
        Surat penawaran resmi (Offering Letter) beserta rincian kompensasi dan tanggal mulai bekerja akan segera disampaikan oleh Tim Human Capital kami.
      </p>
    `;
  } else if (normalizedStatus === 'rejected') {
    subject = `[Andima HRMS] Informasi Status Lamaran - ${jobTitle}`;
    stageDescription = `
      <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #334155;">
        Terima kasih atas minat dan partisipasi Anda dalam proses seleksi untuk posisi <strong>${jobTitle}</strong> di PT Andima Transportindo.
      </p>
      <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #334155;">
        Setelah mempertimbangkan dengan seksama, kami memutuskan untuk melanjutkan proses seleksi dengan kandidat lain yang kualifikasinya saat ini lebih mendekati kebutuhan posisi ini.
      </p>
      <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #334155;">
        Kami sangat mengapresiasi waktu dan usaha yang Anda dedikasikan. Kami akan tetap menyimpan profil Anda di pangkalan data talenta kami untuk peluang yang sesuai di masa depan.
      </p>
    `;
  } else {
    stageDescription = `
      <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #334155;">
        Status lamaran Anda untuk posisi <strong>${jobTitle}</strong> telah diperbarui menjadi <strong>${badge.label}</strong>.
      </p>
    `;
  }

  const html = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 16px;">
        <tr>
          <td align="center">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
              <!-- Header Bar -->
              <tr>
                <td style="background: linear-gradient(135deg, #0F2342 0%, #1e3a8a 100%); padding: 32px 32px 28px 32px; text-align: left;">
                  <div style="color: #93c5fd; font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 6px;">
                    PT ANDIMA TRANSPORTINDO
                  </div>
                  <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">
                    Andima HRMS - Rekrutmen
                  </h1>
                </td>
              </tr>

              <!-- Content Body -->
              <tr>
                <td style="padding: 32px 32px 24px 32px;">
                  <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #0f172a;">
                    Halo, ${candidateName}
                  </p>

                  <div style="margin: 0 0 20px 0; display: inline-block; padding: 6px 14px; background-color: ${badge.bg}; color: ${badge.text}; font-size: 12px; font-weight: 700; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.5px;">
                    Status: ${badge.label}
                  </div>

                  ${stageDescription}
                  ${interviewBoxHtml}

                  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 28px 0;" />

                  <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #64748b;">
                    Jika Anda memiliki pertanyaan lebih lanjut, silakan balas email ini atau hubungi tim rekrutmen kami di <a href="mailto:recruitment@andima.co.id" style="color: #2563eb; text-decoration: none;">recruitment@andima.co.id</a>.
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color: #f8fafc; padding: 20px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
                  <p style="margin: 0 0 6px 0; font-size: 12px; color: #64748b; font-weight: 600;">
                    PT Andima Transportindo
                  </p>
                  <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                    Menara MTH, Jakarta Selatan | Email ini dikirimkan secara otomatis oleh Andima HRMS.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  const text = `
Halo, ${candidateName}

Status lamaran kerja Anda untuk posisi ${jobTitle} telah diperbarui menjadi: ${badge.label}.

${interviewDetails ? `Jadwal Interview: ${interviewDetails.date} pukul ${interviewDetails.hour}:${interviewDetails.minute} WIB. Link: ${interviewDetails.meetLink}` : ''}

Salam,
Tim Rekrutmen PT Andima Transportindo
  `.trim();

  return { subject, html, text };
}

/**
 * Send status update email specifically to the candidate's registered email address
 * Executes safely without crashing the main application flow.
 */
export async function sendStatusUpdateEmail(params: StatusEmailParams): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  const { candidateEmail, candidateName, newStatus } = params;

  if (!candidateEmail || !candidateEmail.includes('@')) {
    console.warn(`[Squad D2 Email] Skipped email delivery: Invalid candidate email address "${candidateEmail}"`);
    return { success: false, error: 'Invalid candidate email' };
  }

  const startTime = Date.now();
  try {
    const transporter = getTransporter();
    const fromAddress = process.env.SMTP_FROM || 'PT Andima Transportindo <recruitment@andima.co.id>';
    const { subject, html, text } = generateEmailHtml(params);

    console.info(`[Squad D2 Email] Preparing email to candidate "${candidateName}" <${candidateEmail}>: Status -> ${newStatus}`);

    const info = await transporter.sendMail({
      from: fromAddress,
      to: candidateEmail,
      subject,
      text,
      html,
    });

    const elapsed = Date.now() - startTime;
    console.info(`[Squad D2 Email] Email successfully dispatched to <${candidateEmail}> in ${elapsed}ms (MessageId: ${info.messageId || 'dev-json'})`);
    console.info(`--------------------------------------------------------------------------------`);
    console.info(`📧 [SQUAD D2 NOTIFIKASI EMAIL KANDIDAT]`);
    console.info(`   Kepada      : ${candidateName} <${candidateEmail}>`);
    console.info(`   Subjek      : ${subject}`);
    console.info(`   Status Baru : ${newStatus.toUpperCase()}`);
    if (params.interviewDetails && params.interviewDetails.date) {
      console.info(`   Jadwal Meet : ${params.interviewDetails.date} @ ${params.interviewDetails.hour}:${params.interviewDetails.minute} WIB`);
      console.info(`   Link Meet   : ${params.interviewDetails.meetLink}`);
    }
    console.info(`--------------------------------------------------------------------------------`);

    return {
      success: true,
      messageId: info.messageId || 'dev-json',
    };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[Squad D2 Email] Error delivering email to <${candidateEmail}>:`, errorMsg);
    return {
      success: false,
      error: errorMsg,
    };
  }
}
