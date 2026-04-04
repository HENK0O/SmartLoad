"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { ArrowLeft, Zap, Dumbbell, ChevronRight, Loader2 } from "lucide-react";

import { EXERCISE_CATALOG, getFullName } from "@/lib/exercises";

interface Program { id: string; name: string; }

const PUSH_EXERCISES = EXERCISE_CATALOG.filter((ex) => ex.category === "PUSH").map((ex) => ({
  name: getFullName(ex.baseName, ex.supports[0]),
  muscleGroup: ex.muscleGroup,
  baseWeight: ex.baseName.includes("Développé couché") ? 80
    : ex.baseName.includes("Développé incliné") ? 60
    : ex.baseName.includes("Chest press") ? 40
    : ex.baseName.includes("militaire") ? 40
    : ex.baseName.includes("Élévations latérales") ? 10
    : ex.baseName.includes("Triceps") ? 15
    : 20,
  sets: ex.baseName.includes("Développé couché") ? 4 : 3,
  repMin: 6,
  repMax: 10,
}));

const PUSH_WORKOUT: { name: string; muscleGroup: string; baseWeight: number; sets: number; repMin: number; repMax: number }[] = [
  { name: "Développé couché (Barre)", muscleGroup: "Pectoraux", baseWeight: 80, sets: 4, repMin: 6, repMax: 10 },
  { name: "Développé incliné (Barre)", muscleGroup: "Pectoraux", baseWeight: 60, sets: 3, repMin: 6, repMax: 10 },
  { name: "Chest press (Machine)", muscleGroup: "Pectoraux", baseWeight: 40, sets: 3, repMin: 8, repMax: 10 },
  { name: "Chest press inclinée (Machine)", muscleGroup: "Pectoraux", baseWeight: 35, sets: 3, repMin: 8, repMax: 10 },
  { name: "Développé militaire (Machine)", muscleGroup: "Épaules", baseWeight: 40, sets: 3, repMin: 8, repMax: 10 },
  { name: "Élévations latérales (Haltères)", muscleGroup: "Épaules", baseWeight: 10, sets: 3, repMin: 8, repMax: 10 },
  { name: "Extensions poulie haute (Corde)", muscleGroup: "Triceps", baseWeight: 20, sets: 3, repMin: 8, repMax: 10 },
  { name: "Extensions au-dessus de la tête (Poulie)", muscleGroup: "Triceps", baseWeight: 15, sets: 3, repMin: 8, repMax: 10 },
];

export default function WorkoutPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loadingPrograms, setLoadingPrograms] = useState(true);
  const [startingPush, setStartingPush] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    loadPrograms();
  }, [user]);

  async function loadPrograms() {
    const { data } = await supabase.from("programs").select("id, name").order("created_at", { ascending: false });
    if (data) setPrograms(data);
    setLoadingPrograms(false);
  }

  function randomReps(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function weightVariation(base: number, setIndex: number): number {
    const variation = setIndex === 0 ? -5 : setIndex === 1 ? -2.5 : setIndex >= 3 ? 2.5 : 0;
    return Math.round((base + variation) * 10) / 10;
  }

  async function getOrCreateExercise(name: string, muscleGroup: string): Promise<string> {
    const { data: existing } = await supabase.from("exercises").select("id").eq("name", name).single();
    if (existing) return existing.id;
    const { data: created } = await supabase.from("exercises").insert({ name, muscle_group: muscleGroup }).select().single();
    if (created) return created.id;
    throw new Error(`Impossible de créer l'exercice: ${name}`);
  }

  async function startPushWorkout() {
    if (!user) return;
    setStartingPush(true);
    try {
      const { data: workout } = await supabase.from("workouts").insert({ user_id: user.id, program_id: null, status: "in_progress" }).select().single();
      if (!workout) { setStartingPush(false); return; }
      for (const exDef of PUSH_WORKOUT) {
        const exerciseId = await getOrCreateExercise(exDef.name, exDef.muscleGroup);
        const setsToInsert = [];
        for (let i = 0; i < exDef.sets; i++) {
          setsToInsert.push({ workout_id: workout.id, exercise_id: exerciseId, set_number: i + 1, reps: randomReps(exDef.repMin, exDef.repMax), weight: weightVariation(exDef.baseWeight, i), rest_sec: 90, completed: false });
        }
        if (setsToInsert.length > 0) await supabase.from("workout_sets").insert(setsToInsert);
      }
      router.push(`/workout/${workout.id}`);
    } catch (error) {
      console.error("Erreur séance push:", error);
      setStartingPush(false);
    }
  }

  async function startWorkout(programId: string) {
    if (!user) return;
    const { data: workout } = await supabase.from("workouts").insert({ user_id: user.id, program_id: programId, status: "in_progress" }).select().single();
    if (!workout) return;
    const { data: exercises } = await supabase.from("program_exercises").select("exercise_id, target_sets, target_reps, target_weight").eq("program_id", programId).order("sort_order");
    if (exercises && exercises.length > 0) {
      const { data: lastWorkout } = await supabase.from("workouts").select("id").eq("user_id", user.id).eq("program_id", programId).eq("status", "completed").neq("id", workout.id).order("started_at", { ascending: false }).limit(1).single();
      for (const ex of exercises) {
        let sets: { reps: number; weight: number }[] = [];
        if (lastWorkout) {
          const { data: lastSets } = await supabase.from("workout_sets").select("reps, weight, completed").eq("workout_id", lastWorkout.id).eq("exercise_id", ex.exercise_id).order("set_number");
          if (lastSets && lastSets.length > 0) {
            const completedSets = lastSets.filter((s: { completed: boolean }) => s.completed);
            if (completedSets.length > 0) {
              const bestReps = Math.max(...completedSets.map((s: { reps: number }) => s.reps));
              const allHitTarget = completedSets.every((s: { reps: number; weight: number }) => s.reps >= ex.target_reps && s.weight >= ex.target_weight);
              if (allHitTarget) {
                const newWeight = Math.round((ex.target_weight + 2.5) * 10) / 10;
                for (let i = 0; i < ex.target_sets; i++) sets.push({ reps: ex.target_reps, weight: newWeight });
              } else {
                for (let i = 0; i < ex.target_sets; i++) sets.push({ reps: bestReps, weight: ex.target_weight });
              }
            }
          }
        }
        if (sets.length === 0) {
          for (let i = 0; i < ex.target_sets; i++) sets.push({ reps: ex.target_reps, weight: ex.target_weight });
        }
        const setsToInsert = sets.map((s, i) => ({ workout_id: workout.id, exercise_id: ex.exercise_id, set_number: i + 1, reps: s.reps, weight: s.weight, rest_sec: 90, completed: false }));
        if (setsToInsert.length > 0) await supabase.from("workout_sets").insert(setsToInsert);
      }
    }
    router.push(`/workout/${workout.id}`);
  }

  if (loading || !user) return <p className="p-6">Chargement...</p>;

  return (
    <main className="flex min-h-screen flex-col p-5 pb-24">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Nouvelle séance</h1>
        <Link href="/programs" className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-300 active:scale-95 transition-all">
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Link>
      </div>

      <button
        onClick={startPushWorkout}
        disabled={startingPush}
        className="w-full rounded-2xl bg-gradient-to-br from-green-500 to-green-600 p-5 text-left shadow-lg shadow-green-500/20 active:scale-[0.98] transition-transform disabled:opacity-50 disabled:active:scale-100 mb-6"
      >
        <div className="flex items-center gap-2 mb-2">
          <Zap className="h-5 w-5 text-neutral-950" />
          <p className="text-lg font-bold text-neutral-950">Séance Push</p>
        </div>
        <p className="text-sm text-neutral-950/70">
          Développé couché · Incliné · Chest press · Militaire · Élévations · Triceps
        </p>
        <p className="text-xs text-neutral-950/50 mt-1">
          24 séries · ~50 min
        </p>
        {startingPush && <Loader2 className="h-5 w-5 animate-spin text-neutral-950 mt-2" />}
      </button>

      {programs.length > 0 && (
        <>
          <p className="text-sm font-medium text-neutral-500 mb-3">Mes programmes</p>
          <div className="flex flex-col gap-2.5">
            {programs.map((p) => (
              <button
                key={p.id}
                onClick={() => startWorkout(p.id)}
                className="w-full rounded-xl border border-neutral-800 bg-neutral-900 p-4 text-left flex items-center justify-between active:scale-[0.98] transition-all hover:border-green-500/30"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-green-500/10 p-2">
                    <Dumbbell className="h-4 w-4 text-green-500" />
                  </div>
                  <span className="font-semibold">{p.name}</span>
                </div>
                <ChevronRight className="h-4 w-4 text-neutral-600" />
              </button>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
