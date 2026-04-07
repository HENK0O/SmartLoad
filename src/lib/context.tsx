"use client";
import { useEffect, useState, createContext, useContext, type ReactNode } from "react";
import { injectLightStyles } from "./light-theme";

export type Lang = "fr" | "en";
export type Unit = "kg" | "lbs";

interface AppContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  theme: "dark" | "light";
  setTheme: (t: "dark" | "light") => void;
  unit: Unit;
  setUnit: (u: Unit) => void;
}

const AppContext = createContext<AppContextType>({
  lang: "fr",
  setLang: () => {},
  theme: "dark",
  setTheme: () => {},
  unit: "kg",
  setUnit: () => {},
});

export function AppProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("fr");
  const [theme, setThemeState] = useState<"dark" | "light">("dark");
  const [unit, setUnitState] = useState<Unit>("kg");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    injectLightStyles();
    const savedLang = localStorage.getItem("smartload-lang") as Lang | null;
    const savedTheme = localStorage.getItem("smartload-theme") as "dark" | "light" | null;
    const savedUnit = localStorage.getItem("smartload-unit") as Unit | null;
    if (savedLang) setLangState(savedLang);
    if (savedTheme) {
      setThemeState(savedTheme);
      document.documentElement.classList.toggle("light", savedTheme === "light");
    }
    if (savedUnit) setUnitState(savedUnit);
    setMounted(true);
  }, []);

  function setLang(l: Lang) {
    setLangState(l);
    localStorage.setItem("smartload-lang", l);
    const newUnit = l === "fr" ? "kg" : "lbs";
    localStorage.setItem("smartload-unit", newUnit);
    setUnitState(newUnit);
  }

  function setTheme(t: "dark" | "light") {
    setThemeState(t);
    localStorage.setItem("smartload-theme", t);
    document.documentElement.classList.toggle("light", t === "light");
  }

  function setUnit(u: Unit) {
    setUnitState(u);
    localStorage.setItem("smartload-unit", u);
  }

  if (!mounted) return <>{children}</>;

  return (
    <AppContext.Provider value={{ lang, setLang, theme, setTheme, unit, setUnit }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
