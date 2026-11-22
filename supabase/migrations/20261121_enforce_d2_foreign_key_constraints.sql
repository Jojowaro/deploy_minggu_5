-- ====================================================================
-- SQUAD D2: ENFORCE DATABASE CONSTRAINTS (ON DELETE RESTRICT)
-- Ticket: [Backend/DB] Audit & Penerapan Database Constraints (FK, Unique, Not Null)
-- Description: Menjamin tidak ada data yatim (orphan data) di level basis data.
-- Acceptance Criteria:
-- [x] Seluruh relasi antar tabel (d2_application_history ke d2_candidates 
--     dan d1_job_positions) memiliki Foreign Key Constraint yang aktif (ON DELETE RESTRICT).
-- ====================================================================

-- 1. Perbarui Foreign Key candidate_id pada d2_application_history
-- Mencegah penghapusan data kandidat jika masih memiliki riwayat pendaftaran
ALTER TABLE public.d2_application_history
DROP CONSTRAINT IF EXISTS d2_application_history_candidate_id_fkey;

ALTER TABLE public.d2_application_history
ADD CONSTRAINT d2_application_history_candidate_id_fkey
FOREIGN KEY (candidate_id)
REFERENCES public.d2_candidates(id)
ON DELETE RESTRICT;

-- 2. Perbarui Foreign Key job_id pada d2_application_history
-- Mencegah penghapusan data posisi jabatan jika masih dirujuk oleh riwayat pendaftaran
ALTER TABLE public.d2_application_history
DROP CONSTRAINT IF EXISTS d2_application_history_job_id_fkey;

ALTER TABLE public.d2_application_history
ADD CONSTRAINT d2_application_history_job_id_fkey
FOREIGN KEY (job_id)
REFERENCES public.d1_job_positions(id)
ON DELETE RESTRICT;

-- 3. Perketat Foreign Key pada tabel evaluasi d2_fit_proper_evaluations
-- Menjamin audit kualifikasi tidak menjadi orphan data saat kandidat/posisi dihapus
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'd2_fit_proper_evaluations') THEN
    ALTER TABLE public.d2_fit_proper_evaluations DROP CONSTRAINT IF EXISTS d2_fit_proper_evaluations_candidate_id_fkey;
    ALTER TABLE public.d2_fit_proper_evaluations ADD CONSTRAINT d2_fit_proper_evaluations_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES public.d2_candidates(id) ON DELETE RESTRICT;

    ALTER TABLE public.d2_fit_proper_evaluations DROP CONSTRAINT IF EXISTS d2_fit_proper_evaluations_position_id_fkey;
    ALTER TABLE public.d2_fit_proper_evaluations ADD CONSTRAINT d2_fit_proper_evaluations_position_id_fkey FOREIGN KEY (position_id) REFERENCES public.d1_job_positions(id) ON DELETE RESTRICT;
  END IF;
END $$;

-- 4. Perketat Foreign Key pada tabel audit logs d2_audit_logs
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'd2_audit_logs') THEN
    ALTER TABLE public.d2_audit_logs DROP CONSTRAINT IF EXISTS d2_audit_logs_candidate_id_fkey;
    ALTER TABLE public.d2_audit_logs ADD CONSTRAINT d2_audit_logs_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES public.d2_candidates(id) ON DELETE RESTRICT;
  END IF;
END $$;
