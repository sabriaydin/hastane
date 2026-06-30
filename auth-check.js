const isLocal = localStorage.getItem("isLoggedIn") === "true";
const isSession = sessionStorage.getItem("isLoggedIn") === "true";

if (!isLocal && !isSession) {
  // DÜZELTME: Zaten index sayfasındaysak tekrar kendini yenilemesin
  if (!window.location.pathname.includes("index.html")) {
    window.location.replace("index.html");
  }
} else {
  // 10 Dakikalık süre ve yenileme kontrolü SADECE "Beni Hatırla" SEÇİLMEDİYSE çalışsın
  if (isSession && !isLocal) {
    
    // Sayfa yenilendiğinde otomatik çıkış kontrolü
    const navs = performance.getEntriesByType("navigation");
    if (navs.length > 0 && navs[0].type === "reload") {
      localStorage.removeItem("isLoggedIn");
      sessionStorage.removeItem("isLoggedIn");
      sessionStorage.removeItem("sessionExpires");
      // DÜZELTME: Zaten index.html sayfasında değilsek yönlendir
      if (!window.location.pathname.includes("index.html")) {
        window.location.replace("index.html");
      }
    }

    // 10 Dakikalık maksimum oturum süresi kontrolü
    let expires = sessionStorage.getItem("sessionExpires");
    if (!expires) {
      expires = Date.now() + 10 * 60 * 1000;
      sessionStorage.setItem("sessionExpires", expires);
    }

    const checkTimeout = () => {
      if (Date.now() > parseInt(expires)) {
        localStorage.removeItem("isLoggedIn");
        sessionStorage.removeItem("isLoggedIn");
        sessionStorage.removeItem("sessionExpires");
        // DÜZELTME: Zaten index.html sayfasında değilsek yönlendir
        if (!window.location.pathname.includes("index.html")) {
          window.location.replace("index.html");
        }
      }
    };

    checkTimeout();
    setInterval(checkTimeout, 1000);
  }
}
