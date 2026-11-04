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
  const pic = l.logo
    ? `<img class="ico-img" src="${LOGO_DIR}${l.logo}" alt="" data-icon="${l.icon || "🔗"}" onerror="logoFail(this)">`
    : `<span class="ico">${l.icon || "🔗"}</span>`;
  return `<a class="card" href="${l.url}" title="${(l.desc || "").replace(/"/g, "&quot;")}"${ext} style="animation-delay:${(i * 0.025).toFixed(3)}s">
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
  tools: { title: "Araçlar",      items: TOOLS, empty: "Henüz araç eklenmedi." }
};
let lastFocus = null;

function openModal(key) {
  const m = MODALS[key];
  lastFocus = document.activeElement;
  $("modalTitle").textContent = m.title;
  $("modalGrid").innerHTML = m.items.length
    ? m.items.map(cardHTML).join("")
    : `<p class="empty">${m.empty}</p>`;
  $("modalGrid").scrollTop = 0;
  $("modal").classList.remove("hidden");
  document.body.classList.add("no-scroll");
  $("modalClose").focus();
}

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
