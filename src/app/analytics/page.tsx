"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { estimate1RM } from "@/lib/progression";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import Link from "next/link";
import { Trophy, Dumbbell, BarChart3, TrendingUp, CalendarDays, ArrowRight } from "lucide-react";

interface PR { exerciseName: string; muscleGroup: string | null; best1RM: number; bestWeight: number; bestReps: number; date: string; }
interface VolumeData { date: string; volume: number; label: string; }
interface FrequencyData { day: string; count: number; }
interface ExerciseTrend { exerciseName: string; data: { date: string; weight: number; reps: number; oneRM: number }[]; }

export default function AnalyticsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [prs, setPRs] = useState<PR[]>([]);
  const [volumeData, setVolumeData] = useState<VolumeData[]>([]);
  const [frequencyData, setFrequencyData] = useState<FrequencyData[]>([]);
  const [exerciseTrends, setExerciseTrends] = useState<ExerciseTrend[]>([]);
  const [totalWorkouts, setTotalWorkouts] = useState(0);
  const [totalVolume, setTotalVolume] = useState(0);
  const [loadingData, setLoadingData] = useState(true);
  const [unit, setUnit] = useState<"kg" | "lbs">("kg");

  useEffect(() => { if (!loading && !user) router.push("/login"); }, [user, loading, router]);
  useEffect(() => { if (!user) return; loadData(); loadUnit(); }, [user]);

  async function loadUnit() { const { data } = await supabase.from("profiles").select("unit").eq("id", user!.id).single(); if (data) setUnit(data.unit as "kg" | "lbs"); }

  function displayWeight(kg: number): string { if (unit === "lbs") return Math.round(kg * 2.20462 * 10) / 10 + " lbs"; return kg + " kg"; }

  async function loadData() {
    const { data: workouts } = await supabase.from("workouts").select("id, started_at, status").eq("user_id", user!.id).eq("status", "completed").order("started_at", { ascending: true });
    if (!workouts || workouts.length === 0) { setLoadingData(false); return; }
    setTotalWorkouts(workouts.length);
    const allSets: { workout_id: string; exercise_id: string; reps: number; weight: number; completed: boolean; date: string }[] = [];
    for (const w of workouts) {
      const { data: sets } = await supabase.from("workout_sets").select("exercise_id, reps, weight, completed").eq("workout_id", w.id);
      if (sets) for (const s of sets) { if (s.completed) allSets.push({ workout_id: w.id, exercise_id: s.exercise_id, reps: s.reps, weight: s.weight, completed: s.completed, date: w.started_at }); }
    }
    const exerciseMap: Record<string, { name: string; muscleGroup: string | null }> = {};
    const uniqueExerciseIds = [...new Set(allSets.map((s) => s.exercise_id))];
    for (const exId of uniqueExerciseIds) { const { data: ex } = await supabase.from("exercises").select("name, muscle_group").eq("id", exId).single(); if (ex) exerciseMap[exId] = { name: ex.name, muscleGroup: ex.muscle_group }; }
    const prMap: Record<string, PR> = {};
    for (const set of allSets) {
      const exInfo = exerciseMap[set.exercise_id]; if (!exInfo) continue;
      const oneRM = estimate1RM(set.weight, set.reps); const key = set.exercise_id;
      if (!prMap[key] || oneRM > prMap[key].best1RM) prMap[key] = { exerciseName: exInfo.name, muscleGroup: exInfo.muscleGroup, best1RM: oneRM, bestWeight: set.weight, bestReps: set.reps, date: set.date };
    }
    setPRs(Object.values(prMap).sort((a, b) => b.best1RM - a.best1RM));
    const volumeByDate: Record<string, number> = {};
    for (const set of allSets) { const dateKey = new Date(set.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }); volumeByDate[dateKey] = (volumeByDate[dateKey] || 0) + set.reps * set.weight; }
    setVolumeData(Object.entries(volumeByDate).map(([date, volume]) => ({ date, volume: Math.round(volume), label: date })).slice(-14));
    setTotalVolume(Math.round(allSets.reduce((sum, s) => sum + s.reps * s.weight, 0)));
    const dayNames = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
    const dayCounts = [0, 0, 0, 0, 0, 0, 0];
    for (const w of workouts) dayCounts[new Date(w.started_at).getDay()]++;
    setFrequencyData(dayNames.map((day, i) => ({ day, count: dayCounts[i] })));
    const trendMap: Record<string, { date: string; weight: number; reps: number; oneRM: number }[]> = {};
    for (const set of allSets) { const exInfo = exerciseMap[set.exercise_id]; if (!exInfo) continue; const oneRM = estimate1RM(set.weight, set.reps); const dateLabel = new Date(set.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }); if (!trendMap[exInfo.name]) trendMap[exInfo.name] = []; trendMap[exInfo.name].push({ date: dateLabel, weight: set.weight, reps: set.reps, oneRM }); }
    const topExercises = Object.entries(trendMap).sort(([, a], [, b]) => Math.max(...b.map((d) => d.oneRM)) - Math.max(...a.map((d) => d.oneRM))).slice(0, 4);
    setExerciseTrends(topExercises.map(([name, data]) => ({ exerciseName: name, data: data.slice(-10) })));
    setLoadingData(false);
  }

  if (loading || !user) return <p className="p-6">Chargement...</p>;

  const chartTheme = { grid: { stroke: "rgb(38, 38, 38)" }, text: { fill: "rgb(115, 115, 115)" } };
  const tooltipStyle = { backgroundColor: "rgb(23, 23, 23)", border: "1px solid rgb(38, 38, 38)", borderRadius: "12px", color: "rgb(250, 250, 250)" };

  return (
    <main className="flex min-h-screen flex-col p-5 pb-24">
      <h1 className="text-2xl font-bold tracking-tight mb-6">Statistiques</h1>

      {loadingData ? (
        <p className="text-neutral-500">Chargement...</p>
      ) : totalWorkouts === 0 ? (
        <div className="text-center py-16">
          <Dumbbell className="h-12 w-12 text-neutral-700 mx-auto mb-4" />
          <p className="text-neutral-500 mb-4">Aucune séance complétée.</p>
          <Link href="/workout" className="inline-flex items-center gap-2 rounded-xl bg-green-500 px-6 py-3 font-semibold text-neutral-950 shadow-lg shadow-green-500/20 active:scale-95 transition-all">
            Commencer une séance
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-2.5">
            {[
              { label: "Séances", value: totalWorkouts, icon: CalendarDays },
              { label: "Volume", value: displayWeight(totalVolume), icon: BarChart3 },
              { label: "Exercices", value: prs.length, icon: Trophy },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 text-center">
                <stat.icon className="h-4 w-4 text-green-500 mx-auto mb-1.5" />
                <p className="text-xl font-bold text-green-500">{stat.value}</p>
                <p className="text-[10px] text-neutral-500 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>

          {prs.length > 0 && (
            <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Trophy className="h-4 w-4 text-yellow-500" />
                <h2 className="text-sm font-semibold">Records personnels (1RM)</h2>
              </div>
              <div className="flex flex-col gap-0">
                {prs.slice(0, 6).map((pr, i) => (
                  <div key={i} className="flex items-center justify-between py-2.5 border-b border-neutral-800 last:border-0">
                    <div>
                      <p className="text-sm font-medium">{pr.exerciseName}</p>
                      <p className="text-xs text-neutral-500 mt-0.5">{pr.bestReps}×{displayWeight(pr.bestWeight)} · {new Date(pr.date).toLocaleDateString("fr-FR")}</p>
                    </div>
                    <p className="font-bold text-green-500 text-sm">{displayWeight(pr.best1RM)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {volumeData.length > 0 && (
            <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
              <h2 className="text-sm font-semibold mb-3">Volume par séance</h2>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={volumeData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid.stroke} />
                    <XAxis dataKey="label" stroke={chartTheme.text.fill} fontSize={10} />
                    <YAxis stroke={chartTheme.text.fill} fontSize={10} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(value: unknown) => [`${Math.round(value as number)} kg`, "Volume"]} />
                    <Bar dataKey="volume" fill="#22c55e" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {frequencyData.length > 0 && (
            <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
              <h2 className="text-sm font-semibold mb-3">Fréquence par jour</h2>
              <div className="h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={frequencyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid.stroke} />
                    <XAxis dataKey="day" stroke={chartTheme.text.fill} fontSize={10} />
                    <YAxis stroke={chartTheme.text.fill} fontSize={10} allowDecimals={false} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(value: unknown) => [`${value} séance${(value as number) > 1 ? "s" : ""}`, ""]} />
                    <Bar dataKey="count" fill="#22c55e" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {exerciseTrends.map((trend) => (
            <div key={trend.exerciseName} className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <h2 className="text-sm font-semibold">{trend.exerciseName}</h2>
              </div>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trend.data}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid.stroke} />
                    <XAxis dataKey="date" stroke={chartTheme.text.fill} fontSize={10} />
                    <YAxis stroke={chartTheme.text.fill} fontSize={10} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(value: unknown, name: unknown) => { const n = name as string; const v = value as number; if (n === "oneRM") return [`${v} kg`, "1RM"]; if (n === "weight") return [`${v} kg`, "Poids"]; return [v, n]; }} />
                    <Line type="monotone" dataKey="oneRM" stroke="#22c55e" strokeWidth={2} dot={{ fill: "#22c55e", r: 3 }} name="1RM" />
                    <Line type="monotone" dataKey="weight" stroke="rgb(115, 115, 115)" strokeWidth={1.5} dot={{ fill: "rgb(115, 115, 115)", r: 2 }} strokeDasharray="5 5" name="Poids" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
