// cart-address.js
// بيعرض عنوان التوصيل (العنوان الافتراضي المحفوظ في صفحة "حسابي") جوه صفحة الكارت،
// وبيحدد سعر الشحن المتوقع حسب محافظة العنوان ده (main.js هو اللي فيه أسعار الشحن الفعلية).
// ولو مفيش عنوان محفوظ، بيحول المستخدم لصفحة الحساب لإضافة عنوان وبيرجعه تلقائياً
// للكارت بعد ما يحفظ. وزرار "صفحة الدفع" بيبقى رمادي (متعطل شكلياً) وميودّيش لصفحة
// الدفع غير لما يكون فيه عنوان توصيل صالح.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getDatabase,
  ref,
  get,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyCCk0w_KHVCswjp16TSkNToRSSOjlPC5kE",
  authDomain: "data-customer-d722f.firebaseapp.com",
  databaseURL: "https://data-customer-d722f-default-rtdb.firebaseio.com/",
  projectId: "data-customer-d722f",
  storageBucket: "data-customer-d722f.firebasestorage.app",
  messagingSenderId: "398522341614",
  appId: "1:398522341614:web:99e0f897c61ec960cffbff",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const eKey = (email) => email.replace(/\./g, "_").replace(/@/g, "__");

// المسار النسبي لصفحة الحساب من مكان صفحة الكارت (cart.html في الجذر)
const ACCOUNT_URL = "user/accoun.html";
const RETURN_PATH = "../cart.html"; // من وجهة نظر صفحة الحساب اللي جوه فولدر user/

// ===== مطابقة اسم المحافظة (نص حر من العنوان) مع مفاتيح shippingPrices في main.js =====
const GOVERNORATE_ALIASES = {
  cairo: ["القاهرة", "القاهره", "قاهرة"],
  alexandria: ["الإسكندرية", "الاسكندرية", "اسكندرية", "إسكندرية"],
  giza: ["الجيزة", "الجيزه", "جيزة"],
  aswan: ["أسوان", "اسوان"],
  asiyut: ["أسيوط", "اسيوط", "اسيوت"],
  beheira: ["البحيرة", "البحيره", "بحيرة"],
  beni_suef: ["بني سويف", "بنى سويف"],
  dakahlia: ["الدقهلية", "الدقهليه", "دقهلية"],
  damietta: ["دمياط"],
  fayoum: ["الفيوم", "فيوم"],
  gharbia: ["الغربية", "الغربيه", "غربية"],
  ismailia: ["الإسماعيلية", "الاسماعيلية", "اسماعيلية"],
  kafr_elsheikh: ["كفر الشيخ", "كفرالشيخ"],
  luxor: ["الأقصر", "الاقصر", "اقصر"],
  matrouh: ["مطروح"],
  minya: ["المنيا", "منيا"],
  monufia: ["المنوفية", "المنوفيه", "منوفية"],
  new_valley: ["الوادي الجديد", "الوادى الجديد"],
  north_sinai: ["شمال سيناء"],
  port_said: ["بورسعيد", "بور سعيد"],
  qalyubia: ["القليوبية", "القليوبيه", "قليوبية"],
  qena: ["قنا"],
  red_sea: ["البحر الأحمر", "البحر الاحمر"],
  sharqia: ["الشرقية", "الشرقيه", "شرقية"],
  sohag: ["سوهاج"],
  south_sinai: ["جنوب سيناء"],
  suez: ["السويس", "سويس"],
};

function normalizeArabic(text) {
  return String(text || "")
    .replace(/[\u064B-\u0652]/g, "") // تشكيل
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/محافظة|محافظه/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function matchGovernorateKey(rawText) {
  const known = window.shippingPrices ? Object.keys(window.shippingPrices) : Object.keys(GOVERNORATE_ALIASES);
  const norm = normalizeArabic(rawText);
  if (!norm) return null;
  for (const key of known) {
    const aliases = GOVERNORATE_ALIASES[key] || [];
    for (const alias of aliases) {
      if (normalizeArabic(alias) === norm || norm.includes(normalizeArabic(alias))) {
        return key;
      }
    }
  }
  return null;
}

function showLocalToast(msg, type = "info") {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = msg;
  t.className = "toast " + type + " show";
  clearTimeout(t._addrToastTimer);
  t._addrToastTimer = setTimeout(() => t.classList.remove("show"), 3500);
}

function buildAddressLine(addr) {
  return [addr.governorate, addr.center, addr.city, addr.street, addr.building]
    .filter((v) => v && String(v).trim() !== "")
    .join(" — ");
}

// حالة الجاهزية: بتتحدد بعد ما نجيب بيانات العنوان من قاعدة البيانات
let addressReady = false;
let redirectTarget = null; // فين هنودي المستخدم لو دوس "صفحة الدفع" وهو مش جاهز

function setCheckoutButtonState(ready) {
  const btn = document.getElementById("goToCheckoutBtn");
  if (!btn) return;
  btn.classList.toggle("btn-disabled-look", !ready);
}

function refreshTotals() {
  if (typeof window.updateCart === "function") window.updateCart();
}

function renderNotLoggedIn(box) {
  addressReady = false;
  redirectTarget = "login";
  window.cartAddressGovernorateKey = "";
  window.cartAddressShippingNote = "سجّل الدخول وضيف عنوان التوصيل عشان نحسبلك الشحن";
  setCheckoutButtonState(false);
  refreshTotals();

  box.innerHTML = `
    <p class="da-missing"><i class="fa-solid fa-circle-info"></i> سجّل الدخول عشان تضيف عنوان التوصيل وتكمل عملية الشراء</p>
    <button type="button" class="da-add-btn" id="cartAddrLoginBtn"><i class="fa-solid fa-right-to-bracket"></i> تسجيل الدخول</button>
  `;
  document.getElementById("cartAddrLoginBtn")?.addEventListener("click", () => {
    if (typeof window.openModal === "function") window.openModal();
  });
}

function renderNoAddress(box) {
  addressReady = false;
  redirectTarget = "account";
  window.cartAddressGovernorateKey = "";
  window.cartAddressShippingNote = "هيتحدد سعر الشحن بعد ما تضيف عنوان التوصيل";
  setCheckoutButtonState(false);
  refreshTotals();

  const link = `${ACCOUNT_URL}?tab=location&return=${encodeURIComponent(RETURN_PATH)}&autoAdd=1`;
  box.innerHTML = `
    <p class="da-missing"><i class="fa-solid fa-location-dot"></i> لسه مضفتش عنوان توصيل</p>
    <a class="da-add-btn" href="${link}"><i class="fa-solid fa-plus"></i> إضافة عنوان التوصيل</a>
  `;
}

function renderAddress(box, addr) {
  addressReady = true;
  redirectTarget = null;

  const key = matchGovernorateKey(addr.governorate);
  window.cartAddressGovernorateKey = key || "";
  window.cartAddressShippingNote = key ? "" : "سعر الشحن هيتأكد في صفحة الدفع حسب محافظتك";
  setCheckoutButtonState(true);
  refreshTotals();

  const link = `${ACCOUNT_URL}?tab=location&return=${encodeURIComponent(RETURN_PATH)}`;
  box.innerHTML = `
    <div class="da-head">
      <span class="da-title"><i class="fa-solid fa-location-dot"></i> عنوان التوصيل</span>
      <a class="da-change" href="${link}">تغيير</a>
    </div>
    <p class="da-text"><span class="da-name">${addr.name || ""}</span>${addr.phone ? " — " + addr.phone : ""}<br>${buildAddressLine(addr)}</p>
  `;
}

async function loadAddress() {
  const box = document.getElementById("cartAddressBox");
  if (!box) return;

  // البداية: زرار الدفع رمادي لحد ما نتأكد إن فيه عنوان صالح
  setCheckoutButtonState(false);

  const email = localStorage.getItem("kashmirSessionEmail");
  if (!email) {
    renderNotLoggedIn(box);
    return;
  }

  try {
    const snap = await get(ref(db, `userAddresses/${eKey(email)}`));
    if (!snap.exists()) {
      renderNoAddress(box);
      return;
    }
    const all = snap.val();
    const entries = Object.values(all);
    const defaultAddr = entries.find((a) => a.isDefault) || entries[0];
    renderAddress(box, defaultAddr);
  } catch (err) {
    console.error("تعذّر تحميل عنوان التوصيل:", err);
    // في حالة فشل الاتصال، منمنعش المستخدم من إكمال الشراء عشان مشكلة شبكة مؤقتة
    addressReady = true;
    redirectTarget = null;
    window.cartAddressGovernorateKey = "";
    window.cartAddressShippingNote = "";
    setCheckoutButtonState(true);
    refreshTotals();
    box.innerHTML = `<p class="da-missing"><i class="fa-solid fa-triangle-exclamation"></i> تعذّر تحميل عنوان التوصيل الآن</p>`;
  }
}

function bindCheckoutGate() {
  const checkoutBtn = document.getElementById("goToCheckoutBtn");
  checkoutBtn?.addEventListener("click", (e) => {
    if (addressReady) return; // العنوان جاهز، سيب الزرار يودي لصفحة الدفع عادي

    e.preventDefault();
    if (redirectTarget === "login") {
      if (typeof window.openModal === "function") window.openModal();
      showLocalToast("❌ سجّل الدخول الأول عشان تكمل عملية الشراء", "error");
    } else {
      showLocalToast("❌ ضيف عنوان توصيل الأول عشان تكمل عملية الشراء", "error");
      setTimeout(() => {
        window.location.href = `${ACCOUNT_URL}?tab=location&return=${encodeURIComponent(RETURN_PATH)}&autoAdd=1`;
      }, 700);
    }
  });
}

bindCheckoutGate();
loadAddress();