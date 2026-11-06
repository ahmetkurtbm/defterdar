import type { Tx } from "@/lib/db/engine";

/** Yeni bir ofise kurulan evrak türleri. Kod, otomatik sınıflandırmanın döndürdüğü değerdir. */
export const DEFAULT_DOCUMENT_TYPES = [
  { code: "alis_faturasi", name: "Alış faturaları", hint: "Aldığınız mal ve hizmetlerin faturaları" },
  { code: "satis_faturasi", name: "Satış faturaları", hint: "Kestiğiniz faturaların kopyaları" },
  { code: "banka_ekstresi", name: "Banka ekstresi", hint: "Tüm hesapların aylık dökümü" },
  { code: "pos_raporu", name: "POS raporu", hint: "Kredi kartı slip toplamları" },
  { code: "z_raporu", name: "Z raporları", hint: "Yazar kasa gün sonu raporları" },
  { code: "kira_makbuzu", name: "Kira makbuzu", hint: "İşyeri kira ödeme belgesi" },
  { code: "gider_pusulasi", name: "Gider pusulası", hint: "Faturasız alımlar için düzenlenen pusulalar" },
  { code: "sgk_belgesi", name: "SGK belgeleri", hint: "Personel giriş-çıkış, puantaj" },
  { code: "diger", name: "Diğer", hint: "Listede olmayan belgeler" },
] as const;

/** Her yeni mükellefte varsayılan olarak beklenen türler. */
export const DEFAULT_REQUIRED_CODES = ["alis_faturasi", "satis_faturasi", "banka_ekstresi"] as const;

export async function installDefaultDocumentTypes(tx: Tx, officeId: string): Promise<void> {
  for (const [index, type] of DEFAULT_DOCUMENT_TYPES.entries()) {
    await tx.query(
      `insert into document_types (office_id, code, name, hint, sort_order)
       values ($1, $2, $3, $4, $5) on conflict (office_id, code) do nothing`,
      [officeId, type.code, type.name, type.hint, index],
    );
  }
}
