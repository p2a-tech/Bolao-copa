"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton({ tenantSlug }: { tenantSlug?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push(tenantSlug ? `/${tenantSlug}/login` : "/");
    router.refresh();
  }

  return (
    <button
      onClick={logout}
      disabled={loading}
      className="text-sm font-medium text-slate-500 hover:text-slate-800"
    >
      {loading ? "Saindo..." : "Sair"}
    </button>
  );
}
