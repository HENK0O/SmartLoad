"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2, LogIn, UserPlus } from "lucide-react";

export default function AuthForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error } = isSignUp
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        setError(error.message);
        setLoading(false);
      } else {
        window.location.href = "/programs";
      }
    } catch {
      setError("Une erreur inattendue est survenue");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-4">
      <div>
        <label className="text-sm text-neutral-400 mb-1.5 block">Email</label>
        <input
          type="email"
          placeholder="ton@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-neutral-50 placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-green-500/50 transition-all"
        />
      </div>
      <div>
        <label className="text-sm text-neutral-400 mb-1.5 block">Mot de passe</label>
        <input
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-neutral-50 placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-green-500/50 transition-all"
        />
      </div>

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-green-500 px-6 py-3.5 font-semibold text-neutral-950 shadow-lg shadow-green-500/20 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
      >
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : isSignUp ? (
          <>
            <UserPlus className="h-4 w-4" />
            Créer un compte
          </>
        ) : (
          <>
            <LogIn className="h-4 w-4" />
            Se connecter
          </>
        )}
      </button>

      <button
        type="button"
        onClick={() => setIsSignUp(!isSignUp)}
        className="text-sm text-neutral-500 hover:text-neutral-300 transition-colors"
      >
        {isSignUp ? "Déjà un compte ? Se connecter" : "Pas de compte ? S'inscrire"}
      </button>
    </form>
  );
}
