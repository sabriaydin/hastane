/* Güvenli yönlendirme: yalnızca http/https adreslerine, kullanıcıya gösterilerek yönlendirir.
   Listelerde (LINKS, TOOLS, PROGRAMS) birebir bulunan adresler 3 saniye sonra otomatik açılır;
   listede olmayan adresler uyarı ile gösterilir ve yalnızca kullanıcı onaylarsa açılır. */
(function () {
  "use strict";
  var SURE = 3;
  var $ = function (id) { return document.getElementById(id); };

  function hata(baslik, mesaj) {
    $("kutu").classList.add("hata");
    $("baslik").textContent = baslik;
    $("mesaj").textContent = mesaj;
    $("dugmeler").hidden = false;
    $("devam").hidden = true;
  }

  function geriDon() {
    if (history.length > 1) history.back(); else location.href = "index.html";
  }
  $("geri").addEventListener("click", geriDon);

  var ham = new URLSearchParams(location.search).get("git");
  if (!ham) return hata("Adres bulunamadı", "Yönlendirilecek bir bağlantı belirtilmemiş.");

  var hedef;
  try { hedef = new URL(ham); } catch (e) { return hata("Geçersiz adres", "Bağlantı adresi okunamadı."); }
  if (hedef.protocol !== "https:" && hedef.protocol !== "http:")
    return hata("Bağlantı engellendi", "Yalnızca http ve https adreslerine yönlendirme yapılır.");
  if (hedef.username || hedef.password)
    return hata("Bağlantı engellendi", "Kullanıcı bilgisi içeren adreslere yönlendirme yapılmaz.");

  var sade = function (u) { try { return new URL(u).href; } catch (e) { return ""; } };
  var bilinen = [].concat(
    typeof LINKS !== "undefined" ? LINKS : [],
    typeof TOOLS !== "undefined" ? TOOLS : [],
    typeof PROGRAMS !== "undefined" ? PROGRAMS : [],
    typeof DOCS !== "undefined" ? DOCS : [],
    typeof FAQ !== "undefined" ? FAQ : []
  ).some(function (l) { return /^https?:/i.test(l.url || "") && sade(l.url) === hedef.href; });

  $("alanAdi").textContent = hedef.hostname;
  $("tamAdres").textContent = hedef.href;
  $("adresKutu").hidden = false;
  $("devam").href = hedef.href;
  $("dugmeler").hidden = false;
  document.title = hedef.hostname + " | Hastane360";

  function git() { location.replace(hedef.href); }
  $("devam").addEventListener("click", function (e) { e.preventDefault(); git(); });

  if (!bilinen) {
    $("baslik").textContent = "Dikkat: listede olmayan adres";
    $("mesaj").textContent = "Bu bağlantı Hastane360 dışındaki bir siteye gidiyor.";
    $("uyariKutu").hidden = false;
    return;
  }

  $("baslik").textContent = "Dış bağlantıya yönlendiriliyorsunuz";
  $("mesaj").textContent = "Hastane360 dışındaki bir siteye geçiyorsunuz.";
  $("sayacKutu").hidden = false;
  var kalan = SURE, halka = $("ilerle"), TOPLAM = 100.5;
  $("saniye").textContent = kalan;
  var zaman = setInterval(function () {
    kalan--;
    $("saniye").textContent = Math.max(kalan, 0);
    halka.style.strokeDashoffset = String(TOPLAM * (1 - kalan / SURE));
    if (kalan <= 0) { clearInterval(zaman); git(); }
  }, 1000);
  /* Sekme arka plandayken sayaç duraklayabilir; kullanıcı düğmeyle de devam edebilir. */
  $("geri").addEventListener("click", function () { clearInterval(zaman); });
})();
