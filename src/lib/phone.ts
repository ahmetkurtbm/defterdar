/** Türkiye cep numarasını wa.me biçimine (905XXXXXXXXX) çevirir; geçersizse null. */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (/^905\d{9}$/.test(digits)) return digits;
  if (/^05\d{9}$/.test(digits)) return `9${digits}`;
  if (/^5\d{9}$/.test(digits)) return `90${digits}`;
  return null;
}

/** 905321112233 → 0532 111 22 33 */
export function formatPhone(normalized: string): string {
  const d = normalized.slice(2);
  return `0${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 8)} ${d.slice(8)}`;
}
