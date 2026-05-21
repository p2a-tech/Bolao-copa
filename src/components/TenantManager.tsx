"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Tenant = {
  id: string;
  slug: string;
  name: string;
  primaryColor: string;
  logoUrl: string | null;
  active: boolean;
  users: number;
  sponsors: number;
  createdAt: string;
};

const EMPTY = {
  slug: "",
  name: "",
  primaryColor: "#00875A",
  logoUrl: "",
  landingTitle: "",
  landingSubtitle: "",
  welcomeMessage: "",
  adminEmail: "",
  adminPassword: "",
  adminFullName: "",
  adminPhone: "",
  adminCpf: "",
};

export function TenantManager({ tenants }: { tenants: Tenant[] }) {
  const router = useRouter();
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);

  function set<K extends keyof typeof EMPTY>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/superadmin/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Erro ao criar cliente.");
        return;
      }
      setForm(EMPTY);
      setOpen(false);
      router.refresh();
    } catch {
      setError("Falha de conexão.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(id: string, active: boolean) {
    await fetch("/api/superadmin/tenants", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, active: !active }),
    });
    router.refresh();
  }

  async function remove(id: string, name: string) {
    if (
      !window.confirm(
        `Excluir o cliente "${name}"? Todos os usuários e patrocinadores dele serão removidos. Esta ação não pode ser desfeita.`
      )
    ) {
      return;
    }
    await fetch("/api/superadmin/tenants", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    router.refresh();
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm text-slate-400">
          {tenants.length} cliente(s) cadastrado(s).
        </span>
        <button
          onClick={() => setOpen((v) => !v)}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          {open ? "Fechar formulário" : "+ Novo cliente"}
        </button>
      </div>

      {open && (
        <form
          onSubmit={create}
          className="mb-8 grid grid-cols-1 gap-3 rounded-xl bg-slate-900 p-5 ring-1 ring-white/10 sm:grid-cols-2"
        >
          <h3 className="sm:col-span-2 text-lg font-bold">Novo cliente</h3>

          <div>
            <label className="label">Slug (URL)</label>
            <input
              className="input"
              value={form.slug}
              onChange={(e) =>
                set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
              }
              placeholder="casimito"
              required
              pattern="[a-z0-9-]+"
            />
            <p className="mt-1 text-xs text-slate-400">
              Acessível em <code>/{form.slug || "slug"}</code>
            </p>
          </div>
          <div>
            <label className="label">Nome de exibição</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Bolão do Casimito"
              required
            />
          </div>

          <div>
            <label className="label">Cor primária</label>
            <input
              type="color"
              className="input h-11"
              value={form.primaryColor}
              onChange={(e) => set("primaryColor", e.target.value)}
            />
          </div>
          <div>
            <label className="label">URL do logo (opcional)</label>
            <input
              type="url"
              className="input"
              value={form.logoUrl}
              onChange={(e) => set("logoUrl", e.target.value)}
              placeholder="https://.../logo.png"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="label">Título da landing</label>
            <input
              className="input"
              value={form.landingTitle}
              onChange={(e) => set("landingTitle", e.target.value)}
              placeholder="Bolão da Copa do Casimito"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Subtítulo</label>
            <input
              className="input"
              value={form.landingSubtitle}
              onChange={(e) => set("landingSubtitle", e.target.value)}
              placeholder="Palpite com a galera e dispute prêmios."
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Mensagem de boas-vindas</label>
            <input
              className="input"
              value={form.welcomeMessage}
              onChange={(e) => set("welcomeMessage", e.target.value)}
              placeholder="Bem-vindo ao bolão! Boa sorte!"
            />
          </div>

          <h4 className="sm:col-span-2 mt-2 text-sm font-bold uppercase tracking-wide text-slate-400">
            Conta do admin do bolão
          </h4>
          <div>
            <label className="label">Nome completo</label>
            <input
              className="input"
              value={form.adminFullName}
              onChange={(e) => set("adminFullName", e.target.value)}
              placeholder="Admin do Cliente"
              required
            />
          </div>
          <div>
            <label className="label">E-mail</label>
            <input
              type="email"
              className="input"
              value={form.adminEmail}
              onChange={(e) => set("adminEmail", e.target.value)}
              placeholder="admin@cliente.com"
              required
            />
          </div>
          <div>
            <label className="label">Telefone</label>
            <input
              className="input"
              value={form.adminPhone}
              onChange={(e) => set("adminPhone", e.target.value)}
              placeholder="11999999999"
              required
            />
          </div>
          <div>
            <label className="label">CPF</label>
            <input
              className="input"
              value={form.adminCpf}
              onChange={(e) => set("adminCpf", e.target.value)}
              placeholder="000.000.000-00"
              required
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Senha inicial</label>
            <input
              type="text"
              className="input"
              value={form.adminPassword}
              onChange={(e) => set("adminPassword", e.target.value)}
              placeholder="Mínimo 6 caracteres"
              required
              minLength={6}
            />
          </div>

          <div className="sm:col-span-2 flex items-center gap-3">
            <button type="submit" disabled={busy} className="btn-primary">
              {busy ? "Criando..." : "Criar cliente"}
            </button>
            {error && <span className="text-sm text-red-400">{error}</span>}
          </div>
        </form>
      )}

      {tenants.length === 0 ? (
        <p className="text-sm text-slate-400">Nenhum cliente cadastrado ainda.</p>
      ) : (
        <ul className="divide-y divide-white/10 rounded-xl bg-slate-900 ring-1 ring-white/10">
          {tenants.map((t) => (
            <li key={t.id} className="flex items-center gap-4 px-4 py-3">
              <span
                className="h-10 w-10 shrink-0 rounded-lg ring-1 ring-black/10"
                style={{ background: t.primaryColor }}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-100">{t.name}</span>
                  {!t.active && (
                    <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-xs font-medium text-amber-300">
                      suspenso
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-400">
                  <Link
                    href={`/${t.slug}`}
                    target="_blank"
                    className="text-brand hover:underline"
                  >
                    /{t.slug}
                  </Link>
                  {" · "}
                  {t.users} usuário(s) · {t.sponsors} patrocinador(es)
                </div>
              </div>
              <button
                onClick={() => toggleActive(t.id, t.active)}
                className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm hover:bg-slate-800"
              >
                {t.active ? "Suspender" : "Reativar"}
              </button>
              <button
                onClick={() => remove(t.id, t.name)}
                className="rounded-lg border border-red-500/30 px-3 py-1.5 text-sm text-red-400 hover:bg-red-500/12"
              >
                Excluir
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
