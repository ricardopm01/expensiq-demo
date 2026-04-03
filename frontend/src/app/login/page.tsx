'use client';

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Zap, LogIn } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email: email.trim(),
      redirect: false,
    });

    if (result?.error) {
      setError("No existe ningún usuario con ese email.");
      setLoading(false);
    } else {
      window.location.href = "/";
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500 flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/30">
            <Zap className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-white text-2xl font-bold tracking-tight">ExpensIQ</h1>
          <p className="text-slate-400 text-sm mt-1">Gestión inteligente de gastos</p>
        </div>

        {/* Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl">
          <h2 className="text-white text-lg font-semibold mb-1">Iniciar sesión</h2>
          <p className="text-slate-400 text-sm mb-6">Introduce tu email corporativo</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="tu.nombre@empresa.com"
              autoFocus
              required
              className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-xl px-4 py-3 outline-none focus:border-indigo-500 transition-colors placeholder:text-slate-500"
            />

            {error && (
              <p className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full flex items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white font-medium py-3 px-4 rounded-xl transition-colors"
            >
              <LogIn className="w-4 h-4" />
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
