import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const slug = "samba-de-rei";
  const name = "Bolão da Copa - Samba de Rei";
  const logoUrl = "/Samba de rei.png";
  const primaryColor = "#E96666"; // coral/vermelho do fundo da imagem Samba de Rei

  const tenant = await prisma.tenant.upsert({
    where: { slug },
    create: {
      slug,
      name,
      primaryColor,
      logoUrl,
      landingTitle: name,
      landingSubtitle:
        "Palpite em todos os jogos da Copa, dispute o ranking ao vivo e concorra a prêmios.",
      welcomeMessage:
        "Bem-vindo ao Bolão da Copa — Samba de Rei! Boa sorte e bons palpites.",
      active: true,
    },
    update: {
      name,
      logoUrl,
      primaryColor,
    },
  });
  console.log("✔ Tenant criado/atualizado:");
  console.log("  slug:", tenant.slug);
  console.log("  name:", tenant.name);
  console.log("  logoUrl:", tenant.logoUrl);
  console.log("  primaryColor:", tenant.primaryColor);

  const existingAdmin = await prisma.user.findFirst({
    where: { tenantId: tenant.id, isAdmin: true },
  });

  if (existingAdmin) {
    console.log("");
    console.log("ℹ Admin já existe pra esse tenant:");
    console.log("  email:", existingAdmin.email);
    console.log("  (use a senha que você definiu)");
    return;
  }

  const adminEmail = "admin@sambaderei.com";
  const adminPassword = "admin123";

  await prisma.user.create({
    data: {
      tenantId: tenant.id,
      fullName: "Administrador Samba de Rei",
      phone: "11988887777",
      email: adminEmail,
      cpf: "12345678901", // ⚠️ CPF não-validado; ajuste se quiser válido
      birthDate: new Date("1990-01-01"),
      passwordHash: await bcrypt.hash(adminPassword, 10),
      isAdmin: true,
    },
  });

  console.log("");
  console.log("✔ Admin criado:");
  console.log("  email:", adminEmail);
  console.log("  senha:", adminPassword);
  console.log("");
  console.log("🌐 Acesse:");
  console.log("  /samba-de-rei          — landing page");
  console.log("  /samba-de-rei/login    — login do admin");
}

main()
  .catch((e) => {
    console.error("✗ Erro:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
