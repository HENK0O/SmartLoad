"use client";
import { useEffect, useState, createContext, useContext, type ReactNode } from "react";
import { injectLightStyles } from "./light-theme";

export type Lang = "fr" | "en";

interface AppContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  theme: "dark" | "light";
  setTheme: (t: "dark" | "light") => void;
}

const AppContext = createContext<AppContextType>({
  lang: "fr",
  setLang: () => {},
  theme: "dark",
  setTheme: () => {},
});

export function AppProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("fr");
  const [theme, setThemeState] = useState<"dark" | "light">("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    injectLightStyles();
    const savedLang = localStorage.getItem("smartload-lang") as Lang | null;
    const savedTheme = localStorage.getItem("smartload-theme") as "dark" | "light" | null;
    if (savedLang) setLangState(savedLang);
    if (savedTheme) {
      setThemeState(savedTheme);
      document.documentElement.classList.toggle("light", savedTheme === "light");
    }
    setMounted(true);
  }, []);

  function setLang(l: Lang) {
    setLangState(l);
    localStorage.setItem("smartload-lang", l);
    const newUnit = l === "fr" ? "kg" : "lbs";
    localStorage.setItem("smartload-unit", newUnit);
  }

  function setTheme(t: "dark" | "light") {
    setThemeState(t);
    localStorage.setItem("smartload-theme", t);
    document.documentElement.classList.toggle("light", t === "light");
  }

  if (!mounted) return <>{children}</>;

  return (
    <AppContext.Provider value={{ lang, setLang, theme, setTheme }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
