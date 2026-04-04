"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import ConfirmDialog from "@/components/ConfirmDialog";
import { EXERCISE_CATALOG, getFullName } from "@/lib/exercises";
import type { ExerciseDef } from "@/lib/exercises";
import Link from "next/link";
import { ArrowLeft, Plus, Pencil, Trash2, Save, X, Dumbbell } from "lucide-react";

interface Exercise { id: string; name: string; muscle_group: string | null; }
interface ProgramExercise {
  id: string; exercise_id: string; target_sets: number; target_reps: number;
  target_weight: number; rep_range_min: number; rep_range_max: number;
  sort_order: number; exercises: Exercise;
}

export default function ProgramDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [programId, setProgramId] = useState("");
  const [programName, setProgramName] = useState("");
  const [programExercises, setProgramExercises] = useState<ProgramExercise[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedBase, setSelectedBase] = useState<ExerciseDef | null>(null);
  const [showSupportPopup, setShowSupportPopup] = useState(false);
  const [deleteExerciseConfirm, setDeleteExerciseConfirm] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSets, setEditSets] = useState(4);
  const [editRepMin, setEditRepMin] = useState(8);
  const [editRepMax, setEditRepMax] = useState(12);
  const [editWeight, setEditWeight] = useState(0);

  useEffect(() => { if (!loading && !user) router.push("/login"); }, [user, loading, router]);
  useEffect(() => { params.then((p) => setProgramId(p.id)); }, [params]);
  useEffect(() => { if (!user || !programId) return; loadData(); }, [user, programId]);

  async function loadData() {
    const { data: program } = await supabase.from("programs").select("name").eq("id", programId).single();
    if (program) setProgramName(program.name);
    const { data: pe, error } = await supabase.from("program_exercises").select("id, exercise_id, target_sets, target_reps, target_weight, rep_range_min, rep_range_max, sort_order, exercises(id, name, muscle_group)").eq("program_id", programId).order("sort_order");
    if (pe) { const mapped = (pe as unknown as ProgramExercise[]).map((p) => ({ ...p, rep_range_min: p.rep_range_min || p.target_reps, rep_range_max: p.rep_range_max || p.target_reps + 4 })); setProgramExercises(mapped); }
    else if (error && error.code === "42703") { const { data: fallback } = await supabase.from("program_exercises").select("id, exercise_id, target_sets, target_reps, target_weight, sort_order, exercises(id, name, muscle_group)").eq("program_id", programId).order("sort_order"); if (fallback) { const mapped = (fallback as unknown as ProgramExercise[]).map((p) => ({ ...p, rep_range_min: p.target_reps, rep_range_max: p.target_reps + 4 })); setProgramExercises(mapped); } }
    setLoadingData(false);
  }

  async function getOrCreateExercise(name: string, muscleGroup: string): Promise<string> {
    const { data: existing } = await supabase.from("exercises").select("id").eq("name", name).single();
    if (existing) return existing.id;
    const { data: created } = await supabase.from("exercises").insert({ name, muscle_group: muscleGroup }).select().single();
    if (created) return created.id;
    throw new Error(`Impossible de créer l'exercice: ${name}`);
  }

  async function addExercise(support: string) {
    if (!selectedBase) return;
    const fullName = getFullName(selectedBase.baseName, support);
    const exerciseId = await getOrCreateExercise(fullName, selectedBase.muscleGroup);
    const order = programExercises.length;
    const insertData: Record<string, unknown> = { program_id: programId, exercise_id: exerciseId, target_sets: 4, target_reps: 8, target_weight: 0, rep_range_min: 8, rep_range_max: 12, sort_order: order };
    const { data, error } = await supabase.from("program_exercises").insert(insertData).select("id, exercise_id, target_sets, target_reps, target_weight, rep_range_min, rep_range_max, sort_order").single();
    if (error && error.code === "42703") {
      const { data: fallbackData } = await supabase.from("program_exercises").insert({ program_id: programId, exercise_id: exerciseId, target_sets: 4, target_reps: 8, target_weight: 0, sort_order: order }).select("id, exercise_id, target_sets, target_reps, target_weight, sort_order").single();
      if (fallbackData) {
        setProgramExercises([...programExercises, { ...fallbackData, exercises: { id: exerciseId, name: fullName, muscle_group: selectedBase.muscleGroup }, rep_range_min: 8, rep_range_max: 12 } as ProgramExercise]);
        setSelectedBase(null); setShowSupportPopup(false); setShowAdd(false);
      }
      return;
    }
    if (data) {
      setProgramExercises([...programExercises, { ...data, exercises: { id: exerciseId, name: fullName, muscle_group: selectedBase.muscleGroup }, rep_range_min: data.rep_range_min || 8, rep_range_max: data.rep_range_max || 12 } as ProgramExercise]);
      setSelectedBase(null); setShowSupportPopup(false); setShowAdd(false);
    }
  }

  async function removeExercise(id: string) {
    await supabase.from("program_exercises").delete().eq("id", id);
    setProgramExercises(programExercises.filter((pe) => pe.id !== id));
    setDeleteExerciseConfirm(null);
  }

  function startEdit(pe: ProgramExercise) { setEditingId(pe.id); setEditSets(pe.target_sets); setEditRepMin(pe.rep_range_min); setEditRepMax(pe.rep_range_max); setEditWeight(pe.target_weight); }

  async function saveEdit(id: string) {
    if (editRepMin > editRepMax) return;
    const { error: err } = await supabase.from("program_exercises").update({ target_sets: editSets, target_reps: editRepMin, target_weight: editWeight, rep_range_min: editRepMin, rep_range_max: editRepMax }).eq("id", id);
    if (err && err.code === "42703") { const { error: err2 } = await supabase.from("program_exercises").update({ target_sets: editSets, target_reps: editRepMin, target_weight: editWeight }).eq("id", id); if (!err2) { setProgramExercises(programExercises.map((pe) => pe.id === id ? { ...pe, target_sets: editSets, target_reps: editRepMin, target_weight: editWeight, rep_range_min: editRepMin, rep_range_max: editRepMax } : pe)); } }
    else if (!err) { setProgramExercises(programExercises.map((pe) => pe.id === id ? { ...pe, target_sets: editSets, target_reps: editRepMin, target_weight: editWeight, rep_range_min: editRepMin, rep_range_max: editRepMax } : pe)); }
    setEditingId(null);
  }

  function getGroupedExercises() {
    const groups: Record<string, ExerciseDef[]> = { PUSH: [], PULL: [], LEGS: [], AUTRES: [] };
    for (const ex of EXERCISE_CATALOG) {
      groups[ex.category].push(ex);
    }
    return groups;
  }

  if (loading || !user) return <p className="p-6">Chargement...</p>;

  return (
    <main className="flex min-h-screen flex-col p-4 pb-24 animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/programs" className="p-2 rounded-xl active:scale-95 transition-all text-white/50 hover:text-white" style={{ backgroundColor: "hsl(220 15% 9%)" }}>
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">{programName}</h1>
      </div>

      {loadingData ? (
        <p className="text-white/50">Chargement...</p>
      ) : (
        <>
          {programExercises.length === 0 && (
            <div className="text-center py-16 animate-fade-in">
              <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: "hsl(220 15% 9%)", border: "1px solid hsl(220 15% 14%)" }}>
                <Dumbbell className="h-8 w-8" style={{ color: "hsl(220 15% 30%)" }} />
              </div>
              <p className="text-white/50 text-sm">Aucun exercice. Ajoute-en pour commencer !</p>
            </div>
          )}

          <div className="flex flex-col gap-2.5 mb-6">
            {programExercises.map((pe, idx) => (
              <div key={pe.id} className="rounded-2xl overflow-hidden animate-slide-up" style={{ backgroundColor: "hsl(220 15% 9%)", border: "1px solid hsl(220 15% 14%)", animationDelay: `${idx * 0.05}s` }}>
                {editingId === pe.id ? (
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="font-semibold text-sm text-white">{pe.exercises.name}</p>
                      <div className="flex gap-2">
                        <button onClick={() => saveEdit(pe.id)} className="p-2 rounded-lg active:scale-95 transition-all" style={{ backgroundColor: "hsl(142 71% 45% / 0.15)" }}>
                          <Save className="h-4 w-4" style={{ color: "hsl(142 71% 45%)" }} />
                        </button>
                        <button onClick={() => setEditingId(null)} className="p-2 rounded-lg text-white/50 hover:text-white active:scale-95 transition-all">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { label: "Séries", value: editSets, set: setEditSets, min: 1, max: 10 },
                        { label: "Reps", value: editRepMin, set: setEditRepMin, min: 1, max: 30 },
                        { label: "Reps max", value: editRepMax, set: setEditRepMax, min: editRepMin, max: 30 },
                        { label: "Poids", value: editWeight, set: setEditWeight, min: 0, max: 999, step: 0.5 },
                      ].map((field) => (
                        <div key={field.label}>
                          <label className="text-[10px] text-white/30 block mb-1">{field.label}</label>
                          <input type="number" value={field.value} onChange={(e) => field.set(Math.max(field.min, parseFloat(e.target.value) || field.min))} className="w-full rounded-lg px-2 py-1.5 text-center text-sm text-white focus:outline-none transition-all" style={{ backgroundColor: "hsl(220 15% 11%)", border: "1px solid hsl(220 15% 16%)" }} onFocus={(e) => (e.currentTarget.style.borderColor = "hsl(142 71% 45% / 0.5)")} onBlur={(e) => (e.currentTarget.style.borderColor = "hsl(220 15% 16%)")} min={field.min} max={field.max} step={field.step || 1} />
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-white/30 mt-2">Double progression : {editRepMin}→{editRepMax} reps, puis +poids</p>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono w-5" style={{ color: "hsl(220 15% 35%)" }}>{idx + 1}</span>
                      <div>
                        <p className="font-semibold text-sm text-white">{pe.exercises.name}</p>
                        <p className="text-xs mt-0.5" style={{ color: "hsl(220 15% 45%)" }}>
                          {pe.target_sets} × {pe.rep_range_min}–{pe.rep_range_max} reps @ {pe.target_weight} kg
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => startEdit(pe)} className="p-2 rounded-lg text-white/50 hover:text-white active:scale-95 transition-all"><Pencil className="h-3.5 w-3.5" /></button>
                      <button onClick={() => setDeleteExerciseConfirm(pe.id)} className="p-2 rounded-lg text-white/50 hover:text-red-500 active:scale-95 transition-all"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

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
                className="rounded-xl px-4 py-3 text-white focus:outline-none transition-all appearance-none"
                style={{ backgroundColor: "hsl(220 15% 9%)", border: "1px solid hsl(220 15% 14%)" }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "hsl(142 71% 45% / 0.5)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "hsl(220 15% 14%)")}
              >
                <option value="">Choisir un exercice</option>
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
              <button onClick={() => { setShowAdd(false); setSelectedBase(null); }} className="w-full rounded-xl px-6 py-3 text-sm font-medium active:scale-95 transition-all" style={{ backgroundColor: "hsl(220 15% 9%)", border: "1px solid hsl(220 15% 14%)", color: "hsl(220 15% 60%)" }}>Annuler</button>
            </div>
          ) : showSupportPopup && selectedBase ? (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ backgroundColor: "hsl(220 15% 6% / 0.7)", backdropFilter: "blur(8px)" }}>
              <div className="w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-6 animate-slide-up" style={{ backgroundColor: "hsl(220 15% 9%)", border: "1px solid hsl(220 15% 14%)", boxShadow: "0 24px 48px hsl(0 0% 0% / 0.4)" }}>
                <div className="flex items-center justify-between mb-6">
                  <p className="font-semibold text-lg text-white">{selectedBase.baseName}</p>
                  <button onClick={() => setShowSupportPopup(false)} className="text-sm active:scale-95 transition-all" style={{ color: "hsl(220 15% 50%)" }}>Retour</button>
                </div>
                <div className="flex flex-col gap-3">
                  {selectedBase.supports.map((support) => (
                    <button
                      key={support}
                      onClick={() => addExercise(support)}
                      className="w-full rounded-xl px-6 py-4 text-center font-medium active:scale-[0.98] transition-all"
                      style={{ backgroundColor: "hsl(220 15% 11%)", border: "1px solid hsl(220 15% 16%)", color: "hsl(220 15% 80%)" }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "hsl(142 71% 45% / 0.5)"; e.currentTarget.style.color = "hsl(142 71% 45%)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "hsl(220 15% 16%)"; e.currentTarget.style.color = "hsl(220 15% 80%)"; }}
                    >
                      {support}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowAdd(true)} className="w-full rounded-xl px-6 py-4 text-center text-sm font-medium active:scale-[0.98] transition-all flex items-center justify-center gap-2" style={{ backgroundColor: "hsl(220 15% 9%)", border: "1px dashed hsl(220 15% 16%)", color: "hsl(220 15% 50%)" }}>
              <Plus className="h-4 w-4" />
              Ajouter un exercice
            </button>
          )}
        </>
      )}

      <ConfirmDialog open={deleteExerciseConfirm !== null} title="Retirer l'exercice" description="Cet exercice sera retiré du programme." confirmLabel="Retirer" danger onConfirm={() => deleteExerciseConfirm && removeExercise(deleteExerciseConfirm)} onCancel={() => setDeleteExerciseConfirm(null)} />
    </main>
  );
}
