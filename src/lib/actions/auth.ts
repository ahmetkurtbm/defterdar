"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { createSession, destroySession } from "@/lib/auth/session";
import { hashPassword, verifyPassword } from "@/lib/crypto";
import { asSystem } from "@/lib/db/engine";
import { installDefaultDocumentTypes } from "@/lib/document-types";
import { rateLimit } from "@/lib/rate-limit";

export type FormState = { error?: string; fieldErrors?: Record<string, string>; values?: Record<string, string> } | undefined;

const LoginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Geçerli bir e-posta girin."),
  password: z.string().min(1, "Şifrenizi girin."),
});

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = LoginSchema.safeParse(Object.fromEntries(formData));
  const values = { email: String(formData.get("email") ?? "") };
  if (!parsed.success) return { fieldErrors: flatten(parsed.error), values };

  const { email, password } = parsed.data;
  if (!rateLimit(`login:${email}`, 8, 15 * 60_000)) {
    return { error: "Çok fazla deneme yapıldı. 15 dakika sonra tekrar deneyin.", values };
  }

  const { rows } = await asSystem((tx) =>
    tx.query<{ id: string; password_hash: string }>("select id, password_hash from users where lower(email) = $1", [email]),
  );
  const user = rows[0];
  // Kullanıcı yoksa da hash doğrulaması yapılır ki yanıt süresi e-postanın varlığını ele vermesin.
  const ok = await verifyPassword(password, user?.password_hash ?? "scrypt$AAAAAAAAAAAAAAAAAAAAAA$" + "A".repeat(86));
  if (!user || !ok) return { error: "E-posta veya şifre hatalı.", values };

  await createSession(user.id);
  redirect("/pano");
}

const RegisterSchema = z.object({
  officeName: z.string().trim().min(2, "Ofis adını girin.").max(120),
  name: z.string().trim().min(2, "Adınızı girin.").max(120),
  email: z.string().trim().toLowerCase().email("Geçerli bir e-posta girin."),
  password: z.string().min(10, "Şifre en az 10 karakter olmalı.").max(200),
});

export async function register(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = RegisterSchema.safeParse(Object.fromEntries(formData));
  const values = {
    officeName: String(formData.get("officeName") ?? ""),
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
  };
  if (!parsed.success) return { fieldErrors: flatten(parsed.error), values };
  const { officeName, name, email, password } = parsed.data;

  const passwordHash = await hashPassword(password);
  const userId = await asSystem(async (tx) => {
    const taken = await tx.query("select 1 from users where lower(email) = $1", [email]);
    if (taken.rows.length > 0) return null;
    const { rows: [office] } = await tx.query<{ id: string }>("insert into offices (name) values ($1) returning id", [officeName]);
    await installDefaultDocumentTypes(tx, office.id);
    const { rows: [user] } = await tx.query<{ id: string }>(
      "insert into users (office_id, email, name, password_hash, role) values ($1, $2, $3, $4, 'owner') returning id",
      [office.id, email, name, passwordHash],
    );
    return user.id;
  });
  if (!userId) return { fieldErrors: { email: "Bu e-posta ile kayıtlı bir hesap var." }, values };

  await createSession(userId);
  redirect("/pano");
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/giris");
}

function flatten(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}
