import { NextRequest, NextResponse } from 'next/server';
import { submitCandidateRegistration } from '@/app/squad-d2/src/app/register/actions';

/**
 * POST /api/register
 * Endpoint pendaftaran pelamar multi-jalur dengan upload CV
 * Mendukung format:
 * 1. multipart/form-data (standar formulir dengan file cvFile)
 * 2. application/json (untuk testing cepat di Postman tanpa unggah file)
 */
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';

    let formData: FormData;

    if (contentType.includes('multipart/form-data')) {
      // Menerima multipart/form-data langsung dari form atau Postman form-data
      formData = await request.formData();
    } else if (contentType.includes('application/json')) {
      // Menerima JSON dari Postman raw JSON
      const json = await request.json();
      formData = new FormData();
      if (json.fullName) formData.append('fullName', json.fullName);
      if (json.email) formData.append('email', json.email);
      if (json.phoneNumber) formData.append('phoneNumber', json.phoneNumber);
      if (json.registrationWay) formData.append('registrationWay', json.registrationWay);
      if (json.jobId) formData.append('jobId', json.jobId);

      // Buat file PDF minimal yang valid untuk pengujian via JSON
      const dummyPdfBytes = new Uint8Array([
        0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a, 0x25, 0xd0, 0xd4, 0xc5, 0xd8, 0x0a,
        0x31, 0x20, 0x30, 0x20, 0x6f, 0x62, 0x6a, 0x0a, 0x3c, 0x3c, 0x0a, 0x2f, 0x54, 0x79, 0x70,
        0x65, 0x20, 0x2f, 0x43, 0x61, 0x74, 0x61, 0x6c, 0x6f, 0x67, 0x0a, 0x3e, 0x3e, 0x0a, 0x65,
        0x6e, 0x64, 0x6f, 0x62, 0x6a, 0x0a, 0x25, 0x25, 0x45, 0x4f, 0x46,
      ]);
      const pdfBlob = new Blob([dummyPdfBytes], { type: 'application/pdf' });
      formData.append('cvFile', pdfBlob, 'resume_sample.pdf');
    } else {
      return NextResponse.json(
        {
          success: false,
          message: 'Content-Type harus multipart/form-data atau application/json',
        },
        { status: 415 }
      );
    }

    const result = await submitCandidateRegistration(formData);

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Terjadi kegagalan saat registrasi';
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
}
