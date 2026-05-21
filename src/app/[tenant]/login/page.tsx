import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getTenantBySlug } from "@/lib/tenant";
import { LoginForm } from "@/components/LoginForm";

export default async function TenantLoginPage({
  params,
  searchParams,
}: {
  params: { tenant: string };
  searchParams: { next?: string };
}) {
  const tenant = await getTenantBySlug(params.tenant);
  if (!tenant) notFound();

  const session = await getSession();
  if (session && session.tenantSlug === tenant.slug) {
    redirect(`/${tenant.slug}/palpites`);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-md">
        <Link
          href={`/${tenant.slug}`}
          className="mb-6 block text-center text-2xl font-extrabold text-brand"
        >
          🏆 {tenant.name}
        </Link>
        <div className="card p-6">
          <h1 className="mb-1 text-xl font-bold">Entrar</h1>
          <p className="mb-5 text-sm text-slate-400">
            Acesse para dar seus palpites.
          </p>
          <LoginForm
            tenantSlug={tenant.slug}
            next={searchParams.next ?? `/${tenant.slug}/palpites`}
          />
        </div>
      </div>
    </main>
  );
}
