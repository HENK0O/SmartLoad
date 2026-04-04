"use client";
import { useState, useRef, type MouseEvent, type ReactNode, type ButtonHTMLAttributes } from "react";

interface RippleButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger";
}

const variantClasses = {
  primary: "bg-green-500 text-neutral-950 shadow-lg shadow-green-500/20",
  secondary: "border border-neutral-800 bg-neutral-900 text-neutral-50 hover:border-green-500/30",
  ghost: "text-neutral-500 hover:text-neutral-300",
  danger: "bg-red-500/10 text-red-500 border border-red-500/20",
};

export function RippleButton({ children, className = "", variant = "primary", disabled, ...props }: RippleButtonProps) {
  const [ripples, setRipples] = useState<{ x: number; y: number; id: number }[]>([]);
  const btnRef = useRef<HTMLButtonElement>(null);

  function handleClick(e: MouseEvent<HTMLButtonElement>) {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = Date.now();
    setRipples((prev) => [...prev, { x, y, id }]);
    setTimeout(() => setRipples((prev) => prev.filter((r) => r.id !== id)), 600);
    props.onClick?.(e);
  }

  return (
    <button
      ref={btnRef}
      disabled={disabled}
      className={`relative overflow-hidden rounded-xl px-6 py-3 font-semibold active:scale-[0.97] transition-all disabled:opacity-50 disabled:active:scale-100 ${variantClasses[variant]} ${className}`}
      onClick={handleClick}
      {...props}
    >
      {ripples.map((r) => (
        <span
          key={r.id}
          className="absolute rounded-full bg-white/30 animate-[ripple_0.6s_ease-out]"
          style={{ left: r.x - 40, top: r.y - 40, width: 80, height: 80 }}
        />
      ))}
      {children}
    </button>
  );
}
