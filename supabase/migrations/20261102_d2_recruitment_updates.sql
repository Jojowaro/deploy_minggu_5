-- ====================================================================
-- DOKUMEN ANALISIS PEMBAHARUAN SISTEM RECRUITMENT MANAGEMENT (SQUAD D2)
-- Catatan Review & Arahan Stakeholder (Mas Bram)
-- Project: PT Andima Transportindo HRMS
-- Module: Recruitment Pipeline & Candidate Lifecycle (Squad D2)
-- ====================================================================

-- 1. PEMBAHARUAN TABEL d2_candidates
-- Mendukung multi-posisi, tracking tanggal, dan fase penolakan spesifik
-- ====================================================================

-- Tambah kolom-kolom baru
ALTER TABLE d2_candidates
ADD COLUMN IF NOT EXISTS applied_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS stage VARCHAR(50) DEFAULT 'candidate'
 CHECK (stage IN ('candidate', 'screening', 'interview', 'offered', 'hired', 'assessment', 'offering', 'rejected')),
ADD COLUMN IF NOT EXISTS final_status VARCHAR(20) DEFAULT 'in_progress'
 CHECK (final_status IN ('in_progress', 'accepted', 'rejected', 'hired')),
ADD COLUMN IF NOT EXISTS rejected_at_stage VARCHAR(50), -- Mencatat fase gugur: candidate/screening/interview
ADD COLUMN IF NOT EXISTS skills_tagged BOOLEAN DEFAULT FALSE, -- Indikator status Not Counted Yet vs QUALIFIED
ADD COLUMN IF NOT EXISTS employee_tier VARCHAR(50) -- Diisi saat diterima: trainee, associate_trainee, staff
 CHECK (employee_tier IN ('trainee', 'associate_trainee', 'probationary_staff', 'permanent', 'contract'));

-- 2. TABEL PENJADWALAN INTERVIEW (d2_interview_schedules)
-- Mendukung wawancara Online dan Onsite
-- ====================================================================

CREATE TABLE IF NOT EXISTS d2_interview_schedules (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 candidate_id UUID NOT NULL REFERENCES d2_candidates(id) ON DELETE CASCADE,
 interviewer_id UUID,
 schedule_type VARCHAR(20) NOT NULL CHECK (schedule_type IN ('online', 'onsite')),
 schedule_datetime TIMESTAMPTZ NOT NULL,
 meeting_link TEXT, -- Diisi jika schedule_type = 'online'
 location_address TEXT, -- Diisi jika schedule_type = 'onsite' (misal: Pool Andima Cakung)
 room_name VARCHAR(100), -- Misal: Ruang Rapat B Lantai 2
 contact_person VARCHAR(100), -- PIC yang ditemui di lokasi
 notes TEXT,
 created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indeks performa jadwal
CREATE INDEX IF NOT EXISTS idx_d2_interview_candidate ON d2_interview_schedules (candidate_id);
