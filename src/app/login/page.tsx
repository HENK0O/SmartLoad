"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import AuthForm from "@/components/AuthForm";

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.replace("/programs");
  }, [user, loading, router]);

  if (loading) return null;
  if (user) return null;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-6">
      <h1 className="text-3xl font-bold">
        <span className="text-[var(--primary)]">Smart</span>Load
      </h1>
      <AuthForm />
    </main>
  );
}
