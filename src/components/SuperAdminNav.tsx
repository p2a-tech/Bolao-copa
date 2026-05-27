"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/superadmin", label: "Clientes" },
  { href: "/superadmin/dashboard", label: "Estatísticas" },
  { href: "/superadmin/ao-vivo", label: "Ao vivo" },
];

export function SuperAdminNav() {
  const pathname = usePathname();
  return (
    <nav className="mb-6 flex gap-2 border-b border-slate-800">
      {TABS.map((tab) => {
        const active =
          pathname === tab.href ||
          (tab.href !== "/superadmin" && pathname.startsWith(tab.href));
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={
              "rounded-t-lg px-4 py-2 text-sm font-semibold transition " +
              (active
                ? "bg-slate-900 text-slate-100 ring-1 ring-white/10"
                : "text-slate-400 hover:text-slate-200")
            }
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
