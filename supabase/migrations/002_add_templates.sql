-- Migration: templates de programmes
-- Date: 2026-04-04

CREATE TABLE IF NOT EXISTS program_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS program_template_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES program_templates(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES exercises(id),
  target_sets INT NOT NULL DEFAULT 4,
  target_reps INT NOT NULL DEFAULT 8,
  target_weight NUMERIC NOT NULL DEFAULT 0,
  rep_range_min INT DEFAULT 8,
  rep_range_max INT DEFAULT 12,
  sort_order INT NOT NULL DEFAULT 0
);
