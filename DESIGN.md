# Design

Defterdar'ın görsel dünyası: **yaprak takvim** (Türk duvar takvimi). Kaynak tokenlar
`src/app/globals.css` içindedir; bu belge onların neden öyle olduğunu anlatır.

## Mod

Müşavir paneli ve mükellef portalı **Operate** yüzeyleridir: standart kontroller, önce taranabilirlik.
Dünya yalnızca dört şey katar: tipografi, renk, yoğunluk ve tek bir imza hareketi. Düzeni ve
kontrolleri dünya belirlemez.

## Renk

| Token | Rol |
| --- | --- |
| `--paper` | Zemin. Takvim kâğıdı, çok hafif soğuk beyaz. |
| `--ink` | Metin. Takvim siyahı, saf siyah değil. |
| `--cover` / `--cover-foreground` / `--cover-muted` | Sol ray, portal başlığı, birincil buton. Takvim kapağının laciverti. |
| `--sunday` / `--sunday-soft` | Son gün, eksik evrak, hata. Pazar kırmızısı. Başka hiçbir şey için kullanılmaz. |
| `--sunday-on-cover` | Lacivert zemin üstündeki kırmızı (kontrast için açılmış). |
| `--done` / `--done-soft` | Tamamlanan. Koyu yaprak yeşili. |
| `--review` / `--review-soft` | Onay bekleyen. Amber; gelen evrak sayacı da bu renktir, kırmızı değil. |
| `--rule` | Saç teli çizgiler ve tablo ayraçları. |

Kural: kırmızı = eksik ya da gecikmiş, amber = sizi bekliyor, yeşil = bitti. Durum hiçbir yerde
yalnızca renkle anlatılmaz; her rozetin ikonu ve metni vardır.

Açık tema bilinçli bir seçim: kullanım sahnesi gün ışığında, ofis masasında, kâğıt evrakla yan yana.

## Tipografi

Tek aile: **Archivo** (değişken, `wdth` ekseni). Gövde normal genişlikte; takvim rakamları
`.numeral` sınıfıyla dar (68%) ve 800 ağırlıkta, tabular. Tüm sayfada `tnum` açık; tablolardaki
rakamlar alt alta hizalanır. Başlıklar `text-wrap: balance`.

## İmza hareketi

1. **Dönem yaprağı** (`src/components/period-sheet.tsx`): kırmızı başlık bandı ve üst kenarda
   delik sırası (`.perforated`), dev kırmızı son gün rakamı, kalan gün (aciliyete göre renkli),
   Tamam / Onay bekliyor / Eksik sayıları ve mükellef başına bir parçalı ilerleme şeridi.
   Portalda aynı yaprak küçük hâliyle mükellefe son günü söyler.
2. **12 ay şeridi** (`src/components/month-strip.tsx`): her mükellefte aynı ölçekte 12 takvim
   hücresi. Tamamlanan ay koparılmış yaprak gibi soluk, eksik ay dolu kırmızı, hiç gelmeyen ay kalın
   kırmızı çerçeveli, takip öncesi aylar kesik çizgili boş hücre. Satırlar alt alta okunduğunda
   "sürekli geç kalan" mükellef kırmızı sıradan hemen seçilir.

## Bileşen dili

- Köşe yarıçapı küçük (`--radius: 0.375rem`); kart ızgarası yok, saç teli tablolar ve listeler var.
- Gölge yalnızca dönem yaprağında, ofsetli ve yumuşak.
- Odak halkası `--ring` ile 2px, seçim rengi paletten.
- Portal: taban 17px, butonlar 48px yükseklik, her evrak satırında "Fotoğraf çek" (birincil) ve
  "Dosya seç". Gelmiş evrakın butonları ikincil stile iner ("Bir tane daha"). Başarı yeşil satırla,
  hata ikon + "Tekrar dene" ile gösterilir.
- Hareket azaltma tercihi tüm geçişleri kapatır.
