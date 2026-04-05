"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { analyzeProgression, estimate1RM, type ExerciseHistory, type ExerciseSession, type ProgressionTargets, type ProgressionOption } from "@/lib/progression";
import { useOnlineStatus, processSyncQueue, queueSync, cacheWorkoutData, getCachedWorkout } from "@/hooks/useOfflineSync";
import ConfirmDialog from "@/components/ConfirmDialog";
import Confetti from "@/components/Confetti";
import ProgressBar from "@/components/ProgressBar";
import { t } from "@/lib/i18n";
import { useApp } from "@/lib/context";
import Link from "next/link";
import {
  ArrowLeft, Plus, Check, X, WifiOff, Zap, TrendingUp, Timer, AlertTriangle,
  ChevronLeft, ChevronRight, Dumbbell, List, Trophy, Clock
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

interface LastSessionSet {
  exerciseId: string;
  setNumber: number;
  reps: number;
  weight: number;
}

const PLATE_SIZES = [25, 20, 15, 10, 5, 2.5, 1.25];
const BAR_WEIGHT = 20;

function calculatePlates(targetWeight: number): { plates: { size: number; count: number }[]; barWeight: number } {
  if (targetWeight <= BAR_WEIGHT) return { plates: [], barWeight: BAR_WEIGHT };
  let remaining = targetWeight - BAR_WEIGHT;
  const plates: Record<number, number> = {};
  for (const size of PLATE_SIZES) {
    const count = Math.floor(remaining / (size * 2));
    if (count > 0) plates[size] = count;
    remaining -= count * size * 2;
    if (remaining < 0.01) break;
  }
  return { plates: Object.entries(plates).map(([size, count]) => ({ size: parseFloat(size), count })), barWeight: BAR_WEIGHT };
}

export default function WorkoutDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { user, loading } = useAuth();
  const { lang } = useApp();
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
  const [defaultRestTime, setDefaultRestTime] = useState(90);
  const [timerSoundEnabled, setTimerSoundEnabled] = useState(true);
  const [showSummary, setShowSummary] = useState(false);
  const [showExerciseHistory, setShowExerciseHistory] = useState(false);
  const [exerciseHistory, setExerciseHistory] = useState<{ date: string; weight: number; reps: number; oneRM: number }[]>([]);
  const [showPR, setShowPR] = useState(false);
  const [prInfo, setPRInfo] = useState({ exercise: "", oneRM: 0 });
  const [lastSessionSets, setLastSessionSets] = useState<Record<string, LastSessionSet[]>>({});
  const [lastSessionVolume, setLastSessionVolume] = useState(0);
  const [newPRs, setNewPRs] = useState<string[]>([]);
  const [showPlates, setShowPlates] = useState<string | null>(null);
  const [completedSetAnimations, setCompletedSetAnimations] = useState<Record<string, boolean>>({});

  const onlineStatus = useOnlineStatus();
  const workoutStartTime = useRef<number>(Date.now());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => { setIsOnlineState(onlineStatus); }, [onlineStatus]);

  useEffect(() => {
    if (onlineStatus && pendingSyncs > 0) {
      processSyncQueue().then((synced) => {
        if (synced > 0) setPendingSyncs((p) => Math.max(0, p - synced));
      });
    }
  }, [onlineStatus]);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - workoutStartTime.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  function formatElapsed(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

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
    const { data } = await supabase.from("profiles").select("unit, rest_time, timer_sound").eq("id", user!.id).single();
    if (data) {
      setUnit(data.unit as "kg" | "lbs");
      if (data.rest_time) setDefaultRestTime(data.rest_time);
      if (data.timer_sound !== undefined && data.timer_sound !== null) setTimerSoundEnabled(data.timer_sound);
    }
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

      let groupsData: ExerciseGroup[] = [];
      let programId: string | null = null;

      if (workout.program_id) {
        programId = workout.program_id as string;
        const { data: pe } = await supabase.from("program_exercises").select("exercise_id, target_sets, target_reps, target_weight, exercises(id, name, muscle_group)").eq("program_id", workout.program_id as string).order("sort_order");
        if (pe) {
          groupsData = (pe as unknown as ProgramExercise[]).map((p) => ({
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
          groupsData = exerciseOrder.map((exId) => {
            const entry = exerciseMap[exId];
            const completedSetsArr = entry.sets.filter((s) => s.completed);
            const avgReps = completedSetsArr.length > 0 ? Math.round(completedSetsArr.reduce((sum, s) => sum + s.reps, 0) / completedSetsArr.length) : entry.sets[0].reps;
            const avgWeight = completedSetsArr.length > 0 ? Math.round(completedSetsArr.reduce((sum, s) => sum + s.weight, 0) / completedSetsArr.length * 10) / 10 : entry.sets[0].weight;
            return { exercise: entry.exercise, targetSets: entry.sets.length, targetReps: avgReps, targetWeight: avgWeight, repRangeMin: avgReps, repRangeMax: avgReps + 4, sets: entry.sets };
          });
        }
      }

      setGroups(groupsData);

      if (workout.status === "in_progress") {
        const info: Record<string, SmartProgression> = {};
        const lastSetsMap: Record<string, LastSessionSet[]> = {};
        let lastVol = 0;

        for (const group of groupsData) {
          const result = await loadSmartProgression(group.exercise.id, group.exercise.name, group.exercise.muscle_group, programId, groupsData);
          if (result) info[group.exercise.id] = result;

          const { data: lastWorkout } = await supabase.from("workouts").select("id").eq("user_id", user!.id).eq("status", "completed").neq("id", workoutId).order("started_at", { ascending: false }).limit(1).single();
          if (lastWorkout) {
            const { data: lastSets } = await supabase.from("workout_sets").select("exercise_id, set_number, reps, weight, completed").eq("workout_id", lastWorkout.id).eq("exercise_id", group.exercise.id).order("set_number");
            if (lastSets && lastSets.length > 0) {
              lastSetsMap[group.exercise.id] = lastSets.map((s) => ({ exerciseId: s.exercise_id, setNumber: s.set_number, reps: s.reps, weight: s.weight }));
              for (const s of lastSets) { if (s.completed) lastVol += s.weight * s.reps; }
            }
          }
        }
        setSmartProgression(info);
        setLastSessionSets(lastSetsMap);
        setLastSessionVolume(Math.round(lastVol));
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

  function triggerHaptic(pattern: "light" | "medium" | "success" | "pr") {
    if (typeof navigator === "undefined" || !navigator.vibrate) return;
    const patterns = { light: 10, medium: 30, success: [30, 20, 30], pr: [50, 30, 50, 30, 100] };
    navigator.vibrate(patterns[pattern]);
  }

  async function checkForPR(exerciseId: string, exerciseName: string) {
    const group = groups.find((g) => g.exercise.id === exerciseId);
    if (!group) return;
    const bestSet = group.sets.filter((s) => s.completed).reduce((best, s) => {
      const oneRM = estimate1RM(s.weight, s.reps);
      return oneRM > best ? oneRM : best;
    }, 0);
    if (bestSet > 0 && smartProgression[exerciseId]) {
      const currentBest = smartProgression[exerciseId].analysis.bestSession1RM;
      if (bestSet > currentBest) {
        setPRInfo({ exercise: exerciseName, oneRM: Math.round(bestSet * 10) / 10 });
        setShowPR(true);
        setNewPRs((prev) => [...prev, `${exerciseName}: ${Math.round(bestSet * 10) / 10} kg`]);
        triggerHaptic("pr");
        setTimeout(() => setShowPR(false), 4000);
      }
    }
  }

  async function loadExerciseHistory(exerciseId: string) {
    const { data: workouts } = await supabase.from("workouts").select("id, started_at").eq("user_id", user!.id).eq("status", "completed").order("started_at", { ascending: false }).limit(20);
    if (!workouts) { setExerciseHistory([]); return; }
    const history: { date: string; weight: number; reps: number; oneRM: number }[] = [];
    for (const w of workouts) {
      const { data: sets } = await supabase.from("workout_sets").select("exercise_id, reps, weight, completed").eq("workout_id", w.id);
      if (sets) {
        const exSets = sets.filter((s) => s.exercise_id === exerciseId && s.completed);
        if (exSets.length > 0) {
          const best = exSets.reduce((b, s) => { const rm = estimate1RM(s.weight, s.reps); return rm > b.oneRM ? { date: w.started_at, weight: s.weight, reps: s.reps, oneRM: rm } : b; }, { date: w.started_at, weight: 0, reps: 0, oneRM: 0 });
          history.push(best);
        }
      }
    }
    setExerciseHistory(history.slice(0, 10));
    setShowExerciseHistory(true);
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

  function getVsLast(exerciseId: string, setNumber: number, field: "weight" | "reps"): { diff: number; status: "above" | "below" | "same" | "none" } {
    const lastSets = lastSessionSets[exerciseId];
    if (!lastSets) return { diff: 0, status: "none" };
    const lastSet = lastSets.find((s) => s.setNumber === setNumber);
    if (!lastSet) return { diff: 0, status: "none" };
    const currentVal = field === "weight" ? lastSet.weight : lastSet.reps;
    const diff = 0;
    return { diff: 0, status: "none" };
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
    if (!timerSoundEnabled) return;
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
    triggerHaptic("success");
    setShowConfetti(true);
    setShowSummary(true);
  }

  async function cancelWorkout() {
    if (isOnline) { await supabase.from("workout_sets").delete().eq("workout_id", workoutId); await supabase.from("workouts").delete().eq("id", workoutId); }
    else { await queueSync({ table: "workout_sets", operation: "delete", where: { workout_id: workoutId } }); await queueSync({ table: "workouts", operation: "delete", where: { id: workoutId } }); setPendingSyncs((p) => p + 2); }
    router.push("/programs");
  }

  if (loading || !user) return <p className="p-6">Chargement...</p>;

  if (showAllExercises || isReadOnly) {
    return (
      <main className="flex min-h-screen flex-col p-4 pb-28 animate-fade-in">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => { if (isReadOnly) router.push("/programs"); else setShowAllExercises(false); }} className="p-2 rounded-xl active:scale-95 transition-all" style={{ backgroundColor: "hsl(var(--card))" }}>
            <ArrowLeft className="h-5 w-5 text-[hsl(var(--text-white-60))]" />
          </button>
          <h1 className="text-xl font-bold text-[hsl(var(--text-white))]">{programName}</h1>
        </div>
        {isReadOnly && (
          <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full w-fit mb-4 ${workoutStatus === "completed" ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"}`}>
            {workoutStatus === "completed" ? "Terminée" : "Annulée"}
          </span>
        )}
        <div className="flex flex-col gap-5">
          {groups.map((group) => (
            <div key={group.exercise.id}>
              <h2 className="text-base font-semibold mb-3 text-[hsl(var(--text-white))]">
                {group.exercise.name}
                {group.exercise.muscle_group && <span className="text-sm ml-1.5" style={{ color: "hsl(var(--muted-foreground-dim))" }}>({group.exercise.muscle_group})</span>}
              </h2>
              <div className="flex flex-col gap-2">
                {group.sets.map((set) => (
                  <div key={set.id} className={`flex items-center gap-3 rounded-xl p-3 transition-all ${set.completed ? "border-green-500/30 bg-green-500/5" : "border-[hsl(var(--card-border))] bg-[hsl(var(--card-bg-muted))]"}`}>
                    <span className="text-xs w-7 font-mono" style={{ color: "hsl(var(--muted-foreground-dim))" }}>S{set.set_number}</span>
                    <span className="w-20 text-center font-semibold text-sm text-[hsl(var(--text-white))]">{displayWeight(set.weight)}</span>
                    <span className="w-16 text-center text-sm" style={{ color: "hsl(var(--icon-muted))" }}>{set.reps} reps</span>
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

  const sp = currentGroup ? smartProgression[currentGroup.exercise.id] : null;
  const timer = currentGroup ? restTimers[currentGroup.exercise.id] : undefined;
  const isTimerRunning = currentGroup ? timerActive === currentGroup.exercise.id : false;

  const currentVolume = groups.reduce((acc, g) => acc + g.sets.filter((s) => s.completed).reduce((a, s) => a + s.weight * s.reps, 0), 0);
  const volumeDiff = lastSessionVolume > 0 ? Math.round(currentVolume - lastSessionVolume) : 0;

  return (
    <main className="flex min-h-screen flex-col animate-fade-in">
      {/* Top bar */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between">
          <Link href="/programs" className="p-2 rounded-xl active:scale-95 transition-all" style={{ backgroundColor: "hsl(var(--card))" }}>
            <ArrowLeft className="h-5 w-5 text-[hsl(var(--text-white-60))]" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5" style={{ backgroundColor: "hsl(var(--card-bg-muted))" }}>
              <Clock className="h-3.5 w-3.5" style={{ color: "hsl(var(--muted-foreground))" }} />
              <span className="text-xs font-mono font-semibold text-[hsl(var(--text-white))]">{formatElapsed(elapsedSeconds)}</span>
            </div>
            {!isOnline && <span className="flex items-center gap-1 text-xs font-medium" style={{ color: "hsl(0 72% 51%)" }}><span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "hsl(0 72% 51%)" }} />{t("workout_offline", lang)}</span>}
          </div>
        </div>
      </div>

      {/* Exercise stepper - FIXED */}
      <div className="px-4 py-2 flex items-center gap-1.5 overflow-x-auto">
        {groups.map((g, i) => {
          const exSets = g.sets;
          const exCompleted = exSets.filter((s) => s.completed).length;
          const isDone = exSets.length > 0 && exCompleted === exSets.length;
          const isCurrent = i === currentExerciseIndex;
          return (
            <button
              key={g.exercise.id}
              onClick={() => {
                if (i === currentExerciseIndex) return;
                setSlideDirection(i > currentExerciseIndex ? "left" : "right");
                setTimeout(() => { setCurrentExerciseIndex(i); setSlideDirection(null); }, 150);
              }}
              className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold transition-all active:scale-95 ${isCurrent ? "text-[hsl(var(--text-white))]" : isDone ? "text-[hsl(var(--text-white))]" : "text-[hsl(var(--muted-foreground-dim))]"}`}
              style={isCurrent
                ? { background: "linear-gradient(135deg, hsl(142 71% 45%), hsl(142 71% 35%))", boxShadow: "0 2px 8px hsl(142 71% 45% / 0.3)" }
                : isDone
                  ? { backgroundColor: "hsl(142 71% 45% / 0.15)", border: "1px solid hsl(142 71% 45% / 0.3)" }
                  : { backgroundColor: "hsl(var(--card-bg-muted))", border: "1px solid hsl(var(--inactive-btn-border))" }
              }
            >
              {isDone ? <Check className="h-4 w-4" /> : i + 1}
            </button>
          );
        })}
      </div>

      {/* Exercise content */}
      <div className={`flex-1 px-4 py-4 ${slideDirection === "left" ? "opacity-0 translate-x-8" : slideDirection === "right" ? "opacity-0 -translate-x-8" : ""}`}
        style={slideDirection ? { transition: "all 0.2s ease-out" } : {}}
      >
        {currentGroup && (
          <>
            {/* Exercise header */}
            <div className="mb-5">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-[hsl(var(--text-white))] mb-1">{currentGroup.exercise.name}</h1>
                  {currentGroup.exercise.muscle_group && (
                    <p className="text-sm" style={{ color: "hsl(var(--muted-foreground-dim))" }}>{currentGroup.exercise.muscle_group}</p>
                  )}
                </div>
                <button onClick={() => loadExerciseHistory(currentGroup.exercise.id)} className="p-2 rounded-xl active:scale-95 transition-all" style={{ backgroundColor: "hsl(var(--card-bg-muted))", border: "1px solid hsl(var(--inactive-btn-border))" }}>
                  <TrendingUp className="h-4 w-4" style={{ color: "hsl(var(--icon-muted))" }} />
                </button>
              </div>
            </div>

            {/* Smart progression */}
            {!isReadOnly && sp && (
              <div className="mb-4 rounded-xl p-3 animate-scale-in" style={{ backgroundColor: "hsl(142 71% 45% / 0.05)", border: "1px solid hsl(142 71% 45% / 0.2)" }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5" style={{ color: "hsl(142 71% 45%)" }} />
                    <p className="text-xs font-semibold" style={{ color: "hsl(142 71% 45%)" }}>{t("workout_smart", lang)}</p>
                  </div>
                  <div className="flex gap-2 text-[10px]" style={{ color: "hsl(var(--muted-foreground-dim))" }}>
                    <span className="flex items-center gap-0.5"><TrendingUp className="h-3 w-3" />{sp.analysis.current1RM} kg</span>
                    <span>{Math.round(sp.analysis.totalVolumeLastSession)} kg</span>
                    {sp.analysis.isPlateau && <span className="flex items-center gap-0.5" style={{ color: "hsl(0 72% 51%)" }}><AlertTriangle className="h-3 w-3" />{t("workout_plateau", lang)}</span>}
                  </div>
                </div>
                <div className="flex gap-2 mb-2">
                  <button onClick={() => applyProgression(currentGroup.exercise.id, sp.primary.type)} className="flex-1 rounded-xl px-3 py-2.5 text-xs font-semibold active:scale-95 transition-all"
                    style={appliedProgression[currentGroup.exercise.id] === "reps"
                      ? { background: "linear-gradient(135deg, hsl(142 71% 45%), hsl(142 71% 35%))", boxShadow: "0 4px 12px hsl(142 71% 45% / 0.25)", color: "white" }
                      : { backgroundColor: "hsl(var(--card-bg-muted))", border: "1px solid hsl(var(--inactive-btn-border))", color: "hsl(var(--inactive-btn-text-light))" }
                    }
                  >
                    {sp.primary.label}
                  </button>
                  <button onClick={() => applyProgression(currentGroup.exercise.id, sp.alternative.type)} className="flex-1 rounded-xl px-3 py-2.5 text-xs font-semibold active:scale-95 transition-all"
                    style={appliedProgression[currentGroup.exercise.id] === "weight"
                      ? { background: "linear-gradient(135deg, hsl(142 71% 45%), hsl(142 71% 35%))", boxShadow: "0 4px 12px hsl(142 71% 45% / 0.25)", color: "white" }
                      : { backgroundColor: "hsl(var(--card-bg-muted))", border: "1px solid hsl(var(--inactive-btn-border))", color: "hsl(var(--inactive-btn-text-light))" }
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
              <div className="mb-4 rounded-xl p-5 text-center animate-scale-in" style={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(142 71% 45% / 0.2)" }}>
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <Timer className="h-4 w-4" style={{ color: "hsl(142 71% 45%)" }} />
                  <p className="text-xs" style={{ color: "hsl(var(--muted-foreground-dim))" }}>{t("workout_rest", lang)}</p>
                </div>
                <p className="text-4xl font-bold font-mono" style={{ color: "hsl(142 71% 45%)" }}>{formatTimer(timer)}</p>
              </div>
            )}

            {/* Custom timer popup */}
            {showCustomTimer === currentGroup.exercise.id && (
              <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ backgroundColor: "hsl(var(--overlay))", backdropFilter: "blur(8px)" }}>
                <div className="w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-6 animate-slide-up" style={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--card-border))", boxShadow: "0 24px 48px hsl(var(--shadow-heavy))" }}>
                  <div className="flex items-center justify-between mb-4">
                    <p className="font-semibold text-sm text-[hsl(var(--text-white))]">{t("workout_rest_time", lang)}</p>
                    <button onClick={() => setShowCustomTimer(null)} className="text-xs active:scale-95 transition-all" style={{ color: "hsl(var(--muted-foreground))" }}>{t("workout_back_btn", lang)}</button>
                  </div>
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    {[30, 60, 90, 120, 150, 180, 240, 300].map((sec) => (
                      <button key={sec} onClick={() => setCustomAndStart(currentGroup.exercise.id, sec)} className="rounded-xl py-3 text-center font-mono text-sm font-semibold active:scale-[0.95] transition-all"
                        style={defaultRestTime === sec ? { background: "linear-gradient(135deg, hsl(142 71% 45%), hsl(142 71% 35%))", boxShadow: "0 4px 12px hsl(142 71% 45% / 0.25)", color: "white" } : { backgroundColor: "hsl(var(--card-bg-muted))", border: "1px solid hsl(var(--inactive-btn-border))", color: "hsl(var(--inactive-btn-text-light))" }}
                      >
                        {sec >= 60 ? `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, "0")}` : `${sec}s`}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setCustomAndStart(currentGroup.exercise.id, 0)} className="w-full rounded-xl py-3 text-sm active:scale-95 transition-all" style={{ backgroundColor: "hsl(var(--card-bg-muted))", border: "1px solid hsl(var(--inactive-btn-border))", color: "hsl(var(--muted-foreground))" }}>
                    {t("workout_no_rest", lang)}
                  </button>
                </div>
              </div>
            )}

            {/* Sets */}
            <div className="flex flex-col gap-2.5">
              {currentGroup.sets.map((set, idx) => {
                const lastSets = lastSessionSets[currentGroup.exercise.id];
                const lastSet = lastSets?.find((s) => s.setNumber === set.set_number);
                const weightDiff = lastSet ? Math.round((set.weight - lastSet.weight) * 10) / 10 : 0;
                const repsDiff = lastSet ? set.reps - lastSet.reps : 0;
                const hasComparison = lastSet !== undefined;

                return (
                  <div key={set.id} className={`flex items-center gap-3 rounded-2xl p-4 transition-all animate-scale-in ${set.completed ? "border-green-500/30 bg-green-500/5" : "border-[hsl(var(--card-border))] bg-[hsl(var(--card-bg-muted))]"}`} style={{ animationDelay: `${idx * 0.05}s` }}>
                    <span className="text-xs w-8 font-mono text-center" style={{ color: "hsl(var(--muted-foreground-dim))" }}>S{set.set_number}</span>
                    <div className="flex-1 flex items-center gap-3">
                      <div className="flex-1 relative">
                        <label className="text-[10px] block mb-1" style={{ color: "hsl(var(--muted-foreground-dim))" }}>Poids ({unit})</label>
                        <input type="text" inputMode="decimal" value={getDisplayValue(set, "weight")} onChange={(e) => handleSetInput(set.id, "weight", e.target.value)} onBlur={() => handleSetBlur(set.id, "weight")} className="w-full rounded-xl px-3 py-2.5 text-center text-lg font-semibold text-[hsl(var(--text-white))] focus:outline-none transition-all" style={{ backgroundColor: "hsl(var(--card-bg-muted))", border: "1px solid hsl(var(--inactive-btn-border))" }} />
                        {hasComparison && weightDiff > 0 && (
                          <span className="absolute -top-1 -right-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: "hsl(142 71% 45% / 0.15)", color: "hsl(142 71% 45%)" }}>+{weightDiff}</span>
                        )}
                        {hasComparison && weightDiff < 0 && (
                          <span className="absolute -top-1 -right-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: "hsl(0 72% 51% / 0.15)", color: "hsl(0 72% 51%)" }}>{weightDiff}</span>
                        )}
                      </div>
                      <div className="flex-1 relative">
                        <label className="text-[10px] block mb-1" style={{ color: "hsl(var(--muted-foreground-dim))" }}>{t("workout_reps", lang)}</label>
                        <input type="text" inputMode="numeric" value={getDisplayValue(set, "reps")} onChange={(e) => handleSetInput(set.id, "reps", e.target.value)} onBlur={() => handleSetBlur(set.id, "reps")} className="w-full rounded-xl px-3 py-2.5 text-center text-lg font-semibold text-[hsl(var(--text-white))] focus:outline-none transition-all" style={{ backgroundColor: "hsl(var(--card-bg-muted))", border: "1px solid hsl(var(--inactive-btn-border))" }} />
                        {hasComparison && repsDiff > 0 && (
                          <span className="absolute -top-1 -right-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: "hsl(142 71% 45% / 0.15)", color: "hsl(142 71% 45%)" }}>+{repsDiff}</span>
                        )}
                        {hasComparison && repsDiff < 0 && (
                          <span className="absolute -top-1 -right-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: "hsl(0 72% 51% / 0.15)", color: "hsl(0 72% 51%)" }}>{repsDiff}</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const wasCompleted = set.completed;
                        updateSet(set.id, "completed", !set.completed);
                        if (!wasCompleted) {
                          triggerHaptic("success");
                          setCompletedSetAnimations((prev) => ({ ...prev, [set.id]: true }));
                          setTimeout(() => setCompletedSetAnimations((prev) => ({ ...prev, [set.id]: false })), 600);
                          if (set.rest_sec > 0) openCustomTimer(currentGroup.exercise.id, set.rest_sec);
                          checkForPR(currentGroup.exercise.id, currentGroup.exercise.name);
                        }
                      }}
                      className={`w-12 h-12 rounded-xl flex items-center justify-center active:scale-95 transition-all ${set.completed ? "text-[hsl(var(--text-white))]" : "border border-[hsl(var(--card-border))] text-[hsl(var(--text-white-40))]"}`}
                      style={set.completed ? { background: "linear-gradient(135deg, hsl(142 71% 45%), hsl(142 71% 35%))", boxShadow: "0 4px 12px hsl(142 71% 45% / 0.25)" } : {}}
                    >
                      <Check className="h-5 w-5" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Plate calculator */}
            {currentGroup.sets.some((s) => s.completed) && (
              <div className="mt-3 rounded-xl overflow-hidden" style={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--card-border))" }}>
                <button
                  onClick={() => setShowPlates(showPlates === currentGroup.exercise.id ? null : currentGroup.exercise.id)}
                  className="w-full flex items-center justify-between px-4 py-3 text-xs font-medium active:scale-[0.98] transition-all"
                  style={{ color: "hsl(var(--muted-foreground))" }}
                >
                  <div className="flex items-center gap-1.5">
                    <Dumbbell className="h-3.5 w-3.5" />
                    {t("workout_plates", lang)}
                  </div>
                  <ChevronRight className={`h-3.5 w-3.5 transition-transform ${showPlates === currentGroup.exercise.id ? "rotate-90" : ""}`} />
                </button>
                {showPlates === currentGroup.exercise.id && (() => {
                  const lastCompleted = [...currentGroup.sets].reverse().find((s) => s.completed);
                  if (!lastCompleted) return null;
                  const { plates } = calculatePlates(lastCompleted.weight);
                  return (
                    <div className="px-4 pb-3 flex flex-wrap gap-2">
                      <div className="flex items-center gap-1.5 text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
                        <span className="font-semibold text-[hsl(var(--text-white))]">{displayWeight(lastCompleted.weight)}</span>
                        <span>=</span>
                        <span className="px-1.5 py-0.5 rounded" style={{ backgroundColor: "hsl(var(--card-bg-muted))" }}>{t("workout_bar", lang)}</span>
                      </div>
                      {plates.map((p) => (
                        <div key={p.size} className="flex items-center gap-1">
                          <span className="px-2 py-1 rounded-lg text-xs font-bold" style={{ backgroundColor: "hsl(142 71% 45% / 0.1)", color: "hsl(142 71% 45%)" }}>{p.size}</span>
                          <span className="text-[10px]" style={{ color: "hsl(var(--muted-foreground-dim))" }}>×{p.count * 2}</span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Add set */}
            {!isReadOnly && (
              <button onClick={() => addSet(currentGroup.exercise.id)} className="mt-4 w-full rounded-xl py-3 text-sm font-medium flex items-center justify-center gap-2 active:scale-[0.98] transition-all" style={{ backgroundColor: "hsl(var(--card))", border: "1px dashed hsl(var(--inactive-btn-border))", color: "hsl(var(--muted-foreground))" }}>
                <Plus className="h-4 w-4" />
                {t("workout_add_set", lang)}
              </button>
            )}
          </>
        )}
      </div>

      {/* Bottom bar */}
      {!isReadOnly && (
        <div className="fixed bottom-0 left-0 right-0 z-40 p-4 pb-6" style={{ backgroundColor: "hsl(var(--card) / 0.98)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderTop: "1px solid hsl(var(--card-border))" }}>
          <div className="flex items-center gap-3 mb-3">
            <button onClick={() => navigateExercise("prev")} disabled={currentExerciseIndex === 0} className="p-2.5 rounded-xl active:scale-95 transition-all disabled:opacity-30" style={{ backgroundColor: "hsl(var(--card-bg-muted))", border: "1px solid hsl(var(--inactive-btn-border))" }}>
              <ChevronLeft className="h-5 w-5 text-[hsl(var(--text-white))]" />
            </button>
            <div className="flex-1">
              <ProgressBar value={completedSets} max={Math.max(totalSets, 1)} label={`${completedSets}/${totalSets} ${t("workout_sets_completed", lang)}`} />
            </div>
            <button onClick={() => navigateExercise("next")} disabled={currentExerciseIndex >= groups.length - 1} className="p-2.5 rounded-xl active:scale-95 transition-all disabled:opacity-30" style={{ backgroundColor: "hsl(var(--card-bg-muted))", border: "1px solid hsl(var(--inactive-btn-border))" }}>
              <ChevronRight className="h-5 w-5 text-[hsl(var(--text-white))]" />
            </button>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowAllExercises(true)} className="rounded-xl px-4 py-3 text-sm font-medium active:scale-95 transition-all" style={{ backgroundColor: "hsl(var(--card-bg-muted))", border: "1px solid hsl(var(--inactive-btn-border))", color: "hsl(var(--inactive-btn-text))" }}>
              <List className="h-4 w-4" />
            </button>
            <button onClick={finishWorkout} className="flex-1 rounded-xl px-6 py-4 text-base font-bold text-[hsl(var(--text-white))] active:scale-[0.98] transition-all" style={{ background: "linear-gradient(135deg, hsl(142 71% 45%), hsl(142 71% 35%))", boxShadow: completedSets === totalSets && totalSets > 0 ? "0 0 32px hsl(142 71% 45% / 0.4)" : "0 4px 16px hsl(142 71% 45% / 0.3)" }}>
              {completedSets === totalSets && totalSets > 0 ? `✓ ${t("workout_finish_done", lang)}` : t("workout_finish", lang)}
            </button>
          </div>
        </div>
      )}

      <Confetti active={showConfetti} />

      {/* PR Notification */}
      {showPR && (
        <div className="fixed top-16 left-4 right-4 z-50 animate-slide-down">
          <div className="rounded-2xl p-4 flex items-center gap-3" style={{ backgroundColor: "hsl(45 93% 47% / 0.15)", border: "1px solid hsl(45 93% 47% / 0.3)", boxShadow: "0 8px 32px hsl(45 93% 47% / 0.2)" }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "hsl(45 93% 47% / 0.2)" }}>
              <Trophy className="h-5 w-5" style={{ color: "hsl(45 93% 47%)" }} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold" style={{ color: "hsl(45 93% 47%)" }}>{t("dashboard_new_pr", lang)}</p>
              <p className="text-xs" style={{ color: "hsl(45 93% 47% / 0.7)" }}>{prInfo.exercise} — {prInfo.oneRM} kg (1RM)</p>
            </div>
            <button onClick={() => setShowPR(false)} className="p-1 rounded-lg" style={{ color: "hsl(45 93% 47% / 0.5)" }}>
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Exercise History Popup */}
      {showExerciseHistory && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ backgroundColor: "hsl(var(--overlay))", backdropFilter: "blur(8px)" }}>
          <div className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6 animate-slide-up" style={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--card-border))", boxShadow: "0 24px 48px hsl(var(--shadow-heavy))" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-[hsl(var(--text-white))]">Historique — {currentGroup?.exercise.name}</h3>
              <button onClick={() => setShowExerciseHistory(false)} className="text-xs active:scale-95 transition-all" style={{ color: "hsl(var(--muted-foreground))" }}>Fermer</button>
            </div>
            {exerciseHistory.length === 0 ? (
              <p className="text-sm text-center py-8" style={{ color: "hsl(var(--muted-foreground-dim))" }}>Pas d'historique pour cet exercice.</p>
            ) : (
              <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
                {exerciseHistory.map((h, i) => (
                  <div key={i} className="flex items-center justify-between rounded-xl px-3 py-2.5" style={{ backgroundColor: "hsl(var(--card-bg-muted))" }}>
                    <span className="text-xs" style={{ color: "hsl(var(--muted-foreground-dim))" }}>{new Date(h.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}</span>
                    <span className="text-xs font-semibold text-[hsl(var(--text-white))]">{h.reps} × {h.weight} kg</span>
                    <span className="text-xs font-bold" style={{ color: "hsl(142 71% 45%)" }}>{h.oneRM} kg</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Post-workout summary - ENHANCED */}
      {showSummary && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ backgroundColor: "hsl(var(--overlay))", backdropFilter: "blur(12px)" }}>
          <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 pb-8 animate-slide-up" style={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--card-border))", boxShadow: "0 24px 48px hsl(var(--shadow-heavy))" }}>
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: "linear-gradient(135deg, hsl(142 71% 45%), hsl(142 71% 35%))", boxShadow: "0 8px 24px hsl(142 71% 45% / 0.3)" }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-[hsl(var(--text-white))] mb-1">{t("workout_summary_title", lang)}</h2>
              <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>{t("workout_summary_subtitle", lang)}</p>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="rounded-xl p-3 text-center" style={{ backgroundColor: "hsl(var(--card-bg-muted))" }}>
                <p className="text-2xl font-bold text-[hsl(var(--text-white))]">{formatElapsed(elapsedSeconds)}</p>
                <p className="text-[10px]" style={{ color: "hsl(var(--muted-foreground-dim))" }}>{t("workout_summary_duration", lang)}</p>
              </div>
              <div className="rounded-xl p-3 text-center" style={{ backgroundColor: "hsl(var(--card-bg-muted))" }}>
                <p className="text-2xl font-bold text-[hsl(var(--text-white))]">{completedSets}</p>
                <p className="text-[10px]" style={{ color: "hsl(var(--muted-foreground-dim))" }}>{t("workout_summary_sets", lang)}</p>
              </div>
              <div className="rounded-xl p-3 text-center" style={{ backgroundColor: "hsl(var(--card-bg-muted))" }}>
                <p className="text-2xl font-bold text-[hsl(var(--text-white))]">{Math.round(currentVolume)}</p>
                <p className="text-[10px]" style={{ color: "hsl(var(--muted-foreground-dim))" }}>{t("workout_summary_volume", lang)}</p>
              </div>
            </div>

            {/* Volume comparison */}
            {lastSessionVolume > 0 && (
              <div className="mb-4 rounded-xl p-4" style={{ backgroundColor: volumeDiff >= 0 ? "hsl(142 71% 45% / 0.08)" : "hsl(0 72% 51% / 0.08)", border: `1px solid ${volumeDiff >= 0 ? "hsl(142 71% 45% / 0.2)" : "hsl(0 72% 51% / 0.2)"}` }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className={`h-4 w-4 ${volumeDiff >= 0 ? "rotate-0" : "rotate-180"}`} style={{ color: volumeDiff >= 0 ? "hsl(142 71% 45%)" : "hsl(0 72% 51%)" }} />
                    <div>
                      <p className="text-sm font-semibold" style={{ color: volumeDiff >= 0 ? "hsl(142 71% 45%)" : "hsl(0 72% 51%)" }}>
                        {volumeDiff >= 0 ? t("workout_summary_better_than_last", lang) : lang === "en" ? "Below last session" : "En dessous de la dernière"}
                      </p>
                      <p className="text-xs" style={{ color: "hsl(var(--muted-foreground-dim))" }}>{t("workout_summary_vs_last", lang)}</p>
                    </div>
                  </div>
                  <span className="text-lg font-bold" style={{ color: volumeDiff >= 0 ? "hsl(142 71% 45%)" : "hsl(0 72% 51%)" }}>
                    {volumeDiff >= 0 ? "+" : ""}{volumeDiff} kg
                  </span>
                </div>
              </div>
            )}

            {/* PRs broken */}
            {newPRs.length > 0 && (
              <div className="mb-4 rounded-xl p-4" style={{ backgroundColor: "hsl(45 93% 47% / 0.08)", border: "1px solid hsl(45 93% 47% / 0.2)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <Trophy className="h-4 w-4" style={{ color: "hsl(45 93% 47%)" }} />
                  <p className="text-sm font-semibold" style={{ color: "hsl(45 93% 47%)" }}>{newPRs.length} {newPRs.length > 1 ? (lang === "en" ? "PRs broken!" : "Records battus !") : (lang === "en" ? "PR broken!" : "Record battu !")}</p>
                </div>
                {newPRs.map((pr, i) => (
                  <p key={i} className="text-xs font-medium" style={{ color: "hsl(45 93% 47% / 0.8)" }}>{pr}</p>
                ))}
              </div>
            )}

            <button onClick={() => router.push("/programs")} className="w-full rounded-xl px-6 py-4 text-base font-bold text-[hsl(var(--text-white))] active:scale-[0.98] transition-all" style={{ background: "linear-gradient(135deg, hsl(142 71% 45%), hsl(142 71% 35%))", boxShadow: "0 4px 16px hsl(142 71% 45% / 0.3)" }}>
              {t("workout_summary_back_programs", lang)}
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog open={showCancelConfirm} title="Annuler la séance" description="Toutes les données de cette séance seront perdues." confirmLabel="Annuler la séance" danger onConfirm={cancelWorkout} onCancel={() => setShowCancelConfirm(false)} />
    </main>
  );
}
