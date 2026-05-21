"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export function LoginForm({
  tenantSlug,
  next,
}: {
  tenantSlug?: string;
  next: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const body: Record<string, string> = { email, password };
      if (tenantSlug) body.tenantSlug = tenantSlug;
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Não foi possível entrar.");
        setLoading(false);
        return;
      }
      router.push(next || (tenantSlug ? `/${tenantSlug}/palpites` : "/superadmin"));
      router.refresh();
    } catch {
      setError("Falha de conexão.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="label" htmlFor="email">
          E-mail
        </label>
        <input
          id="email"
          type="email"
          required
          className="input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="voce@email.com"
        />
      </div>
      <div>
        <label className="label" htmlFor="password">
          Senha
        </label>
        <input
          id="password"
          type="password"
          required
          className="input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••"
        />
      </div>

      {error && (
        <p className="rounded-lg bg-red-500/12 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      )}

      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? "Entrando..." : "Entrar"}
      </button>

      {tenantSlug && (
        <p className="text-center text-sm text-slate-400">
          Não tem conta?{" "}
          <Link
            href={`/${tenantSlug}/register`}
            className="font-semibold text-brand"
          >
            Cadastre-se
          </Link>
        </p>
      )}
    </form>
  );
}
