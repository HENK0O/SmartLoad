"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useApp } from "@/lib/context";
import { t } from "@/lib/i18n";
import { ArrowRight, Dumbbell, TrendingUp, Clock, Shield } from "lucide-react";
import { LangFlag } from "@/components/LangFlag";

export default function Home() {
  const { user, loading } = useAuth();
  const { lang, setLang } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.push("/programs");
  }, [user, loading, router]);

  if (loading) return <p className="p-6">Chargement...</p>;
  if (user) return null;

  const features = [
    { icon: TrendingUp, title: lang === "en" ? "Progressive Overload" : "Surcharge progressive", desc: lang === "en" ? "The app auto-calculates your next ideal load based on your history." : "L'app calcule ta prochaine charge idéale à partir de ton historique." },
    { icon: Dumbbell, title: lang === "en" ? "Custom Programs" : "Programmes personnalisés", desc: lang === "en" ? "Build your programs or start from proven templates." : "Crée tes programmes ou utilise des templates éprouvés." },
    { icon: Clock, title: lang === "en" ? "Real-time Tracking" : "Suivi en temps réel", desc: lang === "en" ? "Rest timer, live stats, and full session history." : "Chrono de repos, stats live, et historique complet." },
    { icon: Shield, title: lang === "en" ? "Offline Mode" : "Mode hors-ligne", desc: lang === "en" ? "Train anywhere, even without connection." : "Entraîne-toi partout, même sans connexion." },
  ];

  return (
    <main className="flex min-h-screen flex-col relative overflow-x-hidden overflow-y-auto">
      {/* Language switcher - top right */}
      <button
        onClick={() => setLang(lang === "fr" ? "en" : "fr")}
        className="absolute top-4 right-4 z-20 p-2.5 rounded-xl active:scale-95 transition-all"
        style={{ backgroundColor: "hsl(var(--card) / 0.8)", border: "1px solid hsl(var(--card-border))", backdropFilter: "blur(12px)" }}
      >
        <LangFlag lang={lang} size={20} />
      </button>

      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-25 animate-pulse"
          style={{ background: "radial-gradient(circle, hsl(142 71% 45% / 0.4), transparent 70%)" }}
        />
        <div
          className="absolute top-1/3 -right-48 w-96 h-96 rounded-full opacity-15 animate-pulse"
          style={{ background: "radial-gradient(circle, hsl(199 89% 48% / 0.3), transparent 70%)", animationDelay: "1.5s" }}
        />
        <div
          className="absolute -bottom-32 left-1/4 w-80 h-80 rounded-full opacity-10 animate-pulse"
          style={{ background: "radial-gradient(circle, hsl(45 93% 47% / 0.3), transparent 70%)", animationDelay: "0.8s" }}
        />
      </div>

      {/* Hero - Conteneur principal centré */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 pt-16 pb-8">
        <div className="text-center max-w-sm mx-auto w-full">

          {/* PARTIE SUPÉRIEURE (Upper) : Logo et Titres */}
          <div className="animate-scale-in mb-8">
            {/* Logo */}
            <div
              className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 animate-float"
              style={{
                background: "linear-gradient(135deg, hsl(142 71% 45%), hsl(142 71% 35%))",
                boxShadow: "0 12px 48px hsl(142 71% 45% / 0.35)",
              }}
            >
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6.5 6.5h11M6.5 17.5h11" />
                <rect x="2" y="8" width="4.5" height="8" rx="1" />
                <rect x="17.5" y="8" width="4.5" height="8" rx="1" />
                <rect x="6.5" y="10" width="11" height="4" rx="1" />
              </svg>
            </div>
            {/* Titre */}
            <h1 className="text-6xl font-black tracking-tight text-[hsl(var(--text-white))] mb-2">
              Smart<span style={{ color: "hsl(142 71% 45%)" }}>Load</span>
            </h1>
            {/* Sous-titres */}
            <p className="text-lg text-[hsl(var(--text-white-50))] mb-1">
              {lang === "en" ? "Train smarter. Progress faster." : "Entraîne-toi plus intelligemment."}
            </p>
            <p className="text-sm text-[hsl(var(--text-white-40))]">
              {lang === "en" ? "The app that tells you exactly what to lift next." : "L'app qui te dit exactement quoi soulever ensuite."}
            </p>
          </div>

          {/* Bouton */}
          <div className="animate-slide-up stagger-2">
            <Link
              href="/login"
              className="w-full min-h-14 rounded-2xl text-base font-bold text-[hsl(var(--text-white))] flex items-center justify-center gap-2 transition-all active:scale-[0.97]"
              style={{
                background: "linear-gradient(135deg, hsl(142 71% 45%), hsl(142 71% 35%))",
                boxShadow: "0 8px 32px hsl(142 71% 45% / 0.35)",
              }}
            >
              {t("home_cta", lang)}
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>

          {/* FEATURES : La grille */}
          <div className="mt-10 grid grid-cols-2 gap-3 text-left">
            {features.map((f, i) => (
              <div
                key={f.title}
                className="rounded-2xl p-4 animate-scale-in"
                style={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--card-border))",
                  animationDelay: `${i * 0.08}s`,
                }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: "hsl(142 71% 45% / 0.1)" }}>
                  <f.icon className="h-5 w-5" style={{ color: "hsl(142 71% 45%)" }} />
                </div>
                <p className="text-sm font-semibold text-[hsl(var(--text-white))] mb-1">{f.title}</p>
                <p className="text-xs" style={{ color: "hsl(var(--muted-foreground-dim))" }}>{f.desc}</p>
              </div>
            ))}
          </div>

        </div>
      </div>

    </main>
  );
}