"use client";

import { useRef, useState } from "react";
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);

  // Master único — ao editar, exclui o próprio do check.
  const existingMaster = sponsors.find(
    (s) => s.placement === "global" && s.id !== editingId
  );
  const masterBlocked = !!existingMaster && form.placement === "global";

  const isEditing = editingId !== null;

  function set<K extends keyof typeof EMPTY>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function resetForm() {
    setForm(EMPTY);
    setEditingId(null);
    setError("");
    setOk("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function startEdit(s: Sponsor) {
    setForm({
      name: s.name,
      logoUrl: s.logoUrl,
      linkUrl: s.linkUrl ?? "",
      placement: s.placement,
    });
    setEditingId(s.id);
    setError("");
    setOk("");
    // Rola até o formulário pra o usuário ver
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setOk("");
    setUploading(true);

    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: fd,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || "Falha no upload.");
        return;
      }
      set("logoUrl", json.url);
      setOk("Imagem enviada com sucesso.");
    } catch {
      setError("Falha de conexão durante upload.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setOk("");
    try {
      const url = "/api/admin/sponsors";
      const method = isEditing ? "PATCH" : "POST";
      const body = isEditing ? { id: editingId, ...form } : form;
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Erro ao salvar patrocinador.");
        return;
      }
      resetForm();
      setOk(isEditing ? "Patrocinador atualizado." : "Patrocinador cadastrado.");
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
    if (res.ok) {
      // Se estava editando esse, sai do modo edição
      if (editingId === id) resetForm();
      router.refresh();
    } else {
      setError("Erro ao excluir patrocinador.");
    }
  }

  function clearLogo() {
    set("logoUrl", "");
    if (fileInputRef.current) fileInputRef.current.value = "";
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
        ref={formRef}
        onSubmit={submit}
        className="mb-6 grid grid-cols-1 gap-3 rounded-xl border border-white/5 bg-slate-950/40 p-4 sm:grid-cols-2"
      >
        <div className="sm:col-span-2 mb-1 flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-300">
            {isEditing ? "Editando patrocinador" : "Novo patrocinador"}
          </h3>
          {isEditing && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg border border-slate-700 px-3 py-1 text-xs hover:bg-slate-800"
            >
              Cancelar edição
            </button>
          )}
        </div>

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
            <option value="global">
              {existingMaster
                ? "Global (Master) — já existe um cadastrado"
                : "Global (Master)"}
            </option>
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className="label">Logo do patrocinador</label>

          {form.logoUrl ? (
            <div className="mb-3 flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-900 p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={form.logoUrl}
                alt="Preview do logo"
                className="h-14 w-28 shrink-0 rounded bg-slate-950 object-contain ring-1 ring-white/10"
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs text-slate-400">
                  {form.logoUrl}
                </div>
                <div className="mt-1 flex gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="rounded-lg border border-slate-700 px-2 py-1 text-xs hover:bg-slate-800 disabled:opacity-40"
                  >
                    {uploading ? "Enviando..." : "Trocar"}
                  </button>
                  <button
                    type="button"
                    onClick={clearLogo}
                    className="rounded-lg border border-red-500/30 px-2 py-1 text-xs text-red-400 hover:bg-red-500/10"
                  >
                    Remover
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="btn-ghost text-sm"
              >
                {uploading ? "📤 Enviando..." : "📤 Fazer upload da imagem"}
              </button>
              <span className="text-xs text-slate-400">
                PNG, JPG, WebP, SVG ou GIF — até 5 MB
              </span>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml,image/gif"
            onChange={handleUpload}
            className="hidden"
          />

          <details className="text-sm text-slate-400">
            <summary className="cursor-pointer select-none hover:text-slate-300">
              Prefere colar uma URL externa? Clique aqui
            </summary>
            <input
              className="input mt-2"
              type="text"
              value={form.logoUrl}
              onChange={(e) => set("logoUrl", e.target.value)}
              placeholder="https://.../logo.png"
            />
          </details>
        </div>

        <div className="sm:col-span-2">
          <label className="label">Link (opcional)</label>
          <input
            className="input"
            type="url"
            value={form.linkUrl}
            onChange={(e) => set("linkUrl", e.target.value)}
            placeholder="https://site-do-patrocinador.com"
          />
        </div>

        {masterBlocked && (
          <div className="sm:col-span-2 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
            <span aria-hidden>⚠️</span>
            <span>
              Não é possível cadastrar outro patrocinador Master porque já
              existe um cadastrado{" "}
              <strong>({existingMaster!.name})</strong>. Se quiser adicionar
              outro, exclua o existente na lista abaixo.
            </span>
          </div>
        )}

        <div className="sm:col-span-2 flex items-center gap-3">
          <button
            type="submit"
            disabled={busy || uploading || !form.logoUrl || masterBlocked}
            className="btn-primary"
          >
            {busy
              ? isEditing
                ? "Salvando..."
                : "Cadastrando..."
              : isEditing
                ? "Salvar alterações"
                : "Cadastrar patrocinador"}
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
          {sponsors.map((s) => {
            const isThisEditing = editingId === s.id;
            return (
              <li
                key={s.id}
                className={`flex items-center gap-3 py-3 ${
                  isThisEditing ? "rounded-lg bg-brand/5 px-3" : ""
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={s.logoUrl}
                  alt={s.name}
                  className="h-10 w-24 shrink-0 rounded bg-slate-900 object-contain ring-1 ring-white/10"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 truncate font-semibold">
                    {s.name}
                    {isThisEditing && (
                      <span className="rounded bg-brand/20 px-1.5 py-0.5 text-[10px] font-medium uppercase text-brand">
                        editando
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span
                      className={`rounded px-1.5 py-0.5 font-medium ${
                        s.placement === "global"
                          ? "bg-emerald-500/15 text-emerald-300"
                          : "bg-slate-800 text-slate-300"
                      }`}
                    >
                      {s.placement === "global"
                        ? "Global (Master)"
                        : "Por jogo"}
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
                  onClick={() => startEdit(s)}
                  disabled={isThisEditing}
                  className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm hover:bg-slate-800 disabled:opacity-40"
                >
                  Editar
                </button>
                <button
                  onClick={() => remove(s.id, s.name)}
                  className="rounded-lg border border-red-500/30 px-3 py-1.5 text-sm text-red-400 hover:bg-red-500/10"
                >
                  Excluir
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
