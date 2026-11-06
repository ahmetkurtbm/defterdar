# Product

## Platform

web

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind v4 · shadcn/ui · Postgres (yerelde gömülü PGlite, canlıda Supabase/Neon) · Vercel.
Belgeler önce yerel diskte, sonra bulut depolamada (soyutlanmış arayüz).

## Users

**Birincil:** 1-5 kişilik serbest muhasebeci mali müşavir (SMMM) ofisleri; tipik olarak 30-150 mükellef.
Ofis sahibi ve çalışanları masaüstünde, gün boyu, ay sonu ve beyanname dönemlerinde yoğun baskı altında çalışır.
İşleri: her ay her mükelleften alış/satış faturası, banka ekstresi, POS/Z raporu vb. belgeleri eksiksiz toplamak.

**İkincil:** Mükellefler — esnaf, şahıs şirketi, küçük limited. Çoğu teknik değil, bir kısmı yaşlı;
belgeyi telefonla, çoğunlukla dükkânda ya da yolda gönderir. Hesap açmaz, uygulama indirmez.

## Product Purpose

Aylık evrak toplama sürecini WhatsApp, e-posta ve poşetteki kâğıtlardan çıkarıp tek yere toplar.
Müşavir hangi mükellefin hangi ay hangi belgesinin eksik olduğunu bir bakışta görür, tek tıkla hatırlatır.
Başarı: ay sonunda "kimden ne eksik?" sorusunun cevabını aramak zorunda kalmamak.

## Positioning

Mükellef hesapsız, kişiye özel bir linkten belgenin fotoğrafını çeker; sistem belgeyi tanıyıp doğru
evrak kutusuna koyar; müşavir yalnızca onaylar. Toplama yükü mükellefe, kontrol müşavire kalır.

## Operating Context

- Türk vergi dönemleri aylıktır; KDV beyannamesi takip eden ayın 28'ine kadar verilir.
- Tipik evrak türleri: alış faturası, satış faturası, banka ekstresi, POS raporu, Z raporu, kira makbuzu, SGK belgeleri, gider pusulası.
- Hatırlatma kanalı fiilen WhatsApp'tır.
- Terminoloji: mükellef, dönem, evrak, beyanname, VKN/TCKN.

## Capabilities and Constraints

- Çok kiracılı: her müşavir ofisi bir kiracı; veri ayrımı veritabanında (Row Level Security) zorunlu.
- Mükellef portalı token'lı link ile çalışır; token veritabanında yalnızca hash olarak tutulur.
- Belgeler mali ve kişisel veri içerir: KVKK kapsamındadır.
- Arayüz yalnızca Türkçe.
- Undecided: fiyatlandırma, e-posta/SMS kanalı, e-Fatura XML okuma (sonraki faz).

## Evidence on Hand

Henüz gerçek müşteri, referans, istatistik veya ekran görüntüsü yok. Uydurulmamalı.

## Product Principles

1. Mükellef için sıfır sürtünme: link aç, fotoğraf çek, bitti.
2. Müşavir için tek bakışta durum: eksik olan her zaman en görünür şey.
3. Sistem önerir, müşavir onaylar; otomatik öneri asla sessizce kesinleşmez.
4. Mali veri güvenliği tercih değil, varsayılandır.

## Accessibility & Inclusion

Mükellef portalı yaşlı ve teknik olmayan kullanıcılar için: büyük dokunma hedefleri, büyük metin,
tek adımlı akış, düşük bağlantı hızına dayanıklılık. WCAG 2.2 AA hedeflenir.
