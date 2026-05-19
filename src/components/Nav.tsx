import Link from "next/link";
import { getSession } from "@/lib/auth";
import { LogoutButton } from "./LogoutButton";

export async function Nav({ active }: { active?: string }) {
  const session = await getSession();

  const links = [
    { href: "/palpites", label: "Palpites" },
    { href: "/ranking", label: "Ranking" },
  ];
  if (session?.isAdmin) links.push({ href: "/admin", label: "Admin" });

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/palpites" className="flex items-center gap-2">
          <span className="text-xl">🏆</span>
          <span className="font-extrabold tracking-tight text-brand-dark">
            Bolão da Copa <span className="text-gold">2026</span>
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                active === l.href
                  ? "bg-brand text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {l.label}
            </Link>
          ))}
          {session && (
            <div className="ml-3 flex items-center gap-3 border-l border-slate-200 pl-3">
              <span className="hidden text-sm text-slate-500 sm:inline">
                {session.name.split(" ")[0]}
              </span>
              <LogoutButton />
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
