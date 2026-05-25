import Link from "next/link";
import { getSession } from "@/lib/auth";
import { LogoutButton } from "./LogoutButton";

export async function Nav({
  active,
  tenantSlug,
  tenantName,
}: {
  active?: string;
  tenantSlug: string;
  tenantName: string;
}) {
  const session = await getSession();

  const links = [
    { href: `/${tenantSlug}/palpites`, key: "/palpites", label: "Palpites" },
    {
      href: `/${tenantSlug}/meus-palpites`,
      key: "/meus-palpites",
      label: "Meus palpites",
    },
    { href: `/${tenantSlug}/grupos`, key: "/grupos", label: "Grupos" },
    { href: `/${tenantSlug}/ranking`, key: "/ranking", label: "Ranking" },
  ];
  if (session?.isAdmin && session.tenantSlug === tenantSlug) {
    links.push({
      href: `/${tenantSlug}/admin`,
      key: "/admin",
      label: "Admin",
    });
  }

  return (
    <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-900/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link
          href={`/${tenantSlug}/palpites`}
          className="flex items-center gap-2"
        >
          <span className="text-xl">🏆</span>
          <span className="font-extrabold tracking-tight text-brand">
            {tenantName}
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                active === l.key
                  ? "bg-brand text-white"
                  : "text-slate-300 hover:bg-slate-800"
              }`}
            >
              {l.label}
            </Link>
          ))}
          {session && (
            <div className="ml-3 flex items-center gap-3 border-l border-slate-800 pl-3">
              <span className="hidden text-sm text-slate-400 sm:inline">
                {session.name.split(" ")[0]}
              </span>
              <LogoutButton tenantSlug={tenantSlug} />
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
