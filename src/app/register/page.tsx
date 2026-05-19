import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { RegisterForm } from "@/components/RegisterForm";

export default async function RegisterPage() {
  const session = await getSession();
  if (session) redirect("/palpites");

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <div className="w-full max-w-lg">
        <Link
          href="/"
          className="mb-6 block text-center text-2xl font-extrabold text-brand-dark"
        >
          🏆 Bolão da Copa <span className="text-gold">2026</span>
        </Link>
        <div className="card p-6">
          <h1 className="mb-1 text-xl font-bold">Criar conta</h1>
          <p className="mb-5 text-sm text-slate-500">
            Preencha seus dados para começar a palpitar.
          </p>
          <RegisterForm />
        </div>
      </div>
    </main>
  );
}
