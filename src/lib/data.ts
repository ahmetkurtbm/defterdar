import "server-only";

import type { CurrentUser } from "@/lib/auth/session";
import { asOffice } from "@/lib/db/engine";
import { shiftPeriod, type Period } from "@/lib/period";

export type DocumentType = { id: string; code: string; name: string; hint: string | null; archived: boolean };

export type ClientKind = "sahis" | "limited" | "anonim" | "serbest_meslek";

export const CLIENT_KIND_LABELS: Record<ClientKind, string> = {
  sahis: "Şahıs",
  limited: "Limited",
  anonim: "Anonim",
  serbest_meslek: "Serbest meslek",
};

/** Bir mükellefin bir dönemdeki durumu. */
export type ClientPeriodStatus = {
  clientId: string;
  name: string;
  kind: ClientKind;
  phone: string | null;
  contactName: string | null;
  portalVersion: number;
  required: number;
  /** Beklenen ama hiç belge gelmemiş türler. */
  missing: { id: string; name: string }[];
  pending: number;
  accepted: number;
  lastUploadAt: Date | null;
  lastReminderAt: Date | null;
  closed: boolean;
};

export type BoardStatus = "complete" | "review" | "missing" | "empty";

export function boardStatus(row: { missingCount: number; pending: number; docCount: number; closed: boolean }): BoardStatus {
  // Kapatılmış döneme sonradan belge gelirse yeniden incelemeye düşer.
  if (row.closed) return row.pending > 0 ? "review" : "complete";
  if (row.missingCount === 0) return row.pending > 0 ? "review" : "complete";
  return row.docCount === 0 ? "empty" : "missing";
}

export function statusOf(row: ClientPeriodStatus): BoardStatus {
  return boardStatus({
    missingCount: row.missing.length,
    pending: row.pending,
    docCount: row.pending + row.accepted,
    closed: row.closed,
  });
}

export async function getPeriodBoard(user: CurrentUser, period: Period): Promise<ClientPeriodStatus[]> {
  return asOffice(user.officeId, async (tx) => {
    const { rows } = await tx.query<{
      id: string;
      name: string;
      kind: ClientKind;
      phone: string | null;
      contact_name: string | null;
      portal_token_version: number;
      required: number;
      missing: { id: string; name: string }[] | null;
      pending: number;
      accepted: number;
      last_upload_at: Date | null;
      last_reminder_at: Date | null;
      closed: boolean;
    }>(
      `with docs as (
         select client_id, document_type_id, status, uploaded_at
           from documents
          where period_year = $1 and period_month = $2 and status <> 'rejected'
       )
       select c.id, c.name, c.kind, c.phone, c.contact_name, c.portal_token_version,
              (select count(*)::int from client_requirements r
                 join document_types t on t.id = r.document_type_id
                where r.client_id = c.id and not t.archived) as required,
              (select json_agg(json_build_object('id', t.id, 'name', t.name) order by t.sort_order)
                 from client_requirements r
                 join document_types t on t.id = r.document_type_id
                where r.client_id = c.id and not t.archived
                  and not exists (select 1 from docs d where d.client_id = c.id and d.document_type_id = r.document_type_id)
              ) as missing,
              (select count(*)::int from docs d where d.client_id = c.id and d.status = 'pending') as pending,
              (select count(*)::int from docs d where d.client_id = c.id and d.status = 'accepted') as accepted,
              (select max(uploaded_at) from docs d where d.client_id = c.id) as last_upload_at,
              (select max(created_at) from reminders m
                where m.client_id = c.id and m.period_year = $1 and m.period_month = $2) as last_reminder_at,
              exists (select 1 from period_closures p
                       where p.client_id = c.id and p.period_year = $1 and p.period_month = $2) as closed
         from clients c
        where c.archived_at is null
        order by c.name`,
      [period.year, period.month],
    );
    return rows.map((r) => ({
      clientId: r.id,
      name: r.name,
      kind: r.kind,
      phone: r.phone,
      contactName: r.contact_name,
      portalVersion: Number(r.portal_token_version),
      required: Number(r.required),
      missing: r.missing ?? [],
      pending: Number(r.pending),
      accepted: Number(r.accepted),
      lastUploadAt: r.last_upload_at ? new Date(r.last_upload_at) : null,
      lastReminderAt: r.last_reminder_at ? new Date(r.last_reminder_at) : null,
      closed: r.closed,
    }));
  });
}

export type DocumentRow = {
  id: string;
  clientId: string;
  clientName: string;
  periodYear: number;
  periodMonth: number;
  typeId: string | null;
  typeName: string | null;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  source: "portal" | "office";
  status: "pending" | "accepted" | "rejected";
  rejectReason: string | null;
  aiStatus: "queued" | "done" | "failed" | "skipped";
  aiTypeName: string | null;
  aiConfidence: number | null;
  aiNote: string | null;
  uploadedAt: Date;
};

const DOCUMENT_SELECT = `
  select d.id, d.client_id, c.name as client_name, d.period_year, d.period_month,
         d.document_type_id, t.name as type_name, d.original_name, d.mime_type, d.size_bytes,
         d.source, d.status, d.reject_reason, d.ai_status, ai.name as ai_type_name,
         d.ai_confidence, d.ai_note, d.uploaded_at
    from documents d
    join clients c on c.id = d.client_id
    left join document_types t on t.id = d.document_type_id
    left join document_types ai on ai.id = d.ai_type_id`;

type DocumentDbRow = {
  id: string;
  client_id: string;
  client_name: string;
  period_year: number;
  period_month: number;
  document_type_id: string | null;
  type_name: string | null;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  source: "portal" | "office";
  status: "pending" | "accepted" | "rejected";
  reject_reason: string | null;
  ai_status: "queued" | "done" | "failed" | "skipped";
  ai_type_name: string | null;
  ai_confidence: string | number | null;
  ai_note: string | null;
  uploaded_at: Date;
};

function toDocument(r: DocumentDbRow): DocumentRow {
  return {
    id: r.id,
    clientId: r.client_id,
    clientName: r.client_name,
    periodYear: Number(r.period_year),
    periodMonth: Number(r.period_month),
    typeId: r.document_type_id,
    typeName: r.type_name,
    originalName: r.original_name,
    mimeType: r.mime_type,
    sizeBytes: Number(r.size_bytes),
    source: r.source,
    status: r.status,
    rejectReason: r.reject_reason,
    aiStatus: r.ai_status,
    aiTypeName: r.ai_type_name,
    aiConfidence: r.ai_confidence === null ? null : Number(r.ai_confidence),
    aiNote: r.ai_note,
    uploadedAt: new Date(r.uploaded_at),
  };
}

export async function getPendingDocuments(user: CurrentUser, limit = 50): Promise<DocumentRow[]> {
  return asOffice(user.officeId, async (tx) => {
    const { rows } = await tx.query<DocumentDbRow>(
      `${DOCUMENT_SELECT} where d.status = 'pending' order by d.uploaded_at desc limit $1`,
      [limit],
    );
    return rows.map(toDocument);
  });
}

export async function countPendingDocuments(user: CurrentUser): Promise<number> {
  return asOffice(user.officeId, async (tx) => {
    const { rows } = await tx.query<{ n: number }>("select count(*)::int as n from documents where status = 'pending'");
    return Number(rows[0].n);
  });
}

export async function getClientDocuments(user: CurrentUser, clientId: string, period: Period): Promise<DocumentRow[]> {
  return asOffice(user.officeId, async (tx) => {
    const { rows } = await tx.query<DocumentDbRow>(
      `${DOCUMENT_SELECT}
        where d.client_id = $1 and d.period_year = $2 and d.period_month = $3
        order by d.uploaded_at desc`,
      [clientId, period.year, period.month],
    );
    return rows.map(toDocument);
  });
}

export type ClientDetail = {
  id: string;
  name: string;
  kind: ClientKind;
  taxId: string | null;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  portalEnabled: boolean;
  portalVersion: number;
  requiredTypeIds: string[];
};

export async function getClient(user: CurrentUser, clientId: string): Promise<ClientDetail | null> {
  if (!/^[0-9a-f-]{36}$/i.test(clientId)) return null;
  return asOffice(user.officeId, async (tx) => {
    const { rows } = await tx.query<{
      id: string;
      name: string;
      kind: ClientKind;
      tax_id: string | null;
      contact_name: string | null;
      phone: string | null;
      email: string | null;
      portal_enabled: boolean;
      portal_token_version: number;
      required: string[] | null;
    }>(
      `select c.id, c.name, c.kind, c.tax_id, c.contact_name, c.phone, c.email, c.portal_enabled, c.portal_token_version,
              (select array_agg(document_type_id) from client_requirements r where r.client_id = c.id) as required
         from clients c
        where c.id = $1 and c.archived_at is null`,
      [clientId],
    );
    const r = rows[0];
    if (!r) return null;
    return {
      id: r.id,
      name: r.name,
      kind: r.kind,
      taxId: r.tax_id,
      contactName: r.contact_name,
      phone: r.phone,
      email: r.email,
      portalEnabled: r.portal_enabled,
      portalVersion: Number(r.portal_token_version),
      requiredTypeIds: r.required ?? [],
    };
  });
}

/** Son `count` dönem için tamamlanma durumu (12 ay şeridi). En eski önce. */
export async function getClientPeriodStrip(
  user: CurrentUser,
  clientId: string,
  last: Period,
  count = 12,
): Promise<{ period: Period; status: BoardStatus | null }[]> {
  const first = shiftPeriod(last, -(count - 1));
  return asOffice(user.officeId, async (tx) => {
    const { rows } = await tx.query<{ y: number; m: number; missing: number; pending: number; doc_count: number; closed: boolean; before_client: boolean }>(
      `with months as (
         select extract(year from d)::int as y, extract(month from d)::int as m
           from generate_series(make_date($2, $3, 1), make_date($4, $5, 1), interval '1 month') d
       )
       select mo.y, mo.m,
              (select count(*)::int from client_requirements r
                 join document_types t on t.id = r.document_type_id
                where r.client_id = $1 and not t.archived
                  and not exists (select 1 from documents d
                                   where d.client_id = $1 and d.document_type_id = r.document_type_id
                                     and d.period_year = mo.y and d.period_month = mo.m and d.status <> 'rejected')) as missing,
              (select count(*)::int from documents d
                where d.client_id = $1 and d.period_year = mo.y and d.period_month = mo.m and d.status = 'pending') as pending,
              (select count(*)::int from documents d
                where d.client_id = $1 and d.period_year = mo.y and d.period_month = mo.m and d.status <> 'rejected') as doc_count,
              exists (select 1 from period_closures p
                       where p.client_id = $1 and p.period_year = mo.y and p.period_month = mo.m) as closed,
              make_date(mo.y, mo.m, 1) < (select date_trunc('month', created_at)::date from clients where id = $1) as before_client
         from months mo
        order by mo.y, mo.m`,
      [clientId, first.year, first.month, last.year, last.month],
    );
    return rows.map((r) => ({
      period: { year: Number(r.y), month: Number(r.m) },
      // Mükellef eklenmeden önceki, belgesi olmayan aylar boş kalır; eksik sayılmaz.
      status: r.before_client && Number(r.doc_count) === 0 ? null : boardStatus({
        missingCount: Number(r.missing),
        pending: Number(r.pending),
        docCount: Number(r.doc_count),
        closed: r.closed,
      }),
    }));
  });
}

export async function getDocumentTypes(user: CurrentUser, includeArchived = false): Promise<DocumentType[]> {
  return asOffice(user.officeId, async (tx) => {
    const { rows } = await tx.query<DocumentType>(
      `select id, code, name, hint, archived from document_types
        ${includeArchived ? "" : "where not archived"}
        order by sort_order, name`,
    );
    return rows;
  });
}
