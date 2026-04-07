CREATE TABLE profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  tier text NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'premium')),
  unit text NOT NULL DEFAULT 'kg' CHECK (unit IN ('kg', 'lbs')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE exercises (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  muscle_group text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE programs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE program_exercises (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  program_id uuid REFERENCES programs(id) ON DELETE CASCADE NOT NULL,
  exercise_id uuid REFERENCES exercises(id) ON DELETE CASCADE NOT NULL,
  target_sets int NOT NULL DEFAULT 4,
  target_reps int NOT NULL DEFAULT 8,
  target_weight numeric NOT NULL DEFAULT 0,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE workouts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  program_id uuid REFERENCES programs(id) ON DELETE SET NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE workout_sets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workout_id uuid REFERENCES workouts(id) ON DELETE CASCADE NOT NULL,
  exercise_id uuid REFERENCES exercises(id) ON DELETE CASCADE NOT NULL,
  set_number int NOT NULL,
  reps int NOT NULL,
  weight numeric NOT NULL DEFAULT 0,
  rest_sec int NOT NULL DEFAULT 90,
  completed boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Triggers

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, tier, unit)
  VALUES (new.id, 'free', 'kg');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_profiles BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER set_updated_at_programs BEFORE UPDATE ON programs
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Row Level Security

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Anyone can view exercises" ON exercises FOR SELECT USING (true);

CREATE POLICY "Users can view own programs" ON programs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own programs" ON programs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own programs" ON programs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own programs" ON programs FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own program exercises" ON program_exercises FOR SELECT USING (program_id IN (SELECT id FROM programs WHERE user_id = auth.uid()));
CREATE POLICY "Users can insert own program exercises" ON program_exercises FOR INSERT WITH CHECK (program_id IN (SELECT id FROM programs WHERE user_id = auth.uid()));
CREATE POLICY "Users can update own program exercises" ON program_exercises FOR UPDATE USING (program_id IN (SELECT id FROM programs WHERE user_id = auth.uid()));
CREATE POLICY "Users can delete own program exercises" ON program_exercises FOR DELETE USING (program_id IN (SELECT id FROM programs WHERE user_id = auth.uid()));

CREATE POLICY "Users can view own workouts" ON workouts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own workouts" ON workouts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own workouts" ON workouts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own workouts" ON workouts FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view sets of own workouts" ON workout_sets FOR SELECT USING (workout_id IN (SELECT id FROM workouts WHERE user_id = auth.uid()));
CREATE POLICY "Users can insert sets of own workouts" ON workout_sets FOR INSERT WITH CHECK (workout_id IN (SELECT id FROM workouts WHERE user_id = auth.uid()));
CREATE POLICY "Users can update sets of own workouts" ON workout_sets FOR UPDATE USING (workout_id IN (SELECT id FROM workouts WHERE user_id = auth.uid()));
CREATE POLICY "Users can delete sets of own workouts" ON workout_sets FOR DELETE USING (workout_id IN (SELECT id FROM workouts WHERE user_id = auth.uid()));

-- Seed

INSERT INTO exercises (name, muscle_group) VALUES
  ('Développé couché (Barre)', 'Pectoraux'),
  ('Développé couché (Haltères)', 'Pectoraux'),
  ('Développé incliné (Barre)', 'Pectoraux'),
  ('Développé incliné (Haltères)', 'Pectoraux'),
  ('Pec Deck (Machine Butterfly)', 'Pectoraux'),
  ('Dips lestés', 'Pectoraux'),
  ('Tractions (Poids de corps)', 'Dos'),
  ('Tractions lestées', 'Dos'),
  ('Soulevé de terre (Deadlift classique)', 'Dos'),
  ('Tirage vertical (Poulie haute)', 'Dos'),
  ('Tirage horizontal (Poulie basse)', 'Dos'),
  ('Rowing barre (Buste penché)', 'Dos'),
  ('Rowing machine (T-Bar ou assis)', 'Dos'),
  ('Pull-over (Haltère ou poulie)', 'Dos'),
  ('Développé militaire (Machine)', 'Épaules'),
  ('Développé militaire (Haltères)', 'Épaules'),
  ('Élévations latérales (Haltères)', 'Épaules'),
  ('Élévations latérales (Poulie)', 'Épaules'),
  ('Élévations frontales (Haltères ou disque)', 'Épaules'),
  ('Pec Deck inversé (Machine arrière d''épaule)', 'Épaules'),
  ('Belt Squat', 'Quadriceps'),
  ('Presse à cuisse inclinée', 'Quadriceps'),
  ('Leg Extension (Machine)', 'Quadriceps'),
  ('Leg Curl allongé (Machine)', 'Ischio-jambiers'),
  ('Leg Curl assis (Machine)', 'Ischio-jambiers'),
  ('Curl haltères alterné (Debout ou assis)', 'Biceps'),
  ('Curl marteau (Haltères)', 'Biceps'),
  ('Curl pupitre (Machine ou barre EZ)', 'Biceps'),
  ('Curl bayesian', 'Biceps'),
  ('Barre au front (Barre EZ)', 'Triceps'),
  ('Extensions poulie haute (Corde)', 'Triceps'),
  ('Extensions poulie haute (Barre droite)', 'Triceps'),
  ('Extensions au-dessus de la tête (Haltère ou poulie)', 'Triceps'),
  ('Extensions mollets assis (Machine)', 'Mollets');
