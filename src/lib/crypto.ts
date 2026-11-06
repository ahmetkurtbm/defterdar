import { createHash, createHmac, randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

const scrypt = promisify(scryptCb) as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>;

const KEY_LENGTH = 64;

/** `scrypt$<salt>$<hash>` biçiminde, base64url. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, KEY_LENGTH);
  return `scrypt$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, saltText, keyText] = stored.split("$");
  if (scheme !== "scrypt" || !saltText || !keyText) return false;
  const expected = Buffer.from(keyText, "base64url");
  const actual = await scrypt(password, Buffer.from(saltText, "base64url"), expected.length);
  return timingSafeEqual(actual, expected);
}

/** Linklerde ve çerezlerde kullanılan tahmin edilemez token. */
export function randomToken(bytes = 24): string {
  return randomBytes(bytes).toString("base64url");
}

export function sha256(input: string | Buffer): string {
  return createHash("sha256").update(input).digest("hex");
}

let cachedSecret: string | null = null;

/**
 * Uygulama sırrı. Üretimde DEFTERDAR_SECRET zorunlu; geliştirmede `.data/secret` dosyasında
 * bir kez üretilip saklanır ki portal linkleri yeniden başlatmada değişmesin.
 */
export function appSecret(): string {
  if (cachedSecret) return cachedSecret;
  const fromEnv = process.env.DEFTERDAR_SECRET;
  if (fromEnv && fromEnv.length >= 32) return (cachedSecret = fromEnv);
  if (process.env.NODE_ENV === "production") {
    throw new Error("DEFTERDAR_SECRET en az 32 karakter olmalı.");
  }
  const dir = path.join(process.cwd(), ".data");
  const file = path.join(dir, "secret");
  try {
    cachedSecret = readFileSync(file, "utf8").trim();
  } catch {
    cachedSecret = randomBytes(32).toString("hex");
    mkdirSync(dir, { recursive: true });
    writeFileSync(file, cachedSecret, { mode: 0o600 });
  }
  return cachedSecret;
}

/** Mükellefin portal token'ı: saklanmaz, her seferinde sırdan türetilir. */
export function portalToken(clientId: string, version: number): string {
  return createHmac("sha256", appSecret()).update(`portal:${clientId}:${version}`).digest("base64url").slice(0, 32);
}
