-- DoctaRx Nursing Education & Clinical Training Platform
-- Standalone schema for the Nigeria nursing education pilot.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE OR REPLACE FUNCTION nursing_update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS nursing_institutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_key TEXT UNIQUE,
  name VARCHAR(255) NOT NULL,
  short_name VARCHAR(80),
  institution_type VARCHAR(120),
  country VARCHAR(80) NOT NULL DEFAULT 'Nigeria',
  state VARCHAR(120),
  city VARCHAR(120),
  status VARCHAR(60) NOT NULL DEFAULT 'active',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nursing_departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_key TEXT UNIQUE,
  institution_id UUID NOT NULL REFERENCES nursing_institutions(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  faculty VARCHAR(255),
  status VARCHAR(60) NOT NULL DEFAULT 'active',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nursing_academic_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_key TEXT UNIQUE,
  institution_id UUID NOT NULL REFERENCES nursing_institutions(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES nursing_departments(id) ON DELETE CASCADE,
  name VARCHAR(180) NOT NULL,
  status VARCHAR(60) NOT NULL DEFAULT 'planning',
  starts_on DATE,
  ends_on DATE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nursing_cohorts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_key TEXT UNIQUE,
  institution_id UUID NOT NULL REFERENCES nursing_institutions(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES nursing_departments(id) ON DELETE CASCADE,
  academic_session_id UUID NOT NULL REFERENCES nursing_academic_sessions(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  level VARCHAR(40) NOT NULL,
  student_count INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(60) NOT NULL DEFAULT 'active',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nursing_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_key TEXT UNIQUE,
  institution_id UUID REFERENCES nursing_institutions(id) ON DELETE SET NULL,
  department_id UUID REFERENCES nursing_departments(id) ON DELETE SET NULL,
  academic_session_id UUID REFERENCES nursing_academic_sessions(id) ON DELETE SET NULL,
  cohort_id UUID REFERENCES nursing_cohorts(id) ON DELETE SET NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255),
  first_name VARCHAR(120) NOT NULL,
  last_name VARCHAR(120) NOT NULL,
  title VARCHAR(180),
  matric_number VARCHAR(120),
  primary_role VARCHAR(80) NOT NULL,
  status VARCHAR(60) NOT NULL DEFAULT 'active',
  access_status VARCHAR(60) DEFAULT 'active',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nursing_user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES nursing_users(id) ON DELETE CASCADE,
  institution_id UUID REFERENCES nursing_institutions(id) ON DELETE CASCADE,
  department_id UUID REFERENCES nursing_departments(id) ON DELETE CASCADE,
  role VARCHAR(80) NOT NULL,
  status VARCHAR(60) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, role, institution_id, department_id)
);

CREATE TABLE IF NOT EXISTS nursing_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_key TEXT UNIQUE,
  institution_id UUID NOT NULL REFERENCES nursing_institutions(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES nursing_departments(id) ON DELETE CASCADE,
  academic_session_id UUID REFERENCES nursing_academic_sessions(id) ON DELETE SET NULL,
  lecturer_id UUID REFERENCES nursing_users(id) ON DELETE SET NULL,
  code VARCHAR(60) NOT NULL,
  title VARCHAR(255) NOT NULL,
  status VARCHAR(60) NOT NULL DEFAULT 'draft',
  adoption_rate NUMERIC(5,2) DEFAULT 0,
  completion_rate NUMERIC(5,2) DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nursing_course_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_key TEXT UNIQUE,
  course_id UUID NOT NULL REFERENCES nursing_courses(id) ON DELETE CASCADE,
  institution_id UUID NOT NULL REFERENCES nursing_institutions(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES nursing_departments(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  sequence INTEGER NOT NULL DEFAULT 1,
  status VARCHAR(60) NOT NULL DEFAULT 'ready',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nursing_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_key TEXT UNIQUE,
  course_id UUID NOT NULL REFERENCES nursing_courses(id) ON DELETE CASCADE,
  course_module_id UUID REFERENCES nursing_course_modules(id) ON DELETE SET NULL,
  institution_id UUID NOT NULL REFERENCES nursing_institutions(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES nursing_departments(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content_type VARCHAR(80) NOT NULL DEFAULT 'reading',
  content_body TEXT,
  material_url TEXT,
  estimated_minutes INTEGER DEFAULT 0,
  sequence INTEGER NOT NULL DEFAULT 1,
  status VARCHAR(60) NOT NULL DEFAULT 'ready',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nursing_quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_key TEXT UNIQUE,
  course_id UUID NOT NULL REFERENCES nursing_courses(id) ON DELETE CASCADE,
  institution_id UUID NOT NULL REFERENCES nursing_institutions(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES nursing_departments(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  status VARCHAR(60) NOT NULL DEFAULT 'ready',
  average_score NUMERIC(5,2) DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nursing_quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_key TEXT UNIQUE,
  quiz_id UUID NOT NULL REFERENCES nursing_quizzes(id) ON DELETE CASCADE,
  institution_id UUID NOT NULL REFERENCES nursing_institutions(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES nursing_departments(id) ON DELETE CASCADE,
  question_type VARCHAR(60) NOT NULL DEFAULT 'multiple_choice',
  prompt TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  correct_answer JSONB,
  points INTEGER NOT NULL DEFAULT 1,
  sequence INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nursing_quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_key TEXT UNIQUE,
  quiz_id UUID NOT NULL REFERENCES nursing_quizzes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES nursing_users(id) ON DELETE CASCADE,
  institution_id UUID NOT NULL REFERENCES nursing_institutions(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES nursing_departments(id) ON DELETE CASCADE,
  cohort_id UUID REFERENCES nursing_cohorts(id) ON DELETE SET NULL,
  score NUMERIC(5,2) DEFAULT 0,
  status VARCHAR(60) NOT NULL DEFAULT 'submitted',
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nursing_quiz_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES nursing_quiz_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES nursing_quiz_questions(id) ON DELETE CASCADE,
  institution_id UUID NOT NULL REFERENCES nursing_institutions(id) ON DELETE CASCADE,
  answer JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_correct BOOLEAN,
  points_awarded NUMERIC(6,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nursing_simulation_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_key TEXT UNIQUE,
  institution_id UUID NOT NULL REFERENCES nursing_institutions(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES nursing_departments(id) ON DELETE CASCADE,
  created_by UUID REFERENCES nursing_users(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  patient_name VARCHAR(180) NOT NULL,
  patient_age INTEGER,
  patient_sex VARCHAR(40),
  setting VARCHAR(255),
  chief_complaint TEXT NOT NULL,
  vital_signs JSONB NOT NULL DEFAULT '{}'::jsonb,
  assessment_steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  red_flags JSONB NOT NULL DEFAULT '[]'::jsonb,
  expected_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  feedback TEXT,
  score NUMERIC(5,2) DEFAULT 0,
  status VARCHAR(60) NOT NULL DEFAULT 'active',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nursing_simulation_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_case_id UUID NOT NULL REFERENCES nursing_simulation_cases(id) ON DELETE CASCADE,
  institution_id UUID NOT NULL REFERENCES nursing_institutions(id) ON DELETE CASCADE,
  step_type VARCHAR(80) NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT,
  sequence INTEGER NOT NULL DEFAULT 1,
  scoring_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nursing_simulation_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_key TEXT UNIQUE,
  simulation_case_id UUID NOT NULL REFERENCES nursing_simulation_cases(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES nursing_users(id) ON DELETE CASCADE,
  institution_id UUID NOT NULL REFERENCES nursing_institutions(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES nursing_departments(id) ON DELETE CASCADE,
  cohort_id UUID REFERENCES nursing_cohorts(id) ON DELETE SET NULL,
  score NUMERIC(5,2) DEFAULT 0,
  status VARCHAR(60) NOT NULL DEFAULT 'submitted',
  lecturer_comments TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nursing_simulation_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES nursing_simulation_attempts(id) ON DELETE CASCADE,
  simulation_step_id UUID REFERENCES nursing_simulation_steps(id) ON DELETE SET NULL,
  institution_id UUID NOT NULL REFERENCES nursing_institutions(id) ON DELETE CASCADE,
  response JSONB NOT NULL DEFAULT '{}'::jsonb,
  score NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nursing_telehealth_lab_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_key TEXT UNIQUE,
  institution_id UUID NOT NULL REFERENCES nursing_institutions(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES nursing_departments(id) ON DELETE CASCADE,
  student_id UUID REFERENCES nursing_users(id) ON DELETE SET NULL,
  lecturer_id UUID REFERENCES nursing_users(id) ON DELETE SET NULL,
  simulation_case_id UUID REFERENCES nursing_simulation_cases(id) ON DELETE SET NULL,
  role_play_mode VARCHAR(60) NOT NULL DEFAULT 'nurse',
  status VARCHAR(60) NOT NULL DEFAULT 'draft',
  rubric_score NUMERIC(5,2) DEFAULT 0,
  feedback TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nursing_telehealth_lab_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES nursing_telehealth_lab_sessions(id) ON DELETE CASCADE,
  institution_id UUID NOT NULL REFERENCES nursing_institutions(id) ON DELETE CASCADE,
  student_id UUID REFERENCES nursing_users(id) ON DELETE SET NULL,
  triage_checklist JSONB NOT NULL DEFAULT '[]'::jsonb,
  communication_checklist JSONB NOT NULL DEFAULT '[]'::jsonb,
  documentation_note TEXT,
  status VARCHAR(60) NOT NULL DEFAULT 'submitted',
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nursing_clinical_logbook_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_key TEXT UNIQUE,
  institution_id UUID NOT NULL REFERENCES nursing_institutions(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES nursing_departments(id) ON DELETE CASCADE,
  academic_session_id UUID REFERENCES nursing_academic_sessions(id) ON DELETE SET NULL,
  cohort_id UUID REFERENCES nursing_cohorts(id) ON DELETE SET NULL,
  student_id UUID NOT NULL REFERENCES nursing_users(id) ON DELETE CASCADE,
  supervisor_id UUID REFERENCES nursing_users(id) ON DELETE SET NULL,
  clinical_site VARCHAR(255) NOT NULL,
  ward_unit VARCHAR(180),
  posting_date DATE NOT NULL,
  hours_completed NUMERIC(6,2) NOT NULL DEFAULT 0,
  encounter_category VARCHAR(180),
  reflection TEXT,
  status VARCHAR(60) NOT NULL DEFAULT 'pending',
  supervisor_comments TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nursing_clinical_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_key TEXT UNIQUE,
  institution_id UUID NOT NULL REFERENCES nursing_institutions(id) ON DELETE CASCADE,
  department_id UUID REFERENCES nursing_departments(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(120),
  status VARCHAR(60) NOT NULL DEFAULT 'active',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nursing_logbook_skill_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  logbook_entry_id UUID NOT NULL REFERENCES nursing_clinical_logbook_entries(id) ON DELETE CASCADE,
  clinical_skill_id UUID NOT NULL REFERENCES nursing_clinical_skills(id) ON DELETE CASCADE,
  institution_id UUID NOT NULL REFERENCES nursing_institutions(id) ON DELETE CASCADE,
  supervisor_id UUID REFERENCES nursing_users(id) ON DELETE SET NULL,
  status VARCHAR(60) NOT NULL DEFAULT 'pending',
  signed_off_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(logbook_entry_id, clinical_skill_id)
);

CREATE TABLE IF NOT EXISTS nursing_supervisor_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  logbook_entry_id UUID NOT NULL REFERENCES nursing_clinical_logbook_entries(id) ON DELETE CASCADE,
  supervisor_id UUID NOT NULL REFERENCES nursing_users(id) ON DELETE CASCADE,
  institution_id UUID NOT NULL REFERENCES nursing_institutions(id) ON DELETE CASCADE,
  status VARCHAR(60) NOT NULL,
  comments TEXT,
  reviewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nursing_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_key TEXT UNIQUE,
  institution_id UUID NOT NULL REFERENCES nursing_institutions(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES nursing_departments(id) ON DELETE CASCADE,
  academic_session_id UUID REFERENCES nursing_academic_sessions(id) ON DELETE SET NULL,
  student_id UUID NOT NULL REFERENCES nursing_users(id) ON DELETE CASCADE,
  certificate_type VARCHAR(120) NOT NULL,
  program_name VARCHAR(255) NOT NULL,
  status VARCHAR(60) NOT NULL DEFAULT 'eligible',
  issue_date DATE,
  verification_code VARCHAR(120) UNIQUE,
  verification_url TEXT,
  issued_by UUID REFERENCES nursing_users(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nursing_payment_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_key TEXT UNIQUE,
  institution_id UUID NOT NULL REFERENCES nursing_institutions(id) ON DELETE CASCADE,
  department_id UUID REFERENCES nursing_departments(id) ON DELETE SET NULL,
  academic_session_id UUID REFERENCES nursing_academic_sessions(id) ON DELETE SET NULL,
  student_id UUID REFERENCES nursing_users(id) ON DELETE SET NULL,
  payment_status VARCHAR(60) NOT NULL DEFAULT 'unpaid',
  access_status VARCHAR(60) NOT NULL DEFAULT 'inactive',
  amount_expected NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency VARCHAR(10) NOT NULL DEFAULT 'NGN',
  payment_reference VARCHAR(180),
  receipt_status VARCHAR(80),
  verified_by UUID REFERENCES nursing_users(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nursing_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_key TEXT UNIQUE,
  institution_id UUID NOT NULL REFERENCES nursing_institutions(id) ON DELETE CASCADE,
  department_id UUID REFERENCES nursing_departments(id) ON DELETE SET NULL,
  created_by UUID REFERENCES nursing_users(id) ON DELETE SET NULL,
  audience VARCHAR(80) NOT NULL DEFAULT 'all',
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  status VARCHAR(60) NOT NULL DEFAULT 'published',
  published_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nursing_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_key TEXT UNIQUE,
  institution_id UUID NOT NULL REFERENCES nursing_institutions(id) ON DELETE CASCADE,
  department_id UUID REFERENCES nursing_departments(id) ON DELETE SET NULL,
  report_type VARCHAR(120) NOT NULL,
  title VARCHAR(255) NOT NULL,
  status VARCHAR(60) NOT NULL DEFAULT 'draft',
  summary TEXT,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  generated_by UUID REFERENCES nursing_users(id) ON DELETE SET NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nursing_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID REFERENCES nursing_institutions(id) ON DELETE SET NULL,
  department_id UUID REFERENCES nursing_departments(id) ON DELETE SET NULL,
  user_id UUID REFERENCES nursing_users(id) ON DELETE SET NULL,
  action VARCHAR(120) NOT NULL,
  resource_type VARCHAR(120) NOT NULL,
  resource_id UUID,
  ip_address VARCHAR(80),
  user_agent TEXT,
  old_values JSONB,
  new_values JSONB,
  success BOOLEAN NOT NULL DEFAULT TRUE,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nursing_files_or_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID REFERENCES nursing_institutions(id) ON DELETE SET NULL,
  department_id UUID REFERENCES nursing_departments(id) ON DELETE SET NULL,
  uploaded_by UUID REFERENCES nursing_users(id) ON DELETE SET NULL,
  owner_user_id UUID REFERENCES nursing_users(id) ON DELETE SET NULL,
  related_resource_type VARCHAR(120),
  related_resource_id UUID,
  original_name TEXT NOT NULL,
  stored_name TEXT,
  mime_type VARCHAR(180),
  size_bytes BIGINT DEFAULT 0,
  storage_path TEXT,
  status VARCHAR(60) NOT NULL DEFAULT 'available',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nursing_user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES nursing_users(id) ON DELETE CASCADE,
  institution_id UUID NOT NULL REFERENCES nursing_institutions(id) ON DELETE CASCADE,
  department_id UUID REFERENCES nursing_departments(id) ON DELETE SET NULL,
  academic_session_id UUID REFERENCES nursing_academic_sessions(id) ON DELETE SET NULL,
  cohort_id UUID REFERENCES nursing_cohorts(id) ON DELETE SET NULL,
  avatar_file_id UUID REFERENCES nursing_files_or_uploads(id) ON DELETE SET NULL,
  phone VARCHAR(60),
  bio TEXT,
  skills JSONB NOT NULL DEFAULT '[]'::jsonb,
  interests JSONB NOT NULL DEFAULT '[]'::jsonb,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  status VARCHAR(60) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nursing_course_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_key TEXT UNIQUE,
  course_id UUID NOT NULL REFERENCES nursing_courses(id) ON DELETE CASCADE,
  institution_id UUID NOT NULL REFERENCES nursing_institutions(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES nursing_departments(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  sequence INTEGER NOT NULL DEFAULT 1,
  status VARCHAR(60) NOT NULL DEFAULT 'draft',
  created_by UUID REFERENCES nursing_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nursing_lesson_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES nursing_lessons(id) ON DELETE CASCADE,
  institution_id UUID NOT NULL REFERENCES nursing_institutions(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES nursing_users(id) ON DELETE SET NULL,
  resource_type VARCHAR(80) NOT NULL DEFAULT 'file',
  title VARCHAR(255) NOT NULL,
  resource_url TEXT,
  file_id UUID REFERENCES nursing_files_or_uploads(id) ON DELETE SET NULL,
  status VARCHAR(60) NOT NULL DEFAULT 'available',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nursing_course_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_key TEXT UNIQUE,
  institution_id UUID NOT NULL REFERENCES nursing_institutions(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES nursing_departments(id) ON DELETE CASCADE,
  academic_session_id UUID REFERENCES nursing_academic_sessions(id) ON DELETE SET NULL,
  cohort_id UUID REFERENCES nursing_cohorts(id) ON DELETE SET NULL,
  course_id UUID NOT NULL REFERENCES nursing_courses(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES nursing_users(id) ON DELETE CASCADE,
  status VARCHAR(60) NOT NULL DEFAULT 'active',
  progress_percent NUMERIC(5,2) DEFAULT 0,
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(course_id, student_id)
);

CREATE TABLE IF NOT EXISTS nursing_lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID REFERENCES nursing_course_enrollments(id) ON DELETE CASCADE,
  institution_id UUID NOT NULL REFERENCES nursing_institutions(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES nursing_courses(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES nursing_lessons(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES nursing_users(id) ON DELETE CASCADE,
  status VARCHAR(60) NOT NULL DEFAULT 'not_started',
  progress_percent NUMERIC(5,2) DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(lesson_id, student_id)
);

CREATE TABLE IF NOT EXISTS nursing_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_key TEXT UNIQUE,
  institution_id UUID NOT NULL REFERENCES nursing_institutions(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES nursing_departments(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES nursing_courses(id) ON DELETE CASCADE,
  created_by UUID REFERENCES nursing_users(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  instructions TEXT,
  due_date TIMESTAMPTZ,
  max_score NUMERIC(8,2) NOT NULL DEFAULT 100,
  rubric JSONB NOT NULL DEFAULT '[]'::jsonb,
  status VARCHAR(60) NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nursing_assignment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_key TEXT UNIQUE,
  institution_id UUID NOT NULL REFERENCES nursing_institutions(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES nursing_departments(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES nursing_courses(id) ON DELETE CASCADE,
  assignment_id UUID NOT NULL REFERENCES nursing_assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES nursing_users(id) ON DELETE CASCADE,
  submission_text TEXT,
  attachment_file_id UUID REFERENCES nursing_files_or_uploads(id) ON DELETE SET NULL,
  status VARCHAR(60) NOT NULL DEFAULT 'submitted',
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nursing_grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_key TEXT UNIQUE,
  institution_id UUID NOT NULL REFERENCES nursing_institutions(id) ON DELETE CASCADE,
  department_id UUID REFERENCES nursing_departments(id) ON DELETE SET NULL,
  course_id UUID REFERENCES nursing_courses(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES nursing_users(id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES nursing_assignments(id) ON DELETE SET NULL,
  submission_id UUID REFERENCES nursing_assignment_submissions(id) ON DELETE SET NULL,
  quiz_attempt_id UUID REFERENCES nursing_quiz_attempts(id) ON DELETE SET NULL,
  simulation_attempt_id UUID REFERENCES nursing_simulation_attempts(id) ON DELETE SET NULL,
  telehealth_lab_session_id UUID REFERENCES nursing_telehealth_lab_sessions(id) ON DELETE SET NULL,
  grade_type VARCHAR(80) NOT NULL,
  score NUMERIC(8,2),
  max_score NUMERIC(8,2) NOT NULL DEFAULT 100,
  status VARCHAR(60) NOT NULL DEFAULT 'draft',
  graded_by UUID REFERENCES nursing_users(id) ON DELETE SET NULL,
  graded_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nursing_grade_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grade_id UUID NOT NULL REFERENCES nursing_grades(id) ON DELETE CASCADE,
  author_id UUID REFERENCES nursing_users(id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nursing_course_discussions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_key TEXT UNIQUE,
  institution_id UUID NOT NULL REFERENCES nursing_institutions(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES nursing_departments(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES nursing_courses(id) ON DELETE CASCADE,
  author_id UUID REFERENCES nursing_users(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  status VARCHAR(60) NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nursing_course_discussion_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discussion_id UUID NOT NULL REFERENCES nursing_course_discussions(id) ON DELETE CASCADE,
  author_id UUID REFERENCES nursing_users(id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  status VARCHAR(60) NOT NULL DEFAULT 'published',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nursing_timeline_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_key TEXT UNIQUE,
  institution_id UUID NOT NULL REFERENCES nursing_institutions(id) ON DELETE CASCADE,
  department_id UUID REFERENCES nursing_departments(id) ON DELETE SET NULL,
  cohort_id UUID REFERENCES nursing_cohorts(id) ON DELETE SET NULL,
  course_id UUID REFERENCES nursing_courses(id) ON DELETE SET NULL,
  author_id UUID REFERENCES nursing_users(id) ON DELETE SET NULL,
  scope VARCHAR(80) NOT NULL DEFAULT 'department',
  post_type VARCHAR(80) NOT NULL DEFAULT 'post',
  title VARCHAR(255),
  body TEXT NOT NULL,
  pinned BOOLEAN NOT NULL DEFAULT FALSE,
  status VARCHAR(60) NOT NULL DEFAULT 'published',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nursing_timeline_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES nursing_timeline_posts(id) ON DELETE CASCADE,
  author_id UUID REFERENCES nursing_users(id) ON DELETE SET NULL,
  parent_comment_id UUID REFERENCES nursing_timeline_comments(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  status VARCHAR(60) NOT NULL DEFAULT 'published',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nursing_timeline_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES nursing_timeline_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES nursing_users(id) ON DELETE CASCADE,
  reaction_type VARCHAR(60) NOT NULL DEFAULT 'like',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(post_id, user_id, reaction_type)
);

CREATE TABLE IF NOT EXISTS nursing_timeline_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES nursing_timeline_posts(id) ON DELETE CASCADE,
  file_id UUID REFERENCES nursing_files_or_uploads(id) ON DELETE SET NULL,
  uploaded_by UUID REFERENCES nursing_users(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  mime_type VARCHAR(180),
  file_url TEXT,
  status VARCHAR(60) NOT NULL DEFAULT 'available',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nursing_timeline_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES nursing_timeline_posts(id) ON DELETE CASCADE,
  reported_by UUID REFERENCES nursing_users(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  status VARCHAR(60) NOT NULL DEFAULT 'open',
  reviewed_by UUID REFERENCES nursing_users(id) ON DELETE SET NULL,
  resolution TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nursing_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID REFERENCES nursing_institutions(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES nursing_users(id) ON DELETE CASCADE,
  notification_type VARCHAR(80) NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  action_url TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nursing_access_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_key TEXT NOT NULL,
  full_name VARCHAR(180) NOT NULL,
  institution_name VARCHAR(255) NOT NULL,
  department_name VARCHAR(255) NOT NULL,
  role_requested VARCHAR(80) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(32) NOT NULL,
  message TEXT,
  status VARCHAR(60) NOT NULL DEFAULT 'received',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nursing_waiting_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_key TEXT UNIQUE,
  tenant_key TEXT NOT NULL,
  department_key TEXT,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  announcement TEXT,
  estimated_wait_minutes INTEGER NOT NULL DEFAULT 10,
  status VARCHAR(60) NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nursing_waiting_room_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_key TEXT UNIQUE,
  waiting_room_id UUID REFERENCES nursing_waiting_rooms(id) ON DELETE CASCADE,
  tenant_key TEXT NOT NULL,
  department_key TEXT,
  student_key TEXT NOT NULL,
  assigned_admin_key TEXT,
  reason VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  status VARCHAR(60) NOT NULL DEFAULT 'waiting',
  estimated_wait_minutes INTEGER,
  resolution_note TEXT,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nursing_waiting_room_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_key TEXT UNIQUE,
  waiting_room_id UUID REFERENCES nursing_waiting_rooms(id) ON DELETE CASCADE,
  tenant_key TEXT NOT NULL,
  sender_key TEXT NOT NULL,
  sender_role VARCHAR(80) NOT NULL,
  message TEXT NOT NULL,
  visibility VARCHAR(40) NOT NULL DEFAULT 'room',
  status VARCHAR(40) NOT NULL DEFAULT 'sent',
  read_by JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nursing_waiting_room_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  waiting_room_id UUID REFERENCES nursing_waiting_rooms(id) ON DELETE CASCADE,
  user_key TEXT NOT NULL,
  role VARCHAR(80) NOT NULL,
  status VARCHAR(60) NOT NULL DEFAULT 'waiting',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  left_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(waiting_room_id, user_key)
);

CREATE TABLE IF NOT EXISTS nursing_waiting_room_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_entry_id UUID REFERENCES nursing_waiting_room_queue(id) ON DELETE CASCADE,
  assigned_admin_key TEXT NOT NULL,
  assigned_by_key TEXT NOT NULL,
  status VARCHAR(60) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nursing_office_hour_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_key TEXT UNIQUE,
  tenant_key TEXT NOT NULL,
  department_key TEXT,
  course_key TEXT,
  cohort_key TEXT,
  host_key TEXT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  session_type VARCHAR(100) NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL,
  capacity INTEGER NOT NULL,
  status VARCHAR(60) NOT NULL DEFAULT 'scheduled',
  session_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nursing_office_hour_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  office_hour_session_id UUID REFERENCES nursing_office_hour_sessions(id) ON DELETE CASCADE,
  student_key TEXT NOT NULL,
  question TEXT NOT NULL,
  status VARCHAR(60) NOT NULL DEFAULT 'submitted',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nursing_office_hour_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  office_hour_session_id UUID REFERENCES nursing_office_hour_sessions(id) ON DELETE CASCADE,
  user_key TEXT NOT NULL,
  status VARCHAR(60) NOT NULL DEFAULT 'registered',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  marked_by_key TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(office_hour_session_id, user_key)
);

CREATE TABLE IF NOT EXISTS nursing_office_hour_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  office_hour_session_id UUID REFERENCES nursing_office_hour_sessions(id) ON DELETE CASCADE,
  author_key TEXT NOT NULL,
  note TEXT NOT NULL,
  visibility VARCHAR(40) NOT NULL DEFAULT 'host',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nursing_support_escalations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_key TEXT NOT NULL,
  queue_entry_key TEXT NOT NULL,
  student_key TEXT NOT NULL,
  created_by_key TEXT NOT NULL,
  assigned_to_key TEXT,
  reason TEXT NOT NULL,
  status VARCHAR(60) NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nursing_admin_support_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_key TEXT NOT NULL,
  department_key TEXT,
  user_key TEXT NOT NULL,
  whatsapp_number VARCHAR(32),
  whatsapp_display_name VARCHAR(180),
  whatsapp_available BOOLEAN NOT NULL DEFAULT FALSE,
  whatsapp_support_role VARCHAR(120),
  whatsapp_support_hours VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_key, user_key)
);

CREATE TABLE IF NOT EXISTS nursing_message_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_key TEXT UNIQUE,
  tenant_key TEXT NOT NULL,
  department_key TEXT,
  course_key TEXT,
  title VARCHAR(255) NOT NULL,
  scope VARCHAR(60) NOT NULL DEFAULT 'department',
  status VARCHAR(60) NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nursing_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_key TEXT UNIQUE,
  thread_id UUID REFERENCES nursing_message_threads(id) ON DELETE CASCADE,
  tenant_key TEXT NOT NULL,
  sender_key TEXT NOT NULL,
  recipient_key TEXT,
  participant_keys JSONB NOT NULL DEFAULT '[]'::jsonb,
  scope VARCHAR(60) NOT NULL DEFAULT 'department',
  body TEXT NOT NULL,
  status VARCHAR(60) NOT NULL DEFAULT 'sent',
  read_by JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Durable application state for workflows that span multiple normalized
-- entities. One row is retained per institution and updated transactionally.
CREATE TABLE IF NOT EXISTS nursing_platform_state (
  tenant_key TEXT PRIMARY KEY,
  state JSONB NOT NULL DEFAULT '{}'::jsonb,
  version BIGINT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nursing_departments_institution ON nursing_departments(institution_id);
CREATE INDEX IF NOT EXISTS idx_nursing_sessions_institution_department ON nursing_academic_sessions(institution_id, department_id);
CREATE INDEX IF NOT EXISTS idx_nursing_cohorts_institution_department_session ON nursing_cohorts(institution_id, department_id, academic_session_id);
CREATE INDEX IF NOT EXISTS idx_nursing_users_institution ON nursing_users(institution_id);
CREATE INDEX IF NOT EXISTS idx_nursing_users_department ON nursing_users(department_id);
CREATE INDEX IF NOT EXISTS idx_nursing_users_role ON nursing_users(primary_role);
CREATE INDEX IF NOT EXISTS idx_nursing_users_cohort ON nursing_users(cohort_id);
CREATE INDEX IF NOT EXISTS idx_nursing_user_roles_role ON nursing_user_roles(role);
CREATE INDEX IF NOT EXISTS idx_nursing_courses_course_status ON nursing_courses(institution_id, department_id, status);
CREATE INDEX IF NOT EXISTS idx_nursing_lessons_course ON nursing_lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_nursing_quizzes_course ON nursing_quizzes(course_id);
CREATE INDEX IF NOT EXISTS idx_nursing_quiz_attempts_student ON nursing_quiz_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_nursing_quiz_attempts_cohort ON nursing_quiz_attempts(cohort_id);
CREATE INDEX IF NOT EXISTS idx_nursing_sim_cases_institution ON nursing_simulation_cases(institution_id, department_id, status);
CREATE INDEX IF NOT EXISTS idx_nursing_sim_attempts_student ON nursing_simulation_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_nursing_telehealth_sessions_student ON nursing_telehealth_lab_sessions(student_id, status);
CREATE INDEX IF NOT EXISTS idx_nursing_logbook_student_status ON nursing_clinical_logbook_entries(student_id, status);
CREATE INDEX IF NOT EXISTS idx_nursing_logbook_supervisor_status ON nursing_clinical_logbook_entries(supervisor_id, status);
CREATE INDEX IF NOT EXISTS idx_nursing_logbook_cohort ON nursing_clinical_logbook_entries(cohort_id);
CREATE INDEX IF NOT EXISTS idx_nursing_certificates_student_status ON nursing_certificates(student_id, status);
CREATE INDEX IF NOT EXISTS idx_nursing_payment_records_student_status ON nursing_payment_records(student_id, payment_status, access_status);
CREATE INDEX IF NOT EXISTS idx_nursing_announcements_audience ON nursing_announcements(institution_id, audience, status);
CREATE INDEX IF NOT EXISTS idx_nursing_reports_department_status ON nursing_reports(department_id, status);
CREATE INDEX IF NOT EXISTS idx_nursing_audit_logs_user ON nursing_audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_nursing_audit_logs_resource ON nursing_audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_nursing_files_owner ON nursing_files_or_uploads(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_nursing_profiles_user ON nursing_user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_nursing_course_sections_course ON nursing_course_sections(course_id, status);
CREATE INDEX IF NOT EXISTS idx_nursing_lesson_resources_lesson ON nursing_lesson_resources(lesson_id);
CREATE INDEX IF NOT EXISTS idx_nursing_enrollments_student ON nursing_course_enrollments(student_id, status);
CREATE INDEX IF NOT EXISTS idx_nursing_enrollments_course ON nursing_course_enrollments(course_id, cohort_id);
CREATE INDEX IF NOT EXISTS idx_nursing_lesson_progress_student ON nursing_lesson_progress(student_id, status);
CREATE INDEX IF NOT EXISTS idx_nursing_assignments_course ON nursing_assignments(course_id, status);
CREATE INDEX IF NOT EXISTS idx_nursing_submissions_assignment ON nursing_assignment_submissions(assignment_id, status);
CREATE INDEX IF NOT EXISTS idx_nursing_submissions_student ON nursing_assignment_submissions(student_id, status);
CREATE INDEX IF NOT EXISTS idx_nursing_grades_student_course ON nursing_grades(student_id, course_id, grade_type);
CREATE INDEX IF NOT EXISTS idx_nursing_discussions_course ON nursing_course_discussions(course_id, status);
CREATE INDEX IF NOT EXISTS idx_nursing_timeline_scope ON nursing_timeline_posts(institution_id, department_id, cohort_id, course_id, status);
CREATE INDEX IF NOT EXISTS idx_nursing_timeline_author ON nursing_timeline_posts(author_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_nursing_timeline_comments_post ON nursing_timeline_comments(post_id, status);
CREATE INDEX IF NOT EXISTS idx_nursing_timeline_reports_status ON nursing_timeline_reports(status);
CREATE INDEX IF NOT EXISTS idx_nursing_notifications_user ON nursing_notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_nursing_access_requests_status ON nursing_access_requests(tenant_key, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_nursing_waiting_rooms_status ON nursing_waiting_rooms(tenant_key, department_key, status);
CREATE INDEX IF NOT EXISTS idx_nursing_waiting_queue_status ON nursing_waiting_room_queue(tenant_key, department_key, status, joined_at);
CREATE INDEX IF NOT EXISTS idx_nursing_waiting_queue_student ON nursing_waiting_room_queue(student_key, status);
CREATE INDEX IF NOT EXISTS idx_nursing_waiting_messages_room ON nursing_waiting_room_messages(waiting_room_id, created_at);
CREATE INDEX IF NOT EXISTS idx_nursing_waiting_participants_user ON nursing_waiting_room_participants(user_key, status);
CREATE INDEX IF NOT EXISTS idx_nursing_office_hours_scope ON nursing_office_hour_sessions(tenant_key, department_key, status, starts_at);
CREATE INDEX IF NOT EXISTS idx_nursing_office_hours_host ON nursing_office_hour_sessions(host_key, status);
CREATE INDEX IF NOT EXISTS idx_nursing_office_questions_session ON nursing_office_hour_questions(office_hour_session_id, status);
CREATE INDEX IF NOT EXISTS idx_nursing_office_attendance_user ON nursing_office_hour_attendance(user_key, status);
CREATE INDEX IF NOT EXISTS idx_nursing_support_escalations_status ON nursing_support_escalations(tenant_key, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_nursing_support_profiles_available ON nursing_admin_support_profiles(tenant_key, whatsapp_available);
CREATE INDEX IF NOT EXISTS idx_nursing_message_threads_scope ON nursing_message_threads(tenant_key, department_key, scope, status);
CREATE INDEX IF NOT EXISTS idx_nursing_messages_thread ON nursing_messages(thread_id, created_at);
CREATE INDEX IF NOT EXISTS idx_nursing_messages_recipient ON nursing_messages(tenant_key, recipient_key, status, created_at DESC);

DROP TRIGGER IF EXISTS nursing_institutions_updated_at ON nursing_institutions;
CREATE TRIGGER nursing_institutions_updated_at BEFORE UPDATE ON nursing_institutions FOR EACH ROW EXECUTE FUNCTION nursing_update_updated_at_column();

DROP TRIGGER IF EXISTS nursing_departments_updated_at ON nursing_departments;
CREATE TRIGGER nursing_departments_updated_at BEFORE UPDATE ON nursing_departments FOR EACH ROW EXECUTE FUNCTION nursing_update_updated_at_column();

DROP TRIGGER IF EXISTS nursing_users_updated_at ON nursing_users;
CREATE TRIGGER nursing_users_updated_at BEFORE UPDATE ON nursing_users FOR EACH ROW EXECUTE FUNCTION nursing_update_updated_at_column();

DROP TRIGGER IF EXISTS nursing_courses_updated_at ON nursing_courses;
CREATE TRIGGER nursing_courses_updated_at BEFORE UPDATE ON nursing_courses FOR EACH ROW EXECUTE FUNCTION nursing_update_updated_at_column();

DROP TRIGGER IF EXISTS nursing_logbook_updated_at ON nursing_clinical_logbook_entries;
CREATE TRIGGER nursing_logbook_updated_at BEFORE UPDATE ON nursing_clinical_logbook_entries FOR EACH ROW EXECUTE FUNCTION nursing_update_updated_at_column();
