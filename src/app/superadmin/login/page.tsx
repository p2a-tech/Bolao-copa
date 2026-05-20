import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { LoginForm } from "@/components/LoginForm";

export default async function SuperAdminLoginPage() {
  const session = await getSession();
  if (session?.isSuperAdmin) redirect("/superadmin");

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-900 px-4 py-10 text-white">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="mb-6 block text-center text-2xl font-extrabold"
        >
          Operador do SaaS
        </Link>
        <div className="rounded-xl bg-white p-6 text-slate-800 shadow-xl ring-1 ring-slate-200">
          <h1 className="mb-1 text-xl font-bold">Entrar como operador</h1>
          <p className="mb-5 text-sm text-slate-500">
            Acesso exclusivo do operador da plataforma (você).
          </p>
          <LoginForm next="/superadmin" />
        </div>
      </div>
    </main>
  );
}
