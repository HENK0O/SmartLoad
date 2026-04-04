"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ListSkeleton } from "@/components/Skeleton";
import { Plus, Pencil, Trash2, Copy, History, LayoutGrid, X, ChevronRight, Loader2 } from "lucide-react";

interface Program {
  id: string;
  name: string;
  created_at: string;
}

interface Workout {
  id: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  programs: { name: string } | null;
  workout_sets: {
    exercise_id: string;
    reps: number;
    weight: number;
    exercises: { name: string };
  }[];
}

type Tab = "programs" | "templates" | "history";

const MAX_PROGRAMS = 2;

export default function ProgramsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loadingPrograms, setLoadingPrograms] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("programs");
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [unit, setUnit] = useState<"kg" | "lbs">("kg");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleteType, setDeleteType] = useState<"program" | "template">("program");
  const [error, setError] = useState<string | null>(null);
  const [templates, setTemplates] = useState<{ id: string; name: string; description: string | null; exercise_count: number }[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [saveTemplateConfirm, setSaveTemplateConfirm] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState("");

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    loadPrograms();
    loadHistory();
    loadUnit();
    loadTemplates();
  }, [user, activeTab]);

  async function loadPrograms() {
    const { data } = await supabase.from("programs").select("id, name, created_at").order("created_at", { ascending: false });
    if (data) setPrograms(data);
    setLoadingPrograms(false);
  }

  async function loadHistory() {
    const { data } = await supabase
      .from("workouts")
      .select("id, status, started_at, completed_at, programs(name), workout_sets(exercise_id, reps, weight, exercises(name))")
      .order("started_at", { ascending: false });
    if (data) setWorkouts(data as unknown as Workout[]);
    setLoadingHistory(false);
  }

  async function loadUnit() {
    const { data } = await supabase.from("profiles").select("unit").eq("id", user!.id).single();
    if (data) setUnit(data.unit as "kg" | "lbs");
  }

  function displayWeight(kg: number): string {
    if (unit === "lbs") return Math.round(kg * 2.20462 * 10) / 10 + " lbs";
    return kg + " kg";
  }

  async function loadTemplates() {
    const { data } = await supabase.from("program_templates").select("id, name, description").eq("user_id", user!.id).order("created_at", { ascending: false });
    if (data) {
      const withCounts = await Promise.all(
        data.map(async (t) => {
          const { count } = await supabase.from("program_template_exercises").select("*", { count: "exact", head: true }).eq("template_id", t.id);
          return { ...t, exercise_count: count || 0 };
        })
      );
      setTemplates(withCounts);
    }
    setLoadingTemplates(false);
  }

  async function saveAsTemplate(programId: string) {
    if (!templateName.trim()) return;
    const { data: program } = await supabase.from("programs").select("name").eq("id", programId).single();
    const { data: template, error: templateError } = await supabase
      .from("program_templates")
      .insert({ user_id: user!.id, name: templateName.trim(), description: `Basé sur "${program?.name}"` })
      .select()
      .single();
    if (templateError) {
      if (templateError.code === "42P01") setError("La fonctionnalité templates n'est pas encore activée. Exécutez la migration SQL 002 dans Supabase.");
      else setError(`Erreur: ${templateError.message}`);
      setSaveTemplateConfirm(null);
      setTemplateName("");
      return;
    }
    if (!template) { setError("Impossible de créer le template."); setSaveTemplateConfirm(null); setTemplateName(""); return; }
    const { data: exercises, error: exError } = await supabase.from("program_exercises").select("exercise_id, target_sets, target_reps, target_weight, rep_range_min, rep_range_max, sort_order").eq("program_id", programId).order("sort_order");
    if (!exError && exercises) {
      const toInsert = exercises.map((ex) => ({
        template_id: template.id, exercise_id: ex.exercise_id, target_sets: ex.target_sets, target_reps: ex.target_reps,
        target_weight: ex.target_weight, rep_range_min: ex.rep_range_min || ex.target_reps, rep_range_max: ex.rep_range_max || ex.target_reps + 4, sort_order: ex.sort_order,
      }));
      await supabase.from("program_template_exercises").insert(toInsert);
    }
    setSaveTemplateConfirm(null);
    setTemplateName("");
    loadTemplates();
  }

  async function createProgramFromTemplate(templateId: string) {
    if (programs.length >= MAX_PROGRAMS) { setError(`Limite du plan Free : ${MAX_PROGRAMS} programmes maximum.`); return; }
    const { data: template } = await supabase.from("program_templates").select("name").eq("id", templateId).single();
    if (!template) return;
    const { data: program } = await supabase.from("programs").insert({ user_id: user!.id, name: template.name }).select().single();
    if (!program) return;
    const { data: templateExercises } = await supabase.from("program_template_exercises").select("exercise_id, target_sets, target_reps, target_weight, rep_range_min, rep_range_max, sort_order").eq("template_id", templateId).order("sort_order");
    if (templateExercises) {
      const toInsert = templateExercises.map((ex) => ({
        program_id: program.id, exercise_id: ex.exercise_id, target_sets: ex.target_sets, target_reps: ex.target_reps,
        target_weight: ex.target_weight, rep_range_min: ex.rep_range_min, rep_range_max: ex.rep_range_max, sort_order: ex.sort_order,
      }));
      await supabase.from("program_exercises").insert(toInsert);
    }
    setPrograms([program, ...programs]);
    setActiveTab("programs");
  }

  async function deleteTemplate(id: string) {
    await supabase.from("program_template_exercises").delete().eq("template_id", id);
    await supabase.from("program_templates").delete().eq("id", id);
    setTemplates(templates.filter((t) => t.id !== id));
    setDeleteConfirm(null);
  }

  async function createProgram() {
    if (!newName.trim() || !user) return;
    if (programs.length >= MAX_PROGRAMS) { setError(`Limite du plan Free : ${MAX_PROGRAMS} programmes maximum.`); return; }
    const { data, error: err } = await supabase.from("programs").insert({ user_id: user.id, name: newName.trim() }).select().single();
    if (err) { setError("Erreur lors de la création du programme"); return; }
    if (data) { setPrograms([data, ...programs]); setNewName(""); setShowForm(false); }
  }

  async function confirmDeleteProgram(id: string) {
    const { error: err } = await supabase.from("programs").delete().eq("id", id);
    if (err) setError("Erreur lors de la suppression");
    else setPrograms(programs.filter((p) => p.id !== id));
    setDeleteConfirm(null);
  }

  async function renameProgram(id: string) {
    if (!renameValue.trim()) return;
    const { data, error: err } = await supabase.from("programs").update({ name: renameValue.trim() }).eq("id", id).select().single();
    if (err) { setError("Erreur lors du renommage"); return; }
    if (data) { setPrograms(programs.map((p) => (p.id === id ? data : p))); setRenamingId(null); setRenameValue(""); }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  }

  if (loading || !user) return <p className="p-6">Chargement...</p>;

  return (
    <main className="flex min-h-screen flex-col p-5 pb-24 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold tracking-tight">SmartLoad</h1>
        <div className="flex items-center gap-3">
          <Link href="/workout" className="inline-flex items-center gap-1.5 text-sm font-medium text-green-500 active:scale-95 transition-transform">
            <Plus className="h-4 w-4" />
            Séance
          </Link>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/5 p-4 flex items-center justify-between">
          <p className="text-sm text-red-500">{error}</p>
          <button onClick={() => setError(null)} className="text-red-500 ml-3 active:scale-95 transition-transform"><X className="h-4 w-4" /></button>
        </div>
      )}

      <div className="flex gap-1.5 mb-6 bg-neutral-900 rounded-xl p-1">
        {[
          { key: "programs" as Tab, label: "Programmes", icon: LayoutGrid },
          { key: "templates" as Tab, label: "Templates", icon: Copy },
          { key: "history" as Tab, label: "Historique", icon: History },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all active:scale-95 ${
              activeTab === tab.key
                ? "bg-green-500 text-neutral-950 shadow-lg shadow-green-500/20"
                : "text-neutral-500 hover:text-neutral-300"
            }`}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "programs" ? (
        <>
          {loadingPrograms ? (
            <ListSkeleton count={3} />
          ) : (
            <>
              {programs.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-neutral-500 mb-4">Aucun programme. Crée ton premier programme !</p>
                </div>
              )}

              <div className="flex flex-col gap-2.5">
                {programs.map((p) => (
                  <div key={p.id} className="group rounded-xl border border-neutral-800 bg-neutral-900 p-4">
                    {renamingId === p.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          className="flex-1 rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-50 focus:outline-none focus:ring-2 focus:ring-green-500/50"
                          autoFocus
                          onKeyDown={(e) => { if (e.key === "Enter") renameProgram(p.id); if (e.key === "Escape") setRenamingId(null); }}
                        />
                        <button onClick={() => renameProgram(p.id)} className="text-xs text-green-500 font-semibold active:scale-95 transition-transform">OK</button>
                        <button onClick={() => setRenamingId(null)} className="text-xs text-neutral-500 active:scale-95 transition-transform"><X className="h-4 w-4" /></button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <Link href={`/programs/${p.id}`} className="font-semibold flex items-center gap-1.5 hover:text-green-500 transition-colors active:scale-95 transition-transform">
                          {p.name}
                          <ChevronRight className="h-4 w-4 text-neutral-600" />
                        </Link>
                        <div className="flex items-center gap-1">
                          <button onClick={() => { setRenamingId(p.id); setRenameValue(p.name); }} className="p-2 rounded-lg text-neutral-500 hover:text-neutral-300 active:scale-95 transition-all"><Pencil className="h-3.5 w-3.5" /></button>
                          <button onClick={() => { setSaveTemplateConfirm(p.id); setTemplateName(p.name); }} className="p-2 rounded-lg text-neutral-500 hover:text-green-500 active:scale-95 transition-all"><Copy className="h-3.5 w-3.5" /></button>
                          <button onClick={() => { setDeleteConfirm(p.id); setDeleteType("program"); }} className="p-2 rounded-lg text-neutral-500 hover:text-red-500 active:scale-95 transition-all"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {showForm ? (
                <div className="mt-5 flex flex-col gap-3">
                  <input
                    type="text"
                    placeholder="Nom du programme"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-neutral-50 placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-green-500/50 transition-all"
                  />
                  <div className="flex gap-2">
                    <button onClick={createProgram} disabled={!newName.trim()} className="flex-1 rounded-xl bg-green-500 px-6 py-3 font-semibold text-neutral-950 shadow-lg shadow-green-500/20 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100">
                      Créer
                    </button>
                    <button onClick={() => { setShowForm(false); setNewName(""); }} className="rounded-xl border border-neutral-800 px-6 py-3 text-sm text-neutral-500 hover:text-neutral-300 active:scale-95 transition-all">
                      Annuler
                    </button>
                  </div>
                </div>
              ) : programs.length < MAX_PROGRAMS ? (
                <button onClick={() => setShowForm(true)} className="mt-4 w-full rounded-xl border border-dashed border-neutral-800 px-6 py-4 text-center text-sm text-neutral-500 hover:text-neutral-300 hover:border-neutral-700 active:scale-95 transition-all">
                  + Nouveau programme
                </button>
              ) : (
                <p className="mt-4 text-xs text-neutral-600 text-center">Limite de {MAX_PROGRAMS} programmes atteinte (plan Free)</p>
              )}
            </>
          )}
        </>
      ) : activeTab === "templates" ? (
        <>
          {loadingTemplates ? (
            <ListSkeleton count={3} />
          ) : (
            <>
              {templates.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-neutral-500 mb-2">Aucun template.</p>
                  <p className="text-xs text-neutral-600">Sauvegarde un programme existant comme template !</p>
                </div>
              )}

              <div className="flex flex-col gap-2.5">
                {templates.map((t) => (
                  <div key={t.id} className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{t.name}</p>
                        <p className="text-xs text-neutral-500 mt-0.5">
                          {t.exercise_count} exercice{t.exercise_count > 1 ? "s" : ""}
                          {t.description && <span className="text-neutral-600"> · {t.description}</span>}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => createProgramFromTemplate(t.id)} className="px-3 py-1.5 rounded-lg bg-green-500/10 text-xs font-semibold text-green-500 active:scale-95 transition-all">
                          Utiliser
                        </button>
                        <button onClick={() => { setDeleteConfirm(t.id); setDeleteType("template"); }} className="p-2 rounded-lg text-neutral-500 hover:text-red-500 active:scale-95 transition-all"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      ) : (
        <>
          {loadingHistory ? (
            <ListSkeleton count={3} />
          ) : workouts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-neutral-500">Aucune séance pour le moment.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {workouts.map((w) => {
                const sets = w.workout_sets || [];
                const summary: Record<string, { totalSets: number; details: string[] }> = {};
                for (const s of sets) {
                  const name = (s.exercises as { name: string })?.name ?? "Exercice";
                  if (!summary[name]) summary[name] = { totalSets: 0, details: [] };
                  summary[name].totalSets++;
                  const wt = unit === "lbs" ? Math.round(s.weight * 2.20462 * 10) / 10 : s.weight;
                  const u = unit === "lbs" ? "lbs" : "kg";
                  summary[name].details.push(`${s.reps}×${wt} ${u}`);
                }

                return (
                  <Link key={w.id} href={`/workout/${w.id}`} className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 hover:border-green-500/30 active:scale-[0.98] transition-all">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-semibold">{w.programs?.name ?? "Séance libre"}</p>
                        <p className="text-xs text-neutral-500 mt-0.5">{formatDate(w.started_at)}</p>
                      </div>
                      <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${
                        w.status === "completed" ? "bg-green-500/10 text-green-500" : w.status === "abandoned" ? "bg-red-500/10 text-red-500" : "bg-neutral-800 text-neutral-400"
                      }`}>
                        {w.status === "completed" ? "Terminée" : w.status === "abandoned" ? "Annulée" : "En cours"}
                      </span>
                    </div>

                    {sets.length > 0 && (
                      <div className="flex flex-col gap-1.5 pt-3 border-t border-neutral-800">
                        {Object.entries(summary).map(([name, data]) => (
                          <div key={name} className="flex items-center justify-between">
                            <span className="text-xs font-medium text-neutral-400">{name}</span>
                            <span className="text-xs text-green-500/80">{data.details.join(" · ")}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={deleteConfirm !== null}
        title={deleteType === "program" ? "Supprimer le programme" : "Supprimer le template"}
        message={deleteType === "program" ? "Cette action est irréversible." : "Ce template sera supprimé définitivement."}
        confirmLabel="Supprimer"
        danger
        onConfirm={() => { if (!deleteConfirm) return; if (deleteType === "program") confirmDeleteProgram(deleteConfirm); else deleteTemplate(deleteConfirm); }}
        onCancel={() => setDeleteConfirm(null)}
      />

      {saveTemplateConfirm !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => { setSaveTemplateConfirm(null); setTemplateName(""); }} />
          <div className="relative rounded-2xl border border-neutral-800 bg-neutral-900 p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-lg font-bold mb-2">Sauvegarder comme template</h3>
            <p className="text-sm text-neutral-500 mb-4">Nomme ce template réutilisable.</p>
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Nom du template"
              className="w-full rounded-xl border border-neutral-800 bg-neutral-800 px-4 py-3 text-neutral-50 placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-green-500/50 mb-4"
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") saveTemplateConfirm && saveAsTemplate(saveTemplateConfirm); if (e.key === "Escape") { setSaveTemplateConfirm(null); setTemplateName(""); } }}
            />
            <div className="flex gap-2">
              <button onClick={() => { setSaveTemplateConfirm(null); setTemplateName(""); }} className="flex-1 rounded-xl border border-neutral-800 px-4 py-3 text-sm font-semibold text-neutral-500 hover:text-neutral-300 active:scale-95 transition-all">Annuler</button>
              <button onClick={() => saveTemplateConfirm && saveAsTemplate(saveTemplateConfirm)} disabled={!templateName.trim()} className="flex-1 rounded-xl bg-green-500 px-4 py-3 text-sm font-semibold text-neutral-950 shadow-lg shadow-green-500/20 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100">Sauvegarder</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
