"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useApp } from "@/lib/context";
import { supabase } from "@/lib/supabase";
import { t } from "@/lib/i18n";
import ConfirmDialog from "@/components/ConfirmDialog";
import { EXERCISE_CATALOG, getFullName } from "@/lib/exercises";
import type { ExerciseDef } from "@/lib/exercises";
import Link from "next/link";
import { ArrowLeft, Plus, Pencil, Trash2, Save, X, Dumbbell, Check, Clock, ChevronUp, ChevronDown } from "lucide-react";

interface Exercise { id: string; name: string; muscle_group: string | null; }
interface ProgramExercise {
  id: string; exercise_id: string; target_sets: number; target_reps: number;
  target_weight: number | null; rep_range_min: number; rep_range_max: number;
  sort_order: number; exercises: Exercise;
}

interface TargetSet {
  id: string; program_exercise_id: string; set_number: number;
  target_reps: number; target_weight: number | null; sort_order: number;
}

const MUSCLE_COLORS: Record<string, { bg: string; text: string }> = {
  "Pectoraux": { bg: "hsl(142 71% 45% / 0.15)", text: "hsl(142 71% 55%)" },
  "Épaules": { bg: "hsl(45 93% 47% / 0.15)", text: "hsl(45 93% 57%)" },
  "Triceps": { bg: "hsl(25 95% 53% / 0.15)", text: "hsl(25 95% 63%)" },
  "Dos": { bg: "hsl(220 70% 50% / 0.15)", text: "hsl(220 70% 60%)" },
  "Biceps": { bg: "hsl(280 65% 60% / 0.15)", text: "hsl(280 65% 70%)" },
  "Quadriceps": { bg: "hsl(142 71% 45% / 0.15)", text: "hsl(142 71% 55%)" },
  "Ischio-jambiers": { bg: "hsl(340 82% 52% / 0.15)", text: "hsl(340 82% 62%)" },
  "Mollets": { bg: "hsl(199 89% 48% / 0.15)", text: "hsl(199 89% 58%)" },
  "Abdominaux": { bg: "hsl(160 84% 39% / 0.15)", text: "hsl(160 84% 49%)" },
};

export default function ProgramDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { user, loading } = useAuth();
  const { lang, unit } = useApp();

  const unitLabel = unit === "lbs" ? "lbs" : "kg";

  function toDisplay(kg: number | null): string {
    if (kg === null || kg === 0) return "";
    if (unit === "lbs") return String(Math.round(kg * 2.20462 * 10) / 10);
    return String(kg);
  }

  function toKg(displayVal: string): number | null {
    if (displayVal === "") return null;
    const v = parseFloat(displayVal);
    if (isNaN(v) || v < 0) return null;
    if (unit === "lbs") return Math.round(v / 2.20462 * 10) / 10;
    return v;
  }
  const router = useRouter();
  const programIdRef = useRef("");
  const [paramsResolved, setParamsResolved] = useState(false);
  const [programId, setProgramId] = useState("");
  const [programName, setProgramName] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [programExercises, setProgramExercises] = useState<ProgramExercise[]>([]);
  const [targetSets, setTargetSets] = useState<Record<string, TargetSet[]>>({});
  const [loadingData, setLoadingData] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedBase, setSelectedBase] = useState<ExerciseDef | null>(null);
  const [showSupportPopup, setShowSupportPopup] = useState(false);
  const [deleteExerciseConfirm, setDeleteExerciseConfirm] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSets, setEditSets] = useState(4);
  const [editRepMin, setEditRepMin] = useState(8);
  const [editRepMax, setEditRepMax] = useState(12);
  const [editWeight, setEditWeight] = useState<number | null>(null);
  const [inlineSetValues, setInlineSetValues] = useState<Record<string, string>>({});

  useEffect(() => { if (!loading && !user) router.push("/login"); }, [user, loading, router]);
  useEffect(() => { 
    params.then((p) => { 
      setProgramId(p.id); 
      programIdRef.current = p.id;
      setParamsResolved(true);
    }); 
  }, [params]);
  useEffect(() => { if (!user || !programId) return; loadData(); }, [user, programId]);

  async function loadData() {
    try {
      const { data: program, error: programError } = await supabase.from("programs").select("name").eq("id", programId).single();
      if (programError) {
        console.error("Error loading program:", programError);
      } else if (program) {
        setProgramName(program.name);
      }

      const { data: pe, error } = await supabase.from("program_exercises").select("id, exercise_id, target_sets, target_reps, target_weight, rep_range_min, rep_range_max, sort_order, exercises(id, name, muscle_group)").eq("program_id", programId).order("sort_order");
      if (pe) { const mapped = (pe as unknown as ProgramExercise[]).map((p) => ({ ...p, rep_range_min: p.rep_range_min || p.target_reps, rep_range_max: p.rep_range_max || p.target_reps + 4 })); setProgramExercises(mapped); }
      else if (error && error.code === "42703") {
        const { data: fallback } = await supabase.from("program_exercises").select("id, exercise_id, target_sets, target_reps, target_weight, sort_order, exercises(id, name, muscle_group)").eq("program_id", programId).order("sort_order");
        if (fallback) { const mapped = (fallback as unknown as ProgramExercise[]).map((p) => ({ ...p, rep_range_min: p.target_reps, rep_range_max: p.target_reps + 4 })); setProgramExercises(mapped); }
      } else if (error) {
        console.error("Error loading program exercises:", error);
      }
      await loadTargetSets();
    } catch (e) {
      console.error("Exception loading data:", e);
    } finally {
      setLoadingData(false);
    }
  }

  async function loadTargetSets() {
    if (programExercises.length === 0) return;
    const allSets: Record<string, TargetSet[]> = {};
    try {
      for (const pe of programExercises) {
        const { data: sets, error } = await supabase.from("program_exercise_sets").select("id, program_exercise_id, set_number, target_reps, target_weight, sort_order").eq("program_exercise_id", pe.id).order("sort_order");
        if (error) {
          console.error("Error loading target sets for exercise", pe.id, error);
        }
        if (sets && sets.length > 0) {
          allSets[pe.id] = sets as TargetSet[];
        } else {
          const defaults: TargetSet[] = [];
          for (let i = 1; i <= pe.target_sets; i++) {
            defaults.push({ id: `default-${pe.id}-${i}`, program_exercise_id: pe.id, set_number: i, target_reps: pe.rep_range_min, target_weight: pe.target_weight, sort_order: i - 1 });
          }
          allSets[pe.id] = defaults;
        }
      }
    } catch (e) {
      console.error("Exception loading target sets:", e);
    }
    setTargetSets(allSets);
  }

  async function saveProgramName() {
    if (!nameInput.trim()) { setEditingName(false); return; }
    await supabase.from("programs").update({ name: nameInput.trim() }).eq("id", programId);
    setProgramName(nameInput.trim());
    setEditingName(false);
  }

  async function syncTargetSetsToDB(programExerciseId: string, sets: TargetSet[]) {
    const realSets = sets.filter((s) => !s.id.startsWith("default-"));
    if (realSets.length > 0) {
      for (const s of realSets) {
        await supabase.from("program_exercise_sets").update({ target_reps: s.target_reps, target_weight: s.target_weight }).eq("id", s.id);
      }
    }
  }

  async function addTargetSetRow(programExerciseId: string) {
    const pe = programExercises.find((p) => p.id === programExerciseId);
    if (!pe) return;
    let nextNum = 0;
    setTargetSets(prev => {
      const currentSets = prev[programExerciseId] || [];
      nextNum = currentSets.length + 1;
      const newSet: TargetSet = {
        id: `default-${programExerciseId}-${nextNum}`,
        program_exercise_id: programExerciseId,
        set_number: nextNum,
        target_reps: pe.rep_range_min,
        target_weight: pe.target_weight,
        sort_order: nextNum - 1,
      };
      return { ...prev, [programExerciseId]: [...currentSets, newSet] };
    });
    if (nextNum === 0) nextNum = (targetSets[programExerciseId]?.length || 0) + 1;
    await supabase.from("program_exercises").update({ target_sets: nextNum }).eq("id", programExerciseId);
    setProgramExercises(prev => prev.map((p) => p.id === programExerciseId ? { ...p, target_sets: nextNum } : p));
  }

  async function removeTargetSetRow(programExerciseId: string, setIndex: number) {
    const currentSets = targetSets[programExerciseId] || [];
    const setToRemove = currentSets[setIndex];
    const filtered = currentSets.filter((_, i) => i !== setIndex).map((s, i) => ({ ...s, set_number: i + 1, sort_order: i }));
    setTargetSets(prev => ({ ...prev, [programExerciseId]: filtered }));
    if (setToRemove && !setToRemove.id.startsWith("default-")) {
      await supabase.from("program_exercise_sets").delete().eq("id", setToRemove.id);
    }
    if (filtered.length > 0) {
      await supabase.from("program_exercises").update({ target_sets: filtered.length }).eq("id", programExerciseId);
      setProgramExercises(prev => prev.map((p) => p.id === programExerciseId ? { ...p, target_sets: filtered.length } : p));
    }
  }

  function updateSetField(programExerciseId: string, setIndex: number, field: "target_reps" | "target_weight", value: number | null) {
    setTargetSets(prev => {
      const currentSets = prev[programExerciseId] || [];
      const updated = currentSets.map((s, i) => i === setIndex ? { ...s, [field]: value } : s);
      return { ...prev, [programExerciseId]: updated };
    });
  }

  async function commitSetField(programExerciseId: string, setIndex: number, field: "target_reps" | "target_weight", value: number | null) {
    setTargetSets(prev => {
      const currentSets = prev[programExerciseId] || [];
      const updated = currentSets.map((s, i) => i === setIndex ? { ...s, [field]: value } : s);
      return { ...prev, [programExerciseId]: updated };
    });

    setInlineSetValues(prev => {
      const next = { ...prev };
      const setKey = targetSets[programExerciseId]?.[setIndex]?.id;
      if (setKey) {
        delete next[`${setKey}-${field === "target_weight" ? "weight" : "reps"}`];
      }
      return next;
    });

    const currentSets = targetSets[programExerciseId] || [];
    const setToUpdate = currentSets[setIndex];
    if (!setToUpdate) return;

    if (setToUpdate.id.startsWith("default-")) {
      const pe = programExercises.find((p) => p.id === programExerciseId);
      if (pe) {
        await supabase.from("program_exercises").update({ target_weight: field === "target_weight" ? value : pe.target_weight, target_reps: field === "target_reps" ? value : pe.target_reps }).eq("id", programExerciseId);
        setProgramExercises(prev => prev.map((p) => p.id === programExerciseId ? { ...p, [field === "target_weight" ? "target_weight" : "target_reps"]: value } : p));
      }
    } else {
      await supabase.from("program_exercise_sets").update({ [field]: value }).eq("id", setToUpdate.id);
    }
  }

  async function getOrCreateExercise(name: string, muscleGroup: string): Promise<string> {
    try {
      const { data: existing, error: existingError } = await supabase.from("exercises").select("id").eq("name", name).single();
      if (existingError && existingError.code !== "PGRST116") {
        console.error("Error checking existing exercise:", existingError);
      }
      if (existing) return existing.id;
      const { data: created, error: createError } = await supabase.from("exercises").insert({ name, muscle_group: muscleGroup }).select().single();
      if (createError) {
        console.error("Error creating exercise:", createError);
        throw new Error(`Impossible de créer l'exercice: ${name}`);
      }
      if (created) return created.id;
      throw new Error(`Impossible de créer l'exercice: ${name}`);
    } catch (e) {
      console.error("Exception in getOrCreateExercise:", e);
      throw e;
    }
  }

  async function addExercise(support: string) {
    const currentProgramId = programIdRef.current;
    
    if (!selectedBase) {
      setShowSupportPopup(false);
      setShowAdd(false);
      setSelectedBase(null);
      return;
    }
    
    if (!currentProgramId) {
      console.error("Program ID not set");
      setShowSupportPopup(false);
      setShowAdd(false);
      setSelectedBase(null);
      return;
    }
    
    const fullName = getFullName(selectedBase.baseName, support);
    
    try {
      const exerciseId = await getOrCreateExercise(fullName, selectedBase.muscleGroup);
      if (!exerciseId) {
        console.error("Failed to get or create exercise - no ID returned");
        setShowSupportPopup(false);
        setShowAdd(false);
        setSelectedBase(null);
        return;
      }
      
      const currentExercises = programExercises || [];
      const order = currentExercises.length;
      
      const insertPayload = {
        program_id: currentProgramId,
        exercise_id: exerciseId,
        target_sets: 4,
        target_reps: 8,
        target_weight: 0,
        sort_order: order,
      };
      
      const { data: peData, error: peError } = await supabase
        .from("program_exercises")
        .insert(insertPayload)
        .select("id, exercise_id, target_sets, target_reps, target_weight, sort_order")
        .single();
      
      if (peError) {
        console.error("Error inserting program exercise:", peError);
        setShowSupportPopup(false);
        setShowAdd(false);
        setSelectedBase(null);
        return;
      }
      
      if (!peData) {
        console.error("No data returned from insert");
        setShowSupportPopup(false);
        setShowAdd(false);
        setSelectedBase(null);
        return;
      }
      
      const newPe = {
        ...peData,
        exercises: { id: exerciseId, name: fullName, muscle_group: selectedBase.muscleGroup },
        rep_range_min: 8,
        rep_range_max: 12,
      } as ProgramExercise;
      
      setProgramExercises([...currentExercises, newPe]);
      
      const defaults: TargetSet[] = [];
      for (let i = 1; i <= 4; i++) {
        defaults.push({
          id: `temp-${Date.now()}-${i}`,
          program_exercise_id: peData.id,
          set_number: i,
          target_reps: 8,
          target_weight: 0,
          sort_order: i - 1,
        });
      }
      
      setTargetSets((prev) => ({ ...prev, [peData.id]: defaults }));
      
    } catch (err) {
      console.error("Exception in addExercise:", err);
    }
    
    setSelectedBase(null);
    setShowSupportPopup(false);
    setShowAdd(false);
  }

  async function removeExercise(id: string) {
    await supabase.from("program_exercises").delete().eq("id", id);
    const newSets = { ...targetSets };
    delete newSets[id];
    setTargetSets(newSets);
    setProgramExercises(programExercises.filter((pe) => pe.id !== id));
    setDeleteExerciseConfirm(null);
  }

  function startEdit(pe: ProgramExercise) { setEditingId(pe.id); setEditSets(pe.target_sets); setEditRepMin(pe.target_reps); setEditRepMax(pe.target_reps); setEditWeight(pe.target_weight !== null ? toDisplay(pe.target_weight) as unknown as number : null); }

  async function reorderExercise(id: string, direction: "up" | "down") {
    const idx = programExercises.findIndex((pe) => pe.id === id);
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === programExercises.length - 1) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    const currentExercise = programExercises[idx];
    const swapExercise = programExercises[swapIdx];
    if (!currentExercise || !swapExercise) return;

    const updated = [...programExercises];
    [updated[idx], updated[swapIdx]] = [updated[swapIdx], updated[idx]];
    const withOrder = updated.map((pe, i) => ({ ...pe, sort_order: i }));
    setProgramExercises(withOrder);

    await Promise.all([
      supabase.from("program_exercises").update({ sort_order: swapIdx }).eq("id", id),
      supabase.from("program_exercises").update({ sort_order: idx }).eq("id", swapExercise.id),
    ]);
  }

  async function saveEdit(id: string) {
    const weightInKg = editWeight !== null ? toKg(String(editWeight)) : null;
    const { error: err } = await supabase.from("program_exercises").update({ target_sets: editSets, target_reps: editRepMin, target_weight: weightInKg }).eq("id", id);
    if (err && err.code === "42703") { 
      const { error: err2 } = await supabase.from("program_exercises").update({ target_sets: editSets, target_reps: editRepMin, target_weight: weightInKg }).eq("id", id); 
      if (!err2) { 
        setProgramExercises(programExercises.map((pe) => pe.id === id ? { ...pe, target_sets: editSets, target_reps: editRepMin, target_weight: weightInKg } : pe)); 
      } 
    }
    else if (!err) { 
      setProgramExercises(programExercises.map((pe) => pe.id === id ? { ...pe, target_sets: editSets, target_reps: editRepMin, target_weight: weightInKg } : pe)); 
    }
    setEditingId(null);
  }

  function getGroupedExercises() {
    const groups: Record<string, ExerciseDef[]> = { PUSH: [], PULL: [], LEGS: [], AUTRES: [] };
    for (const ex of EXERCISE_CATALOG) { groups[ex.category].push(ex); }
    return groups;
  }

  const totalSets = programExercises.reduce((sum, pe) => sum + (targetSets[pe.id]?.length || pe.target_sets), 0);
  const estimatedMinutes = Math.round(totalSets * 2.5);

  if (loading || !user) return <p className="p-6">{t("program_loading", lang)}</p>;

  return (
    <main className="flex min-h-screen flex-col p-4 pb-24 animate-fade-in max-w-2xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Link href="/programs" className="p-2 rounded-xl active:scale-95 transition-all text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]" style={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--card-border))" }}>
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1 min-w-0">
          {editingName ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                className="flex-1 rounded-xl px-3 py-2 text-lg font-bold text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))/50] transition-all"
                style={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(142 71% 45% / 0.5)" }}
                autoFocus
                onKeyDown={(e) => { if (e.key === "Enter") saveProgramName(); if (e.key === "Escape") setEditingName(false); }}
              />
              <button onClick={saveProgramName} className="p-2 rounded-lg active:scale-95 transition-all" style={{ backgroundColor: "hsl(142 71% 45% / 0.15)" }}>
                <Check className="h-4 w-4" style={{ color: "hsl(142 71% 45%)" }} />
              </button>
              <button onClick={() => setEditingName(false)} className="p-2 rounded-lg text-[hsl(var(--muted-foreground))] active:scale-95 transition-all">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => { setEditingName(true); setNameInput(programName); }}
              className="flex items-center gap-2 group active:scale-[0.98] transition-all w-full"
            >
              <h1 className="text-xl font-bold tracking-tight text-[hsl(var(--foreground))] truncate">{programName}</h1>
              <Pencil className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" style={{ color: "hsl(var(--muted-foreground))" }} />
            </button>
          )}
        </div>
      </div>

      {loadingData ? (
        <p className="text-[hsl(var(--muted-foreground))]">{t("program_loading", lang)}</p>
      ) : (
        <>
          {/* Summary bar */}
          {programExercises.length > 0 && (
            <div className="rounded-xl px-4 py-3 mb-4 animate-slide-up" style={{ backgroundColor: "#1a1a1a", border: "1px solid hsl(var(--card-border))" }}>
              <p className="text-sm font-semibold text-[hsl(var(--foreground))]">
                {programExercises.length} exercice{programExercises.length > 1 ? "s" : ""} · {totalSets} série{totalSets > 1 ? "s" : ""} · ~{estimatedMinutes} min
              </p>
            </div>
          )}

          {programExercises.length === 0 && (
            <div className="text-center py-16 animate-fade-in">
              <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: "#1a1a1a", border: "1px solid hsl(var(--card-border))" }}>
                <Dumbbell className="h-8 w-8" style={{ color: "hsl(var(--muted-foreground-dimmer))" }} />
              </div>
              <p className="text-[hsl(var(--muted-foreground))] text-sm">{t("program_no_exercises", lang)}</p>
            </div>
          )}

          {/* Exercise cards */}
          <div className="flex flex-col gap-3 mb-6">
            {programExercises.map((pe, idx) => {
              const sets = targetSets[pe.id] || [];
              const muscleColor = MUSCLE_COLORS[pe.exercises.muscle_group || ""] || { bg: "hsl(var(--card-bg-muted))", text: "hsl(var(--muted-foreground))" };

              return (
                <div key={pe.id} className="animate-slide-up" style={{ backgroundColor: "#1a1a1a", borderRadius: "12px", padding: "16px", animationDelay: `${idx * 0.05}s` }}>
                  {editingId === pe.id ? (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <p className="font-bold text-[16px] text-white">{pe.exercises.name}</p>
                        <div className="flex gap-2">
                          <button onClick={() => saveEdit(pe.id)} className="p-2 rounded-lg active:scale-95 transition-all" style={{ backgroundColor: "hsl(142 71% 45% / 0.15)" }}>
                            <Save className="h-4 w-4" style={{ color: "hsl(142 71% 45%)" }} />
                          </button>
                          <button onClick={() => setEditingId(null)} className="p-2 rounded-lg text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] active:scale-95 transition-all">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { label: t("program_sets", lang), value: editSets, set: setEditSets, min: 1, max: 10 },
                          { label: t("program_reps", lang), value: editRepMin, set: setEditRepMin, min: 1, max: 30 },
                          { label: `${t("program_weight", lang)} (${unitLabel})`, value: editWeight, set: setEditWeight, min: 0, max: 999, step: unit === "lbs" ? 1 : 0.5 },
                        ].map((field) => (
                          <div key={field.label}>
                            <label className="text-[10px] text-[hsl(var(--muted-foreground-dim))] block mb-1">{field.label}</label>
                            <input type="number" value={field.value ?? ""} onChange={(e) => { const v = e.target.value; const fn = field.set as (val: number | null) => void; fn(v === "" ? null : Math.max(field.min, parseFloat(v) || field.min)); }} className="w-full rounded-lg px-2 py-1.5 text-center text-sm text-[hsl(var(--foreground))] focus:outline-none transition-all" style={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--inactive-btn-border))" }} onFocus={(e) => (e.currentTarget.style.borderColor = "hsl(142 71% 45% / 0.5)")} onBlur={(e) => (e.currentTarget.style.borderColor = "hsl(var(--inactive-btn-border))")} min={field.min} max={field.max} step={field.step || 1} placeholder={field.label} />
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div>
                      {/* Exercise header */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg, hsl(var(--primary) / 0.15), hsl(var(--primary) / 0.05))" }}>
                            <Dumbbell className="h-4 w-4" style={{ color: "hsl(var(--primary))" }} />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-[16px] text-white truncate">{pe.exercises.name}</p>
                            <span className="inline-block text-[11px] font-medium px-2.5 py-0.5 rounded-full mt-1" style={{ backgroundColor: muscleColor.bg, color: muscleColor.text }}>
                              {pe.exercises.muscle_group || t("program_autre", lang)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                          <div className="flex flex-col gap-0.5">
                            <button
                              onClick={() => reorderExercise(pe.id, "up")}
                              disabled={idx === 0}
                              className="p-1 rounded text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] active:scale-95 transition-all disabled:opacity-20"
                            >
                              <ChevronUp className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => reorderExercise(pe.id, "down")}
                              disabled={idx === programExercises.length - 1}
                              className="p-1 rounded text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] active:scale-95 transition-all disabled:opacity-20"
                            >
                              <ChevronDown className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <button onClick={() => startEdit(pe)} className="p-2 rounded-lg text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] active:scale-95 transition-all">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => setDeleteExerciseConfirm(pe.id)} className="p-2 rounded-lg text-[hsl(var(--muted-foreground))] hover:text-red-500 active:scale-95 transition-all">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Sets list */}
                      <div className="flex flex-col gap-2">
                        {sets.map((s, si) => (
                          <div key={s.id} className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ backgroundColor: "hsl(var(--card-bg-muted))" }}>
                            <span className="text-sm font-semibold text-white w-8 text-center">S{s.set_number}</span>
                            <span className="text-[hsl(var(--muted-foreground-dim))] text-sm">|</span>
                            <div className="flex-1 flex items-center gap-2">
                              <input
                                type="number"
                                inputMode="decimal"
                                min={0}
                                step={unit === "lbs" ? 1 : 0.5}
                                value={inlineSetValues[`${s.id}-weight`] !== undefined ? inlineSetValues[`${s.id}-weight`] : toDisplay(s.target_weight)}
                                onChange={(e) => {
                                  const key = `${s.id}-weight`;
                                  setInlineSetValues({ ...inlineSetValues, [key]: e.target.value });
                                  const kg = toKg(e.target.value);
                                  if (kg !== null || e.target.value === "") updateSetField(pe.id, si, "target_weight", kg);
                                }}
                                onBlur={() => {
                                  const raw = inlineSetValues[`${s.id}-weight`] ?? toDisplay(s.target_weight);
                                  const kg = toKg(raw);
                                  if (kg !== null || raw === "") commitSetField(pe.id, si, "target_weight", kg);
                                }}
                                placeholder={unitLabel}
                                className="flex-1 rounded-lg px-2 py-1.5 text-sm font-semibold text-white focus:outline-none transition-all placeholder:text-[hsl(var(--muted-foreground-dim))] placeholder:font-normal"
                                style={{ backgroundColor: "#2a2a2a", border: "1px solid hsl(var(--inactive-btn-border))" }}
                                onFocus={(e) => (e.currentTarget.style.borderColor = "hsl(142 71% 45% / 0.5)")}
                              />
                              <span className="text-[hsl(var(--muted-foreground-dim))] text-sm">|</span>
                              <input
                                type="number"
                                inputMode="numeric"
                                min={1}
                                max={50}
                                value={inlineSetValues[`${s.id}-reps`] !== undefined ? inlineSetValues[`${s.id}-reps`] : s.target_reps}
                                onChange={(e) => {
                                  const key = `${s.id}-reps`;
                                  setInlineSetValues({ ...inlineSetValues, [key]: e.target.value });
                                  const v = parseInt(e.target.value);
                                  if (!isNaN(v) && v > 0) updateSetField(pe.id, si, "target_reps", v);
                                }}
                                onBlur={() => {
                                  const v = parseInt(inlineSetValues[`${s.id}-reps`] ?? String(s.target_reps));
                                  if (!isNaN(v) && v > 0) commitSetField(pe.id, si, "target_reps", v);
                                }}
                                className="w-16 rounded-lg px-2 py-1.5 text-sm font-semibold text-white text-center focus:outline-none transition-all"
                                style={{ backgroundColor: "#2a2a2a", border: "1px solid hsl(var(--inactive-btn-border))" }}
                                onFocus={(e) => (e.currentTarget.style.borderColor = "hsl(142 71% 45% / 0.5)")}
                              />
                              <span className="text-[10px] text-[hsl(var(--muted-foreground-dim))]">{unitLabel}</span>
                            </div>
                            {sets.length > 1 && (
                              <button
                                onClick={() => removeTargetSetRow(pe.id, si)}
                                className="p-1 rounded transition-all hover:scale-110 active:scale-95"
                                title={t("program_delete_set", lang)}
                              >
                                <span className="text-base">🗑</span>
                              </button>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Add set button */}
                      <button
                        onClick={() => addTargetSetRow(pe.id)}
                        className="mt-3 w-full py-2 text-sm font-semibold flex items-center justify-center gap-1 active:scale-[0.98] transition-all"
                        style={{ backgroundColor: "transparent", color: "hsl(142 71% 45%)" }}
                      >
                        <Plus className="h-4 w-4" />
                        {t("program_add_set", lang)}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add exercise */}
          {showAdd && !showSupportPopup ? (
            <div className="flex flex-col gap-3 animate-slide-up">
              <select
                value={selectedBase?.baseName || ""}
                onChange={(e) => {
                  const ex = EXERCISE_CATALOG.find((c) => c.baseName === e.target.value);
                  if (ex) {
                    setSelectedBase(ex);
                    if (ex.supports.length > 1) {
                      setShowSupportPopup(true);
                    } else {
                      addExercise(ex.supports[0]);
                    }
                  }
                }}
                className="rounded-xl px-4 py-3 text-[hsl(var(--foreground))] focus:outline-none transition-all appearance-none"
                style={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--card-border))" }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "hsl(142 71% 45% / 0.5)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "hsl(var(--card-border))")}
              >
                <option value="">{t("program_choose_exercise", lang)}</option>
                {(() => {
                  const groups = getGroupedExercises();
                  return (
                    <>
                      {Object.entries(groups).filter(([, exercises]) => exercises.length > 0).map(([group, exercises]) => (
                        <optgroup key={group} label={group}>
                          {exercises.map((ex) => <option key={ex.baseName} value={ex.baseName}>{ex.baseName}</option>)}
                        </optgroup>
                      ))}
                    </>
                  );
                })()}
              </select>
              <button onClick={() => { setShowAdd(false); setSelectedBase(null); }} className="w-full rounded-xl px-6 py-3 text-sm font-medium active:scale-95 transition-all" style={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--card-border))", color: "hsl(var(--inactive-btn-text))" }}>{t("programs_cancel", lang)}</button>
            </div>
          ) : showSupportPopup && selectedBase ? (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ backgroundColor: "hsl(var(--overlay))", backdropFilter: "blur(8px)" }}>
              <div className="w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-6 animate-slide-up" style={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--card-border))", boxShadow: "0 24px 48px hsl(var(--shadow-heavy))" }}>
                <div className="flex items-center justify-between mb-6">
                  <p className="font-semibold text-lg text-[hsl(var(--foreground))]">{selectedBase.baseName}</p>
                  <button onClick={() => setShowSupportPopup(false)} className="text-sm active:scale-95 transition-all" style={{ color: "hsl(var(--muted-foreground))" }}>{t("workout_back_btn", lang)}</button>
                </div>
                <div className="flex flex-col gap-3">
                  {selectedBase.supports.map((support) => (
                    <button
                      key={support}
                      onClick={() => addExercise(support)}
                      className="w-full rounded-xl px-6 py-4 text-center font-medium active:scale-[0.98] transition-all"
                      style={{ backgroundColor: "hsl(var(--card-bg-muted))", border: "1px solid hsl(var(--inactive-btn-border))", color: "hsl(var(--inactive-btn-text-light))" }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "hsl(142 71% 45% / 0.5)"; e.currentTarget.style.color = "hsl(142 71% 45%)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "hsl(var(--inactive-btn-border))"; e.currentTarget.style.color = "hsl(var(--inactive-btn-text-light))"; }}
                    >
                      {support}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowAdd(true)} disabled={!paramsResolved || loadingData} className="w-full rounded-xl px-6 py-4 text-center text-sm font-medium active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed" style={{ backgroundColor: "hsl(var(--card))", border: "1px dashed hsl(var(--inactive-btn-border))", color: "hsl(var(--icon-muted))" }}>
              <Plus className="h-4 w-4" />
              {t("program_add_exercise", lang)}
            </button>
          )}
        </>
      )}

      <ConfirmDialog open={deleteExerciseConfirm !== null} title={t("dialog_remove_exercise_title", lang)} description={t("dialog_remove_exercise_desc", lang)} confirmLabel={t("dialog_remove_exercise_confirm", lang)} danger onConfirm={() => deleteExerciseConfirm && removeExercise(deleteExerciseConfirm)} onCancel={() => setDeleteExerciseConfirm(null)} />
    </main>
  );
}
