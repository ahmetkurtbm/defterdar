import "server-only";

import { randomUUID } from "node:crypto";

import { classifyDocument } from "@/lib/classify";
import { sha256 } from "@/lib/crypto";
import { asOffice } from "@/lib/db/engine";
import type { Period } from "@/lib/period";
import { deleteObject, getObject, putObject } from "@/lib/storage";

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

const ALLOWED: Record<string, string> = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/heic": ".heic",
  "image/heif": ".heif",
  "application/xml": ".xml",
  "text/xml": ".xml",
  "application/zip": ".zip",
  "application/x-zip-compressed": ".zip",
  "application/vnd.ms-excel": ".xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
};

export const ACCEPT_ATTRIBUTE = [...new Set(Object.values(ALLOWED))].join(",") + ",image/*";

/** Dosyanın ilk baytları beyan edilen türle uyuşuyor mu? Tarayıcının söylediği tür güvenilmez. */
function sniff(bytes: Buffer, mimeType: string): boolean {
  const head = bytes.subarray(0, 12);
  const starts = (...sig: number[]) => sig.every((b, i) => head[i] === b);
  switch (ALLOWED[mimeType]) {
    case ".pdf":
      return starts(0x25, 0x50, 0x44, 0x46);
    case ".jpg":
      return starts(0xff, 0xd8, 0xff);
    case ".png":
      return starts(0x89, 0x50, 0x4e, 0x47);
    case ".webp":
      return starts(0x52, 0x49, 0x46, 0x46) && head.subarray(8, 12).toString("latin1") === "WEBP";
    case ".heic":
    case ".heif":
      return head.subarray(4, 8).toString("latin1") === "ftyp";
    case ".zip":
    case ".xlsx":
      return starts(0x50, 0x4b, 0x03, 0x04);
    case ".xls":
      return starts(0xd0, 0xcf, 0x11, 0xe0);
    case ".xml":
      return /^\s*(﻿)?</.test(bytes.subarray(0, 64).toString("utf8"));
    default:
      return false;
  }
}

export type UploadResult =
  | { ok: true; documentId: string; duplicate: false }
  | { ok: true; documentId: string; duplicate: true }
  | { ok: false; error: string };

export async function storeUpload(args: {
  officeId: string;
  clientId: string;
  period: Period;
  file: File;
  /** Mükellefin seçtiği ya da müşavirin belirlediği tür. Yoksa sistem önerir. */
  documentTypeId: string | null;
  source: "portal" | "office";
  actor: string;
}): Promise<UploadResult> {
  const { file } = args;
  if (file.size === 0) return { ok: false, error: "Dosya boş." };
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, error: "Dosya 20 MB'tan büyük olamaz." };
  const mimeType = file.type || "application/octet-stream";
  const ext = ALLOWED[mimeType];
  if (!ext) return { ok: false, error: "Bu dosya türü kabul edilmiyor. PDF, fotoğraf, Excel, XML veya ZIP yükleyin." };

  const bytes = Buffer.from(await file.arrayBuffer());
  if (!sniff(bytes, mimeType)) return { ok: false, error: "Dosya içeriği uzantısıyla uyuşmuyor." };

  const hash = sha256(bytes);
  const originalName = file.name.replace(/[\u0000-\u001f\\/]/g, "_").slice(0, 200) || `belge${ext}`;

  const existing = await asOffice(args.officeId, async (tx) => {
    const { rows } = await tx.query<{ id: string }>(
      `select id from documents
        where client_id = $1 and period_year = $2 and period_month = $3 and sha256 = $4`,
      [args.clientId, args.period.year, args.period.month, hash],
    );
    return rows[0]?.id ?? null;
  });
  if (existing) return { ok: true, documentId: existing, duplicate: true };

  const id = randomUUID();
  const storageKey = `${args.officeId}/${args.clientId}/${id}${ext}`;
  await putObject(storageKey, bytes);

  const inserted = await asOffice(args.officeId, async (tx) => {
    const { rows } = await tx.query<{ id: string }>(
      `insert into documents
         (id, office_id, client_id, period_year, period_month, document_type_id, original_name,
          mime_type, size_bytes, sha256, storage_key, source, ai_status)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'queued')
       on conflict (client_id, period_year, period_month, sha256) do nothing
       returning id`,
      [id, args.officeId, args.clientId, args.period.year, args.period.month, args.documentTypeId,
        originalName, mimeType, bytes.length, hash, storageKey, args.source],
    );
    // Aynı dosya eşzamanlı ikinci kez geldiyse ilk istek kazandı; bu kopya kayda girmez.
    if (rows.length === 0) return false;
    await tx.query(
      `insert into audit_log (office_id, actor, action, entity, entity_id, detail)
       values ($1, $2, 'document.upload', 'document', $3, $4)`,
      [args.officeId, args.actor, id, JSON.stringify({ name: originalName, source: args.source })],
    );
    return true;
  });

  if (!inserted) {
    await deleteObject(storageKey);
    return { ok: true, documentId: id, duplicate: true };
  }
  return { ok: true, documentId: id, duplicate: false };
}

/** Yüklemeden sonra (yanıtı geciktirmeden) çalışır. */
export async function classifyStoredDocument(officeId: string, documentId: string, bytes?: Buffer): Promise<void> {
  const doc = await asOffice(officeId, async (tx) => {
    const { rows } = await tx.query<{ original_name: string; mime_type: string; storage_key: string; document_type_id: string | null }>(
      "select original_name, mime_type, storage_key, document_type_id from documents where id = $1",
      [documentId],
    );
    const { rows: types } = await tx.query<{ id: string; code: string; name: string; hint: string | null }>(
      "select id, code, name, hint from document_types where not archived order by sort_order",
    );
    return rows[0] ? { ...rows[0], types } : null;
  });
  if (!doc) return;

  const data = bytes ?? (await getObject(doc.storage_key));
  if (!data) {
    await asOffice(officeId, (tx) =>
      tx.query("update documents set ai_status = 'skipped' where id = $1", [documentId]),
    );
    return;
  }

  let result: Awaited<ReturnType<typeof classifyDocument>>;
  try {
    result = await classifyDocument({
      fileName: doc.original_name,
      mimeType: doc.mime_type,
      bytes: data,
      types: doc.types,
    });
  } catch (error) {
    await asOffice(officeId, (tx) => tx.query("update documents set ai_status = 'failed' where id = $1", [documentId]));
    throw error;
  }
  const typeId = doc.types.find((t) => t.code === result.code)?.id ?? null;

  await asOffice(officeId, (tx) =>
    tx.query(
      `update documents
          set ai_status = $2, ai_type_id = $3, ai_confidence = $4, ai_note = $5,
              -- Tür boşsa öneri geçici olarak atanır; müşavir onayında kesinleşir.
              document_type_id = coalesce(document_type_id, $3)
        where id = $1`,
      [documentId, result.source === "ai" ? "done" : "skipped", typeId, result.confidence, result.note],
    ),
  );
}
