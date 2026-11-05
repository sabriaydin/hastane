/* Portal mantığı — bağlantı ve araç verileri data.js dosyasındadır. */

const $ = (id) => document.getElementById(id);

/* Logo yüklenemezse simge gösterilir */
function logoFail(img) {
  const s = document.createElement("span");
  s.className = "ico";
  s.textContent = img.dataset.icon;
  img.replaceWith(s);
}

function cardHTML(l, i) {
  const ext = l.url.startsWith("http") ? ' target="_blank" rel="noopener"' : "";
  const dl = l.download ? ` download="${l.download.replace(/"/g, "&quot;")}"` : "";
  const pic = l.logo
    ? `<img class="ico-img" src="${LOGO_DIR}${l.logo}" alt="" data-icon="${l.icon || "🔗"}" onerror="logoFail(this)">`
    : `<span class="ico">${l.icon || "🔗"}</span>`;
  return `<a class="card" href="${l.url}" title="${(l.desc || "").replace(/"/g, "&quot;")}"${ext}${dl} style="animation-delay:${(i * 0.025).toFixed(3)}s">
            ${pic}
            <strong>${l.title}</strong>
            <small>${l.desc || ""}</small>
          </a>`;
}

/* Giriş animasyonu bitene kadar düğmeler pasif kalır */
const intro = $("intro");
const readyTimer = setTimeout(() => intro.classList.add("ready"), 3000);

/* Herhangi bir tuşa veya ekrana basılınca animasyon hızlıca geçilir */
function skipIntro() {
  if (intro.classList.contains("ready")) return;
  clearTimeout(readyTimer);
  intro.classList.add("skip", "ready");
}
document.addEventListener("keydown", skipIntro);
intro.addEventListener("pointerdown", skipIntro);

/* ---------- AÇILIR PENCERE ---------- */
const MODALS = {
  quick: { title: "Hızlı Erişim", items: LINKS, empty: "Henüz bağlantı eklenmedi." },
  tools: { title: "Araçlar",      items: TOOLS, empty: "Henüz araç eklenmedi." },
  programs: { title: "Programlar", items: PROGRAMS, empty: "Henüz program eklenmedi." },
  docs:  { title: "Belgeler",     items: DOCS,  empty: "Henüz belge eklenmedi." },
  faq:   { title: "Sık Sorulan Sorular", items: FAQ, empty: "Henüz soru eklenmedi." }
};
let lastFocus = null;

/* ---------- BELGELER (sütun liste + PDF / Word / Excel kategorileri) ---------- */
const BELGE_TURLERI = [
  { id: "pdf",   ad: "PDF",   kisa: "PDF" },
  { id: "word",  ad: "Word",  kisa: "DOC" },
  { id: "excel", ad: "Excel", kisa: "XLS" }
];
let belgeFiltre = "all";

function belgeTuru(l) {
  const ad = (l.download || l.url || "").toLowerCase().split("?")[0];
  if (/\.pdf$/.test(ad)) return "pdf";
  if (/\.docx?$/.test(ad) || /\.rtf$/.test(ad)) return "word";
  if (/\.(xlsx?|xlsm|csv)$/.test(ad)) return "excel";
  return "diger";
}

function belgeSatiri(l) {
  const tur = belgeTuru(l);
  const kisa = (BELGE_TURLERI.find(t => t.id === tur) || { kisa: "DOSYA" }).kisa;
  const boyut = (l.desc || "").replace(/^(PDF|Word|Excel)\s*·\s*/i, "");
  const dl = l.download ? ` download="${l.download.replace(/"/g, "&quot;")}"` : "";
  return `<a class="belge" href="${l.url}"${dl}>
            <span class="belge-tur ${tur}">${kisa}</span>
            <span class="belge-ad"><b>${l.title}</b>${boyut ? `<small>${boyut}</small>` : ""}</span>
            <span class="belge-indir"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11"/><path d="m7 11 5 5 5-5"/><path d="M5 20h14"/></svg>İndir</span>
          </a>`;
}

function belgelerHTML(items, bos) {
  if (!items.length) return `<p class="empty">${bos}</p>`;
  const say = (id) => items.filter(l => belgeTuru(l) === id).length;
  const sekme = (id, ad, n) =>
    `<button type="button" class="belge-sekme${belgeFiltre === id ? " aktif" : ""}" data-belge-filtre="${id}" aria-pressed="${belgeFiltre === id}"${n ? "" : " disabled"}>${ad}<i>${n}</i></button>`;
  let html = `<div class="belge-sekmeler" role="group" aria-label="Belge türü">`
    + sekme("all", "Tümü", items.length)
    + BELGE_TURLERI.map(t => sekme(t.id, t.ad, say(t.id))).join("")
    + `</div>`;
  const turler = [...BELGE_TURLERI.map(t => t.id), "diger"].filter(id => belgeFiltre === "all" || belgeFiltre === id);
  turler.forEach(id => {
    const grup = items.filter(l => belgeTuru(l) === id);
    if (!grup.length) return;
    const ad = id === "diger" ? "Diğer Belgeler" : BELGE_TURLERI.find(t => t.id === id).ad + " Belgeleri";
    html += `<section class="belge-grup"><h3>${ad}<i>${grup.length}</i></h3>${grup.map(belgeSatiri).join("")}</section>`;
  });
  return html;
}

let acikModal = null;

function openModal(key) {
  const m = MODALS[key];
  acikModal = key;
  lastFocus = document.activeElement;
  $("modalTitle").textContent = m.title;
  const belge = key === "docs";
  document.querySelector(".modal-box").classList.toggle("dar", belge);
  $("modalGrid").classList.toggle("link-grid", !belge);
  $("modalGrid").classList.toggle("belge-liste", belge);
  if (belge) belgeFiltre = "all";
  $("modalGrid").innerHTML = belge
    ? belgelerHTML(m.items, m.empty)
    : m.items.length
      ? m.items.map(cardHTML).join("")
      : `<p class="empty">${m.empty}</p>`;
  $("modalGrid").scrollTop = 0;
  $("modal").classList.remove("hidden");
  document.body.classList.add("no-scroll");
  $("modalClose").focus();
}

$("modalGrid").addEventListener("click", (e) => {
  const b = e.target.closest("[data-belge-filtre]");
  if (!b || b.disabled) return;
  belgeFiltre = b.dataset.belgeFiltre;
  $("modalGrid").innerHTML = belgelerHTML(MODALS.docs.items, MODALS.docs.empty);
  const yeni = $("modalGrid").querySelector(`[data-belge-filtre="${belgeFiltre}"]`);
  if (yeni) yeni.focus();
});

function closeModal() {
  $("modal").classList.add("hidden");
  document.body.classList.remove("no-scroll");
  if (lastFocus) lastFocus.focus();
}

document.querySelectorAll("[data-modal]").forEach(b =>
  b.addEventListener("click", () => openModal(b.dataset.modal)));
$("modalClose").addEventListener("click", closeModal);
$("modal").addEventListener("click", (e) => { if (e.target === $("modal")) closeModal(); });
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !$("modal").classList.contains("hidden")) closeModal();
});


/* Ana sayfa arama kutusu: boş aramayı engeller, metni Google'da yeni sekmede aratır */
(function () {
  const form = $("aramaForm"), kutu = $("aramaKutu");
  if (!form || !kutu) return;
  form.addEventListener("submit", (e) => {
    if (!kutu.value.trim()) { e.preventDefault(); kutu.focus(); return; }
    kutu.value = kutu.value.trim();
  });
})();

(function () { const y = $("yilIntro"); if (y) y.textContent = new Date().getFullYear(); })();
