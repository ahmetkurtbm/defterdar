import "server-only";

import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

// Belgeler şimdilik yerel diskte. Bulut depolamaya geçişte yalnızca bu modül değişir;
// veritabanı `storage_key` dışında bir yol bilmez.
// Çalışma anı klasörü; derleme izleyicisi bunu pakete dahil etmeye çalışmasın.
const ROOT = path.resolve(/*turbopackIgnore: true*/ process.env.DEFTERDAR_STORAGE_DIR ?? path.join(process.cwd(), ".data", "uploads"));

function resolveKey(key: string): string {
  const full = path.resolve(/*turbopackIgnore: true*/ ROOT, key);
  if (!full.startsWith(ROOT + path.sep)) throw new Error("Geçersiz depolama anahtarı");
  return full;
}

export async function putObject(key: string, bytes: Buffer): Promise<void> {
  const full = resolveKey(key);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, bytes, { flag: "wx" });
}

export async function deleteObject(key: string): Promise<void> {
  await rm(resolveKey(key), { force: true });
}

/** Dosya yoksa null (ör. demo kayıtları). */
export async function getObject(key: string): Promise<Buffer | null> {
  try {
    return await readFile(resolveKey(key));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}
