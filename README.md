# Defterdar

Mali müşavirler için aylık evrak toplama. Mükellef hesap açmadan kendine özel linkten belgesinin
fotoğrafını çeker, sistem belgenin türünü otomatik önerir, müşavir yalnızca onaylar. Pano her ay
"kimden ne eksik, son güne kaç gün kaldı?" sorusunu tek ekranda cevaplar.

## Ne yapıyor

- **Bu ay (pano):** Toplanan dönemin yaprağı (son teslim günü, kalan gün, tamamlanma), aciliyete göre
  sıralı mükellef listesi ve eksik evraklar. Eksiği olana tek tıkla WhatsApp hatırlatması (hazır metin + link).
- **Gelen evrak:** Mükelleflerin yüklediği belgeler; önerilen tür, güven oranı ve kısa özet.
  Onayla / sebep yazarak reddet (sebep mükellefin ekranında görünür).
- **Mükellefler:** Her mükellef için son 12 dönemin şeridi, beklenen evrak listesi, yükleme linki
  (kopyala, aç, yenile, kapat), dönemi "tamam say".
- **Mükellef portalı (`/y/<token>`):** Telefona göre tasarlandı. Beklenen her evrak için büyük
  "Fotoğraf çek" ve "Dosya seç" butonları, yükleme ilerlemesi, gönderilenlerin durumu. Fotoğraflar
  yüklemeden önce telefonda küçültülür.
- **Ayarlar:** Ofis adı, son teslim günü, evrak türleri.

## Çalıştırma

```bash
npm install
npm run dev
```

Kurulum gerekmez: `DATABASE_URL` yoksa gömülü Postgres (PGlite) `.data/pglite` klasöründe çalışır,
şema ilk açılışta kurulur ve geliştirme ortamında bir demo ofis eklenir:

- Demo hesap: `demo@defterdar.test` / `defterdar-demo` (yalnızca geliştirme; `src/lib/db/seed.ts`)

Veriyi sıfırlamak için `.data` klasörünü silin.

Ortam değişkenleri için `.env.example` dosyasına bakın. Belge içeriğinden sınıflandırma için
`ANTHROPIC_API_KEY` gerekir; yoksa tür dosya adından tahmin edilir.

## Komutlar

| Komut | İş |
| --- | --- |
| `npm run dev` | Geliştirme sunucusu |
| `npm test` | Birim testleri (Vitest) |
| `npm run typecheck` | TypeScript kontrolü |
| `npm run lint` | ESLint |
| `npm run build` | Üretim derlemesi |

## Yığın

Next.js 16 (App Router, Cache Components) · React 19 · TypeScript · Tailwind v4 · shadcn/ui ·
Postgres (RLS) · Anthropic API (belge sınıflandırma) · Vitest.

Mimari kararlar ve güvenlik modeli: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
Ürün tanımı: [PRODUCT.md](PRODUCT.md).

## Lisans

[MIT](LICENSE)
