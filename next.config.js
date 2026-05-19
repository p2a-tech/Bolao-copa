/** @type {import('next').NextConfig} */
const DB = ["./prisma/dev.db"];

const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Ensure the seeded SQLite file is bundled into the serverless
    // functions that talk to the database (Vercel UI demo).
    outputFileTracingIncludes: {
      "/": DB,
      "/palpites": DB,
      "/ranking": DB,
      "/admin": DB,
      "/login": DB,
      "/register": DB,
      "/api/auth/login": DB,
      "/api/auth/register": DB,
      "/api/auth/logout": DB,
      "/api/predictions": DB,
      "/api/admin/result": DB,
      "/api/admin/sponsor": DB,
    },
  },
};

module.exports = nextConfig;
