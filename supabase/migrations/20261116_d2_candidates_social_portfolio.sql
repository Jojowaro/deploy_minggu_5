-- ============================================================================
-- SQUAD D2: REGISTRATION FORM EXTENSIONS - SOCIAL MEDIA & PORTFOLIO
-- Specification: Registration Form (Social Media Username, Skill Portofolio Link)
-- Target Table: public.d2_candidates
-- ============================================================================

ALTER TABLE public.d2_candidates 
    ADD COLUMN IF NOT EXISTS social_media VARCHAR(255) NULL,
    ADD COLUMN IF NOT EXISTS portfolio_url TEXT NULL;
