-- Migration: ajout des rep ranges configurables
-- Date: 2026-04-04

ALTER TABLE program_exercises
  ADD COLUMN IF NOT EXISTS rep_range_min INT DEFAULT 8,
  ADD COLUMN IF NOT EXISTS rep_range_max INT DEFAULT 12;

-- Migrer les données existantes : rep_range_min = target_reps, rep_range_max = target_reps + 4
UPDATE program_exercises
SET
  rep_range_min = target_reps,
  rep_range_max = target_reps + 4
WHERE rep_range_min = 8 AND rep_range_max = 12;
