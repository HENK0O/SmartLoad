"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useApp } from "@/lib/context";
import { LangFlag } from "@/components/LangFlag";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import ConfirmDialog from "@/components/ConfirmDialog";
import { ListSkeleton } from "@/components/Skeleton";
import { t } from "@/lib/i18n";
import {
  Plus,
  Pencil,
  Trash2,
  Copy,
  History,
  LayoutGrid,
  X,
  ChevronRight,
  Loader2,
  Dumbbell,
  Calendar,
  Sparkles,
  MoreHorizontal,
  Check,
  ArrowRight,
} from "lucide-react";

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

const MAX_PROGRAMS = Infinity;

export default function ProgramsPage() {
  const { user, loading } = useAuth();
  const { lang, setLang } = useApp();
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
  const [templates, setTemplates] = useState<
    { id: string; name: string; description: string | null; exercise_count: number }[]
  >([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [saveTemplateConfirm, setSaveTemplateConfirm] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [expandedWorkout, setExpandedWorkout] = useState<string | null>(null);

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
    const { data } = await supabase
      .from("programs")
      .select("id, name, created_at")
      .order("created_at", { ascending: false });
    if (data) setPrograms(data);
    setLoadingPrograms(false);
  }

  async function loadHistory() {
    const { data } = await supabase
      .from("workouts")
      .select(
        "id, status, started_at, completed_at, programs(name), workout_sets(exercise_id, reps, weight, exercises(name))"
      )
      .order("started_at", { ascending: false });
    if (data) setWorkouts(data as unknown as Workout[]);
    setLoadingHistory(false);
  }

  async function loadUnit() {
    const { data } = await supabase
      .from("profiles")
      .select("unit")
      .eq("id", user!.id)
      .single();
    if (data) setUnit(data.unit as "kg" | "lbs");
  }

  function displayWeight(kg: number): string {
    if (unit === "lbs") return Math.round(kg * 2.20462 * 10) / 10 + " lbs";
    return kg + " kg";
  }

  async function loadTemplates() {
    const { data } = await supabase
      .from("program_templates")
      .select("id, name, description")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false });
    if (data) {
      const withCounts = await Promise.all(
        data.map(async (t) => {
          const { count } = await supabase
            .from("program_template_exercises")
            .select("*", { count: "exact", head: true })
            .eq("template_id", t.id);
          return { ...t, exercise_count: count || 0 };
        })
      );
      setTemplates(withCounts);
    }
    setLoadingTemplates(false);
  }

  async function saveAsTemplate(programId: string) {
    if (!templateName.trim()) return;
    const { data: program } = await supabase
      .from("programs")
      .select("name")
      .eq("id", programId)
      .single();
    const { data: template, error: templateError } = await supabase
      .from("program_templates")
      .insert({
        user_id: user!.id,
        name: templateName.trim(),
        description: `${lang === "en" ? "Based on" : "Basé sur"} "${program?.name}"`,
      })
      .select()
      .single();
    if (templateError) {
      if (templateError.code === "42P01")
        setError(
          `${t("programs_error_template_migration", lang)} ${lang === "en" ? "Run SQL migration 002 in Supabase." : "Exécutez la migration SQL 002 dans Supabase."}`
        );
      else setError(`${t("programs_error", lang)}: ${templateError.message}`);
      setSaveTemplateConfirm(null);
      setTemplateName("");
      return;
    }
    if (!template) {
      setError(t("programs_error_template", lang));
      setSaveTemplateConfirm(null);
      setTemplateName("");
      return;
    }
    const { data: exercises, error: exError } = await supabase
      .from("program_exercises")
      .select(
        "exercise_id, target_sets, target_reps, target_weight, rep_range_min, rep_range_max, sort_order"
      )
      .eq("program_id", programId)
      .order("sort_order");
    if (!exError && exercises) {
      const toInsert = exercises.map((ex) => ({
        template_id: template.id,
        exercise_id: ex.exercise_id,
        target_sets: ex.target_sets,
        target_reps: ex.target_reps,
        target_weight: ex.target_weight,
        rep_range_min: ex.rep_range_min || ex.target_reps,
        rep_range_max: ex.rep_range_max || ex.target_reps + 4,
        sort_order: ex.sort_order,
      }));
      await supabase.from("program_template_exercises").insert(toInsert);
    }
    setSaveTemplateConfirm(null);
    setTemplateName("");
    loadTemplates();
  }

  async function createProgramFromTemplate(templateId: string) {
    if (programs.length >= MAX_PROGRAMS) {
      setError(t("programs_unlimited_msg", lang));
      return;
    }
    const { data: template } = await supabase
      .from("program_templates")
      .select("name")
      .eq("id", templateId)
      .single();
    if (!template) return;
    const { data: program } = await supabase
      .from("programs")
      .insert({ user_id: user!.id, name: template.name })
      .select()
      .single();
    if (!program) return;
    const { data: templateExercises } = await supabase
      .from("program_template_exercises")
      .select(
        "exercise_id, target_sets, target_reps, target_weight, rep_range_min, rep_range_max, sort_order"
      )
      .eq("template_id", templateId)
      .order("sort_order");
    if (templateExercises) {
      const toInsert = templateExercises.map((ex) => ({
        program_id: program.id,
        exercise_id: ex.exercise_id,
        target_sets: ex.target_sets,
        target_reps: ex.target_reps,
        target_weight: ex.target_weight,
        rep_range_min: ex.rep_range_min,
        rep_range_max: ex.rep_range_max,
        sort_order: ex.sort_order,
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
    if (programs.length >= MAX_PROGRAMS) {
      setError(t("programs_unlimited_msg", lang));
      return;
    }
    const { data, error: err } = await supabase
      .from("programs")
      .insert({ user_id: user.id, name: newName.trim() })
      .select()
      .single();
    if (err) {
      setError(t("programs_error_create", lang));
      return;
    }
    if (data) {
      setPrograms([data, ...programs]);
      setNewName("");
      setShowForm(false);
    }
  }

  async function confirmDeleteProgram(id: string) {
    const { error: err } = await supabase.from("programs").delete().eq("id", id);
    if (err) setError(t("programs_error_delete", lang));
    else setPrograms(programs.filter((p) => p.id !== id));
    setDeleteConfirm(null);
  }

  async function renameProgram(id: string) {
    if (!renameValue.trim()) return;
    const { data, error: err } = await supabase
      .from("programs")
      .update({ name: renameValue.trim() })
      .eq("id", id)
      .select()
      .single();
    if (err) {
      setError(t("programs_error_rename", lang));
      return;
    }
    if (data) {
      setPrograms(programs.map((p) => (p.id === id ? data : p)));
      setRenamingId(null);
      setRenameValue("");
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString(lang === "en" ? "en-US" : "fr-FR", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (loading || !user)
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--primary))]" />
          <p className="text-sm text-[hsl(var(--muted-foreground))]">{t("programs_loading", lang)}</p>
        </div>
      </main>
    );

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: "programs", label: t("programs_tab_programs", lang), icon: LayoutGrid },
    { key: "templates", label: t("programs_tab_templates", lang), icon: Copy },
    { key: "history", label: t("programs_tab_history", lang), icon: History },
  ];

  return (
    <main className="flex min-h-screen flex-col px-4 py-5 pb-28 animate-fade-in max-w-2xl mx-auto w-full relative">
      {/* Language switcher - top right */}
      <button
        onClick={() => setLang(lang === "fr" ? "en" : "fr")}
        className="absolute top-0 right-0 z-30 p-2 rounded-xl active:scale-95 transition-all md:right-0 md:top-1"
        style={{ backgroundColor: "hsl(220 15% 9%)", border: "1px solid hsl(220 15% 14%)" }}
      >
        <LangFlag lang={lang} size={20} />
      </button>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3 pr-12 md:pr-0">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, hsl(var(--primary)), hsl(142 71% 35%))",
              boxShadow: "0 4px 16px hsl(var(--primary-glow))",
            }}
          >
            <Dumbbell className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[hsl(var(--foreground))]">
              SmartLoad
            </h1>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              {programs.length} {lang === "en" ? (programs.length !== 1 ? "programs" : "program") : (programs.length > 1 ? "programmes" : "programme")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/workout"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all active:scale-95"
            style={{
              background: "linear-gradient(135deg, hsl(var(--primary)), hsl(142 71% 35%))",
              boxShadow: "0 4px 16px hsl(var(--primary-glow))",
            }}
          >
            <Plus className="h-4 w-4" />
            {t("programs_session", lang)}
          </Link>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div
          className="mb-5 rounded-2xl border border-[hsl(var(--destructive))/20] p-4 flex items-center justify-between animate-slide-down"
          style={{ backgroundColor: "hsl(var(--destructive) / 0.08)" }}
        >
          <p className="text-sm text-[hsl(var(--destructive))]">{error}</p>
          <button
            onClick={() => setError(null)}
            className="ml-3 p-1.5 rounded-lg text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive))/10] active:scale-95 transition-all"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Tab bar */}
      <div
        className="flex gap-1 mb-6 rounded-2xl p-1.5"
        style={{
          backgroundColor: "hsl(var(--secondary))",
          border: "1px solid hsl(var(--border))",
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 active:scale-95 ${
              activeTab === tab.key
                ? "text-white shadow-lg"
                : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
            }`}
            style={
              activeTab === tab.key
                ? {
                    background: "linear-gradient(135deg, hsl(var(--primary)), hsl(142 71% 35%))",
                    boxShadow: "0 4px 16px hsl(var(--primary-glow))",
                  }
                : undefined
            }
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Programs Tab */}
      {activeTab === "programs" && (
        <div className="flex flex-col gap-3">
          {loadingPrograms ? (
            <ListSkeleton count={3} />
          ) : (
            <>
              {programs.length === 0 && !showForm && (
                <div
                  className="text-center py-16 rounded-2xl border border-dashed animate-fade-in"
                  style={{ borderColor: "hsl(var(--border))" }}
                >
                  <div
                    className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                    style={{ backgroundColor: "hsl(var(--primary) / 0.1)" }}
                  >
                    <Dumbbell className="h-7 w-7 text-[hsl(var(--primary))]" />
                  </div>
                  <p className="text-[hsl(var(--muted-foreground))] mb-1">
                    {t("programs_none", lang)}
                  </p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] opacity-60">
                    {t("programs_empty_desc", lang)}
                  </p>
                </div>
              )}

              {programs.map((p, i) => (
                <div
                  key={p.id}
                  className="group rounded-2xl border p-4 transition-all duration-200 animate-slide-up stagger-1"
                  style={{
                    backgroundColor: "hsl(var(--card))",
                    borderColor: "hsl(var(--card-border))",
                    animationDelay: `${i * 50}ms`,
                  }}
                >
                  {renamingId === p.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        className="flex-1 rounded-xl border px-4 py-3 text-sm bg-[hsl(var(--input))] text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))/50] transition-all"
                        style={{ borderColor: "hsl(var(--border))" }}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") renameProgram(p.id);
                          if (e.key === "Escape") setRenamingId(null);
                        }}
                      />
                      <button
                        onClick={() => renameProgram(p.id)}
                        className="p-3 rounded-xl text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))/10] active:scale-95 transition-all"
                      >
                        <Check className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => setRenamingId(null)}
                        className="p-3 rounded-xl text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))/20] active:scale-95 transition-all"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <Link
                        href={`/programs/${p.id}`}
                        className="flex items-center gap-3 flex-1 min-w-0 py-1 active:scale-[0.98] transition-transform"
                      >
                        <div
                          className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center"
                          style={{
                            background:
                              "linear-gradient(135deg, hsl(var(--primary) / 0.15), hsl(var(--primary) / 0.05))",
                          }}
                        >
                          <Dumbbell className="h-5 w-5 text-[hsl(var(--primary))]" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-[hsl(var(--foreground))] truncate">
                            {p.name}
                          </p>
                          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                            {new Date(p.created_at).toLocaleDateString(lang === "en" ? "en-US" : "fr-FR", {
                              day: "numeric",
                              month: "short",
                            })}
                          </p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-[hsl(var(--muted-foreground))] ml-auto flex-shrink-0" />
                      </Link>
                      <div className="flex items-center gap-0.5 ml-2">
                        <button
                          onClick={() => {
                            setRenamingId(p.id);
                            setRenameValue(p.name);
                          }}
                          className="p-2.5 rounded-xl text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))/15] active:scale-95 transition-all"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSaveTemplateConfirm(p.id);
                            setTemplateName(p.name);
                          }}
                          className="p-2.5 rounded-xl text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))/10] active:scale-95 transition-all"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setDeleteConfirm(p.id);
                            setDeleteType("program");
                          }}
                          className="p-2.5 rounded-xl text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive))/10] active:scale-95 transition-all"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {showForm ? (
                <div
                  className="rounded-2xl border p-5 animate-scale-in"
                  style={{
                    backgroundColor: "hsl(var(--card))",
                    borderColor: "hsl(var(--card-border))",
                  }}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="h-5 w-5 text-[hsl(var(--primary))]" />
                    <h3 className="font-semibold text-[hsl(var(--foreground))]">
                      {t("programs_new", lang)}
                    </h3>
                  </div>
                  <input
                    type="text"
                    placeholder={t("programs_new_placeholder", lang)}
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full rounded-xl border px-4 py-3.5 text-sm bg-[hsl(var(--input))] text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))/50] transition-all mb-4"
                    style={{ borderColor: "hsl(var(--border))" }}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") createProgram();
                      if (e.key === "Escape") {
                        setShowForm(false);
                        setNewName("");
                      }
                    }}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={createProgram}
                      disabled={!newName.trim()}
                      className="flex-1 rounded-xl px-6 py-3.5 font-semibold text-white shadow-lg active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100"
                      style={{
                        background:
                          "linear-gradient(135deg, hsl(var(--primary)), hsl(142 71% 35%))",
                        boxShadow: "0 4px 16px hsl(var(--primary-glow))",
                      }}
                    >
                      {t("programs_create", lang)}
                    </button>
                    <button
                      onClick={() => {
                        setShowForm(false);
                        setNewName("");
                      }}
                      className="rounded-xl border px-6 py-3.5 text-sm font-semibold text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] active:scale-95 transition-all"
                      style={{ borderColor: "hsl(var(--border))" }}
                    >
                      {t("programs_cancel", lang)}
                    </button>
                  </div>
                </div>
              ) : programs.length < MAX_PROGRAMS ? (
                <button
                  onClick={() => setShowForm(true)}
                  className="w-full rounded-2xl border border-dashed px-6 py-5 text-center text-sm font-medium text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] active:scale-[0.98] transition-all"
                  style={{
                    borderColor: "hsl(var(--border))",
                    backgroundColor: "hsl(var(--card) / 0.5)",
                  }}
                >
                  <Plus className="h-5 w-5 inline mr-1.5 -mt-0.5" />
                  {t("programs_new", lang)}
                </button>
              ) : (
                <div
                  className="text-center py-4 rounded-2xl animate-fade-in"
                  style={{
                    backgroundColor: "hsl(var(--primary) / 0.05)",
                    border: "1px solid hsl(var(--primary) / 0.1)",
                  }}
                >
                  <p className="text-xs text-[hsl(var(--primary))] font-medium">
                    {t("programs_unlimited_msg", lang)}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === "templates" && (
        <div className="flex flex-col gap-3">
          {loadingTemplates ? (
            <ListSkeleton count={3} />
          ) : (
            <>
              {templates.length === 0 && (
                <div
                  className="text-center py-16 rounded-2xl border border-dashed animate-fade-in"
                  style={{ borderColor: "hsl(var(--border))" }}
                >
                  <div
                    className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                    style={{ backgroundColor: "hsl(var(--primary) / 0.1)" }}
                  >
                    <Copy className="h-7 w-7 text-[hsl(var(--primary))]" />
                  </div>
                  <p className="text-[hsl(var(--muted-foreground))] mb-1">
                    {t("programs_no_templates", lang)}
                  </p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] opacity-60">
                    {t("programs_no_templates_desc", lang)}
                  </p>
                </div>
              )}

              {templates.map((tmpl, i) => (
                <div
                  key={tmpl.id}
                  className="rounded-2xl border p-4 animate-slide-up"
                  style={{
                    backgroundColor: "hsl(var(--card))",
                    borderColor: "hsl(var(--card-border))",
                    animationDelay: `${i * 50}ms`,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center"
                      style={{
                        background:
                          "linear-gradient(135deg, hsl(var(--primary) / 0.15), hsl(var(--primary) / 0.05))",
                      }}
                    >
                      <Sparkles className="h-5 w-5 text-[hsl(var(--primary))]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[hsl(var(--foreground))] truncate">
                        {tmpl.name}
                      </p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                        {tmpl.exercise_count} {tmpl.exercise_count > 1 ? t("programs_exercises", lang) : t("programs_exercise", lang)}
                        {tmpl.description && (
                          <span className="text-[hsl(var(--muted))]">
                            {" "}
                            · {tmpl.description}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => createProgramFromTemplate(tmpl.id)}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-white active:scale-95 transition-all"
                        style={{
                          background:
                            "linear-gradient(135deg, hsl(var(--primary)), hsl(142 71% 35%))",
                          boxShadow: "0 2px 8px hsl(var(--primary-glow))",
                        }}
                      >
                        {t("programs_use", lang)}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setDeleteConfirm(tmpl.id);
                          setDeleteType("template");
                        }}
                        className="p-2.5 rounded-xl text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive))/10] active:scale-95 transition-all"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* History Tab */}
      {activeTab === "history" && (
        <div className="flex flex-col gap-3">
          {loadingHistory ? (
            <ListSkeleton count={3} />
          ) : workouts.length === 0 ? (
            <div
              className="text-center py-16 rounded-2xl border border-dashed animate-fade-in"
              style={{ borderColor: "hsl(var(--border))" }}
            >
              <div
                className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                style={{ backgroundColor: "hsl(var(--muted) / 0.1)" }}
              >
                <Calendar className="h-7 w-7 text-[hsl(var(--muted-foreground))]" />
              </div>
              <p className="text-[hsl(var(--muted-foreground))]">
                {t("programs_no_history", lang)}
              </p>
            </div>
          ) : (
            workouts.map((w, i) => {
              const sets = w.workout_sets || [];
              const summary: Record<
                string,
                { totalSets: number; details: string[] }
              > = {};
              for (const s of sets) {
                const name =
                  (s.exercises as { name: string })?.name ?? (lang === "en" ? "Exercise" : "Exercice");
                if (!summary[name]) summary[name] = { totalSets: 0, details: [] };
                summary[name].totalSets++;
                const wt =
                  unit === "lbs"
                    ? Math.round(s.weight * 2.20462 * 10) / 10
                    : s.weight;
                const u = unit === "lbs" ? "lbs" : "kg";
                summary[name].details.push(`${s.reps}×${wt} ${u}`);
              }

              const isExpanded = expandedWorkout === w.id;

              return (
                <div
                  key={w.id}
                  className="rounded-2xl border overflow-hidden animate-slide-up"
                  style={{
                    backgroundColor: "hsl(var(--card))",
                    borderColor: "hsl(var(--card-border))",
                    animationDelay: `${i * 50}ms`,
                  }}
                >
                  <Link
                    href={`/workout/${w.id}`}
                    className="block p-4 active:scale-[0.98] transition-transform"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center"
                          style={{
                            background:
                              w.status === "completed"
                                ? "linear-gradient(135deg, hsl(var(--primary) / 0.15), hsl(var(--primary) / 0.05))"
                                : w.status === "abandoned"
                                ? "linear-gradient(135deg, hsl(var(--destructive) / 0.15), hsl(var(--destructive) / 0.05))"
                                : "hsl(var(--muted) / 0.1)",
                          }}
                        >
                          <Dumbbell
                            className="h-5 w-5"
                            style={{
                              color:
                                w.status === "completed"
                                  ? "hsl(var(--primary))"
                                  : w.status === "abandoned"
                                  ? "hsl(var(--destructive))"
                                  : "hsl(var(--muted-foreground))",
                            }}
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-[hsl(var(--foreground))] truncate">
                            {w.programs?.name ?? t("programs_free_session", lang)}
                          </p>
                          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                            {formatDate(w.started_at)}
                          </p>
                        </div>
                      </div>
                      <span
                        className="text-[10px] font-semibold px-3 py-1.5 rounded-full flex-shrink-0 ml-2"
                        style={
                          w.status === "completed"
                            ? {
                                backgroundColor: "hsl(var(--primary) / 0.1)",
                                color: "hsl(var(--primary))",
                              }
                            : w.status === "abandoned"
                            ? {
                                backgroundColor: "hsl(var(--destructive) / 0.1)",
                                color: "hsl(var(--destructive))",
                              }
                            : {
                                backgroundColor: "hsl(var(--muted) / 0.15)",
                                color: "hsl(var(--muted-foreground))",
                              }
                        }
                      >
                        {w.status === "completed"
                          ? t("programs_completed", lang)
                          : w.status === "abandoned"
                          ? t("programs_abandoned", lang)
                          : t("programs_in_progress", lang)}
                      </span>
                    </div>

                    {sets.length > 0 && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          setExpandedWorkout(isExpanded ? null : w.id);
                        }}
                        className="w-full flex items-center justify-between pt-3 mt-2 text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
                        style={{ borderTop: "1px solid hsl(var(--border))" }}
                      >
                        <span>
                          {sets.length} {sets.length > 1 ? t("programs_series_pl", lang) : t("programs_series", lang)} ·{" "}
                          {Object.keys(summary).length} {Object.keys(summary).length > 1 ? t("programs_exercises", lang) : t("programs_exercise", lang)}
                        </span>
                        <ChevronRight
                          className={`h-4 w-4 transition-transform duration-200 ${
                            isExpanded ? "rotate-90" : ""
                          }`}
                        />
                      </button>
                    )}
                  </Link>

                  {isExpanded && sets.length > 0 && (
                    <div
                      className="px-4 pb-4 animate-slide-down"
                      style={{ borderTop: "1px solid hsl(var(--border))" }}
                    >
                      <div className="flex flex-col gap-2 pt-3">
                        {Object.entries(summary).map(([name, data]) => (
                          <div
                            key={name}
                            className="flex items-center justify-between py-2 px-3 rounded-xl"
                            style={{ backgroundColor: "hsl(var(--secondary))" }}
                          >
                            <span className="text-xs font-medium text-[hsl(var(--foreground))]">
                              {name}
                            </span>
                            <span className="text-xs font-semibold text-[hsl(var(--primary))]">
                              {data.details.join(" · ")}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        open={deleteConfirm !== null}
        title={
          deleteType === "program"
            ? t("programs_delete_program", lang)
            : t("programs_delete_template", lang)
        }
        description={
          deleteType === "program"
            ? `${t("programs_delete_desc", lang)} ${lang === "en" ? "All associated data will be lost." : "Toutes les données associées seront perdues."}`
            : t("programs_delete_template_desc", lang)
        }
        confirmLabel={t("programs_delete_confirm", lang)}
        danger
        onConfirm={() => {
          if (!deleteConfirm) return;
          if (deleteType === "program") confirmDeleteProgram(deleteConfirm);
          else deleteTemplate(deleteConfirm);
        }}
        onCancel={() => setDeleteConfirm(null)}
      />

      {/* Save as template modal */}
      {saveTemplateConfirm !== null && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 animate-fade-in">
          <div
            className="absolute inset-0"
            style={{
              backgroundColor: "hsl(220 15% 6% / 0.8)",
              backdropFilter: "blur(8px)",
            }}
            onClick={() => {
              setSaveTemplateConfirm(null);
              setTemplateName("");
            }}
          />
          <div
            className="relative rounded-2xl border w-full max-w-sm p-6 animate-scale-in"
            style={{
              backgroundColor: "hsl(var(--card))",
              borderColor: "hsl(var(--card-border))",
              boxShadow: "0 24px 48px hsl(0 0% 0% / 0.4)",
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-5 w-5 text-[hsl(var(--primary))]" />
              <h3 className="text-lg font-bold text-[hsl(var(--foreground))]">
                {t("programs_save_template", lang)}
              </h3>
            </div>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mb-5">
              {t("programs_save_template_desc", lang)}
            </p>
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder={t("programs_template_name", lang)}
              className="w-full rounded-xl border px-4 py-3.5 text-sm bg-[hsl(var(--input))] text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))/50] transition-all mb-5"
              style={{ borderColor: "hsl(var(--border))" }}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter")
                  saveTemplateConfirm && saveAsTemplate(saveTemplateConfirm);
                if (e.key === "Escape") {
                  setSaveTemplateConfirm(null);
                  setTemplateName("");
                }
              }}
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setSaveTemplateConfirm(null);
                  setTemplateName("");
                }}
                className="flex-1 rounded-xl border px-4 py-3.5 text-sm font-semibold text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] active:scale-95 transition-all"
                style={{ borderColor: "hsl(var(--border))" }}
              >
                {t("programs_cancel", lang)}
              </button>
              <button
                onClick={() =>
                  saveTemplateConfirm && saveAsTemplate(saveTemplateConfirm)
                }
                disabled={!templateName.trim()}
                className="flex-1 rounded-xl px-4 py-3.5 text-sm font-semibold text-white shadow-lg active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100"
                style={{
                  background:
                    "linear-gradient(135deg, hsl(var(--primary)), hsl(142 71% 35%))",
                  boxShadow: "0 4px 16px hsl(var(--primary-glow))",
                }}
              >
                {t("programs_save", lang)}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
