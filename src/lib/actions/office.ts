"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireUser } from "@/lib/auth/session";
import { portalToken, sha256 } from "@/lib/crypto";
import { asOffice, type Tx } from "@/lib/db/engine";
import { DEFAULT_REQUIRED_CODES } from "@/lib/document-types";
import { parsePeriodKey } from "@/lib/period";
import { normalizePhone } from "@/lib/phone";

import type { FormState } from "./auth";

const uuid = z.string().uuid();
// Server action argümanları istemciden gelir; TypeScript tipleri çalışma anında bir şey garanti etmez.
const Decision = z.discriminatedUnion("status", [
  z.object({ status: z.literal("accepted") }),
  z.object({ status: z.literal("rejected"), reason: z.string().trim().min(3, "Mükellefin göreceği bir sebep yazın.").max(300) }),
]);

async function audit(tx: Tx, officeId: string, actor: string, action: string, entity: string, entityId: string | null, detail?: unknown) {
  await tx.query(
    "insert into audit_log (office_id, actor, action, entity, entity_id, detail) values ($1, $2, $3, $4, $5, $6)",
    [officeId, actor, action, entity, entityId, detail === undefined ? null : JSON.stringify(detail)],
  );
}

const ClientSchema = z.object({
  name: z.string().trim().min(2, "Mükellef adını girin.").max(160),
  kind: z.enum(["sahis", "limited", "anonim", "serbest_meslek"]),
  taxId: z.string().trim().regex(/^(\d{10,11})?$/, "VKN 10, TCKN 11 haneli olmalı.").optional(),
  contactName: z.string().trim().max(120).optional(),
  phone: z.string().trim().max(30).optional(),
  email: z.string().trim().toLowerCase().email("Geçerli bir e-posta girin.").or(z.literal("")).optional(),
});

function readClientForm(formData: FormData) {
  const values = Object.fromEntries(
    ["name", "kind", "taxId", "contactName", "phone", "email"].map((k) => [k, String(formData.get(k) ?? "")]),
  );
  return { values, parsed: ClientSchema.safeParse(values) };
}

export async function createClient(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const { values, parsed } = readClientForm(formData);
  if (!parsed.success) return { fieldErrors: Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])), values };

  const phone = parsed.data.phone ? normalizePhone(parsed.data.phone) : null;
  if (parsed.data.phone && !phone) return { fieldErrors: { phone: "Cep numarasını 05XX XXX XX XX biçiminde girin." }, values };

  const id = randomUUID();
  await asOffice(user.officeId, async (tx) => {
    await tx.query(
      `insert into clients (id, office_id, name, kind, tax_id, contact_name, phone, email, portal_token_hash)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [id, user.officeId, parsed.data.name, parsed.data.kind, parsed.data.taxId || null,
        parsed.data.contactName || null, phone, parsed.data.email || null, sha256(portalToken(id, 1))],
    );
    await tx.query(
      `insert into client_requirements (office_id, client_id, document_type_id)
       select $1, $2, id from document_types where code = any($3) and not archived`,
      [user.officeId, id, DEFAULT_REQUIRED_CODES],
    );
    await audit(tx, user.officeId, user.id, "client.create", "client", id, { name: parsed.data.name });
  });
  revalidatePath("/", "layout");
  redirect(`/mukellefler/${id}`);
}

export async function updateClient(clientId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  if (!uuid.safeParse(clientId).success) return { error: "Mükellef bulunamadı." };
  const { values, parsed } = readClientForm(formData);
  if (!parsed.success) return { fieldErrors: Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])), values };
  const phone = parsed.data.phone ? normalizePhone(parsed.data.phone) : null;
  if (parsed.data.phone && !phone) return { fieldErrors: { phone: "Cep numarasını 05XX XXX XX XX biçiminde girin." }, values };

  await asOffice(user.officeId, async (tx) => {
    await tx.query(
      `update clients set name = $2, kind = $3, tax_id = $4, contact_name = $5, phone = $6, email = $7
        where id = $1 and archived_at is null`,
      [clientId, parsed.data.name, parsed.data.kind, parsed.data.taxId || null, parsed.data.contactName || null, phone, parsed.data.email || null],
    );
    await audit(tx, user.officeId, user.id, "client.update", "client", clientId);
  });
  revalidatePath("/", "layout");
  return { values };
}

export async function setRequirements(clientId: string, typeIds: string[]): Promise<{ error?: string }> {
  const user = await requireUser();
  if (!uuid.safeParse(clientId).success || !z.array(uuid).max(100).safeParse(typeIds).success) return { error: "Geçersiz istek." };
  await asOffice(user.officeId, async (tx) => {
    await tx.query("delete from client_requirements where client_id = $1", [clientId]);
    // Yalnızca bu ofisin türleri eklenir; RLS başka ofisin satırını zaten göstermez.
    await tx.query(
      `insert into client_requirements (office_id, client_id, document_type_id)
       select $1, c.id, t.id from clients c, document_types t
        where c.id = $2 and t.id = any($3::uuid[]) and not t.archived`,
      [user.officeId, clientId, typeIds],
    );
    await audit(tx, user.officeId, user.id, "client.requirements", "client", clientId, { count: typeIds.length });
  });
  revalidatePath("/", "layout");
  return {};
}

export async function archiveClient(clientId: string): Promise<void> {
  const user = await requireUser();
  if (!uuid.safeParse(clientId).success) return;
  await asOffice(user.officeId, async (tx) => {
    await tx.query("update clients set archived_at = now(), portal_enabled = false where id = $1", [clientId]);
    await audit(tx, user.officeId, user.id, "client.archive", "client", clientId);
  });
  revalidatePath("/", "layout");
  redirect("/mukellefler");
}

/** Eski linki geçersiz kılar, yenisini üretir. */
export async function rotatePortalLink(clientId: string): Promise<{ error?: string }> {
  const user = await requireUser();
  if (!uuid.safeParse(clientId).success) return { error: "Geçersiz istek." };
  await asOffice(user.officeId, async (tx) => {
    const { rows } = await tx.query<{ v: number }>(
      "update clients set portal_token_version = portal_token_version + 1 where id = $1 returning portal_token_version as v",
      [clientId],
    );
    if (!rows[0]) return;
    await tx.query("update clients set portal_token_hash = $2 where id = $1", [clientId, sha256(portalToken(clientId, Number(rows[0].v)))]);
    await audit(tx, user.officeId, user.id, "client.rotate_link", "client", clientId);
  });
  revalidatePath("/", "layout");
  return {};
}

export async function setPortalEnabled(clientId: string, enabled: boolean): Promise<void> {
  const user = await requireUser();
  if (!uuid.safeParse(clientId).success || typeof enabled !== "boolean") return;
  await asOffice(user.officeId, async (tx) => {
    await tx.query("update clients set portal_enabled = $2 where id = $1", [clientId, enabled]);
    await audit(tx, user.officeId, user.id, enabled ? "client.portal_on" : "client.portal_off", "client", clientId);
  });
  revalidatePath("/", "layout");
}

// --- Belgeler -----------------------------------------------------------------

export async function reviewDocument(
  documentId: string,
  rawDecision: { status: "accepted" } | { status: "rejected"; reason: string },
  typeId?: string | null,
): Promise<{ error?: string }> {
  const user = await requireUser();
  if (!uuid.safeParse(documentId).success) return { error: "Geçersiz istek." };
  if (typeId && !uuid.safeParse(typeId).success) return { error: "Geçersiz evrak türü." };
  const parsedDecision = Decision.safeParse(rawDecision);
  if (!parsedDecision.success) return { error: parsedDecision.error.issues[0]?.message ?? "Geçersiz istek." };
  const decision = parsedDecision.data;
  if (decision.status === "accepted" && !typeId) {
    const { rows } = await asOffice(user.officeId, (tx) =>
      tx.query<{ document_type_id: string | null }>("select document_type_id from documents where id = $1", [documentId]),
    );
    if (!rows[0]?.document_type_id) return { error: "Onaylamadan önce evrak türünü seçin." };
  }

  await asOffice(user.officeId, async (tx) => {
    await tx.query(
      `update documents
          set status = $2, reject_reason = $3, reviewed_at = now(), reviewed_by = $4,
              -- Tür, RLS altında görünüyorsa (aynı ofis) atanır; başka ofisin kimliği yok sayılır.
              document_type_id = coalesce((select t.id from document_types t where t.id = $5::uuid), document_type_id)
        where id = $1`,
      [documentId, decision.status, decision.status === "rejected" ? decision.reason : null, user.id, typeId ?? null],
    );
    await audit(tx, user.officeId, user.id, `document.${decision.status === "accepted" ? "accept" : "reject"}`, "document", documentId);
  });
  revalidatePath("/", "layout");
  return {};
}

export async function setDocumentType(documentId: string, typeId: string): Promise<{ error?: string }> {
  const user = await requireUser();
  if (!uuid.safeParse(documentId).success || !uuid.safeParse(typeId).success) return { error: "Geçersiz istek." };
  await asOffice(user.officeId, async (tx) => {
    await tx.query(
      "update documents set document_type_id = t.id from document_types t where documents.id = $1 and t.id = $2",
      [documentId, typeId],
    );
    await audit(tx, user.officeId, user.id, "document.retype", "document", documentId, { typeId });
  });
  revalidatePath("/", "layout");
  return {};
}

// --- Dönem ---------------------------------------------------------------------

export async function recordReminder(clientId: string, periodKey: string, channel: "whatsapp" | "copy"): Promise<void> {
  const user = await requireUser();
  const period = parsePeriodKey(periodKey);
  if (!period || !uuid.safeParse(clientId).success || (channel !== "whatsapp" && channel !== "copy")) return;
  await asOffice(user.officeId, (tx) =>
    tx.query(
      `insert into reminders (office_id, client_id, period_year, period_month, channel, created_by)
       select $1, id, $3, $4, $5, $6 from clients where id = $2`,
      [user.officeId, clientId, period.year, period.month, channel, user.id],
    ),
  );
  revalidatePath("/", "layout");
}

export async function setPeriodClosed(clientId: string, periodKey: string, closed: boolean): Promise<void> {
  const user = await requireUser();
  const period = parsePeriodKey(periodKey);
  if (!period || !uuid.safeParse(clientId).success || typeof closed !== "boolean") return;
  await asOffice(user.officeId, async (tx) => {
    if (closed) {
      await tx.query(
        `insert into period_closures (office_id, client_id, period_year, period_month, closed_by)
         select $1, id, $3, $4, $5 from clients where id = $2
         on conflict do nothing`,
        [user.officeId, clientId, period.year, period.month, user.id],
      );
    } else {
      await tx.query(
        "delete from period_closures where client_id = $1 and period_year = $2 and period_month = $3",
        [clientId, period.year, period.month],
      );
    }
    await audit(tx, user.officeId, user.id, closed ? "period.close" : "period.reopen", "client", clientId, { period: periodKey });
  });
  revalidatePath("/", "layout");
}

// --- Ayarlar ---------------------------------------------------------------------

export async function updateOffice(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const values = { name: String(formData.get("name") ?? ""), collectionDay: String(formData.get("collectionDay") ?? "") };
  if (user.role !== "owner") return { error: "Bu ayarı yalnızca ofis sahibi değiştirebilir.", values };
  const parsed = z
    .object({ name: z.string().trim().min(2, "Ofis adını girin.").max(120), collectionDay: z.coerce.number().int().min(1).max(28) })
    .safeParse(values);
  if (!parsed.success) return { fieldErrors: Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])), values };
  await asOffice(user.officeId, async (tx) => {
    await tx.query("update offices set name = $2, collection_day = $3 where id = $1", [user.officeId, parsed.data.name, parsed.data.collectionDay]);
    await audit(tx, user.officeId, user.id, "office.update", "office", user.officeId, parsed.data);
  });
  revalidatePath("/", "layout");
  return { values };
}

export async function addDocumentType(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const hint = String(formData.get("hint") ?? "").trim().slice(0, 160);
  if (user.role !== "owner") return { error: "Evrak türlerini yalnızca ofis sahibi değiştirebilir.", values: { name, hint } };
  if (name.length < 2 || name.length > 80) return { fieldErrors: { name: "Tür adı 2-80 karakter olmalı." }, values: { name, hint } };
  const code = `ozel_${randomUUID().slice(0, 8)}`;
  await asOffice(user.officeId, async (tx) => {
    await tx.query(
      `insert into document_types (office_id, code, name, hint, sort_order)
       values ($1, $2, $3, $4, (select coalesce(max(sort_order), 0) + 1 from document_types))`,
      [user.officeId, code, name, hint || null],
    );
    await audit(tx, user.officeId, user.id, "type.create", "document_type", null, { name });
  });
  revalidatePath("/", "layout");
  return {};
}

export async function setDocumentTypeArchived(typeId: string, archived: boolean): Promise<void> {
  const user = await requireUser();
  if (!uuid.safeParse(typeId).success || typeof archived !== "boolean" || user.role !== "owner") return;
  await asOffice(user.officeId, async (tx) => {
    await tx.query("update document_types set archived = $2 where id = $1", [typeId, archived]);
    await audit(tx, user.officeId, user.id, archived ? "type.archive" : "type.restore", "document_type", typeId);
  });
  revalidatePath("/", "layout");
}
