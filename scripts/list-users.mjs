import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const url = (process.env.DATABASE_URL || "").replace(/:[^@]+@/, ":***@");
  console.log("DATABASE_URL:", url);
  console.log("");

  const tenants = await prisma.tenant.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, slug: true, name: true, active: true },
  });
  console.log("📦 TENANTS:");
  console.table(tenants);
  console.log("");

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      fullName: true,
      email: true,
      isAdmin: true,
      isSuperAdmin: true,
      tenant: { select: { slug: true } },
    },
    take: 50,
  });
  const rows = users.map((u) => ({
    email: u.email,
    nome: u.fullName,
    tenant: u.tenant?.slug ?? "(super)",
    role: u.isSuperAdmin ? "SUPER" : u.isAdmin ? "ADMIN" : "user",
  }));
  console.log(`👥 USUÁRIOS (${users.length}, primeiros 50):`);
  console.table(rows);
}

main()
  .catch((e) => {
    console.error("✗ Erro:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
