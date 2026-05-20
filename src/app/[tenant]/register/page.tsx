import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getTenantBySlug } from "@/lib/tenant";
import { RegisterForm } from "@/components/RegisterForm";

export default async function TenantRegisterPage({
  params,
}: {
  params: { tenant: string };
}) {
  const tenant = await getTenantBySlug(params.tenant);
  if (!tenant) notFound();

  const session = await getSession();
  if (session && session.tenantSlug === tenant.slug) {
    redirect(`/${tenant.slug}/palpites`);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <div className="w-full max-w-lg">
        <Link
          href={`/${tenant.slug}`}
          className="mb-6 block text-center text-2xl font-extrabold text-brand-dark"
        >
          🏆 {tenant.name}
        </Link>
        <div className="card p-6">
          <h1 className="mb-1 text-xl font-bold">Criar conta</h1>
          <p className="mb-5 text-sm text-slate-500">
            Preencha seus dados para começar a palpitar.
          </p>
          <RegisterForm tenantSlug={tenant.slug} />
        </div>
      </div>
    </main>
  );
}
