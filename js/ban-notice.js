// ============================================================
//  ban-notice.js — رسالة حمراء للعميل لو حسابه اتلغى من لوحة التحكم
//  - بيتحقق أول ما الصفحة تفتح (من البريد المحفوظ في المتصفح)
//  - بيطلّع العميل ويعرض له السبب اللي الأدمن كتبه + رابط «تواصل مع الدعم»
//  - الرسالة كارت في نص الشاشة (صورة + نص + زرار): أحمر للإلغاء وأخضر لرجوع الحساب
//  - الرسالة بتفضل تظهر كل مرة يفتح الموقع لحد ما الحساب يتفعّل تاني
//  - أول ما الحساب يترجّع وهو يفتح الموقع: رسالة خضرا «تم رجوع حسابك» (مرة واحدة)
//  - ولو كان مسجّل دخول قبل الإلغاء على نفس الجهاز: بيتسجّل دخوله تلقائياً (الاسم والأيقونة يظهروا)
//  - كل ده لحظي: الصفحة بتتابع الحساب على طول، فالإلغاء والاسترجاع بيتطبقوا وهي مفتوحة من غير ما العميل يعمل ريلود
//  - 🟢 «متصل الآن»: طول ما العميل المسجّل دخول فاتح أي صفحة، بيتسجّل حضوره في users/<key>/presence (وبيتمسح لوحده لما يقفل)
//
//  ⚠️ لازم يتحمّل في كل صفحات الموقع (مش بس الرئيسية):
//     <script type="module" src="js/ban-notice.js"></script>       ← صفحات في الفولدر الرئيسي
//     <script type="module" src="../js/ban-notice.js"></script>    ← صفحات جوه user/ أو Furniture/
// ============================================================
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, set, update, remove, onValue, onDisconnect, serverTimestamp, query, orderByChild, equalTo } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// 👇 مسار صفحة الدعم — من الفولدر الرئيسي للموقع (اللي فيه فولدر js). مثال: "support.html" أو "user/support.html"
const SUPPORT_PAGE = "callme.html";

const cfg = {
    apiKey: "AIzaSyCCk0w_KHVCswjp16TSkNToRSSOjlPC5kE",
    authDomain: "data-customer-d722f.firebaseapp.com",
    databaseURL: "https://data-customer-d722f-default-rtdb.firebaseio.com/",
    projectId: "data-customer-d722f",
    storageBucket: "data-customer-d722f.firebasestorage.app",
    messagingSenderId: "398522341614",
    appId: "1:398522341614:web:99e0f897c61ec960cffbff"
};
const db = getDatabase(getApps().length ? getApp() : initializeApp(cfg));

const K_SESSION = "kashmirSessionEmail";
const K_BANNED  = "kashmirBannedEmail";   // بنفتكر بيه إن الحساب ملغي حتى بعد ما نمسح الجلسة
const K_AUTO    = "kashmirBannedWasLoggedIn";   // بنحطها بس لو العميل كان فعلاً مسجّل دخول على الجهاز ده وقت الإلغاء (عشان نقدر نسجّل دخوله تلقائياً)
const K_PENDING = "kashmirRestoredShow";        // (sessionStorage) نعرض رسالة الرجوع بعد التحديث بتاع تسجيل الدخول التلقائي
const AUTH_KEYS = ["kashmirSessionId", "kashmirSessionEmail", "kashmirUser", "userData"];   // كل مفاتيح تسجيل الدخول المحفوظة
// الرابط بيتحسب من مكان الملف ده، فبيشتغل من أي صفحة مهما كان فولدرها
const supportUrl = new URL("../" + SUPPORT_PAGE, import.meta.url).href;

const jsonEmail = k => { try { return (JSON.parse(localStorage.getItem(k) || "null") || {}).email || ""; } catch (e) { return ""; } };
// بنقرأ البريد فوراً (قبل ما أي سكريبت تاني يمسح الجلسة)
const hadLoginAtLoad = !!(localStorage.getItem(K_SESSION) || jsonEmail("kashmirUser") || jsonEmail("userData"));   // كان مسجّل دخول فعلاً قبل الفحص؟
const initialEmail = (localStorage.getItem(K_SESSION) || jsonEmail("kashmirUser") || jsonEmail("userData") || localStorage.getItem(K_BANNED) || "").trim();

// ---------- شكل الرسالة: كارت في نص الشاشة (صورة + نص + زرار) ----------
const CSS = `
.kbn-ov{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(15,23,42,.55);-webkit-backdrop-filter:blur(3px);backdrop-filter:blur(3px);font-family:'Almarai',Tahoma,sans-serif;animation:kbnFade .2s ease}
.kbn-card{position:relative;width:100%;max-width:380px;max-height:94vh;overflow:auto;background:#fff;border-radius:24px;box-shadow:0 24px 60px rgba(0,0,0,.35);animation:kbnPop .3s cubic-bezier(.2,.9,.3,1.15)}
.kbn-art{height:200px;overflow:hidden}
.kbn-ok .kbn-art{background:linear-gradient(180deg,#e4eeff,#f4f8ff)}
.kbn-bad .kbn-art{background:linear-gradient(180deg,#fff0f0,#fffafa)}
.kbn-art svg{width:100%;height:100%;display:block}
.kbn-body{padding:22px 26px 28px;text-align:center;direction:rtl}
.kbn-t{margin:0 0 8px;font-size:20px;font-weight:800;color:#1f2937;line-height:1.6}
.kbn-m{margin:0 0 22px;font-size:15.5px;line-height:1.9;color:#6b7280;white-space:pre-wrap;word-break:break-word}
.kbn-btn{display:inline-block;box-sizing:border-box;min-width:210px;padding:12px 26px;border:none;border-radius:10px;color:#fff;font-size:16px;font-weight:700;line-height:1.4;text-decoration:none;cursor:pointer}
.kbn-ok .kbn-btn{background:#22c55e}.kbn-ok .kbn-btn:hover{background:#16a34a}
.kbn-bad .kbn-btn{background:#f5222d}.kbn-bad .kbn-btn:hover{background:#d9161f}
.kbn-x{position:absolute;top:12px;left:12px;width:32px;height:32px;border:none;border-radius:50%;background:rgba(15,23,42,.08);color:#5e6e82;font-size:14px;cursor:pointer}
@keyframes kbnFade{from{opacity:0}to{opacity:1}}
@keyframes kbnPop{from{opacity:0;transform:scale(.9) translateY(10px)}to{opacity:1;transform:none}}`;

const star = (x, y, r, c) => `<path d="M${x} ${y - r}Q${x} ${y} ${x + r} ${y}Q${x} ${y} ${x} ${y + r}Q${x} ${y} ${x - r} ${y}Q${x} ${y} ${x} ${y - r}Z" fill="${c}"/>`;

// رسمة الشخص القاعد (سعيد = أزرق / حزين = برتقالي)
function art(happy) {
    const C = happy
        ? { blob: "#dbe8ff", shirt: "#5ba4f0", shoe: "#4f9cf0", pot: "#cfe0ff", leaf: "#5ba4f0", leaf2: "#8ec0ff", deco: "#2d8cff" }
        : { blob: "#fde3e3", shirt: "#f5924a", shoe: "#f5924a", pot: "#f3dfe3", leaf: "#e0616a", leaf2: "#f0959c", deco: "#e57373" };
    const skin = "#f6c9a6", navy = "#1f2a5a", pants = "#2b3a67";
    const face = happy
        ? `<path d="M168 64q5-6 10 0M184 64q5-6 10 0" stroke="${navy}" stroke-width="2.6" fill="none" stroke-linecap="round"/>
           <path d="M172 72Q181 85 190 72Z" fill="#c2453d"/><circle cx="165" cy="72" r="4" fill="#f4a6a0" opacity=".6"/><circle cx="197" cy="72" r="4" fill="#f4a6a0" opacity=".6"/>`
        : `<circle cx="172" cy="65" r="2.6" fill="${navy}"/><circle cx="190" cy="65" r="2.6" fill="${navy}"/>
           <path d="M165 58l11-4M186 54l11 4" stroke="${navy}" stroke-width="2.4" stroke-linecap="round"/>
           <path d="M172 77Q181 70 190 77" stroke="${navy}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
    const arms = happy
        ? `<path d="M206 94L224 70" stroke="${C.shirt}" stroke-width="13" stroke-linecap="round"/><path d="M216 80L224 68" stroke="${skin}" stroke-width="9" stroke-linecap="round"/><circle cx="226" cy="64" r="7" fill="${skin}"/>`
        : `<path d="M206 94L214 110" stroke="${C.shirt}" stroke-width="13" stroke-linecap="round"/><path d="M214 108L199 74" stroke="${skin}" stroke-width="8" stroke-linecap="round"/><circle cx="197" cy="70" r="7" fill="${skin}"/>`;
    const deco = happy
        ? `<path d="M96 52q-10-16 6-22q18-4 20 11q0 15-15 12q-11-3-8-13" stroke="${C.deco}" stroke-width="3" fill="none" stroke-linecap="round"/>
           ${star(80, 84, 8, "#8ec0ff")}${star(262, 34, 6, "#8ec0ff")}${star(292, 96, 5, "#8ec0ff")}${star(70, 132, 6, "#fff")}${star(112, 20, 4, "#8ec0ff")}
           <path d="M246 60h8V44h-8zM256 44l6-14q7 0 5 9l-1 5h11q5 0 4 6l-3 15q-1 5-7 5h-15z" fill="${C.deco}"/>`
        : `<path d="M96 52q-10-16 6-22q18-4 20 11q0 15-15 12q-11-3-8-13" stroke="${C.deco}" stroke-width="3" fill="none" stroke-linecap="round"/>
           <text x="238" y="52" font-size="30" font-weight="700" fill="${C.deco}" font-family="Arial,sans-serif">?</text>
           <text x="112" y="96" font-size="24" font-weight="700" fill="${C.deco}" font-family="Arial,sans-serif">?</text>
           <text x="270" y="86" font-size="18" font-weight="700" fill="#f0a0a0" font-family="Arial,sans-serif">?</text>
           ${star(292, 132, 4, "#f4b6b6")}${star(64, 120, 4, "#f4b6b6")}`;
    return `<svg viewBox="0 0 360 200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <ellipse cx="180" cy="178" rx="128" ry="17" fill="${C.blob}"/>
      <g transform="rotate(-8 92 176)"><rect x="66" y="168" width="52" height="17" rx="4" fill="${pants}"/><rect x="69" y="170.5" width="46" height="12" rx="2" fill="#5b6b9a"/></g>
      <path d="M262 158h28l-3 24h-22z" fill="${C.pot}"/>
      <path d="M276 158q-24-6-19-32q21 4 19 32zM276 158q24-8 21-34q-23 7-21 34z" fill="${C.leaf}"/><path d="M276 158q-3-24 4-36q7 15-4 36z" fill="${C.leaf2}"/>
      <path d="M118 170Q112 140 150 134L210 134Q250 140 244 170Q212 184 180 180Q148 184 118 170Z" fill="${pants}"/>
      <path d="M150 152Q180 170 214 152" stroke="#3d4d80" stroke-width="3" fill="none" stroke-linecap="round"/>
      <ellipse cx="130" cy="172" rx="21" ry="9" fill="${C.shoe}"/><rect x="109" y="177" width="42" height="6" rx="3" fill="#fff"/>
      <ellipse cx="230" cy="172" rx="21" ry="9" fill="${C.shoe}"/><rect x="209" y="177" width="42" height="6" rx="3" fill="#fff"/>
      <path d="M150 138Q144 98 164 86L196 86Q216 98 210 138Z" fill="${C.shirt}"/>
      ${arms}
      <path d="M154 94L166 120" stroke="${C.shirt}" stroke-width="13" stroke-linecap="round"/><path d="M160 104L168 120" stroke="${skin}" stroke-width="8" stroke-linecap="round"/>
      <g transform="rotate(-10 172 112)"><rect x="164" y="98" width="15" height="26" rx="3" fill="${navy}"/><rect x="166" y="101" width="11" height="19" rx="1.5" fill="#3d4d80"/></g>
      <circle cx="170" cy="122" r="6" fill="${skin}"/>
      <rect x="172" y="76" width="16" height="14" fill="${skin}"/>
      <circle cx="180" cy="62" r="22" fill="${skin}"/>
      <path d="M158 62Q156 36 180 36Q204 36 202 62Q196 48 180 50Q166 50 158 62Z" fill="${navy}"/><circle cx="192" cy="31" r="9" fill="${navy}"/>
      ${face}${deco}
    </svg>`;
}

function deviceInfo() {
    const ua = navigator.userAgent;
    let device = "جهاز غير معروف", icon = "💻", browser = "متصفح";
    if (/iPhone/.test(ua)) { device = "iPhone"; icon = "📱"; }
    else if (/iPad/.test(ua)) { device = "iPad"; icon = "📱"; }
    else if (/Android/.test(ua) && /Mobile/.test(ua)) { device = "Android موبايل"; icon = "📱"; }
    else if (/Android/.test(ua)) { device = "Android تابلت"; icon = "📱"; }
    else if (/Mac/.test(ua)) { device = "Mac"; icon = "💻"; }
    else if (/Windows/.test(ua)) { device = "Windows PC"; icon = "🖥️"; }
    else if (/Linux/.test(ua)) { device = "Linux"; icon = "🖥️"; }
    if (/Chrome/.test(ua) && !/Edg/.test(ua)) browser = "Chrome";
    else if (/Firefox/.test(ua)) browser = "Firefox";
    else if (/Safari/.test(ua)) browser = "Safari";
    else if (/Edg/.test(ua)) browser = "Edge";
    else if (/Opera|OPR/.test(ua)) browser = "Opera";
    return { device, browser, icon };
}

// تسجيل دخول تلقائي بعد رجوع الحساب: نفس جلسة login2.js (بتتكتب في Firebase + المتصفح)
async function autoLogin(user) {
    const email = user.email;
    const sid = Date.now().toString(36) + Math.random().toString(36).substring(2, 10);
    const { device, browser, icon } = deviceInfo();
    await set(ref(db, `sessions/${email.replace(/\./g, "_").replace(/@/g, "__")}/${sid}`), {
        sessionId: sid, email, device, browser, icon,
        loginAt: new Date().toISOString(), lastSeen: Date.now(), isActive: true,
        userAgent: navigator.userAgent.substring(0, 150)
    });
    localStorage.setItem("kashmirSessionId", sid);
    localStorage.setItem("kashmirSessionEmail", email);
    localStorage.setItem("kashmirUser", JSON.stringify(user));
}

function drawCard(id, kind, title, message, btn) {
    const draw = () => {
        document.getElementById("kashmirBanNotice")?.remove();
        document.getElementById("kashmirRestoredNotice")?.remove();
        if (!document.getElementById("kashmirBanStyle")) {
            const st = document.createElement("style");
            st.id = "kashmirBanStyle";
            st.textContent = CSS;
            document.head.appendChild(st);
        }
        const ov = document.createElement("div");
        ov.id = id;
        ov.className = "kbn-ov";
        ov.dir = "rtl";
        ov.setAttribute("role", "alertdialog");
        ov.innerHTML = `<div class="kbn-card kbn-${kind}">
            <button type="button" class="kbn-x" aria-label="إغلاق">✕</button>
            <div class="kbn-art">${art(kind === "ok")}</div>
            <div class="kbn-body"><p class="kbn-t"></p><p class="kbn-m"></p></div></div>`;
        ov.querySelector(".kbn-t").textContent = title;
        ov.querySelector(".kbn-m").textContent = message;
        let b;
        if (btn.href) { b = document.createElement("a"); b.href = btn.href; }
        else { b = document.createElement("button"); b.type = "button"; b.onclick = () => ov.remove(); }
        b.className = "kbn-btn";
        b.textContent = btn.text;
        ov.querySelector(".kbn-body").appendChild(b);
        ov.querySelector(".kbn-x").onclick = () => ov.remove();
        ov.addEventListener("click", e => { if (e.target === ov) ov.remove(); });
        document.addEventListener("keydown", function esc(e) { if (e.key === "Escape") { ov.remove(); document.removeEventListener("keydown", esc); } });
        document.body.appendChild(ov);
    };
    if (document.body) draw();
    else document.addEventListener("DOMContentLoaded", draw);
}

// رسالة حمراء بسبب الإلغاء + زرار «تواصل مع الدعم». لو اتبعت email بنفتكره عشان نظهر رسالة "رجع حسابك" لما الحساب يتفعّل
export function showBanNotice(reason, email) {
    if (email) { localStorage.setItem(K_BANNED, String(email).trim()); startAccountWatch(); }   // نتابع الحساب عشان رسالة الرجوع تظهر لحظياً
    drawCard("kashmirBanNotice", "bad", "تم إلغاء حسابك",
        "السبب: " + (String(reason || "").trim() || "لم يتم ذكر سبب"),
        { text: "تواصل مع الدعم", href: supportUrl });
}

// رسالة خضرا بعد إعادة التفعيل
export function showRestoredNotice(name) {
    drawCard("kashmirRestoredNotice", "ok", "تم رجوع حسابك",
        name ? "أهلاً " + name + " \nتم تسجيل دخولك تلقائياً."
             : "تقدر تسجّل الدخول وتستخدم حسابك من جديد.", { text: "حسنًا" });
}

// بعد التحديث بتاع تسجيل الدخول التلقائي: نعرض الرسالة الخضرا باسم العميل
function showPendingRestored() {
    const raw = sessionStorage.getItem(K_PENDING);
    if (!raw) return;
    sessionStorage.removeItem(K_PENDING);
    try { showRestoredNotice((JSON.parse(raw) || {}).name || ""); } catch (e) { showRestoredNotice(""); }
}

// ---------- 🟢 حضور العميل (متصل الآن) ----------
const TAB_ID = Math.random().toString(36).slice(2, 8);   // كل تبويب مفتوح له علامة، فقفل تبويب واحد ما يشيلش الباقي
const HEARTBEAT_MS = 60000;
let presRef = null, presKey = "", hbTimer = null, connUnsub = null;
const isLoggedIn = () => !!(localStorage.getItem("kashmirSessionId") && localStorage.getItem(K_SESSION));

function stopPresence() {
    if (hbTimer) { clearInterval(hbTimer); hbTimer = null; }
    if (connUnsub) { try { connUnsub(); } catch (e) {} connUnsub = null; }
    if (presRef) {
        const r = presRef; presRef = null;
        onDisconnect(r).cancel().catch(() => {});
        remove(r).catch(() => {});
    }
    presKey = "";
}
function startPresence(userKey) {
    if (!userKey || presKey === userKey || !isLoggedIn()) return;
    stopPresence();
    presKey = userKey;
    const r = ref(db, `users/${userKey}/presence/${TAB_ID}`);
    presRef = r;
    // أول ما الاتصال يشتغل (أو يرجع): نسجّل "متصل" ونطلب من Firebase يمسحها لو الاتصال اتقطع أو الصفحة اتقفلت
    connUnsub = onValue(ref(db, ".info/connected"), s => {
        if (s.val() !== true || !presRef) return;
        onDisconnect(r).remove().then(() => set(r, { t: serverTimestamp() })).catch(e => console.error("presence:", e));
    });
    hbTimer = setInterval(() => {
        if (!isLoggedIn()) { stopPresence(); return; }
        update(r, { t: serverTimestamp() }).catch(() => {});
    }, HEARTBEAT_MS);
}

// ---------- متابعة الحساب لحظياً (إلغاء / استرجاع من غير ريلود) ----------
let unsubUser = null, watchedEmail = "", running = false, queued = null;

async function handleUser(user, email) {
    const same = () => (localStorage.getItem(K_BANNED) || "").trim().toLowerCase() === email.toLowerCase();
    if (user && user.disabled) {
        stopPresence();
        const stale = AUTH_KEYS.some(k => localStorage.getItem(k) !== null);   // الصفحة لسه شايفاه مسجّل دخول؟
        localStorage.setItem(K_BANNED, email);
        if (hadLoginAtLoad || stale) localStorage.setItem(K_AUTO, email);      // كان مسجّل دخول → لما يترجّع نسجّله تلقائياً
        AUTH_KEYS.forEach(k => localStorage.removeItem(k));
        // كان مسجّل دخول والصفحة مفتوحة: تحديث تلقائي مرة واحدة عشان تظهر له كأنه مش مسجّل (والرسالة بترجع من العلامة)
        if (stale && Date.now() - Number(sessionStorage.getItem("kashmirBanReloadAt") || 0) > 10000) {
            sessionStorage.setItem("kashmirBanReloadAt", String(Date.now()));
            location.reload();
            return;
        }
        if (!document.getElementById("kashmirBanNotice")) showBanNotice(user.disabledReason);
        return;
    }
    const wasBanned = same();   // كان شايف رسالة الإلغاء
    const canAuto = wasBanned && (localStorage.getItem(K_AUTO) || "").trim().toLowerCase() === email.toLowerCase();
    if (!user) {
        if (wasBanned) localStorage.removeItem(K_BANNED);
        localStorage.removeItem(K_AUTO);
        return;
    }
    if (!wasBanned) { startPresence(user._key); return; }   // حساب سليم → 🟢 متصل
    // الحساب اتفعّل تاني
    localStorage.removeItem(K_BANNED);
    localStorage.removeItem(K_AUTO);
    if (canAuto) {
        try {
            await autoLogin(user);
            sessionStorage.setItem(K_PENDING, JSON.stringify({ name: user.firstName || "" }));
            location.reload();   // الصفحة بتقرا الجلسة الجديدة وتظهر الاسم والأيقونة
            return;
        } catch (e) { console.error("auto login failed:", e); }
    }
    showRestoredNotice();
}

async function process(user, email) {   // بنعالج تغيير واحد في المرة، وآخر تغيير هو اللي يكسب
    if (running) { queued = { user, email }; return; }
    running = true;
    try { await handleUser(user, email); }
    catch (e) { console.error("account watch error:", e); }
    finally {
        running = false;
        if (queued) { const q = queued; queued = null; process(q.user, q.email); }
    }
}

// بتشتغل أول ما الصفحة تفتح، وتتنده تاني بعد أي تسجيل دخول جديد (login2.js بيعمل كده)
export function startAccountWatch() {
    const email = (localStorage.getItem(K_SESSION) || jsonEmail("kashmirUser") || jsonEmail("userData") || localStorage.getItem(K_BANNED) || initialEmail || "").trim();
    if (!email) return;
    if (unsubUser && watchedEmail.toLowerCase() === email.toLowerCase()) return;
    if (unsubUser) { unsubUser(); unsubUser = null; }
    stopPresence();
    watchedEmail = email;
    unsubUser = onValue(query(ref(db, "users"), orderByChild("email"), equalTo(email)), snap => {
        let user = null;
        snap.forEach(c => { user = { ...c.val(), _key: c.key }; });
        process(user, email);
    }, err => console.error("account watch error:", err));
}

startAccountWatch();
showPendingRestored();