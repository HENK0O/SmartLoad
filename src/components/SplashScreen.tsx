"use client";
import { useEffect, useState } from "react";

interface SplashScreenProps {
  onFinish: () => void;
}

export function SplashScreen({ onFinish }: SplashScreenProps) {
  const [phase, setPhase] = useState<"logo" | "fadeout" | "done">("logo");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("fadeout"), 1500);
    const t2 = setTimeout(() => { setPhase("done"); onFinish(); }, 2000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onFinish]);

  if (phase === "done") return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-neutral-950 transition-opacity duration-500 ${
        phase === "fadeout" ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center shadow-lg shadow-green-500/30 animate-pulse">
            <svg className="h-10 w-10 text-neutral-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h4l3 9h4l3-9h4" />
            </svg>
          </div>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Smart<span className="text-green-500">Load</span>
        </h1>
        <div className="mt-2 h-0.5 w-24 rounded-full bg-neutral-800 overflow-hidden">
          <div className="h-full rounded-full bg-green-500 animate-[loading_1.5s_ease-in-out]" />
        </div>
      </div>
    </div>
  );
}
