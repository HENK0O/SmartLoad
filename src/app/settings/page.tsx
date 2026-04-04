"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { LogOut, Check, Scale, User, CreditCard, Sun, Moon } from "lucide-react";
import { useTheme } from "@/lib/theme";

export default function SettingsPage() {
  const { user, loading, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const [unit, setUnit] = useState<"kg" | "lbs">("kg");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { if (!loading && !user) router.push("/login"); }, [user, loading, router]);
  useEffect(() => { if (!user) return; loadSettings(); }, [user]);

  async function loadSettings() {
    const { data } = await supabase.from("profiles").select("unit").eq("id", user!.id).single();
    if (data) setUnit(data.unit as "kg" | "lbs");
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

  async function handleSignOut() { await signOut(); router.push("/login"); }

  if (loading || !user) return <p className="p-6">Chargement...</p>;

  return (
    <main className="flex min-h-screen flex-col p-4 pb-24 animate-fade-in">
      <h1 className="text-2xl font-bold tracking-tight mb-6">Paramètres</h1>

      <div className="flex flex-col gap-3">
        {/* Theme */}
        <div className="rounded-2xl p-4 animate-slide-up" style={{ backgroundColor: "hsl(220 15% 9%)", border: "1px solid hsl(220 15% 14%)" }}>
          <div className="flex items-center gap-2 mb-3">
            {theme === "dark" ? <Moon className="h-4 w-4" style={{ color: "hsl(220 15% 50%)" }} /> : <Sun className="h-4 w-4" style={{ color: "hsl(220 15% 50%)" }} />}
            <h2 className="text-sm font-semibold text-white">Apparence</h2>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setTheme("dark")} className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold active:scale-95 transition-all ${theme === "dark" ? "text-white" : ""}`}
              style={theme === "dark" ? { background: "linear-gradient(135deg, hsl(142 71% 45%), hsl(142 71% 35%))", boxShadow: "0 4px 12px hsl(142 71% 45% / 0.25)" } : { backgroundColor: "hsl(220 15% 11%)", border: "1px solid hsl(220 15% 16%)", color: "hsl(220 15% 60%)" }}>
              Sombre
            </button>
            <button onClick={() => setTheme("light")} className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold active:scale-95 transition-all ${theme === "light" ? "text-white" : ""}`}
              style={theme === "light" ? { background: "linear-gradient(135deg, hsl(142 71% 45%), hsl(142 71% 35%))", boxShadow: "0 4px 12px hsl(142 71% 45% / 0.25)" } : { backgroundColor: "hsl(220 15% 11%)", border: "1px solid hsl(220 15% 16%)", color: "hsl(220 15% 60%)" }}>
              Clair
            </button>
          </div>
        </div>

        {/* Unit */}
        <div className="rounded-2xl p-4 animate-slide-up stagger-1" style={{ backgroundColor: "hsl(220 15% 9%)", border: "1px solid hsl(220 15% 14%)" }}>
          <div className="flex items-center gap-2 mb-3">
            <Scale className="h-4 w-4" style={{ color: "hsl(220 15% 50%)" }} />
            <h2 className="text-sm font-semibold text-white">Unité de poids</h2>
          </div>
          <div className="flex gap-2">
            <button onClick={() => saveUnit("kg")} disabled={saving} className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold active:scale-95 transition-all ${unit === "kg" ? "text-white" : ""}`}
              style={unit === "kg" ? { background: "linear-gradient(135deg, hsl(142 71% 45%), hsl(142 71% 35%))", boxShadow: "0 4px 12px hsl(142 71% 45% / 0.25)" } : { backgroundColor: "hsl(220 15% 11%)", border: "1px solid hsl(220 15% 16%)", color: "hsl(220 15% 60%)" }}>
              kg
            </button>
            <button onClick={() => saveUnit("lbs")} disabled={saving} className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold active:scale-95 transition-all ${unit === "lbs" ? "text-white" : ""}`}
              style={unit === "lbs" ? { background: "linear-gradient(135deg, hsl(142 71% 45%), hsl(142 71% 35%))", boxShadow: "0 4px 12px hsl(142 71% 45% / 0.25)" } : { backgroundColor: "hsl(220 15% 11%)", border: "1px solid hsl(220 15% 16%)", color: "hsl(220 15% 60%)" }}>
              lbs
            </button>
          </div>
          {saved && <p className="text-xs mt-2 flex items-center gap-1" style={{ color: "hsl(142 71% 45%)" }}><Check className="h-3 w-3" />Unité sauvegardée</p>}
        </div>

        {/* Account */}
        <div className="rounded-2xl p-4 animate-slide-up stagger-2" style={{ backgroundColor: "hsl(220 15% 9%)", border: "1px solid hsl(220 15% 14%)" }}>
          <div className="flex items-center gap-2 mb-3">
            <User className="h-4 w-4" style={{ color: "hsl(220 15% 50%)" }} />
            <h2 className="text-sm font-semibold text-white">Compte</h2>
          </div>
          <p className="text-sm mb-4" style={{ color: "hsl(220 15% 45%)" }}>{user.email}</p>
          <button onClick={handleSignOut} className="w-full flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold active:scale-95 transition-all" style={{ backgroundColor: "hsl(0 72% 51% / 0.08)", border: "1px solid hsl(0 72% 51% / 0.2)", color: "hsl(0 72% 51%)" }}>
            <LogOut className="h-4 w-4" />
            Se déconnecter
          </button>
        </div>

        {/* Plan */}
        <div className="rounded-2xl p-4 animate-slide-up stagger-3" style={{ backgroundColor: "hsl(220 15% 9%)", border: "1px solid hsl(220 15% 14%)" }}>
          <div className="flex items-center gap-2 mb-2">
            <CreditCard className="h-4 w-4" style={{ color: "hsl(220 15% 50%)" }} />
            <h2 className="text-sm font-semibold text-white">Plan actuel</h2>
          </div>
          <p className="text-xs" style={{ color: "hsl(220 15% 45%)" }}>Free — 2 programmes max</p>
        </div>
      </div>
    </main>
  );
}
