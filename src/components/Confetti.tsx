"use client";
import { useEffect, useState } from "react";

interface ConfettiPiece {
  id: number;
  x: number;
  color: string;
  delay: number;
  duration: number;
  size: number;
  rotation: number;
}

interface ConfettiProps {
  active: boolean;
  onComplete?: () => void;
}

const COLORS = ["#22c55e", "#16a34a", "#4ade80", "#86efac", "#facc15", "#fbbf24", "#60a5fa", "#a78bfa"];

export function Confetti({ active, onComplete }: ConfettiProps) {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
    if (!active) return;
    const newPieces: ConfettiPiece[] = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      delay: Math.random() * 0.5,
      duration: 1.5 + Math.random() * 2,
      size: 4 + Math.random() * 8,
      rotation: Math.random() * 360,
    }));
    setPieces(newPieces);
    const t = setTimeout(() => { setPieces([]); onComplete?.(); }, 4000);
    return () => clearTimeout(t);
  }, [active, onComplete]);

  if (pieces.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[90] pointer-events-none overflow-hidden">
      {pieces.map((p) => (
        <div
          key={p.id}
          className="absolute top-0 animate-[confetti-fall_var(--duration)_ease-in_var(--delay)_forwards]"
          style={{
            left: `${p.x}%`,
            width: p.size,
            height: p.size * 0.6,
            backgroundColor: p.color,
            borderRadius: Math.random() > 0.5 ? "50%" : "2px",
            transform: `rotate(${p.rotation}deg)`,
            ["--delay" as string]: `${p.delay}s`,
            ["--duration" as string]: `${p.duration}s`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}
