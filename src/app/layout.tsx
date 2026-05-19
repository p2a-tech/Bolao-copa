import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bolão da Copa 2026",
  description:
    "Dê seus palpites nos jogos da Copa do Mundo, dispute o ranking e ganhe prêmios.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
