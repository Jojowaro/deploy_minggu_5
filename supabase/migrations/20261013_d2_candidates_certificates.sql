-- ============================================================================
-- SQUAD D2: STORAGE BUCKET & CANDIDATES EXTENSIONS (Prefix: d2_)
-- Specification: Registration Form (Phone, Skills <= 20 words, Optional Certificate PDF)
-- Storage Bucket: d2_certificates (Max 5MB, PDF, prefix d2_)
-- ============================================================================

-- 1. Create d2_certificates storage bucket if not exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'd2_certificates',
    'd2_certificates',
    false,
    5242880,
    ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['application/pdf'];

-- 2. Optional columns on d2_candidates for skills and certificate_file_path
ALTER TABLE public.d2_candidates 
    ADD COLUMN IF NOT EXISTS phone_number VARCHAR(50) NULL,
    ADD COLUMN IF NOT EXISTS skills TEXT NULL,
    ADD COLUMN IF NOT EXISTS certificate_file_path TEXT NULL;
