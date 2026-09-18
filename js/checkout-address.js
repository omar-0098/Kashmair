// checkout-address.js
// 1) بيدير اختيار طريقة الدفع (الدفع عند الاستلام / فوري) في صفحة الدفع، وبيفعّل زرار
//    "إتمام الطلب" (اللي بيبقى رمادي "اختر طريقة الدفع" لغاية ما يختار المستخدم طريقة).
// 2) بيجيب عنوان التوصيل الافتراضي المحفوظ في صفحة "حسابي" وبيعرضه فوق، وبيملى بيه
//    حقول فورم "تفاصيل الفواتير" تلقائياً (المحافظة/المركز/القرية/الشارع/اسم المنزل)
//    عشان المستخدم مايكتبش نفس البيانات مرتين.

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

// نفس منطق مطابقة المحافظات المستخدم في js/cart-address.js
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
    .replace(/[\u064B-\u0652]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/محافظة|محافظه/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}
function matchGovernorateKey(rawText) {
  const norm = normalizeArabic(rawText);
  if (!norm) return null;
  for (const key of Object.keys(GOVERNORATE_ALIASES)) {
    for (const alias of GOVERNORATE_ALIASES[key]) {
      if (normalizeArabic(alias) === norm || norm.includes(normalizeArabic(alias))) return key;
    }
  }
  return null;
}

// ===================== طريقة الدفع =====================
function initPaymentMethods() {
  const options = document.querySelectorAll(".cn-pay-option");
  const hiddenInput = document.getElementById("paymentMethodInput");
  const submitBtn = document.getElementById("cnSubmitBtn");
  const fawryNote = document.getElementById("cnFawryNote");

  options.forEach((opt) => {
    opt.addEventListener("click", () => {
      options.forEach((o) => o.classList.remove("active"));
      opt.classList.add("active");
      const method = opt.dataset.method;
      if (hiddenInput) hiddenInput.value = method;
      if (fawryNote) fawryNote.classList.toggle("show", method === "fawry");
      if (submitBtn) {
        submitBtn.classList.add("ready");
        submitBtn.textContent = "إتمام الطلب";
      }
    });
  });
}

// ===================== عنوان التوصيل =====================
function buildAddressLine(addr) {
  return [addr.governorate, addr.center, addr.city, addr.street, addr.building]
    .filter((v) => v && String(v).trim() !== "")
    .join(" — ");
}

function fillBillingForm(addr) {
  const set = (id, v) => {
    const el = document.getElementById(id);
    if (el && v) el.value = v;
  };
  const govSelect = document.getElementById("governorates");
  if (govSelect) {
    const key = matchGovernorateKey(addr.governorate);
    if (key) govSelect.value = key;
  }
  set("name", addr.name);
  set("email", addr.email);
  set("phone", addr.phone);
  set("phone2", addr.phone2);
  set("checkoutCenter", addr.center);
  set("checkoutVillage", addr.city);
  set("checkoutStreet", addr.street);
  set("checkoutHome", addr.building);

  // نحدث حساب الشحن بعد ما نملى المحافظة
  if (typeof window.updateCart === "function") window.updateCart();
}

function renderAddress(addr) {
  const typeEl = document.getElementById("cnAddressType");
  const textEl = document.getElementById("cnAddressText");
  const nameEl = document.getElementById("cnRecipientName");
  const phoneEl = document.getElementById("cnRecipientPhone");

  if (typeEl) typeEl.textContent = addr.type === "work" ? "(العمل)" : "(المنزل)";
  if (textEl) textEl.textContent = buildAddressLine(addr) || "—";
  if (nameEl) nameEl.textContent = addr.name || "—";
  if (phoneEl) phoneEl.textContent = addr.phone || "";

  fillBillingForm(addr);
}

let addressReady = false;

function renderNoAddress() {
  addressReady = false;
  const textEl = document.getElementById("cnAddressText");
  const link = document.getElementById("cnAddressEditLink");
  if (textEl) textEl.textContent = "لسه مضفتش عنوان توصيل — لازم تضيفه الأول عشان تكمل الطلب";
  if (link) {
    link.textContent = "إضافة عنوان";
    link.href = `user/accoun.html?tab=location&return=${encodeURIComponent("chexkout.html")}&autoAdd=1`;
  }
}

async function loadAddress() {
  const email = localStorage.getItem("kashmirSessionEmail");
  if (!email) {
    renderNoAddress();
    return;
  }
  try {
    const snap = await get(ref(db, `userAddresses/${eKey(email)}`));
    if (!snap.exists()) {
      renderNoAddress();
      return;
    }
    const entries = Object.values(snap.val());
    const defaultAddr = entries.find((a) => a.isDefault) || entries[0];
    renderAddress(defaultAddr);
    addressReady = true;
  } catch (err) {
    console.error("تعذّر تحميل عنوان التوصيل:", err);
    renderNoAddress();
  }
}

// حماية إضافية: لو حد وصل لصفحة الدفع من غير عنوان محفوظ (رابط مباشر مثلاً)،
// منمنعوش من إرسال الطلب فارغ، وبنودّيه يضيف عنوان الأول
function guardFormSubmit() {
  const form = document.getElementById("form_contact");
  if (!form) return;
  form.addEventListener("submit", (e) => {
    if (addressReady) return;
    e.preventDefault();
    const t = document.getElementById("toast");
    if (t) {
      t.textContent = "❌ ضيف عنوان توصيل الأول عشان تكمل الطلب";
      t.className = "toast error show";
      setTimeout(() => t.classList.remove("show"), 3500);
    }
    setTimeout(() => {
      window.location.href = `user/accoun.html?tab=location&return=${encodeURIComponent("chexkout.html")}&autoAdd=1`;
    }, 700);
  });
}

initPaymentMethods();
guardFormSubmit();
loadAddress();