"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Sponsor = {
  id: string;
  name: string;
  logoUrl: string;
  linkUrl: string | null;
  placement: string;
};

const EMPTY = {
  name: "",
  logoUrl: "",
  linkUrl: "",
  placement: "match",
};

export function SponsorManager({ sponsors }: { sponsors: Sponsor[] }) {
  const router = useRouter();
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  function set<K extends keyof typeof EMPTY>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setOk("");
    try {
      const res = await fetch("/api/admin/sponsors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Erro ao cadastrar patrocinador.");
        return;
      }
      setForm(EMPTY);
      setOk("Patrocinador cadastrado.");
      router.refresh();
    } catch {
      setError("Falha de conexão.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string, name: string) {
    if (
      !window.confirm(
        `Excluir "${name}"? Ele será removido também dos jogos em que estiver atribuído.`
      )
    ) {
      return;
    }
    const res = await fetch("/api/admin/sponsors", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) router.refresh();
    else setError("Erro ao excluir patrocinador.");
  }

  return (
    <section className="card mb-8 p-5">
      <h2 className="text-lg font-bold">Patrocinadores</h2>
      <p className="mb-4 text-sm text-slate-400">
        Cadastre patrocinadores e atribua-os aos jogos na lista abaixo. O
        patrocinador <strong>global</strong> aparece como Master em todas as
        telas (apenas um é exibido).
      </p>

      <form
        onSubmit={create}
        className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2"
      >
        <div>
          <label className="label">Nome</label>
          <input
            className="input"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Ex.: Banco Patrocinador"
            required
          />
        </div>
        <div>
          <label className="label">Posicionamento</label>
          <select
            className="input"
            value={form.placement}
            onChange={(e) => set("placement", e.target.value)}
          >
            <option value="match">Por jogo</option>
            <option value="global">Global (Master)</option>
          </select>
        </div>
        <div>
          <label className="label">URL do logo</label>
          <input
            className="input"
            type="url"
            value={form.logoUrl}
            onChange={(e) => set("logoUrl", e.target.value)}
            placeholder="https://.../logo.png"
            required
          />
        </div>
        <div>
          <label className="label">Link (opcional)</label>
          <input
            className="input"
            type="url"
            value={form.linkUrl}
            onChange={(e) => set("linkUrl", e.target.value)}
            placeholder="https://site-do-patrocinador.com"
          />
        </div>

        <div className="sm:col-span-2 flex items-center gap-3">
          <button type="submit" disabled={busy} className="btn-primary">
            {busy ? "Cadastrando..." : "Cadastrar patrocinador"}
          </button>
          {error && <span className="text-sm text-red-400">{error}</span>}
          {ok && <span className="text-sm text-emerald-400">{ok}</span>}
        </div>
      </form>

      {sponsors.length === 0 ? (
        <p className="text-sm text-slate-400">
          Nenhum patrocinador cadastrado ainda.
        </p>
      ) : (
        <ul className="divide-y divide-white/10">
          {sponsors.map((s) => (
            <li
              key={s.id}
              className="flex items-center gap-3 py-3"
            >
              <img
                src={s.logoUrl}
                alt={s.name}
                className="h-10 w-24 shrink-0 rounded bg-slate-900 object-contain ring-1 ring-white/10"
              />
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{s.name}</div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span
                    className={`rounded px-1.5 py-0.5 font-medium ${
                      s.placement === "global"
                        ? "bg-emerald-500/15 text-emerald-300"
                        : "bg-slate-800 text-slate-300"
                    }`}
                  >
                    {s.placement === "global" ? "Global (Master)" : "Por jogo"}
                  </span>
                  {s.linkUrl && (
                    <a
                      href={s.linkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate text-brand hover:underline"
                    >
                      {s.linkUrl}
                    </a>
                  )}
                </div>
              </div>
              <button
                onClick={() => remove(s.id, s.name)}
                className="btn-ghost text-sm text-red-400"
              >
                Excluir
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
