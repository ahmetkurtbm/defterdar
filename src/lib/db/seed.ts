import "server-only";

import { randomUUID } from "node:crypto";

import { hashPassword, portalToken, sha256 } from "@/lib/crypto";
import { installDefaultDocumentTypes } from "@/lib/document-types";
import { currentPeriod, shiftPeriod } from "@/lib/period";

import type { Tx } from "./engine";

// Yalnızca geliştirme ortamında, veritabanı boşken kurulan demo ofisi.
// Bu değerler gerçek kimlik bilgisi değildir; README'de de yazılıdır.
export const DEMO_EMAIL = "demo@defterdar.test";
export const DEMO_PASSWORD = "defterdar-demo";

const DEMO_CLIENTS: {
  name: string;
  kind: "sahis" | "limited" | "serbest_meslek";
  contact: string;
  phone: string;
  required: string[];
  /** Bu dönem yüklenmiş türler: kod → durum */
  uploaded: Record<string, "accepted" | "pending">;
}[] = [
  { name: "Yıldız Kırtasiye", kind: "sahis", contact: "Hasan", phone: "905321112233", required: ["alis_faturasi", "satis_faturasi", "banka_ekstresi", "z_raporu"], uploaded: { alis_faturasi: "accepted", satis_faturasi: "accepted", banka_ekstresi: "accepted", z_raporu: "accepted" } },
  { name: "Ege Lojistik Ltd. Şti.", kind: "limited", contact: "Selin", phone: "905332223344", required: ["alis_faturasi", "satis_faturasi", "banka_ekstresi", "sgk_belgesi"], uploaded: { alis_faturasi: "accepted", satis_faturasi: "pending" } },
  { name: "Dr. Aylin Kaya Muayenehane", kind: "serbest_meslek", contact: "Aylin", phone: "905343334455", required: ["alis_faturasi", "banka_ekstresi", "kira_makbuzu"], uploaded: { kira_makbuzu: "pending" } },
  { name: "Akdeniz Pide Salonu", kind: "sahis", contact: "Mehmet", phone: "905354445566", required: ["alis_faturasi", "satis_faturasi", "pos_raporu", "z_raporu", "banka_ekstresi"], uploaded: {} },
  { name: "Kuzey Yazılım A.Ş.", kind: "limited", contact: "Burak", phone: "905365556677", required: ["alis_faturasi", "satis_faturasi", "banka_ekstresi", "sgk_belgesi"], uploaded: { alis_faturasi: "accepted", satis_faturasi: "accepted", banka_ekstresi: "accepted", sgk_belgesi: "pending" } },
  { name: "Çınar Oto Servis", kind: "sahis", contact: "Ali", phone: "905376667788", required: ["alis_faturasi", "satis_faturasi", "banka_ekstresi", "gider_pusulasi"], uploaded: { banka_ekstresi: "accepted" } },
  { name: "Mavi Kuaför", kind: "sahis", contact: "Derya", phone: "905387778899", required: ["alis_faturasi", "pos_raporu", "kira_makbuzu"], uploaded: { alis_faturasi: "accepted", pos_raporu: "accepted", kira_makbuzu: "accepted" } },
];

export async function seedDemoIfEmpty(transaction: <T>(fn: (tx: Tx) => Promise<T>) => Promise<T>): Promise<void> {
  if (process.env.NODE_ENV === "production" || process.env.DEFTERDAR_DEMO === "0") return;

  await transaction(async (tx) => {
    const existing = await tx.query("select 1 from offices limit 1");
    if (existing.rows.length > 0) return;

    const { rows: [office] } = await tx.query<{ id: string }>(
      "insert into offices (name) values ('Demo Mali Müşavirlik') returning id",
    );
    await tx.query(
      "insert into users (office_id, email, name, password_hash, role) values ($1, $2, 'Demo Müşavir', $3, 'owner')",
      [office.id, DEMO_EMAIL, await hashPassword(DEMO_PASSWORD)],
    );
    await installDefaultDocumentTypes(tx, office.id);
    const { rows: types } = await tx.query<{ id: string; code: string }>(
      "select id, code from document_types where office_id = $1",
      [office.id],
    );
    const typeId = new Map(types.map((t) => [t.code, t.id]));

    const period = currentPeriod();
    const previous = shiftPeriod(period, -1);

    for (const [index, client] of DEMO_CLIENTS.entries()) {
      const clientId = randomUUID();
      const { rows: [row] } = await tx.query<{ id: string }>(
        `insert into clients (id, office_id, name, kind, contact_name, phone, portal_token_hash)
         values ($1, $2, $3, $4, $5, $6, $7) returning id`,
        [clientId, office.id, client.name, client.kind, client.contact, client.phone, sha256(portalToken(clientId, 1))],
      );
      for (const code of client.required) {
        await tx.query(
          "insert into client_requirements (office_id, client_id, document_type_id) values ($1, $2, $3)",
          [office.id, row.id, typeId.get(code)],
        );
        // Bir önceki dönem herkes için tamamlanmış.
        await insertDemoDocument(tx, office.id, row.id, previous, typeId.get(code)!, code, "accepted", 30);
      }
      for (const [code, status] of Object.entries(client.uploaded)) {
        await insertDemoDocument(tx, office.id, row.id, period, typeId.get(code)!, code, status, index + 1);
      }
    }
  });
}

async function insertDemoDocument(
  tx: Tx,
  officeId: string,
  clientId: string,
  period: { year: number; month: number },
  typeId: string,
  code: string,
  status: "accepted" | "pending",
  hoursAgo: number,
) {
  const name = `${code.replace(/_/g, "-")}-${period.year}-${String(period.month).padStart(2, "0")}.pdf`;
  await tx.query(
    `insert into documents
       (office_id, client_id, period_year, period_month, document_type_id, original_name, mime_type,
        size_bytes, sha256, storage_key, source, status, ai_status, ai_type_id, ai_confidence, ai_note, uploaded_at)
     values ($1, $2, $3, $4, $5, $6, 'application/pdf', 48213, $7, 'demo', 'portal', $8, 'done', $5, 0.92,
             'Demo belgesi', now() - make_interval(hours => $9))`,
    [officeId, clientId, period.year, period.month, typeId, name, sha256(`${clientId}${name}`), status, hoursAgo],
  );
}
