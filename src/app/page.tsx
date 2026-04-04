"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useApp } from "@/lib/context";
import { t } from "@/lib/i18n";
import { ArrowRight, Dumbbell, TrendingUp, Clock, Shield, ChevronDown } from "lucide-react";
import { LangFlag } from "@/components/LangFlag";

export default function Home() {
  const { user, loading } = useAuth();
  const { lang, setLang } = useApp();
  const router = useRouter();
  const [showMore, setShowMore] = useState(false);

  useEffect(() => {
    if (!loading && user) router.push("/programs");
  }, [user, loading, router]);

  if (loading) return <p className="p-6">Chargement...</p>;
  if (user) return null;

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return t("home_greeting_morning", lang);
    if (h < 18) return t("home_greeting_afternoon", lang);
    return t("home_greeting_evening", lang);
  };

  const features = [
    { icon: TrendingUp, title: t("home_greeting_morning", lang) === "Good morning" ? "Progressive Overload" : "Surcharge progressive", desc: lang === "en" ? "The app auto-calculates your next ideal load." : "L'app calcule automatiquement ta prochaine charge idéale." },
    { icon: Dumbbell, title: lang === "en" ? "Custom Programs" : "Programmes personnalisés", desc: lang === "en" ? "Create programs or use templates." : "Crée tes programmes ou utilise des templates." },
    { icon: Clock, title: lang === "en" ? "Real-time Tracking" : "Suivi en temps réel", desc: lang === "en" ? "Rest timer, live stats, full history." : "Chrono de repos, stats live, historique complet." },
    { icon: Shield, title: lang === "en" ? "Offline Mode" : "Mode hors-ligne", desc: lang === "en" ? "Train even without connection." : "Entraîne-toi même sans connexion." },
  ];

  return (
    <main className="flex min-h-screen flex-col relative overflow-hidden">
      {/* Language switcher - top right */}
      <button
        onClick={() => setLang(lang === "fr" ? "en" : "fr")}
        className="absolute top-4 right-4 z-20 p-2.5 rounded-xl active:scale-95 transition-all"
        style={{ backgroundColor: "hsl(220 15% 9% / 0.8)", border: "1px solid hsl(220 15% 14%)", backdropFilter: "blur(12px)" }}
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

      {/* Hero */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 pt-16 pb-8">
        <div className="text-center max-w-sm mx-auto">
          <div className="animate-scale-in mb-8">
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
            <h1 className="text-6xl font-black tracking-tight text-white mb-2">
              Smart<span style={{ color: "hsl(142 71% 45%)" }}>Load</span>
            </h1>
            <p className="text-lg text-white/50">
              {lang === "en" ? "Train smarter." : "Entraîne-toi plus intelligemment."}
            </p>
          </div>

          <div className="animate-slide-up stagger-2">
            <Link
              href="/login"
              className="w-full min-h-14 rounded-2xl text-base font-bold text-white flex items-center justify-center gap-2 transition-all active:scale-[0.97]"
              style={{
                background: "linear-gradient(135deg, hsl(142 71% 45%), hsl(142 71% 35%))",
                boxShadow: "0 8px 32px hsl(142 71% 45% / 0.35)",
              }}
            >
              {t("home_cta", lang)}
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="relative z-10 px-5 pb-8 max-w-sm mx-auto w-full">
        <button
          onClick={() => setShowMore(!showMore)}
          className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium mb-4 active:scale-95 transition-all"
          style={{ color: "hsl(220 15% 45%)" }}
        >
          {showMore ? t("home_hide", lang) : t("home_features", lang)}
          <ChevronDown className={`h-4 w-4 transition-transform ${showMore ? "rotate-180" : ""}`} />
        </button>

        {showMore && (
          <div className="grid grid-cols-2 gap-3 animate-slide-up">
            {features.map((f, i) => (
              <div
                key={f.title}
                className="rounded-2xl p-4 animate-scale-in"
                style={{
                  backgroundColor: "hsl(220 15% 9%)",
                  border: "1px solid hsl(220 15% 14%)",
                  animationDelay: `${i * 0.08}s`,
                }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: "hsl(142 71% 45% / 0.1)" }}>
                  <f.icon className="h-5 w-5" style={{ color: "hsl(142 71% 45%)" }} />
                </div>
                <p className="text-sm font-semibold text-white mb-1">{f.title}</p>
                <p className="text-xs" style={{ color: "hsl(220 15% 40%)" }}>{f.desc}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
