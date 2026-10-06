-- ============================================================================
-- SQUAD D2: FIT & PROPER EVALUATIONS TABLE (Prefix: d2_)
-- Specification: FR-D2-003 (Alat Analisis Fit & Proper Integrasi Lintas-Squad)
-- Technical Standard: TR-D2-002 TR-02 (Prefix d2_), TR-01 (RLS), TR-10 (Indexing)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.d2_fit_proper_evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID NOT NULL REFERENCES public.d2_candidates(id) ON DELETE CASCADE,
    position_id UUID REFERENCES public.d1_job_positions(id) ON DELETE SET NULL,
    threshold_percentage NUMERIC(5,2) DEFAULT 80.00,
    total_requirements INT DEFAULT 0,
    fulfilled_requirements INT DEFAULT 0,
    -- Algoritma pengurangan sesuai Trello Card (target syarat - pelamar penuhi)
    missing_requirements INT DEFAULT 0,
    overall_match_percentage NUMERIC(5,2) DEFAULT 0.00,
    capability_fit_status VARCHAR(20) DEFAULT 'UNFULLFILLED' CHECK (capability_fit_status IN ('FULLFILLED', 'UNFULLFILLED')),
    -- Detail item persyaratan (nama, status Fulfilled/Unfulfilled, flag is_deleted)
    evaluation_details JSONB DEFAULT '[]'::jsonb,
    evaluator_name VARCHAR(100) DEFAULT 'HR Manager',
    decision VARCHAR(30) NULL CHECK (decision IN ('Lolos Fit & Proper', 'Tolak', 'Pending')),
    notes TEXT NULL,
    -- Standar Soft Delete: dilarang melakukan hard delete
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR QUERY OPTIMIZATION (TR-D2-002 TR-10)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_d2_fit_proper_candidate_id ON public.d2_fit_proper_evaluations(candidate_id);
CREATE INDEX IF NOT EXISTS idx_d2_fit_proper_position_id ON public.d2_fit_proper_evaluations(position_id);
CREATE INDEX IF NOT EXISTS idx_d2_fit_proper_status ON public.d2_fit_proper_evaluations(capability_fit_status);
CREATE INDEX IF NOT EXISTS idx_d2_fit_proper_is_deleted ON public.d2_fit_proper_evaluations(is_deleted);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) (TR-D2-001 TR-01)
-- ============================================================================
ALTER TABLE public.d2_fit_proper_evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public/service-role read-write to d2_fit_proper_evaluations"
    ON public.d2_fit_proper_evaluations
    FOR ALL
    USING (true)
    WITH CHECK (true);

COMMENT ON TABLE public.d2_fit_proper_evaluations IS 'Squad D2 - Evaluasi Fit & Proper kandidat hasil integrasi kualifikasi lintas modul D1';
