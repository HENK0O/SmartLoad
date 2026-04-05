"use client";

import { useEffect, useState } from "react";

export default function SplashScreen({ onFinish }: { onFinish?: () => void }) {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setVisible(false);
          setTimeout(() => onFinish?.(), 400);
          return 100;
        }
        return prev + 2;
      });
    }, 30);

    return () => clearInterval(interval);
  }, [onFinish]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center transition-all duration-500 ${
        visible ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
      style={{
        background:
          "radial-gradient(ellipse at 50% 30%, hsl(142 71% 45% / 0.12) 0%, hsl(var(--background)) 70%)",
      }}
    >
      <div className="absolute inset-0 overflow-hidden">
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
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full opacity-15 animate-ping"
          style={{
            background:
              "radial-gradient(circle, hsl(142 71% 45% / 0.2), transparent 70%)",
            animationDuration: "3s",
          }}
        />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-6">
        <div className="flex items-center gap-3">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/20"
            style={{
              background:
                "linear-gradient(135deg, hsl(142 71% 45%), hsl(142 71% 35%))",
            }}
          >
            <svg
              width="28"
              height="28"
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
          <h1 className="text-4xl font-bold tracking-tight" style={{ color: "hsl(var(--text-white))" }}>
            Smart<span style={{ color: "hsl(142 71% 45%)" }}>Load</span>
          </h1>
        </div>

        <p className="text-sm tracking-wide" style={{ color: "hsl(var(--text-white-50))" }}>
          Train smarter. Progress faster.
        </p>

        <div className="w-48 mt-4">
          <div
            className="h-1 rounded-full overflow-hidden"
            style={{ backgroundColor: "hsl(var(--card))" }}
          >
            <div
              className="h-full rounded-full transition-all duration-100 ease-linear"
              style={{
                width: `${progress}%`,
                background:
                  "linear-gradient(90deg, hsl(142 71% 45%), hsl(142 71% 55%))",
                boxShadow: "0 0 12px hsl(142 71% 45% / 0.5)",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
