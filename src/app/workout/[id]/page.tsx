"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { analyzeProgression, estimate1RM, type ExerciseHistory, type ExerciseSession, type ProgressionTargets, type ProgressionOption } from "@/lib/progression";
import { useOnlineStatus, processSyncQueue, queueSync, cacheWorkoutData, getCachedWorkout } from "@/hooks/useOfflineSync";
import ConfirmDialog from "@/components/ConfirmDialog";
import Confetti from "@/components/Confetti";
import ProgressBar from "@/components/ProgressBar";
import Link from "next/link";
import {
  ArrowLeft, Plus, Check, X, WifiOff, Zap, TrendingUp, Timer, AlertTriangle,
  ChevronLeft, ChevronRight, Dumbbell, List
} from "lucide-react";

interface Exercise { id: string; name: string; muscle_group: string | null; }

interface ProgramExercise {
  id: string; exercise_id: string; target_sets: number; target_reps: number;
  target_weight: number; rep_range_min: number; rep_range_max: number;
  sort_order: number; exercises: Exercise;
}

interface WorkoutSet {
  id: string; exercise_id: string; set_number: number;
  reps: number; weight: number; rest_sec: number; completed: boolean;
}

interface ExerciseGroup {
  exercise: Exercise; targetSets: number; targetReps: number;
  targetWeight: number; repRangeMin: number; repRangeMax: number; sets: WorkoutSet[];
}

interface SmartProgression {
  analysis: ReturnType<typeof analyzeProgression>;
  primary: ProgressionOption; alternative: ProgressionOption; deload: ProgressionOption | null;
}

export default function WorkoutDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [workoutId, setWorkoutId] = useState("");
  const [programName, setProgramName] = useState("");
  const [workoutStatus, setWorkoutStatus] = useState("in_progress");
  const [groups, setGroups] = useState<ExerciseGroup[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [workoutDate, setWorkoutDate] = useState("");
  const [smartProgression, setSmartProgression] = useState<Record<string, SmartProgression>>({});
  const [unit, setUnit] = useState<"kg" | "lbs">("kg");
  const [restTimers, setRestTimers] = useState<Record<string, number>>({});
  const [timerActive, setTimerActive] = useState<string | null>(null);
  const [isOnline, setIsOnlineState] = useState(true);
  const [pendingSyncs, setPendingSyncs] = useState(0);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [customRestSec, setCustomRestSec] = useState<Record<string, number>>({});
  const [showCustomTimer, setShowCustomTimer] = useState<string | null>(null);
  const [draftValues, setDraftValues] = useState<Record<string, string>>({});
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [showAllExercises, setShowAllExercises] = useState(false);
  const [slideDirection, setSlideDirection] = useState<"left" | "right" | null>(null);
  const [appliedProgression, setAppliedProgression] = useState<Record<string, string>>({});

  const onlineStatus = useOnlineStatus();

  useEffect(() => { setIsOnlineState(onlineStatus); }, [onlineStatus]);

  useEffect(() => {
    if (onlineStatus && pendingSyncs > 0) {
      processSyncQueue().then((synced) => {
        if (synced > 0) setPendingSyncs((p) => Math.max(0, p - synced));
      });
    }
  }, [onlineStatus]);

  const isReadOnly = workoutStatus !== "in_progress";
  const currentGroup = groups[currentExerciseIndex] || null;
  const totalSets = groups.reduce((acc, g) => acc + g.sets.length, 0);
  const completedSets = groups.reduce((acc, g) => acc + g.sets.filter((s) => s.completed).length, 0);

  useEffect(() => { if (!loading && !user) router.push("/login"); }, [user, loading, router]);
  useEffect(() => { params.then((p) => setWorkoutId(p.id)); }, [params]);
  useEffect(() => { if (!user || !workoutId) return; loadData(); loadUnit(); }, [user, workoutId]);

  useEffect(() => {
    if (!timerActive) return;
    const interval = setInterval(() => {
      setRestTimers((prev) => {
        const current = prev[timerActive] || 0;
        if (current <= 1) { setTimerActive(null); playTimerSound(); return { ...prev, [timerActive]: 0 }; }
        return { ...prev, [timerActive]: current - 1 };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timerActive]);

  async function loadUnit() {
    const { data } = await supabase.from("profiles").select("unit").eq("id", user!.id).single();
    if (data) setUnit(data.unit as "kg" | "lbs");
  }

  function displayWeight(kg: number): string {
    if (unit === "lbs") return Math.round(kg * 2.20462 * 10) / 10 + " lbs";
    return kg + " kg";
  }

  async function loadData() {
    let workout: Record<string, unknown> | null = null;
    try {
      const { data } = await supabase.from("workouts").select("program_id, status, started_at, completed_at, programs(name)").eq("id", workoutId).single();
      workout = data as Record<string, unknown>;
    } catch {
      if (!isOnline) { const cached = await getCachedWorkout(workoutId); if (cached) workout = cached.data; }
    }

    if (workout) {
      await cacheWorkoutData(workoutId, workout);
      setProgramName((workout.programs as unknown as { name: string })?.name ?? "Séance libre");
      setWorkoutStatus(workout.status as string);
      setWorkoutDate(new Date(workout.started_at as string).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }));

      if (workout.program_id) {
        const { data: pe } = await supabase.from("program_exercises").select("exercise_id, target_sets, target_reps, target_weight, exercises(id, name, muscle_group)").eq("program_id", workout.program_id as string).order("sort_order");
        if (pe) {
          const groupsData: ExerciseGroup[] = (pe as unknown as ProgramExercise[]).map((p) => ({
            exercise: p.exercises, targetSets: p.target_sets, targetReps: p.target_reps, targetWeight: p.target_weight,
            repRangeMin: p.rep_range_min || p.target_reps, repRangeMax: p.rep_range_max || p.target_reps + 4, sets: [],
          }));
          const { data: sets } = await supabase.from("workout_sets").select("*").eq("workout_id", workoutId).order("set_number");
          if (sets) {
            for (const s of sets) {
              const group = groupsData.find((g) => g.exercise.id === s.exercise_id);
              if (group) group.sets.push({ id: s.id, exercise_id: s.exercise_id, set_number: s.set_number, reps: s.reps, weight: s.weight, rest_sec: s.rest_sec, completed: s.completed });
            }
          }
          setGroups(groupsData);
          if (workout.status === "in_progress") {
            const info: Record<string, SmartProgression> = {};
            for (const group of groupsData) {
              const result = await loadSmartProgression(group.exercise.id, group.exercise.name, group.exercise.muscle_group, workout.program_id as string, groupsData);
              if (result) info[group.exercise.id] = result;
            }
            setSmartProgression(info);
          }
        }
      } else {
        const { data: sets } = await supabase.from("workout_sets").select("*, exercises(id, name, muscle_group)").eq("workout_id", workoutId).order("set_number");
        if (sets && sets.length > 0) {
          const exerciseMap: Record<string, { exercise: Exercise; sets: WorkoutSet[] }> = {};
          const exerciseOrder: string[] = [];
          for (const s of sets) {
            const exId = s.exercises.id;
            if (!exerciseMap[exId]) { exerciseMap[exId] = { exercise: s.exercises as Exercise, sets: [] }; exerciseOrder.push(exId); }
            exerciseMap[exId].sets.push({ id: s.id, exercise_id: s.exercise_id, set_number: s.set_number, reps: s.reps, weight: s.weight, rest_sec: s.rest_sec, completed: s.completed });
          }
          const groupsData: ExerciseGroup[] = exerciseOrder.map((exId) => {
            const entry = exerciseMap[exId];
            const completedSets = entry.sets.filter((s) => s.completed);
            const avgReps = completedSets.length > 0 ? Math.round(completedSets.reduce((sum, s) => sum + s.reps, 0) / completedSets.length) : entry.sets[0].reps;
            const avgWeight = completedSets.length > 0 ? Math.round(completedSets.reduce((sum, s) => sum + s.weight, 0) / completedSets.length * 10) / 10 : entry.sets[0].weight;
            return { exercise: entry.exercise, targetSets: entry.sets.length, targetReps: avgReps, targetWeight: avgWeight, repRangeMin: avgReps, repRangeMax: avgReps + 4, sets: entry.sets };
          });
          setGroups(groupsData);
          if (workout.status === "in_progress") {
            const info: Record<string, SmartProgression> = {};
            for (const group of groupsData) {
              const result = await loadSmartProgression(group.exercise.id, group.exercise.name, group.exercise.muscle_group, null, groupsData);
              if (result) info[group.exercise.id] = result;
            }
            setSmartProgression(info);
          }
        }
      }
    }
    setLoadingData(false);
  }

  async function loadSmartProgression(exerciseId: string, exerciseName: string, muscleGroup: string | null, programId: string | null, allGroups: ExerciseGroup[]): Promise<SmartProgression | null> {
    let query = supabase.from("workouts").select("id, started_at").eq("user_id", user!.id).eq("status", "completed").neq("id", workoutId);
    if (programId) query = query.eq("program_id", programId); else query = query.is("program_id", null);
    const { data: pastWorkouts } = await query.order("started_at", { ascending: true });
    const sessions: ExerciseSession[] = [];
    if (pastWorkouts) {
      for (const w of pastWorkouts) {
        const { data: sets } = await supabase.from("workout_sets").select("reps, weight, completed").eq("workout_id", w.id).eq("exercise_id", exerciseId).order("set_number");
        if (sets && sets.length > 0) sessions.push({ date: w.started_at, sets: sets.map((s) => ({ reps: s.reps, weight: s.weight, completed: s.completed })) });
      }
    }
    const group = allGroups.find((g) => g.exercise.id === exerciseId);
    if (!group) return null;
    const history: ExerciseHistory = { exerciseId, exerciseName, muscleGroup, sessions };
    const targets: ProgressionTargets = { targetSets: group.targetSets, repRangeMin: group.repRangeMin, repRangeMax: group.repRangeMax, currentWeight: group.targetWeight };
    const analysis = analyzeProgression(history, targets);
    return { analysis, primary: analysis.primaryOption, alternative: analysis.alternativeOption, deload: analysis.deloadOption };
  }

  async function applyProgression(exerciseId: string, type: "reps" | "weight" | "deload") {
    const info = smartProgression[exerciseId];
    if (!info) return;
    const group = groups.find((g) => g.exercise.id === exerciseId);
    if (!group) return;
    let option: ProgressionOption;
    if (type === "reps" || type === "weight") option = type === "reps" ? info.primary : info.alternative;
    else { if (!info.deload) return; option = info.deload; }
    if (isOnline) { for (const set of group.sets) await supabase.from("workout_sets").update({ reps: option.reps, weight: option.weight }).eq("id", set.id); }
    else { for (const set of group.sets) await queueSync({ table: "workout_sets", operation: "update", payload: { reps: option.reps, weight: option.weight }, where: { id: set.id } }); setPendingSyncs((p) => p + group.sets.length); }
    setGroups(groups.map((g) => g.exercise.id === exerciseId ? { ...g, sets: g.sets.map((s) => ({ ...s, reps: option.reps, weight: option.weight })) } : g));
    setAppliedProgression((prev) => ({ ...prev, [exerciseId]: type }));
  }

  async function addSet(exerciseId: string) {
    const group = groups.find((g) => g.exercise.id === exerciseId);
    if (!group) return;
    const setNum = group.sets.length + 1;
    const lastSet = group.sets[group.sets.length - 1];
    const reps = lastSet?.reps || group.targetReps;
    const weight = lastSet?.weight || group.targetWeight;
    if (isOnline) {
      const { data } = await supabase.from("workout_sets").insert({ workout_id: workoutId, exercise_id: exerciseId, set_number: setNum, reps, weight, rest_sec: 90, completed: false }).select().single();
      if (data) setGroups(groups.map((g) => g.exercise.id === exerciseId ? { ...g, sets: [...g.sets, data as WorkoutSet] } : g));
    } else {
      const tempId = `temp_${Date.now()}_${setNum}`;
      await queueSync({ table: "workout_sets", operation: "insert", payload: { workout_id: workoutId, exercise_id: exerciseId, set_number: setNum, reps, weight, rest_sec: 90, completed: false } });
      setPendingSyncs((p) => p + 1);
      setGroups(groups.map((g) => g.exercise.id === exerciseId ? { ...g, sets: [...g.sets, { id: tempId, exercise_id: exerciseId, set_number: setNum, reps, weight, rest_sec: 90, completed: false }] } : g));
    }
  }

  async function updateSet(setId: string, field: string, value: number | boolean) {
    if (isOnline) await supabase.from("workout_sets").update({ [field]: value }).eq("id", setId);
    else { await queueSync({ table: "workout_sets", operation: "update", payload: { [field]: value }, where: { id: setId } }); setPendingSyncs((p) => p + 1); }
    setGroups(groups.map((g) => ({ ...g, sets: g.sets.map((s) => (s.id === setId ? { ...s, [field]: value } : s)) })));
    setDraftValues((prev) => { const n = { ...prev }; delete n[`${setId}-${field}`]; return n; });
  }

  function handleSetInput(setId: string, field: string, raw: string) {
    const filtered = raw.replace(/[^0-9.]/g, "");
    setDraftValues((prev) => ({ ...prev, [`${setId}-${field}`]: filtered }));
    setGroups(groups.map((g) => ({ ...g, sets: g.sets.map((s) => (s.id === setId ? { ...s, [field]: 0 } : s)) })));
  }

  function handleSetBlur(setId: string, field: string) {
    const key = `${setId}-${field}`;
    const raw = draftValues[key];
    if (raw !== undefined && raw !== "") {
      const val = parseFloat(raw);
      if (!isNaN(val)) { updateSet(setId, field, Math.max(0, val)); return; }
    }
    setDraftValues((prev) => { const n = { ...prev }; delete n[key]; return n; });
  }

  function getDisplayValue(set: WorkoutSet, field: string): string {
    const key = `${set.id}-${field}`;
    if (draftValues[key] !== undefined) return draftValues[key];
    return String(set[field as keyof WorkoutSet] ?? "");
  }

  function startRestTimer(exerciseId: string, restSec: number) {
    const saved = customRestSec[exerciseId];
    const duration = saved || restSec;
    setRestTimers((prev) => ({ ...prev, [exerciseId]: duration }));
    setTimerActive(exerciseId);
  }

  function openCustomTimer(exerciseId: string, restSec: number) {
    setShowCustomTimer(exerciseId);
    setRestTimers((prev) => ({ ...prev, [`${exerciseId}_default`]: restSec }));
  }

  function setCustomAndStart(exerciseId: string, seconds: number) {
    setCustomRestSec((prev) => ({ ...prev, [exerciseId]: seconds }));
    setRestTimers((prev) => ({ ...prev, [exerciseId]: seconds }));
    setTimerActive(exerciseId);
    setShowCustomTimer(null);
  }

  function formatTimer(seconds: number): string { const m = Math.floor(seconds / 60); const s = seconds % 60; return `${m}:${s.toString().padStart(2, "0")}`; }

  function playTimerSound() {
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const playBeep = (time: number, freq: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = "sine";
        gain.gain.setValueAtTime(0.3, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
        osc.start(time);
        osc.stop(time + duration);
      };
      const now = ctx.currentTime;
      playBeep(now, 880, 0.15);
      playBeep(now + 0.2, 880, 0.15);
      playBeep(now + 0.4, 1100, 0.3);
    } catch {}
  }

  function navigateExercise(direction: "next" | "prev") {
    if (direction === "next" && currentExerciseIndex < groups.length - 1) {
      setSlideDirection("left");
      setTimeout(() => { setCurrentExerciseIndex((i) => i + 1); setSlideDirection(null); }, 150);
    } else if (direction === "prev" && currentExerciseIndex > 0) {
      setSlideDirection("right");
      setTimeout(() => { setCurrentExerciseIndex((i) => i - 1); setSlideDirection(null); }, 150);
    }
  }

  async function finishWorkout() {
    const completedAt = new Date().toISOString();
    if (isOnline) await supabase.from("workouts").update({ status: "completed", completed_at: completedAt }).eq("id", workoutId);
    else { await queueSync({ table: "workouts", operation: "update", payload: { status: "completed", completed_at: completedAt }, where: { id: workoutId } }); setPendingSyncs((p) => p + 1); }
    setShowConfetti(true);
    setTimeout(() => router.push("/programs"), 2500);
  }

  async function cancelWorkout() {
    if (isOnline) { await supabase.from("workout_sets").delete().eq("workout_id", workoutId); await supabase.from("workouts").delete().eq("id", workoutId); }
    else { await queueSync({ table: "workout_sets", operation: "delete", where: { workout_id: workoutId } }); await queueSync({ table: "workouts", operation: "delete", where: { id: workoutId } }); setPendingSyncs((p) => p + 2); }
    router.push("/programs");
  }

  if (loading || !user) return <p className="p-6">Chargement...</p>;

  // All-exercises view (read-only / history)
  if (showAllExercises || isReadOnly) {
    return (
      <main className="flex min-h-screen flex-col p-4 pb-28 animate-fade-in">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => setShowAllExercises(false)} className="p-2 rounded-xl active:scale-95 transition-all" style={{ backgroundColor: "hsl(220 15% 9%)" }}>
            <ArrowLeft className="h-5 w-5 text-white/60" />
          </button>
          <h1 className="text-xl font-bold text-white">{programName}</h1>
        </div>
        {isReadOnly && (
          <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full w-fit mb-4 ${workoutStatus === "completed" ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"}`}>
            {workoutStatus === "completed" ? "Terminée" : "Annulée"}
          </span>
        )}
        <div className="flex flex-col gap-5">
          {groups.map((group) => (
            <div key={group.exercise.id}>
              <h2 className="text-base font-semibold mb-3 text-white">
                {group.exercise.name}
                {group.exercise.muscle_group && <span className="text-sm ml-1.5" style={{ color: "hsl(220 15% 40%)" }}>({group.exercise.muscle_group})</span>}
              </h2>
              <div className="flex flex-col gap-2">
                {group.sets.map((set) => (
                  <div key={set.id} className={`flex items-center gap-3 rounded-xl p-3 transition-all ${set.completed ? "border-green-500/30 bg-green-500/5" : "border-neutral-800 bg-neutral-900"}`}>
                    <span className="text-xs w-7 font-mono" style={{ color: "hsl(220 15% 40%)" }}>S{set.set_number}</span>
                    <span className="w-20 text-center font-semibold text-sm text-white">{displayWeight(set.weight)}</span>
                    <span className="w-16 text-center text-sm" style={{ color: "hsl(220 15% 50%)" }}>{set.reps} reps</span>
                    {set.completed && <Check className="ml-auto h-4 w-4" style={{ color: "hsl(142 71% 45%)" }} />}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
    );
  }

  // One-exercise-at-a-time view
  const sp = currentGroup ? smartProgression[currentGroup.exercise.id] : null;
  const timer = currentGroup ? restTimers[currentGroup.exercise.id] : undefined;
  const isTimerRunning = currentGroup ? timerActive === currentGroup.exercise.id : false;

  return (
    <main className="flex min-h-screen flex-col animate-fade-in">
      {/* Top bar */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between">
          <Link href="/programs" className="p-2 rounded-xl active:scale-95 transition-all" style={{ backgroundColor: "hsl(220 15% 9%)" }}>
            <ArrowLeft className="h-5 w-5 text-white/60" />
          </Link>
          <div className="flex items-center gap-2">
            {!isOnline && <span className="flex items-center gap-1 text-xs font-medium" style={{ color: "hsl(0 72% 51%)" }}><span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "hsl(0 72% 51%)" }} />Hors ligne</span>}
          </div>
        </div>
      </div>

      {/* Exercise stepper */}
      <div className="px-4 py-2 flex items-center gap-1.5 overflow-x-auto">
        {groups.map((g, i) => {
          const exSets = g.sets;
          const exCompleted = exSets.filter((s) => s.completed).length;
          const isDone = exSets.length > 0 && exCompleted === exSets.length;
          const isCurrent = i === currentExerciseIndex;
          return (
            <button
              key={g.exercise.id}
              onClick={() => { setCurrentExerciseIndex(i); setSlideDirection(i > currentExerciseIndex ? "left" : "right"); }}
              className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all active:scale-95"
              style={isCurrent
                ? { background: "linear-gradient(135deg, hsl(142 71% 45%), hsl(142 71% 35%))", color: "white", boxShadow: "0 2px 8px hsl(142 71% 45% / 0.3)" }
                : isDone
                  ? { backgroundColor: "hsl(142 71% 45% / 0.15)", color: "hsl(142 71% 45%)" }
                  : { backgroundColor: "hsl(220 15% 11%)", color: "hsl(220 15% 40%)" }
              }
            >
              {isDone ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </button>
          );
        })}
      </div>

      {/* Exercise content */}
      <div className={`flex-1 px-4 py-4 ${slideDirection === "left" ? "opacity-0 translate-x-8" : slideDirection === "right" ? "opacity-0 -translate-x-8" : "opacity-100 translate-x-0"}`}
        style={{ transition: slideDirection ? "all 0.2s ease-out" : "none" }}
      >
        {currentGroup && (
          <>
            {/* Exercise header */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-white mb-1">{currentGroup.exercise.name}</h1>
              {currentGroup.exercise.muscle_group && (
                <p className="text-sm" style={{ color: "hsl(220 15% 40%)" }}>{currentGroup.exercise.muscle_group}</p>
              )}
            </div>

            {/* Smart progression */}
            {!isReadOnly && sp && (
              <div className="mb-4 rounded-xl p-3 animate-scale-in" style={{ backgroundColor: "hsl(142 71% 45% / 0.05)", border: "1px solid hsl(142 71% 45% / 0.2)" }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5" style={{ color: "hsl(142 71% 45%)" }} />
                    <p className="text-xs font-semibold" style={{ color: "hsl(142 71% 45%)" }}>Surcharge intelligente</p>
                  </div>
                  <div className="flex gap-2 text-[10px]" style={{ color: "hsl(220 15% 40%)" }}>
                    <span className="flex items-center gap-0.5"><TrendingUp className="h-3 w-3" />{sp.analysis.current1RM} kg</span>
                    <span>{Math.round(sp.analysis.totalVolumeLastSession)} kg</span>
                    {sp.analysis.isPlateau && <span className="flex items-center gap-0.5" style={{ color: "hsl(0 72% 51%)" }}><AlertTriangle className="h-3 w-3" />Plateau</span>}
                  </div>
                </div>
                <div className="flex gap-2 mb-2">
                  <button onClick={() => applyProgression(currentGroup.exercise.id, sp.primary.type)} className="flex-1 rounded-xl px-3 py-2.5 text-xs font-semibold active:scale-95 transition-all"
                    style={appliedProgression[currentGroup.exercise.id] === "reps"
                      ? { background: "linear-gradient(135deg, hsl(142 71% 45%), hsl(142 71% 35%))", boxShadow: "0 4px 12px hsl(142 71% 45% / 0.25)", color: "white" }
                      : { backgroundColor: "hsl(220 15% 11%)", border: "1px solid hsl(220 15% 16%)", color: "hsl(220 15% 70%)" }
                    }
                  >
                    {sp.primary.label}
                  </button>
                  <button onClick={() => applyProgression(currentGroup.exercise.id, sp.alternative.type)} className="flex-1 rounded-xl px-3 py-2.5 text-xs font-semibold active:scale-95 transition-all"
                    style={appliedProgression[currentGroup.exercise.id] === "weight"
                      ? { background: "linear-gradient(135deg, hsl(142 71% 45%), hsl(142 71% 35%))", boxShadow: "0 4px 12px hsl(142 71% 45% / 0.25)", color: "white" }
                      : { backgroundColor: "hsl(220 15% 11%)", border: "1px solid hsl(220 15% 16%)", color: "hsl(220 15% 70%)" }
                    }
                  >
                    {sp.alternative.label}
                  </button>
                </div>
                {sp.deload && (
                  <button onClick={() => applyProgression(currentGroup.exercise.id, "deload")} className="w-full rounded-xl px-3 py-2.5 text-xs font-semibold active:scale-95 transition-all" style={{ backgroundColor: "hsl(0 72% 51% / 0.08)", border: "1px solid hsl(0 72% 51% / 0.2)", color: "hsl(0 72% 51%)" }}>
                    {sp.deload.label}
                  </button>
                )}
              </div>
            )}

            {/* Rest timer */}
            {isTimerRunning && timer !== undefined && (
              <div className="mb-4 rounded-xl p-5 text-center animate-scale-in" style={{ backgroundColor: "hsl(220 15% 9%)", border: "1px solid hsl(142 71% 45% / 0.2)" }}>
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <Timer className="h-4 w-4" style={{ color: "hsl(142 71% 45%)" }} />
                  <p className="text-xs" style={{ color: "hsl(220 15% 40%)" }}>Repos</p>
                </div>
                <p className="text-4xl font-bold font-mono" style={{ color: "hsl(142 71% 45%)" }}>{formatTimer(timer)}</p>
              </div>
            )}

            {/* Custom timer popup */}
            {showCustomTimer === currentGroup.exercise.id && (
              <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ backgroundColor: "hsl(220 15% 6% / 0.7)", backdropFilter: "blur(8px)" }}>
                <div className="w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-6 animate-slide-up" style={{ backgroundColor: "hsl(220 15% 9%)", border: "1px solid hsl(220 15% 14%)", boxShadow: "0 24px 48px hsl(0 0% 0% / 0.4)" }}>
                  <div className="flex items-center justify-between mb-4">
                    <p className="font-semibold text-sm text-white">Temps de repos</p>
                    <button onClick={() => setShowCustomTimer(null)} className="text-xs active:scale-95 transition-all" style={{ color: "hsl(220 15% 45%)" }}>Retour</button>
                  </div>
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    {[30, 60, 90, 120, 150, 180, 240, 300].map((sec) => (
                      <button key={sec} onClick={() => setCustomAndStart(currentGroup.exercise.id, sec)} className="rounded-xl py-3 text-center font-mono text-sm font-semibold active:scale-[0.95] transition-all" style={{ backgroundColor: "hsl(220 15% 11%)", border: "1px solid hsl(220 15% 16%)", color: "hsl(220 15% 75%)" }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = "hsl(142 71% 45% / 0.5)"; e.currentTarget.style.color = "hsl(142 71% 45%)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "hsl(220 15% 16%)"; e.currentTarget.style.color = "hsl(220 15% 75%)"; }}
                      >
                        {sec >= 60 ? `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, "0")}` : `${sec}s`}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setCustomAndStart(currentGroup.exercise.id, 0)} className="w-full rounded-xl py-3 text-sm active:scale-95 transition-all" style={{ backgroundColor: "hsl(220 15% 11%)", border: "1px solid hsl(220 15% 16%)", color: "hsl(220 15% 45%)" }}>
                    Pas de repos
                  </button>
                </div>
              </div>
            )}

            {/* Sets */}
            <div className="flex flex-col gap-2.5">
              {currentGroup.sets.map((set, idx) => (
                <div key={set.id} className={`flex items-center gap-3 rounded-2xl p-4 transition-all animate-scale-in ${set.completed ? "border-green-500/30 bg-green-500/5" : "border-neutral-800 bg-neutral-900"}`} style={{ animationDelay: `${idx * 0.05}s` }}>
                  <span className="text-xs w-8 font-mono text-center" style={{ color: "hsl(220 15% 35%)" }}>S{set.set_number}</span>
                  <div className="flex-1 flex items-center gap-3">
                    <div className="flex-1">
                      <label className="text-[10px] block mb-1" style={{ color: "hsl(220 15% 35%)" }}>Poids ({unit})</label>
                      <input type="text" inputMode="decimal" value={getDisplayValue(set, "weight")} onChange={(e) => handleSetInput(set.id, "weight", e.target.value)} onBlur={() => handleSetBlur(set.id, "weight")} className="w-full rounded-xl px-3 py-2.5 text-center text-lg font-semibold text-white focus:outline-none transition-all" style={{ backgroundColor: "hsl(220 15% 11%)", border: "1px solid hsl(220 15% 16%)" }} />
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] block mb-1" style={{ color: "hsl(220 15% 35%)" }}>Reps</label>
                      <input type="text" inputMode="numeric" value={getDisplayValue(set, "reps")} onChange={(e) => handleSetInput(set.id, "reps", e.target.value)} onBlur={() => handleSetBlur(set.id, "reps")} className="w-full rounded-xl px-3 py-2.5 text-center text-lg font-semibold text-white focus:outline-none transition-all" style={{ backgroundColor: "hsl(220 15% 11%)", border: "1px solid hsl(220 15% 16%)" }} />
                    </div>
                  </div>
                  <button onClick={() => { updateSet(set.id, "completed", !set.completed); if (!set.completed && set.rest_sec > 0) openCustomTimer(currentGroup.exercise.id, set.rest_sec); }} className={`w-12 h-12 rounded-xl flex items-center justify-center active:scale-95 transition-all ${set.completed ? "text-white" : "border border-neutral-800 text-white/40"}`}
                    style={set.completed ? { background: "linear-gradient(135deg, hsl(142 71% 45%), hsl(142 71% 35%))", boxShadow: "0 4px 12px hsl(142 71% 45% / 0.25)" } : {}}
                  >
                    <Check className="h-5 w-5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add set */}
            {!isReadOnly && (
              <button onClick={() => addSet(currentGroup.exercise.id)} className="mt-4 w-full rounded-xl py-3 text-sm font-medium flex items-center justify-center gap-2 active:scale-[0.98] transition-all" style={{ backgroundColor: "hsl(220 15% 9%)", border: "1px dashed hsl(220 15% 16%)", color: "hsl(220 15% 45%)" }}>
                <Plus className="h-4 w-4" />
                Ajouter une série
              </button>
            )}
          </>
        )}
      </div>

      {/* Bottom bar */}
      {!isReadOnly && (
        <div className="fixed bottom-0 left-0 right-0 p-4" style={{ backgroundColor: "hsl(220 15% 9% / 0.95)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderTop: "1px solid hsl(220 15% 14%)" }}>
          <div className="flex items-center gap-3 mb-3">
            <button onClick={() => navigateExercise("prev")} disabled={currentExerciseIndex === 0} className="p-2.5 rounded-xl active:scale-95 transition-all disabled:opacity-30" style={{ backgroundColor: "hsl(220 15% 11%)", border: "1px solid hsl(220 15% 16%)" }}>
              <ChevronLeft className="h-5 w-5 text-white" />
            </button>
            <div className="flex-1">
              <ProgressBar value={completedSets} max={Math.max(totalSets, 1)} label={`${completedSets}/${totalSets} séries`} />
            </div>
            <button onClick={() => navigateExercise("next")} disabled={currentExerciseIndex >= groups.length - 1} className="p-2.5 rounded-xl active:scale-95 transition-all disabled:opacity-30" style={{ backgroundColor: "hsl(220 15% 11%)", border: "1px solid hsl(220 15% 16%)" }}>
              <ChevronRight className="h-5 w-5 text-white" />
            </button>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowAllExercises(true)} className="rounded-xl px-4 py-3 text-sm font-medium active:scale-95 transition-all" style={{ backgroundColor: "hsl(220 15% 11%)", border: "1px solid hsl(220 15% 16%)", color: "hsl(220 15% 60%)" }}>
              <List className="h-4 w-4" />
            </button>
            <button onClick={finishWorkout} className="flex-1 rounded-xl px-6 py-4 text-base font-bold text-white active:scale-[0.98] transition-all" style={{ background: "linear-gradient(135deg, hsl(142 71% 45%), hsl(142 71% 35%))", boxShadow: completedSets === totalSets && totalSets > 0 ? "0 0 32px hsl(142 71% 45% / 0.4)" : "0 4px 16px hsl(142 71% 45% / 0.3)" }}>
              {completedSets === totalSets && totalSets > 0 ? "✓ Finir la séance" : "Terminer la séance"}
            </button>
          </div>
        </div>
      )}

      <Confetti active={showConfetti} />

      <ConfirmDialog open={showCancelConfirm} title="Annuler la séance" description="Toutes les données de cette séance seront perdues." confirmLabel="Annuler la séance" danger onConfirm={cancelWorkout} onCancel={() => setShowCancelConfirm(false)} />
    </main>
  );
}
