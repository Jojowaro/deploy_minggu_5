-- ====================================================================
-- SQUAD D2: RESTRUKTURISASI SKEMA MULTI-POSISI, STAGE REJECTION & ONBOARDING USER ID
-- Ticket: [Webdev/DB] Restrukturisasi Skema Multi-Posisi, Stage Rejection & Onboarding User ID
-- PIC: JOE DAVIDA (@Webdev)
-- Scope Rule: Hanya memodifikasi tabel/view dengan prefix d2_ (d2_candidates, d2_application_history, d2_applications, d2_accepted_employees)
-- ====================================================================

-- ====================================================================
-- ACCEPTANCE CRITERIA 1 & 4:
-- 1. Pemisahan relasi One-to-Many antara profil d2_candidates dan lamaran d2_application_history (d2_applications).
--    Setiap lamaran memiliki application_id dan application_date tersendiri.
-- 4. Kebijakan basis data: TIDAK menyertakan cronjob/script pembersihan tahunan (NO ANNUAL DATA PURGE).
--    Mekanisme penghapusan wajib menggunakan soft delete (is_deleted = TRUE).
-- ====================================================================

-- 1. Tambahkan kolom pendukung pada tabel utama profil pelamar: d2_candidates
ALTER TABLE public.d2_candidates
ADD COLUMN IF NOT EXISTS rejected_at_stage VARCHAR(50),
ADD COLUMN IF NOT EXISTS employee_user_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS initial_level VARCHAR(50),
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

-- Indeks performa soft delete pada d2_candidates
CREATE INDEX IF NOT EXISTS idx_d2_candidates_is_deleted ON public.d2_candidates(is_deleted);

-- ====================================================================
-- ACCEPTANCE CRITERIA 2 & 3:
-- 2. Penambahan kolom rejected_at_stage pada tabel lamaran saat status = 'rejected'
-- 3. Penambahan kolom employee_user_id dan initial_level saat status = 'accepted'
-- ====================================================================

-- 2. Tambahkan kolom pendukung pada tabel riwayat lamaran: d2_application_history
ALTER TABLE public.d2_application_history
ADD COLUMN IF NOT EXISTS rejected_at_stage VARCHAR(50),
ADD COLUMN IF NOT EXISTS employee_user_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS initial_level VARCHAR(50),
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

-- Indeks performa pencarian lamaran & soft delete
CREATE INDEX IF NOT EXISTS idx_d2_app_history_candidate_id ON public.d2_application_history(candidate_id);
CREATE INDEX IF NOT EXISTS idx_d2_app_history_is_deleted ON public.d2_application_history(is_deleted);
CREATE INDEX IF NOT EXISTS idx_d2_app_history_rejected_stage ON public.d2_application_history(rejected_at_stage);

-- Sinkronisasi data existing pada d2_application_history jika sudah ada data sebelumnya
UPDATE public.d2_application_history
SET employee_user_id = generated_user_id
WHERE employee_user_id IS NULL AND generated_user_id IS NOT NULL;

UPDATE public.d2_application_history
SET initial_level = CASE employment_type
    WHEN 'trainee' THEN 'Trainee'
    WHEN 'associate_trainee' THEN 'Associate Trainee'
    WHEN 'probation' THEN 'Probation'
    WHEN 'contract_permanent' THEN 'Contract / Permanent'
    ELSE employment_type
END
WHERE initial_level IS NULL AND employment_type IS NOT NULL;

-- ====================================================================
-- ACCEPTANCE CRITERIA 1: VIEW d2_applications (Alias & Integrasi Relasi One-to-Many)
-- Memetakan 1 pelamar (d2_candidates) ke banyak lamaran dengan application_id dan application_date tersendiri
-- ====================================================================

DROP VIEW IF EXISTS public.v_d2_applications CASCADE;
DROP VIEW IF EXISTS public.d2_applications CASCADE;

CREATE OR REPLACE VIEW public.d2_applications
WITH (security_invoker = true) AS
SELECT 
    app.id AS application_id,
    app.id,
    app.candidate_id,
    cand.full_name,
    cand.email,
    cand.nik,
    cand.phone_number,
    cand.registration_way,
    cand.cv_file_path,
    app.job_id,
    app.job_title,
    app.application_date,
    app.application_round,
    app.status,
    app.rejected_at_stage,
    COALESCE(app.employee_user_id, app.generated_user_id) AS employee_user_id,
    COALESCE(app.initial_level, 
        CASE app.employment_type
            WHEN 'trainee' THEN 'Trainee'
            WHEN 'associate_trainee' THEN 'Associate Trainee'
            WHEN 'probation' THEN 'Probation'
            WHEN 'contract_permanent' THEN 'Contract / Permanent'
            ELSE app.employment_type
        END
    ) AS initial_level,
    app.generated_user_id,
    app.employment_type,
    app.accepted_at,
    app.assessment_score,
    app.assessment_notes,
    app.rejection_reason,
    app.is_read_only,
    COALESCE(app.is_deleted, false) AS is_deleted,
    app.created_at
FROM public.d2_application_history app
LEFT JOIN public.d2_candidates cand ON app.candidate_id = cand.id;

-- Alias view v_d2_applications
CREATE OR REPLACE VIEW public.v_d2_applications
WITH (security_invoker = true) AS
SELECT * FROM public.d2_applications;

-- ====================================================================
-- GRANT ACCESS PERMISSIONS
-- ====================================================================
GRANT SELECT ON public.d2_applications TO anon, authenticated, service_role;
GRANT SELECT ON public.v_d2_applications TO anon, authenticated, service_role;

-- ====================================================================
-- KEBIJAKAN DATA & DOKUMENTASI (TR-D2-001 & Acceptance Criteria 4)
-- NO ANNUAL DATA PURGE (Tidak ada cronjob / trigger penghapusan tahunan).
-- Seluruh penghapusan data bersifat Soft Delete melalui kolom is_deleted = TRUE.
-- Catatan: View d2_accepted_employees TIDAK dimodifikasi agar integrasi Squad B2 MID tetap utuh dan stabil.
-- ====================================================================
COMMENT ON TABLE public.d2_candidates IS 'Squad D2 - Master data profil kandidat/pelamar. Kebijakan data: Soft delete only (is_deleted = TRUE), dilarang melakukan auto purge/cronjob tahunan.';
COMMENT ON TABLE public.d2_application_history IS 'Squad D2 - Rekam jejak seluruh lamaran pekerjaan (One-to-Many). Menyimpan stage rejection, employee_user_id, initial_level. Kebijakan data: Soft delete only.';
COMMENT ON VIEW public.d2_applications IS 'Squad D2 - View One-to-Many relasi lamaran pelamar dengan application_id dan application_date tersendiri.';
