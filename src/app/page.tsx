"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.push("/programs");
  }, [user, loading, router]);

  if (loading) return <p className="p-6">Chargement...</p>;
  if (user) return null;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-6">
      <h1 className="text-4xl font-bold tracking-tight">
        <span className="text-[var(--primary)]">Smart</span>Load
      </h1>
      <p className="text-[var(--muted)] text-center text-lg max-w-sm">
        Suivez vos entraînements et progressez automatiquement avec la surcharge progressive.
      </p>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Link
          href="/login"
          className="block w-full rounded-lg bg-[var(--primary)] px-6 py-3 text-center font-semibold text-[var(--primary-foreground)] hover:opacity-90 transition-opacity"
        >
          Se connecter
        </Link>
      </div>
    </main>
  );
}
