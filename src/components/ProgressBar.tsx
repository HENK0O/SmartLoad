"use client";

import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number;
  max?: number;
  showPercentage?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
  label?: string;
}

export default function ProgressBar({
  value,
  max = 100,
  showPercentage = true,
  size = "md",
  className,
  label,
}: ProgressBarProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const heightMap = { sm: "h-1.5", md: "h-2.5", lg: "h-3.5" };

  return (
    <div className={cn("w-full", className)}>
      {(label || showPercentage) && (
        <div className="flex items-center justify-between mb-2">
          {label && <span className="text-sm text-white/70">{label}</span>}
          {showPercentage && (
            <span
              className="text-sm font-semibold"
              style={{ color: "hsl(142 71% 45%)" }}
            >
              {Math.round(percentage)}%
            </span>
          )}
        </div>
      )}
      <div
        className={cn("w-full rounded-full overflow-hidden", heightMap[size])}
        style={{ backgroundColor: "hsl(220 15% 14%)" }}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500 ease-out",
            "relative"
          )}
          style={{
            width: `${percentage}%`,
            background:
              "linear-gradient(90deg, hsl(142 71% 45%), hsl(142 71% 55%))",
            boxShadow: "0 0 12px hsl(142 71% 45% / 0.4)",
          }}
        >
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, hsl(0 0% 100% / 0.15) 50%, transparent 100%)",
              animation: "progressShimmer 2s infinite",
            }}
          />
        </div>
      </div>
      <style>{`
        @keyframes progressShimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
