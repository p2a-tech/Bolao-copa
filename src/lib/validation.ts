import { z } from "zod";

/** Validates a Brazilian CPF (with or without mask). */
export function isValidCPF(value: string): boolean {
  const cpf = value.replace(/\D/g, "");
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false; // all same digits

  const calcCheck = (len: number): number => {
    let sum = 0;
    for (let i = 0; i < len; i++) {
      sum += parseInt(cpf[i], 10) * (len + 1 - i);
    }
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };

  return (
    calcCheck(9) === parseInt(cpf[9], 10) &&
    calcCheck(10) === parseInt(cpf[10], 10)
  );
}

export function onlyDigits(v: string): string {
  return v.replace(/\D/g, "");
}

export function formatCPF(v: string): string {
  const d = onlyDigits(v).slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

export function formatPhone(v: string): string {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 10) {
    return d
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }
  return d
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}

export const registerSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(5, "Informe seu nome completo")
    .refine((v) => v.split(/\s+/).length >= 2, "Informe nome e sobrenome"),
  phone: z
    .string()
    .transform(onlyDigits)
    .refine((v) => v.length >= 10 && v.length <= 11, "Telefone inválido"),
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
  birthDate: z
    .string()
    .refine((v) => !Number.isNaN(Date.parse(v)), "Data de nascimento inválida")
    .refine((v) => {
      const d = new Date(v);
      const age =
        (Date.now() - d.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
      return age >= 16 && age <= 120;
    }, "Você precisa ter pelo menos 16 anos"),
  cpf: z
    .string()
    .transform(onlyDigits)
    .refine(isValidCPF, "CPF inválido"),
  password: z.string().min(6, "A senha deve ter ao menos 6 caracteres"),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
  password: z.string().min(1, "Informe sua senha"),
});

export const predictionSchema = z.object({
  matchId: z.string().min(1),
  homeScore: z.number().int().min(0).max(99),
  awayScore: z.number().int().min(0).max(99),
});

export const sponsorSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do patrocinador"),
  logoUrl: z.string().trim().url("URL do logo inválida"),
  linkUrl: z
    .string()
    .trim()
    .url("Link inválido")
    .optional()
    .or(z.literal("")),
  placement: z.enum(["global", "match"]).default("match"),
});
