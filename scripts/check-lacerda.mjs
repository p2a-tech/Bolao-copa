import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Mostra qual DB está conectado
  const url = process.env.DATABASE_URL || "";
  const masked = url.replace(/:[^@]+@/, ":***@");
  console.log("DATABASE_URL:", masked);
  console.log("");

  const tenant = await prisma.tenant.findUnique({
    where: { slug: "lacerda" },
  });

  if (!tenant) {
    console.log("✗ Tenant 'lacerda' NÃO existe no banco.");
    console.log("");
    console.log("Tenants existentes:");
    const all = await prisma.tenant.findMany({
      select: { slug: true, name: true, logoUrl: true },
    });
    console.table(all);
    return;
  }

  console.log("✔ Tenant 'lacerda' encontrado:");
  console.log("  id:", tenant.id);
  console.log("  name:", tenant.name);
  console.log("  logoUrl:", tenant.logoUrl);
  console.log("  active:", tenant.active);
}

main()
  .catch((e) => {
    console.error("✗ Erro:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
