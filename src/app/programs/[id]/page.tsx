"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import Link from "next/link";
import { ArrowLeft, Plus, Pencil, Trash2, Save, X, Dumbbell, ChevronRight } from "lucide-react";

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
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState("");
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
    const { data: exercises } = await supabase.from("exercises").select("id, name, muscle_group").order("name");
    if (exercises) setAllExercises(exercises);
    const { data: pe, error } = await supabase.from("program_exercises").select("id, exercise_id, target_sets, target_reps, target_weight, rep_range_min, rep_range_max, sort_order, exercises(id, name, muscle_group)").eq("program_id", programId).order("sort_order");
    if (pe) { const mapped = (pe as unknown as ProgramExercise[]).map((p) => ({ ...p, rep_range_min: p.rep_range_min || p.target_reps, rep_range_max: p.rep_range_max || p.target_reps + 4 })); setProgramExercises(mapped); }
    else if (error && error.code === "42703") { const { data: fallback } = await supabase.from("program_exercises").select("id, exercise_id, target_sets, target_reps, target_weight, sort_order, exercises(id, name, muscle_group)").eq("program_id", programId).order("sort_order"); if (fallback) { const mapped = (fallback as unknown as ProgramExercise[]).map((p) => ({ ...p, rep_range_min: p.target_reps, rep_range_max: p.target_reps + 4 })); setProgramExercises(mapped); } }
    setLoadingData(false);
  }

  async function addExercise() {
    if (!selectedExercise) return;
    const ex = allExercises.find((e) => e.id === selectedExercise);
    if (!ex) return;
    const order = programExercises.length;
    const insertData: Record<string, unknown> = { program_id: programId, exercise_id: selectedExercise, target_sets: 4, target_reps: 8, target_weight: 0, rep_range_min: 8, rep_range_max: 12, sort_order: order };
    const { data, error } = await supabase.from("program_exercises").insert(insertData).select("id, exercise_id, target_sets, target_reps, target_weight, rep_range_min, rep_range_max, sort_order").single();
    if (error && error.code === "42703") {
      const { data: fallbackData } = await supabase.from("program_exercises").insert({ program_id: programId, exercise_id: selectedExercise, target_sets: 4, target_reps: 8, target_weight: 0, sort_order: order }).select("id, exercise_id, target_sets, target_reps, target_weight, sort_order").single();
      if (fallbackData) { setProgramExercises([...programExercises, { ...fallbackData, exercises: ex, rep_range_min: 8, rep_range_max: 12 } as ProgramExercise]); setSelectedExercise(""); setShowAdd(false); }
      return;
    }
    if (data) { setProgramExercises([...programExercises, { ...data, exercises: ex, rep_range_min: data.rep_range_min || 8, rep_range_max: data.rep_range_max || 12 } as ProgramExercise]); setSelectedExercise(""); setShowAdd(false); }
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

  if (loading || !user) return <p className="p-6">Chargement...</p>;

  return (
    <main className="flex min-h-screen flex-col p-5 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/programs" className="p-2 rounded-xl hover:bg-neutral-900 active:scale-95 transition-all text-neutral-500"><ArrowLeft className="h-5 w-5" /></Link>
        <h1 className="text-2xl font-bold tracking-tight">{programName}</h1>
      </div>

      {loadingData ? (
        <p className="text-neutral-500">Chargement...</p>
      ) : (
        <>
          {programExercises.length === 0 && (
            <div className="text-center py-12">
              <Dumbbell className="h-10 w-10 text-neutral-700 mx-auto mb-3" />
              <p className="text-neutral-500 text-sm">Aucun exercice. Ajoute-en pour commencer !</p>
            </div>
          )}

          <div className="flex flex-col gap-2.5 mb-6">
            {programExercises.map((pe, idx) => (
              <div key={pe.id} className="rounded-xl border border-neutral-800 bg-neutral-900 overflow-hidden">
                {editingId === pe.id ? (
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="font-semibold text-sm">{pe.exercises.name}</p>
                      <div className="flex gap-2">
                        <button onClick={() => saveEdit(pe.id)} className="p-1.5 rounded-lg bg-green-500/10 text-green-500 active:scale-95 transition-all"><Save className="h-4 w-4" /></button>
                        <button onClick={() => setEditingId(null)} className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-300 active:scale-95 transition-all"><X className="h-4 w-4" /></button>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { label: "Séries", value: editSets, set: setEditSets, min: 1, max: 10 },
                        { label: "Reps min", value: editRepMin, set: setEditRepMin, min: 1, max: 30 },
                        { label: "Reps max", value: editRepMax, set: setEditRepMax, min: editRepMin, max: 30 },
                        { label: "Poids (kg)", value: editWeight, set: setEditWeight, min: 0, max: 999, step: 0.5 },
                      ].map((field) => (
                        <div key={field.label}>
                          <label className="text-[10px] text-neutral-600 block mb-1">{field.label}</label>
                          <input type="number" value={field.value} onChange={(e) => field.set(Math.max(field.min, parseFloat(e.target.value) || field.min))} className="w-full rounded-lg border border-neutral-800 bg-neutral-800 px-2 py-1.5 text-center text-sm text-neutral-50 focus:outline-none focus:ring-2 focus:ring-green-500/50" min={field.min} max={field.max} step={field.step || 1} />
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-neutral-600 mt-2">Double progression : {editRepMin}→{editRepMax} reps, puis +poids et retour à {editRepMin}</p>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-neutral-600 font-mono w-5">{idx + 1}</span>
                      <div>
                        <p className="font-semibold text-sm">{pe.exercises.name}</p>
                        <p className="text-xs text-neutral-500 mt-0.5">
                          {pe.target_sets} × {pe.rep_range_min}–{pe.rep_range_max} reps @ {pe.target_weight} kg
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => startEdit(pe)} className="p-2 rounded-lg text-neutral-500 hover:text-neutral-300 active:scale-95 transition-all"><Pencil className="h-3.5 w-3.5" /></button>
                      <button onClick={() => setDeleteExerciseConfirm(pe.id)} className="p-2 rounded-lg text-neutral-500 hover:text-red-500 active:scale-95 transition-all"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {showAdd ? (
            <div className="flex flex-col gap-3">
              <select value={selectedExercise} onChange={(e) => setSelectedExercise(e.target.value)} className="rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-neutral-50 focus:outline-none focus:ring-2 focus:ring-green-500/50 appearance-none">
                <option value="">Choisir un exercice</option>
                {allExercises.map((ex) => <option key={ex.id} value={ex.id}>{ex.name} {ex.muscle_group ? `(${ex.muscle_group})` : ""}</option>)}
              </select>
              <div className="flex gap-2">
                <button onClick={addExercise} disabled={!selectedExercise} className="flex-1 rounded-xl bg-green-500 px-6 py-3 font-semibold text-neutral-950 shadow-lg shadow-green-500/20 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100">Ajouter</button>
                <button onClick={() => { setShowAdd(false); setSelectedExercise(""); }} className="rounded-xl border border-neutral-800 px-6 py-3 text-sm text-neutral-500 hover:text-neutral-300 active:scale-95 transition-all">Annuler</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowAdd(true)} className="w-full rounded-xl border border-dashed border-neutral-800 px-6 py-4 text-center text-sm text-neutral-500 hover:text-neutral-300 hover:border-neutral-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
              <Plus className="h-4 w-4" />
              Ajouter un exercice
            </button>
          )}
        </>
      )}

      <ConfirmDialog open={deleteExerciseConfirm !== null} title="Retirer l'exercice" message="Cet exercice sera retiré du programme." confirmLabel="Retirer" danger onConfirm={() => deleteExerciseConfirm && removeExercise(deleteExerciseConfirm)} onCancel={() => setDeleteExerciseConfirm(null)} />
    </main>
  );
}
