"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { ChevronLeft, ChevronRight, CalendarDays, Dumbbell, ArrowRight } from "lucide-react";

interface CalendarWorkout {
  id: string; program_name: string | null; status: string; started_at: string;
  exercises: { name: string; sets: { reps: number; weight: number; completed: boolean; note?: string; rpe?: number }[] }[];
}

const MONTHS_FR = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const DAYS_FR = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export default function CalendarPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [workoutsByDate, setWorkoutsByDate] = useState<Record<string, CalendarWorkout[]>>({});
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedWorkouts, setSelectedWorkouts] = useState<CalendarWorkout[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [unit, setUnit] = useState<"kg" | "lbs">("kg");
  const [hasAnyWorkout, setHasAnyWorkout] = useState(false);
  const detailRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (!loading && !user) router.push("/login"); }, [user, loading, router]);
  useEffect(() => { if (!user) return; loadWorkouts(); loadUnit(); }, [user, currentDate.getFullYear(), currentDate.getMonth()]);

  async function loadUnit() { const { data } = await supabase.from("profiles").select("unit").eq("id", user!.id).single(); if (data) setUnit(data.unit as "kg" | "lbs"); }
  function displayWeight(kg: number): string { if (unit === "lbs") return Math.round(kg * 2.20462 * 10) / 10 + " lbs"; return kg + " kg"; }

  async function loadWorkouts() {
    setLoadingData(true);
    const year = currentDate.getFullYear(), month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1), lastDay = new Date(year, month + 1, 0);
    const { data: workouts, error } = await supabase
      .from("workouts")
      .select("id, program_id, status, started_at, programs(name)")
      .eq("user_id", user!.id)
      .gte("started_at", firstDay.toISOString())
      .lt("started_at", new Date(lastDay.getTime() + 86400000).toISOString())
      .order("started_at", { ascending: true });

    if (error || !workouts) {
      setLoadingData(false);
      return;
    }

    const workoutIds = workouts.map((w) => w.id);
    let workoutSetsMap: Record<string, { workout_id: string; exercise_id: string; reps: number; weight: number; completed: boolean; note?: string; rpe?: number; exercises: { name: string } }[]> = {};

    if (workoutIds.length > 0) {
      const { data: allSets } = await supabase
        .from("workout_sets")
        .select("workout_id, exercise_id, reps, weight, completed, note, rpe, exercises(name)")
        .in("workout_id", workoutIds)
        .order("set_number");

      if (allSets) {
        for (const s of allSets as unknown as { workout_id: string; exercise_id: string; reps: number; weight: number; completed: boolean; note?: string; rpe?: number; exercises: { name: string } }[]) {
          if (!workoutSetsMap[s.workout_id]) workoutSetsMap[s.workout_id] = [];
          workoutSetsMap[s.workout_id].push(s);
        }
      }
    }

    const byDate: Record<string, CalendarWorkout[]> = {};
    for (const w of workouts) {
      const dateKey = new Date(w.started_at).toLocaleDateString("fr-FR");
      const sets = workoutSetsMap[w.id] || [];
      const completedCount = sets.filter((s) => s.completed).length;
      if (completedCount === 0 && w.status !== "completed" && w.status !== "partial") continue;
      if (!byDate[dateKey]) byDate[dateKey] = [];
      const exerciseMap: Record<string, { name: string; sets: { reps: number; weight: number; completed: boolean; note?: string; rpe?: number }[] }> = {};
      for (const s of sets) {
        const exId = s.exercise_id;
        if (!exerciseMap[exId]) exerciseMap[exId] = { name: (s.exercises as unknown as { name: string })?.name ?? "Exercice", sets: [] };
        const ss = s as unknown as { reps: number; weight: number; completed: boolean; note?: string; rpe?: number };
        exerciseMap[exId].sets.push({ reps: ss.reps, weight: ss.weight, completed: ss.completed, note: ss.note, rpe: ss.rpe });
      }
      byDate[dateKey].push({ id: w.id, program_name: (w.programs as unknown as { name: string } | null)?.name ?? "Séance libre", status: w.status, started_at: w.started_at, exercises: Object.values(exerciseMap) });
    }
    setWorkoutsByDate(byDate);
    if (Object.keys(byDate).length > 0) setHasAnyWorkout(true);
    setLoadingData(false);
  }

  function getDaysInMonth(date: Date): (number | null)[] {
    const year = date.getFullYear(), month = date.getMonth();
    const firstDay = new Date(year, month, 1), lastDay = new Date(year, month + 1, 0);
    let startDay = firstDay.getDay() - 1; if (startDay < 0) startDay = 6;
    const days: (number | null)[] = [];
    for (let i = 0; i < startDay; i++) days.push(null);
    for (let i = 1; i <= lastDay.getDate(); i++) days.push(i);
    return days;
  }

  function dateKey(day: number): string { return new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toLocaleDateString("fr-FR"); }
  function isToday(day: number): boolean { const t = new Date(); return day === t.getDate() && currentDate.getMonth() === t.getMonth() && currentDate.getFullYear() === t.getFullYear(); }
  function prevMonth() { setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)); }
  function nextMonth() { setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)); }

  function selectDay(day: number) {
    const key = dateKey(day);
    setSelectedDate(key);
    setSelectedWorkouts(workoutsByDate[key] || []);
    setTimeout(() => { detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }, 100);
  }

  if (loading || !user) return <p className="p-6">Chargement...</p>;
  const days = getDaysInMonth(currentDate);

  return (
    <main className="flex min-h-screen flex-col p-5 pb-24">
      <h1 className="text-2xl font-bold tracking-tight mb-6">Calendrier</h1>

      <div className="flex items-center justify-between mb-5">
        <button onClick={prevMonth} className="p-2 rounded-xl hover:bg-neutral-900 active:scale-95 transition-all text-neutral-400"><ChevronLeft className="h-5 w-5" /></button>
        <h2 className="text-base font-semibold">{MONTHS_FR[currentDate.getMonth()]} {currentDate.getFullYear()}</h2>
        <button onClick={nextMonth} className="p-2 rounded-xl hover:bg-neutral-900 active:scale-95 transition-all text-neutral-400"><ChevronRight className="h-5 w-5" /></button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {DAYS_FR.map((d) => <div key={d} className="text-center text-[10px] text-neutral-600 font-medium py-2">{d}</div>)}
      </div>

      <div className="grid grid-cols-7 gap-1 mb-6">
        {days.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} />;
          const key = dateKey(day);
          const dayWorkouts = workoutsByDate[key] || [];
          const hasCompleted = dayWorkouts.some((w) => w.status === "completed");
          const hasPartial = dayWorkouts.some((w) => w.status === "partial");
          const hasWorkout = dayWorkouts.length > 0;
          const today = isToday(day);
          const selected = selectedDate === key;
          return (
            <button key={key} onClick={() => selectDay(day)} className={`relative aspect-square rounded-xl flex flex-col items-center justify-center text-sm transition-all active:scale-95 ${selected ? "bg-green-500 text-neutral-950 font-bold" : today ? "border-2 border-green-500 text-green-500" : hasWorkout ? "border-2 border-green-500/40 bg-green-500/10 text-green-500 font-semibold" : "text-neutral-400 hover:bg-neutral-900 border border-transparent"}`}>
              {day}
              {!selected && hasCompleted && <span className="absolute bottom-1.5 h-1 w-1 rounded-full bg-green-500" />}
              {!selected && hasPartial && !hasCompleted && <span className="absolute bottom-1.5 h-1 w-1 rounded-full bg-orange-500" />}
            </button>
          );
        })}
      </div>

      {!hasAnyWorkout && !loadingData && (
        <div className="text-center py-12 rounded-2xl border border-dashed mb-6" style={{ borderColor: "hsl(var(--border))" }}>
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: "hsl(var(--primary) / 0.1)" }}>
            <CalendarDays className="h-8 w-8" style={{ color: "hsl(var(--primary))" }} />
          </div>
          <p className="text-base font-semibold text-[hsl(var(--foreground))] mb-1">Aucune séance planifiée</p>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Tes séances apparaîtront ici</p>
        </div>
      )}

      {selectedDate && (
        <div ref={detailRef} className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
          <div className="flex items-center gap-2 mb-3">
            <CalendarDays className="h-4 w-4 text-neutral-500" />
            <h3 className="font-semibold text-sm">{selectedDate}</h3>
          </div>

          {selectedWorkouts.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: "hsl(var(--primary) / 0.1)" }}>
                <CalendarDays className="h-6 w-6" style={{ color: "hsl(var(--primary))" }} />
              </div>
              <p className="text-sm text-neutral-500">Aucune séance ce jour-là.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {selectedWorkouts.map((w) => (
                <div key={w.id} className="rounded-lg border border-neutral-800 bg-neutral-950 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <Link href={`/workout/${w.id}`} className="font-semibold text-sm text-green-500 hover:underline flex items-center gap-1">
                      {w.program_name}
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${w.status === "completed" ? "bg-green-500/10 text-green-500" : w.status === "partial" ? "bg-orange-500/10 text-orange-500" : "bg-blue-500/10 text-blue-500"}`}>
                      {w.status === "completed" ? "Terminée" : w.status === "partial" ? "Partielle" : "En cours"}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {w.exercises.map((ex, i) => (
                      <div key={i} className="flex flex-col gap-1 py-1">
                        <div className="flex items-center gap-2 text-xs">
                          <Dumbbell className="h-3 w-3 text-neutral-600 shrink-0" />
                          <span className="text-neutral-400">{ex.name}</span>
                          <span className="text-green-500/80 ml-auto font-mono">{ex.sets.map((s) => `${s.reps}×${displayWeight(s.weight)}`).join(" · ")}</span>
                        </div>
                        {ex.sets.some((s) => s.note || s.rpe) && (
                          <div className="flex flex-wrap gap-1 ml-5">
                            {ex.sets.filter((s) => s.note).map((s, si) => (
                              <span key={si} className="text-[10px] px-1.5 py-0.5 rounded truncate max-w-[150px]" style={{ backgroundColor: "hsl(142 71% 45% / 0.1)", color: "hsl(142 71% 45%)" }}>
                                📝 {s.note}
                              </span>
                            ))}
                            {ex.sets.filter((s) => s.rpe).map((s, si) => (
                              <span key={`rpe-${si}`} className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: "hsl(199 89% 48% / 0.1)", color: "hsl(199 89% 48%)" }}>
                                RPE {s.rpe}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
