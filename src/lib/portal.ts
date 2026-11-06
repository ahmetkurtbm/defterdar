import "server-only";

import { sha256 } from "@/lib/crypto";
import { asOffice, asSystem } from "@/lib/db/engine";
import { currentPeriod, type Period } from "@/lib/period";

export type PortalContext = { officeId: string; clientId: string };

/** Linkteki token'dan mükellefi bulur; geçersiz, kapalı ya da arşivli ise null. */
export async function resolvePortalToken(token: string): Promise<PortalContext | null> {
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(token)) return null;
  const { rows } = await asSystem((tx) =>
    tx.query<{ office_id: string; client_id: string }>("select office_id, client_id from portal_lookup($1)", [sha256(token)]),
  );
  return rows[0] ? { officeId: rows[0].office_id, clientId: rows[0].client_id } : null;
}

export type PortalView = {
  officeName: string;
  clientName: string;
  contactName: string | null;
  period: Period;
  collectionDay: number;
  /** Beklenen türler ve bu dönemde gelen belge sayısı. */
  checklist: { typeId: string; name: string; hint: string | null; count: number }[];
  /** Beklenen listede olmayan ama yüklenebilecek türler. */
  otherTypes: { typeId: string; name: string }[];
  recent: { id: string; name: string; typeName: string | null; status: "pending" | "accepted" | "rejected"; rejectReason: string | null; uploadedAt: Date }[];
};

export async function getPortalView(ctx: PortalContext, period: Period = currentPeriod()): Promise<PortalView> {
  return asOffice(ctx.officeId, async (tx) => {
    const { rows: [head] } = await tx.query<{ office_name: string; collection_day: number; client_name: string; contact_name: string | null }>(
      `select o.name as office_name, o.collection_day, c.name as client_name, c.contact_name
         from clients c join offices o on o.id = c.office_id
        where c.id = $1`,
      [ctx.clientId],
    );
    const { rows: types } = await tx.query<{ id: string; name: string; hint: string | null; required: boolean; count: number }>(
      `select t.id, t.name, t.hint,
              exists (select 1 from client_requirements r where r.client_id = $1 and r.document_type_id = t.id) as required,
              (select count(*)::int from documents d
                where d.client_id = $1 and d.document_type_id = t.id
                  and d.period_year = $2 and d.period_month = $3 and d.status <> 'rejected') as count
         from document_types t
        where not t.archived
        order by t.sort_order`,
      [ctx.clientId, period.year, period.month],
    );
    const { rows: recent } = await tx.query<{
      id: string; original_name: string; type_name: string | null; status: "pending" | "accepted" | "rejected"; reject_reason: string | null; uploaded_at: Date;
    }>(
      `select d.id, d.original_name, t.name as type_name, d.status, d.reject_reason, d.uploaded_at
         from documents d left join document_types t on t.id = d.document_type_id
        where d.client_id = $1 and d.period_year = $2 and d.period_month = $3
        order by d.uploaded_at desc limit 30`,
      [ctx.clientId, period.year, period.month],
    );

    return {
      officeName: head.office_name,
      clientName: head.client_name,
      contactName: head.contact_name,
      period,
      collectionDay: Number(head.collection_day),
      checklist: types.filter((t) => t.required).map((t) => ({ typeId: t.id, name: t.name, hint: t.hint, count: Number(t.count) })),
      otherTypes: types.filter((t) => !t.required).map((t) => ({ typeId: t.id, name: t.name })),
      recent: recent.map((r) => ({
        id: r.id,
        name: r.original_name,
        typeName: r.type_name,
        status: r.status,
        rejectReason: r.reject_reason,
        uploadedAt: new Date(r.uploaded_at),
      })),
    };
  });
}

/** Mükellefin gönderdiği tür kimliği gerçekten bu ofise mi ait? */
export async function isOfficeDocumentType(officeId: string, typeId: string): Promise<boolean> {
  if (!/^[0-9a-f-]{36}$/i.test(typeId)) return false;
  const { rows } = await asOffice(officeId, (tx) =>
    tx.query("select 1 from document_types where id = $1 and not archived", [typeId]),
  );
  return rows.length > 0;
}
