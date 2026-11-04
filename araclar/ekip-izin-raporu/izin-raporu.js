/*
 * EKİP Personel İzin Bilgisi Raporlama (Chrome Console)
 * Sayfa: https://ekip.saglik.gov.tr/Registry/EmployeeLeave/List
 *
 * Kullanım:
 *   1) Sayfa açıkken oturum açık olmalıdır.
 *   2) F12 > Console sekmesine bu betiğin tamamı yapıştırılıp Enter'a basılır.
 *   3) Sağ altta açılan panele T.C. Kimlik No listesi (her satıra bir numara) yapıştırılır.
 *   4) Başlat düğmesine basılır; ilerleme çubuğundan takip edilir.
 *   5) İsteğe bağlı: panelden tarih aralığı seçilirse, yalnızca bu aralıkla kesişen izinler rapora alınır.
 *   6) Bitince "Excel İndir" ile sütun genişlikleri otomatik ayarlı tek .xlsx dosyası indirilir.
 *
 * Not: Betik yalnızca OKUMA yapar (Ara, sayfa/listeleme). İzin girişi, iptal, kesme vb. düğmelere basmaz.
 *      Veriler yalnızca tarayıcıda işlenir, hiçbir yere gönderilmez.
 */
(() => {
  const $ = window.jQuery;
  if (!$ || !$('#leave-request-grid').data('kendoGrid')) {
    console.error('Sayfa bulunamadı. Betik, "Sağlık Sistemi > Sicil > Sicil İşlemleri > Ücretli İzin İşlemleri" sayfasında çalıştırılmalıdır.');
    alert('Sayfa bulunamadı.\n\nBu araç, EKİP sisteminde "Sağlık Sistemi > Sicil > Sicil İşlemleri > Ücretli İzin İşlemleri" sayfası açıkken çalıştırılmalıdır.');
    return;
  }
  if (document.getElementById('izinPanel')) document.getElementById('izinPanel').remove();

  const KOLON_OZET = [
    ['sicil', 'Sicil No'], ['ad', 'Adı'], ['soyad', 'Soyadı'], ['durum', 'Personel Durumu'],
    ['istihdam', 'İstihdam Şekli'], ['devreden', 'Devreden İzin'], ['hakedilen', 'Bu Yıl Hak Edilen'],
    ['kullanilan', 'Kullanılan İzin'], ['kalan', 'Kalan İzin'],
  ];
  const KOLON_DETAY = [
    ['sicil', 'Sicil No'], ['ad', 'Adı'], ['soyad', 'Soyadı'],
    ['LeaveTypeName', 'İzin Türü'], ['LeaveDetailTypeName', 'İzin Detay'],
    ['LeaveStartDate', 'Başlangıç'], ['LeaveDayCount', 'Gün'], ['LeaveEndDate', 'Bitiş'],
    ['WorkStartDate', 'İşe Başlama'], ['Description', 'Açıklama'], ['StatusTypeName', 'Talep Durumu'], ['CreatedDate', 'Oluşturma Tarihi'],
  ];
  const TARIH_ALANLARI = ['LeaveStartDate', 'LeaveEndDate', 'WorkStartDate', 'CreatedDate'];
  // Tek dosya: personel bilgisi + izin kaydı + bakiye sütunları
  const KOLON_RAPOR = [...KOLON_OZET.slice(0, 5), ...KOLON_DETAY.slice(3)];
  // Ayrı sayfa: personel başına tek satır izin bakiyeleri
  const KOLON_BAKIYE = [...KOLON_OZET.slice(0, 3), ...KOLON_OZET.slice(5)];
  const SAYFA_BOYUTU = 20; // Sayfanın kendi sayfa boyutu (sunucu daha büyük değeri kabul etmeyebilir)

  const SAYI_ALANLARI = ['LeaveDayCount', 'devreden', 'hakedilen', 'kullanilan', 'kalan', 'kayitSayisi'];
  let filtreBas = null; // Tarih filtresi (Date veya null)
  let filtreBit = null;

  const ozetler = [];
  const detaylar = [];
  let durdur = false;
  let calisiyor = false;

  const bekle = (ms) => new Promise((r) => setTimeout(r, ms));
  const deger = (id) => String($('#' + id).val() ?? '').trim();

  // --- Sayfanın kendi AJAX yanıtlarını bekleme ---
  const bekleyenler = {};
  $(document).off('ajaxComplete.izinRapor').on('ajaxComplete.izinRapor', (e, xhr, opt) => {
    const url = (opt && opt.url) || '';
    Object.keys(bekleyenler).forEach((anahtar) => {
      if (url.includes(anahtar)) {
        const liste = bekleyenler[anahtar];
        bekleyenler[anahtar] = [];
        liste.forEach((f) => f());
      }
    });
  });
  // Tanı amaçlı: son izin listesi isteği ve olası sunucu hatası (kişisel veri içermez; şifreli kimlik gizlenir)
  let sonIstek = null;
  let sonHata = null;
  const LISTE_URL = 'GetPersonnelLeaveRequestList';
  $(document).off('ajaxSend.izinRapor').on('ajaxSend.izinRapor', (e, xhr, opt) => {
    if (((opt && opt.url) || '').includes(LISTE_URL)) {
      sonIstek = String(opt.data || '').replace(/(EncryptedEmployeeId=)[^&]*/, '$1<gizli>');
    }
  });
  $(document).off('ajaxError.izinRapor').on('ajaxError.izinRapor', (e, xhr, opt) => {
    if (((opt && opt.url) || '').includes(LISTE_URL)) {
      sonHata = `HTTP ${xhr.status} ${String(xhr.responseText || '').replace(/\s+/g, ' ').slice(0, 200)}`;
    }
  });
  const ajaxBekle = (anahtar, zaman = 15000) =>
    new Promise((coz, red) => {
      const t = setTimeout(() => red(new Error('Yanıt alınamadı (personel bulunamadı olabilir)')), zaman);
      (bekleyenler[anahtar] = bekleyenler[anahtar] || []).push(() => { clearTimeout(t); coz(); });
    });

  // Değeri yalnızca-tarih (saat 00:00) Date nesnesine çevirir; çevrilemezse null döner
  const tarihNesne = (v) => {
    if (!v) return null;
    let d = null;
    if (v instanceof Date) d = v;
    else if (typeof v === 'string') {
      const m = v.match(/\/Date\((-?\d+)/);
      const t = v.match(/^(\d{2})\.(\d{2})\.(\d{4})/);
      if (m) d = new Date(+m[1]);
      else if (t) d = new Date(+t[3], +t[2] - 1, +t[1]);
      else if (/^\d{4}-\d{2}-\d{2}/.test(v)) d = new Date(v);
    }
    return d && !isNaN(d) ? new Date(d.getFullYear(), d.getMonth(), d.getDate()) : null;
  };

  // --- "Sayfa başına öğe" kutusundan uygun değeri seçme ---
  async function sayfaBoyutuAyarla(ds) {
    const sel = $('#leave-request-grid .k-pager-sizes select');
    const secenekler = sel.find('option').map((i, o) => parseInt(o.value, 10)).get().filter(Number.isFinite);
    const hedef = secenekler.includes(100) ? 100 : Math.max(...secenekler, SAYFA_BOYUTU);
    if (ds.pageSize() === hedef) return hedef;
    const bek = ajaxBekle('GetPersonnelLeaveRequestList', 5000);
    const dd = sel.data('kendoDropDownList');
    if (dd) dd.value(String(hedef));
    sel.val(String(hedef)).trigger('change');
    try {
      await bek;
    } catch (e) {
      // Kutu liste yenilemediyse sayfa boyutu doğrudan ayarlanır
      const bek2 = ajaxBekle('GetPersonnelLeaveRequestList', 10000);
      ds.pageSize(hedef);
      await bek2;
    }
    await bekle(300);
    return hedef;
  }

  // Sayfa değişimi sonrası, daha önce görülmemiş satırlar gelene kadar bekler (eski/geç yanıtlara karşı)
  async function yeniSatirBekle(ds, goruldu, zaman = 15000) {
    let sunucuHatasi = false;
    const hataIsle = () => { sunucuHatasi = true; };
    ds.bind('error', hataIsle);
    try {
      const bas = Date.now();
      while (Date.now() - bas < zaman && !sunucuHatasi) {
        await bekle(250);
        const satirlar = ds.data().toJSON();
        if (satirlar.some((k) => !goruldu.has(JSON.stringify(k)))) return satirlar;
      }
      return ds.data().toJSON();
    } finally {
      ds.unbind('error', hataIsle);
    }
  }

  // Elle yapılan işlemin aynısı: sayfalama numarasına tıklar (numara görünmüyorsa veri kaynağından sayfa değiştirir)
  function sayfayaGit(ds, sayfa) {
    const baglanti = $('#leave-request-grid .k-pager-numbers a[data-page="' + sayfa + '"]');
    if (baglanti.length) baglanti[0].click();
    else ds.page(sayfa);
  }

  // Sunucu, sıralama yokken 2. ve sonraki sayfalara 500 hatası veriyor (1. sayfa sorunsuz). Bu nedenle sıralama uygulanır.
  async function siralamaUygula(ds, sirala) {
    const m = ds.sort();
    if (m && m.length === 1 && m[0].field === sirala.field && m[0].dir === sirala.dir) return true;
    sonHata = null;
    const bek = ajaxBekle(LISTE_URL, 10000);
    ds.sort(sirala);
    try { await bek; } catch (e) { return false; }
    await bekle(300);
    return !sonHata;
  }

  // Tablodaki tüm sayfaları sırayla okur
  async function sayfalariOku(ds) {
    const kayitlar = [];
    const goruldu = new Set();
    let sayfa = 1;
    while (sayfa <= 200) {
      let satirlar;
      if (sayfa > 1) {
        sonHata = null;
        sayfayaGit(ds, sayfa);
        satirlar = await yeniSatirBekle(ds, goruldu, 8000);
      } else if (ds.page() !== 1) {
        const bek = ajaxBekle(LISTE_URL, 10000);
        sayfayaGit(ds, 1);
        try { await bek; } catch (e) { /* zaman aşımı: mevcut veri okunur */ }
        await bekle(300);
        satirlar = ds.data().toJSON();
      } else {
        satirlar = ds.data().toJSON();
      }
      const yeniler = satirlar.filter((k) => {
        const anahtar = JSON.stringify(k);
        if (goruldu.has(anahtar)) return false;
        goruldu.add(anahtar);
        return true;
      });
      kayitlar.push(...yeniler);
      // Toplam kayda ulaşıldıysa veya sayfa yeni kayıt getirmediyse döngü biter
      if (kayitlar.length >= ds.total() || !yeniler.length) break;
      sayfa++;
    }
    return { kayitlar, sayfa };
  }

  // --- Tek personel ---
  async function personelIsle(tc) {
    const bakiyeBekle = ajaxBekle('GetAnnualLeaveInfo');
    const listeBekle = ajaxBekle('GetPersonnelLeaveRequestList');
    Promise.all([bakiyeBekle, listeBekle]).catch(() => {});

    $('#RegistryCode').val('');
    $('#NationalIdentifier').val(tc).trigger('change');
    $('#getEmployeeInfo').click();
    await Promise.all([bakiyeBekle, listeBekle]);
    await bekle(300);

    const ozet = {
      sicil: deger('RegistryCode'), ad: deger('FirstName'), soyad: deger('LastName'), durum: deger('EmployeeStatus'),
      istihdam: deger('EmploymentTypeName'), devreden: deger('TransferredDayOffCount'),
      hakedilen: deger('EarnedDayOffCount'), kullanilan: deger('UsedDayOffCount'),
      kalan: deger('TotalAvailableDayOffCount'), kayitSayisi: 0, not: '',
    };
    if (!ozet.ad) ozet.not = 'Personel bilgisi okunamadı';

    // Tüm izin kayıtları (gerekirse sıralama uygulanarak sayfa sayfa)
    const ds = $('#leave-request-grid').data('kendoGrid').dataSource;
    const boyut = await sayfaBoyutuAyarla(ds);
    const siralamalar = [
      { field: 'LeaveStartDate', dir: 'desc' }, { field: 'CreatedDate', dir: 'desc' }, { field: 'Id', dir: 'asc' },
    ];
    const cokSayfali = ds.total() > boyut;
    let kayitlar = [];
    let sayfa = 1;
    for (let deneme = 0; deneme < (cokSayfali ? siralamalar.length : 1); deneme++) {
      if (cokSayfali && !(await siralamaUygula(ds, siralamalar[deneme]))) continue;
      ({ kayitlar, sayfa } = await sayfalariOku(ds));
      if (kayitlar.length >= ds.total()) break;
    }
    ozet.sayfaSayisi = sayfa;
    if (kayitlar.length < ds.total()) {
      ozet.tani = `Sayfa ${sayfa}: ${sonHata || 'yeni kayıt gelmedi (hata yok)'} | Son istek: ${sonIstek}`;
      ozet.not = (ozet.not ? ozet.not + '; ' : '') + `Uyarı: tüm kayıtlar alınamadı (${kayitlar.length}/${ds.total()})`;
    }
    // Tarih filtresi: izin aralığı, seçilen aralıkla kesişiyorsa kayıt alınır
    const secilen = kayitlar.filter((k) => {
      const bas = tarihNesne(k.LeaveStartDate);
      const bit = tarihNesne(k.LeaveEndDate) || bas;
      if (filtreBas && bit && bit < filtreBas) return false;
      if (filtreBit && bas && bas > filtreBit) return false;
      return true;
    });
    // Her personelin kayıtları: başlangıç tarihi en yeniden eskiye (eşitse oluşturma tarihi en yeniden eskiye)
    const zaman = (v) => { const d = tarihNesne(v); return d ? d.getTime() : -Infinity; };
    secilen.sort((x, y) => (zaman(y.LeaveStartDate) - zaman(x.LeaveStartDate)) || (zaman(y.CreatedDate) - zaman(x.CreatedDate)));
    ozet.kayitSayisi = secilen.length;
    if ((filtreBas || filtreBit) && kayitlar.length && !secilen.length) {
      ozet.not = (ozet.not ? ozet.not + '; ' : '') + 'Seçilen tarih aralığında izin kaydı yok';
    }
    if (!secilen.length) detaylar.push({ ...ozet });
    secilen.forEach((k) => {
      const satir = { ...ozet };
      KOLON_DETAY.slice(3).forEach(([alan]) => {
        satir[alan] = TARIH_ALANLARI.includes(alan) ? tarihNesne(k[alan]) : k[alan];
      });
      detaylar.push(satir);
    });
    return ozet;
  }

  // --- CSV ---
  const hucre = (v) => {
    let s = v == null ? '' : String(v);
    if (/^[=+@]/.test(s)) s = "'" + s;
    return '"' + s.replace(/"/g, '""') + '"';
  };
  const csvYap = (satirlar, kolonlar) =>
    '﻿' + [kolonlar.map((k) => hucre(k[1])).join(';'),
      ...satirlar.map((s) => kolonlar.map((k) => hucre(s[k[0]])).join(';'))].join('\r\n');
  const indir = (ad, icerik) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([icerik], { type: 'text/csv;charset=utf-8' }));
    a.download = ad;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  };

  // --- Excel (.xlsx) üretimi: harici kütüphane gerektirmez ---
  const crcTablo = (() => {
    const t = [];
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })();
  const crc32 = (b) => {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < b.length; i++) c = crcTablo[(c ^ b[i]) & 255] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  };
  const u16 = (n) => [n & 255, (n >> 8) & 255];
  const u32 = (n) => [n & 255, (n >> 8) & 255, (n >> 16) & 255, (n >>> 24) & 255];

  function zipYap(dosyalar) {
    const enc = new TextEncoder();
    const parcalar = [];
    const merkez = [];
    let ofset = 0;
    dosyalar.forEach((d) => {
      const ad = enc.encode(d.ad);
      const veri = enc.encode(d.icerik);
      const crc = crc32(veri);
      const boy = veri.length;
      const yerel = Uint8Array.from([0x50, 0x4b, 3, 4, ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21),
        ...u32(crc), ...u32(boy), ...u32(boy), ...u16(ad.length), ...u16(0)]);
      parcalar.push(yerel, ad, veri);
      merkez.push(Uint8Array.from([0x50, 0x4b, 1, 2, ...u16(20), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21),
        ...u32(crc), ...u32(boy), ...u32(boy), ...u16(ad.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(ofset)]), ad);
      ofset += yerel.length + ad.length + boy;
    });
    const merkezBoy = merkez.reduce((t, p) => t + p.length, 0);
    const son = Uint8Array.from([0x50, 0x4b, 5, 6, ...u16(0), ...u16(0), ...u16(dosyalar.length), ...u16(dosyalar.length),
      ...u32(merkezBoy), ...u32(ofset), ...u16(0)]);
    return new Blob([...parcalar, ...merkez, son], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }

  const xmlKacis = (s) => String(s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const kolonHarfi = (i) => {
    let s = '';
    i++;
    while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); }
    return s;
  };
  const excelSeri = (d) => Math.round((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(1899, 11, 30)) / 86400000);

  function sayfaXml(satirlar, kolonlar, ns, baslik) {
    const genislik = kolonlar.map((k) => String(k[1]).length);
    let xmlSatirlar = '<row r="1">' + kolonlar.map((k, c) =>
      `<c r="${kolonHarfi(c)}1" t="inlineStr" s="1"><is><t>${xmlKacis(k[1])}</t></is></c>`).join('') + '</row>';
    satirlar.forEach((s, r) => {
      const no = r + 2;
      xmlSatirlar += `<row r="${no}">` + kolonlar.map(([alan], c) => {
        const v = s[alan];
        const adres = kolonHarfi(c) + no;
        if (v == null || v === '') return '';
        if (v instanceof Date) {
          genislik[c] = Math.max(genislik[c], 10);
          return `<c r="${adres}" s="2"><v>${excelSeri(v)}</v></c>`;
        }
        if (SAYI_ALANLARI.includes(alan) && /^-?\d+([.,]\d+)?$/.test(String(v).trim())) {
          const n = Number(String(v).trim().replace(',', '.'));
          genislik[c] = Math.max(genislik[c], String(v).length);
          return `<c r="${adres}"><v>${n}</v></c>`;
        }
        genislik[c] = Math.max(genislik[c], String(v).length);
        return `<c r="${adres}" t="inlineStr"><is><t>${xmlKacis(v)}</t></is></c>`;
      }).join('') + '</row>';
    });
    const kolonlarXml = genislik.map((g, c) =>
      `<col min="${c + 1}" max="${c + 1}" width="${Math.min(Math.max(g + 3, 10), 60)}" customWidth="1"/>`).join('');
    const son = kolonHarfi(kolonlar.length - 1) + (satirlar.length + 1);
    return baslik + `<worksheet xmlns="${ns}"><sheetViews><sheetView workbookViewId="0">` +
        '<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' +
        `<cols>${kolonlarXml}</cols><sheetData>${xmlSatirlar}</sheetData><autoFilter ref="A1:${son}"/></worksheet>`;
  }

  function xlsxYap(sayfalar) {
    const ns = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
    const rel = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
    const baslik = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
    return zipYap([
      { ad: '[Content_Types].xml', icerik: baslik + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
        sayfalar.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('') +
        '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>' },
      { ad: '_rels/.rels', icerik: baslik + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        `<Relationship Id="rId1" Type="${rel}/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
      { ad: 'xl/workbook.xml', icerik: baslik + `<workbook xmlns="${ns}" xmlns:r="${rel}"><sheets>` +
        sayfalar.map((sf, i) => `<sheet name="${xmlKacis(sf.ad)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('') + '</sheets></workbook>' },
      { ad: 'xl/_rels/workbook.xml.rels', icerik: baslik + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        sayfalar.map((_, i) => `<Relationship Id="rId${i + 1}" Type="${rel}/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('') +
        `<Relationship Id="rId${sayfalar.length + 1}" Type="${rel}/styles" Target="styles.xml"/></Relationships>` },
      { ad: 'xl/styles.xml', icerik: baslik + `<styleSheet xmlns="${ns}"><numFmts count="1"><numFmt numFmtId="164" formatCode="dd.mm.yyyy"/></numFmts>` +
        '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>' +
        '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>' +
        '<fill><patternFill patternType="solid"><fgColor rgb="FFDDEBF7"/></patternFill></fill></fills>' +
        '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
        '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
        '<cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
        '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>' +
        '<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs>' +
        '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>' },
      ...sayfalar.map((sf, i) => ({ ad: `xl/worksheets/sheet${i + 1}.xml`, icerik: sayfaXml(sf.satirlar, sf.kolonlar, ns, baslik) })),
    ]);
  }
  const blobIndir = (ad, blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = ad;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  };

  // --- Panel ---
  // Kullanıcı tarafından seçilebilen (başlangıçta işaretsiz) ek sütunlar
  const OPSIYONEL = ['durum', 'istihdam', 'LeaveDetailTypeName', 'Description', 'CreatedDate'];
  // Tüm rapor sütunları seçilebilir; başlangıçta OPSIYONEL listesindekiler (Personel Durumu, İstihdam Şekli, İzin Detay, Açıklama, Oluşturma Tarihi) dışındakiler işaretlidir
  const secilenKolonlar = () => KOLON_RAPOR.filter(([alan]) => document.getElementById('izinK_' + alan).checked);

  const panel = document.createElement('div');
  panel.id = 'izinPanel';
  panel.style.cssText = 'position:fixed;top:4vh;right:2vw;width:min(860px,96vw);max-height:92vh;z-index:2147483647;' +
    'background:#f1f6fc;color:#12263f;border:1px solid #b3cde8;border-radius:20px;font:14px/1.45 "Segoe UI",Roboto,Arial,sans-serif;' +
    'box-shadow:0 24px 60px rgba(6,24,52,.4);display:flex;flex-direction:column;overflow:hidden';
  panel.innerHTML = `
    <style>
      #izinPanel *{box-sizing:border-box}
      #izinPanel button{padding:8px 18px;border:1.5px solid #1a73c7;border-radius:999px;background:#fff;color:#1a73c7;cursor:pointer;font:600 14px "Segoe UI",Arial,sans-serif;transition:background .15s}
      #izinPanel button:hover:not(:disabled){background:#dcebfa}
      #izinPanel button:disabled{opacity:.45;cursor:not-allowed}
      #izinPanel #izinBaslat{background:#1a73c7;border-color:#1a73c7;color:#fff;padding:9px 28px;font-size:15px}
      #izinPanel #izinBaslat:hover:not(:disabled){background:#0f5aa6}
      #izinPanel #izinIndir{background:#1769aa;border-color:#1769aa;color:#fff}
      #izinPanel #izinIndir:hover:not(:disabled){background:#0f5287}
      #izinPanel .izinBaslikDugme{background:transparent;border:0;color:#fff;font-size:18px;padding:2px 10px;border-radius:6px}
      #izinPanel .izinBaslikDugme:hover{background:rgba(255,255,255,.22)!important}
      #izinPanel .izinKart{background:#fff;border:1px solid #cfe0f3;border-radius:10px;padding:10px 14px;margin-bottom:12px}
      #izinPanel .izinKartBaslik{display:flex;align-items:center;gap:8px;font-weight:700;color:#0b2f5c;margin-bottom:8px}
      #izinPanel .izinRozet{flex:0 0 22px;width:22px;height:22px;border-radius:50%;background:#1a73c7;color:#fff;font-size:12px;display:grid;place-items:center}
      #izinPanel label.izinK{display:block;margin:3px 0;cursor:pointer}
      #izinPanel .izinCip{display:inline-block;padding:2px 11px;margin:0 6px 5px 0;border-radius:999px;background:#dcebfa;color:#0f5aa6;font-size:12.5px;font-weight:600;cursor:pointer;user-select:none;text-decoration:none}
      #izinPanel .izinCip:hover{background:#bcdcf7}
      #izinPanel input[type=date]{padding:4px 8px;border:1px solid #b3cde8;border-radius:6px;font:inherit}
      #izinPanel textarea{border:1px solid #b3cde8;border-radius:8px;padding:8px;width:100%}
      #izinPanel .izinIst{flex:1 1 110px;background:#fff;border:1px solid #cfe0f3;border-radius:10px;padding:6px 12px;text-align:center}
      #izinPanel .izinIst b{display:block;font-size:20px;color:#0b2f5c;line-height:1.25}
      #izinPanel .izinIst span{font-size:12px;color:#5a7390}
    </style>
    <div id="izinBaslik" style="cursor:move;background:#0b2f5c;color:#fff;padding:10px 16px;display:flex;justify-content:space-between;align-items:center;user-select:none">
      <span style="display:flex;align-items:center;gap:10px">
        <svg viewBox="0 0 100 100" width="34" height="34" aria-hidden="true"><circle cx="50" cy="50" r="46" fill="none" stroke="rgba(255,255,255,.6)" stroke-width="5"/><path d="M40 20h20v20h20v20H60v20H40V60H20V40h20z" fill="#fff"/></svg>
        <b style="font-size:16px">EKİP Personel İzin Bilgisi Raporlama</b>
      </span>
      <span><button class="izinBaslikDugme" id="izinKucult" title="Küçült / Büyüt">&#8212;</button><button class="izinBaslikDugme" id="izinKapat" title="Kapat">&#10005;</button></span>
    </div>
    <div id="izinGovde" style="padding:14px;overflow:auto;flex:1 1 auto;min-height:0">
      <div style="display:flex;gap:14px;flex-wrap:wrap">
        <div style="flex:1 1 300px;min-width:260px">
          <div class="izinKart" style="height:calc(100% - 12px)">
            <div class="izinKartBaslik"><span class="izinRozet">1</span>T.C. Kimlik No listesi <span id="izinSayac" style="font-weight:400;color:#5a7390">(0 geçerli)</span></div>
            <textarea id="izinSicil" rows="12" style="font:13px Consolas,monospace;resize:vertical" placeholder="Her satıra bir T.C. Kimlik No yapıştırın"></textarea>
          </div>
        </div>
        <div style="flex:1 1 330px;min-width:280px">
          <div class="izinKart">
            <div class="izinKartBaslik"><span class="izinRozet">2</span>Tarih aralığı <span style="font-weight:400;color:#5a7390">(isteğe bağlı)</span></div>
            <div style="margin-bottom:6px"><input type="date" id="izinBas"> &ndash; <input type="date" id="izinBit"></div>
            <div><a class="izinCip" id="izinHBuYil">Bu Yıl</a><a class="izinCip" id="izinHGecenYil">Geçen Yıl</a><a class="izinCip" id="izinH3Ay">Son 3 Ay</a><a class="izinCip" id="izinHBuAy">Bu Ay</a><a class="izinCip" id="izinH1Hafta">Son 1 Hafta</a><a class="izinCip" id="izinHTemizle">Temizle</a></div>
            <div style="color:#5a7390;font-size:12px">Seçilen aralıkla kesişen izinler rapora alınır.</div>
          </div>
          <div class="izinKart">
            <div class="izinKartBaslik"><span class="izinRozet">3</span>Rapora eklenecek sütunlar</div>
            <div style="margin-bottom:4px"><a class="izinCip" id="izinTumu">Tümünü seç</a><a class="izinCip" id="izinHicbiri">Temizle</a><a class="izinCip" id="izinVarsayilan">Varsayılan</a></div>
            <div style="columns:2">
              ${KOLON_RAPOR.map(([a, etiket]) => `<label class="izinK"><input type="checkbox" id="izinK_${a}" ${OPSIYONEL.includes(a) ? '' : 'checked'}> ${etiket}</label>`).join('')}
            </div>
          </div>
        </div>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:10px">
        <div class="izinIst"><b id="izinStPersonel">0 / 0</b><span>İşlenen personel</span></div>
        <div class="izinIst"><b id="izinStKayit">0</b><span>İzin kaydı</span></div>
        <div class="izinIst"><b id="izinStHata">0</b><span>Notlu / hatalı</span></div>
      </div>
      <div style="display:flex;align-items:center;gap:10px;margin:0 0 6px">
        <div style="flex:1;background:#d3e3f5;border-radius:999px;height:12px;overflow:hidden">
          <div id="izinIlerleme" style="background:#1a73c7;height:100%;width:0;transition:width .3s"></div>
        </div>
        <b id="izinYuzde" style="min-width:42px;text-align:right;color:#0b2f5c">0%</b>
      </div>
      <div id="izinDurum" style="font-weight:700;margin-bottom:6px;color:#0b2f5c">Hazır.</div>
      <div id="izinGunluk" style="border:1px solid #cfe0f3;border-radius:10px;background:#fff;height:130px;overflow:auto;padding:6px 10px;font:12px/1.6 Consolas,monospace"></div>
    </div>
    <div style="padding:10px 14px;border-top:1px solid #cfe0f3;background:#fff;display:flex;gap:8px;flex-wrap:wrap;align-items:center">
      <button id="izinBaslat">&#9654; Başlat</button>
      <button id="izinDurdur" disabled>&#9632; Durdur</button>
      <button id="izinIndir" disabled>&#11015; Excel İndir</button>
      <span style="margin-left:auto;color:#5a7390;font-size:12px">Son güncelleme: 04.11.2026</span>
    </div>`;
  document.body.appendChild(panel);

  const $e = (id) => document.getElementById(id);
  const durumYaz = (m) => { $e('izinDurum').textContent = m; };
  const gunlukYaz = (m, renk = '#12263f') => {
    const d = document.createElement('div');
    const z = document.createElement('span');
    z.style.color = '#8a9fb8';
    z.textContent = new Date().toLocaleTimeString('tr-TR') + '  ';
    const t = document.createElement('span');
    t.style.color = renk;
    t.textContent = m;
    d.append(z, t);
    $e('izinGunluk').appendChild(d);
    $e('izinGunluk').scrollTop = $e('izinGunluk').scrollHeight;
  };
  const ilerleme = (oran) => {
    const yuzde = Math.round(oran * 100);
    $e('izinIlerleme').style.width = yuzde + '%';
    $e('izinYuzde').textContent = yuzde + '%';
  };
  const istatistik = (toplamPersonel) => {
    $e('izinStPersonel').textContent = `${ozetler.length} / ${toplamPersonel}`;
    $e('izinStKayit').textContent = ozetler.reduce((t, o) => t + (o.kayitSayisi || 0), 0);
    $e('izinStHata').textContent = ozetler.filter((o) => o.not).length;
  };

  // Panel: kapat / küçült / sürükle
  $e('izinKapat').onclick = () => panel.remove();
  $e('izinKucult').onclick = () => {
    const g = $e('izinGovde');
    g.style.display = g.style.display === 'none' ? '' : 'none';
  };
  $e('izinBaslik').onmousedown = (ev) => {
    if (ev.target.tagName === 'BUTTON') return;
    const r = panel.getBoundingClientRect();
    const dx = ev.clientX - r.left;
    const dy = ev.clientY - r.top;
    const tasi = (e) => {
      panel.style.left = Math.max(0, e.clientX - dx) + 'px';
      panel.style.top = Math.max(0, e.clientY - dy) + 'px';
      panel.style.right = 'auto';
    };
    const birak = () => { document.removeEventListener('mousemove', tasi); document.removeEventListener('mouseup', birak); };
    document.addEventListener('mousemove', tasi);
    document.addEventListener('mouseup', birak);
  };

  // Tarih aralığı kısayolları
  const isoTarih = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const aralikYaz = (b, e) => { $e('izinBas').value = b ? isoTarih(b) : ''; $e('izinBit').value = e ? isoTarih(e) : ''; };
  $e('izinHBuYil').onclick = () => { const y = new Date().getFullYear(); aralikYaz(new Date(y, 0, 1), new Date(y, 11, 31)); };
  $e('izinHGecenYil').onclick = () => { const y = new Date().getFullYear() - 1; aralikYaz(new Date(y, 0, 1), new Date(y, 11, 31)); };
  $e('izinH3Ay').onclick = () => { const bit = new Date(); const bas = new Date(); bas.setMonth(bas.getMonth() - 3); aralikYaz(bas, bit); };
  $e('izinHBuAy').onclick = () => { const n = new Date(); aralikYaz(new Date(n.getFullYear(), n.getMonth(), 1), new Date(n.getFullYear(), n.getMonth() + 1, 0)); };
  $e('izinH1Hafta').onclick = () => { const bit = new Date(); const bas = new Date(); bas.setDate(bas.getDate() - 7); aralikYaz(bas, bit); };
  $e('izinHTemizle').onclick = () => aralikYaz(null, null);

  // Sütun seçimi
  $e('izinTumu').onclick = () => KOLON_RAPOR.forEach(([a]) => { $e('izinK_' + a).checked = true; });
  $e('izinHicbiri').onclick = () => KOLON_RAPOR.forEach(([a]) => { $e('izinK_' + a).checked = false; });
  $e('izinVarsayilan').onclick = () => KOLON_RAPOR.forEach(([a]) => { $e('izinK_' + a).checked = !OPSIYONEL.includes(a); });

  // T.C. No listesi
  const tcListesi = () => {
    const girilen = [...new Set($e('izinSicil').value.split(/[\s,;]+/).filter(Boolean))];
    return { gecerli: girilen.filter((t) => /^\d{11}$/.test(t)), gecersiz: girilen.filter((t) => !/^\d{11}$/.test(t)).length };
  };
  $e('izinSicil').oninput = () => {
    const { gecerli, gecersiz } = tcListesi();
    $e('izinSayac').textContent = `(${gecerli.length} geçerli${gecersiz ? `, ${gecersiz} geçersiz` : ''})`;
  };

  $e('izinDurdur').onclick = () => { durdur = true; durumYaz('Durduruluyor...'); };
  $e('izinIndir').onclick = () => {
    if (!detaylar.length) return durumYaz('İndirilecek veri yok.');
    const kolonlar = secilenKolonlar();
    if (!kolonlar.length) return durumYaz('En az bir sütun seçilmelidir.');
    const z = new Date().toISOString().slice(0, 10);
    blobIndir(`izin_bilgisi_raporlama_${z}.xlsx`, xlsxYap([
      { ad: 'İzin ve Rapor Bilgileri', satirlar: detaylar, kolonlar },
      { ad: 'Yıllık İzin Bilgileri', satirlar: ozetler, kolonlar: KOLON_BAKIYE },
    ]));
    gunlukYaz('Excel dosyası indirildi.', '#1769aa');
  };

  $e('izinBaslat').onclick = async () => {
    if (calisiyor) return;
    const { gecerli, gecersiz } = tcListesi();
    let liste = gecerli;
    if (!liste.length) return durumYaz('Geçerli (11 haneli) T.C. Kimlik No bulunamadı.');
    const bas = $e('izinBas').value;
    const bit = $e('izinBit').value;
    filtreBas = bas ? new Date(bas + 'T00:00:00') : null;
    filtreBit = bit ? new Date(bit + 'T00:00:00') : null;
    if (filtreBas && filtreBit && filtreBas > filtreBit) return durumYaz('Başlangıç tarihi, bitiş tarihinden büyük olamaz.');

    calisiyor = true; durdur = false;
    ozetler.length = 0; detaylar.length = 0;
    $e('izinGunluk').innerHTML = '';
    $e('izinBaslat').disabled = true; $e('izinDurdur').disabled = false; $e('izinIndir').disabled = true;
    ilerleme(0);
    istatistik(liste.length);
    if (gecersiz) gunlukYaz(`${gecersiz} geçersiz T.C. No atlandı.`, '#b26a00');

    let ardisikHata = 0;
    for (let i = 0; i < liste.length; i++) {
      if (durdur) { gunlukYaz('Kullanıcı tarafından durduruldu.', '#b26a00'); break; }
      durumYaz(`İşleniyor: ${i + 1} / ${liste.length}`);
      try {
        const o = await personelIsle(liste[i]);
        ozetler.push(o);
        ardisikHata = 0;
        if (o.tani) gunlukYaz('    Tanı: ' + o.tani, '#555');
        gunlukYaz(`✔ ${i + 1}/${liste.length}  Sicil ${o.sicil || '-'}  ${o.ad} ${o.soyad}  -  ${o.kayitSayisi} izin kaydı${o.sayfaSayisi > 1 ? ' (' + o.sayfaSayisi + ' sayfa)' : ''}${o.not ? '  [' + o.not + ']' : ''}`,
          o.not ? '#b26a00' : '#2e7d32');
      } catch (e) {
        const hata = { sicil: liste[i].slice(0, 3) + '******' + liste[i].slice(-2), not: e.message };
        ozetler.push(hata);
        detaylar.push(hata);
        gunlukYaz(`✖ ${i + 1}/${liste.length}  ${hata.sicil}  -  ${e.message}`, '#c62828');
        if (++ardisikHata >= 3) { gunlukYaz('Art arda 3 hata: işlem durduruldu.', '#c62828'); break; }
      }
      ilerleme((i + 1) / liste.length);
      istatistik(liste.length);
      await bekle(700);
    }

    calisiyor = false;
    $e('izinBaslat').disabled = false; $e('izinDurdur').disabled = true; $e('izinIndir').disabled = !detaylar.length;
    const hatali = ozetler.filter((o) => o.not).length;
    durumYaz(`Bitti. Personel: ${ozetler.length}, izin kaydı: ${ozetler.reduce((t, o) => t + (o.kayitSayisi || 0), 0)}, notlu/hatalı: ${hatali}.`);
    console.table(ozetler);
  };
})();
