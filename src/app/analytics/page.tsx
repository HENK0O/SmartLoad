"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { useApp } from "@/lib/context";
import { t } from "@/lib/i18n";
import { estimate1RM } from "@/lib/progression";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import Link from "next/link";
import { Trophy, Dumbbell, BarChart3, TrendingUp, CalendarDays, ArrowRight, Flame } from "lucide-react";

interface PR { exerciseName: string; muscleGroup: string | null; best1RM: number; bestWeight: number; bestReps: number; date: string; }
interface VolumeData { date: string; volume: number; label: string; }
interface FrequencyData { day: string; count: number; }
interface ExerciseTrend { exerciseName: string; data: { date: string; weight: number; reps: number; oneRM: number }[]; }

type PeriodFilter = "7d" | "30d" | "90d" | "all";

export default function AnalyticsPage() {
  const { user, loading } = useAuth();
  const { lang, unit } = useApp();
  const router = useRouter();
  const [prs, setPRs] = useState<PR[]>([]);
  const [volumeData, setVolumeData] = useState<VolumeData[]>([]);
  const [frequencyData, setFrequencyData] = useState<FrequencyData[]>([]);
  const [exerciseTrends, setExerciseTrends] = useState<ExerciseTrend[]>([]);
  const [totalWorkouts, setTotalWorkouts] = useState(0);
  const [avgVolumePerWorkout, setAvgVolumePerWorkout] = useState(0);
  const [loadingData, setLoadingData] = useState(true);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("7d");

  useEffect(() => { if (!loading && !user) router.push("/login"); }, [user, loading, router]);
  useEffect(() => { if (!user) return; loadData(); }, [user, periodFilter]);

  function displayWeight(kg: number): string { 
    if (unit === "lbs") return Math.round(kg * 2.20462 * 10) / 10 + " lbs"; 
    return Math.round(kg * 10) / 10 + " kg"; 
  }

  function getDateRange(): { start: Date; end: Date } {
    const end = new Date();
    const start = new Date();
    if (periodFilter === "7d") start.setDate(end.getDate() - 7);
    else if (periodFilter === "30d") start.setDate(end.getDate() - 30);
    else if (periodFilter === "90d") start.setDate(end.getDate() - 90);
    else start.setFullYear(2020, 0, 1);
    return { start, end };
  }

  async function loadData() {
    const { start, end } = getDateRange();
    const { data: workouts } = await supabase.from("workouts").select("id, started_at, status").eq("user_id", user!.id).eq("status", "completed").gte("started_at", start.toISOString()).lt("started_at", new Date(end.getTime() + 86400000).toISOString()).order("started_at", { ascending: true });
    if (!workouts || workouts.length === 0) { setLoadingData(false); setTotalWorkouts(0); setAvgVolumePerWorkout(0); setPRs([]); setVolumeData([]); setFrequencyData([]); setExerciseTrends([]); return; }
    setTotalWorkouts(workouts.length);

    const workoutIds = workouts.map(w => w.id);
    const { data: rawSets } = await supabase
      .from("workout_sets")
      .select("workout_id, exercise_id, reps, weight, completed")
      .in("workout_id", workoutIds);

    const workoutDateMap: Record<string, string> = {};
    for (const w of workouts) workoutDateMap[w.id] = w.started_at;

    const allSets: { workout_id: string; exercise_id: string; reps: number; weight: number; completed: boolean; date: string }[] = [];
    if (rawSets) {
      for (const s of rawSets) {
        if (s.completed) {
          allSets.push({
            workout_id: s.workout_id,
            exercise_id: s.exercise_id,
            reps: s.reps,
            weight: s.weight,
            completed: s.completed,
            date: workoutDateMap[s.workout_id],
          });
        }
      }
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

    const volumeByWorkout: Record<string, number> = {};
    for (const set of allSets) {
      volumeByWorkout[set.workout_id] = (volumeByWorkout[set.workout_id] || 0) + set.reps * set.weight;
    }
    const workoutVolumes = Object.values(volumeByWorkout);
    const totalVolumeKg = workoutVolumes.reduce((sum, v) => sum + v, 0);
    const avgVolume = workoutVolumes.length > 0 ? totalVolumeKg / workoutVolumes.length : 0;
    setAvgVolumePerWorkout(Math.round(avgVolume));

    const volumeByDate: Record<string, number> = {};
    for (const set of allSets) { 
      const dateKey = new Date(set.date).toLocaleDateString(lang === "en" ? "en-US" : "fr-FR", { day: "2-digit", month: "2-digit" }); 
      volumeByDate[dateKey] = (volumeByDate[dateKey] || 0) + set.reps * set.weight; 
    }
    setVolumeData(Object.entries(volumeByDate).map(([date, volume]) => ({ date, volume: Math.round(volume), label: date })).slice(-14));

    const dayNames = lang === "en" ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] : ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
    const dayCounts = [0, 0, 0, 0, 0, 0, 0];
    for (const w of workouts) dayCounts[new Date(w.started_at).getDay()]++;
    setFrequencyData(dayNames.map((day, i) => ({ day, count: dayCounts[i] })));

    const trendMap: Record<string, { date: string; weight: number; reps: number; oneRM: number }[]> = {};
    for (const set of allSets) { 
      const exInfo = exerciseMap[set.exercise_id]; if (!exInfo) continue; 
      const oneRM = estimate1RM(set.weight, set.reps); 
      const dateLabel = new Date(set.date).toLocaleDateString(lang === "en" ? "en-US" : "fr-FR", { day: "2-digit", month: "2-digit" }); 
      if (!trendMap[exInfo.name]) trendMap[exInfo.name] = []; 
      trendMap[exInfo.name].push({ date: dateLabel, weight: set.weight, reps: set.reps, oneRM }); 
    }
    const topExercises = Object.entries(trendMap).sort(([, a], [, b]) => Math.max(...b.map((d) => d.oneRM)) - Math.max(...a.map((d) => d.oneRM))).slice(0, 4);
    setExerciseTrends(topExercises.map(([name, data]) => ({ exerciseName: name, data: data.slice(-10) })));
    setLoadingData(false);
  }

  if (loading || !user) return <p className="p-6">{t("programs_loading", lang)}</p>;

  const chartTheme = { grid: { stroke: "hsl(var(--card-border))" }, text: { fill: "hsl(var(--muted-foreground))" } };
  const tooltipStyle = { backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--card-border))", borderRadius: "12px", color: "hsl(var(--text-white))" };

  const periods: { key: PeriodFilter; label: string }[] = [
    { key: "7d", label: "7j" },
    { key: "30d", label: "30j" },
    { key: "90d", label: "3 mois" },
    { key: "all", label: "Tout" },
  ];

  function buildVolumeChartData(): { data: VolumeData[]; ticks: string[] } {
    const data = volumeData;
    if (data.length === 0) return { data: [], ticks: [] };
    if (periodFilter === "7d") {
      const filled: VolumeData[] = [];
      const ticks: string[] = [];
      const now = new Date();
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const label = d.toLocaleDateString(lang === "en" ? "en-US" : "fr-FR", { day: "2-digit", month: "2-digit" });
        ticks.push(label);
        const existing = data.find((v) => v.label === label);
        if (existing) filled.push(existing);
        else filled.push({ date: label, volume: 0, label });
      }
      return { data: filled, ticks };
    }
    return { data, ticks: data.map((d) => d.label) };
  }

  const { data: volumeChartData, ticks: volumeChartTicks } = buildVolumeChartData();

  return (
    <main className="flex min-h-screen flex-col p-5 pb-24">
      <h1 className="text-2xl font-bold tracking-tight mb-4">{t("analytics_title", lang)}</h1>

      <div className="flex gap-2 mb-5">
        {periods.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriodFilter(p.key)}
            className="rounded-full px-4 py-1.5 text-xs font-semibold active:scale-95 transition-all"
            style={
              periodFilter === p.key
                ? { background: "linear-gradient(135deg, hsl(142 71% 45%), hsl(142 71% 35%))", color: "white", boxShadow: "0 2px 8px hsl(142 71% 45% / 0.25)" }
                : { backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--card-border))", color: "hsl(var(--muted-foreground))" }
            }
          >
            {p.label}
          </button>
        ))}
      </div>

      {loadingData ? (
        <p className="text-neutral-500">{t("programs_loading", lang)}</p>
      ) : totalWorkouts === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: "hsl(var(--primary) / 0.1)" }}>
            <BarChart3 className="h-8 w-8" style={{ color: "hsl(var(--primary))" }} />
          </div>
          <p className="text-base font-semibold text-[hsl(var(--foreground))] mb-1">{lang === "en" ? "No data yet" : "Pas encore de données"}</p>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6">{lang === "en" ? "Start your first workout to see your progress here" : "Lance ta première séance pour voir ta progression ici"}</p>
          <Link href="/workout" className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-[hsl(var(--primary-foreground))] active:scale-95 transition-all" style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(142 71% 35%))", boxShadow: "0 4px 16px hsl(var(--primary-glow))" }}>
            {lang === "en" ? "Start a workout" : "Commencer une séance"}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { label: t("analytics_total_workouts", lang), value: totalWorkouts, icon: CalendarDays, sublabel: lang === "en" ? "workouts" : "séances" },
              { label: lang === "en" ? "Avg volume/workout" : "Vol. moy/séance", value: displayWeight(avgVolumePerWorkout), icon: Flame, sublabel: unit },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 text-center">
                <stat.icon className="h-4 w-4 mx-auto mb-1.5" style={{ color: "hsl(142 71% 45%)" }} />
                <p className="text-xl font-bold" style={{ color: "hsl(142 71% 45%)" }}>{stat.value}</p>
                <p className="text-[10px] text-neutral-500 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>

          {prs.length > 0 && (
            <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Trophy className="h-4 w-4 text-yellow-500" />
                <h2 className="text-sm font-semibold">{lang === "en" ? "Personal Records (1RM)" : "Records personnels (1RM)"}</h2>
              </div>
              <div className="flex flex-col gap-0">
                {prs.slice(0, 6).map((pr, i) => (
                  <div key={i} className="flex items-center justify-between py-2.5 border-b border-neutral-800 last:border-0">
                    <div>
                      <p className="text-sm font-medium">{pr.exerciseName}</p>
                      <p className="text-xs text-neutral-500 mt-0.5">{pr.bestReps}×{displayWeight(pr.bestWeight)} · {new Date(pr.date).toLocaleDateString(lang === "en" ? "en-US" : "fr-FR")}</p>
                    </div>
                    <p className="font-bold" style={{ color: "hsl(142 71% 45%)" }}>{displayWeight(pr.best1RM)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {volumeData.length > 0 && (
            <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
              <h2 className="text-sm font-semibold mb-3">{lang === "en" ? "Volume per workout" : "Volume par séance"}</h2>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={volumeChartData} barCategoryGap="60%">
                    <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid.stroke} />
                    <XAxis dataKey="label" stroke={chartTheme.text.fill} fontSize={10} interval={0} ticks={volumeChartTicks.length > 0 ? volumeChartTicks : undefined} />
                    <YAxis stroke={chartTheme.text.fill} fontSize={10} domain={[0, "dataMax"]} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(value: unknown) => [`${Math.round(value as number)} ${unit}`, "Volume"]} />
                    <Bar dataKey="volume" fill="#22c55e" radius={[6, 6, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {frequencyData.length > 0 && (
            <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
              <h2 className="text-sm font-semibold mb-3">{lang === "en" ? "Frequency by day" : "Fréquence par jour"}</h2>
              <div className="h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={frequencyData} barCategoryGap="40%">
                    <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid.stroke} />
                    <XAxis dataKey="day" stroke={chartTheme.text.fill} fontSize={10} />
                    <YAxis stroke={chartTheme.text.fill} fontSize={10} allowDecimals={false} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(value: unknown) => [`${value}`, ""]} />
                    <Bar dataKey="count" fill="#22c55e" radius={[6, 6, 0, 0]} maxBarSize={40} />
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
                    <Tooltip contentStyle={tooltipStyle} formatter={(value: unknown, name: unknown) => { const n = name as string; const v = value as number; if (n === "oneRM") return [`${v} ${unit}`, "1RM"]; if (n === "weight") return [`${v} ${unit}`, lang === "en" ? "Weight" : "Poids"]; return [v, n]; }} />
                    <Line type="monotone" dataKey="oneRM" stroke="#22c55e" strokeWidth={2} dot={{ fill: "#22c55e", r: 3 }} name="1RM" />
                    <Line type="monotone" dataKey="weight" stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} dot={{ fill: "hsl(var(--muted-foreground))", r: 2 }} strokeDasharray="5 5" name={lang === "en" ? "Weight" : "Poids"} />
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
