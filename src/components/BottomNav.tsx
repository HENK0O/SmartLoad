"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  Dumbbell,
  Calendar,
  BarChart3,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Programs", href: "/programs", icon: LayoutGrid },
  { label: "Workout", href: "/workout", icon: Dumbbell },
  { label: "Calendar", href: "/calendar", icon: Calendar },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Settings", href: "/settings", icon: Settings },
];

export default function BottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t"
      style={{
        backgroundColor: "hsl(220 15% 9% / 0.8)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderColor: "hsl(220 15% 14%)",
      }}
    >
      <div className="flex items-center justify-around max-w-lg mx-auto px-2 pt-2 pb-6">
        {navItems.map(({ label, href, icon: Icon }) => {
          const active = isActive(href);
          const activeColor = "hsl(142 71% 45%)";
          const inactiveColor = "hsl(220 15% 50%)";

          return (
            <Link
              key={href}
              href={href}
              className="relative flex flex-col items-center justify-center min-w-14 min-h-11 py-1 px-2 rounded-xl transition-all duration-200 active:scale-[0.95]"
            >
              {active && (
                <div
                  className="absolute -top-0.5 w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: activeColor }}
                />
              )}
              <Icon
                className="w-5 h-5 mb-1 transition-colors duration-200"
                style={{ color: active ? activeColor : inactiveColor }}
              />
              <span
                className={cn(
                  "text-[10px] font-medium transition-colors duration-200",
                  active ? "text-green-400" : "text-white/40"
                )}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
