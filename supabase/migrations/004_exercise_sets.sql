-- Migration: table pour les séries cibles par exercice de programme
-- Chaque ligne = une série cible avec poids et reps individuels

CREATE TABLE IF NOT EXISTS program_exercise_sets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  program_exercise_id UUID NOT NULL REFERENCES program_exercises(id) ON DELETE CASCADE,
  set_number INT NOT NULL,
  target_reps INT NOT NULL DEFAULT 10,
  target_weight NUMERIC(6,2),
  sort_order INT NOT NULL DEFAULT 0
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_program_exercise_sets_pe ON program_exercise_sets(program_exercise_id, sort_order);
