"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Calendar, Dumbbell, BarChart3, Settings } from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { href: "/programs", label: "Accueil", icon: BookOpen },
  { href: "/calendar", label: "Calendrier", icon: Calendar },
  { href: "/workout", label: "Séance", icon: Dumbbell },
  { href: "/analytics", label: "Stats", icon: BarChart3 },
  { href: "/settings", label: "Réglages", icon: Settings },
];

const hiddenPaths = ["/login", "/"];

export function BottomNav() {
  const pathname = usePathname();

  if (hiddenPaths.includes(pathname) || pathname.startsWith("/workout/")) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-neutral-800 bg-neutral-950/80 backdrop-blur-xl">
      <div className="flex items-center justify-around py-2 pb-safe">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== "/programs" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all active:scale-95 ${
                isActive
                  ? "text-green-500"
                  : "text-neutral-500 hover:text-neutral-300"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
