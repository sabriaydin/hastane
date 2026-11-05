# Hastane360

Statik web sitesi. GitHub Pages ile yayınlanır (Settings → Pages → Branch: main / root).

## Klasör Yapısı

```
index.html
css/style.css          Tasarım
js/data.js             Hızlı erişim bağlantıları ve araçlar listesi (düzenleme alanı)
js/main.js             Portal mantığı
assets/images/logos/   Logo dosyaları
araclar/               Araçlar penceresindeki uygulamalar (her araç kendi klasöründe)
  ekip-izin-raporu/    EKİP Personel İzin Bilgisi Raporlama (kurulum sayfası)
  hizli-erisim-menusu/ Hızlı Erişim Menüsü (yer imi uygulaması, sol panel)
  pdf-duzenleyici/     PDF Düzenleyici (birleştir, ayır, PDF↔JPG; lib/ klasöründe yerel kütüphaneler)
  harf-cevirme/        Harf Çevirme (büyük/küçük harf, ters, rastgele, baş harfi büyük)
```

## Logo Dosyaları

Logolar `assets/images/logos/` klasörüne aşağıdaki adlarla eklenmelidir (PNG, önerilen boyut 256×256, şeffaf arka plan).
Dosya bulunamazsa kartta otomatik olarak simge gösterilir.

| Yeni dosya adı | Eski ad |
|---|---|
| `dys.png` | dys-logo.png |
| `ekip.png` | ekip-logo.png |
| `saglik-eposta.png` | saglikposta-logo.png |
| `akgun.png` | akgun-logo.png |
| `cimer.png` | cimer-logo.png |
| `sabim.png` | sabim-logo.png |
| `acik-kapi.png` | acikkapi-logo.png |
| `mhrs.png` | mhrs-logo.png |
| `kps.png` | kps-logo.png |
| `saglik-bakanligi.png` | saglikbakanligi-logo.png |
| `isg-katip.png` | isgkatip-logo.png |
| `sgk.png` | sgk-logo.png |
| `kamu-sm.png` | kamusm-logo.png |
| `yazilim-destek.png` | yazilimdestek-logo.png |
| `e-nabiz.png` | Enabiz-logo.png |
| `e-devlet.png` | edevlet-logo.png |
| `sina.png` | sina-logo.png |
| `pago.png` | pago-logo.png |
| `ehip.png` | ventura-logo.png |
| `tarim-bulut.png` | suverimliligi-logo.png |
| `ptt-kep.png` | PTTKep-Logo.png |
| `konferans.png` | Konferans-Logo.png |

## Bağlantı / Araç Ekleme

`js/data.js` içindeki `LINKS` (Hızlı Erişim) ve `TOOLS` (Araçlar) listelerine satır eklenir veya silinir.

## Hızlı Erişim Menüsü

Yer imi uygulamasındaki bağlantı listesi `js/data.js` içindeki `LINKS` listesinden üretilmiştir. `LINKS` değiştirilirse `araclar/hizli-erisim-menusu/` dosyaları yeniden oluşturulmalıdır.
