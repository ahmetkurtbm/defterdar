import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";

import { randomToken, sha256 } from "@/lib/crypto";
import { asSystem } from "@/lib/db/engine";

export const SESSION_COOKIE = "dd_session";
const SESSION_TTL_MS = 14 * 24 * 60 * 60 * 1000;

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: "owner" | "staff";
  officeId: string;
  officeName: string;
  collectionDay: number;
};

export async function createSession(userId: string): Promise<void> {
  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await asSystem((tx) =>
    tx.query("insert into sessions (token_hash, user_id, expires_at) values ($1, $2, $3)", [
      sha256(token),
      userId,
      expiresAt,
    ]),
  );
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await asSystem((tx) => tx.query("delete from sessions where token_hash = $1", [sha256(token)]));
  }
  store.delete(SESSION_COOKIE);
}

/** Oturumdaki kullanıcı; yoksa null. Aynı istek içinde bir kez sorgulanır. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  // Oturum ve tarih hesapları her istekte yapılır; ön render'a girmez.
  await connection();
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const { rows } = await asSystem((tx) =>
    tx.query<{
      id: string;
      name: string;
      email: string;
      role: "owner" | "staff";
      office_id: string;
      office_name: string;
      collection_day: number;
    }>(
      `select u.id, u.name, u.email, u.role, u.office_id, o.name as office_name, o.collection_day
         from sessions s
         join users u on u.id = s.user_id
         join offices o on o.id = u.office_id
        where s.token_hash = $1 and s.expires_at > now()`,
      [sha256(token)],
    ),
  );
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    officeId: row.office_id,
    officeName: row.office_name,
    collectionDay: Number(row.collection_day),
  };
});

/** Oturum zorunlu sayfa ve aksiyonlar için. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/giris");
  return user;
}
