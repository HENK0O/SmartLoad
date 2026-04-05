"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useApp } from "@/lib/context";
import { t } from "@/lib/i18n";
import { Mail, Lock, Loader2 } from "lucide-react";

export default function AuthForm() {
  const { user } = useAuth();
  const { lang } = useApp();
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/programs");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsSignUp((prev) => !prev);
    setError(null);
  };

  return (
    <div className="w-full max-w-sm mx-auto px-4">
      <div className="mb-8 text-center">
        <div
          className="inline-flex w-14 h-14 rounded-2xl items-center justify-center mb-4 shadow-lg"
          style={{
            background: "linear-gradient(135deg, hsl(142 71% 45%), hsl(142 71% 35%))",
            boxShadow: "0 8px 24px hsl(142 71% 45% / 0.25)",
          }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6.5 6.5h11M6.5 17.5h11" />
            <rect x="2" y="8" width="4.5" height="8" rx="1" />
            <rect x="17.5" y="8" width="4.5" height="8" rx="1" />
            <rect x="6.5" y="10" width="11" height="4" rx="1" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold" style={{ color: "hsl(var(--text-white))" }}>
          {isSignUp ? t("auth_create", lang) : t("auth_welcome", lang)}
        </h1>
        <p className="mt-1 text-sm" style={{ color: "hsl(var(--text-white-50))" }}>
          {isSignUp ? t("auth_signup_desc", lang) : t("auth_signin_desc", lang)}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-xl p-3 text-sm text-center" style={{ backgroundColor: "hsl(0 72% 51% / 0.1)", border: "1px solid hsl(0 72% 51% / 0.2)", color: "hsl(0 72% 61%)" }}>
            {error}
          </div>
        )}

        <div className="space-y-3">
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "hsl(var(--text-white-30))" }} />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("auth_email", lang)}
              required
              autoComplete="email"
              className="w-full min-h-12 rounded-xl pl-11 pr-4 text-sm outline-none transition-all placeholder:text-[hsl(var(--text-white-30))]"
              style={{ backgroundColor: "hsl(var(--input-bg))", border: "1px solid hsl(var(--card-border))", color: "hsl(var(--text-white))" }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "hsl(142 71% 45% / 0.5)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "hsl(var(--card-border))")}
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "hsl(var(--text-white-30))" }} />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("auth_password", lang)}
              required
              autoComplete={isSignUp ? "new-password" : "current-password"}
              className="w-full min-h-12 rounded-xl pl-11 pr-4 text-sm outline-none transition-all placeholder:text-[hsl(var(--text-white-30))]"
              style={{ backgroundColor: "hsl(var(--input-bg))", border: "1px solid hsl(var(--card-border))", color: "hsl(var(--text-white))" }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "hsl(142 71% 45% / 0.5)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "hsl(var(--card-border))")}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full min-h-12 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
          style={{ background: "linear-gradient(135deg, hsl(142 71% 45%), hsl(142 71% 35%))", boxShadow: "0 4px 16px hsl(142 71% 45% / 0.3)", color: "white" }}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {isSignUp ? t("auth_signing_up", lang) : t("auth_signing_in", lang)}
            </>
          ) : isSignUp ? (
            t("auth_signup", lang)
          ) : (
            t("auth_signin", lang)
          )}
        </button>
      </form>

      <div className="mt-6 text-center">
        <button onClick={toggleMode} className="text-sm transition-colors active:scale-[0.98]" style={{ color: "hsl(142 71% 45%)" }}>
          {isSignUp ? t("auth_switch_signin", lang) : t("auth_switch_signup", lang)}
        </button>
      </div>
    </div>
  );
}
