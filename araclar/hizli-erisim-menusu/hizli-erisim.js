/*
 * Hızlı Erişim Menüsü (yer imi uygulaması)
 *
 * Kullanım:
 *   Herhangi bir web sayfasında yer imine tıklanınca ekranın solunda bağlantı listesi açılır.
 *   Yer imine tekrar tıklanınca veya Esc tuşuna basılınca kapanır.
 *
 * Not: Veriler yalnızca tarayıcıda işlenir; hiçbir yere gönderilmez ve sayfadaki hiçbir bilgi okunmaz.
 */
(() => {
  const ID = 'hizliErisimMenusu';
  const eski = document.getElementById(ID);
  if (eski) { eski.remove(); return; }

  const SON_GUNCELLEME = '04.11.2026';

  /* Bağlantı listesi: t = başlık, d = açıklama, u = adres */
  const BAGLANTILAR = [
    {
      "t": "DYS",
      "d": "Doküman Yönetim Sistemi",
      "u": "https://dys.saglik.gov.tr/"
    },
    {
      "t": "EKİP",
      "d": "Entegre Kurumsal İşlem Platformu",
      "u": "https://ekip.saglik.gov.tr/"
    },
    {
      "t": "Sağlık E-Posta",
      "d": "Sağlık E-Posta Sistemi",
      "u": "https://eposta.saglik.gov.tr/owakontrol/"
    },
    {
      "t": "AKGÜN İKBS",
      "d": "İnsan Kaynakları Bilgi Sistemi",
      "u": "https://akgunikbs.giresunsaglik.gov.tr/ikbs-web/gen/anasayfa.htm"
    },
    {
      "t": "AKGÜN HBYS",
      "d": "Hastane Bilgi Yönetim Sistemi",
      "u": "https://akgunhbys.giresunsaglik.gov.tr/hbys-web/gen/anasayfa.htm"
    },
    {
      "t": "CİMER",
      "d": "Cumhurbaşkanlığı İletişim Merkezi başvuru takip sistemi",
      "u": "https://kapi.cimer.gov.tr/Hesap/Giris"
    },
    {
      "t": "SABİM",
      "d": "Sağlık Bakanlığı İletişim Merkezi başvuru takip sistemi",
      "u": "https://crm.sabim.gov.tr/login"
    },
    {
      "t": "Açık Kapı",
      "d": "Açık Kapı başvuru takip sistemi",
      "u": "https://acikkapi.gov.tr/Hesap/Giris"
    },
    {
      "t": "MHRS Kurum",
      "d": "Randevu Yönetimi",
      "u": "https://www.mhrs.gov.tr/kurum/"
    },
    {
      "t": "KPS Yönetim",
      "d": "Sağlık Bakanlığı Kimlik Paylaşım Sistemi",
      "u": "https://kpsyonetimv2.saglik.gov.tr/"
    },
    {
      "t": "ÖBS",
      "d": "Ölüm Bildirim Sistemi",
      "u": "https://obs.saglik.gov.tr/Account/Login"
    },
    {
      "t": "Ölüm Belgesi Doğrulama",
      "d": "Ölüm Belgesi Doğrulama",
      "u": "https://obs.saglik.gov.tr/DogrulamaServisi"
    },
    {
      "t": "İSG-KATİP",
      "d": "İş Sağlığı ve Güvenliği Kayıt, Takip ve Analiz Programı",
      "u": "https://isgkatip.csgb.gov.tr/"
    },
    {
      "t": "HİTAP",
      "d": "Hizmet Takip Programı",
      "u": "https://hitap.sgk.gov.tr/HitapWeb/login"
    },
    {
      "t": "SGK Tescil",
      "d": "Sigortalı İşe Giriş ve İşten Ayrılış Bildirgeleri",
      "u": "https://uyg.sgk.gov.tr/SigortaliTescil/amp/loginldap"
    },
    {
      "t": "Kamu SM",
      "d": "Sağlık Bakanlığı E-imza Başvuru",
      "u": "https://portal.kamusm.gov.tr/bp/ws.go"
    },
    {
      "t": "Vizite Bildirim",
      "d": "Çalışılmadığına Dair Bildirim Giriş Sistemi",
      "u": "https://uyg.sgk.gov.tr/vizite/welcome.do"
    },
    {
      "t": "Yazılım Destek",
      "d": "Sağlık Bakanlığı Yardım Masası",
      "u": "https://yazilimdestek.saglik.gov.tr/"
    },
    {
      "t": "e-Nabız Yönetim",
      "d": "e-Nabız Yönetim",
      "u": "https://yonetim.enabiz.gov.tr/"
    },
    {
      "t": "E-Devlet",
      "d": "e-Devlet Kapısı Devletin Kısayolu",
      "u": "https://turkiye.gov.tr/"
    },
    {
      "t": "SİNA",
      "d": "Sağlıkta İstatistik ve Nedensel Analizler",
      "u": "https://uzem.giresunsaglik.gov.tr/"
    },
    {
      "t": "EKİP Portal",
      "d": "Entegre Kurumsal İşlem Platformu Portal",
      "u": "https://ekipportal.saglik.gov.tr/"
    },
    {
      "t": "PAGO",
      "d": "Personel Bilgi Yönetim Sistemi",
      "u": "https://uzem.giresunsaglik.gov.tr/"
    },
    {
      "t": "EHİP",
      "d": "Tıbbi Cihaz Takibi",
      "u": "http://10.28.0.6:8081/EhipSM/Default.aspx"
    },
    {
      "t": "Eğitim İstatistik Sistemi (Giresun)",
      "d": "Eğitim İstatistik Sistemi",
      "u": "http://10.28.3.33:8081/"
    },
    {
      "t": "Web Sitesi Yönetim",
      "d": "Sağlık Bakanlığı Web İçerik Yönetimi",
      "u": "https://webyonetimhastane.saglik.gov.tr/"
    },
    {
      "t": "Tarım Bulut",
      "d": "Su Verimliliği Raporu Gönder",
      "u": "https://dosya.tarimorman.gov.tr/app/tr-TR/Form/Paylas/TarimBulut/2f1e3e54-af06-4c4c-a92f-6a9510ce5a15"
    },
    {
      "t": "PTT Kep Online",
      "d": "Kayıtlı Elektronik Posta (KEP) Sistemi",
      "u": "https://pttbasvuru.hs01.kep.tr/"
    },
    {
      "t": "Konferans Uygulaması",
      "d": "Sağlık Bakanlığı",
      "u": "https://konferans.saglik.gov.tr/"
    }
  ];

  const CSS = `
    :host{all:initial}
    *{box-sizing:border-box;margin:0;padding:0}
    .panel{position:fixed;top:0;left:0;width:340px;max-width:100vw;height:100vh;display:flex;flex-direction:column;
      background:#f3f6fa;color:#12263f;font:14px/1.4 "Segoe UI",Roboto,Arial,sans-serif;
      box-shadow:8px 0 32px rgba(4,16,36,.35);animation:gir .25s ease}
    @keyframes gir{from{transform:translateX(-100%)}to{transform:none}}
    .ust{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;background:#0b2f5c;color:#fff}
    .ust h2{font-size:17px;font-weight:600;letter-spacing:.3px}
    .kapat{width:32px;height:32px;border:1px solid rgba(255,255,255,.55);border-radius:50%;background:transparent;color:#fff;
      font-size:20px;line-height:1;cursor:pointer}
    .kapat:hover{background:rgba(255,255,255,.18)}
    .ara{padding:12px 14px;background:#fff;border-bottom:1px solid #d5dde8}
    .ara input{-webkit-user-select:text;user-select:text;width:100%;padding:9px 12px;border:1px solid #d5dde8;border-radius:8px;font:inherit;color:#12263f;outline:none}
    .ara input:focus{border-color:#1a73c7}
    .liste{flex:1;overflow-y:auto;list-style:none;padding:10px}
    .liste li{margin-bottom:8px}
    .liste a{display:flex;align-items:center;gap:12px;padding:10px 12px;background:#fff;border:1px solid #d5dde8;border-radius:10px;
      color:inherit;text-decoration:none;transition:border-color .2s,box-shadow .2s}
    .liste a:hover{border-color:#1a73c7;box-shadow:0 4px 12px rgba(26,115,199,.16)}
    .metin{min-width:0}
    .metin b{display:block;font-size:14px;font-weight:600}
    .metin small{display:block;font-size:12px;color:#5a7390;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .bos{padding:24px 10px;text-align:center;color:#5a7390}
    .alt{display:flex;justify-content:space-between;gap:12px;padding:8px 14px;font-size:12px;color:#5a7390;border-top:1px solid #d5dde8;background:#fff}
    .alt span:first-child{text-align:left}
    .alt span:last-child{text-align:right}
  `;

  const sunucu = document.createElement('div');
  sunucu.id = ID;
  sunucu.style.cssText = 'all:initial;position:fixed;top:0;left:0;z-index:2147483647;';
  const kok = sunucu.attachShadow({ mode: 'open' });

  try {
    const sayfa = new CSSStyleSheet();
    sayfa.replaceSync(CSS);
    kok.adoptedStyleSheets = [sayfa];
  } catch (e) {
    const stil = document.createElement('style');
    stil.textContent = CSS;
    kok.appendChild(stil);
  }

  const panel = document.createElement('aside');
  panel.className = 'panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Hızlı Erişim Menüsü');

  const ust = document.createElement('div');
  ust.className = 'ust';
  const baslik = document.createElement('h2');
  baslik.textContent = 'Hızlı Erişim Menüsü';
  const kapat = document.createElement('button');
  kapat.className = 'kapat';
  kapat.type = 'button';
  kapat.setAttribute('aria-label', 'Kapat');
  kapat.textContent = '×';
  ust.append(baslik, kapat);

  const ara = document.createElement('div');
  ara.className = 'ara';
  const girdi = document.createElement('input');
  girdi.type = 'search';
  girdi.placeholder = 'Ara...';
  girdi.autocomplete = 'off';
  girdi.spellcheck = false;
  ara.appendChild(girdi);

  const liste = document.createElement('ul');
  liste.className = 'liste';

  const alt = document.createElement('div');
  alt.className = 'alt';
  const sayi = document.createElement('span');
  const tarih = document.createElement('span');
  tarih.textContent = 'Son güncelleme: ' + SON_GUNCELLEME;
  alt.append(sayi, tarih);

  const turkceKucult = (s) => s.toLocaleLowerCase('tr');

  function ciz(filtre) {
    const f = turkceKucult(filtre || '');
    const secilen = BAGLANTILAR.filter((b) => !f || turkceKucult(b.t + ' ' + b.d).includes(f));
    liste.textContent = '';
    if (!secilen.length) {
      const bos = document.createElement('li');
      bos.className = 'bos';
      bos.textContent = 'Sonuç bulunamadı.';
      liste.appendChild(bos);
    }
    secilen.forEach((b) => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = b.u;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      const metin = document.createElement('span');
      metin.className = 'metin';
      const t = document.createElement('b');
      t.textContent = b.t;
      const d = document.createElement('small');
      d.textContent = b.d;
      metin.append(t, d);
      a.appendChild(metin);
      li.appendChild(a);
      liste.appendChild(li);
    });
    sayi.textContent = secilen.length + ' bağlantı';
  }

  /* Sayfanın kendi olay dinleyicileri (kısayol tuşları, odak tuzakları vb.) panelin
     çalışmasını bozmasın diye panel içindeki olaylar sayfaya ulaştırılmaz. */
  const OLAYLAR = ['keydown', 'keyup', 'keypress', 'beforeinput', 'input', 'focusin', 'focusout',
    'mousedown', 'mouseup', 'click', 'pointerdown', 'pointerup', 'touchstart', 'touchend'];
  const icerde = (e) => e.composedPath().indexOf(sunucu) !== -1;

  function olay(e) {
    if (e.type === 'keydown' && e.key === 'Escape') { kapatPanel(); return; }
    if (!icerde(e)) {
      /* Menünün dışına tıklanınca menü kapanır */
      if (e.type === 'pointerdown' || e.type === 'mousedown' || e.type === 'touchstart') kapatPanel();
      return;
    }
    if (e.type === 'input') ciz(girdi.value);
    if (e.type === 'click' && e.composedPath().indexOf(kapat) !== -1) kapatPanel();
    e.stopImmediatePropagation();
  }
  function kapatPanel() {
    OLAYLAR.forEach((o) => window.removeEventListener(o, olay, true));
    sunucu.remove();
  }
  OLAYLAR.forEach((o) => window.addEventListener(o, olay, true));

  ciz('');
  panel.append(ust, ara, liste, alt);
  kok.appendChild(panel);
  document.documentElement.appendChild(sunucu);
  girdi.focus();
})();
