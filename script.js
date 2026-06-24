const DATA_FILE = "data.json";
const MAX_ATTEMPTS = 5;
const LOCKOUT_TIME_MS = 120000; 

let timerInterval;

// Bulunduğumuz sayfanın hangisi olduğunu kontrol et
const isLoginPage = window.location.pathname.endsWith("index.html") || window.location.pathname === "/";

window.onload = () => {
  if (isLoginPage) {
    checkLockoutStatus();
    if (!isLockedOut()) {
      checkIfAlreadyLoggedIn();
    }
  }
};

function checkIfAlreadyLoggedIn() {
  const isLocal = localStorage.getItem("isLoggedIn") === "true";
  const isSession = sessionStorage.getItem("isLoggedIn") === "true";
  
  if (isLocal || isSession) {
    // Zaten giriş yapılmışsa direkt anasayfaya at
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
    showMessage(`HATALI GİRİŞ! KALAN DENEME HAKKI: ${MAX_ATTEMPTS - attempts}`, "error");
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
      showMessage(`AĞ BAĞLANTISI KESİLDİ. ${minutes} DK ${seconds} SN BEKLEYİNİZ.`, "warning");
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
    showMessage("KULLANICI ADI VE PAROLA GİRİLMELİDİR.", "error");
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
      } else {
        sessionStorage.setItem("isLoggedIn", "true");
      }
      // BAŞARILI GİRİŞ: Ana sayfaya yönlendir!
      window.location.href = "anasayfa.html";
    } else {
      recordFailedAttempt();
    }
  } catch (error) {
    showMessage("SİSTEM VERİTABANI BAĞLANTISI BAŞARISIZ.", "error");
  }
}

function logout() {
  localStorage.removeItem("isLoggedIn");
  sessionStorage.removeItem("isLoggedIn");
  // ÇIKIŞ YAPILINCA: Login sayfasına geri fırlat!
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

// KAYNAK KODU ERİŞİMİNİ ZORLAŞTIRICI ÖNLEMLER
document.addEventListener('contextmenu', event => event.preventDefault()); // Sağ tık engeli

document.addEventListener('keydown', event => {
  // F12, Ctrl+Shift+I, Ctrl+U engeli
  if (
    event.keyCode === 123 || 
    (event.ctrlKey && event.shiftKey && event.keyCode === 73) || 
    (event.ctrlKey && event.keyCode === 85)
  ) {
    event.preventDefault();
  }
});

// --- DINAMIK PARÇALI YAPI (COMPONENT) YÜKLEME FONKSİYONLARI ---
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
