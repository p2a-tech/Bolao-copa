import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function RootLanding() {
  const session = await getSession();
  if (session?.isSuperAdmin) redirect("/superadmin");
  if (session?.tenantSlug) redirect(`/${session.tenantSlug}/palpites`);

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 text-white">
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-4xl font-extrabold leading-tight md:text-5xl">
          Plataforma <span className="text-gold">whitelabel</span> de bolão
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-white/70">
          Crie seu próprio bolão da Copa do Mundo 2026, com sua marca, seus
          patrocinadores e sua comunidade. Tecnologia pronta — você foca em
          engajar.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/superadmin/login"
            className="btn bg-white text-slate-900 hover:bg-slate-100"
          >
            Acessar painel do operador
          </Link>
          <Link
            href="/demo"
            className="btn bg-white/10 text-white ring-1 ring-white/30 hover:bg-white/20"
          >
            Ver bolão de demonstração
          </Link>
        </div>
        <p className="mt-10 text-sm text-white/50">
          Cada cliente acessa em <code className="rounded bg-white/10 px-1">/seu-slug</code>.
        </p>
      </div>
    </main>
  );
}
