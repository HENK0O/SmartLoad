"use client";
import { useEffect, useState } from "react";
import SplashScreen from "@/components/SplashScreen";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <>
      {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}
      {children}
    </>
  );
}
