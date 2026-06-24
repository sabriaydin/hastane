// Sistem Sabitleri
const DATA_FILE = "data.json";
const MAX_ATTEMPTS = 5;
const LOCKOUT_TIME_MS = 120000; // 2 Dakika (Milisaniye cinsinden)

let timerInterval;

// Sayfa yüklendiğinde çalışacak başlangıç fonksiyonu
window.onload = () => {
  checkLockoutStatus();
  if (!isLockedOut()) {
    checkSession();
  }
};

// --- GÜVENLİK VE ZAMAN AŞIMI MANTIĞI ---

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
    showMessage(`Hatalı giriş! Kalan deneme hakkı: ${MAX_ATTEMPTS - attempts}`, "error");
  }
}

function applyLockoutUI(unlockTime) {
  disableInputs(true);
  
  // Eğer daha önce başlatılmış bir sayaç varsa temizle
  if (timerInterval) clearInterval(timerInterval);

  timerInterval = setInterval(() => {
    const timeRemaining = unlockTime - Date.now();
    
    if (timeRemaining <= 0) {
      clearLockout();
      showMessage("", ""); // Mesajı temizle
    } else {
      const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);
      showMessage(`Çok fazla hatalı deneme. Lütfen ${minutes} dk ${seconds} sn bekleyin.`, "warning");
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

// --- GİRİŞ VE OTURUM MANTIĞI ---

async function attemptLogin() {
  if (isLockedOut()) return;

  const inputUser = document.getElementById("username").value;
  const inputPass = document.getElementById("password").value;
  const rememberMe = document.getElementById("remember-me").checked;

  if (!inputUser || !inputPass) {
    showMessage("Lütfen kullanıcı adı ve parola giriniz.", "error");
    return;
  }

  try {
    const response = await fetch(DATA_FILE);
    if (!response.ok) throw new Error("Veri dosyası bulunamadı.");
    
    const data = await response.json();
    const encodedUser = btoa(inputUser);
    const encodedPass = btoa(inputPass);

    if (encodedUser === data.user && encodedPass === data.pass) {
      // Giriş başarılı, hata sayaçlarını sıfırla
      clearLockout(); 
      
      if (rememberMe) {
        localStorage.setItem("isLoggedIn", "true");
      } else {
        sessionStorage.setItem("isLoggedIn", "true");
      }
      
      showDashboard();
    } else {
      recordFailedAttempt();
    }
  } catch (error) {
    console.error(error);
    showMessage("Sistem bağlantı hatası.", "error");
  }
}

function checkSession() {
  const isLocal = localStorage.getItem("isLoggedIn") === "true";
  const isSession = sessionStorage.getItem("isLoggedIn") === "true";
  
  if (isLocal || isSession) {
    showDashboard();
  }
}

function logout() {
  localStorage.removeItem("isLoggedIn");
  sessionStorage.removeItem("isLoggedIn");
  
  document.getElementById("username").value = "";
  document.getElementById("password").value = "";
  document.getElementById("remember-me").checked = false;
  
  hideDashboard();
}

// --- ARAYÜZ YÖNETİMİ ---

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

function showDashboard() {
  document.getElementById("login-container").classList.add("hidden");
  document.getElementById("dashboard-container").classList.remove("hidden");
  showMessage("", ""); // Olası hata mesajlarını temizle
}

function hideDashboard() {
  document.getElementById("dashboard-container").classList.add("hidden");
  document.getElementById("login-container").classList.remove("hidden");
}
