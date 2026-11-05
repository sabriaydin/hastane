/* ============================================
   VERİ DOSYASI — DÜZENLEME ALANI
   Hızlı erişim bağlantılarını ve araçları
   aşağıdaki listelerden değiştirebilirsiniz.
   logo: assets/images/logos/ klasöründeki dosya adı
   icon: logo bulunamazsa gösterilecek simge
   ============================================ */

const LOGO_DIR = "assets/images/logos/";

const LINKS = [
  { icon: "📄", logo: "dys.png",            title: "DYS",                  desc: "Doküman Yönetim Sistemi",                                   url: "https://dys.saglik.gov.tr/" },
  { icon: "🧩", logo: "ekip.png",           title: "EKİP",                 desc: "Entegre Kurumsal İşlem Platformu",                          url: "https://ekip.saglik.gov.tr/" },
  { icon: "✉️", logo: "saglik-eposta.png",    title: "Sağlık E-Posta",       desc: "Sağlık E-Posta Sistemi",                                    url: "https://eposta.saglik.gov.tr/owakontrol/" },
  { icon: "👥", logo: "akgun.png",          title: "AKGÜN İKBS",           desc: "İnsan Kaynakları Bilgi Sistemi",                            url: "https://akgunikbs.giresunsaglik.gov.tr/ikbs-web/gen/anasayfa.htm" },
  { icon: "🏥", logo: "akgun.png",          title: "AKGÜN HBYS",           desc: "Hastane Bilgi Yönetim Sistemi",                             url: "https://akgunhbys.giresunsaglik.gov.tr/hbys-web/gen/anasayfa.htm" },
  { icon: "📢", logo: "cimer.png",          title: "CİMER",                desc: "Cumhurbaşkanlığı İletişim Merkezi başvuru takip sistemi",   url: "https://kapi.cimer.gov.tr/Hesap/Giris" },
  { icon: "☎️", logo: "sabim.png",          title: "SABİM",                desc: "Sağlık Bakanlığı İletişim Merkezi başvuru takip sistemi",   url: "https://crm.sabim.gov.tr/login" },
  { icon: "🚪", logo: "acik-kapi.png",       title: "Açık Kapı",            desc: "Açık Kapı başvuru takip sistemi",                           url: "https://acikkapi.gov.tr/Hesap/Giris" },
  { icon: "📅", logo: "mhrs.png",           title: "MHRS Kurum",           desc: "Randevu Yönetimi",                                          url: "https://www.mhrs.gov.tr/kurum/" },
  { icon: "🪪", logo: "kps.png",            title: "KPS Yönetim",          desc: "Sağlık Bakanlığı Kimlik Paylaşım Sistemi",                  url: "https://kpsyonetimv2.saglik.gov.tr/" },
  { icon: "📋", logo: "saglik-bakanligi.png", title: "ÖBS",                 desc: "Ölüm Bildirim Sistemi",                                     url: "https://obs.saglik.gov.tr/Account/Login" },
  { icon: "✅", logo: "saglik-bakanligi.png", title: "Ölüm Belgesi Doğrulama", desc: "Ölüm Belgesi Doğrulama",                                 url: "https://obs.saglik.gov.tr/DogrulamaServisi" },
  { icon: "🦺", logo: "isg-katip.png",       title: "İSG-KATİP",            desc: "İş Sağlığı ve Güvenliği Kayıt, Takip ve Analiz Programı",   url: "https://isgkatip.csgb.gov.tr/" },
  { icon: "🗂️", logo: "sgk.png",            title: "HİTAP",                desc: "Hizmet Takip Programı",                                     url: "https://hitap.sgk.gov.tr/HitapWeb/login" },
  { icon: "🛡️", logo: "sgk.png",            title: "SGK Tescil",           desc: "Sigortalı İşe Giriş ve İşten Ayrılış Bildirgeleri",         url: "https://uyg.sgk.gov.tr/SigortaliTescil/amp/loginldap" },
  { icon: "🔏", logo: "kamu-sm.png",         title: "Kamu SM",              desc: "Sağlık Bakanlığı E-imza Başvuru",                           url: "https://portal.kamusm.gov.tr/bp/ws.go" },
  { icon: "🩹", logo: "sgk.png",             title: "Vizite Bildirim",      desc: "Çalışılmadığına Dair Bildirim Giriş Sistemi",               url: "https://uyg.sgk.gov.tr/vizite/welcome.do" },
  { icon: "🛠️", logo: "yazilim-destek.png",  title: "Yazılım Destek",       desc: "Sağlık Bakanlığı Yardım Masası",                            url: "https://yazilimdestek.saglik.gov.tr/" },
  { icon: "🩺", logo: "e-nabiz.png",         title: "e-Nabız Yönetim",      desc: "e-Nabız Yönetim",                                           url: "https://yonetim.enabiz.gov.tr/" },
  { icon: "🏛️", logo: "e-devlet.png",        title: "E-Devlet",             desc: "e-Devlet Kapısı",                         url: "https://turkiye.gov.tr/" },
  { icon: "📊", logo: "sina.png",           title: "SİNA",                 desc: "Sağlıkta İstatistik ve Nedensel Analizler",                 url: "https://uzem.giresunsaglik.gov.tr/" },
  { icon: "🧩", logo: "ekip.png",           title: "EKİP Portal",          desc: "Entegre Kurumsal İşlem Platformu Portal",                   url: "https://ekipportal.saglik.gov.tr/" },
  { icon: "👤", logo: "pago.png",           title: "PAGO",                 desc: "Personel Bilgi Yönetim Sistemi",                            url: "https://uzem.giresunsaglik.gov.tr/" },
  { icon: "⚙️", logo: "ehip.png",        title: "EHİP",                 desc: "Tıbbi Cihaz Takibi",                                        url: "http://10.28.0.6:8081/EhipSM/Default.aspx" },
  { icon: "📈", logo: "saglik-bakanligi.png", title: "Eğitim İstatistik Sistemi (Giresun)", desc: "Eğitim İstatistik Sistemi",          url: "http://10.28.3.33:8081/" },
  { icon: "🌐", logo: "saglik-bakanligi.png", title: "Web Sitesi Yönetim",  desc: "Sağlık Bakanlığı Web İçerik Yönetimi",                      url: "https://webyonetimhastane.saglik.gov.tr/" },
  { icon: "💧", logo: "tarim-bulut.png",  title: "Tarım Bulut",          desc: "Su Verimliliği Raporu Gönder",                              url: "https://dosya.tarimorman.gov.tr/app/tr-TR/Form/Paylas/TarimBulut/2f1e3e54-af06-4c4c-a92f-6a9510ce5a15" },
  { icon: "📨", logo: "ptt-kep.png",         title: "PTT Kep Online Başvuru",       desc: "Kayıtlı Elektronik Posta (KEP) Sistemi",                    url: "https://pttbasvuru.hs01.kep.tr/" },
  { icon: "📨", logo: "ptt-kep.png",         title: "PTT Kep Webmail",       desc: "Kayıtlı Elektronik Posta (KEP) Sistemi",                    url: "https://ptt.hs01.kep.tr/" },
  { icon: "🎥", logo: "konferans.png",      title: "Konferans Uygulaması", desc: "Sağlık Bakanlığı",                                          url: "https://konferans.saglik.gov.tr/" },
  { icon: "🎓", logo: "uzaktan-egitim-kapisi.png", title: "Uzaktan Eğitim Kapısı", desc: "Uzaktan Eğitim Platformu", url: "https://uzaktanegitimkapisi.gov.tr/" }
];

/* Araçlar penceresinde gösterilecek öğeler.
   Örnek satır (başına // koymadan listeye ekleyin):
   { icon: "🧮", title: "Araç Adı", desc: "Kısa açıklama", url: "https://ornek.com" }
   logo (isteğe bağlı): assets/images/logos/ klasöründeki dosya adı */
const TOOLS = [
  { icon: "📋", title: "EKİP Personel İzin Bilgisi Raporlama", desc: "EKİP sisteminde toplu personel izin ve rapor bilgisi listeleme özelliği olmadığından harici olarak kullanılır.", url: "araclar/ekip-izin-raporu/index.html" },
  { icon: "📌", title: "Hızlı Erişim Menüsü", desc: "İhtiyacınız olabilecek tüm bağlantılara istediğinizde anında erişin!", url: "araclar/hizli-erisim-menusu/index.html" },
  { icon: "📑", title: "PDF Düzenleyici", desc: "PDF dosyalarınızı güvenle birleştirin, ayırın, döndürün, sıkıştırın ve koruyun.", url: "araclar/pdf-duzenleyici/index.html" },
  { icon: "🔤", title: "Harf Çevirme", desc: "Metni büyük harf, küçük harf, ters ve baş harfi büyük gibi biçimlere çevirir.", url: "araclar/harf-cevirme/index.html" }
];

/* Belgeler penceresinde gösterilecek öğeler (içerik daha sonra eklenecek).
   Örnek satır: { icon: "📄", title: "Belge Adı", desc: "Kısa açıklama", url: "belgeler/ornek.pdf" } */
const DOCS = [];

/* Sık Sorulan Sorular penceresinde gösterilecek öğeler (içerik daha sonra eklenecek). */
const FAQ = [];
