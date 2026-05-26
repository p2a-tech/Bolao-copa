"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatCPF, formatPhone } from "@/lib/validation";
import { FigurinhaBuilder } from "./FigurinhaBuilder";

export function RegisterForm({ tenantSlug }: { tenantSlug: string }) {
  const router = useRouter();
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    birthDate: "",
    cpf: "",
    password: "",
    photoUrl: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [photoSavedAt, setPhotoSavedAt] = useState<number | null>(null);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, tenantSlug }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Não foi possível cadastrar.");
        setLoading(false);
        return;
      }
      router.push(`/${tenantSlug}/palpites`);
      router.refresh();
    } catch {
      setError("Falha de conexão.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {/* === Editor de figurinha === */}
      <section className="rounded-xl border border-slate-700 bg-slate-900/50 p-4">
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-300">
          Sua figurinha da Copa
        </h3>
        <FigurinhaBuilder
          initialName={form.fullName}
          onConfirm={(url) => {
            set("photoUrl", url);
            setPhotoSavedAt(Date.now());
          }}
        />
        {form.photoUrl && (
          <p className="mt-3 rounded-lg bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
            ✓ Figurinha salva no seu perfil
            {photoSavedAt && " — pronto pra finalizar o cadastro."}
          </p>
        )}
      </section>

      {/* === Dados pessoais === */}
      <div>
        <label className="label" htmlFor="fullName">
          Nome completo
        </label>
        <input
          id="fullName"
          className="input"
          required
          value={form.fullName}
          onChange={(e) => set("fullName", e.target.value)}
          placeholder="Maria da Silva"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="phone">
            Telefone
          </label>
          <input
            id="phone"
            className="input"
            required
            inputMode="numeric"
            value={form.phone}
            onChange={(e) => set("phone", formatPhone(e.target.value))}
            placeholder="(11) 99999-9999"
          />
        </div>
        <div>
          <label className="label" htmlFor="cpf">
            CPF
          </label>
          <input
            id="cpf"
            className="input"
            required
            inputMode="numeric"
            value={form.cpf}
            onChange={(e) => set("cpf", formatCPF(e.target.value))}
            placeholder="000.000.000-00"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="email">
            E-mail
          </label>
          <input
            id="email"
            type="email"
            className="input"
            required
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder="voce@email.com"
          />
        </div>
        <div>
          <label className="label" htmlFor="birthDate">
            Data de nascimento
          </label>
          <input
            id="birthDate"
            type="date"
            className="input"
            required
            value={form.birthDate}
            onChange={(e) => set("birthDate", e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="password">
          Senha
        </label>
        <input
          id="password"
          type="password"
          className="input"
          required
          minLength={6}
          value={form.password}
          onChange={(e) => set("password", e.target.value)}
          placeholder="Mínimo 6 caracteres"
        />
      </div>

      {error && (
        <p className="rounded-lg bg-red-500/12 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      )}

      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? "Cadastrando..." : "Criar conta e palpitar"}
      </button>

      <p className="text-center text-sm text-slate-400">
        Já tem conta?{" "}
        <Link
          href={`/${tenantSlug}/login`}
          className="font-semibold text-brand"
        >
          Entrar
        </Link>
      </p>
    </form>
  );
}
