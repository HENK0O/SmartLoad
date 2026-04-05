"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Dumbbell, Calendar, BarChart3, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { useApp } from "@/lib/context";

const navItems = [
  { labelKey: "nav_programs", href: "/programs", icon: LayoutGrid },
  { labelKey: "nav_workout", href: "/workout", icon: Dumbbell },
  { labelKey: "nav_calendar", href: "/calendar", icon: Calendar },
  { labelKey: "nav_analytics", href: "/analytics", icon: BarChart3 },
  { labelKey: "nav_settings", href: "/settings", icon: Settings },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { lang } = useApp();

  if (pathname && /^\/workout\/[^/]+$/.test(pathname)) return null;

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t"
      style={{
        backgroundColor: "hsl(var(--card) / 0.8)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderColor: "hsl(var(--card-border))",
      }}
    >
      <div className="flex items-center justify-around max-w-lg mx-auto px-2 pt-2 pb-6">
        {navItems.map(({ labelKey, href, icon: Icon }) => {
          const active = isActive(href);
          const activeColor = "hsl(142 71% 45%)";
          const inactiveColor = "hsl(var(--icon-muted))";

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
                  active ? "text-green-400" : "text-[hsl(var(--text-white-40))]"
                )}
              >
                {t(labelKey, lang)}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
