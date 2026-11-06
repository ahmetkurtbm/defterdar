# Mimari

## Bileşenler

```
 Mükellef telefonu                     Müşavir tarayıcısı
   /y/<token>  ──POST dosya──┐          /pano /evraklar /mukellefler /ayarlar
                             ▼                     │ Server Components + Server Actions
               /api/portal/<token>/upload          ▼
                    │  token → (ofis, mükellef)   requireUser() → oturum çerezi → kullanıcı
                    ▼                              │
               uploads.ts ──► storage.ts (disk)    ▼
                    │                         data.ts / actions/office.ts
                    └─ after() ─► classify.ts ──► Anthropic API (yoksa dosya adı)
                                   │
                    asOffice(ofis) ▼  set role app_user + app.office_id
                               Postgres (RLS: office_id = app_office_id())
```

## Veri modeli

- `offices` kiracıdır. `users` (ofis çalışanları) ve `sessions` (token özeti) kimlik içindir.
- `clients` mükellefler; `client_requirements` her ay beklenen evrak türleri.
- `documents` dönem (`period_year`, `period_month`) + tür + durum (`pending/accepted/rejected`) +
  otomatik tür önerisi (`ai_type_id`, `ai_confidence`, `ai_note`). Aynı dosya aynı döneme iki kez giremez
  (`sha256` tekilliği).
- `period_closures` müşavirin "dönemi tamam say" kararı; `reminders` hatırlatma geçmişi;
  `audit_log` tüm değişiklikler.

Dönem durumu hesaplanır, saklanmaz: beklenen türlerden belge gelmeyen varsa **eksik**, hepsi geldi
ama onay bekleyen varsa **onay bekliyor**, aksi hâlde **tamam**. Kapatılan dönem her zaman tamamdır.
Toplanan dönem bir önceki aydır; son teslim günü takip eden ayın `offices.collection_day`'idir.
Tüm tarih hesapları İstanbul saatine göredir (`src/lib/period.ts`).

## Güvenlik modeli

1. **Kiracı ayrımı veritabanında.** Her kiracı tablosunda `enable` + `force row level security`.
   Uygulama sorguları `asOffice()` ile `app_user` rolüne düşer ve `app.office_id` ayarlanır; bir
   kod yolunda filtre unutulsa bile başka ofisin satırı görünmez.
2. **`asSystem()` dar kullanılır:** giriş, kayıt, oturum çözümü ve portal token araması. Bu işler
   `app_system` rolüne düşer; bu rol yalnızca `offices`, `users`, `sessions`, `document_types` ve
   (salt okunur) `clients` tablolarına açıktır (`db/migrations/0002_system_role.sql`). Bağlantı
   kullanıcısının süper kullanıcı ya da BYPASSRLS olması gerekmez; `app_user` ve `app_system`
   rollerine üye olması yeterlidir (migration'lar bunu kendisi verir).
3. **Portal linki = yetki.** Token, sunucu sırrından türetilir (`HMAC(secret, clientId:sürüm)`),
   veritabanında yalnızca SHA-256 özeti durur. "Yenile" sürümü artırır, eski link ölür. Link
   kapatılabilir; arşivlenen mükellefin linki çalışmaz.
4. **Yükleme:** 20 MB sınırı, tür izin listesi ve sihirli bayt kontrolü (tarayıcının söylediği tür
   güvenilmez), mükellef başına hız sınırı. Dosyalar yalnızca oturumlu, aynı ofisteki kullanıcıya
   `Content-Security-Policy: sandbox` ile verilir.
5. **Oturum:** scrypt şifre özeti, 32 baytlık rastgele token, httpOnly + SameSite=Lax çerez,
   başarısız girişte hız sınırı ve sabit süreli doğrulama.
6. **Otomatik sınıflandırma yalnızca öneri yapar.** Belge, müşavir onaylayana kadar `pending` kalır.

## Bilinçli kısıtlar ve sonraki adımlar

- Yerel PGlite süper kullanıcıyla çalışır; rol düşürme sayesinde RLS yerelde de devrededir, ama
  migration'ların yönetilen Postgres'te bir kez denenmesi gerekir.
- Hız sınırı süreç içi bellekte; birden fazla sunucu örneğinde (Vercel) Redis/Upstash'e taşınmalı.
- Belgeler yerel diskte. Vercel'de kalıcı disk yok: yayına almadan önce `storage.ts` bulut
  depolamaya (Supabase Storage / Vercel Blob / S3) bağlanmalı.
- Otomatik sınıflandırma `after()` ile istek bitince çalışır; yoğunlukta bir kuyruğa taşınmalı.
- Sonraki faz adayları: e-Fatura/e-Arşiv XML okuma, e-posta/SMS hatırlatma, ofis içi çok kullanıcı
  ve davet, müşavirin panelden belge yüklemesi, toplu ZIP indirme.
