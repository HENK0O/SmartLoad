"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { ArrowRight } from "lucide-react";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.push("/programs");
  }, [user, loading, router]);

  if (loading) return <p className="p-6">Chargement...</p>;
  if (user) return null;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 animate-fade-in">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-40 -left-40 w-80 h-80 rounded-full opacity-20 animate-pulse"
          style={{
            background:
              "radial-gradient(circle, hsl(142 71% 45% / 0.3), transparent 70%)",
          }}
        />
        <div
          className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full opacity-10 animate-pulse"
          style={{
            background:
              "radial-gradient(circle, hsl(142 71% 45% / 0.25), transparent 70%)",
            animationDelay: "1s",
          }}
        />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-8 max-w-sm mx-auto text-center">
        <div className="animate-scale-in">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg"
            style={{
              background:
                "linear-gradient(135deg, hsl(142 71% 45%), hsl(142 71% 35%))",
              boxShadow: "0 8px 32px hsl(142 71% 45% / 0.3)",
            }}
          >
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6.5 6.5h11M6.5 17.5h11" />
              <rect x="2" y="8" width="4.5" height="8" rx="1" />
              <rect x="17.5" y="8" width="4.5" height="8" rx="1" />
              <rect x="6.5" y="10" width="11" height="4" rx="1" />
            </svg>
          </div>
          <h1 className="text-5xl font-bold tracking-tight text-white">
            Smart<span style={{ color: "hsl(142 71% 45%)" }}>Load</span>
          </h1>
        </div>

        <p className="text-white/50 text-lg animate-slide-up">
          Progresse intelligemment avec la surcharge progressive.
        </p>

        <div className="flex flex-col gap-3 w-full animate-slide-up stagger-2">
          <Link
            href="/login"
            className="w-full min-h-12 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            style={{
              background:
                "linear-gradient(135deg, hsl(142 71% 45%), hsl(142 71% 35%))",
              boxShadow: "0 4px 16px hsl(142 71% 45% / 0.3)",
            }}
          >
            Commencer
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </main>
  );
}
