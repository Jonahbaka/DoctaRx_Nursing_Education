-- DailyMed-backed medication education records.
-- User ownership is scoped by the authenticated nursing user key and tenant key.

CREATE TABLE IF NOT EXISTS nursing_medication_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_key TEXT NOT NULL,
  user_key TEXT NOT NULL,
  daily_med_set_id UUID NOT NULL,
  medication_name VARCHAR(255) NOT NULL,
  title VARCHAR(160) NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  nursing_considerations TEXT NOT NULL DEFAULT '',
  warnings TEXT NOT NULL DEFAULT '',
  administration_reminders TEXT NOT NULL DEFAULT '',
  patient_education TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nursing_medication_quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_key TEXT NOT NULL,
  user_key TEXT NOT NULL,
  daily_med_set_id UUID NOT NULL,
  medication_name VARCHAR(255) NOT NULL,
  difficulty VARCHAR(24) NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  score NUMERIC(5,2) NOT NULL CHECK (score >= 0 AND score <= 100),
  total_questions INTEGER NOT NULL CHECK (total_questions > 0),
  answers JSONB NOT NULL DEFAULT '[]'::jsonb,
  question_sources JSONB NOT NULL DEFAULT '[]'::jsonb,
  completion_status VARCHAR(24) NOT NULL DEFAULT 'completed' CHECK (completion_status IN ('in_progress', 'completed')),
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nursing_medication_flashcard_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_key TEXT NOT NULL,
  user_key TEXT NOT NULL,
  daily_med_set_id UUID NOT NULL,
  medication_name VARCHAR(255) NOT NULL,
  card_key VARCHAR(80) NOT NULL,
  status VARCHAR(24) NOT NULL CHECK (status IN ('know_it', 'review_again')),
  last_reviewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  review_count INTEGER NOT NULL DEFAULT 1 CHECK (review_count >= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_key, user_key, daily_med_set_id, card_key)
);

CREATE INDEX IF NOT EXISTS idx_nursing_medication_notes_owner
  ON nursing_medication_notes(tenant_key, user_key, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_nursing_medication_notes_medication
  ON nursing_medication_notes(tenant_key, user_key, daily_med_set_id);
CREATE INDEX IF NOT EXISTS idx_nursing_medication_quiz_attempts_owner
  ON nursing_medication_quiz_attempts(tenant_key, user_key, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_nursing_medication_quiz_attempts_medication
  ON nursing_medication_quiz_attempts(tenant_key, user_key, daily_med_set_id);
CREATE INDEX IF NOT EXISTS idx_nursing_medication_flashcards_owner
  ON nursing_medication_flashcard_progress(tenant_key, user_key, last_reviewed_at DESC);

DROP TRIGGER IF EXISTS nursing_medication_notes_updated_at ON nursing_medication_notes;
CREATE TRIGGER nursing_medication_notes_updated_at
  BEFORE UPDATE ON nursing_medication_notes
  FOR EACH ROW EXECUTE FUNCTION nursing_update_updated_at_column();

DROP TRIGGER IF EXISTS nursing_medication_flashcards_updated_at ON nursing_medication_flashcard_progress;
CREATE TRIGGER nursing_medication_flashcards_updated_at
  BEFORE UPDATE ON nursing_medication_flashcard_progress
  FOR EACH ROW EXECUTE FUNCTION nursing_update_updated_at_column();
