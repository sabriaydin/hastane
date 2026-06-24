const isLocal = localStorage.getItem("isLoggedIn") === "true";
const isSession = sessionStorage.getItem("isLoggedIn") === "true";

if (!isLocal && !isSession) {
  window.location.replace("index.html");
} else {
  // Sayfa yenilendiğinde otomatik çıkış kontrolü (Oturumu açık tut seçilmediyse)
  if (isSession && !isLocal) {
    const navs = performance.getEntriesByType("navigation");
    if (navs.length > 0 && navs[0].type === "reload") {
      localStorage.removeItem("isLoggedIn");
      sessionStorage.removeItem("isLoggedIn");
      sessionStorage.removeItem("sessionExpires");
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
      window.location.replace("index.html");
    }
  };

  checkTimeout();
  setInterval(checkTimeout, 1000);
}
