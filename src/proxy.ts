import { NextResponse, type NextRequest } from "next/server";

// İyimser yönlendirme: yalnızca çerezin varlığına bakar. Asıl doğrulama sayfa ve
// aksiyonlarda `requireUser()` ile veritabanında yapılır.
const SESSION_COOKIE = "dd_session";
const APP_PREFIXES = ["/pano", "/mukellefler", "/evraklar", "/ayarlar"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has(SESSION_COOKIE);

  if (!hasSession && APP_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.redirect(new URL("/giris", request.url));
  }
  if (hasSession && (pathname === "/giris" || pathname === "/kayit")) {
    return NextResponse.redirect(new URL("/pano", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/pano/:path*", "/mukellefler/:path*", "/evraklar/:path*", "/ayarlar/:path*", "/giris", "/kayit"],
};
