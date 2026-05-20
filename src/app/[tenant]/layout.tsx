import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTenantBySlug, hexToRgbTriplet, shadeRgbTriplet } from "@/lib/tenant";

export async function generateMetadata({
  params,
}: {
  params: { tenant: string };
}): Promise<Metadata> {
  const tenant = await getTenantBySlug(params.tenant);
  if (!tenant) return { title: "Bolão" };
  return {
    title: tenant.name,
    description:
      tenant.landingSubtitle ??
      "Palpite nos jogos da Copa do Mundo, dispute o ranking e ganhe prêmios.",
    icons: tenant.faviconUrl
      ? [{ rel: "icon", url: tenant.faviconUrl }]
      : undefined,
  };
}

export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { tenant: string };
}) {
  const tenant = await getTenantBySlug(params.tenant);
  if (!tenant) notFound();

  const brand = tenant.primaryColor;
  const style = {
    "--brand-rgb": hexToRgbTriplet(brand),
    "--brand-dark-rgb": shadeRgbTriplet(brand, 0.75),
    "--brand-light-rgb": shadeRgbTriplet(brand, 1.3),
  } as React.CSSProperties;

  return <div style={style}>{children}</div>;
}
