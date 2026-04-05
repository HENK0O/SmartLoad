"use client";

import { useEffect, useState } from "react";

interface Particle {
  id: number;
  x: number;
  color: string;
  delay: number;
  duration: number;
  size: number;
  rotation: number;
}

const COLORS = [
  "hsl(142 71% 45%)",
  "hsl(199 89% 48%)",
  "hsl(45 93% 47%)",
  "hsl(142 71% 55%)",
  "hsl(199 89% 58%)",
  "hsl(45 93% 57%)",
];

function generateParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    delay: Math.random() * 1.5,
    duration: 4 + Math.random() * 2,
    size: 6 + Math.random() * 14,
    rotation: Math.random() * 360,
  }));
}

interface ConfettiProps {
  active: boolean;
  duration?: number;
}

export default function Confetti({ active, duration = 3000 }: ConfettiProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (active) {
      setParticles(generateParticles(150));
      setVisible(true);
      setFading(false);
      const timer = setTimeout(() => setFading(true), duration);
      return () => clearTimeout(timer);
    }
  }, [active, duration]);

  if (!visible && !fading) return null;

  return (
    <div
      className="fixed inset-0 z-50 pointer-events-none overflow-hidden"
      style={{
        opacity: fading ? 0 : 1,
        transition: "opacity 0.8s ease-out",
      }}
      onTransitionEnd={() => {
        if (fading) setVisible(false);
      }}
    >
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute"
          style={{
            left: `${p.x}%`,
            top: "-10px",
            width: `${p.size}px`,
            height: `${p.size * 0.6}px`,
            backgroundColor: p.color,
            borderRadius: "2px",
            transform: `rotate(${p.rotation}deg)`,
            animation: `confettiFall ${p.duration}s ease-in ${p.delay}s forwards`,
          }}
        />
      ))}
      <style>{`
        @keyframes confettiFall {
          0% {
            transform: translateY(0) rotate(0deg) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateY(200vh) rotate(720deg) scale(0.5);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
