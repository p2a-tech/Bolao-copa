import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { LoginForm } from "@/components/LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  const session = await getSession();
  if (session) redirect("/palpites");

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="mb-6 block text-center text-2xl font-extrabold text-brand-dark"
        >
          🏆 Bolão da Copa <span className="text-gold">2026</span>
        </Link>
        <div className="card p-6">
          <h1 className="mb-1 text-xl font-bold">Entrar</h1>
          <p className="mb-5 text-sm text-slate-500">
            Acesse para dar seus palpites.
          </p>
          <LoginForm next={searchParams.next ?? "/palpites"} />
        </div>
        <p className="mt-4 text-center text-xs text-slate-400">
          Conta de teste: admin@bolao.com / admin123
        </p>
      </div>
    </main>
  );
}
