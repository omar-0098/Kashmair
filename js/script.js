// ============================================================
//  Modal Open / Close
// ============================================================
window.openModal = function() {
    const modal = document.querySelector(".modal-overlay");
    if (modal) modal.classList.add("open");
};

window.closeModal = function() {
    const modal = document.querySelector(".modal-overlay");
    if (modal) modal.classList.remove("open");
};

// إغلاق الـ modal لما تضغط على الـ overlay نفسه (برا الـ box)
document.addEventListener("DOMContentLoaded", function() {
    const modal = document.querySelector(".modal-overlay");
    if (modal) {
        modal.addEventListener("click", function(e) {
            if (e.target === modal) closeModal();
        });
    }
});


















// ============================================================
//  Firebase Imports
// ============================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, push, set, get, child, query, orderByChild, equalTo }
    from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import emailjs from "https://cdn.jsdelivr.net/npm/@emailjs/browser@4/+esm";

emailjs.init("2DNIXY2CFBGlfT7pk");

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

// State - Login
let loginOTP    = "";
let loginExpiry = 0;
let loginEmail  = "";
const loginTimerRef = { val: null };

// State - Register
let regOTP    = "";
let regExpiry = 0;
let regEmail  = "";
const regTimerRef = { val: null };

// Tab Switching
window.switchTab = function(tab) {
    document.getElementById("panel-login").classList.toggle("hidden",    tab !== "login");
    document.getElementById("panel-register").classList.toggle("hidden", tab !== "register");
    document.getElementById("tab-login").classList.toggle("active",      tab === "login");
    document.getElementById("tab-register").classList.toggle("active",   tab === "register");
};

// Toast
function showToast(msg, type = "info") {
    const t = document.getElementById("toast");
    t.textContent = msg;
    t.className   = "toast " + type + " show";
    setTimeout(() => t.classList.remove("show"), 3500);
}

// Helpers
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}
function emailKey(email) {
    return email.replace(/\./g, "_").replace(/@/g, "__");
}
async function saveOTPtoDB(email, otp) {
    await set(ref(db, "otpCodes/" + emailKey(email)), {
        otp,
        expiresAt: Date.now() + 2 * 60 * 1000
    });
    const result = await emailjs.send("service_s93hjpq", "template_4vekbsn", {
        email:    email,
        to_email: email,
        otp_code: otp,
        time: new Date(Date.now() + 2 * 60 * 1000).toLocaleTimeString("ar-EG")
    });
    console.log("✅ EmailJS result:", result);
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
        if (display) display.textContent = mins + ":" + secs;
        if (rem <= 0) {
            clearInterval(timerRef.val);
            if (display) display.textContent = "00:00";
            if (timerEl) timerEl.style.color = "var(--error)";
        }
    }, 500);
}
function setLoadingBtn(btn) {
    btn.disabled  = true;
    btn.innerHTML = '<span class="loading-dots"><span></span><span></span><span></span></span>';
}
function resetBtn(btn, text) {
    btn.disabled  = false;
    btn.innerHTML = '<span class="btn-text">' + text + '</span><span class="btn-arrow">←</span>';
}

// ============================================================
//  التحقق من تكرار الإيميل أو الهاتف في Firebase
// ============================================================
async function isEmailRegistered(email) {
    const snap = await get(query(ref(db, "users"), orderByChild("email"), equalTo(email)));
    return snap.exists();
}
async function isPhoneRegistered(phone) {
    const snap = await get(query(ref(db, "users"), orderByChild("phone"), equalTo(phone)));
    return snap.exists();
}

// OTP Box Navigation
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

// Register Step Indicator
function setRegStep(n) {
    [1, 2, 3].forEach(i => {
        const dot = document.getElementById("reg-dot" + i);
        dot.classList.remove("active", "done");
        if (i < n)        { dot.classList.add("done"); dot.innerHTML = "✓"; }
        else if (i === n) { dot.classList.add("active"); dot.textContent = i; }
        else                dot.textContent = i;
    });
    [1, 2].forEach(i =>
        document.getElementById("reg-line" + i).classList.toggle("done", i < n)
    );
}

// ============================================================
//  LOGIN FLOW
// ============================================================
window.sendOTP = async function() {
    const emailInput = document.getElementById("login-email");
    const email = emailInput.value.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showToast("❌ أدخل بريداً إلكترونياً صحيحاً", "error");
        emailInput.focus(); return;
    }
    const btn = document.querySelector("#login-step1 .btn-primary");
    setLoadingBtn(btn);
    loginOTP    = generateOTP();
    loginExpiry = Date.now() + 2 * 60 * 1000;
    loginEmail  = email;
    try {
        await saveOTPtoDB(email, loginOTP);
        document.getElementById("login-step1").classList.add("hidden");
        document.getElementById("login-step2").classList.remove("hidden");
        document.getElementById("display-email").textContent = email;
        startCountdown(loginExpiry, "countdown", "otp-timer", loginTimerRef);
        document.querySelector("#login-step2 .otp-input").focus();
        showToast("✅ تم إرسال الرمز على بريدك", "success");
    } catch (err) {
        console.error(err);
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
    await push(ref(db, "loginEvents"), { email: loginEmail, loginAt: new Date().toISOString() });
    document.getElementById("login-step2").classList.add("hidden");
    document.getElementById("login-step3").classList.remove("hidden");
    showToast("🎉 أهلاً بك!", "success");
};

window.resendOTP = async function() {
    loginOTP    = generateOTP();
    loginExpiry = Date.now() + 2 * 60 * 1000;
    document.querySelectorAll("#panel-login .otp-input").forEach(b => { b.value = ""; b.classList.remove("filled"); });
    startCountdown(loginExpiry, "countdown", "otp-timer", loginTimerRef);
    await saveOTPtoDB(loginEmail, loginOTP);
    showToast("📨 تم إعادة الإرسال", "info");
};

// ============================================================
//  REGISTER FLOW
// ============================================================

// الخطوة 1: تحقق من الإيميل قبل إرسال OTP
window.sendRegOTP = async function() {
    const emailInput = document.getElementById("reg-email");
    const email = emailInput.value.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showToast("❌ أدخل بريداً إلكترونياً صحيحاً", "error");
        emailInput.focus(); return;
    }

    const btn = document.querySelector("#register-step1 .btn-primary");
    setLoadingBtn(btn);

    try {
        // ✅ تحقق إن الإيميل مش مسجل قبل كده
        const emailExists = await isEmailRegistered(email);
        if (emailExists) {
            showToast("❌ هذا البريد الإلكتروني مسجل بالفعل، استخدم بريداً آخر", "error");
            resetBtn(btn, "إرسال رمز التحقق");
            emailInput.focus();
            return;
        }

        regOTP    = generateOTP();
        regExpiry = Date.now() + 2 * 60 * 1000;
        regEmail  = email;

        await saveOTPtoDB(email, regOTP);
        document.getElementById("register-step1").classList.add("hidden");
        document.getElementById("register-step2").classList.remove("hidden");
        document.getElementById("reg-display-email").textContent = email;
        setRegStep(2);
        startCountdown(regExpiry, "reg-countdown", "reg-otp-timer", regTimerRef);
        document.querySelector("#reg-otp-boxes .otp-input").focus();
        showToast("✅ تم إرسال الرمز على بريدك", "success");

    } catch (err) {
        console.error(err);
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
    document.getElementById("register-step2").classList.add("hidden");
    document.getElementById("register-step3").classList.remove("hidden");
    setRegStep(3);
    showToast("✅ تم التحقق — أكمل بياناتك", "success");
};

window.resendRegOTP = async function() {
    regOTP    = generateOTP();
    regExpiry = Date.now() + 2 * 60 * 1000;
    document.querySelectorAll("#reg-otp-boxes .otp-input").forEach(b => { b.value = ""; b.classList.remove("filled"); });
    startCountdown(regExpiry, "reg-countdown", "reg-otp-timer", regTimerRef);
    await saveOTPtoDB(regEmail, regOTP);
    showToast("📨 تم إعادة الإرسال", "info");
};

// الخطوة 3: تحقق من رقم الهاتف قبل الحفظ
window.registerUser = async function() {
    const firstName = document.getElementById("reg-firstname").value.trim();
    const lastName  = document.getElementById("reg-lastname").value.trim();
    const phone     = document.getElementById("reg-phone").value.trim();

    if (!firstName || !lastName || !phone) {
        showToast("❌ الرجاء ملء جميع الحقول", "error"); return;
    }

    const btn = document.querySelector("#register-step3 .btn-primary");
    setLoadingBtn(btn);

    try {
        // ✅ تحقق إن رقم الهاتف مش مسجل قبل كده
        const phoneExists = await isPhoneRegistered(phone);
        if (phoneExists) {
            showToast("❌ رقم الهاتف مسجل بالفعل، استخدم رقماً آخر", "error");
            resetBtn(btn, "إنشاء الحساب");
            document.getElementById("reg-phone").focus();
            return;
        }

        await push(ref(db, "users"), {
            firstName, lastName, phone,
            email: regEmail,
            registeredAt: new Date().toISOString()
        });

        // ✅ حفظ البيانات في localStorage
        const userData = { firstName, lastName, phone, email: regEmail };
        localStorage.setItem("kashmirUser", JSON.stringify(userData));

        showToast("🎉 تم التسجيل بنجاح!", "success");

        // ✅ إغلاق الـ modal تلقائياً بعد ثانيتين وتحديث الـ UI
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
        .forEach(id => document.getElementById(id).classList.add("hidden"));
    document.getElementById("register-step1").classList.remove("hidden");
    setRegStep(1);
};
// ============================================================
//  إظهار واجهة المستخدم المسجل
// ============================================================
function applyLoggedInUI(userData) {
    const registerSection = document.getElementById("registerSection");
    const welcomeSection  = document.getElementById("welcomeSection");
    const userNameEl      = document.getElementById("userName");

    if (registerSection) registerSection.style.display = "none";
    if (welcomeSection)  welcomeSection.style.display  = "flex";
    if (userNameEl)      userNameEl.textContent         = userData.firstName;
}

// ============================================================
//  فحص localStorage فور ما الصفحة تتحمل
// ============================================================
(function checkSavedUser() {
    const saved = localStorage.getItem("kashmirUser");
    if (!saved) return;
    try {
        const userData = JSON.parse(saved);
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", () => applyLoggedInUI(userData));
        } else {
            applyLoggedInUI(userData);
        }
    } catch (e) {
        localStorage.removeItem("kashmirUser");
    }
})();
