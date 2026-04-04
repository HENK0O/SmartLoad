"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { LogOut, Check, Scale, User, CreditCard, Sun, Moon, ChevronRight, Volume2, VolumeX, Globe, Download, Bug, Info, Timer, ArrowLeft, Save, X } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { useApp } from "@/lib/context";
import { LangFlag } from "@/components/LangFlag";
import { t } from "@/lib/i18n";

export default function SettingsPage() {
  const { user, loading, signOut } = useAuth();
  const { lang, setLang } = useApp();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const [unit, setUnit] = useState<"kg" | "lbs">("kg");
  const [restTime, setRestTime] = useState(90);
  const [restTimeInput, setRestTimeInput] = useState("90");
  const [timerSound, setTimerSound] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [profileWeight, setProfileWeight] = useState("");
  const [profileHeight, setProfileHeight] = useState("");
  const [profileAge, setProfileAge] = useState("");
  const [profileGoal, setProfileGoal] = useState("");

  useEffect(() => { if (!loading && !user) router.push("/login"); }, [user, loading, router]);
  useEffect(() => { if (!user) return; loadSettings(); }, [user]);

  async function loadSettings() {
    const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).single();
    if (data) {
      if (data.unit) setUnit(data.unit as "kg" | "lbs");
      if (data.rest_time) { setRestTime(data.rest_time); setRestTimeInput(String(data.rest_time)); }
      if (data.timer_sound !== null && data.timer_sound !== undefined) setTimerSound(data.timer_sound);
      if (data.lang) setLang(data.lang);
      if (data.weight) setProfileWeight(String(data.weight));
      if (data.height) setProfileHeight(String(data.height));
      if (data.age) setProfileAge(String(data.age));
      if (data.goal) setProfileGoal(data.goal);
    }
  }

  async function saveSetting(key: string, value: unknown) {
    await supabase.from("profiles").update({ [key]: value }).eq("id", user!.id);
  }

  async function saveUnit(newUnit: "kg" | "lbs") {
    setUnit(newUnit);
    setSaving(true);
    const factor = newUnit === "lbs" ? 2.20462 : 1 / 2.20462;
    const { data: programs } = await supabase.from("programs").select("id").eq("user_id", user!.id);
    if (programs) {
      const programIds = programs.map((p) => p.id);
      const { data: peList } = await supabase.from("program_exercises").select("id, target_weight").in("program_id", programIds);
      if (peList) for (const pe of peList) { const newWeight = Math.round(pe.target_weight * factor * 10) / 10; await supabase.from("program_exercises").update({ target_weight: newWeight }).eq("id", pe.id); }
      const { data: workouts } = await supabase.from("workouts").select("id").eq("user_id", user!.id);
      if (workouts) {
        const workoutIds = workouts.map((w) => w.id);
        const { data: sets } = await supabase.from("workout_sets").select("id, weight").in("workout_id", workoutIds);
        if (sets) for (const s of sets) { const newWeight = Math.round(s.weight * factor * 10) / 10; await supabase.from("workout_sets").update({ weight: newWeight }).eq("id", s.id); }
      }
    }
    await supabase.from("profiles").update({ unit: newUnit }).eq("id", user!.id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function saveRestTime(val: number) {
    setRestTime(val);
    setRestTimeInput(String(val));
    await saveSetting("rest_time", val);
  }

  async function toggleTimerSound() {
    const newVal = !timerSound;
    setTimerSound(newVal);
    await saveSetting("timer_sound", newVal);
  }

  async function saveLang(val: "fr" | "en") {
    setLang(val);
    const newUnit = val === "fr" ? "kg" : "lbs";
    if (newUnit !== unit) {
      setUnit(newUnit);
      await supabase.from("profiles").update({ unit: newUnit }).eq("id", user!.id);
    }
    await saveSetting("lang", val);
  }

  async function saveProfile() {
    await supabase.from("profiles").update({
      weight: profileWeight ? parseFloat(profileWeight) : null,
      height: profileHeight ? parseFloat(profileHeight) : null,
      age: profileAge ? parseInt(profileAge) : null,
      goal: profileGoal || null,
    }).eq("id", user!.id);
    setShowProfile(false);
  }

  function exportCSV() {
    const header = lang === "en" ? "Date,Program,Exercise,Sets,Reps,Weight" : "Date,Programme,Exercice,Séries,Reps,Poids";
    const link = document.createElement("a");
    link.href = `data:text/csv;charset=utf-8,${header}\n`;
    link.download = `smartload_export_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  }

  async function handleSignOut() { await signOut(); router.push("/login"); }

  if (loading || !user) return <p className="p-6">{t("programs_loading", lang)}</p>;

  if (showProfile) {
    return (
      <main className="flex min-h-screen flex-col p-4 pb-24 animate-fade-in">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setShowProfile(false)} className="p-2 rounded-xl active:scale-95 transition-all" style={{ backgroundColor: "hsl(220 15% 9%)" }}>
            <ArrowLeft className="h-5 w-5 text-white/60" />
          </button>
          <h1 className="text-xl font-bold text-white">{t("settings_profile", lang)}</h1>
        </div>

        <div className="flex flex-col gap-4">
          {[
            { label: t("settings_weight", lang), value: profileWeight, set: setProfileWeight, placeholder: lang === "en" ? "e.g. 75" : "ex: 75", type: "number" },
            { label: t("settings_height", lang), value: profileHeight, set: setProfileHeight, placeholder: lang === "en" ? "e.g. 180" : "ex: 180", type: "number" },
            { label: t("settings_age", lang), value: profileAge, set: setProfileAge, placeholder: lang === "en" ? "e.g. 25" : "ex: 25", type: "number" },
          ].map((field) => (
            <div key={field.label}>
              <label className="text-sm font-medium text-white/70 mb-1 block">{field.label}</label>
              <input type={field.type} value={field.value} onChange={(e) => field.set(e.target.value)} placeholder={field.placeholder} className="w-full rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none transition-all" style={{ backgroundColor: "hsl(220 15% 9%)", border: "1px solid hsl(220 15% 14%)" }} onFocus={(e) => (e.currentTarget.style.borderColor = "hsl(142 71% 45% / 0.5)")} onBlur={(e) => (e.currentTarget.style.borderColor = "hsl(220 15% 14%)")} />
            </div>
          ))}

          <div>
            <label className="text-sm font-medium text-white/70 mb-1 block">{t("settings_goal", lang)}</label>
            <select value={profileGoal} onChange={(e) => setProfileGoal(e.target.value)} className="w-full rounded-xl px-4 py-3 text-white focus:outline-none transition-all appearance-none" style={{ backgroundColor: "hsl(220 15% 9%)", border: "1px solid hsl(220 15% 14%)" }}>
              <option value="">{t("settings_goal_select", lang)}</option>
              <option value="prise_masse">{t("settings_goal_mass", lang)}</option>
              <option value="seche">{t("settings_goal_cut", lang)}</option>
              <option value="force">{t("settings_goal_strength", lang)}</option>
              <option value="maintenance">{t("settings_goal_maintenance", lang)}</option>
            </select>
          </div>

          <div className="flex gap-2 pt-2">
            <button onClick={saveProfile} className="flex-1 rounded-xl px-6 py-3 text-sm font-semibold text-white active:scale-95 transition-all flex items-center justify-center gap-2" style={{ background: "linear-gradient(135deg, hsl(142 71% 45%), hsl(142 71% 35%))", boxShadow: "0 4px 12px hsl(142 71% 45% / 0.25)" }}>
              <Save className="h-4 w-4" />
              {t("settings_save", lang)}
            </button>
            <button onClick={() => setShowProfile(false)} className="rounded-xl px-6 py-3 text-sm active:scale-95 transition-all" style={{ backgroundColor: "hsl(220 15% 9%)", border: "1px solid hsl(220 15% 14%)", color: "hsl(220 15% 50%)" }}>
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </main>
    );
  }

  const goalLabel = (goal: string) => {
    if (goal === "prise_masse") return t("settings_goal_mass", lang);
    if (goal === "seche") return t("settings_goal_cut", lang);
    if (goal === "force") return t("settings_goal_strength", lang);
    return t("settings_goal_maintenance", lang);
  };

  return (
    <main className="flex min-h-screen flex-col p-4 pb-24 animate-fade-in">
      <h1 className="text-2xl font-bold tracking-tight mb-6">{t("settings_title", lang)}</h1>

      <div className="flex flex-col gap-3">
        {/* Profile */}
        <button onClick={() => setShowProfile(true)} className="w-full rounded-2xl p-4 text-left flex items-center justify-between active:scale-[0.98] transition-all animate-slide-up" style={{ backgroundColor: "hsl(220 15% 9%)", border: "1px solid hsl(220 15% 14%)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "hsl(142 71% 45% / 0.15)" }}>
              <User className="h-5 w-5" style={{ color: "hsl(142 71% 45%)" }} />
            </div>
            <div>
              <p className="font-semibold text-sm text-white">{t("settings_profile", lang)}</p>
              <p className="text-xs" style={{ color: "hsl(220 15% 40%)" }}>{t("settings_profile_desc", lang)}</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4" style={{ color: "hsl(220 15% 30%)" }} />
        </button>

        {/* Profile info summary */}
        {(profileWeight || profileHeight || profileAge || profileGoal) && (
          <div className="rounded-2xl p-4 animate-slide-up stagger-1" style={{ backgroundColor: "hsl(220 15% 9%)", border: "1px solid hsl(220 15% 14%)" }}>
            <div className="grid grid-cols-2 gap-3">
              {profileWeight && <div><p className="text-[10px]" style={{ color: "hsl(220 15% 35%)" }}>{lang === "en" ? "Weight" : "Poids"}</p><p className="text-sm font-semibold text-white">{profileWeight} {unit}</p></div>}
              {profileHeight && <div><p className="text-[10px]" style={{ color: "hsl(220 15% 35%)" }}>{lang === "en" ? "Height" : "Taille"}</p><p className="text-sm font-semibold text-white">{profileHeight} cm</p></div>}
              {profileAge && <div><p className="text-[10px]" style={{ color: "hsl(220 15% 35%)" }}>{lang === "en" ? "Age" : "Âge"}</p><p className="text-sm font-semibold text-white">{profileAge} {lang === "en" ? "yrs" : "ans"}</p></div>}
              {profileGoal && <div><p className="text-[10px]" style={{ color: "hsl(220 15% 35%)" }}>{t("settings_goal", lang)}</p><p className="text-sm font-semibold text-white">{goalLabel(profileGoal)}</p></div>}
            </div>
          </div>
        )}

        {/* Theme */}
        <div className="rounded-2xl p-4 animate-slide-up stagger-2" style={{ backgroundColor: "hsl(220 15% 9%)", border: "1px solid hsl(220 15% 14%)" }}>
          <div className="flex items-center gap-2 mb-3">
            {theme === "dark" ? <Moon className="h-4 w-4" style={{ color: "hsl(220 15% 50%)" }} /> : <Sun className="h-4 w-4" style={{ color: "hsl(220 15% 50%)" }} />}
            <h2 className="text-sm font-semibold text-white">{t("settings_appearance", lang)}</h2>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setTheme("dark")} className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold active:scale-95 transition-all`}
              style={theme === "dark" ? { background: "linear-gradient(135deg, hsl(142 71% 45%), hsl(142 71% 35%))", boxShadow: "0 4px 12px hsl(142 71% 45% / 0.25)", color: "white" } : { backgroundColor: "hsl(220 15% 11%)", border: "1px solid hsl(220 15% 16%)", color: "hsl(220 15% 60%)" }}>
              {t("settings_dark", lang)}
            </button>
            <button onClick={() => setTheme("light")} className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold active:scale-95 transition-all`}
              style={theme === "light" ? { background: "linear-gradient(135deg, hsl(142 71% 45%), hsl(142 71% 35%))", boxShadow: "0 4px 12px hsl(142 71% 45% / 0.25)", color: "white" } : { backgroundColor: "hsl(220 15% 11%)", border: "1px solid hsl(220 15% 16%)", color: "hsl(220 15% 60%)" }}>
              {t("settings_light", lang)}
            </button>
          </div>
        </div>

        {/* Unit */}
        <div className="rounded-2xl p-4 animate-slide-up stagger-3" style={{ backgroundColor: "hsl(220 15% 9%)", border: "1px solid hsl(220 15% 14%)" }}>
          <div className="flex items-center gap-2 mb-3">
            <Scale className="h-4 w-4" style={{ color: "hsl(220 15% 50%)" }} />
            <h2 className="text-sm font-semibold text-white">{t("settings_unit", lang)}</h2>
          </div>
          <div className="flex gap-2">
            <button onClick={() => saveUnit("kg")} disabled={saving} className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold active:scale-95 transition-all`}
              style={unit === "kg" ? { background: "linear-gradient(135deg, hsl(142 71% 45%), hsl(142 71% 35%))", boxShadow: "0 4px 12px hsl(142 71% 45% / 0.25)", color: "white" } : { backgroundColor: "hsl(220 15% 11%)", border: "1px solid hsl(220 15% 16%)", color: "hsl(220 15% 60%)" }}>
              kg
            </button>
            <button onClick={() => saveUnit("lbs")} disabled={saving} className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold active:scale-95 transition-all`}
              style={unit === "lbs" ? { background: "linear-gradient(135deg, hsl(142 71% 45%), hsl(142 71% 35%))", boxShadow: "0 4px 12px hsl(142 71% 45% / 0.25)", color: "white" } : { backgroundColor: "hsl(220 15% 11%)", border: "1px solid hsl(220 15% 16%)", color: "hsl(220 15% 60%)" }}>
              lbs
            </button>
          </div>
          {saved && <p className="text-xs mt-2 flex items-center gap-1" style={{ color: "hsl(142 71% 45%)" }}><Check className="h-3 w-3" />{t("settings_saved", lang)}</p>}
        </div>

        {/* Rest time */}
        <div className="rounded-2xl p-4 animate-slide-up stagger-4" style={{ backgroundColor: "hsl(220 15% 9%)", border: "1px solid hsl(220 15% 14%)" }}>
          <div className="flex items-center gap-2 mb-3">
            <Timer className="h-4 w-4" style={{ color: "hsl(220 15% 50%)" }} />
            <h2 className="text-sm font-semibold text-white">{t("settings_rest", lang)}</h2>
          </div>
          <div className="flex gap-2 mb-2">
            <input
              type="number"
              value={restTimeInput}
              onChange={(e) => setRestTimeInput(e.target.value)}
              onBlur={() => { const v = parseInt(restTimeInput); if (v > 0) saveRestTime(v); }}
              placeholder={t("settings_rest_placeholder", lang)}
              className="flex-1 rounded-xl px-4 py-2.5 text-center text-sm text-white placeholder:text-white/20 focus:outline-none transition-all"
              style={{ backgroundColor: "hsl(220 15% 11%)", border: "1px solid hsl(220 15% 16%)" }}
            />
            <button onClick={() => { const v = parseInt(restTimeInput); if (v > 0) saveRestTime(v); }} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white active:scale-95 transition-all" style={{ background: "linear-gradient(135deg, hsl(142 71% 45%), hsl(142 71% 35%))", boxShadow: "0 4px 12px hsl(142 71% 45% / 0.25)" }}>
              OK
            </button>
          </div>
          <p className="text-[10px]" style={{ color: "hsl(220 15% 35%)" }}>{t("settings_rest_current", lang)} : {restTime >= 60 ? `${Math.floor(restTime / 60)}:${(restTime % 60).toString().padStart(2, "0")}` : `${restTime}s`}</p>
        </div>

        {/* Timer sound */}
        <button onClick={toggleTimerSound} className="w-full rounded-2xl p-4 text-left flex items-center justify-between active:scale-[0.98] transition-all animate-slide-up stagger-5" style={{ backgroundColor: "hsl(220 15% 9%)", border: "1px solid hsl(220 15% 14%)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: timerSound ? "hsl(142 71% 45% / 0.15)" : "hsl(220 15% 14%)" }}>
              {timerSound ? <Volume2 className="h-5 w-5" style={{ color: "hsl(142 71% 45%)" }} /> : <VolumeX className="h-5 w-5" style={{ color: "hsl(220 15% 40%)" }} />}
            </div>
            <div>
              <p className="font-semibold text-sm text-white">{t("settings_timer_sound", lang)}</p>
              <p className="text-xs" style={{ color: "hsl(220 15% 40%)" }}>{timerSound ? t("settings_sound_on", lang) : t("settings_sound_off", lang)}</p>
            </div>
          </div>
          <div className={`w-11 h-6 rounded-full relative transition-all`} style={{ backgroundColor: timerSound ? "hsl(142 71% 45%)" : "hsl(220 15% 20%)" }}>
            <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all`} style={{ left: timerSound ? "22px" : "2px" }} />
          </div>
        </button>

        {/* Language */}
        <div className="rounded-2xl p-4 animate-slide-up stagger-5" style={{ backgroundColor: "hsl(220 15% 9%)", border: "1px solid hsl(220 15% 14%)" }}>
          <div className="flex items-center gap-2 mb-3">
            <Globe className="h-4 w-4" style={{ color: "hsl(220 15% 50%)" }} />
            <h2 className="text-sm font-semibold text-white">{t("settings_lang", lang)}</h2>
          </div>
          <div className="flex gap-2">
            <button onClick={() => saveLang("fr")} className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold active:scale-95 transition-all flex items-center justify-center gap-2`}
              style={lang === "fr" ? { background: "linear-gradient(135deg, hsl(142 71% 45%), hsl(142 71% 35%))", boxShadow: "0 4px 12px hsl(142 71% 45% / 0.25)", color: "white" } : { backgroundColor: "hsl(220 15% 11%)", border: "1px solid hsl(220 15% 16%)", color: "hsl(220 15% 60%)" }}>
              FR <LangFlag lang="fr" size={16} />
            </button>
            <button onClick={() => saveLang("en")} className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold active:scale-95 transition-all flex items-center justify-center gap-2`}
              style={lang === "en" ? { background: "linear-gradient(135deg, hsl(142 71% 45%), hsl(142 71% 35%))", boxShadow: "0 4px 12px hsl(142 71% 45% / 0.25)", color: "white" } : { backgroundColor: "hsl(220 15% 11%)", border: "1px solid hsl(220 15% 16%)", color: "hsl(220 15% 60%)" }}>
              EN <LangFlag lang="en" size={16} />
            </button>
          </div>
        </div>

        {/* Export */}
        <button onClick={exportCSV} className="w-full rounded-2xl p-4 text-left flex items-center justify-between active:scale-[0.98] transition-all animate-slide-up stagger-6" style={{ backgroundColor: "hsl(220 15% 9%)", border: "1px solid hsl(220 15% 14%)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "hsl(199 89% 48% / 0.15)" }}>
              <Download className="h-5 w-5" style={{ color: "hsl(199 89% 48%)" }} />
            </div>
            <div>
              <p className="font-semibold text-sm text-white">{t("settings_export", lang)}</p>
              <p className="text-xs" style={{ color: "hsl(220 15% 40%)" }}>{t("settings_export_desc", lang)}</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4" style={{ color: "hsl(220 15% 30%)" }} />
        </button>

        {/* Report bug */}
        <a href="mailto:contact@smartload.app?subject=Bug%20SmartLoad" className="w-full rounded-2xl p-4 text-left flex items-center justify-between active:scale-[0.98] transition-all animate-slide-up stagger-6" style={{ backgroundColor: "hsl(220 15% 9%)", border: "1px solid hsl(220 15% 14%)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "hsl(45 93% 47% / 0.15)" }}>
              <Bug className="h-5 w-5" style={{ color: "hsl(45 93% 47%)" }} />
            </div>
            <div>
              <p className="font-semibold text-sm text-white">{t("settings_bug", lang)}</p>
              <p className="text-xs" style={{ color: "hsl(220 15% 40%)" }}>{t("settings_bug_desc", lang)}</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4" style={{ color: "hsl(220 15% 30%)" }} />
        </a>

        {/* About */}
        <div className="rounded-2xl p-4 animate-slide-up stagger-6" style={{ backgroundColor: "hsl(220 15% 9%)", border: "1px solid hsl(220 15% 14%)" }}>
          <div className="flex items-center gap-2 mb-2">
            <Info className="h-4 w-4" style={{ color: "hsl(220 15% 50%)" }} />
            <h2 className="text-sm font-semibold text-white">{t("settings_about", lang)}</h2>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs" style={{ color: "hsl(220 15% 40%)" }}>SmartLoad v1.0.0</p>
            <p className="text-xs" style={{ color: "hsl(220 15% 30%)" }}>© 2026</p>
          </div>
        </div>

        {/* Account */}
        <div className="rounded-2xl p-4 animate-slide-up stagger-6" style={{ backgroundColor: "hsl(220 15% 9%)", border: "1px solid hsl(220 15% 14%)" }}>
          <div className="flex items-center gap-2 mb-3">
            <User className="h-4 w-4" style={{ color: "hsl(220 15% 50%)" }} />
            <h2 className="text-sm font-semibold text-white">{t("settings_account", lang)}</h2>
          </div>
          <p className="text-sm mb-4" style={{ color: "hsl(220 15% 45%)" }}>{user.email}</p>
          <button onClick={handleSignOut} className="w-full flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold active:scale-95 transition-all" style={{ backgroundColor: "hsl(0 72% 51% / 0.08)", border: "1px solid hsl(0 72% 51% / 0.2)", color: "hsl(0 72% 51%)" }}>
            <LogOut className="h-4 w-4" />
            {t("settings_logout", lang)}
          </button>
        </div>

        {/* Plan */}
        <div className="rounded-2xl p-4 animate-slide-up stagger-6" style={{ backgroundColor: "hsl(220 15% 9%)", border: "1px solid hsl(220 15% 14%)" }}>
          <div className="flex items-center gap-2 mb-2">
            <CreditCard className="h-4 w-4" style={{ color: "hsl(220 15% 50%)" }} />
            <h2 className="text-sm font-semibold text-white">{t("settings_plan", lang)}</h2>
          </div>
          <p className="text-xs" style={{ color: "hsl(220 15% 45%)" }}>{t("settings_plan_desc", lang)}</p>
        </div>
      </div>
    </main>
  );
}
