import { getCurrentUser } from "@/lib/auth/session";
import { asOffice } from "@/lib/db/engine";
import { getObject } from "@/lib/storage";

// Belgeyi yalnızca aynı ofisin oturumlu kullanıcısına verir (RLS başka ofisin satırını göstermez).
export async function GET(request: Request, ctx: RouteContext<"/api/files/[id]">) {
  const user = await getCurrentUser();
  if (!user) return new Response("Oturum gerekli", { status: 401 });
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Bulunamadı", { status: 404 });

  const { rows } = await asOffice(user.officeId, (tx) =>
    tx.query<{ storage_key: string; mime_type: string; original_name: string }>(
      "select storage_key, mime_type, original_name from documents where id = $1",
      [id],
    ),
  );
  const doc = rows[0];
  if (!doc) return new Response("Bulunamadı", { status: 404 });

  const bytes = await getObject(doc.storage_key);
  if (!bytes) return new Response("Bu demo kaydının dosyası yok.", { status: 404 });

  const download = new URL(request.url).searchParams.has("indir");
  const inline = !download && (doc.mime_type === "application/pdf" || doc.mime_type.startsWith("image/"));
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": doc.mime_type,
      "Content-Length": String(bytes.length),
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(doc.original_name)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      // Yüklenen dosya kendi başına içerik çalıştıramasın.
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
    },
  });
}
