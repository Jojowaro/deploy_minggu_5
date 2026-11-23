-- ====================================================================
-- SQUAD D2: CANDIDATE CONVERSION & ACCEPTED EMPLOYEES VIEW
-- Specification: Recruitment Pipeline & Candidate Conversion (Squad D2)
-- Data Source: d2_application_history & d2_candidates
-- Target Consumers: Squad D3 (Employee Management) & Internal HRMS
-- ====================================================================

-- 1. Tambahkan kolom pendukung konversi status karyawan pada d2_application_history
ALTER TABLE public.d2_application_history
ADD COLUMN IF NOT EXISTS employment_type VARCHAR(50) 
    CHECK (employment_type IN ('trainee', 'associate_trainee', 'probation', 'contract_permanent')),
ADD COLUMN IF NOT EXISTS generated_user_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS rejected_at_stage VARCHAR(50);

-- 2. Buat PostgreSQL Database View: d2_accepted_employees
-- Mengambil data murni dari d2_application_history dan d2_candidates
CREATE OR REPLACE VIEW public.d2_accepted_employees
WITH (security_invoker = true) AS
SELECT 
    app.id AS application_id,
    cand.id AS candidate_id,
    app.generated_user_id,
    cand.full_name,
    cand.nik,
    cand.email,
    cand.phone_number,
    cand.cv_file_path,
    app.job_id,
    COALESCE(app.job_title, 'Staf Operasional') AS position_title,
    'Operasional Transportasi & Logistik'::VARCHAR(255) AS department,
    app.status,
    app.employment_type,
    CASE app.employment_type
        WHEN 'trainee' THEN 'Trainee (Program Pelatihan Magang / Pengemudi Baru)'
        WHEN 'associate_trainee' THEN 'Associate Trainee (Junior / Operasional Lapangan)'
        WHEN 'probation' THEN 'Probation (Masa Percobaan 3 Bulan)'
        WHEN 'contract_permanent' THEN 'Contract / Permanent (Karyawan Kontrak / Tetap)'
        ELSE 'Belum Ditentukan'
    END AS employment_type_label,
    cand.registration_way AS application_source,
    app.created_at AS applied_at,
    COALESCE(app.accepted_at, app.application_date, app.created_at) AS accepted_at
FROM public.d2_application_history app
INNER JOIN public.d2_candidates cand ON app.candidate_id = cand.id
WHERE LOWER(app.status) = 'accepted';

-- 3. Alias view: v_d2_accepted_employees (DOD Item 5) & d2_accepted_employee
CREATE OR REPLACE VIEW public.v_d2_accepted_employees
WITH (security_invoker = true) AS
SELECT * FROM public.d2_accepted_employees;

CREATE OR REPLACE VIEW public.d2_accepted_employee
WITH (security_invoker = true) AS
SELECT * FROM public.d2_accepted_employees;

-- 4. Berikan izin SELECT ke roles
GRANT SELECT ON public.d2_accepted_employees TO anon, authenticated, service_role;
GRANT SELECT ON public.v_d2_accepted_employees TO anon, authenticated, service_role;
GRANT SELECT ON public.d2_accepted_employee TO anon, authenticated, service_role;
