/*
 * PDF Düzenleyici — birleştir, ayır, PDF → JPG, JPG → PDF
 * Tüm işlemler tarayıcıda yapılır; dosyalar hiçbir yere yüklenmez.
 */
(() => {
  'use strict';

  const { PDFDocument } = PDFLib;
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'lib/pdf.worker.min.js';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  const A4 = { w: 595.28, h: 841.89 };
  const MB = 1024 * 1024;

  /* ---------- Yardımcılar ---------- */
  let sayac = 0;
  const yeniId = () => ++sayac;

  function boyut(n) {
    if (n < 1024) return n + ' B';
    if (n < MB) return (n / 1024).toFixed(0) + ' KB';
    return (n / MB).toFixed(1) + ' MB';
  }

  function uzantisiz(ad) { return ad.replace(/\.[^.]+$/, ''); }

  function okuBayt(file) {
    return new Promise((ok, hata) => {
      const r = new FileReader();
      r.onload = () => ok(new Uint8Array(r.result));
      r.onerror = () => hata(new Error('Dosya okunamadı: ' + file.name));
      r.readAsArrayBuffer(file);
    });
  }

  function bekle() { return new Promise((ok) => setTimeout(ok, 0)); }

  function tuvalBlob(canvas, tur, kalite) {
    return new Promise((ok, hata) => {
      canvas.toBlob((b) => (b ? ok(b) : hata(new Error('Resim oluşturulamadı.'))), tur, kalite);
    });
  }

  /* ---------- Gezinme (ana ekran / araçlar) ---------- */
  function sekmeSec(ad, hashYaz) {
    const tool = $('[data-panel="' + ad + '"]');
    const ana = !tool;
    $('#ana').classList.toggle('gizli', !ana);
    $('#aracBar').classList.toggle('gizli', ana);
    $$('.panel').forEach((p) => p.classList.toggle('gizli', p.dataset.panel !== ad));
    document.body.classList.toggle('studyoAcik', ad === 'studyo');
    if (tool) {
      const kart = $('.araKart[data-sekme="' + ad + '"]');
      $('#aracBaslik').textContent = kart ? $('b', kart).textContent : '';
      document.title = ($('#aracBaslik').textContent || 'PDF Düzenleyici') + ' — PDF Düzenleyici';
    } else {
      document.title = 'PDF Düzenleyici';
    }
    if (hashYaz !== false && location.hash.slice(1) !== (ad || '')) {
      try { history.pushState(null, '', ana ? location.pathname + location.search : '#' + ad); } catch (e) { /* önemsiz */ }
    }
    window.scrollTo({ top: 0 });
  }
  $$('.araKart').forEach((b) => b.addEventListener('click', () => sekmeSec(b.dataset.sekme)));
  $('#geriArac').addEventListener('click', () => sekmeSec('ana'));
  const hashDurum = () => sekmeSec(location.hash.slice(1) || 'ana', false);
  window.addEventListener('hashchange', hashDurum);
  window.addEventListener('popstate', hashDurum);

  /* ---------- Araçlar arası geçiş ("Bu dosyayla devam et") ---------- */
  const kayit = {}; // araç adı -> dosya listesi
  const DEVAM = [['sikistir', 'Sıkıştır'], ['parola', 'Parola'], ['filigran', 'Filigran'], ['numara', 'Sayfa numarası'], ['imza', 'İmza'], ['dondur', 'Döndür'], ['duzenle', 'Sayfaları düzenle'], ['kirp', 'Kırp'], ['ayir', 'Ayır'], ['birlestir', 'Birleştir']];
  function devamEt(ad, dosyalar) {
    sekmeSec(ad);
    const l = kayit[ad];
    if (l) l.ekle(dosyalar);
  }

  /* ---------- Durum / ilerleme / sonuç ---------- */
  function panelArac(panel) {
    const durumEl = $('.durum', panel);
    const cubuk = $('.ilerleme', panel);
    const dolgu = $('.ilerleme i', panel);
    const sonuc = $('.sonuc', panel);
    return {
      mesaj(metin, tur) {
        durumEl.textContent = metin || '';
        durumEl.className = 'durum' + (tur ? ' ' + tur : '');
      },
      ilerleme(oran) {
        if (oran == null) { cubuk.classList.remove('acik'); return; }
        cubuk.classList.add('acik');
        dolgu.style.width = Math.round(oran * 100) + '%';
      },
      sonucGoster(blob, ad, ozet) {
        sonuc.innerHTML = '';
        const url = URL.createObjectURL(blob);
        const kutu = document.createElement('div');
        kutu.className = 'sonucKutu';
        const bilgi = document.createElement('div');
        const b = document.createElement('b');
        b.textContent = ad;
        const k = document.createElement('small');
        k.textContent = boyut(blob.size) + (ozet ? ' · ' + ozet : '');
        bilgi.append(b, k);
        const a = document.createElement('a');
        a.className = 'dugme';
        a.href = url;
        a.download = ad;
        a.textContent = 'İndir';
        kutu.append(bilgi, a);
        sonuc.appendChild(kutu);
        if (blob.type === 'application/pdf') {
          const dev = document.createElement('div');
          dev.className = 'devam';
          dev.innerHTML = '<small>Bu dosyayla devam edin:</small>';
          DEVAM.filter(([k]) => k !== panel.dataset.panel).forEach(([k, m]) => {
            const b = document.createElement('button');
            b.type = 'button'; b.className = 'ikincil'; b.textContent = m;
            b.addEventListener('click', () => devamEt(k, [new File([blob], ad, { type: 'application/pdf' })]));
            dev.appendChild(b);
          });
          sonuc.appendChild(dev);
        }
        a.click();
      },
      temizle() { sonuc.innerHTML = ''; durumEl.textContent = ''; cubuk.classList.remove('acik'); },
    };
  }

  /* ---------- Her aracı "solda önizleme, sağda seçenekler" düzenine getirir ---------- */
  $$('.panel').forEach((panel) => {
    const yan = document.createElement('aside');
    yan.className = 'yan';
    const sol = document.createElement('div');
    sol.className = 'sol';
    const duzen = document.createElement('div');
    duzen.className = 'duzen';
    const yanSecici = ['secenekler', 'onizleme', 'islem', 'durum', 'ilerleme', 'sonuc'];
    const cocuklar = Array.from(panel.children).filter((e) => !/^H2$|^P$/.test(e.tagName) || e.classList.contains('sayfaBilgi') || e.classList.contains('durum') || e.classList.contains('onizleme'));
    cocuklar.forEach((e) => {
      if (yanSecici.some((c) => e.classList.contains(c))) yan.appendChild(e); else sol.appendChild(e);
    });
    if ($('.secenekler', yan)) {
      const h = document.createElement('h3');
      h.textContent = 'Seçenekler';
      yan.insertBefore(h, yan.firstChild);
    }
    duzen.append(sol, yan);
    panel.appendChild(duzen);
    panel.classList.add('bos');
  });

  /* ---------- Dosya kartlarında ilk sayfa / resim küçük önizlemesi ---------- */
  function kapakGoster(d, th) {
    const bas = (c) => {
      const k = document.createElement('canvas');
      const r = d.rot || 0;
      const dik = r % 180 !== 0;
      k.width = dik ? c.height : c.width; k.height = dik ? c.width : c.height;
      const kc = k.getContext('2d');
      kc.translate(k.width / 2, k.height / 2);
      kc.rotate((r * Math.PI) / 180);
      kc.drawImage(c, -c.width / 2, -c.height / 2);
      th.innerHTML = '';
      th.appendChild(k);
    };
    if (d.kapak) { bas(d.kapak); return; }
    th.textContent = 'Önizleme hazırlanıyor…';
    if (!d.kapakSoz) {
      d.kapakSoz = (async () => {
        if (pdfMi(d.file)) {
          const b = await pdfjsBelge(d.file);
          try { d.kapak = await kucukTuval(b, 1, 150); } finally { b.destroy(); }
        } else {
          const bmp = await createImageBitmap(d.file);
          const c = document.createElement('canvas');
          c.width = 150; c.height = Math.max(1, Math.round((bmp.height * 150) / bmp.width));
          c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
          if (bmp.close) bmp.close();
          d.kapak = c;
        }
      })().catch(() => { d.kapak = null; });
    }
    d.kapakSoz.then(() => { if (d.kapak) bas(d.kapak); else th.textContent = 'Önizleme yok'; });
  }

  /* ---------- Dosya listesi bileşeni ---------- */
  function dosyaListesi(panel, { coklu, kabul, onDegis, kartlar, dondur }) {
    const girdi = $('input[type=file]', panel);
    const alan = $('.alan', panel);
    const liste = $('.liste', panel);
    const durum = { dosyalar: [] };
    let surukle = -1;

    function ciz(yeniler, sessiz) {
      liste.innerHTML = '';
      durum.dosyalar.forEach((d, i) => {
        const li = document.createElement('li');
        if (kartlar && coklu) {
          li.draggable = true;
          li.addEventListener('dragstart', (e) => { surukle = i; try { e.dataTransfer.setData('text/plain', 'k' + i); } catch (x) { /* önemsiz */ } });
          li.addEventListener('dragover', (e) => { if (surukle < 0) return; e.preventDefault(); li.classList.add('hedef'); });
          li.addEventListener('dragleave', () => li.classList.remove('hedef'));
          li.addEventListener('drop', (e) => {
            if (surukle < 0) return;
            e.preventDefault(); e.stopPropagation();
            if (surukle !== i) { const [x] = durum.dosyalar.splice(surukle, 1); durum.dosyalar.splice(i, 0, x); }
            surukle = -1;
            ciz();
          });
          li.addEventListener('dragend', () => { surukle = -1; });
        }
        if (kartlar) {
          const th = document.createElement('div');
          th.className = 'kThumb';
          li.appendChild(th);
          kapakGoster(d, th);
        }
        const ad = document.createElement('span');
        ad.className = 'dAd';
        ad.textContent = d.file.name;
        const bil = document.createElement('small');
        bil.textContent = boyut(d.file.size) + (d.bilgi ? ' · ' + d.bilgi : '');
        const sol = document.createElement('div');
        sol.className = 'dMetin';
        sol.append(ad, bil);
        li.appendChild(sol);
        if (coklu) {
          const yukari = dugme('↑', 'Yukarı taşı', () => tasi(i, -1), i === 0);
          const asagi = dugme('↓', 'Aşağı taşı', () => tasi(i, 1), i === durum.dosyalar.length - 1);
          li.append(yukari, asagi);
        }
        if (dondur) li.appendChild(dugme('↻', 'Resmi sağa döndür', () => { d.rot = ((d.rot || 0) + 90) % 360; ciz(); }));
        li.appendChild(dugme('×', 'Kaldır', () => { durum.dosyalar.splice(i, 1); ciz(); }));
        liste.appendChild(li);
      });
      liste.classList.toggle('gizli', !durum.dosyalar.length);
      liste.classList.toggle('kartlar', !!kartlar);
      panel.classList.toggle('bos', !durum.dosyalar.length);
      if (!sessiz) panel.dispatchEvent(new CustomEvent('dosyadegisti', { detail: { dosyalar: durum.dosyalar, yeniler } }));
      if (!sessiz && onDegis) onDegis(yeniler);
    }

    function dugme(metin, baslik, tikla, pasif) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'kucuk';
      b.textContent = metin;
      b.title = baslik;
      b.setAttribute('aria-label', baslik);
      b.disabled = !!pasif;
      b.addEventListener('click', tikla);
      return b;
    }

    function tasi(i, yon) {
      const j = i + yon;
      if (j < 0 || j >= durum.dosyalar.length) return;
      [durum.dosyalar[i], durum.dosyalar[j]] = [durum.dosyalar[j], durum.dosyalar[i]];
      ciz();
    }

    function ekle(fileList) {
      const tumu = Array.from(fileList);
      let gelen = tumu.filter(kabul);
      const atlanan = tumu.filter((f) => !kabul(f));
      const dEl = panel.querySelector('.durum');
      if (atlanan.length && dEl) {
        dEl.className = 'durum hata';
        dEl.textContent = 'Desteklenmeyen dosya atlandı: ' + atlanan.map((f) => f.name).join(', ');
      }
      if (!gelen.length) return;
      if (!coklu) { durum.dosyalar = []; gelen = gelen.slice(0, 1); }
      gelen.forEach((f) => durum.dosyalar.push({ id: yeniId(), file: f }));
      ciz(gelen);
    }

    girdi.addEventListener('change', () => { ekle(girdi.files); girdi.value = ''; });
    ['dragenter', 'dragover'].forEach((o) => alan.addEventListener(o, (e) => { e.preventDefault(); alan.classList.add('uzerinde'); }));
    ['dragleave', 'drop'].forEach((o) => alan.addEventListener(o, (e) => { e.preventDefault(); alan.classList.remove('uzerinde'); }));
    alan.addEventListener('drop', (e) => ekle(e.dataTransfer.files));

    ciz(undefined, true);
    const sonucNesne = { durum, ciz, ekle };
    kayit[panel.dataset.panel] = sonucNesne;
    return sonucNesne;
  }

  const pdfMi = (f) => f.type === 'application/pdf' || /\.pdf$/i.test(f.name);
  const resimMi = (f) => /^image\//.test(f.type) || /\.(jpe?g|png|webp|gif|bmp)$/i.test(f.name);

  /* ---------- Hata iletilerini Türkçeleştirme ---------- */
  function trHata(e) {
    const m = String((e && e.message) || e || '');
    if (/[ğüşöçıİĞÜŞÖÇ]/.test(m)) return m; // uygulamanın kendi Türkçe iletileri aynen gösterilir
    if (/is empty|size is zero|zero bytes/i.test(m)) return 'Seçilen dosya boş (0 bayt) veya okunamıyor.';
    if (/encrypted|password|şifre|parola/i.test(m)) return 'PDF parola korumalı veya parola hatalı.';
    if (/Expected instance of|UnexpectedObjectType|Invalid object ref|Failed to parse|Unable to parse|Trying to parse invalid/i.test(m)) return 'PDF dosyasının yapısı standart dışı veya bozuk.';
    if (/No PDF header|Invalid PDF|InvalidPDF|not a PDF/i.test(m)) return 'Seçilen dosya geçerli bir PDF değil.';
    if (/out of memory|Array buffer allocation|allocation/i.test(m)) return 'Bellek yetersiz. Daha küçük bir dosya veya düşük çözünürlük deneyin.';
    if (/canvas|toBlob/i.test(m)) return 'Görüntü oluşturulamadı.';
    return /[ğüşöçıİĞÜŞÖÇ]/.test(m) ? m : 'Beklenmeyen bir hata oluştu: ' + m;
  }

  /* ---------- PDF açma (parola + yedek yöntem) ----------
     Dönen nesne: { bayt, parola, doc, sayfaSayisi }
     doc, pdf-lib ile açılamazsa null olur; bu durumda sayfalar pdf.js ile görüntüye çevrilerek aktarılır. */
  const parolaSoz = new WeakMap();
  function parolaBul(file) {
    if (!parolaSoz.has(file)) {
      parolaSoz.set(file, (async () => {
        const bayt = await okuBayt(file);
        let parola = '';
        for (let d = 0; d < 4; d++) {
          try {
            const b = await pdfjsLib.getDocument({ data: bayt.slice(), password: parola, isEvalSupported: false }).promise;
            b.destroy();
            return parola;
          } catch (e) {
            if (e && e.name === 'PasswordException') {
              const g = window.prompt('"' + file.name + '" dosyası parola korumalı.\nLütfen parolayı girin:');
              if (g === null) throw new Error('Parola girilmediği için işlem iptal edildi.');
              parola = g;
            } else {
              return parola; // yapısal sorun: parola gerekmiyor
            }
          }
        }
        throw new Error('PDF parola korumalı veya parola hatalı.');
      })().catch((e) => { parolaSoz.delete(file); throw e; }));
    }
    return parolaSoz.get(file);
  }

  async function pdfjsBelge(file) {
    const bayt = await okuBayt(file);
    const parola = await parolaBul(file);
    try {
      return await pdfjsLib.getDocument({ data: bayt, password: parola, isEvalSupported: false }).promise;
    } catch (e) { throw new Error(trHata(e)); }
  }

  async function kucukTuval(belge, no, genislik) {
    const s = await belge.getPage(no);
    const v1 = s.getViewport({ scale: 1 });
    const v = s.getViewport({ scale: (genislik / v1.width) * Math.min(2, window.devicePixelRatio || 1) });
    const t = document.createElement('canvas');
    t.width = Math.floor(v.width); t.height = Math.floor(v.height);
    const c = t.getContext('2d');
    c.fillStyle = '#fff'; c.fillRect(0, 0, t.width, t.height);
    await s.render({ canvasContext: c, viewport: v }).promise;
    s.cleanup();
    return t;
  }

  // Görünür olunca çağrılır (çok sayfalı belgelerde yavaşlamayı önler)
  const gorunurIzle = (el, fn) => {
    if (!('IntersectionObserver' in window)) { fn(); return; }
    const g = new IntersectionObserver((k) => { if (k.some((x) => x.isIntersecting)) { g.disconnect(); fn(); } }, { rootMargin: '200px' });
    g.observe(el);
  };

  async function pdfAc(file, ilkParola = '') {
    const bayt = await okuBayt(file);
    let parola = ilkParola || (await parolaBul(file));
    let doc = null;
    let sayfaSayisi = 0;
    for (let deneme = 0; deneme < 4; deneme++) {
      try {
        doc = await PDFDocument.load(bayt, { password: parola });
        sayfaSayisi = doc.getPageCount();
        break;
      } catch (e) {
        doc = null;
        if (/encrypted|password/i.test(String(e && e.message))) {
          const g = window.prompt('"' + file.name + '" dosyası parola korumalı.\nLütfen parolayı girin:');
          if (g === null) throw new Error('Parola girilmediği için işlem iptal edildi.');
          parola = g;
          continue;
        }
        break; // yapısal sorun: yedek yönteme geç
      }
    }
    if (!doc) {
      // pdf.js ile sayfa sayısını öğren (bozuk yapılara daha hoşgörülüdür)
      let belge;
      try {
        belge = await pdfjsLib.getDocument({ data: bayt.slice(), password: parola, isEvalSupported: false }).promise;
        sayfaSayisi = belge.numPages;
      } catch (e) {
        throw new Error(trHata(e));
      } finally {
        if (belge) belge.destroy();
      }
    }
    return { bayt, parola, doc, sayfaSayisi, ad: file.name };
  }

  /* Yedek yöntem: sayfayı pdf.js ile görüntüye çevirip çıktı belgesine ekler */
  async function sayfaGoruntuEkle(cikti, kaynak, indeks) {
    const belge = await pdfjsLib.getDocument({ data: kaynak.bayt.slice(), password: kaynak.parola, isEvalSupported: false }).promise;
    try {
      const sayfa = await belge.getPage(indeks + 1);
      const vp1 = sayfa.getViewport({ scale: 1 });
      const olcek = Math.min(150 / 72, 8000 / Math.max(vp1.width, vp1.height));
      const vp = sayfa.getViewport({ scale: olcek });
      const tuval = document.createElement('canvas');
      tuval.width = Math.floor(vp.width);
      tuval.height = Math.floor(vp.height);
      const ctx = tuval.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, tuval.width, tuval.height);
      await sayfa.render({ canvasContext: ctx, viewport: vp }).promise;
      const blob = await tuvalBlob(tuval, 'image/jpeg', 0.88);
      tuval.width = tuval.height = 0;
      const resim = await cikti.embedJpg(new Uint8Array(await blob.arrayBuffer()));
      const s = cikti.addPage([vp1.width, vp1.height]);
      s.drawImage(resim, { x: 0, y: 0, width: vp1.width, height: vp1.height });
      sayfa.cleanup();
    } finally {
      belge.destroy();
    }
  }

  /* Sayfaları çıktıya ekler; hata olursa tek tek, o da olmazsa görüntü olarak dener.
     Dönüş: görüntüye çevrilen sayfa sayısı */
  async function sayfalariEkle(cikti, kaynak, indeksler) {
    let goruntu = 0;
    if (kaynak.doc) {
      try {
        const kopya = await cikti.copyPages(kaynak.doc, indeksler);
        kopya.forEach((s) => cikti.addPage(s));
        return 0;
      } catch (e) { /* tek tek denenecek */ }
    }
    for (const i of indeksler) {
      let tamam = false;
      if (kaynak.doc) {
        try {
          const [s] = await cikti.copyPages(kaynak.doc, [i]);
          cikti.addPage(s);
          tamam = true;
        } catch (e) { /* görüntü yöntemi */ }
      }
      if (!tamam) {
        try { await sayfaGoruntuEkle(cikti, kaynak, i); goruntu++; }
        catch (e) { throw new Error((i + 1) + '. sayfa işlenemedi: ' + trHata(e)); }
      }
    }
    return goruntu;
  }

  const yedekNotu = (n) => (n ? ' · ' + n + ' sayfa, özgün yapısı okunamadığı için resim olarak aktarıldı' : '');

  /* ---------- Sayfa aralığı çözümleme ---------- */
  // "1-3, 5, 8-" -> [[0,1,2],[4],[7,8,...]]  (virgülle ayrılan her parça ayrı bir grup)
  function aralikCoz(metin, toplam) {
    const parcalar = metin.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean);
    if (!parcalar.length) throw new Error('Lütfen sayfa numaralarını veya aralığını yazın. Örnek: 1-3, 5');
    return parcalar.map((p) => {
      const m = p.match(/^(\d+)?\s*(-)?\s*(\d+)?$/);
      if (!m || (!m[1] && !m[3])) throw new Error('"' + p + '" geçerli bir sayfa aralığı değil. Örnek: 1-3, 5, 8-');
      let bas, son;
      if (m[2]) { bas = m[1] ? +m[1] : 1; son = m[3] ? +m[3] : toplam; }
      else { bas = son = +m[1]; }
      if (bas < 1 || son < 1 || bas > toplam || son > toplam) throw new Error('"' + p + '" geçersiz: bu belgede 1 ile ' + toplam + ' arasında sayfa var.');
      if (bas > son) throw new Error('"' + p + '" aralığı ters yazılmış; küçük numara önce olmalıdır.');
      const g = [];
      for (let i = bas; i <= son; i++) g.push(i - 1);
      return g;
    });
  }

  async function pdfAlt(kaynak, sayfalar) {
    const yeni = await PDFDocument.create();
    const goruntu = await sayfalariEkle(yeni, kaynak, sayfalar);
    return { bayt: await yeni.save(), goruntu };
  }

  /* =========================================================
     1) BİRLEŞTİR
     ========================================================= */
  (() => {
    const panel = $('[data-panel=birlestir]');
    const arac = panelArac(panel);
    const dugmeEl = $('.calistir', panel);
    const liste = dosyaListesi(panel, {
      coklu: true, kabul: pdfMi, kartlar: true,
      onDegis: () => { dugmeEl.disabled = liste.durum.dosyalar.length < 2; },
    });
    dugmeEl.disabled = true;

    dugmeEl.addEventListener('click', async () => {
      const dosyalar = liste.durum.dosyalar;
      if (dosyalar.length < 2) return;
      dugmeEl.disabled = true;
      arac.temizle();
      try {
        const cikti = await PDFDocument.create();
        let toplamSayfa = 0;
        let goruntuSayisi = 0;
        for (let i = 0; i < dosyalar.length; i++) {
          arac.mesaj('İşleniyor (' + (i + 1) + ' / ' + dosyalar.length + '): ' + dosyalar[i].file.name);
          arac.ilerleme(i / dosyalar.length);
          await bekle();
          let kaynak;
          try { kaynak = await pdfAc(dosyalar[i].file); }
          catch (e1) { throw new Error('"' + dosyalar[i].file.name + '" açılamadı: ' + trHata(e1)); }
          const idx = Array.from({ length: kaynak.sayfaSayisi }, (_, k) => k);
          goruntuSayisi += await sayfalariEkle(cikti, kaynak, idx);
          toplamSayfa += kaynak.sayfaSayisi;
        }
        arac.ilerleme(1);
        const bayt = await cikti.save();
        arac.mesaj('Birleştirme tamamlandı.', 'ok');
        arac.sonucGoster(new Blob([bayt], { type: 'application/pdf' }), 'birlestirilmis.pdf', toplamSayfa + ' sayfa' + yedekNotu(goruntuSayisi));
      } catch (e) {
        arac.mesaj(trHata(e), 'hata');
      } finally {
        arac.ilerleme(null);
        dugmeEl.disabled = liste.durum.dosyalar.length < 2;
      }
    });
  })();

  /* =========================================================
     2) AYIR
     ========================================================= */
  (() => {
    const panel = $('[data-panel=ayir]');
    const arac = panelArac(panel);
    const dugmeEl = $('.calistir', panel);
    const modlar = $$('input[name=ayirMod]', panel);
    const aralikEl = $('#ayirAralik', panel);
    const gruplarEl = $('#ayirGruplar', panel);
    const nEl = $('#ayirN', panel);
    const sayfaBilgi = $('.sayfaBilgi', panel);
    let sayfaSayisi = 0;

    function modGoster() {
      const mod = modlar.find((m) => m.checked).value;
      $$('[data-mod]', panel).forEach((e) => e.classList.toggle('gizli', e.dataset.mod !== mod));
    }
    const onizEl = $('.onizleme', panel);
    function onizle() {
      onizEl.textContent = '';
      if (!sayfaSayisi) return;
      const mod = modlar.find((m) => m.checked).value;
      try {
        if (mod === 'aralik') {
          if (!aralikEl.value.trim()) return;
          const n = new Set(aralikCoz(aralikEl.value, sayfaSayisi).flat()).size;
          onizEl.textContent = 'Sonuç: ' + n + ' sayfalık tek PDF';
        } else if (mod === 'tek') {
          onizEl.textContent = 'Sonuç: ' + sayfaSayisi + ' ayrı PDF (ZIP klasörü içinde)';
        } else if (mod === 'bol') {
          const n = parseInt(nEl.value, 10);
          if (!(n >= 1)) return;
          const adet = Math.ceil(sayfaSayisi / n);
          onizEl.textContent = 'Sonuç: ' + adet + ' PDF (ZIP klasörü içinde)' + (sayfaSayisi % n ? ' · son PDF ' + (sayfaSayisi % n) + ' sayfa' : '');
        } else {
          if (!gruplarEl.value.trim()) return;
          onizEl.textContent = 'Sonuç: ' + aralikCoz(gruplarEl.value, sayfaSayisi).length + ' ayrı PDF (ZIP klasörü içinde)';
        }
      } catch (e) { /* yarım yazılmış aralık */ }
    }
    modlar.forEach((m) => m.addEventListener('change', () => { modGoster(); onizle(); }));
    [aralikEl, gruplarEl, nEl].forEach((e) => e.addEventListener('input', onizle));
    modGoster();

    const liste = dosyaListesi(panel, {
      coklu: false, kabul: pdfMi,
      onDegis: async (yeniler) => {
        dugmeEl.disabled = !liste.durum.dosyalar.length;
        if (!liste.durum.dosyalar.length) { sayfaSayisi = 0; sayfaBilgi.textContent = ''; onizEl.textContent = ''; return; }
        if (!yeniler) return;
        sayfaBilgi.textContent = 'Dosya okunuyor…';
        try {
          const pdf = await pdfAc(liste.durum.dosyalar[0].file);
          sayfaSayisi = pdf.sayfaSayisi;
          sayfaBilgi.textContent = 'Toplam ' + sayfaSayisi + ' sayfa · ' + boyut(liste.durum.dosyalar[0].file.size);
          onizle();
        } catch (e) {
          sayfaSayisi = 0;
          sayfaBilgi.textContent = '';
          arac.mesaj(trHata(e), 'hata');
        }
      },
    });
    dugmeEl.disabled = true;

    dugmeEl.addEventListener('click', async () => {
      if (!liste.durum.dosyalar.length) return;
      dugmeEl.disabled = true;
      arac.temizle();
      try {
        const dosya = liste.durum.dosyalar[0].file;
        const kaynak = await pdfAc(dosya);
        const toplam = kaynak.sayfaSayisi;
        const taban = uzantisiz(dosya.name);
        const mod = modlar.find((m) => m.checked).value;

        if (mod === 'aralik') {
          const gruplar = aralikCoz(aralikEl.value, toplam);
          const sayfalar = gruplar.flat();
          arac.mesaj('Seçilen sayfalar ayrılıyor…');
          await bekle();
          const r = await pdfAlt(kaynak, sayfalar);
          arac.mesaj('İşlem tamamlandı.', 'ok');
          arac.sonucGoster(new Blob([r.bayt], { type: 'application/pdf' }), taban + '-secilen-sayfalar.pdf', sayfalar.length + ' sayfa' + yedekNotu(r.goruntu));
          return;
        }

        let parcalar;
        if (mod === 'tek') {
          parcalar = Array.from({ length: toplam }, (_, i) => [i]);
        } else if (mod === 'bol') {
          const n = parseInt(nEl.value, 10);
          if (!(n >= 1)) throw new Error('Her PDF için geçerli bir sayfa sayısı yazın (en az 1).');
          parcalar = [];
          for (let i = 0; i < toplam; i += n) parcalar.push(Array.from({ length: Math.min(n, toplam - i) }, (_, k) => i + k));
        } else {
          parcalar = aralikCoz(gruplarEl.value, toplam);
        }

        const zip = new JSZip();
        const hane = String(parcalar.length).length;
        let goruntuToplam = 0;
        for (let i = 0; i < parcalar.length; i++) {
          arac.mesaj('PDF hazırlanıyor: ' + (i + 1) + ' / ' + parcalar.length);
          arac.ilerleme(i / parcalar.length);
          await bekle();
          const r = await pdfAlt(kaynak, parcalar[i]);
          const bayt = r.bayt;
          goruntuToplam += r.goruntu;
          const s = parcalar[i];
          const etiket = s.length === 1 ? 'sayfa-' + (s[0] + 1) : 'sayfa-' + (s[0] + 1) + '-' + (s[s.length - 1] + 1);
          zip.file(taban + '-' + String(i + 1).padStart(hane, '0') + '-' + etiket + '.pdf', bayt);
        }
        arac.mesaj('ZIP klasörü hazırlanıyor…');
        await bekle();
        const blob = await zip.generateAsync({ type: 'blob', compression: 'STORE' });
        arac.mesaj('İşlem tamamlandı.', 'ok');
        arac.sonucGoster(blob, taban + '-ayrilmis.zip', parcalar.length + ' PDF dosyası' + yedekNotu(goruntuToplam));
      } catch (e) {
        arac.mesaj(trHata(e), 'hata');
      } finally {
        arac.ilerleme(null);
        dugmeEl.disabled = !liste.durum.dosyalar.length;
      }
    });
  })();

  /* =========================================================
     3) PDF → JPG
     ========================================================= */
  (() => {
    const panel = $('[data-panel=pdfjpg]');
    const arac = panelArac(panel);
    const dugmeEl = $('.calistir', panel);
    const dpiEl = $('#jpgDpi', panel);
    const kaliteEl = $('#jpgKalite', panel);
    const kaliteYazi = $('#jpgKaliteYazi', panel);
    const aralikEl = $('#jpgAralik', panel);
    const sayfaBilgi = $('.sayfaBilgi', panel);

    kaliteEl.addEventListener('input', () => { kaliteYazi.textContent = '%' + kaliteEl.value; });

    const liste = dosyaListesi(panel, {
      coklu: false, kabul: pdfMi,
      onDegis: async (yeniler) => {
        dugmeEl.disabled = !liste.durum.dosyalar.length;
        if (!liste.durum.dosyalar.length) { sayfaBilgi.textContent = ''; return; }
        if (!yeniler) return;
        sayfaBilgi.textContent = 'Dosya okunuyor…';
        try {
          const pdf = await pdfAc(liste.durum.dosyalar[0].file);
          sayfaBilgi.textContent = 'Toplam ' + pdf.sayfaSayisi + ' sayfa · ' + boyut(liste.durum.dosyalar[0].file.size);
        } catch (e) {
          sayfaBilgi.textContent = '';
          arac.mesaj(trHata(e), 'hata');
        }
      },
    });
    dugmeEl.disabled = true;

    dugmeEl.addEventListener('click', async () => {
      if (!liste.durum.dosyalar.length) return;
      dugmeEl.disabled = true;
      arac.temizle();
      let belge = null;
      try {
        const dosya = liste.durum.dosyalar[0].file;
        arac.mesaj('PDF açılıyor…');
        belge = await pdfjsBelge(dosya);
        const toplam = belge.numPages;
        let sayfalar;
        if (aralikEl.value.trim()) sayfalar = aralikCoz(aralikEl.value, toplam).flat();
        else sayfalar = Array.from({ length: toplam }, (_, i) => i);
        sayfalar = Array.from(new Set(sayfalar)).sort((a, b) => a - b);

        const dpi = parseInt(dpiEl.value, 10);
        const kalite = parseInt(kaliteEl.value, 10) / 100;
        const taban = uzantisiz(dosya.name);
        const hane = String(toplam).length;
        const zip = new JSZip();
        let tekBlob = null;

        for (let k = 0; k < sayfalar.length; k++) {
          const no = sayfalar[k] + 1;
          arac.mesaj('Sayfa resme çevriliyor: ' + (k + 1) + ' / ' + sayfalar.length);
          arac.ilerleme(k / sayfalar.length);
          await bekle();
          const sayfa = await belge.getPage(no);
          let olcek = dpi / 72;
          const ilk = sayfa.getViewport({ scale: 1 });
          const enBuyuk = 12000; // tuval kenar sınırı (px)
          olcek = Math.min(olcek, enBuyuk / Math.max(ilk.width, ilk.height));
          const vp = sayfa.getViewport({ scale: olcek });
          const tuval = document.createElement('canvas');
          tuval.width = Math.floor(vp.width);
          tuval.height = Math.floor(vp.height);
          const ctx = tuval.getContext('2d');
          ctx.fillStyle = '#fff';
          ctx.fillRect(0, 0, tuval.width, tuval.height);
          await sayfa.render({ canvasContext: ctx, viewport: vp }).promise;
          const blob = await tuvalBlob(tuval, 'image/jpeg', kalite);
          tuval.width = tuval.height = 0;
          sayfa.cleanup();
          if (sayfalar.length === 1) tekBlob = blob;
          zip.file(taban + '-sayfa-' + String(no).padStart(hane, '0') + '.jpg', blob);
        }

        arac.ilerleme(1);
        if (tekBlob) {
          arac.mesaj('Dönüştürme tamamlandı.', 'ok');
          arac.sonucGoster(tekBlob, taban + '-sayfa-' + (sayfalar[0] + 1) + '.jpg', '1 görüntü');
        } else {
          arac.mesaj('ZIP klasörü hazırlanıyor…');
          await bekle();
          const blob = await zip.generateAsync({ type: 'blob', compression: 'STORE' });
          arac.mesaj('Dönüştürme tamamlandı.', 'ok');
          arac.sonucGoster(blob, taban + '-jpg.zip', sayfalar.length + ' JPG resmi');
        }
      } catch (e) {
        arac.mesaj(trHata(e), 'hata');
      } finally {
        if (belge) belge.destroy();
        arac.ilerleme(null);
        dugmeEl.disabled = !liste.durum.dosyalar.length;
      }
    });
  })();

  /* =========================================================
     4) JPG → PDF
     ========================================================= */
  (() => {
    const panel = $('[data-panel=jpgpdf]');
    const arac = panelArac(panel);
    const dugmeEl = $('.calistir', panel);
    const boyutEl = $('#pdfBoyut', panel);
    const kenarEl = $('#pdfKenar', panel);
    const kaliteEl = $('#pdfKalite', panel);
    const kaliteYazi = $('#pdfKaliteYazi', panel);

    kaliteEl.addEventListener('input', () => { kaliteYazi.textContent = '%' + kaliteEl.value; });

    const liste = dosyaListesi(panel, {
      coklu: true, kabul: resimMi, kartlar: true, dondur: true,
      onDegis: () => { dugmeEl.disabled = !liste.durum.dosyalar.length; },
    });
    dugmeEl.disabled = true;

    async function bitmapAl(file) {
      if (window.createImageBitmap) {
        try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); }
        catch (e) { /* aşağıdaki yedek yöntemi dene */ }
      }
      const url = URL.createObjectURL(file);
      try {
        const img = new Image();
        img.src = url;
        await img.decode();
        return img;
      } finally {
        URL.revokeObjectURL(url);
      }
    }

    async function resmiGom(pdf, file, kalite, rot = 0) {
      const png = file.type === 'image/png' || /\.png$/i.test(file.name);
      if (png && !rot) {
        try { return await pdf.embedPng(await okuBayt(file)); } catch (e) { /* tuval yöntemi */ }
      }
      const bmp = await bitmapAl(file);
      const g = bmp.width || bmp.naturalWidth;
      const y = bmp.height || bmp.naturalHeight;
      const tuval = document.createElement('canvas');
      const dik = rot % 180 !== 0;
      tuval.width = dik ? y : g;
      tuval.height = dik ? g : y;
      const ctx = tuval.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, tuval.width, tuval.height);
      ctx.translate(tuval.width / 2, tuval.height / 2);
      ctx.rotate((rot * Math.PI) / 180);
      ctx.drawImage(bmp, -g / 2, -y / 2);
      if (bmp.close) bmp.close();
      const blob = await tuvalBlob(tuval, 'image/jpeg', kalite);
      tuval.width = tuval.height = 0;
      return pdf.embedJpg(new Uint8Array(await blob.arrayBuffer()));
    }

    dugmeEl.addEventListener('click', async () => {
      const dosyalar = liste.durum.dosyalar;
      if (!dosyalar.length) return;
      dugmeEl.disabled = true;
      arac.temizle();
      try {
        const pdf = await PDFDocument.create();
        const kalite = parseInt(kaliteEl.value, 10) / 100;
        const kenar = parseFloat(kenarEl.value) * 72 / 25.4; // mm -> pt
        const mod = boyutEl.value;
        for (let i = 0; i < dosyalar.length; i++) {
          arac.mesaj('Resim ekleniyor: ' + (i + 1) + ' / ' + dosyalar.length + ' — ' + dosyalar[i].file.name);
          arac.ilerleme(i / dosyalar.length);
          await bekle();
          let resim;
          try { resim = await resmiGom(pdf, dosyalar[i].file, kalite, dosyalar[i].rot || 0); }
          catch (e) { throw new Error('Resim okunamadı: ' + dosyalar[i].file.name); }
          const rg = resim.width;
          const ry = resim.height;

          let sg, sy;
          if (mod === 'gorsel') {
            sg = rg * 0.75 + kenar * 2;
            sy = ry * 0.75 + kenar * 2;
          } else if (mod === 'a4dikey') { sg = A4.w; sy = A4.h; }
          else if (mod === 'a4yatay') { sg = A4.h; sy = A4.w; }
          else if (rg > ry) { sg = A4.h; sy = A4.w; }
          else { sg = A4.w; sy = A4.h; }

          const sayfa = pdf.addPage([sg, sy]);
          const alanG = sg - kenar * 2;
          const alanY = sy - kenar * 2;
          const olcek = Math.min(alanG / rg, alanY / ry);
          const cg = rg * olcek;
          const cy = ry * olcek;
          sayfa.drawImage(resim, { x: (sg - cg) / 2, y: (sy - cy) / 2, width: cg, height: cy });
        }
        arac.ilerleme(1);
        const bayt = await pdf.save();
        arac.mesaj('Dönüştürme tamamlandı.', 'ok');
        arac.sonucGoster(new Blob([bayt], { type: 'application/pdf' }), 'goruntuler.pdf', dosyalar.length + ' sayfa');
      } catch (e) {
        arac.mesaj(trHata(e), 'hata');
      } finally {
        arac.ilerleme(null);
        dugmeEl.disabled = !liste.durum.dosyalar.length;
      }
    });
  })();

  /* =========================================================
     ORTAK: tek PDF alan araçlar (döndür, düzenle, numara, filigran, sıkıştır, parola)
     ========================================================= */
  const { degrees } = PDFLib;

  /* ---------- Önizleme için ortak yardımcılar ---------- */
  const KAT = 3; // yazı resimlerinin çözünürlük katsayısı

  function metinTuval(metin, punto, renk, kalin) {
    const t = document.createElement('canvas');
    const c = t.getContext('2d');
    const yazi = (kalin ? 'bold ' : '') + punto * KAT + 'px "Segoe UI", Arial, sans-serif';
    c.font = yazi;
    const g = Math.max(8, Math.ceil(c.measureText(metin).width) + 8 * KAT);
    const y = Math.ceil(punto * KAT * 1.4);
    t.width = g; t.height = y;
    c.font = yazi; c.fillStyle = renk; c.textBaseline = 'middle'; c.textAlign = 'center';
    c.fillText(metin, g / 2, y / 2);
    return t;
  }
  const yaziOnb = new Map();
  function yaziTuvali(metin, punto, renk, kalin) {
    const k = [metin, punto, renk, kalin].join('|');
    if (!yaziOnb.has(k)) { if (yaziOnb.size > 300) yaziOnb.clear(); yaziOnb.set(k, metinTuval(metin, punto, renk, kalin)); }
    return yaziOnb.get(k);
  }

  function filigranYer(Wd, Hd, g, y, capraz) {
    let gg = g, yy = y;
    const uzun = capraz ? Math.hypot(Wd, Hd) * 0.8 : Wd * 0.9;
    const k = Math.min(1, uzun / gg, (Math.min(Wd, Hd) * 0.9) / yy);
    gg *= k; yy *= k;
    const a = capraz ? Math.atan2(Hd, Wd) : 0;
    return { x: Wd / 2 - (gg / 2) * Math.cos(a) + (yy / 2) * Math.sin(a), y: Hd / 2 - (gg / 2) * Math.sin(a) - (yy / 2) * Math.cos(a), w: gg, h: yy, rot: (a * 180) / Math.PI };
  }
  function numYer(konum, Wd, Hd, g, y) {
    const kenar = 24;
    let x = (Wd - g) / 2;
    if (konum.endsWith('sol')) x = kenar;
    if (konum.endsWith('sag')) x = Wd - g - kenar;
    return { x, y: konum.startsWith('ust') ? Hd - y - kenar + 6 : kenar - 6, w: g, h: y, rot: 0 };
  }

  // Görünen (döndürülmüş) koordinattan sayfanın özgün koordinatına
  const yerHarita = (R, Wu, Hu, xd, yd) => (R === 90 ? [Wu - yd, xd] : R === 180 ? [Wu - xd, Hu - yd] : R === 270 ? [yd, Hu - xd] : [xd, yd]);

  function sayfaYonu(s) {
    const R = ((s.getRotation().angle % 360) + 360) % 360;
    const cb = s.getCropBox();
    const [Wd, Hd] = R % 180 ? [cb.height, cb.width] : [cb.width, cb.height];
    return { R, cb, Wd, Hd };
  }

  // Görüntü olarak (PNG) sayfaya yerleştirir. y: görünen koordinatlarda sol-alt köşe, pt
  async function resimKoy(doc, onb, s, tuval, y, opak) {
    const { R, cb } = sayfaYonu(s);
    if (!onb.has(tuval)) onb.set(tuval, tuvalBlob(tuval, 'image/png').then((b) => b.arrayBuffer()).then((a) => doc.embedPng(new Uint8Array(a))));
    const resim = await onb.get(tuval);
    const [x0, y0] = yerHarita(R, cb.width, cb.height, y.x, y.y);
    s.drawImage(resim, { x: cb.x + x0, y: cb.y + y0, width: y.w, height: y.h, rotate: degrees(y.rot + R), opacity: opak });
  }

  /* Tek sayfalık önizleme: sayfa gezgini + üzerine çizilen katman.
     katCizFn(o) her yenilemede çağrılır; o.katEkle(...) ile katmana görüntü eklenir. */
  function sayfaOnizleme(panel, katCizFn) {
    const kap = document.createElement('div');
    kap.className = 'onizKap gizli';
    kap.innerHTML = '<div class="stdBar"><button type="button" class="kucuk" data-n="o" title="Önceki sayfa" aria-label="Önceki sayfa">‹</button><span class="stdNo"></span><button type="button" class="kucuk" data-n="s" title="Sonraki sayfa" aria-label="Sonraki sayfa">›</button></div><div class="stdSahne"><div class="stdSayfa"><canvas class="stdTuval"></canvas><div class="stdKat"></div></div></div>';
    $('.sol', panel).appendChild(kap);
    const noEl = $('.stdNo', kap);
    const sahne = $('.stdSahne', kap);
    const sayfaEl = $('.stdSayfa', kap);
    const tuvalEl = $('.stdTuval', kap);
    const katEl = $('.stdKat', kap);
    const o = { sec: 0, toplam: 0, Wd: 1, Hd: 1, cssW: 1, cssH: 1, belge: null, katEl, sayfaEl, kap };
    let jt = 0;
    let eski = null;

    o.yenile = () => { katEl.innerHTML = ''; if (o.belge) katCizFn(o); };
    o.katEkle = (src, x, y, w, h, rot, opak) => {
      const sc = o.cssW / o.Wd;
      const el = document.createElement('canvas');
      el.width = src.width; el.height = src.height;
      el.getContext('2d').drawImage(src, 0, 0);
      el.className = 'sabit';
      el.style.cssText = 'left:' + x * sc + 'px;top:' + (o.Hd - y - h) * sc + 'px;width:' + w * sc + 'px;height:' + h * sc + 'px;transform-origin:0 100%;transform:rotate(' + -rot + 'deg);opacity:' + opak;
      katEl.appendChild(el);
    };

    async function ciz() {
      const j = ++jt;
      if (!o.belge) return;
      noEl.textContent = (o.sec + 1) + ' / ' + o.toplam;
      const s = await o.belge.getPage(o.sec + 1);
      if (j !== jt) return;
      const v1 = s.getViewport({ scale: 1 });
      o.Wd = v1.width; o.Hd = v1.height;
      const enW = Math.min(Math.max(sahne.clientWidth - 16, 240), 760);
      const enH = Math.max(380, window.innerHeight * 0.75);
      o.cssW = Math.min(enW, (enH * o.Wd) / o.Hd);
      o.cssH = (o.cssW * o.Hd) / o.Wd;
      sayfaEl.style.width = o.cssW + 'px';
      sayfaEl.style.height = o.cssH + 'px';
      o.yenile();
      const v = s.getViewport({ scale: (o.cssW * Math.min(2, window.devicePixelRatio || 1)) / o.Wd });
      const t = document.createElement('canvas');
      t.width = Math.floor(v.width); t.height = Math.floor(v.height);
      const c = t.getContext('2d');
      c.fillStyle = '#fff'; c.fillRect(0, 0, t.width, t.height);
      await s.render({ canvasContext: c, viewport: v }).promise;
      s.cleanup();
      if (j !== jt) return;
      tuvalEl.width = t.width; tuvalEl.height = t.height;
      tuvalEl.getContext('2d').drawImage(t, 0, 0);
    }
    o.ciz = ciz;
    $$('[data-n]', kap).forEach((b) => b.addEventListener('click', () => {
      o.sec = Math.min(o.toplam - 1, Math.max(0, o.sec + (b.dataset.n === 's' ? 1 : -1)));
      ciz();
    }));
    o.ac = (belge) => { o.belge = belge; o.toplam = belge.numPages; o.sec = 0; kap.classList.remove('gizli'); ciz(); };
    o.kapat = () => { jt++; o.belge = null; kap.classList.add('gizli'); katEl.innerHTML = ''; };
    o.baglan = () => {
      panel.addEventListener('dosyadegisti', async (ev) => {
        const { dosyalar, yeniler } = ev.detail;
        if (!dosyalar.length) { o.kapat(); if (eski) { eski.destroy(); eski = null; } return; }
        if (!yeniler) return;
        try {
          const b = await pdfjsBelge(dosyalar[0].file);
          if (eski) eski.destroy();
          eski = b;
          o.ac(b);
        } catch (e) { /* hata ana araçta gösterilir */ }
      });
      window.addEventListener('resize', () => { if (o.belge && !panel.classList.contains('gizli')) ciz(); });
    };
    return o;
  }

  // Önizlemede sürüklenip boyutlandırılabilen öğe (imza vb.): it = { tuval, x, y, w } (oranlar, sol-üst)
  function ogeKoy(onz, it, degisti) {
    const { cssW, cssH, Wd, Hd } = onz;
    const oran = it.tuval.height / it.tuval.width;
    const hOran = () => (it.w * oran * Wd) / Hd; // yükseklik / sayfa yüksekliği
    const el = document.createElement('div');
    el.className = 'stdOge sec';
    const cv = document.createElement('canvas');
    cv.width = it.tuval.width; cv.height = it.tuval.height;
    cv.getContext('2d').drawImage(it.tuval, 0, 0);
    const tut = document.createElement('span');
    tut.className = 'tut';
    el.append(cv, tut);
    const yerles = () => {
      el.style.left = it.x * cssW + 'px'; el.style.top = it.y * cssH + 'px';
      el.style.width = it.w * cssW + 'px'; el.style.height = hOran() * cssH + 'px';
    };
    yerles();
    el.addEventListener('pointerdown', (e) => {
      if (e.target === tut) return;
      e.preventDefault();
      el.setPointerCapture(e.pointerId);
      const bx = e.clientX, by = e.clientY, ox = it.x, oy = it.y;
      const tasi = (m) => {
        it.x = Math.min(1 - it.w, Math.max(0, ox + (m.clientX - bx) / cssW));
        it.y = Math.min(1 - hOran(), Math.max(0, oy + (m.clientY - by) / cssH));
        yerles(); degisti(false);
      };
      const bitir = () => { el.removeEventListener('pointermove', tasi); el.removeEventListener('pointerup', bitir); };
      el.addEventListener('pointermove', tasi);
      el.addEventListener('pointerup', bitir);
    });
    tut.addEventListener('pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation();
      tut.setPointerCapture(e.pointerId);
      const sol = el.getBoundingClientRect().left;
      const tasi = (m) => {
        it.w = Math.min(0.95 - 0 * it.x, Math.max(0.04, (m.clientX - sol) / cssW));
        if (it.x + it.w > 1) it.x = 1 - it.w;
        if (it.y + hOran() > 1) it.y = Math.max(0, 1 - hOran());
        yerles(); degisti(true);
      };
      const bitir = () => { tut.removeEventListener('pointermove', tasi); tut.removeEventListener('pointerup', bitir); };
      tut.addEventListener('pointermove', tasi);
      tut.addEventListener('pointerup', bitir);
    });
    onz.katEl.appendChild(el);
    return el;
  }


  // Belge pdf-lib ile açılamadıysa tüm sayfalar görüntü yöntemiyle yeni belgeye aktarılır
  async function belgeAl(kaynak) {
    if (kaynak.doc) return kaynak.doc;
    const yeni = await PDFDocument.create();
    await sayfalariEkle(yeni, kaynak, Array.from({ length: kaynak.sayfaSayisi }, (_, i) => i));
    return yeni;
  }

  function sayfaSecimi(metin, toplam) {
    if (!metin.trim()) return Array.from({ length: toplam }, (_, i) => i);
    return Array.from(new Set(aralikCoz(metin, toplam).flat())).sort((a, b) => a - b);
  }

  function tekPanel(ad, calis, secenek = {}) {
    const panel = $('[data-panel=' + ad + ']');
    const arac = panelArac(panel);
    const dugmeEl = $('.calistir', panel);
    const sayfaBilgi = $('.sayfaBilgi', panel);
    const liste = dosyaListesi(panel, {
      coklu: false, kabul: pdfMi,
      onDegis: async (yeniler) => {
        dugmeEl.disabled = !liste.durum.dosyalar.length;
        if (!liste.durum.dosyalar.length) { sayfaBilgi.textContent = ''; return; }
        if (!yeniler) return;
        arac.temizle();
        sayfaBilgi.textContent = 'Dosya okunuyor…';
        try {
          const d = liste.durum.dosyalar[0];
          const k = await pdfAc(d.file);
          d.parola = k.parola;
          sayfaBilgi.textContent = 'Toplam ' + k.sayfaSayisi + ' sayfa · ' + boyut(d.file.size);
          if (secenek.yuklendi) await secenek.yuklendi(k, panel);
        } catch (e) {
          sayfaBilgi.textContent = '';
          arac.mesaj(trHata(e), 'hata');
        }
      },
    });
    dugmeEl.disabled = true;
    dugmeEl.addEventListener('click', async () => {
      const d = liste.durum.dosyalar[0];
      if (!d) return;
      dugmeEl.disabled = true;
      arac.temizle();
      try {
        arac.mesaj('PDF açılıyor…');
        await bekle();
        const kaynak = await pdfAc(d.file, d.parola || '');
        const taban = uzantisiz(d.file.name);
        const r = await calis({ kaynak, panel, arac, taban, dosya: d.file });
        if (!r) return;
        arac.ilerleme(1);
        arac.mesaj(r.mesaj || 'İşlem tamamlandı.', 'ok');
        arac.sonucGoster(r.blob || new Blob([r.bayt], { type: 'application/pdf' }), r.ad, r.ozet);
      } catch (e) {
        arac.mesaj(trHata(e), 'hata');
      } finally {
        arac.ilerleme(null);
        dugmeEl.disabled = !liste.durum.dosyalar.length;
      }
    });
  }

  /* ---------- 5) DÖNDÜR (sayfa sayfa önizlemeli) ---------- */
  (() => {
    const panel = $('[data-panel=dondur]');
    const arac = panelArac(panel);
    const dugmeEl = $('.calistir', panel);
    const sayfaBilgi = $('.sayfaBilgi', panel);
    const izgara = $('.donGrid', panel);
    let ogeler = [], belge = null, kaynak = null, jeton = 0;
    const onb = new Map();

    function donukCiz(hedef, src, rot) {
      const d = rot % 180 !== 0;
      hedef.width = d ? src.height : src.width;
      hedef.height = d ? src.width : src.height;
      const c = hedef.getContext('2d');
      c.save();
      c.translate(hedef.width / 2, hedef.height / 2);
      c.rotate((rot * Math.PI) / 180);
      c.drawImage(src, -src.width / 2, -src.height / 2);
      c.restore();
    }
    const kucuk = (no) => { if (!onb.has(no)) onb.set(no, kucukTuval(belge, no, 150)); return onb.get(no); };

    function ciz() {
      izgara.innerHTML = '';
      ogeler.forEach((o) => {
        const kutu = document.createElement('div');
        kutu.className = 'orgOge';
        const resim = document.createElement('div');
        resim.className = 'orgResim';
        const tuval = document.createElement('canvas');
        tuval.width = 100; tuval.height = 140;
        resim.appendChild(tuval);
        const yaz = document.createElement('div');
        yaz.className = 'orgNo';
        const guncelle = () => {
          yaz.innerHTML = 'Sayfa ' + o.no + (o.rot ? ' <small>(' + o.rot + '°)</small>' : '');
          kucuk(o.no).then((src) => donukCiz(tuval, src, o.rot)).catch(() => {});
        };
        o.guncelle = guncelle;
        gorunurIzle(kutu, guncelle);
        const dg = document.createElement('div');
        dg.className = 'orgBtn iki';
        [['↶', 'Sayfayı sola döndür', 270], ['↷', 'Sayfayı sağa döndür', 90]].forEach(([m, t, a]) => {
          const b = document.createElement('button');
          b.type = 'button'; b.textContent = m; b.title = t; b.setAttribute('aria-label', t);
          b.addEventListener('click', () => { o.rot = (o.rot + a) % 360; guncelle(); });
          dg.appendChild(b);
        });
        kutu.append(resim, yaz, dg);
        izgara.appendChild(kutu);
      });
    }

    $$('[data-don]', panel).forEach((b) => b.addEventListener('click', () => {
      if (!ogeler.length) return;
      const t = b.dataset.don;
      ogeler.forEach((o) => { o.rot = t === 'sifirla' ? 0 : (o.rot + (t === 'sag' ? 90 : 270)) % 360; if (o.guncelle) o.guncelle(); });
    }));

    const liste = dosyaListesi(panel, {
      coklu: false, kabul: pdfMi,
      onDegis: async (yeniler) => {
        dugmeEl.disabled = true;
        if (!liste.durum.dosyalar.length) {
          jeton++; izgara.innerHTML = ''; ogeler = []; kaynak = null; sayfaBilgi.textContent = '';
          if (belge) { belge.destroy(); belge = null; }
          return;
        }
        if (!yeniler) return;
        const j = ++jeton;
        arac.temizle();
        sayfaBilgi.textContent = 'Dosya okunuyor…';
        try {
          const dosya = liste.durum.dosyalar[0].file;
          const k = await pdfAc(dosya);
          const b = await pdfjsBelge(dosya);
          if (j !== jeton) { b.destroy(); return; }
          if (belge) belge.destroy();
          belge = b; kaynak = k; onb.clear();
          ogeler = Array.from({ length: k.sayfaSayisi }, (_, i) => ({ no: i + 1, rot: 0 }));
          sayfaBilgi.textContent = 'Toplam ' + k.sayfaSayisi + ' sayfa · ' + boyut(dosya.size);
          ciz();
          dugmeEl.disabled = false;
        } catch (e) {
          sayfaBilgi.textContent = '';
          arac.mesaj(trHata(e), 'hata');
        }
      },
    });
    dugmeEl.disabled = true;

    dugmeEl.addEventListener('click', async () => {
      if (!kaynak) return;
      dugmeEl.disabled = true;
      arac.temizle();
      try {
        if (!ogeler.some((o) => o.rot)) throw new Error('Henüz hiçbir sayfa döndürülmedi. Sayfaların altındaki düğmeleri kullanın.');
        arac.mesaj('Sayfalar döndürülüyor…');
        await bekle();
        const doc = await belgeAl(kaynak);
        let n = 0;
        ogeler.forEach((o, i) => {
          if (!o.rot) return;
          const s = doc.getPage(i);
          s.setRotation(degrees((s.getRotation().angle + o.rot) % 360));
          n++;
        });
        const bayt = await doc.save();
        arac.mesaj('İşlem tamamlandı.', 'ok');
        arac.sonucGoster(new Blob([bayt], { type: 'application/pdf' }), uzantisiz(liste.durum.dosyalar[0].file.name) + '-dondurulmus.pdf', n + ' sayfa döndürüldü');
      } catch (e) {
        arac.mesaj(trHata(e), 'hata');
      } finally {
        arac.ilerleme(null);
        dugmeEl.disabled = false;
      }
    });
  })();

  /* ---------- 6) SAYFALARI DÜZENLE (görsel: sürükle, döndür, çoğalt, sil) ---------- */
  (() => {
    const panel = $('[data-panel=duzenle]');
    const arac = panelArac(panel);
    const dugmeEl = $('.calistir', panel);
    const sayfaBilgi = $('.sayfaBilgi', panel);
    const izgara = $('.orgGrid', panel);
    const araBar = $('.orgArac', panel);
    let ogeler = [];
    let kaynak = null;
    let belge = null;
    let jeton = 0;
    let surukleIdx = -1;
    const onbellek = new Map(); // özgün sayfa no -> Promise<canvas>

    function kucukAl(no) {
      if (!onbellek.has(no)) onbellek.set(no, kucukTuval(belge, no, 150));
      return onbellek.get(no);
    }

    function donukCiz(hedef, src, rot) {
      const d = rot % 180 !== 0;
      hedef.width = d ? src.height : src.width;
      hedef.height = d ? src.width : src.height;
      const c = hedef.getContext('2d');
      c.save();
      c.translate(hedef.width / 2, hedef.height / 2);
      c.rotate((rot * Math.PI) / 180);
      c.drawImage(src, -src.width / 2, -src.height / 2);
      c.restore();
    }

    function ogeEl(o, i) {
      const kutu = document.createElement('div');
      kutu.className = 'orgOge';
      kutu.draggable = true;
      const resim = document.createElement('div');
      resim.className = 'orgResim';
      const tuval = document.createElement('canvas');
      tuval.width = 100; tuval.height = 140;
      resim.appendChild(tuval);
      const cizOge = () => kucukAl(o.no).then((src) => donukCiz(tuval, src, o.rot)).catch(() => {});
      gorunurIzle(kutu, cizOge);
      if (o.src) cizOge();
      const no = document.createElement('div');
      no.className = 'orgNo';
      no.innerHTML = (i + 1) + ' <small>(sayfa ' + o.no + ')</small>';
      const dugmeler = document.createElement('div');
      dugmeler.className = 'orgBtn';
      const ekle = (metin, baslik, fn, sinif, pasif) => {
        const b = document.createElement('button');
        b.type = 'button'; b.textContent = metin; b.title = baslik; b.setAttribute('aria-label', baslik);
        if (sinif) b.className = sinif;
        b.disabled = !!pasif;
        b.addEventListener('click', (e) => { e.stopPropagation(); fn(); });
        dugmeler.appendChild(b);
      };
      ekle('‹', 'Sayfayı öne al', () => tasi(i, -1), '', i === 0);
      ekle('›', 'Sayfayı arkaya al', () => tasi(i, 1), '', i === ogeler.length - 1);
      ekle('↶', 'Sayfayı sola döndür', () => { o.rot = (o.rot + 270) % 360; ciz(); });
      ekle('↷', 'Sayfayı sağa döndür', () => { o.rot = (o.rot + 90) % 360; ciz(); });
      ekle('⧉', 'Sayfayı çoğalt', () => { ogeler.splice(i + 1, 0, { no: o.no, rot: o.rot, src: true }); ciz(); });
      ekle('×', 'Sayfayı sil', () => { ogeler.splice(i, 1); ciz(); }, 'sil');
      kutu.append(resim, no, dugmeler);
      kutu.addEventListener('dragstart', (e) => { surukleIdx = i; kutu.classList.add('surukle'); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', String(i)); } catch (x) { /* önemsiz */ } });
      kutu.addEventListener('dragend', () => { kutu.classList.remove('surukle'); $$('.hedef', izgara).forEach((x) => x.classList.remove('hedef')); });
      kutu.addEventListener('dragover', (e) => { e.preventDefault(); kutu.classList.add('hedef'); });
      kutu.addEventListener('dragleave', () => kutu.classList.remove('hedef'));
      kutu.addEventListener('drop', (e) => {
        e.preventDefault();
        if (surukleIdx < 0 || surukleIdx === i) return;
        const [x] = ogeler.splice(surukleIdx, 1);
        ogeler.splice(i, 0, x);
        surukleIdx = -1;
        ciz();
      });
      return kutu;
    }

    function tasi(i, yon) {
      const j = i + yon;
      if (j < 0 || j >= ogeler.length) return;
      [ogeler[i], ogeler[j]] = [ogeler[j], ogeler[i]];
      ciz();
    }

    function ciz() {
      izgara.innerHTML = '';
      ogeler.forEach((o, i) => izgara.appendChild(ogeEl(o, i)));
      araBar.classList.toggle('gizli', !ogeler.length);
      dugmeEl.disabled = !ogeler.length;
      if (kaynak) sayfaBilgi.textContent = 'Özgün belge: ' + kaynak.sayfaSayisi + ' sayfa · Kaydedilecek: ' + ogeler.length + ' sayfa';
    }

    function sifirla() {
      ogeler = Array.from({ length: kaynak.sayfaSayisi }, (_, i) => ({ no: i + 1, rot: 0 }));
      ciz();
    }

    $$('[data-org]', panel).forEach((b) => b.addEventListener('click', () => {
      if (!kaynak) return;
      const t = b.dataset.org;
      if (t === 'tersle') ogeler.reverse();
      else if (t === 'sag') ogeler.forEach((o) => { o.rot = (o.rot + 90) % 360; });
      else sifirla();
      ciz();
    }));

    const liste = dosyaListesi(panel, {
      coklu: false, kabul: pdfMi,
      onDegis: async (yeniler) => {
        dugmeEl.disabled = true;
        if (!liste.durum.dosyalar.length) {
          jeton++; izgara.innerHTML = ''; ogeler = []; kaynak = null; sayfaBilgi.textContent = '';
          araBar.classList.add('gizli');
          if (belge) { belge.destroy(); belge = null; }
          return;
        }
        if (!yeniler) return;
        const j = ++jeton;
        arac.temizle();
        sayfaBilgi.textContent = 'Sayfalar okunuyor…';
        try {
          const dosya = liste.durum.dosyalar[0].file;
          const k = await pdfAc(dosya);
          const b = await pdfjsBelge(dosya);
          if (j !== jeton) { b.destroy(); return; }
          if (belge) belge.destroy();
          belge = b; kaynak = k; onbellek.clear();
          sifirla();
        } catch (e) {
          sayfaBilgi.textContent = '';
          arac.mesaj(trHata(e), 'hata');
        }
      },
    });
    dugmeEl.disabled = true;

    dugmeEl.addEventListener('click', async () => {
      if (!kaynak || !ogeler.length) return;
      dugmeEl.disabled = true;
      arac.temizle();
      try {
        arac.mesaj('Sayfalar düzenleniyor…');
        await bekle();
        const yeni = await PDFDocument.create();
        let goruntu = 0;
        let toplu = false;
        if (kaynak.doc) {
          try {
            const k = await yeni.copyPages(kaynak.doc, ogeler.map((o) => o.no - 1));
            k.forEach((p) => yeni.addPage(p));
            toplu = true;
          } catch (e) { /* tek tek denenecek */ }
        }
        if (!toplu) {
          for (let i = 0; i < ogeler.length; i++) {
            arac.ilerleme(i / ogeler.length);
            goruntu += await sayfalariEkle(yeni, kaynak, [ogeler[i].no - 1]);
          }
        }
        ogeler.forEach((o, i) => {
          if (!o.rot) return;
          const p = yeni.getPage(i);
          p.setRotation(degrees((p.getRotation().angle + o.rot) % 360));
        });
        const bayt = await yeni.save();
        arac.mesaj('İşlem tamamlandı.', 'ok');
        arac.sonucGoster(new Blob([bayt], { type: 'application/pdf' }), uzantisiz(liste.durum.dosyalar[0].file.name) + '-duzenlenmis.pdf', ogeler.length + ' sayfa' + yedekNotu(goruntu));
      } catch (e) {
        arac.mesaj(trHata(e), 'hata');
      } finally {
        arac.ilerleme(null);
        dugmeEl.disabled = !ogeler.length;
      }
    });
  })();

  /* ---------- 7) SAYFA NUMARASI (önizlemeli) ---------- */
  (() => {
    const panel = $('[data-panel=numara]');
    const metin = (i, toplam) => {
      const bas = Math.max(0, parseInt($('#numBas', panel).value, 10) || 0);
      return $('#numBicim', panel).value.replace('[n]', i + bas).replace('[t]', toplam - 1 + bas);
    };
    const ayar = () => ({ konum: $('#numKonum', panel).value, punto: parseInt($('#numBoyut', panel).value, 10), ilkAtla: $('#numIlk', panel).checked });
    const onz = sayfaOnizleme(panel, (o) => {
      const a = ayar();
      if (a.ilkAtla && o.sec === 0) return;
      const t = yaziTuvali(metin(o.sec, o.toplam), a.punto, '#222222', false);
      const y = numYer(a.konum, o.Wd, o.Hd, t.width / KAT, t.height / KAT);
      o.katEkle(t, y.x, y.y, y.w, y.h, 0, 1);
    });
    onz.baglan();
    const yen = (e) => { if (e.target.closest('.secenekler')) onz.yenile(); };
    panel.addEventListener('input', yen);
    panel.addEventListener('change', yen);

    tekPanel('numara', async ({ kaynak, taban, arac }) => {
      const doc = await belgeAl(kaynak);
      const a = ayar();
      const toplam = doc.getPageCount();
      const onb = new Map();
      for (let i = 0; i < toplam; i++) {
        if (a.ilkAtla && i === 0) continue;
        arac.mesaj('Numara yazılıyor: ' + (i + 1) + ' / ' + toplam);
        arac.ilerleme(i / toplam);
        if (i % 10 === 0) await bekle();
        const s = doc.getPage(i);
        const { Wd, Hd } = sayfaYonu(s);
        const t = yaziTuvali(metin(i, toplam), a.punto, '#222222', false);
        await resimKoy(doc, onb, s, t, numYer(a.konum, Wd, Hd, t.width / KAT, t.height / KAT), 1);
      }
      return { bayt: await doc.save(), ad: taban + '-numarali.pdf', ozet: toplam + ' sayfa' };
    });
  })();

  /* ---------- 8) FİLİGRAN (önizlemeli) ---------- */
  (() => {
    const panel = $('[data-panel=filigran]');
    const ayar = () => ({
      metin: $('#filMetin', panel).value.trim(),
      punto: parseInt($('#filBoyut', panel).value, 10),
      opak: parseInt($('#filOpaklik', panel).value, 10) / 100,
      renk: $('#filRenk', panel).value,
      capraz: $('#filYon', panel).value === 'capraz',
    });
    const secim = (toplam) => { try { return sayfaSecimi($('#filSayfa', panel).value, toplam); } catch (e) { return null; } };
    const onz = sayfaOnizleme(panel, (o) => {
      const a = ayar();
      const s = secim(o.toplam);
      if (!a.metin || (s && !s.includes(o.sec))) return;
      const t = yaziTuvali(a.metin, a.punto, a.renk, true);
      const y = filigranYer(o.Wd, o.Hd, t.width / KAT, t.height / KAT, a.capraz);
      o.katEkle(t, y.x, y.y, y.w, y.h, y.rot, a.opak);
    });
    onz.baglan();
    const yen = (e) => { if (e.target.closest('.secenekler')) onz.yenile(); };
    panel.addEventListener('input', yen);
    panel.addEventListener('change', yen);

    tekPanel('filigran', async ({ kaynak, taban }) => {
      const a = ayar();
      if (!a.metin) throw new Error('Lütfen filigran olarak yazılacak metni girin.');
      const doc = await belgeAl(kaynak);
      const sec = sayfaSecimi($('#filSayfa', panel).value, doc.getPageCount());
      const t = yaziTuvali(a.metin, a.punto, a.renk, true);
      const onb = new Map();
      for (const i of sec) {
        const s = doc.getPage(i);
        const { Wd, Hd } = sayfaYonu(s);
        await resimKoy(doc, onb, s, t, filigranYer(Wd, Hd, t.width / KAT, t.height / KAT, a.capraz), a.opak);
      }
      return { bayt: await doc.save(), ad: taban + '-filigranli.pdf', ozet: sec.length + ' sayfaya eklendi' };
    });
  })();

  /* ---------- 9) SIKIŞTIR (sayfaları görüntüye çevirerek) ---------- */
  tekPanel('sikistir', async ({ kaynak, panel, arac, taban, dosya }) => {
    const seviye = { hafif: [150, 0.8], orta: [110, 0.65], guclu: [80, 0.5] }[$('#sikSeviye', panel).value];
    const belge = await pdfjsLib.getDocument({ data: kaynak.bayt.slice(), password: kaynak.parola, isEvalSupported: false }).promise;
    try {
      const yeni = await PDFDocument.create();
      for (let n = 1; n <= belge.numPages; n++) {
        arac.mesaj('Sıkıştırılıyor: ' + n + ' / ' + belge.numPages);
        arac.ilerleme((n - 1) / belge.numPages);
        await bekle();
        const sayfa = await belge.getPage(n);
        const vp1 = sayfa.getViewport({ scale: 1 });
        const vp = sayfa.getViewport({ scale: Math.min(seviye[0] / 72, 8000 / Math.max(vp1.width, vp1.height)) });
        const tuval = document.createElement('canvas');
        tuval.width = Math.floor(vp.width); tuval.height = Math.floor(vp.height);
        const ctx = tuval.getContext('2d');
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, tuval.width, tuval.height);
        await sayfa.render({ canvasContext: ctx, viewport: vp }).promise;
        const blob = await tuvalBlob(tuval, 'image/jpeg', seviye[1]);
        tuval.width = tuval.height = 0;
        const resim = await yeni.embedJpg(new Uint8Array(await blob.arrayBuffer()));
        yeni.addPage([vp1.width, vp1.height]).drawImage(resim, { x: 0, y: 0, width: vp1.width, height: vp1.height });
        sayfa.cleanup();
      }
      const bayt = await yeni.save();
      if (bayt.length >= dosya.size) {
        arac.mesaj('Bu dosya daha fazla küçültülemedi; zaten küçük veya yeterince sıkıştırılmış. Dosya indirilmedi.', 'hata');
        return null;
      }
      const oran = Math.round((1 - bayt.length / dosya.size) * 100);
      return { bayt, ad: taban + '-sikistirilmis.pdf', ozet: boyut(dosya.size) + ' → ' + boyut(bayt.length) + ' (%' + oran + ' küçüldü)' };
    } finally {
      belge.destroy();
    }
  });

  /* ---------- 10) PAROLA EKLE / KALDIR ---------- */
  (() => {
    const panel = $('[data-panel=parola]');
    const modlar = $$('input[name=parMod]', panel);
    const goster = () => {
      const m = modlar.find((x) => x.checked).value;
      $$('[data-mod]', panel).forEach((e) => e.classList.toggle('gizli', e.dataset.mod !== m));
    };
    modlar.forEach((m) => m.addEventListener('change', goster));
    goster();
    tekPanel('parola', async ({ kaynak, taban }) => {
      const doc = await belgeAl(kaynak);
      const mod = modlar.find((x) => x.checked).value;
      if (mod === 'kaldir') {
        return { bayt: await doc.save(), ad: taban + '-parolasiz.pdf', ozet: 'Parola koruması kaldırıldı' };
      }
      const yeni = $('#parYeni', panel).value;
      if (yeni.length < 4) throw new Error('Parola en az 4 karakter uzunluğunda olmalıdır.');
      const kisit = $('#parKisit', panel).checked;
      const sahip = Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(36)).join('');
      doc.encrypt({
        userPassword: yeni,
        ownerPassword: sahip,
        permissions: kisit
          ? { printing: 'highResolution', copying: false, modifying: false, annotating: false }
          : { printing: 'highResolution', copying: true, modifying: true, annotating: true },
      });
      return { bayt: await doc.save(), ad: taban + '-korumali.pdf', ozet: 'Parola ile korundu' };
    });
  })();

  /* ---------- 11) SAYFA KIRP (önizlemeli) ---------- */
  (() => {
    const panel = $('[data-panel=kirp]');
    const MM = 72 / 25.4;
    const idler = { ust: '#kirpUst', alt: '#kirpAlt', sol: '#kirpSol', sag: '#kirpSag' };
    const deger = (a) => Math.max(0, parseFloat($(idler[a], panel).value) || 0);
    const onz = sayfaOnizleme(panel, (o) => {
      const { Wd, Hd, cssW, cssH } = o;
      const k = { l: Math.min(0.9, (deger('sol') * MM) / Wd), r: Math.min(0.9, (deger('sag') * MM) / Wd), t: Math.min(0.9, (deger('ust') * MM) / Hd), b: Math.min(0.9, (deger('alt') * MM) / Hd) };
      const golge = {};
      ['ust', 'alt', 'sol', 'sag'].forEach((a) => { const d = document.createElement('div'); d.className = 'kGolge'; o.katEl.appendChild(d); golge[a] = d; });
      const cer = document.createElement('div'); cer.className = 'kCerceve'; o.katEl.appendChild(cer);
      const tut = {};
      ['n', 's', 'e', 'w'].forEach((a) => { const t = document.createElement('div'); t.className = 'kTut'; t.dataset.k = a; o.katEl.appendChild(t); tut[a] = t; });
      const yerles = () => {
        const L = k.l * cssW, T = k.t * cssH, R = k.r * cssW, B = k.b * cssH;
        const W = cssW - L - R, H = cssH - T - B;
        const set = (el, x, y, w, h) => { el.style.cssText = 'left:' + x + 'px;top:' + y + 'px;width:' + w + 'px;height:' + h + 'px'; };
        set(golge.ust, 0, 0, cssW, T); set(golge.alt, 0, cssH - B, cssW, B);
        set(golge.sol, 0, T, L, H); set(golge.sag, cssW - R, T, R, H);
        set(cer, L, T, W, H);
        set(tut.n, L + W / 2 - 24, T - 6, 48, 12); set(tut.s, L + W / 2 - 24, T + H - 6, 48, 12);
        set(tut.w, L - 6, T + H / 2 - 24, 12, 48); set(tut.e, L + W - 6, T + H / 2 - 24, 12, 48);
      };
      yerles();
      const yaz = () => {
        $(idler.sol, panel).value = +((k.l * Wd) / MM).toFixed(1);
        $(idler.sag, panel).value = +((k.r * Wd) / MM).toFixed(1);
        $(idler.ust, panel).value = +((k.t * Hd) / MM).toFixed(1);
        $(idler.alt, panel).value = +((k.b * Hd) / MM).toFixed(1);
      };
      Object.values(tut).forEach((t) => t.addEventListener('pointerdown', (e) => {
        e.preventDefault(); e.stopPropagation();
        t.setPointerCapture(e.pointerId);
        const r = o.sayfaEl.getBoundingClientRect();
        const tasi = (m) => {
          const fx = (m.clientX - r.left) / cssW, fy = (m.clientY - r.top) / cssH;
          const a = t.dataset.k;
          if (a === 'w') k.l = Math.max(0, Math.min(1 - k.r - 0.1, fx));
          if (a === 'e') k.r = Math.max(0, Math.min(1 - k.l - 0.1, 1 - fx));
          if (a === 'n') k.t = Math.max(0, Math.min(1 - k.b - 0.1, fy));
          if (a === 's') k.b = Math.max(0, Math.min(1 - k.t - 0.1, 1 - fy));
          yerles(); yaz();
        };
        const bitir = () => { t.removeEventListener('pointermove', tasi); t.removeEventListener('pointerup', bitir); };
        t.addEventListener('pointermove', tasi);
        t.addEventListener('pointerup', bitir);
      }));
    });
    onz.baglan();
    panel.addEventListener('input', (e) => { if (e.target.closest('.secenekler') && e.target.type === 'number') onz.yenile(); });

    tekPanel('kirp', async ({ kaynak, taban }) => {
      const ust = deger('ust') * MM, alt = deger('alt') * MM, sol = deger('sol') * MM, sag = deger('sag') * MM;
      if (!(ust || alt || sol || sag)) throw new Error('Kırpma için çerçeveyi sürükleyin veya en az bir kenara değer (mm) girin.');
      const doc = await belgeAl(kaynak);
      const secim = sayfaSecimi($('#kirpSayfa', panel).value, doc.getPageCount());
      secim.forEach((i) => {
        const s = doc.getPage(i);
        const { R, cb, Wd, Hd } = sayfaYonu(s);
        if (Wd - sol - sag < 36 || Hd - ust - alt < 36) throw new Error((i + 1) + '. sayfada kırpma değeri sayfa boyutuna göre çok büyük.');
        // görünen kenarlar -> sayfanın özgün kenarları
        const [L, T, Rr, B] = R === 90 ? [ust, sag, alt, sol] : R === 180 ? [sag, alt, sol, ust] : R === 270 ? [alt, sol, ust, sag] : [sol, ust, sag, alt];
        s.setCropBox(cb.x + L, cb.y + B, cb.width - L - Rr, cb.height - T - B);
      });
      return { bayt: await doc.save(), ad: taban + '-kirpilmis.pdf', ozet: secim.length + ' sayfa kırpıldı' };
    });
  })();

  /* ---------- 12) PDF → METİN ---------- */
  tekPanel('pdfmetin', async ({ kaynak, panel, arac, taban }) => {
    const baslikVar = $('#metinBaslik', panel).checked;
    const belge = await pdfjsLib.getDocument({ data: kaynak.bayt.slice(), password: kaynak.parola, isEvalSupported: false }).promise;
    try {
      let cikti = '';
      let karakter = 0;
      for (let n = 1; n <= belge.numPages; n++) {
        arac.mesaj('Metin okunuyor: ' + n + ' / ' + belge.numPages);
        arac.ilerleme((n - 1) / belge.numPages);
        if (n % 5 === 0) await bekle();
        const sayfa = await belge.getPage(n);
        const icerik = await sayfa.getTextContent();
        let metin = '';
        icerik.items.forEach((it) => { metin += it.str + (it.hasEOL ? '\n' : ' '); });
        metin = metin.replace(/[ \t]+\n/g, '\n').trim();
        karakter += metin.length;
        cikti += (baslikVar ? '— Sayfa ' + n + ' —\n' : '') + metin + '\n\n';
        sayfa.cleanup();
      }
      if (!karakter) throw new Error('PDF içinde metin bulunamadı. Dosya taranmış (görüntü) olabilir.');
      return { blob: new Blob(['﻿' + cikti], { type: 'text/plain;charset=utf-8' }), ad: taban + '.txt', ozet: belge.numPages + ' sayfa · ' + karakter + ' karakter' };
    } finally {
      belge.destroy();
    }
  });

  /* ---------- 13) İMZA EKLE (önizlemeli) ---------- */
  (() => {
    const panel = $('[data-panel=imza]');
    const pad = $('#imzaTuval', panel);
    const c = pad.getContext('2d');
    let ciziyor = false;
    let it = null; // { tuval, x, y, w }

    const hedefSayfalar = (toplam) => {
      const h = $('#imzaHedef', panel).value;
      if (h === 'son') return [toplam - 1];
      if (h === 'ilk') return [0];
      if (h === 'tum') return Array.from({ length: toplam }, (_, i) => i);
      try { return sayfaSecimi($('#imzaSayfa', panel).value, toplam); } catch (e) { return []; }
    };

    const onz = sayfaOnizleme(panel, (o) => {
      if (!it || !hedefSayfalar(o.toplam).includes(o.sec)) return;
      ogeKoy(o, it, (boyutDegisti) => { if (boyutDegisti) $('#imzaBoyut', panel).value = Math.round(it.w * 100); });
    });
    onz.baglan();

    function konumla() {
      if (!it || !onz.belge) return;
      const konum = $('#imzaKonum', panel).value;
      const { Wd, Hd } = onz;
      const h = (it.w * (it.tuval.height / it.tuval.width) * Wd) / Hd;
      it.x = konum.endsWith('sol') ? 0.06 : konum.endsWith('sag') ? 1 - it.w - 0.06 : (1 - it.w) / 2;
      it.y = konum.startsWith('ust') ? 0.05 : konum.startsWith('alt') ? 1 - h - 0.05 : (1 - h) / 2;
      it.y = Math.max(0, it.y);
    }

    function kes() {
      const { width: g, height: y } = pad;
      const d = c.getImageData(0, 0, g, y).data;
      let x0 = g, y0 = y, x1 = 0, y1 = 0;
      for (let j = 0; j < y; j++) for (let i = 0; i < g; i++) {
        if (d[(j * g + i) * 4 + 3] > 10) { if (i < x0) x0 = i; if (i > x1) x1 = i; if (j < y0) y0 = j; if (j > y1) y1 = j; }
      }
      if (x1 <= x0 || y1 <= y0) return null;
      x0 = Math.max(0, x0 - 6); y0 = Math.max(0, y0 - 6); x1 = Math.min(g - 1, x1 + 6); y1 = Math.min(y - 1, y1 + 6);
      const t = document.createElement('canvas');
      t.width = x1 - x0 + 1; t.height = y1 - y0 + 1;
      t.getContext('2d').drawImage(pad, x0, y0, t.width, t.height, 0, 0, t.width, t.height);
      return t;
    }

    // önizleme imzanın ekleneceği sayfada değilse oraya geçer
    function hedefeGit() {
      if (!onz.belge) return false;
      const h = hedefSayfalar(onz.toplam);
      if (h.length && !h.includes(onz.sec)) { onz.sec = h[0]; onz.ciz(); return true; }
      return false;
    }

    function imzaGuncelle() {
      const t = kes();
      if (!t) { it = null; onz.yenile(); return; }
      const w = it ? it.w : parseInt($('#imzaBoyut', panel).value, 10) / 100;
      const eski = it;
      it = { tuval: t, w, x: eski ? eski.x : 0.5, y: eski ? eski.y : 0.5 };
      if (!eski) konumla();
      if (!hedefeGit()) onz.yenile();
    }

    const nokta = (e) => { const r = pad.getBoundingClientRect(); return { x: ((e.clientX - r.left) * pad.width) / r.width, y: ((e.clientY - r.top) * pad.height) / r.height }; };
    pad.addEventListener('pointerdown', (e) => {
      e.preventDefault(); pad.setPointerCapture(e.pointerId);
      ciziyor = true;
      c.lineWidth = 3.2; c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = $('#imzaRenk', panel).value;
      const p = nokta(e); c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x + 0.1, p.y + 0.1); c.stroke();
    });
    pad.addEventListener('pointermove', (e) => { if (!ciziyor) return; const p = nokta(e); c.lineTo(p.x, p.y); c.stroke(); c.beginPath(); c.moveTo(p.x, p.y); });
    ['pointerup', 'pointercancel'].forEach((ad) => pad.addEventListener(ad, () => { if (ciziyor) { ciziyor = false; imzaGuncelle(); } }));
    $('#imzaTemizle', panel).addEventListener('click', () => { c.clearRect(0, 0, pad.width, pad.height); it = null; onz.yenile(); });

    $('#imzaKonum', panel).addEventListener('change', () => { konumla(); onz.yenile(); });
    $('#imzaBoyut', panel).addEventListener('input', () => {
      if (!it) return;
      it.w = parseInt($('#imzaBoyut', panel).value, 10) / 100;
      const h = (it.w * (it.tuval.height / it.tuval.width) * onz.Wd) / onz.Hd;
      it.x = Math.min(it.x, 1 - it.w); it.y = Math.min(it.y, Math.max(0, 1 - h));
      onz.yenile();
    });
    ['imzaHedef', 'imzaSayfa'].forEach((id) => $('#' + id, panel).addEventListener('input', () => { if (!hedefeGit()) onz.yenile(); }));

    tekPanel('imza', async ({ kaynak, taban }) => {
      if (!it) throw new Error('Önce imzanızı Seçenekler bölümündeki alana çizin.');
      const doc = await belgeAl(kaynak);
      const toplam = doc.getPageCount();
      const hedef = $('#imzaHedef', panel).value;
      if (hedef === 'ozel' && !$('#imzaSayfa', panel).value.trim()) throw new Error('İmza eklenecek sayfa numaralarını yazın. Örnek: 2, 5-6');
      const secim = hedef === 'ozel' ? sayfaSecimi($('#imzaSayfa', panel).value, toplam) : hedefSayfalar(toplam);
      const onb = new Map();
      for (const i of secim) {
        const s = doc.getPage(i);
        const { Wd, Hd } = sayfaYonu(s);
        const w = it.w * Wd;
        const h = w * (it.tuval.height / it.tuval.width);
        await resimKoy(doc, onb, s, it.tuval, { x: it.x * Wd, y: Hd - it.y * Hd - h, w, h, rot: 0 }, 1);
      }
      return { bayt: await doc.save(), ad: taban + '-imzali.pdf', ozet: secim.length + ' sayfaya imza eklendi' };
    });
  })();

  /* ---------- 14) BELGE BİLGİLERİ ---------- */
  tekPanel('bilgi', async ({ kaynak, panel, taban }) => {
    const doc = await belgeAl(kaynak);
    doc.setTitle($('#bilBaslik', panel).value.trim());
    doc.setAuthor($('#bilYazar', panel).value.trim());
    doc.setSubject($('#bilKonu', panel).value.trim());
    doc.setKeywords($('#bilAnahtar', panel).value.split(',').map((x) => x.trim()).filter(Boolean));
    doc.setModificationDate(new Date());
    return { bayt: await doc.save(), ad: taban + '-bilgili.pdf', ozet: 'Belge bilgileri güncellendi' };
  }, {
    yuklendi: (k, panel) => {
      const d = k.doc;
      $('#bilBaslik', panel).value = (d && d.getTitle()) || '';
      $('#bilYazar', panel).value = (d && d.getAuthor()) || '';
      $('#bilKonu', panel).value = (d && d.getSubject()) || '';
      $('#bilAnahtar', panel).value = ((d && d.getKeywords()) || '').split(/\s*[,;]\s*/).filter(Boolean).join(', ');
    },
  });

  /* ---------- KÜÇÜK RESİMLE SAYFA SEÇİMİ ---------- */
  $$('.krAlan').forEach((kr) => {
    const panel = kr.closest('.panel');
    const hedef = $(kr.dataset.hedef, panel);
    const izgara = $('.krGrid', kr);
    const secili = new Set();
    let belge = null;
    let jeton = 0;
    let toplam = 0;

    const yazi = () => {
      const a = Array.from(secili).sort((x, y) => x - y);
      const p = [];
      for (let i = 0; i < a.length;) {
        let j = i;
        while (j + 1 < a.length && a[j + 1] === a[j] + 1) j++;
        p.push(i === j ? String(a[i]) : a[i] + '-' + a[j]);
        i = j + 1;
      }
      return p.join(', ');
    };
    const isaretle = () => $$('.krKart', izgara).forEach((k) => k.classList.toggle('sec', secili.has(+k.dataset.no)));

    hedef.addEventListener('input', () => {
      secili.clear();
      try { if (hedef.value.trim()) aralikCoz(hedef.value, toplam).flat().forEach((i) => secili.add(i + 1)); } catch (e) { /* yarım yazılmış aralık */ }
      isaretle();
    });

    panel.addEventListener('dosyadegisti', async (ev) => {
      const j = ++jeton;
      izgara.innerHTML = '';
      secili.clear();
      kr.classList.add('gizli');
      if (belge) { belge.destroy(); belge = null; }
      const { dosyalar, yeniler } = ev.detail;
      if (!dosyalar.length || !yeniler) return;
      try {
        const b = await pdfjsBelge(dosyalar[0].file);
        if (j !== jeton) { b.destroy(); return; }
        belge = b;
        toplam = b.numPages;
        kr.classList.remove('gizli');
        for (let n = 1; n <= toplam; n++) {
          const k = document.createElement('button');
          k.type = 'button';
          k.className = 'krKart';
          k.dataset.no = n;
          k.title = n + '. sayfa';
          k.innerHTML = '<span>' + n + '</span>';
          k.addEventListener('click', () => {
            if (secili.has(n)) secili.delete(n); else secili.add(n);
            hedef.value = yazi();
            if (kr.dataset.radyo) { const r = $(kr.dataset.radyo, panel); if (r && !r.checked) { r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true })); } }
            isaretle();
          });
          izgara.appendChild(k);
          gorunurIzle(k, async () => {
            try {
              const t = await kucukTuval(b, n, 80);
              if (j !== jeton) return;
              k.insertBefore(t, k.firstChild);
            } catch (e) { /* önemsiz */ }
          });
        }
      } catch (e) { /* hata ana araçta gösterilir */ }
    });
  });

  /* ---------- BİRLEŞTİR: dosya sayfa sayıları ---------- */
  (() => {
    const panel = $('[data-panel=birlestir]');
    panel.addEventListener('dosyadegisti', async (ev) => {
      const { dosyalar, yeniler } = ev.detail;
      if (!yeniler) return;
      const ciz = () => $$('.liste li small', panel).forEach((m, i) => {
        const d = dosyalar[i];
        if (d) m.textContent = boyut(d.file.size) + (d.bilgi ? ' · ' + d.bilgi : '');
      });
      for (const d of dosyalar.filter((x) => yeniler.includes(x.file))) {
        try {
          const b = await pdfjsBelge(d.file);
          d.bilgi = b.numPages + ' sayfa';
          b.destroy();
        } catch (e) { d.bilgi = 'okunamadı'; }
        ciz();
      }
    });
  })();

  /* ---------- DOSYA ÖNİZLEMESİ (ilk sayfa) ---------- */
  ['sikistir', 'parola', 'pdfmetin', 'bilgi'].forEach((ad) => {
    const panel = $('[data-panel=' + ad + ']');
    const kutu = document.createElement('div');
    kutu.className = 'dosyaOnizle gizli';
    $('.sayfaBilgi', panel).after(kutu);
    let jeton = 0;
    panel.addEventListener('dosyadegisti', async (ev) => {
      const j = ++jeton;
      const { dosyalar, yeniler } = ev.detail;
      if (!dosyalar.length) { kutu.classList.add('gizli'); kutu.innerHTML = ''; return; }
      if (!yeniler) return;
      kutu.classList.remove('gizli');
      kutu.textContent = 'Önizleme hazırlanıyor…';
      try {
        const b = await pdfjsBelge(dosyalar[0].file);
        try {
          const t = await kucukTuval(b, 1, 260);
          if (j !== jeton) return;
          kutu.innerHTML = '';
          kutu.appendChild(t);
        } finally { b.destroy(); }
      } catch (e) { if (j === jeton) kutu.classList.add('gizli'); }
    });
  });


  /* ---------- Ana ekran: araç arama ---------- */
  (() => {
    const kutu = $('#araAra');
    const yok = $('#araYok');
    const kucuk = (t) => t.toLocaleLowerCase('tr').normalize('NFD').replace(/[̀-ͯ]/g, '');
    kutu.addEventListener('input', () => {
      const q = kucuk(kutu.value.trim());
      let toplam = 0;
      $$('#ana .kat').forEach((baslik) => {
        const izgara = baslik.nextElementSibling;
        let say = 0;
        $$('.araKart', izgara).forEach((k) => {
          const uygun = !q || kucuk(k.textContent).includes(q);
          k.classList.toggle('gizli', !uygun);
          if (uygun) say++;
        });
        baslik.classList.toggle('gizli', !say);
        izgara.classList.toggle('gizli', !say);
        toplam += say;
      });
      yok.classList.toggle('gizli', toplam > 0);
    });
    kutu.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { const ilk = $('#ana .araKart:not(.gizli)'); if (ilk) ilk.click(); }
    });
  })();

  /* ---------- Ana ekran: dosyayı bırakınca araç seçimi ---------- */
  (() => {
    const kutu = $('#dropSec');
    const liste = $('.dropListe', kutu);
    const baslik = $('#dropBaslik', kutu);
    const anaGorunur = () => !$('#ana').classList.contains('gizli');
    const dosyaVarMi = (e) => e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files');
    const kapat = () => kutu.classList.add('gizli');
    $('#dropIptal').addEventListener('click', kapat);
    kutu.addEventListener('click', (e) => { if (e.target === kutu) kapat(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') kapat(); });

    window.addEventListener('dragover', (e) => { if (anaGorunur() && dosyaVarMi(e)) { e.preventDefault(); document.body.classList.add('suruklenior'); } });
    window.addEventListener('dragleave', (e) => { if (!e.relatedTarget) document.body.classList.remove('suruklenior'); });
    window.addEventListener('drop', (e) => {
      document.body.classList.remove('suruklenior');
      if (!anaGorunur() || !dosyaVarMi(e)) return;
      e.preventDefault();
      const dosyalar = Array.from(e.dataTransfer.files);
      const pdfler = dosyalar.filter(pdfMi);
      const resimler = dosyalar.filter(resimMi);
      if (!pdfler.length && !resimler.length) return;
      if (!pdfler.length) { devamEt('jpgpdf', resimler); return; }
      liste.innerHTML = '';
      baslik.textContent = pdfler.length > 1 ? pdfler.length + ' PDF ile ne yapmak istersiniz?' : '"' + pdfler[0].name + '" ile ne yapmak istersiniz?';
      const secenekler = pdfler.length > 1
        ? [['birlestir', 'PDF Birleştir']]
        : [['ayir', 'PDF Ayır'], ['duzenle', 'Sayfaları Düzenle'], ['dondur', 'Sayfa Döndür'], ['kirp', 'Sayfa Kırp'], ['sikistir', 'PDF Sıkıştır'], ['parola', 'PDF Parolası'], ['filigran', 'Filigran Ekle'], ['numara', 'Sayfa Numarası'], ['imza', 'İmza Ekle'], ['pdfjpg', 'PDF → JPG'], ['pdfmetin', 'PDF → Metin'], ['bilgi', 'Belge Bilgileri']];
      secenekler.forEach(([ad, metin]) => {
        const b = document.createElement('button');
        b.type = 'button'; b.textContent = metin;
        b.addEventListener('click', () => { kapat(); devamEt(ad, pdfler.length > 1 || ad === 'birlestir' ? pdfler : [pdfler[0]]); });
        liste.appendChild(b);
      });
      kutu.classList.remove('gizli');
      const ilk = $('button', liste);
      if (ilk) ilk.focus();
    });
  })();

  /* ---------- Açılış ---------- */
  hashDurum();
})();
