const DATA_FILE = "data.json";
const MAX_ATTEMPTS = 5;
const LOCKOUT_TIME_MS = 120000; 
const SESSION_TIME_MS = 600000; // 10 dakika (10 * 60 * 1000 milisaniye)

let timerInterval;
let sessionInterval; // Oturum süresini kontrol etmek için yeni zamanlayıcı

const isLoginPage = window.location.pathname.endsWith("index.html") || window.location.pathname === "/";

window.onload = () => {
  if (isLoginPage) {
    checkLockoutStatus();
    if (!isLockedOut()) {
      checkIfAlreadyLoggedIn();
    }
  } else {
    // Giriş sayfasında değilsek (örn: anasayfa), oturum süresini kontrol et
    checkSessionActive();
    sessionInterval = setInterval(checkSessionActive, 1000); // Her saniye sürenin dolup dolmadığına bakar
  }
};

function checkSessionActive() {
  const isLocal = localStorage.getItem("isLoggedIn") === "true";
  if (isLocal) return; // "Beni Hatırla" seçildiyse süre sınırı yok, kontrolden çık

  const isSession = sessionStorage.getItem("isLoggedIn") === "true";
  const expireTime = sessionStorage.getItem("sessionExpireTime");

  if (isSession && expireTime) {
    if (Date.now() > parseInt(expireTime)) {
      logout(); // 10 dakika dolduysa otomatik çıkış yap
    }
  } else if (!isLocal && !isSession) {
    logout(); // Hiç giriş yapılmamışsa güvenlik için çıkışa yönlendir
  }
}

function checkIfAlreadyLoggedIn() {
  const isLocal = localStorage.getItem("isLoggedIn") === "true";
  const isSession = sessionStorage.getItem("isLoggedIn") === "true";
  const expireTime = sessionStorage.getItem("sessionExpireTime");
  
  // Eğer giriş sayfasındayken 10 dakikalık süre çoktan dolmuşsa eski kayıtları temizle
  if (isSession && expireTime && Date.now() > parseInt(expireTime)) {
    sessionStorage.removeItem("isLoggedIn");
    sessionStorage.removeItem("sessionExpireTime");
    return; // Giriş sayfasında kalmaya devam et
  }

  if (isLocal || isSession) {
    window.location.href = "anasayfa.html";
  }
}

function checkLockoutStatus() {
  const lockoutUntil = localStorage.getItem("lockoutUntil");
  if (lockoutUntil) {
    const timeRemaining = parseInt(lockoutUntil) - Date.now();
    if (timeRemaining > 0) {
      applyLockoutUI(lockoutUntil);
    } else {
      clearLockout();
    }
  }
}

function isLockedOut() {
  const lockoutUntil = localStorage.getItem("lockoutUntil");
  return lockoutUntil && parseInt(lockoutUntil) > Date.now();
}

function recordFailedAttempt() {
  let attempts = parseInt(localStorage.getItem("failedAttempts") || "0");
  attempts += 1;
  localStorage.setItem("failedAttempts", attempts);

  if (attempts >= MAX_ATTEMPTS) {
    const unlockTime = Date.now() + LOCKOUT_TIME_MS;
    localStorage.setItem("lockoutUntil", unlockTime);
    applyLockoutUI(unlockTime);
  } else {
    showMessage(`Hatalı giriş! Kalan Deneme Hakkı: ${MAX_ATTEMPTS - attempts}`, "error");
  }
}

function applyLockoutUI(unlockTime) {
  disableInputs(true);
  if (timerInterval) clearInterval(timerInterval);

  timerInterval = setInterval(() => {
    const timeRemaining = unlockTime - Date.now();
    if (timeRemaining <= 0) {
      clearLockout();
      showMessage("", ""); 
    } else {
      const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);
      showMessage(`Çok fazla hatalı deneme! ${minutes} Dk. ${seconds} Sn. bekleyiniz.`, "warning");
    }
  }, 1000);
}

function clearLockout() {
  if (timerInterval) clearInterval(timerInterval);
  localStorage.removeItem("lockoutUntil");
  localStorage.setItem("failedAttempts", "0");
  disableInputs(false);
}

function disableInputs(state) {
  document.getElementById("username").disabled = state;
  document.getElementById("password").disabled = state;
  document.getElementById("login-btn").disabled = state;
  document.getElementById("remember-me").disabled = state;
}

async function attemptLogin() {
  if (isLockedOut()) return;

  const inputUser = document.getElementById("username").value;
  const inputPass = document.getElementById("password").value;
  const rememberMe = document.getElementById("remember-me").checked;

  if (!inputUser || !inputPass) {
    showMessage("Lütfen kullanıcı adı ve parolayı giriniz.", "error");
    return;
  }

  try {
    const response = await fetch(DATA_FILE);
    if (!response.ok) throw new Error("Veri okunamadı.");
    
    const data = await response.json();
    const encodedUser = btoa(inputUser);
    const encodedPass = btoa(inputPass);

    if (encodedUser === data.user && encodedPass === data.pass) {
      clearLockout(); 
      if (rememberMe) {
        localStorage.setItem("isLoggedIn", "true");
        sessionStorage.removeItem("sessionExpireTime"); // Eğer önceden kalma süre varsa temizle
      } else {
        sessionStorage.setItem("isLoggedIn", "true");
        sessionStorage.setItem("sessionExpireTime", Date.now() + SESSION_TIME_MS); // 10 dakikalık süreyi başlat
      }
      window.location.href = "anasayfa.html";
    } else {
      recordFailedAttempt();
    }
  } catch (error) {
    showMessage("Bağlantı başarısız!", "error");
  }
}

function logout() {
  localStorage.removeItem("isLoggedIn");
  sessionStorage.removeItem("isLoggedIn");
  sessionStorage.removeItem("sessionExpireTime"); // Çıkışta süre kaydını da tamamen temizle
  window.location.href = "index.html";
}

function showMessage(text, type) {
  const msgBox = document.getElementById("message-box");
  if (!text) {
    msgBox.className = "message hidden";
    msgBox.innerText = "";
    return;
  }
  msgBox.innerText = text;
  msgBox.className = `message ${type}`;
}

async function loadComponent(elementId, filePath) {
  try {
    const response = await fetch(filePath);
    if (response.ok) {
      const text = await response.text();
      const element = document.getElementById(elementId);
      if (element) element.innerHTML = text;
    }
  } catch (error) {
    console.error(filePath + " yüklenirken hata oluştu.");
  }
}

function loadAllComponents() {
  loadComponent("header-placeholder", "header.html");
  loadComponent("footer-placeholder", "footer.html");
}

document.addEventListener("DOMContentLoaded", () => {
  loadAllComponents();
});

// KAYNAK KODU KORUMALARI
document.addEventListener('contextmenu', event => event.preventDefault());

document.addEventListener('keydown', event => {
  if (
    event.keyCode === 123 || event.key === 'F12' || 
    (event.ctrlKey && event.shiftKey && (event.keyCode === 73 || event.keyCode === 74 || event.key === 'I' || event.key === 'i' || event.key === 'J' || event.key === 'j')) || 
    (event.ctrlKey && (event.keyCode === 85 || event.key === 'U' || event.key === 'u')) ||
    (event.metaKey && event.altKey && (event.keyCode === 73 || event.keyCode === 74 || event.key === 'I' || event.key === 'i' || event.key === 'J' || event.key === 'j')) ||
    (event.metaKey && (event.keyCode === 85 || event.key === 'U' || event.key === 'u'))
  ) {
    event.preventDefault();
  }
});
