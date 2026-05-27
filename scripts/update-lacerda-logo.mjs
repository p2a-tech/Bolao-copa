import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.update({
    where: { slug: "lacerda" },
    data: { logoUrl: "/lacerda.png" },
  });
  console.log("✔ Logo atualizado:", tenant.logoUrl);
  console.log("  Tenant:", tenant.name);
}

main()
  .catch((e) => {
    console.error("✗ Erro:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
