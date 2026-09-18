// ============================================================
//  login2.js — تسجيل الدخول / التسجيل مع نظام الجلسات
// ============================================================
import { initializeApp }    from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
    getDatabase, ref, set, get, child, push, remove,
    query, orderByChild, equalTo
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import emailjs from "https://cdn.jsdelivr.net/npm/@emailjs/browser@4/+esm";

const firebaseConfig = {
    apiKey:            "AIzaSyCCk0w_KHVCswjp16TSkNToRSSOjlPC5kE",
    authDomain:        "data-customer-d722f.firebaseapp.com",
    databaseURL:       "https://data-customer-d722f-default-rtdb.firebaseio.com/",
    projectId:         "data-customer-d722f",
    storageBucket:     "data-customer-d722f.firebasestorage.app",
    messagingSenderId: "398522341614",
    appId:             "1:398522341614:web:99e0f897c61ec960cffbff"
};

const app = initializeApp(firebaseConfig);
const db  = getDatabase(app);

// ============================================================
//  Helpers
// ============================================================
function emailKey(e)    { return e.replace(/\./g, "_").replace(/@/g, "__"); }
function generateOTP()  { return Math.floor(100000 + Math.random() * 900000).toString(); }
function generateSID()  { return Date.now().toString(36) + Math.random().toString(36).substring(2, 10); }

function getDeviceInfo() {
    const ua = navigator.userAgent;
    let device = "جهاز غير معروف", icon = "💻";
    if (/iPhone/.test(ua))       { device = "iPhone";        icon = "📱"; }
    else if (/iPad/.test(ua))    { device = "iPad";           icon = "📱"; }
    else if (/Android/.test(ua) && /Mobile/.test(ua)) { device = "Android موبايل"; icon = "📱"; }
    else if (/Android/.test(ua)) { device = "Android تابلت"; icon = "📱"; }
    else if (/Mac/.test(ua))     { device = "Mac";            icon = "💻"; }
    else if (/Windows/.test(ua)) { device = "Windows PC";    icon = "🖥️"; }
    else if (/Linux/.test(ua))   { device = "Linux";          icon = "🖥️"; }
    let browser = "متصفح";
    if (/Chrome/.test(ua) && !/Edg/.test(ua)) browser = "Chrome";
    else if (/Firefox/.test(ua)) browser = "Firefox";
    else if (/Safari/.test(ua))  browser = "Safari";
    else if (/Edg/.test(ua))     browser = "Edge";
    else if (/Opera|OPR/.test(ua)) browser = "Opera";
    return { device, browser, icon };
}

function showToast(msg, type = "info") {
    const t = document.getElementById("toast");
    if (!t) return;
    t.textContent = msg;
    t.className   = "toast " + type + " show";
    setTimeout(() => t.classList.remove("show"), 3500);
}

function setLoadingBtn(btn) {
    btn.disabled  = true;
    btn.innerHTML = '<span class="loading-dots"><span></span><span></span><span></span></span>';
}
function resetBtn(btn, text) {
    btn.disabled  = false;
    btn.innerHTML = `<span class="btn-text">${text}</span><span class="btn-arrow">←</span>`;
}

async function saveOTPtoDB(email, otp) {
    await set(ref(db, "otpCodes/" + emailKey(email)), {
        otp,
        expiresAt: Date.now() + 2 * 60 * 1000
    });

    try {
        const result = await emailjs.send(
            "service_s93hjpq",
            "template_4vekbsn",
            {
                email: email,
                to_email: email,
                otp_code: otp,
                time: new Date(Date.now() + 2 * 60 * 1000).toLocaleTimeString("ar-EG")
            },
            "2DNIXY2CFBGlfT7pk"
        );
        console.log("📧 نتيجة إرسال EmailJS:", result.status, result.text);
    } catch (emailErr) {
        console.error("🚫 فشل إرسال EmailJS:", emailErr);
        throw emailErr;
    }
}

function startCountdown(expiryTime, displayId, timerElId, timerRef) {
    clearInterval(timerRef.val);
    const display = document.getElementById(displayId);
    const timerEl = document.getElementById(timerElId);
    if (timerEl) timerEl.style.color = "";
    timerRef.val = setInterval(() => {
        const rem  = Math.max(0, expiryTime - Date.now());
        const mins = String(Math.floor(rem / 60000)).padStart(2, "0");
        const secs = String(Math.floor((rem % 60000) / 1000)).padStart(2, "0");
        if (display) display.textContent = `${mins}:${secs}`;
        if (rem <= 0) {
            clearInterval(timerRef.val);
            if (display) display.textContent = "00:00";
            if (timerEl) timerEl.style.color = "var(--error)";
        }
    }, 500);
}

// ============================================================
//  إنشاء الجلسة في Firebase
// ============================================================
async function createSession(email, userData) {
    const sessionId = generateSID();
    const eKey      = emailKey(email);
    const { device, browser, icon } = getDeviceInfo();

    await set(ref(db, `sessions/${eKey}/${sessionId}`), {
        sessionId,
        email,
        device,
        browser,
        icon,
        loginAt:   new Date().toISOString(),
        lastSeen:  Date.now(),
        isActive:  true,
        userAgent: navigator.userAgent.substring(0, 150)
    });

    localStorage.setItem("kashmirSessionId",    sessionId);
    localStorage.setItem("kashmirSessionEmail", email);
    localStorage.setItem("kashmirUser",         JSON.stringify(userData));

    return sessionId;
}

async function isEmailRegistered(email) {
    const snap = await get(query(ref(db, "users"), orderByChild("email"), equalTo(email)));
    return snap.exists();
}
async function isPhoneRegistered(phone) {
    const snap = await get(query(ref(db, "users"), orderByChild("phone"), equalTo(phone)));
    return snap.exists();
}
async function getUserByEmail(email) {
    const snap = await get(query(ref(db, "users"), orderByChild("email"), equalTo(email)));
    if (!snap.exists()) return null;
    let user = null;
    snap.forEach(c => { user = { ...c.val(), _key: c.key }; });
    return user;
}

// ============================================================
//  Tab Switching
// ============================================================
window.switchTab = function(tab) {
    document.getElementById("panel-login")?.classList.toggle("hidden",    tab !== "login");
    document.getElementById("panel-register")?.classList.toggle("hidden", tab !== "register");
    document.getElementById("tab-login")?.classList.toggle("active",      tab === "login");
    document.getElementById("tab-register")?.classList.toggle("active",   tab === "register");
};

// ============================================================
//  OTP Box Navigation
// ============================================================
window.moveOTP = function(input, index) {
    input.value = input.value.replace(/\D/g, "");
    const boxes = document.querySelectorAll("#panel-login .otp-input");
    if (input.value) { input.classList.add("filled"); if (index < 5) boxes[index + 1].focus(); }
    else input.classList.remove("filled");
};
window.moveRegOTP = function(input, index) {
    input.value = input.value.replace(/\D/g, "");
    const boxes = document.querySelectorAll("#reg-otp-boxes .otp-input");
    if (input.value) { input.classList.add("filled"); if (index < 5) boxes[index + 1].focus(); }
    else input.classList.remove("filled");
};
document.addEventListener("keydown", (e) => {
    if (e.key !== "Backspace") return;
    const all = [...document.querySelectorAll(".otp-input")];
    const idx = all.indexOf(document.activeElement);
    if (idx > 0 && !all[idx].value) {
        all[idx - 1].value = ""; all[idx - 1].classList.remove("filled"); all[idx - 1].focus();
    }
});

// ============================================================
//  Register Step Indicator
// ============================================================
function setRegStep(n) {
    [1, 2, 3].forEach(i => {
        const dot = document.getElementById("reg-dot" + i);
        if (!dot) return;
        dot.classList.remove("active", "done");
        if (i < n)        { dot.classList.add("done"); dot.innerHTML = "✓"; }
        else if (i === n) { dot.classList.add("active"); dot.textContent = i; }
        else                dot.textContent = i;
    });
    [1, 2].forEach(i => {
        const line = document.getElementById("reg-line" + i);
        if (line) line.classList.toggle("done", i < n);
    });
}

// ============================================================
//  LOGIN FLOW
// ============================================================
let loginOTP = "", loginExpiry = 0, loginEmail = "";
const loginTimerRef = { val: null };

window.sendOTP = async function() {
    const emailInput = document.getElementById("login-email");
    const email = emailInput?.value.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showToast("❌ أدخل بريداً إلكترونياً صحيحاً", "error");
        emailInput?.focus(); return;
    }

    const btn = document.querySelector("#login-step1 .btn-primary");
    setLoadingBtn(btn);

    try {
        const exists = await isEmailRegistered(email);
        if (!exists) {
            showToast("❌ هذا البريد غير مسجل — أنشئ حساباً أولاً", "error");
            resetBtn(btn, "إرسال رمز التحقق");
            emailInput?.focus(); return;
        }

        loginOTP    = generateOTP();
        loginExpiry = Date.now() + 2 * 60 * 1000;
        loginEmail  = email;

        await saveOTPtoDB(email, loginOTP);
        document.getElementById("login-step1")?.classList.add("hidden");
        document.getElementById("login-step2")?.classList.remove("hidden");
        const dispEl = document.getElementById("display-email");
        if (dispEl) dispEl.textContent = email;
        startCountdown(loginExpiry, "countdown", "otp-timer", loginTimerRef);
        document.querySelector("#login-step2 .otp-input")?.focus();
        showToast("✅ تم إرسال الرمز على بريدك", "success");
    } catch (err) {
        showToast("❌ خطأ في الإرسال: " + err.message, "error");
        resetBtn(btn, "إرسال رمز التحقق");
    }
};

window.verifyOTP = async function() {
    const boxes   = document.querySelectorAll("#panel-login .otp-input");
    const entered = [...boxes].map(b => b.value).join("");
    if (entered.length < 6) { showToast("❌ أكمل الرمز المكون من 6 أرقام", "error"); return; }
    if (Date.now() > loginExpiry) { showToast("⏰ انتهت صلاحية الرمز", "error"); return; }

    const snap = await get(child(ref(db), "otpCodes/" + emailKey(loginEmail)));
    if (!snap.exists() || snap.val().otp !== entered || Date.now() > snap.val().expiresAt) {
        showToast("❌ الرمز غير صحيح أو منتهي الصلاحية", "error");
        boxes.forEach(b => { b.style.borderColor = "var(--error)"; });
        setTimeout(() => boxes.forEach(b => { b.style.borderColor = ""; }), 1000);
        return;
    }

    clearInterval(loginTimerRef.val);
    await set(ref(db, "otpCodes/" + emailKey(loginEmail)), null);

    const userData = await getUserByEmail(loginEmail);
    if (!userData) { showToast("❌ لم يُعثر على بيانات الحساب", "error"); return; }

    await createSession(loginEmail, userData);

    document.getElementById("login-step2")?.classList.add("hidden");
    document.getElementById("login-step3")?.classList.remove("hidden");
    showToast("🎉 أهلاً بك " + (userData.firstName || "") + "!", "success");

    setTimeout(() => {
        closeModal();
        applyLoggedInUI(userData);
    }, 1800);
};

window.resendOTP = async function() {
    loginOTP    = generateOTP();
    loginExpiry = Date.now() + 2 * 60 * 1000;
    document.querySelectorAll("#panel-login .otp-input").forEach(b => {
        b.value = ""; b.classList.remove("filled");
    });
    startCountdown(loginExpiry, "countdown", "otp-timer", loginTimerRef);
    await saveOTPtoDB(loginEmail, loginOTP);
    showToast("📨 تم إعادة الإرسال", "info");
};

// ============================================================
//  REGISTER FLOW
// ============================================================
let regOTP = "", regExpiry = 0, regEmail = "";
const regTimerRef = { val: null };

window.sendRegOTP = async function() {
    const emailInput = document.getElementById("reg-email");
    const email = emailInput?.value.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showToast("❌ أدخل بريداً إلكترونياً صحيحاً", "error");
        emailInput?.focus(); return;
    }

    const btn = document.querySelector("#register-step1 .btn-primary");
    setLoadingBtn(btn);

    try {
        const emailExists = await isEmailRegistered(email);
        if (emailExists) {
            showToast("❌ هذا البريد مسجل بالفعل — سجّل الدخول", "error");
            resetBtn(btn, "إرسال رمز التحقق");
            emailInput?.focus(); return;
        }

        regOTP    = generateOTP();
        regExpiry = Date.now() + 2 * 60 * 1000;
        regEmail  = email;

        await saveOTPtoDB(email, regOTP);
        document.getElementById("register-step1")?.classList.add("hidden");
        document.getElementById("register-step2")?.classList.remove("hidden");
        const dispEl = document.getElementById("reg-display-email");
        if (dispEl) dispEl.textContent = email;
        setRegStep(2);
        startCountdown(regExpiry, "reg-countdown", "reg-otp-timer", regTimerRef);
        document.querySelector("#reg-otp-boxes .otp-input")?.focus();
        showToast("✅ تم إرسال الرمز على بريدك", "success");
    } catch (err) {
        showToast("❌ خطأ في الإرسال: " + err.message, "error");
        resetBtn(btn, "إرسال رمز التحقق");
    }
};

window.verifyRegOTP = async function() {
    const boxes   = document.querySelectorAll("#reg-otp-boxes .otp-input");
    const entered = [...boxes].map(b => b.value).join("");
    if (entered.length < 6) { showToast("❌ أكمل الرمز المكون من 6 أرقام", "error"); return; }
    if (Date.now() > regExpiry) { showToast("⏰ انتهت صلاحية الرمز — أعد الإرسال", "error"); return; }

    const snap = await get(child(ref(db), "otpCodes/" + emailKey(regEmail)));
    if (!snap.exists() || snap.val().otp !== entered || Date.now() > snap.val().expiresAt) {
        showToast("❌ الرمز غير صحيح أو منتهي الصلاحية", "error");
        boxes.forEach(b => { b.style.borderColor = "var(--error)"; });
        setTimeout(() => boxes.forEach(b => { b.style.borderColor = ""; }), 1000);
        return;
    }

    clearInterval(regTimerRef.val);
    await set(ref(db, "otpCodes/" + emailKey(regEmail)), null);
    document.getElementById("register-step2")?.classList.add("hidden");
    document.getElementById("register-step3")?.classList.remove("hidden");
    setRegStep(3);
    showToast("✅ تم التحقق — أكمل بياناتك", "success");
};

window.resendRegOTP = async function() {
    regOTP    = generateOTP();
    regExpiry = Date.now() + 2 * 60 * 1000;
    document.querySelectorAll("#reg-otp-boxes .otp-input").forEach(b => {
        b.value = ""; b.classList.remove("filled");
    });
    startCountdown(regExpiry, "reg-countdown", "reg-otp-timer", regTimerRef);
    await saveOTPtoDB(regEmail, regOTP);
    showToast("📨 تم إعادة الإرسال", "info");
};

window.registerUser = async function() {
    const firstName = document.getElementById("reg-firstname")?.value.trim();
    const lastName  = document.getElementById("reg-lastname")?.value.trim();
    const phone     = document.getElementById("reg-phone")?.value.trim();

    if (!firstName || !lastName || !phone) {
        showToast("❌ الرجاء ملء جميع الحقول", "error"); return;
    }

    const btn = document.querySelector("#register-step3 .btn-primary");
    setLoadingBtn(btn);

    try {
        const phoneExists = await isPhoneRegistered(phone);
        if (phoneExists) {
            showToast("❌ رقم الهاتف مسجل بالفعل، استخدم رقماً آخر", "error");
            resetBtn(btn, "إنشاء الحساب");
            document.getElementById("reg-phone")?.focus(); return;
        }

        const userData = { firstName, lastName, phone, email: regEmail };

        await push(ref(db, "users"), {
            ...userData,
            registeredAt: new Date().toISOString()
        });

        await createSession(regEmail, userData);

        showToast("🎉 تم التسجيل بنجاح!", "success");
        setTimeout(() => {
            closeModal();
            applyLoggedInUI(userData);
        }, 2000);
    } catch (err) {
        showToast("❌ " + err.message, "error");
        resetBtn(btn, "إنشاء الحساب");
    }
};

window.resetRegister = function() {
    ["reg-email", "reg-firstname", "reg-lastname", "reg-phone"]
        .forEach(id => { const el = document.getElementById(id); if (el) el.value = ""; });
    ["register-step2", "register-step3", "register-step4"]
        .forEach(id => document.getElementById(id)?.classList.add("hidden"));
    document.getElementById("register-step1")?.classList.remove("hidden");
    setRegStep(1);
};

// ============================================================
//  UI بعد تسجيل الدخول / التسجيل
// ============================================================
function applyLoggedInUI(userData) {
    const registerSection = document.getElementById("registerSection");
    const welcomeSection  = document.getElementById("welcomeSection");
    const userNameEl      = document.getElementById("userName");

    const welcomeSection1  = document.getElementById("welcomeSection1");
    const registerSection1  = document.getElementById("registerSection1");
    const userNameEl1      = document.getElementById("userName1");

    if (registerSection) registerSection.style.display = "none";
    if (welcomeSection)  welcomeSection.style.display  = "flex";
      if (registerSection1) registerSection1.style.display = "none";
    if (welcomeSection1)  welcomeSection1.style.display  = "flex";
    if (userNameEl)      userNameEl.textContent         = userData.firstName || "";
        if (userNameEl1)      userNameEl1.textContent         =  userData.firstName || "";

}

// ============================================================
//  فحص الجلسة عند تحميل الصفحة
// ============================================================
(async function checkSavedSession() {
    const sessionId = localStorage.getItem("kashmirSessionId");
    const email     = localStorage.getItem("kashmirSessionEmail");
    if (!sessionId || !email) return;

    try {
        const snap = await get(ref(db, `sessions/${emailKey(email)}/${sessionId}`));
        if (!snap.exists() || !snap.val().isActive) {
            localStorage.removeItem("kashmirSessionId");
            localStorage.removeItem("kashmirSessionEmail");
            localStorage.removeItem("kashmirUser");
            return;
        }
        await set(ref(db, `sessions/${emailKey(email)}/${sessionId}/lastSeen`), Date.now());

        const saved = localStorage.getItem("kashmirUser");
        if (saved) {
            const userData = JSON.parse(saved);
            if (document.readyState === "loading") {
                document.addEventListener("DOMContentLoaded", () => applyLoggedInUI(userData));
            } else {
                applyLoggedInUI(userData);
            }
        }
    } catch (e) {
        console.error("session check error:", e);
    }
})();

// ============================================================
//  Modal Open / Close
// ============================================================
window.openModal = function() {
    document.querySelector(".modal-overlay")?.classList.add("open");
};
window.closeModal = function() {
    document.querySelector(".modal-overlay")?.classList.remove("open");
};

document.addEventListener("DOMContentLoaded", function() {
    const modal = document.querySelector(".modal-overlay");
    if (modal) {
        modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
    }
});