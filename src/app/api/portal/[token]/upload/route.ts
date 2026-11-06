import { after } from "next/server";

import { currentPeriod } from "@/lib/period";
import { isOfficeDocumentType, resolvePortalToken } from "@/lib/portal";
import { rateLimit } from "@/lib/rate-limit";
import { classifyStoredDocument, MAX_UPLOAD_BYTES, storeUpload } from "@/lib/uploads";

// Mükellef portalından tek dosya yükleme. Hesap yok: yetki linkteki token'dır.
export async function POST(request: Request, ctx: RouteContext<"/api/portal/[token]/upload">) {
  const { token } = await ctx.params;
  const portal = await resolvePortalToken(token);
  if (!portal) return Response.json({ error: "Bu link geçersiz ya da kapatılmış." }, { status: 404 });

  if (!rateLimit(`portal:${portal.clientId}`, 60, 10 * 60_000)) {
    return Response.json({ error: "Çok fazla yükleme yapıldı. Lütfen biraz sonra tekrar deneyin." }, { status: 429 });
  }

  // Gövde belleğe alınmadan önce boyut reddedilir (form sarmalayıcısı için küçük pay).
  const length = Number(request.headers.get("content-length") ?? NaN);
  if (!Number.isFinite(length) || length > MAX_UPLOAD_BYTES + 64 * 1024) {
    return Response.json({ error: "Dosya 20 MB'tan büyük olamaz." }, { status: 413 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "Dosya okunamadı." }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) return Response.json({ error: "Dosya seçilmedi." }, { status: 400 });

  const rawType = form.get("typeId");
  const typeId = typeof rawType === "string" && rawType && (await isOfficeDocumentType(portal.officeId, rawType)) ? rawType : null;

  const result = await storeUpload({
    officeId: portal.officeId,
    clientId: portal.clientId,
    period: currentPeriod(),
    file,
    documentTypeId: typeId,
    source: "portal",
    actor: `portal:${portal.clientId}`,
  });
  if (!result.ok) return Response.json({ error: result.error }, { status: 400 });

  if (!result.duplicate) {
    const { officeId } = portal;
    after(() => classifyStoredDocument(officeId, result.documentId).catch((e) => console.error("[upload] sınıflandırma", e)));
  }
  return Response.json({ ok: true, duplicate: result.duplicate });
}
