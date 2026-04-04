"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { LogOut, Check, Scale, User, CreditCard } from "lucide-react";

export default function SettingsPage() {
  const { user, loading, signOut } = useAuth();
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
    <main className="flex min-h-screen flex-col p-5 pb-24">
      <h1 className="text-2xl font-bold tracking-tight mb-6">Paramètres</h1>

      <div className="flex flex-col gap-3">
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Scale className="h-4 w-4 text-neutral-500" />
            <h2 className="text-sm font-semibold">Unité de poids</h2>
          </div>
          <div className="flex gap-2">
            <button onClick={() => saveUnit("kg")} disabled={saving} className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold active:scale-95 transition-all ${unit === "kg" ? "bg-green-500 text-neutral-950 shadow-lg shadow-green-500/20" : "border border-neutral-800 text-neutral-500 hover:text-neutral-300"}`}>
              kg
            </button>
            <button onClick={() => saveUnit("lbs")} disabled={saving} className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold active:scale-95 transition-all ${unit === "lbs" ? "bg-green-500 text-neutral-950 shadow-lg shadow-green-500/20" : "border border-neutral-800 text-neutral-500 hover:text-neutral-300"}`}>
              lbs
            </button>
          </div>
          {saved && <p className="text-xs text-green-500 mt-2 flex items-center gap-1"><Check className="h-3 w-3" />Unité sauvegardée</p>}
        </div>

        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
          <div className="flex items-center gap-2 mb-3">
            <User className="h-4 w-4 text-neutral-500" />
            <h2 className="text-sm font-semibold">Compte</h2>
          </div>
          <p className="text-sm text-neutral-500 mb-4">{user.email}</p>
          <button onClick={handleSignOut} className="w-full flex items-center justify-center gap-2 rounded-xl border border-red-500/20 px-4 py-3 text-sm font-semibold text-red-500 active:scale-95 transition-all hover:bg-red-500/5">
            <LogOut className="h-4 w-4" />
            Se déconnecter
          </button>
        </div>

        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
          <div className="flex items-center gap-2 mb-2">
            <CreditCard className="h-4 w-4 text-neutral-500" />
            <h2 className="text-sm font-semibold">Plan actuel</h2>
          </div>
          <p className="text-xs text-neutral-500">Free — 2 programmes max</p>
        </div>
      </div>
    </main>
  );
}
