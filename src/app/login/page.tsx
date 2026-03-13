"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login, register } from "@/lib/auth";
import { useAuth } from "@/providers/auth-provider";

type Mode = "login" | "register";

export default function LoginPage() {
  const router = useRouter();
  const { setUser } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) { setError("Preencha email e senha."); return; }
    setLoading(true);
    try {
      const result = mode === "login" ? await login(email.trim(), password) : await register(email.trim(), password);
      setUser(result.user);
      router.push("/despesas");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao autenticar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-brand/10 border border-brand/20 mb-4">
            <span className="text-3xl">💰</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Orgenyx</h1>
          <span className="inline-block mt-2 px-3 py-1 text-xs font-semibold text-brand bg-brand/10 border border-brand/20 rounded-full tracking-widest">
            CONTROLE DE GASTOS
          </span>
          <p className="text-muted text-sm mt-3">
            {mode === "login" ? "Acesse sua conta para continuar" : "Crie sua conta gratuitamente"}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-surface rounded-2xl p-6 border border-border space-y-4">
          {error && (
            <div className="bg-error/10 border border-error/20 rounded-xl px-4 py-3">
              <p className="text-error text-sm text-center">{error}</p>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted tracking-wider">EMAIL</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              disabled={loading}
              className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-foreground placeholder-muted focus:outline-none focus:border-brand transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted tracking-wider">SENHA</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "register" ? "Mínimo 8 caracteres" : "••••••••"}
                disabled={loading}
                className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 pr-12 text-foreground placeholder-muted focus:outline-none focus:border-brand transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand text-white rounded-xl py-3.5 font-semibold hover:bg-brand/90 disabled:opacity-60 transition-colors mt-2"
          >
            {loading ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta"}
          </button>

          <button type="button" onClick={() => { setMode(m => m === "login" ? "register" : "login"); setError(null); }} disabled={loading} className="w-full text-sm text-muted hover:text-foreground transition-colors text-center">
            {mode === "login" ? "Não tem uma conta? " : "Já tem uma conta? "}
            <span className="text-brand font-semibold">{mode === "login" ? "Criar conta" : "Entrar"}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
