"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { ArrowLeft, Zap, Dumbbell, ChevronRight, Loader2 } from "lucide-react";

import { EXERCISE_CATALOG, getFullName } from "@/lib/exercises";

interface Program { id: string; name: string; }

const PUSH_WORKOUT: { name: string; muscleGroup: string; sets: number; repMin: number; repMax: number }[] = [
  { name: "Développé couché (Barre)", muscleGroup: "Pectoraux", sets: 4, repMin: 6, repMax: 10 },
  { name: "Développé incliné (Barre)", muscleGroup: "Pectoraux", sets: 3, repMin: 6, repMax: 10 },
  { name: "Chest press (Machine)", muscleGroup: "Pectoraux", sets: 3, repMin: 8, repMax: 10 },
  { name: "Chest press inclinée (Machine)", muscleGroup: "Pectoraux", sets: 3, repMin: 8, repMax: 10 },
  { name: "Développé militaire (Machine)", muscleGroup: "Épaules", sets: 3, repMin: 8, repMax: 10 },
  { name: "Élévations latérales (Haltères)", muscleGroup: "Épaules", sets: 3, repMin: 8, repMax: 10 },
  { name: "Extensions poulie haute (Corde)", muscleGroup: "Triceps", sets: 3, repMin: 8, repMax: 10 },
  { name: "Extensions au-dessus de la tête (Poulie)", muscleGroup: "Triceps", sets: 3, repMin: 8, repMax: 10 },
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
          setsToInsert.push({ workout_id: workout.id, exercise_id: exerciseId, set_number: i + 1, reps: randomReps(exDef.repMin, exDef.repMax), weight: 0, rest_sec: 90, completed: false });
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
              const targetW = ex.target_weight ?? 0;
              const allHitTarget = completedSets.every((s: { reps: number; weight: number }) => s.reps >= ex.target_reps && s.weight >= targetW);
              if (allHitTarget && targetW > 0) {
                const newWeight = Math.round((targetW + 2.5) * 10) / 10;
                for (let i = 0; i < ex.target_sets; i++) sets.push({ reps: ex.target_reps, weight: newWeight });
              } else {
                for (let i = 0; i < ex.target_sets; i++) sets.push({ reps: bestReps, weight: targetW });
              }
            }
          }
        }
        if (sets.length === 0) {
          const targetW = ex.target_weight ?? 0;
          for (let i = 0; i < ex.target_sets; i++) sets.push({ reps: ex.target_reps, weight: targetW });
        }
        const setsToInsert = sets.map((s, i) => ({ workout_id: workout.id, exercise_id: ex.exercise_id, set_number: i + 1, reps: s.reps, weight: s.weight, rest_sec: 90, completed: false }));
        if (setsToInsert.length > 0) await supabase.from("workout_sets").insert(setsToInsert);
      }
    }
    router.push(`/workout/${workout.id}`);
  }

  if (loading || !user) return <p className="p-6">Chargement...</p>;

  return (
    <main className="flex min-h-screen flex-col p-4 pb-24 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Nouvelle séance</h1>
        <Link href="/programs" className="inline-flex items-center gap-1 text-sm active:scale-95 transition-all" style={{ color: "hsl(var(--inactive-btn-text))" }}>
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Link>
      </div>

      <button
        onClick={startPushWorkout}
        disabled={startingPush}
        className="w-full rounded-2xl p-6 text-left active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100 mb-6 animate-slide-up"
        style={{
          background: "linear-gradient(135deg, hsl(142 71% 45%), hsl(142 71% 35%))",
          boxShadow: "0 8px 32px hsl(142 71% 45% / 0.25)",
        }}
      >
        <div className="flex items-center gap-2 mb-2">
          <Zap className="h-5 w-5 text-[hsl(var(--text-white))]" />
          <p className="text-lg font-bold text-[hsl(var(--text-white))]">Séance Push</p>
        </div>
        <p className="text-sm text-[hsl(var(--text-white-70))]">
          Développé couché · Incliné · Chest press · Militaire · Élévations · Triceps
        </p>
        <p className="text-xs text-[hsl(var(--text-white-50))] mt-1">
          24 séries · ~50 min
        </p>
        {startingPush && <Loader2 className="h-5 w-5 animate-spin text-[hsl(var(--text-white))] mt-2" />}
      </button>

      {programs.length > 0 && (
        <>
          <p className="text-sm font-medium mb-3 animate-slide-up stagger-1" style={{ color: "hsl(var(--muted-foreground))" }}>Mes programmes</p>
          <div className="flex flex-col gap-2.5">
            {programs.map((p, idx) => (
              <button
                key={p.id}
                onClick={() => startWorkout(p.id)}
                className="w-full rounded-2xl p-4 text-left flex items-center justify-between active:scale-[0.98] transition-all animate-slide-up"
                style={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--card-border))",
                  animationDelay: `${(idx + 2) * 0.05}s`,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "hsl(142 71% 45% / 0.3)")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "hsl(var(--card-border))")}
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-xl p-2" style={{ backgroundColor: "hsl(142 71% 45% / 0.1)" }}>
                    <Dumbbell className="h-4 w-4" style={{ color: "hsl(142 71% 45%)" }} />
                  </div>
                  <span className="font-semibold text-sm text-[hsl(var(--text-white))]">{p.name}</span>
                </div>
                <ChevronRight className="h-4 w-4" style={{ color: "hsl(var(--muted-foreground-dim))" }} />
              </button>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
