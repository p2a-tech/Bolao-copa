import "server-only";
import { cache } from "react";
import { prisma } from "./prisma";

export type TenantContext = {
  id: string;
  slug: string;
  name: string;
  primaryColor: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  landingTitle: string | null;
  landingSubtitle: string | null;
  welcomeMessage: string | null;
  active: boolean;
};

/** Per-request cached tenant lookup by slug. Returns null if not found or inactive. */
export const getTenantBySlug = cache(
  async (slug: string): Promise<TenantContext | null> => {
    const t = await prisma.tenant.findUnique({ where: { slug } });
    if (!t || !t.active) return null;
    return {
      id: t.id,
      slug: t.slug,
      name: t.name,
      primaryColor: t.primaryColor,
      logoUrl: t.logoUrl,
      faviconUrl: t.faviconUrl,
      landingTitle: t.landingTitle,
      landingSubtitle: t.landingSubtitle,
      welcomeMessage: t.welcomeMessage,
      active: t.active,
    };
  }
);

export function tenantHref(slug: string, path: string): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return clean === "/" ? `/${slug}` : `/${slug}${clean}`;
}

/** "#00875A" -> "0 135 90" (space-separated RGB triplet for Tailwind's <alpha-value>). */
export function hexToRgbTriplet(hex: string): string {
  const h = hex.replace("#", "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return "0 135 90";
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `${r} ${g} ${b}`;
}

export function shadeRgbTriplet(hex: string, factor: number): string {
  const h = hex.replace("#", "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return "0 135 90";
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  const r = clamp(parseInt(h.slice(0, 2), 16) * factor);
  const g = clamp(parseInt(h.slice(2, 4), 16) * factor);
  const b = clamp(parseInt(h.slice(4, 6), 16) * factor);
  return `${r} ${g} ${b}`;
}
