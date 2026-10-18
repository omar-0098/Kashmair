// ============================================================
//  item.js — كشمير هوم
//  نظام التعليقات والتقييمات + Firebase Realtime Database
// ============================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getDatabase, ref, push, set, get, onValue, update, remove, increment
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// ─── Firebase Config ─────────────────────────────────────────
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

// ─── حقن CSS الأنيميشن ───────────────────────────────────────
(function injectStyles() {
  if (document.getElementById("vote-anim-styles")) return;
  const style = document.createElement("style");
  style.id = "vote-anim-styles";
  style.textContent = `
    @keyframes likeParticle {
      0%   { transform: translate(-50%,-50%) translate(0,0) scale(1); opacity:1; }
      100% { transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(0); opacity:0; }
    }

    /* ===== شكل الكومنت الجديد ===== */
    .kc-comment { display:flex; align-items:flex-start; gap:12px; padding:0; margin:0 0 24px; font-family:'Readex Pro',sans-serif; }
    .kc-avatar { flex:0 0 auto; width:34px; height:34px; border-radius:50%; display:flex; align-items:center; justify-content:center;
                 color:#fff; font-weight:600; font-size:15px; background-size:cover; background-position:center; }
    .kc-body { flex:1 1 auto; min-width:0; }
    .kc-head { display:flex; align-items:baseline; gap:8px; flex-wrap:wrap; }
    .kc-name { font-size:14px; font-weight:600; color:#1f1f1f; }
    .kc-time { font-size:12px; color:#8a8a8a; font-family: 'Cairo', sans-serif;}
    .kc-stars { display:flex; gap:2px; margin-top:4px; font-size:12px; direction:ltr; justify-content:flex-end; }
    .kc-stars .on  { color:#f5a524; }
    .kc-stars .off { color:#d6d6d6; }
    [dir="rtl"] .kc-stars, .kc-comment .kc-stars { justify-content:flex-end; }
    .kc-text {font-family: 'Cairo', sans-serif; margin:6px 0 0; font-size:14px; line-height:1.6; color:#2b2b2b; word-break:break-word; overflow-wrap:anywhere; }
    .kc-actions { display:flex; align-items:center; gap:16px; margin-top:8px; }
    .kc-vote { position:relative; overflow:visible; display:inline-flex; align-items:center; gap:5px; padding:2px 0; border:0; background:none;
               color:#555; font:inherit; font-size:13px; cursor:pointer; transition:color .2s; }
    .kc-vote i { font-size:14px; }
    .kc-vote:hover { color:#e8590c; }
    .kc-vote.voted, .kc-vote.voted i { color:#e8590c; font-weight:600; }
    .kc-menu-wrap { position:relative; }
    .kc-menu-btn { border:0; background:none; color:#555; cursor:pointer; padding:2px 6px; border-radius:6px; font-size:14px; }
    .kc-menu-btn:hover { background:#f0f0f0; }
    .kc-menu { display:none; position:absolute; top:100%; inset-inline-start:0; z-index:20; min-width:110px; padding:4px; background:#fff;
               border:1px solid #eee; border-radius:10px; box-shadow:0 6px 20px rgba(0,0,0,.12); }
    .kc-menu.open { display:block; }
    .kc-menu button {     display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 7px 10px;
    border: 0;
    background: none;
    border-radius: 8px;
    font: inherit;
    font-size: 13px;
    cursor: pointer;
    color: #2b2b2b;
    text-align: start;
    font-family: 'Cairo', sans-seri; }
    .kc-menu button:hover { background:#f5f5f5; }
    .kc-menu .kc-delete { color:#e53935; }

    /* ===== صندوق كتابة التعليق ===== */
    .kc-composer { background:#f2f2f2; border-radius:16px; padding:16px 18px 12px; font-family:'Readex Pro',sans-serif; }
    .kc-composer #commentInput { display:block; width:100%; min-height:48px; padding:0; margin:0; border:0; outline:0; box-shadow:none;
                                 background:transparent; resize:none; font:inherit; font-size:14px; line-height:1.6; color:#222; }
    .kc-composer #commentInput::placeholder { color:#7a7a7a; }
    .kc-stars-pick { display:flex; align-items:center; gap:2px; margin:2px 0 4px; padding:0; }
    .kc-stars-pick .rating-display { order:2; margin:0 10px; font-size:12px; color:#7a7a7a; }
    .kc-stars-pick .star { order:1; font-size:22px; line-height:1; cursor:pointer; color:#cfcfcf; transition:transform .12s; }
    .kc-stars-pick .star:hover { transform:scale(1.15); }
    .kc-toolbar { display:flex; align-items:center; gap:4px; margin-top:3px; }
    .kc-tool { width:32px; height:32px; border:0; background:none; border-radius:8px; color:#555; font-size:14px; cursor:pointer; }
    .kc-tool:hover { background:#e4e4e4; }
    .kc-tool-sep { width:1px; height:18px; background:#d2d2d2; margin:0 6px; }
    .kc-composer #button.kc-submit { margin-inline-start:auto; width:auto; height:auto; padding:10px 26px; border:0; border-radius:999px;
                                     background:#e8590c; color:#fff; font:inherit; font-size:14px; font-weight:600; cursor:pointer; transition:background .2s; }
    .kc-composer #button.kc-submit:hover { background:#cf4e08; }
    .kc-composer #button.kc-submit:disabled { opacity:.6; cursor:default; }
    .kc-emoji-wrap { position:relative; }
    .kc-emoji-pop { 
                        display: none;
    position: absolute;
    bottom: 110%;
    inset-inline-start: 0;
    z-index: 30;
    min-width: 241px;
    padding: 8px;
    background: #fff;
    border: 1px solid #eee;
    border-radius: 12px;
    box-shadow: 0 6px 20px rgba(0, 0, 0, .14);
    grid-template-columns: repeat(6, 1fr);
    gap: 2px; }
    .kc-emoji-pop.open { display:grid; }
    .kc-emoji-pop button { border:0; background:none; font-size:20px; padding:4px; border-radius:8px; cursor:pointer; }
    .kc-emoji-pop button:hover { background:#f3f3f3; }

    /* ===== عنوان القائمة + الترتيب ===== */
    .kc-list-head { display:flex; align-items:center; justify-content:space-between; margin:22px 0 20px; padding-top:18px; border-top:1px solid #e8e8e8;
                    font-family:'Readex Pro',sans-serif; }
    .kc-title { display:flex; align-items:center; gap:8px; margin:0; font-size:17px; font-weight:700; color:#1f1f1f; }
    .kc-badge { display:inline-block; min-width:24px; padding:1px 8px; border-radius:999px; background:#e8590c; color:#fff; font-size:12px; font-weight:600; text-align:center; }
    .kc-sort { position:relative; }
    .kc-sort-btn { display:inline-flex; align-items:center; gap:5px; border:0; background:none; font:inherit; font-size:14px; color:#2b2b2b; cursor:pointer; }
    .kc-sort-btn .kc-chev { font-size:11px; color:#777; }
    .kc-sort-menu { display:none; position:absolute; top:120%; inset-inline-end:0; z-index:20; min-width:140px; padding:4px; background:#fff;
                    border:1px solid #eee; border-radius:10px; box-shadow:0 6px 20px rgba(0,0,0,.12); }
    .kc-sort-menu.open {     display: flex;
    flex-direction: column;
    gap: 7px;; }
    .kc-sort-menu button {    display: block;
    font-family: 'Cairo', sans-serif !important;
    width: 100%;
    padding: 8px 10px;
    border: 0;
    background: none;
    border-radius: 8px;
    font: inherit;
    font-size: 13px;
    text-align: start;
    cursor: pointer;
    background: #f9607f14; }
    .kc-sort-menu button:hover { background:#f5f5f5; }

    /* ===== ملخص التقييمات (Ratings & Reviews) ===== */
    #productStats #starsStats { display:block; }
    .kc-rate { font-family:'Readex Pro',sans-serif; color:#1f1f1f; }
    .kc-rate-top {     display: flex;
    justify-content: center;
    margin-bottom: 22px;
    align-items: flex-start;
    gap: 15px; }
    .kc-rate-title { margin:0; font-size:22px; font-weight:700; color:#1f1f1f; font-family: 'Cairo', sans-serif;}
    .kc-rate-arrow { height: 35px;
    border: 0;
    background: #2196f317;
    color: #f5a524;
    font-size: 20px;
    cursor: pointer;
    padding: 4px 6px;
    border-radius: 50%;
    width: 35px;
    display: flex;
    align-items: center;
    justify-content: center; }
    .kc-rate-body { display:flex; align-items:stretch; gap:0; }
    .kc-rate-summary { flex:0 0 38%; max-width:220px; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:0 12px; }
    .kc-rate-score { font-size:56px; font-weight:700; line-height:1; margin:0 0 14px; color:#1f1f1f; }
    .kc-rate-stars { display:flex; direction:ltr; gap:3px; margin-bottom:12px; }
   .kc-rate-top .kc-rate-arrow i { transform: rotate(270deg);}
    .kc-rstar { font-size:26px; line-height:1;
                background:linear-gradient(90deg,#f5a524 var(--fill),#dcdcdc var(--fill));
                -webkit-background-clip:text; background-clip:text; color:transparent; -webkit-text-fill-color:transparent; }
    .kc-rate-count { font-size:14px; color:#6b6b6b;     font-family: 'Cairo', sans-serif;}
    .kc-rate-divider { flex:0 0 1px; background:#e3e3e3; margin:4px 0; }
    .kc-rate-bars { flex: 1 1 auto;
    display: flex;
    flex-direction: column-reverse;
    justify-content: center;
    gap: 15px;
    min-width: 0;
    background: white;
    border-radius: 15px;
    padding: 29px 19px;
    margin-right: 30px; }
    .kc-rate-row { display:flex; align-items:center; gap:8px; }
    .kc-rate-num { flex:0 0 14px; font-size:15px; font-weight:500; color:#1f1f1f; text-align:center; }
    .kc-rate-track { flex:1 1 auto; height:7.5px; border-radius:999px; background:#e4e4e4; overflow:hidden; }
    .kc-rate-fill { height:100%; border-radius:999px; background:#f5a524; transition:width .4s ease; }
  
  `;
  document.head.appendChild(style);
})();

// ============================================================
//  🔵 زووم وسحب الصورة
// ============================================================

const img = document.getElementById("bidImg");
let scale = 1, originX = 0, originY = 0;
let lastX = 0, lastY = 0, isDragging = false;
let initialPinchDistance = null, lastScale = 1;

img?.addEventListener("wheel", (e) => {
  e.preventDefault();
  const rect = img.getBoundingClientRect();
  const offsetX = e.clientX - rect.left;
  const offsetY = e.clientY - rect.top;
  const delta = e.deltaY > 0 ? -0.1 : 0.1;
  const newScale = Math.min(Math.max(0.5, scale + delta), 4);
  originX -= (offsetX / scale - offsetX / newScale);
  originY -= (offsetY / scale - offsetY / newScale);
  scale = newScale;
  updateTransform();
});
img?.addEventListener("mousedown", (e) => {
  isDragging = true; lastX = e.clientX; lastY = e.clientY;
  img.style.cursor = "grabbing"; preventPageScroll(true);
});
window.addEventListener("mousemove", (e) => {
  if (!isDragging) return;
  originX += (e.clientX - lastX) / scale;
  originY += (e.clientY - lastY) / scale;
  lastX = e.clientX; lastY = e.clientY;
  updateTransform();
});
window.addEventListener("mouseup", () => {
  isDragging = false; if (img) img.style.cursor = "grab"; preventPageScroll(false);
});
img?.addEventListener("touchstart", (e) => {
  if (e.touches.length === 1) {
    isDragging = true;
    lastX = e.touches[0].clientX; lastY = e.touches[0].clientY;
    preventPageScroll(true);
  }
});
img?.addEventListener("touchmove", (e) => {
  if (e.touches.length === 1 && isDragging) {
    originX += (e.touches[0].clientX - lastX) / scale;
    originY += (e.touches[0].clientY - lastY) / scale;
    lastX = e.touches[0].clientX; lastY = e.touches[0].clientY;
    updateTransform();
  }
  if (e.touches.length === 2) {
    e.preventDefault();
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    const distance = Math.hypot(dx, dy);
    if (initialPinchDistance == null) { initialPinchDistance = distance; lastScale = scale; }
    else { scale = Math.min(Math.max(0.5, lastScale * (distance / initialPinchDistance)), 4); updateTransform(); }
  }
}, { passive: false });
img?.addEventListener("touchend", (e) => {
  if (e.touches.length < 2) { isDragging = false; initialPinchDistance = null; preventPageScroll(false); }
});

function updateTransform() {
  if (img) img.style.transform = `translate(${originX}px, ${originY}px) scale(${scale})`;
}
function preventPageScroll(enable) {
  document.body.style.overflow = enable ? "hidden" : "";
}
// ============================================================
//  🟢 نافذة تأكيد عامة (بتتفتح قبل التحميل / حفظ المفضلة)
// ============================================================

window.openConfirmModal = function (title, message, confirmLabel, onConfirm) {
  const overlay = document.getElementById("confirmModalOverlay");
  const titleEl = document.getElementById("confirmModalTitle");
  const msgEl = document.getElementById("confirmModalMessage");
  const confirmBtn = document.getElementById("confirmModalConfirmBtn");
  if (!overlay || !titleEl || !msgEl || !confirmBtn) return;

  titleEl.textContent = title;
  msgEl.textContent = message;
  confirmBtn.textContent = confirmLabel;

  // نستبدل زرار التأكيد بنسخة جديدة عشان نتخلص من أي هاندلر قديم متعلق
  const newConfirmBtn = confirmBtn.cloneNode(true);
  confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
  newConfirmBtn.addEventListener("click", () => {
    closeConfirmModal();
    onConfirm();
  });

  overlay.classList.add("active");
  overlay.style.display = "flex";
};

window.closeConfirmModal = function () {
  const overlay = document.getElementById("confirmModalOverlay");
  if (overlay) {
    overlay.classList.remove("active");
    overlay.style.display = "none";
  }
};

document.getElementById("confirmModalOverlay")?.addEventListener("click", (e) => {
  if (e.target.id === "confirmModalOverlay") closeConfirmModal();
});

window.changeItemImage = function (src) {
  if (!img) return;
  img.style.opacity = 0;
  setTimeout(() => {
    img.src = src; scale = 1; originX = 0; originY = 0;
    updateTransform(); img.style.opacity = 1;
  }, 200);
};

// التحميل الفعلي للصور (بيتنفذ بعد تأكيد المستخدم)
function performDownloadAllImages() {
  document.querySelectorAll(".sm_imgs img").forEach((im, i) => {
    const a = document.createElement("a");
    a.href = im.src; a.download = `kashmir-image-${i + 1}.jpg`; a.click();
  });
}

window.downloadAllImages = function () {
  openConfirmModal(
    "تحميل الصور",
    "هل تريد تحميل جميع صور المنتج؟",
    "تحميل",
    performDownloadAllImages
  );
};

// ============================================================
//  🔍 Lightbox — نافذة تكبير الصور
// ============================================================

const lightboxEl   = document.getElementById("imageLightbox");
const lightboxImg  = document.getElementById("lightboxImg");
const lightboxThumbs = document.getElementById("lightboxThumbs");

let lightboxImages = [];
let lightboxIndex  = 0;

function collectGalleryImages() {
  const srcs = Array.from(document.querySelectorAll(".sm_imgs img"))
    .map((im) => im.src)
    .filter(Boolean);
  // fallback: لو مفيش صور مصغرة، استخدم الصورة الرئيسية فقط
  if (srcs.length === 0 && img?.src) return [img.src];
  return srcs;
}

function renderLightboxThumbs() {
  if (!lightboxThumbs) return;
  lightboxThumbs.innerHTML = "";
  lightboxImages.forEach((src, i) => {
    const t = document.createElement("img");
    t.src = src;
    t.alt = "";
    if (i === lightboxIndex) t.classList.add("active");
    t.addEventListener("click", () => showLightboxImage(i));
    lightboxThumbs.appendChild(t);
  });
}

function showLightboxImage(index) {
  if (!lightboxImages.length) return;
  lightboxIndex = (index + lightboxImages.length) % lightboxImages.length;
  if (lightboxImg) lightboxImg.src = lightboxImages[lightboxIndex];
  lightboxThumbs?.querySelectorAll("img").forEach((t, i) => {
    t.classList.toggle("active", i === lightboxIndex);
  });
}

window.openLightbox = function () {
  lightboxImages = collectGalleryImages();
  if (!lightboxImages.length || !lightboxEl) return;

  const currentSrc = img?.src || "";
  const startIndex = Math.max(0, lightboxImages.indexOf(currentSrc));

  renderLightboxThumbs();
  showLightboxImage(startIndex);

  lightboxEl.classList.add("open");
  document.body.style.overflow = "hidden";
};

window.closeLightbox = function () {
  if (!lightboxEl) return;
  lightboxEl.classList.remove("open");
  document.body.style.overflow = "";
};

window.lightboxStep = function (delta) {
  showLightboxImage(lightboxIndex + delta);
};

// إغلاق عند الضغط خارج الصورة/الأزرار
lightboxEl?.addEventListener("click", (e) => {
  if (e.target === lightboxEl) closeLightbox();
});

// السماح بفتح النافذة بالضغط على الصورة الرئيسية نفسها
img?.addEventListener("click", () => {
  if (!isDragging && scale === 1) window.openLightbox();
});

// التنقل بلوحة المفاتيح
document.addEventListener("keydown", (e) => {
  if (!lightboxEl?.classList.contains("open")) return;
  if (e.key === "Escape") closeLightbox();
  if (e.key === "ArrowLeft") lightboxStep(1);
  if (e.key === "ArrowRight") lightboxStep(-1);
});

// ============================================================
//  🟠 مشاركة + مفضلة
// ============================================================

window.toggleShare = function () {
  const overlay = document.getElementById("shareModalOverlay");
  if (!overlay) return;
  overlay.classList.add("active");
  overlay.style.display = "flex";
};
window.closeShareModal = function () {
  const overlay = document.getElementById("shareModalOverlay");
  if (!overlay) return;
  overlay.classList.remove("active");
  overlay.style.display = "none";
};
window.shareWhatsApp = function () {
  window.open(`https://wa.me/?text=${encodeURIComponent(window.location.href)}`, "_blank");
};
window.shareTelegram = function () {
  window.open(`https://t.me/share/url?url=${encodeURIComponent(window.location.href)}`, "_blank");
};
document.getElementById("shareModalOverlay")?.addEventListener("click", (e) => {
  if (e.target.id === "shareModalOverlay") closeShareModal();
});

// التفعيل/الإلغاء الفعلي للمفضلة (بيتنفذ بعد تأكيد المستخدم)
function performActivateLike(btn) {
  btn.classList.toggle("active");
  const isActive = btn.classList.contains("active");
  const icon = btn.querySelector("i");
  if (icon) {
    icon.classList.toggle("fa-regular", !isActive);
    icon.classList.toggle("fa-solid", isActive);
  }
  showToast(isActive ? "❤️ تمت الإضافة للمفضلة" : "💔 تمت الإزالة", "info");
}

window.activateLike = function (btn) {
  const willActivate = !btn.classList.contains("active");
  if (willActivate) {
    openConfirmModal(
      "إضافة للمفضلة",
      "هل تريد حفظ المنتج في المفضلة؟",
      "حفظ",
      () => performActivateLike(btn)
    );
  } else {
    openConfirmModal(
      "إزالة من المفضلة",
      "هل تريد إزالة المنتج من المفضلة؟",
      "إزالة",
      () => performActivateLike(btn)
    );
  }
};

// ============================================================
//  🟡 بيانات المستخدم من localStorage
// ============================================================

function getCurrentUserName() {
  try {
    const rawData = localStorage.getItem("kashmirUser");
    if (rawData) {
      const u = JSON.parse(rawData);
      const fn = u.firstName || u.name || "";
      const ln = u.lastName  || u.family || "";
      const fullName = (fn + (ln ? " " + ln : "")).trim();
      if (fullName) return fullName;
    }
    return localStorage.getItem("kashmirUserName") || null;
  } catch {
    return localStorage.getItem("kashmirUserName") || null;
  }
}
function getCurrentUserEmail() {
  return localStorage.getItem("kashmirSessionEmail") || "";
}
function getCurrentUserPhoto() {
  return localStorage.getItem("kashmirProfileImg") || "";
}
function emailKey(email) {
  return email.replace(/\./g, "_").replace(/@/g, "__");
}
async function fetchUserPhoto(email) {
  if (!email) return "";
  try {
    const snap = await get(ref(db, `userPhotos/${emailKey(email)}`));
    return snap.exists() ? snap.val() : "";
  } catch { return ""; }
}

(async function loadPhotoFromDB() {
  const email = getCurrentUserEmail();
  if (!email) return;
  try {
    const snap = await get(ref(db, `userPhotos/${emailKey(email)}`));
    if (snap.exists()) {
      localStorage.setItem("kashmirProfileImg", snap.val());
    }
  } catch { /* silent */ }
})();

// ============================================================
//  🟢 ITEM ID من الـ URL
// ============================================================

const ITEM_ID = (function () {
  const params = new URLSearchParams(window.location.search);
  const docId = params.get("docId");
  const col   = params.get("col");
  if (docId) return col ? `${col}-${docId}` : docId;

  const fromQuery = params.get("id");
  if (fromQuery) return fromQuery;

  const parts = window.location.pathname.split("/").filter(Boolean);
  const name  = parts.length >= 2 ? parts[parts.length - 2] : parts[parts.length - 1] || "item";
  return name.replace(/[.#$[\]]/g, "-");
})();

// ============================================================
//  ⭐ نظام النجوم
// ============================================================

let selectedRating = 0;
const colorMap = { 1: "red", 2: "orange", 3: "#f1c40f", 4: "green", 5: "#3498db" };

function updateStarDisplay() {
  document.querySelectorAll(".star").forEach((star) => {
    const num = parseInt(star.getAttribute("data-star"));
    star.classList.toggle("selected", num <= selectedRating);
    star.style.color = num <= selectedRating ? colorMap[selectedRating] : "#ccc";
  });
  const rd = document.getElementById("ratingDisplay");
  if (rd) rd.textContent = selectedRating > 0 ? `التقييم: ${selectedRating} نجمة` : "التقييم: 0 نجوم";
}

document.querySelectorAll(".star").forEach((star) => {
  star.addEventListener("click", () => {
    selectedRating = parseInt(star.getAttribute("data-star"));
    updateStarDisplay();
  });
  star.addEventListener("mouseover", () => {
    const n = parseInt(star.getAttribute("data-star"));
    document.querySelectorAll(".star").forEach((s) => {
      s.style.color = parseInt(s.getAttribute("data-star")) <= n ? colorMap[n] : "#ccc";
    });
  });
  star.addEventListener("mouseout", () => updateStarDisplay());
});

// ============================================================
//  💬 النافذة المنبثقة للتعديل (Modal Functions)
// ============================================================

let editingCommentId = null;

window.openEditModal = function (commentId, currentText) {
  editingCommentId = commentId;
  const modal = document.getElementById("editCommentModal");
  const textarea = document.getElementById("editModalTextarea");

  if (textarea) textarea.value = currentText;
  if (modal) {
    modal.classList.add("active");
    modal.style.display = "flex";
  }
};

window.closeEditModal = function () {
  const modal = document.getElementById("editCommentModal");
  if (modal) {
    modal.classList.remove("active");
    modal.style.display = "none";
  }
  editingCommentId = null;
};

// دالة حذف التعليق من Firebase Direct
window.deleteComment = async function (commentId) {
  if ((await uiConfirm("هل تريد حذف هذا التعليق؟"))) {
    try {
      await remove(ref(db, `comments/${ITEM_ID}/${commentId}`));
      showToast("تم حذف التعليق بنجاح", "info");
    } catch (err) {
      console.error("خطأ أثناء حذف التعليق:", err);
      showToast("تعذر حذف التعليق، حاول لاحقاً", "error");
    }
  }
};

// ============================================================
//  💬 الكومنتس ورسم العناصر
// ============================================================

const AVATAR_COLORS = ["#e74c3c", "#8e44ad", "#3498db", "#f39c12", "#27ae60", "#e67e22", "#1abc9c"];

function getColorForName(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function formatDate(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

const _rtf = (typeof Intl !== "undefined" && Intl.RelativeTimeFormat)
  ? new Intl.RelativeTimeFormat("ar-EG-u-nu-latn", { numeric: "auto" }) : null;

function timeAgo(ts) {
  if (!ts) return "";
  const sec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (sec < 60) return "الآن";
  const steps = [
    [60, "minute"], [3600, "hour"], [86400, "day"],
    [604800, "week"], [2592000, "month"], [31536000, "year"]
  ];
  let idx = 0;
  for (let i = 0; i < steps.length; i++) if (sec >= steps[i][0]) idx = i;
  const val = Math.floor(sec / steps[idx][0]);
  return _rtf ? _rtf.format(-val, steps[idx][1]) : formatDate(ts);
}

// بعد الـ escape: **غامق**  *مائل*  __تحته خط__
function formatRich(s) {
  return s
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/__(.+?)__/g, "<u>$1</u>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>");
}

function starsMarkup(rating) {
  const r = Math.max(0, Math.min(5, Math.round(rating || 0)));
  let html = "";
  for (let i = 1; i <= 5; i++) {
    html += i <= r
      ? '<i class="fa-solid fa-star on"></i>'
      : '<i class="fa-solid fa-star off"></i>';
  }
  return html;
}

// ─── بطاقة التعريف: بتظهر لما تدوس على صورة صاحب التعليق ─────────────────────
const PC_COVERS = {
  sky: "radial-gradient(ellipse at 28% 62%,rgba(255,255,255,.95),transparent 52%),radial-gradient(ellipse at 74% 38%,rgba(255,255,255,.85),transparent 48%),linear-gradient(180deg,#9db7d3,#e1eaf3)",
  sunset: "linear-gradient(135deg,#ff9a8b,#ff6a88 55%,#ff99ac)",
  mint: "linear-gradient(135deg,#84fab0,#8fd3f4)",
  lavender: "linear-gradient(135deg,#a18cd1,#fbc2eb)",
  night: "linear-gradient(135deg,#0f2027,#2c5364)",
  gold: "linear-gradient(135deg,#f6d365,#fda085)",
};
function pcCover(v) {
  v = String(v || "");
  if (v.startsWith("g:") && PC_COVERS[v.slice(2)]) return PC_COVERS[v.slice(2)];
  if (/^data:image\/(jpeg|png|webp);base64,/.test(v) && v.length < 500000) return "url(" + JSON.stringify(v) + ") center/cover no-repeat";
  return PC_COVERS.sky;
}
const pcFmt = (n) => {
  n = Number(n) || 0;
  if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace(/\.0$/, "") + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(n >= 1e4 ? 0 : 1).replace(/\.0$/, "") + "K";
  return String(n);
};
function pcStyle() {
  if (document.getElementById("avbox-style")) return;
  const st = document.createElement("style");
  st.id = "avbox-style";
  st.textContent = ".kc-avatar{cursor:pointer}#avbox{position:fixed;inset:0;background:rgba(0,0,0,.66);z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:16px;font-family:inherit;direction:rtl;overflow-y:auto}#avbox .pcw{position:relative;width:min(400px,100%);margin:auto}#avbox .pc-x{position:absolute;top:18px;left:18px;z-index:5;width:34px;height:34px;border-radius:50%;border:none;background:rgba(255,255,255,.9);color:#333;font-size:15px;cursor:pointer}#avbox .pcard{background:#fff;border-radius:30px;padding:10px 10px 22px;box-shadow:0 12px 40px rgba(30,40,70,.25);text-align:center;color:#1d2433;width:100%;box-sizing:border-box}#avbox .pc-cover{height:150px;border-radius:24px 24px 30px 30px;position:relative}#avbox .pc-plus{position:absolute;top:14px;right:14px;width:44px;height:44px;border-radius:50%;border:none;background:rgba(255,255,255,.9);color:#1d2433;font-size:17px;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.14);display:flex;align-items:center;justify-content:center;transition:transform .15s}#avbox .pc-plus:hover{transform:scale(1.06)}#avbox .pc-plus.on{background:#2bb58f;color:#fff}#avbox .pc-ring{width:118px;height:118px;border-radius:50%;padding:5px;margin:-60px auto 0;position:relative;background:conic-gradient(from 210deg,#ff5f7e,#c05cf0,#4aa8ff,#38d9a9,#ffd43b,#ff5f7e);box-sizing:border-box}#avbox .pc-ava{width:100%;height:100%;border-radius:50%;border:4px solid #fff;box-sizing:border-box;background-size:cover;background-position:center;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:40px}#avbox .pc-name{margin:14px 0 2px;font-size:22px;font-weight:800;color:#1d2433}#avbox .pc-un{font-size:13px;color:#8a93a3;direction:ltr}#avbox .pc-un:empty{display:none}#avbox .pc-bio{margin:10px 22px 0;color:#7b8598;font-size:14.5px;line-height:1.8;white-space:pre-wrap;word-break:break-word}#avbox .pc-bio.mut{color:#a3a9b8}#avbox .pc-stats{display:flex;margin:18px 14px 0;background:#f6f7f9;border:1px solid #e9ebf0;border-radius:18px;padding:14px 6px;box-shadow:0 4px 12px rgba(30,40,70,.06)}#avbox .pc-stats div{flex:1;display:flex;flex-direction:column;gap:3px}#avbox .pc-stats b{font-size:19px;font-weight:800}#avbox .pc-stats span{font-size:13px;color:#8a93a3}#avbox .pc-soc{display:flex;gap:24px;justify-content:center;margin-top:20px;font-size:20px}#avbox .pc-soc a,#avbox .pc-soc span{color:#111;text-decoration:none}#avbox .pc-soc .off{opacity:.2}#avbox .pc-acts{display:flex;justify-content:center;margin-top:12px}#avbox .cb{background:#2b3248;color:#fff;border:none;border-radius:14px;padding:12px 34px;font-family:inherit;font-size:15px;font-weight:800;cursor:pointer}#avbox .cb:hover{background:#3b4075}";
  document.head.appendChild(st);
}
function pcEl(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}
function pcPlusSet(btn, rel) {
  btn.dataset.st = rel;
  btn.innerHTML = rel === "a" ? '<i class="fa-solid fa-check"></i>' : rel === "p" ? '<i class="fa-regular fa-clock"></i>' : '<i class="fa-solid fa-plus"></i>';
  btn.title = rel === "a" ? "بتتابعه — اضغط لإلغاء المتابعة" : rel === "p" ? "في انتظار الموافقة — اضغط لإلغاء الطلب" : "متابعة";
  btn.classList.toggle("on", rel === "a");
}
// متابعة: فورية افتراضياً، وبموافقة لو صاحب الحساب مفعّل «لازم أوافق»
async function pcFollow(targetEmail, targetName, targetUn) {
  const me = String(getCurrentUserEmail() || "").toLowerCase();
  const target = String(targetEmail).toLowerCase();
  const meK = emailKey(me), tk = emailKey(target);
  const ex = await get(ref(db, `follows/${meK}/${tk}/st`));
  if (ex.val()) return ex.val();
  let need = false;
  try { need = (await get(ref(db, `chatProfiles/${tk}/approve`))).val() === true; } catch (e) {}
  let myUn = "";
  try { myUn = (await get(ref(db, `chatProfiles/${meK}/username`))).val() || ""; } catch (e) {}
  const st = need ? "p" : "a", ts = Date.now();
  const up = {
    [`follows/${meK}/${tk}`]: { st, ts, email: target, name: targetName || "", un: targetUn || "" },
    [`followers/${tk}/${meK}`]: { st, ts, email: me, name: getCurrentUserName() || me, un: myUn },
  };
  if (!need) up[`followerCount/${tk}`] = increment(1);
  await update(ref(db), up);
  return st;
}
async function pcUnfollow(targetEmail) {
  const me = String(getCurrentUserEmail() || "").toLowerCase();
  const meK = emailKey(me), tk = emailKey(String(targetEmail).toLowerCase());
  const sn = await get(ref(db, `follows/${meK}/${tk}/st`));
  const up = { [`follows/${meK}/${tk}`]: null, [`followers/${tk}/${meK}`]: null };
  if (sn.val() === "a") up[`followerCount/${tk}`] = increment(-1);
  await update(ref(db), up);
}
function showAvatarBox(email, name, photo) {
  pcStyle();
  document.getElementById("avbox")?.remove();
  const meEmail = String(getCurrentUserEmail() || "").toLowerCase();
  const em = String(email || "").trim().toLowerCase();
  const own = !!em && em === meEmail;
  const okPhoto = /^(data:image\/|https:\/\/)/.test(photo || "");

  const box = pcEl("div"); box.id = "avbox";
  const wrap = pcEl("div", "pcw");
  const x = pcEl("button", "pc-x", "✕"); x.type = "button"; x.setAttribute("aria-label", "إغلاق");
  const card = pcEl("div", "pcard");
  const cover = pcEl("div", "pc-cover"); cover.style.background = PC_COVERS.sky;
  const plus = pcEl("button", "pc-plus"); plus.type = "button"; plus.style.display = "none";
  cover.appendChild(plus);
  const ring = pcEl("div", "pc-ring");
  const ava = pcEl("div", "pc-ava");
  if (okPhoto) ava.style.backgroundImage = `url("${photo.replace(/"/g, "%22")}")`;
  else { ava.style.background = getColorForName(name || "م"); ava.textContent = (name || "م").charAt(0); }
  ring.appendChild(ava);
  const nameEl = pcEl("h3", "pc-name", name || "");
  const unEl = pcEl("div", "pc-un");
  const bioEl = pcEl("p", "pc-bio mut", em ? "…" : "");
  const stats = pcEl("div", "pc-stats");
  const statVals = [];
  ["المتابعين", "بتابعهم", "القصص"].forEach((lab) => {
    const d = pcEl("div"), b = pcEl("b", null, "…"), sp = pcEl("span", null, lab);
    d.appendChild(b); d.appendChild(sp); stats.appendChild(d); statVals.push(b);
  });
  const soc = pcEl("div", "pc-soc");
  const socDefs = [["facebook", "fa-facebook-f"], ["instagram", "fa-instagram"], ["tiktok", "fa-tiktok"]];
  const socEls = socDefs.map(([k, ic]) => { const sp = pcEl("span", "off"); sp.innerHTML = `<i class="fa-brands ${ic}"></i>`; soc.appendChild(sp); return sp; });
  card.append(cover, ring, nameEl, unEl, bioEl, stats, soc);
  wrap.append(x, card);
  if (em && !own) {
    const acts = pcEl("div", "pc-acts");
    const cb = pcEl("button", "cb", "💬 دردشة");
    cb.type = "button";
    cb.onclick = () => { location.href = "../user/accoun.html?chat=" + encodeURIComponent(em) + "&name=" + encodeURIComponent(name || ""); };
    acts.appendChild(cb); wrap.appendChild(acts);
  }
  box.appendChild(wrap);
  box.onclick = (e) => { if (e.target === box || e.target === x) box.remove(); };
  document.body.appendChild(box);
  if (em) pcFill({ em, own, name, box, cover, plus, nameEl, unEl, bioEl, statVals, soc, socEls, socDefs, meEmail });
}
async function pcFill(r) {
  const { em, own, name, box } = r;
  const ek = emailKey(em);
  try {
    const [pSn, cvSn, fcSn, fgSn, stSn, relSn, ver] = await Promise.all([
      get(ref(db, `chatProfiles/${ek}`)), get(ref(db, `chatCovers/${ek}`)), get(ref(db, `followerCount/${ek}`)),
      get(ref(db, `follows/${ek}`)), get(ref(db, `stories/${ek}`)),
      (!own && r.meEmail) ? get(ref(db, `follows/${emailKey(r.meEmail)}/${ek}/st`)) : Promise.resolve(null),
      isVerifiedEmail(em),
    ]);
    if (!box.isConnected) return;
    const p = pSn.val() || {};
    r.cover.style.background = pcCover(cvSn.val());
    const un = UN_OK.test(p.username || "") ? p.username : "";
    r.unEl.textContent = un ? "@" + un : "";
    if (ver) r.nameEl.appendChild(vfIcon());
    const now = Date.now();
    let following = 0, stories = 0;
    fgSn.forEach((c) => { if ((c.val() || {}).st === "a") following++; });
    stSn.forEach((c) => { if ((Number((c.val() || {}).ts) || 0) + 864e5 > now) stories++; });
    [Math.max(0, Number(fcSn.val()) || 0), following, stories].forEach((v, i) => { r.statVals[i].textContent = pcFmt(v); });
    // زرار + (متابعة) أو قلم (حسابي)
    r.plus.style.display = "";
    if (own) {
      r.plus.innerHTML = '<i class="fa-solid fa-pen"></i>';
      r.plus.title = "تعديل بياناتي";
      r.plus.onclick = () => { location.href = "../user/accoun.html"; };
    } else {
      pcPlusSet(r.plus, relSn && relSn.val() === "a" ? "a" : (relSn && relSn.val() === "p" ? "p" : "none"));
      r.plus.onclick = async () => {
        if (!getCurrentUserEmail()) { notify("سجّل دخول الأول عشان تتابع"); return; }
        if (r.plus.dataset.st !== "none" && em === OWNER_EMAIL) { notify("متابعة كشمير هوم إجبارية ومينفعش تتلغي"); return; }
        r.plus.disabled = true;
        try {
          if (r.plus.dataset.st === "none") {
            const st = await pcFollow(em, name, un);
            pcPlusSet(r.plus, st === "a" ? "a" : "p");
            notify(st === "a" ? "تمت المتابعة ✓ تقدر تبعتله رسالة دلوقتي" : "طلب المتابعة اتبعت — مستني موافقته", "ok");
          } else {
            const pend = r.plus.dataset.st === "p";
            if (await uiConfirm(pend ? "هل تريد إلغاء طلب المتابعة؟" : `هل تريد إلغاء متابعة ${name || "الشخص"}؟`, { danger: !pend, ok: pend ? "إلغاء الطلب" : "إلغاء المتابعة" })) {
              await pcUnfollow(em);
              pcPlusSet(r.plus, "none");
            }
          }
        } catch (e) { console.error(e); notify("تعذّر تنفيذ العملية"); }
        r.plus.disabled = false;
      };
    }
    // الخصوصية: النبذة والروابط
    const privacy = ["all", "followers", "none"].includes(p.privacy) ? p.privacy : "all";
    const visible = await canSeeProfile(em, privacy);
    if (!box.isConnected) return;
    if (!visible) { r.bioEl.textContent = "🔒 النبذة والروابط خاصة"; return; }
    const bio = String(p.bio || "").slice(0, 400);
    r.bioEl.textContent = bio || (own ? "اكتب نبذة عن نفسك من الإعدادات ✏️" : "لسه ما كتبش نبذة");
    r.bioEl.className = bio ? "pc-bio" : "pc-bio mut";
    r.socDefs.forEach(([k, ic], i) => {
      const u = /^https:\/\//.test(p[k] || "") ? String(p[k]).slice(0, 300) : "";
      if (!u) return;
      const a = document.createElement("a");
      a.href = u; a.target = "_blank"; a.rel = "noopener noreferrer"; a.title = k;
      a.innerHTML = `<i class="fa-brands ${ic}"></i>`;
      r.socEls[i].replaceWith(a);
    });
  } catch (e) { console.error("profile card:", e); }
}

// ============================================================
//  ✔ التوثيق + 🔒 الخصوصية + @ المنشن
// ============================================================
const OWNER_EMAIL = "oo9mar9988@gmail.com";
let _verifyAtP = null;
const _vfMem = new Map();
function isVerifiedEmail(email) {
  const em = String(email || "").trim().toLowerCase();
  if (!em) return Promise.resolve(false);
  if (em === OWNER_EMAIL) return Promise.resolve(true);
  if (_vfMem.has(em)) return _vfMem.get(em);
  const p = (async () => {
    try {
      const ek = emailKey(em);
      if (!_verifyAtP) _verifyAtP = get(ref(db, "chatSettings/verifyAt")).then((x) => Number(x.val()) || 0).catch(() => 0);
      const [m1, c1, at] = await Promise.all([get(ref(db, `verified/${ek}`)), get(ref(db, `followerCount/${ek}`)), _verifyAtP]);
      const mv = m1.val();
      return mv === true ? true : (mv === false ? false : (at > 0 && (Number(c1.val()) || 0) >= at));
    } catch (e) { return false; }
  })();
  _vfMem.set(em, p);
  return p;
}
function vfIcon() {
  const i = document.createElement("i");
  i.className = "fa-solid fa-circle-check";
  i.title = "حساب موثّق";
  i.style.cssText = "color:#1d9bf0;margin-inline-start:4px;font-size:.9em";
  return i;
}
async function canSeeProfile(ownerEmail, privacy) {
  const viewer = String(getCurrentUserEmail() || "").toLowerCase();
  const owner = String(ownerEmail || "").toLowerCase();
  if (viewer && (viewer === owner || viewer === OWNER_EMAIL)) return true;
  if (privacy === "none") return false;
  if (privacy !== "followers") return true;
  if (!viewer) return false;
  try { const x = await get(ref(db, `follows/${emailKey(viewer)}/${emailKey(owner)}/st`)); return x.val() === "a"; } catch (e) { return false; }
}
const UN_OK = /^[\w\u0600-\u06FF]{6,20}$/;
let _myFollowers = null;
async function loadMyFollowers(force) {
  const me = String(getCurrentUserEmail() || "").toLowerCase();
  if (!me) return [];
  if (_myFollowers && !force) return _myFollowers;
  try {
    const sn = await get(ref(db, `followers/${emailKey(me)}`));
    const seen = new Set();
    _myFollowers = Object.values(sn.val() || {})
      .filter((x) => x && x.st === "a" && UN_OK.test(x.un || "") && x.email && !seen.has(String(x.email).toLowerCase()) && seen.add(String(x.email).toLowerCase()))
      .map((x) => ({ u: x.un, e: String(x.email).toLowerCase(), n: String(x.name || "").slice(0, 60) }));
  } catch (e) { _myFollowers = []; }
  return _myFollowers;
}
async function collectMentions(text) {
  const list = await loadMyFollowers();
  const out = [];
  list.forEach((f) => {
    if (out.length >= 5) return;
    if (new RegExp("@" + f.u + "(?![\\w\\u0600-\\u06FF])").test(text)) out.push({ u: f.u, e: f.e, n: f.n });
  });
  return out;
}
function applyMentions(html, mentions) {
  const known = new Map();
  (Array.isArray(mentions) ? mentions : []).slice(0, 5).forEach((m) => { if (m && UN_OK.test(m.u || "")) known.set(m.u, m); });
  return html.replace(/(^|[\s>(،,.:؛!؟?])@([\w\u0600-\u06FF]{6,20})(?![\w\u0600-\u06FF])/g, (all, pre, u) => {
    const m = known.get(u);
    const attrs = m
      ? ` data-e="${escapeHtml(String(m.e || "").toLowerCase())}" data-n="${escapeHtml(String(m.n || ""))}"`
      : ` data-u="${u}"`;
    return `${pre}<span class="kc-mention"${attrs}>@${u}</span>`;
  });
}
// إشعار للشخص المذكور في الدردشة (هو من متابعيني فالدردشة مسموحة)
async function notifyMentions(mentions, commentText) {
  const me = String(getCurrentUserEmail() || "").toLowerCase();
  if (!me || !mentions.length) return;
  const meK = emailKey(me);
  const myName = getCurrentUserName() || me;
  let myUn = "";
  try { const x = await get(ref(db, `chatProfiles/${meK}/username`)); myUn = x.val() || ""; } catch (e) {}
  const url = location.href.split("#")[0];
  const preview = "📌 ذكرك في تعليق على منتج";
  const pName = (document.getElementById("productName")?.textContent || "").trim().slice(0, 100) || "منتج";
  let pImg = "";
  try { const src = document.getElementById("bidImg")?.src || ""; if (/^https?:\/\//.test(src) && src.length < 700) pImg = src; } catch (e) {}
  const cm = String(commentText || "").replace(/\s+/g, " ").trim().slice(0, 80);
  for (const m of mentions) {
    try {
      const tk = emailKey(m.e);
      const [b1, b2] = await Promise.all([get(ref(db, `chatBlocks/${meK}/${tk}`)), get(ref(db, `chatBlocks/${tk}/${meK}`))]);
      if (b1.val() || b2.val()) continue;
      const cid = [meK, tk].sort().join("~~");
      const mk = push(ref(db, `chats/${cid}/messages`)).key;
      const ts = Date.now();
      await update(ref(db), {
        [`chats/${cid}/messages/${mk}`]: { from: me, ts, type: "mention", text: `${preview}: ${pName}`, url, pt: pName, pi: pImg, cm },
        [`userChats/${meK}/${tk}/email`]: m.e, [`userChats/${meK}/${tk}/name`]: m.n || m.u,
        [`userChats/${meK}/${tk}/last`]: "أنت: " + preview, [`userChats/${meK}/${tk}/ts`]: ts, [`userChats/${meK}/${tk}/un`]: m.u,
        [`userChats/${tk}/${meK}/email`]: me, [`userChats/${tk}/${meK}/name`]: myName,
        [`userChats/${tk}/${meK}/last`]: preview, [`userChats/${tk}/${meK}/ts`]: ts, [`userChats/${tk}/${meK}/un`]: myUn,
        [`userChats/${tk}/${meK}/unread`]: increment(1),
      });
    } catch (e) { console.error("mention notify:", e); }
  }
}
(function () {
  const st = document.createElement("style");
  st.textContent = ".kc-mention{color:#1d9bf0;font-weight:700;cursor:pointer}.kc-mpop{display:none;position:absolute;top:calc(100% + 6px);left:0;right:0;max-width:340px;background:#fff;border:1px solid #e2e2e2;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.18);z-index:50;overflow:hidden}.kc-mpop.open{display:block}.kc-mi{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 14px;cursor:pointer;font-family:'Readex Pro',sans-serif;font-size:13.5px;color:#222}.kc-mi.on,.kc-mi:hover{background:#f2f2f2}.kc-mi em{font-style:normal;color:#888;direction:ltr;font-size:12px}.kc-mi.none{cursor:default;color:#888}";
  document.head.appendChild(st);
  document.addEventListener("click", async (e) => {
    const mEl = e.target.closest && e.target.closest(".kc-mention");
    if (!mEl) return;
    let em = mEl.dataset.e, nm = mEl.dataset.n;
    if (!em && mEl.dataset.u) {
      try {
        const x = await get(ref(db, `chatUsernames/${mEl.dataset.u.toLowerCase()}`));
        em = x.val() ? String(x.val()) : "";
      } catch (er) { em = ""; }
      if (!em) { notify("مفيش مستخدم بالاسم ده"); return; }
      nm = "@" + mEl.dataset.u;
    }
    const ph = await fetchUserPhoto(em);
    showAvatarBox(em, nm, ph);
  });
})();


function createCommentElement({ id, userName, text, createdAt, userPhoto, userEmail, rating, likes = 0, dislikes = 0, mentions = [] }) {
  const commentDiv = document.createElement("div");
  commentDiv.className = "kc-comment";
  commentDiv.dataset.commentId = id;

  // ----- الصورة -----
  const avatar = document.createElement("div");
  avatar.className = "kc-avatar";

  let currentPhoto = userPhoto || "";
  avatar.title = "عرض الصورة";
  avatar.addEventListener("click", (e) => { e.stopPropagation(); showAvatarBox(userEmail, userName, currentPhoto); });

  const setAvatarImage = (photoUrl) => {
    currentPhoto = photoUrl || "";
    if (photoUrl) {
      avatar.style.backgroundImage = `url(${photoUrl})`;
      avatar.style.backgroundColor = "transparent";
      avatar.textContent = "";
    } else {
      avatar.style.backgroundImage = "none";
      avatar.style.backgroundColor = getColorForName(userName || "م");
      avatar.textContent = (userName || "م").charAt(0);
    }
  };
  setAvatarImage(userPhoto);
  if (userEmail) {
    fetchUserPhoto(userEmail).then((p) => { if (p) setAvatarImage(p); });
  }

  // ----- هل صاحب الكومنت (يقدر يعدل/يحذف خلال نص ساعة) -----
  const currentUserEmail = getCurrentUserEmail();
  const isOwner = currentUserEmail && userEmail && currentUserEmail.toLowerCase() === userEmail.toLowerCase();
  const isEditable = isOwner && (Date.now() - (createdAt || 0) < 30 * 60 * 1000);

  // ----- المحتوى -----
  const body = document.createElement("div");
  body.className = "kc-body";
  body.innerHTML = `
    <div class="kc-head">
      <span class="kc-name">${escapeHtml(userName || "مجهول")}</span>
      <span class="kc-time" title="${formatDate(createdAt)}">${timeAgo(createdAt)}</span>
    </div>
    <div class="kc-stars" aria-label="التقييم ${rating || 0} من 5">${starsMarkup(rating)}</div>
    <p class="kc-text">${applyMentions(formatRich(escapeHtml(text || "")), mentions)}</p>
    <div class="kc-actions">
      <button type="button" class="kc-vote kc-like">
        <i class="fa-regular fa-thumbs-up"></i><span class="like-count">${likes}</span>
      </button>
      <button type="button" class="kc-vote kc-dislike">
        <i class="fa-regular fa-thumbs-down"></i><span class="dislike-count">${dislikes}</span>
      </button>
      ${isEditable ? `
      <div class="kc-menu-wrap">
        <button type="button" class="kc-menu-btn" aria-label="المزيد"><i class="fa-solid fa-ellipsis"></i></button>
        <div class="kc-menu">
          <button type="button" class="kc-edit"><i class="fa-solid fa-pen"></i> تعديل</button>
          <button type="button" class="kc-delete"><i class="fa-solid fa-trash"></i> حذف</button>
        </div>
      </div>` : ""}
    </div>
  `;

  if (userEmail) {
    const nameEl = body.querySelector(".kc-name");
    isVerifiedEmail(userEmail).then((v) => { if (v && nameEl && !nameEl.querySelector(".fa-circle-check")) nameEl.appendChild(vfIcon()); });
  }

  if (isEditable) {
    const menu = body.querySelector(".kc-menu");
    body.querySelector(".kc-menu-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      document.querySelectorAll(".kc-menu.open").forEach((m) => { if (m !== menu) m.classList.remove("open"); });
      menu.classList.toggle("open");
    });
    body.querySelector(".kc-edit").addEventListener("click", () => {
      menu.classList.remove("open");
      openEditModal(id, text || "");
    });
    body.querySelector(".kc-delete").addEventListener("click", () => {
      menu.classList.remove("open");
      deleteComment(id);
    });
  }

  commentDiv.appendChild(avatar);
  commentDiv.appendChild(body);
  setTimeout(() => attachReactionEvents(commentDiv, id), 0);
  return commentDiv;
}

// قفل قائمة (...) لما المستخدم يدوس بره
document.addEventListener("click", () => {
  document.querySelectorAll(".kc-menu.open").forEach((m) => m.classList.remove("open"));
});

// ─── Like / Dislike ──────────────────────────────────────────

function attachReactionEvents(commentDiv, id) {
  const likeBtn    = commentDiv.querySelector(".kc-like");
  const dislikeBtn = commentDiv.querySelector(".kc-dislike");
  const voteKey    = `vote_${ITEM_ID}_${id}`;
  const prev       = localStorage.getItem(voteKey);

  if (prev === "like")    applyVotedStyle(likeBtn,    "like",    true);
  if (prev === "dislike") applyVotedStyle(dislikeBtn, "dislike", true);

  likeBtn?.addEventListener("click",    () => handleVote(id, "like",    likeBtn, dislikeBtn));
  dislikeBtn?.addEventListener("click", () => handleVote(id, "dislike", likeBtn, dislikeBtn));
}

function applyVotedStyle(btn, type, on) {
  if (!btn) return;
  btn.classList.toggle("voted", !!on);
  const icon = btn.querySelector("i");
  if (icon) {
    icon.classList.toggle("fa-solid", !!on);
    icon.classList.toggle("fa-regular", !on);
  }
}

function animateLike(btn) {
  btn.animate([
    { transform: "scale(1)",    offset: 0    },
    { transform: "scale(1.5)",  offset: 0.35 },
    { transform: "scale(1.3)",  offset: 0.5  },
    { transform: "scale(1.1)",  offset: 0.75 },
    { transform: "scale(1)",    offset: 1    }
  ], { duration: 600, easing: "cubic-bezier(0.34,1.56,0.64,1)" });

  const colors = ["#e8590c","#ff7a2f","#f5a524","#ff8a50","#e8590c"];
  for (let i = 0; i < 7; i++) {
    const p     = document.createElement("span");
    p.textContent = "♥";
    const angle  = (i / 7) * 360;
    const radius = 30 + Math.random() * 16;
    const tx = Math.cos((angle * Math.PI) / 180) * radius;
    const ty = Math.sin((angle * Math.PI) / 180) * radius;
    p.style.cssText = `
      position:absolute; pointer-events:none; z-index:9999;
      font-size:${11 + Math.random() * 8}px;
      color:${colors[Math.floor(Math.random() * colors.length)]};
      left:50%; top:50%;
      transform:translate(-50%,-50%);
      animation: likeParticle 0.75s ease-out forwards;
      --tx:${tx}px; --ty:${ty}px;
    `;
    btn.appendChild(p);
    setTimeout(() => p.remove(), 800);
  }
}

function animateDislike(btn) {
  btn.animate([
    { transform: "translateX(0)"   },
    { transform: "translateX(-5px)"},
    { transform: "translateX(5px)" },
    { transform: "translateX(-4px)"},
    { transform: "translateX(4px)" },
    { transform: "translateX(0)"   }
  ], { duration: 350, easing: "ease-out" });
}

async function handleVote(commentId, type, likeBtn, dislikeBtn) {
  const voteKey = `vote_${ITEM_ID}_${commentId}`;
  const prev    = localStorage.getItem(voteKey);
  const comRef  = ref(db, `comments/${ITEM_ID}/${commentId}`);
  try {
    const snap = await get(comRef);
    if (!snap.exists()) return;
    const data = snap.val();
    let likes    = data.likes    || 0;
    let dislikes = data.dislikes || 0;

    if (prev === type) {
      if (type === "like") likes--; else dislikes--;
      localStorage.removeItem(voteKey);
      applyVotedStyle(likeBtn,    "like",    false);
      applyVotedStyle(dislikeBtn, "dislike", false);
    } else {
      if (prev === "like")    { likes--;    applyVotedStyle(likeBtn,    "like",    false); }
      if (prev === "dislike") { dislikes--; applyVotedStyle(dislikeBtn, "dislike", false); }

      if (type === "like") {
        likes++;
        applyVotedStyle(likeBtn, "like", true);
        animateLike(likeBtn);
      } else {
        dislikes++;
        applyVotedStyle(dislikeBtn, "dislike", true);
        animateDislike(dislikeBtn);
      }
      localStorage.setItem(voteKey, type);
    }

    await update(comRef, { likes: Math.max(0, likes), dislikes: Math.max(0, dislikes) });

    const card = document.querySelector(`[data-comment-id="${commentId}"]`);
    if (card) {
      const lc = card.querySelector(".like-count");
      const dc = card.querySelector(".dislike-count");
      if (lc) lc.textContent = Math.max(0, likes);
      if (dc) dc.textContent = Math.max(0, dislikes);
    }
  } catch (err) { console.error("خطأ في التصويت:", err); }
}

// ============================================================
//  💬 الكومنتس والترتيب
// ============================================================

let allComments  = [];
let visibleCount = 5;
let currentSortMethod = "latest";

window.changeCommentSort = function(sortType) {
  currentSortMethod = sortType;
  const lbl = document.getElementById("kcSortLabel");
  if (lbl) lbl.textContent = sortType === "highest" ? "الأعلى تقييماً" : "الأحدث";
  document.getElementById("kcSortMenu")?.classList.remove("open");
  sortAndRenderComments();
};

function sortAndRenderComments() {
  if (currentSortMethod === "latest") {
    allComments.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  } else if (currentSortMethod === "highest") {
    allComments.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  }
  renderComments();
}

function loadComments() {
  onValue(ref(db, `comments/${ITEM_ID}`), (snapshot) => {
    const freshComments = [];
    if (snapshot.exists()) {
      snapshot.forEach((childSnapshot) => {
        freshComments.push({
          id: childSnapshot.key,
          ...childSnapshot.val()
        });
      });
    }

    allComments = freshComments;
    sortAndRenderComments();
    updateProductStats();
    updateCommentCount();
    renderHeaderRating();
  });
}

function renderComments() {
  const container = document.getElementById("commentsContainer");
  if (!container) return;
  container.innerHTML = "";

  if (allComments.length === 0) {
    container.innerHTML = `<p style="    text-align: center;
    color: #636363;
    padding: 7px;
    direction: rtl;
    font-family: 'Readex Pro', sans-serif;
    font-size: 12px;">لا يوجد تعليقات بعد — كن أول من يقيّم! 🌟</p>`;
    const lb = document.getElementById("loadMoreBtn");
    if (lb) lb.style.display = "none";
    return;
  }

  allComments.slice(0, visibleCount).forEach((c) => container.appendChild(createCommentElement(c)));

  const lb = document.getElementById("loadMoreBtn");
  if (lb) lb.style.display = visibleCount < allComments.length ? "block" : "none";
}

window.loadMoreComments = function () {
  visibleCount += 5;
  renderComments();
};

// ============================================================
//  📊 إحصائيات التقييم
// ============================================================

// ============================================================
//  ⭐ ملخص التقييم أعلى المنتج (بجانب الاسم)
// ============================================================

function renderHeaderRating() {
  const starsEl = document.getElementById("ratingSummaryStars");
  const scoreEl = document.getElementById("ratingSummaryScore");
  const countEl = document.getElementById("ratingSummaryCount");
  if (!starsEl || !scoreEl || !countEl) return;

  const total = allComments.length;
  const sum   = allComments.reduce((acc, c) => acc + (c.rating || 0), 0);
  const average = total > 0 ? sum / total : 0;

  starsEl.innerHTML = "";
  for (let i = 1; i <= 5; i++) {
    const diff = average - (i - 1);
    let iconClass;
    if (diff >= 1) iconClass = "fa-solid fa-star";
    else if (diff >= 0.5) iconClass = "fa-solid fa-star-half-stroke";
    else iconClass = "fa-regular fa-star";
    const i_el = document.createElement("i");
    i_el.className = iconClass;
    starsEl.appendChild(i_el);
  }

  scoreEl.textContent = total > 0 ? average.toFixed(1) : "0.0";
  countEl.textContent = ` ( ${total} تقييم )`;
}

function updateProductStats() {
  const box = document.getElementById("starsStats");
  if (!box) return;

  const counts = [0, 0, 0, 0, 0];
  allComments.forEach((c) => { if (c.rating >= 1 && c.rating <= 5) counts[c.rating - 1]++; });
  const total = counts.reduce((x, y) => x + y, 0);
  const avg   = total > 0 ? counts.reduce((s, n, i) => s + n * (i + 1), 0) / total : 0;

  const fmtCount = (n) => n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, "") + " ألف" : String(n);

  let starsHtml = "";
  for (let i = 1; i <= 5; i++) {
    const fill = Math.max(0, Math.min(1, avg - (i - 1))) * 100;
    starsHtml += `<span class="kc-rstar" style="--fill:${fill}%">★</span>`;
  }

  let rowsHtml = "";
  for (let i = 5; i >= 1; i--) {
    const pct = total > 0 ? (counts[i - 1] / total) * 100 : 0;
    rowsHtml += `
      <div class="kc-rate-row">
        <span class="kc-rate-num">${i}</span>
        <div class="kc-rate-track"><div class="kc-rate-fill" style="width:${pct}%"></div></div>
      </div>`;
  }

  box.innerHTML = `
    <div class="kc-rate">
      <div class="kc-rate-top">
        <h3 class="kc-rate-title">التقييمات والمراجعات</h3>
        <button type="button" class="kc-rate-arrow" aria-label="عرض التعليقات"
          onclick="document.querySelector('.kc-list-head')?.scrollIntoView({behavior:'smooth',block:'start'})">
          <i class="fa-solid fa-arrow-left"></i>
        </button>
      </div>
      <div class="kc-rate-body">
        <div class="kc-rate-summary">
          <div class="kc-rate-score">${avg.toFixed(1)}</div>
          <div class="kc-rate-stars" aria-label="متوسط التقييم ${avg.toFixed(1)} من 5">${starsHtml}</div>
          <div class="kc-rate-count">(${fmtCount(total)} مراجعة)</div>
        </div>
        <div class="kc-rate-divider"></div>
        <div class="kc-rate-bars">${rowsHtml}</div>
      </div>
    </div>`;
}

function updateCommentCount() {
  const el = document.getElementById("totalComments");
  if (el) el.textContent = allComments.length;
}

// ============================================================
//  📝 نشر كومنت جديد
// ============================================================

let isPosting = false;

window.postComment = async function () {
  if (isPosting) return;

  const userName = getCurrentUserName();
  if (!userName) {
    showToast("يجب تسجيل الدخول أولاً لإضافة تعليق! 🔒", "error");
    return;
  }

  const commentInput = document.getElementById("commentInput");
  const submitBtn    = document.getElementById("button");
  const text         = commentInput?.value?.trim();

  if (!text) { 
    showToast("يرجى كتابة تعليق! ✍️", "info"); 
    commentInput?.focus(); 
    return; 
  }
  if (selectedRating === 0) { 
    showToast("يرجى اختيار تقييم من النجوم! ⭐", "info"); 
    return; 
  }
  if (text.length > 500) { 
    showToast("التعليق طويل جداً (500 حرف كحد أقصى)", "error"); 
    return; 
  }

  isPosting = true;
  if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = " جاري النشر... "; }

  const email = getCurrentUserEmail();
  
  let userPhoto = getCurrentUserPhoto();
  if (email) {
    const fetchedPhoto = await fetchUserPhoto(email);
    if (fetchedPhoto) userPhoto = fetchedPhoto;
  }

  let mentions = [];
  try { mentions = await collectMentions(text); } catch (e) { mentions = []; }

  try {
    await push(ref(db, `comments/${ITEM_ID}`), {
      ...(mentions.length ? { mentions } : {}),
      userName,
      userEmail: email || "",
      userPhoto: userPhoto || "",
      text,
      rating:    selectedRating,
      likes:     0,
      dislikes:  0,
      createdAt: Date.now()
    });

    if (mentions.length) notifyMentions(mentions, text).catch(() => {});
    commentInput.value = "";
    selectedRating = 0;
    updateStarDisplay();
    showToast("✅ تم نشر تعليقك بنجاح!", "success");
  } catch (err) {
    console.error("خطأ في إضافة الكومنت:", err);
    showToast("❌ حصل خطأ، حاول مرة تانية", "error");
  } finally {
    isPosting = false;
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = "نشر"; }
  }
};

// ============================================================
//  🔔 Toast + 🔒 XSS
// ============================================================

function showToast(msg, type = "info") {
  let t = document.getElementById("toast-item");
  if (!t) {
    t = document.createElement("div"); t.id = "toast-item";
    t.style.cssText = `position:fixed;bottom:30px;left:50%;
      transform:translateX(-50%) translateY(70px);background:#1a1a2e;color:#fff;
      padding:12px 24px;border-radius:10px;font-family:'Readex Pro',sans-serif;
      font-size:14px;direction:rtl;box-shadow:0 4px 20px rgba(0,0,0,.25);z-index:9999;
      opacity:0;transition:opacity .3s,transform .3s;border-right:4px solid #c8a96e;white-space:nowrap;`;
    document.body.appendChild(t);
  }
  t.style.borderRightColor = { success:"#2e7d32", error:"#e53935", info:"#c8a96e" }[type] || "#c8a96e";
  t.textContent = msg;
  requestAnimationFrame(() => { t.style.opacity="1"; t.style.transform="translateX(-50%) translateY(0)"; });
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.style.opacity="0"; t.style.transform="translateX(-50%) translateY(70px)"; }, 3000);
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
                    .replace(/"/g,"&quot;").replace(/'/g,"&#039;");
}

// ============================================================
//  🚀 تشغيل المستمعات والحدث (Event Listeners)
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
  loadComments();

  // ربط زر الحفظ الخاص بالـ Modal
  document.getElementById("saveEditModalBtn")?.addEventListener("click", async () => {
    if (!editingCommentId) return;

    const newText = document.getElementById("editModalTextarea")?.value?.trim();
    if (!newText) {
      showToast("لا يمكن ترك التعليق فارغاً!", "error");
      return;
    }

    try {
      await update(ref(db, `comments/${ITEM_ID}/${editingCommentId}`), {
        text: newText,
        editedAt: Date.now()
      });
      
      showToast("تم تعديل التعليق بنجاح ✨", "success");
      closeEditModal();
    } catch (err) {
      console.error("خطأ أثناء تعديل التعليق:", err);
      showToast("تعذر تعديل التعليق، حاول لاحقاً", "error");
    }
  });

  // ربط زر النشر الرئيسي
  const postBtn = document.getElementById("button");
  if (postBtn) {
    postBtn.addEventListener("click", window.postComment);
  }
});

// ============================================================
//  ✍️ أدوات صندوق التعليق (غامق/مائل/خط/إيموجي/منشن) + قائمة الترتيب
// ============================================================
(function setupComposer() {
  const input = document.getElementById("commentInput");
  if (!input) return;

  function insertAtCursor(text) {
    const s = input.selectionStart ?? input.value.length;
    const e = input.selectionEnd ?? input.value.length;
    input.value = input.value.slice(0, s) + text + input.value.slice(e);
    const pos = s + text.length;
    input.focus();
    input.setSelectionRange(pos, pos);
  }

  function wrapSelection(mark) {
    const s = input.selectionStart, e = input.selectionEnd;
    const sel = input.value.slice(s, e);
    input.value = input.value.slice(0, s) + mark + sel + mark + input.value.slice(e);
    input.focus();
    if (sel) input.setSelectionRange(s + mark.length, e + mark.length);
    else input.setSelectionRange(s + mark.length, s + mark.length);
  }

  const marks = { bold: "**", italic: "*", underline: "__" };
  document.querySelectorAll(".kc-tool[data-fmt]").forEach((b) =>
    b.addEventListener("click", () => wrapSelection(marks[b.dataset.fmt])));

  const pop = document.getElementById("kcEmojiPop");
  const emojis = ["😀","😍","👍","❤️","🔥","👏","😂","😊","🙏","💯","⭐","🎉","😢","😡","🤩","👌","🛏️","✨"];
  if (pop) {
    emojis.forEach((em) => {
      const b = document.createElement("button");
      b.type = "button"; b.textContent = em;
      b.addEventListener("click", () => { insertAtCursor(em); pop.classList.remove("open"); });
      pop.appendChild(b);
    });
  }
  document.getElementById("kcEmojiBtn")?.addEventListener("click", (e) => {
    e.stopPropagation(); pop?.classList.toggle("open");
  });
  document.getElementById("kcMentionBtn")?.addEventListener("click", () => insertAtCursor("@"));

  document.getElementById("kcSortBtn")?.addEventListener("click", (e) => {
    e.stopPropagation(); document.getElementById("kcSortMenu")?.classList.toggle("open");
  });

  document.addEventListener("click", (e) => {
    if (pop && !pop.contains(e.target)) pop.classList.remove("open");
    document.getElementById("kcSortMenu")?.classList.remove("open");
  });

  // ----- @ : قايمة الناس اللي بيتابعوني عشان أذكرهم -----
  const comp = input.closest(".kc-composer") || input.parentElement;
  comp.style.position = "relative";
  const mpop = document.createElement("div");
  mpop.className = "kc-mpop";
  comp.appendChild(mpop);
  let mItems = [], mIdx = 0, mStart = -1;
  const closeM = () => { mpop.classList.remove("open"); mItems = []; mStart = -1; };
  const renderM = (hint) => {
    if (hint) { mpop.innerHTML = `<div class="kc-mi none">${hint}</div>`; mpop.classList.add("open"); return; }
    mpop.innerHTML = mItems.map((f, i) => `<div class="kc-mi${i === mIdx ? " on" : ""}" data-i="${i}"><b>${escapeHtml(f.n || f.u)}</b><em>@${escapeHtml(f.u)}</em></div>`).join("");
    mpop.classList.toggle("open", mItems.length > 0);
  };
  const pick = (f) => {
    const pos = input.selectionStart;
    const before = input.value.slice(0, mStart);
    const after = input.value.slice(pos);
    input.value = before + "@" + f.u + " " + after;
    const np = (before + "@" + f.u + " ").length;
    input.focus(); input.setSelectionRange(np, np);
    closeM();
  };
  async function updateM() {
    const pos = input.selectionStart;
    const m = input.value.slice(0, pos).match(/(^|\s)@([\w\u0600-\u06FF]{0,20})$/);
    if (!m) { closeM(); return; }
    if (!getCurrentUserEmail()) { closeM(); return; }
    mStart = pos - m[2].length - 1;
    const q = m[2].toLowerCase();
    const list = await loadMyFollowers();
    if (!list.length) { mItems = []; renderM("مفيش متابعين تقدر تذكرهم لسه"); return; }
    mItems = list.filter((f) => !q || f.u.toLowerCase().includes(q) || f.n.toLowerCase().includes(q)).slice(0, 6);
    mIdx = 0;
    if (!mItems.length) { renderM("مفيش نتايج"); return; }
    renderM();
  }
  input.addEventListener("input", updateM);
  input.addEventListener("click", updateM);
  input.addEventListener("keydown", (e) => {
    if (!mpop.classList.contains("open") || !mItems.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); mIdx = (mIdx + 1) % mItems.length; renderM(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); mIdx = (mIdx - 1 + mItems.length) % mItems.length; renderM(); }
    else if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); pick(mItems[mIdx]); }
    else if (e.key === "Escape") closeM();
  });
  mpop.addEventListener("mousedown", (e) => {
    e.preventDefault();
    const r = e.target.closest(".kc-mi[data-i]");
    if (r) pick(mItems[Number(r.dataset.i)]);
  });
  document.getElementById("kcMentionBtn")?.addEventListener("click", () => setTimeout(updateM, 0));
  document.addEventListener("click", (e) => { if (!mpop.contains(e.target) && e.target !== input) closeM(); });
})();

// ============================================================
//  رسايل التأكيد والتنبيه داخل الصفحة (بدل نوافذ المتصفح)
// ============================================================
function _uiStyle(){
  if(document.getElementById("ui-dlg-style"))return;
  const st=document.createElement("style");st.id="ui-dlg-style";
  st.textContent="#uiToast{position:fixed;left:50%;bottom:28px;transform:translateX(-50%) translateY(20px);background:#2b3248;color:#fff;padding:12px 20px;border-radius:14px;font-family:inherit;font-size:14px;z-index:2147483600;box-shadow:0 10px 30px rgba(0,0,0,.3);opacity:0;transition:opacity .25s,transform .25s;max-width:min(92vw,460px);text-align:center;direction:rtl;pointer-events:none;display:flex;align-items:center;gap:10px;line-height:1.7}#uiToast.show{opacity:1;transform:translateX(-50%) translateY(0)}#uiToast.err{background:#c62828}#uiToast.ok{background:#1b9a74}.ui-ov{position:fixed;inset:0;background:rgba(15,20,40,.55);z-index:2147483500;display:flex;align-items:center;justify-content:center;padding:16px;font-family:inherit;direction:rtl;animation:uiFade .15s}.ui-box{background:#fff;border-radius:20px;padding:24px 22px 18px;width:min(380px,100%);box-shadow:0 20px 60px rgba(0,0,0,.3);text-align:center;animation:uiPop .18s;box-sizing:border-box}.ui-ic{width:54px;height:54px;border-radius:50%;margin:0 auto 12px;display:flex;align-items:center;justify-content:center;font-size:22px;background:#eaf8f2;color:#1b9a74}.ui-box.danger .ui-ic{background:#fdecea;color:#e53935}.ui-box h4{margin:0 0 8px;font-size:17px;color:#1d2433}.ui-box p{margin:0 0 18px;font-size:14px;color:#5b6475;line-height:1.9;white-space:pre-line}.ui-btns{display:flex;gap:10px}.ui-btns button{flex:1;border:none;border-radius:12px;padding:12px;font-family:inherit;font-weight:800;font-size:14px;cursor:pointer}.ui-btns .no{background:#eef1f6;color:#4a5468}.ui-btns .yes{background:#2bb58f;color:#fff}.ui-box.danger .yes{background:#e53935}@keyframes uiFade{from{opacity:0}to{opacity:1}}@keyframes uiPop{from{transform:scale(.92);opacity:0}to{transform:scale(1);opacity:1}}";
  document.head.appendChild(st);
}
function notify(msg,type){
  _uiStyle();
  const text=String(msg==null?"":msg);
  const t=type||(/تعذّر|مشكلة|راجع قواعد|مش بيدعم|لازم تسمح|أكبر|غير متاح|مفيش/.test(text)?"err":"info");
  let el=document.getElementById("uiToast");
  if(!el){el=document.createElement("div");el.id="uiToast";document.body.appendChild(el);}
  clearTimeout(el._t);
  el.className=t;
  el.innerHTML='<i class="fa-solid '+(t==="err"?"fa-circle-exclamation":t==="ok"?"fa-circle-check":"fa-circle-info")+'"></i><span></span>';
  el.querySelector("span").textContent=text;
  void el.offsetWidth;
  el.classList.add("show");
  el._t=setTimeout(()=>el.classList.remove("show"),3400);
}
function uiConfirm(msg,o){
  _uiStyle();
  o=o||{};
  const text=String(msg==null?"":msg);
  const danger=o.danger!==undefined?o.danger:/حذف|مسح|حظر|إلغاء|رفض|إزالة|نهائي/.test(text);
  const yesTxt=o.ok||(/حذف/.test(text)?"حذف":/مسح/.test(text)?"مسح":/حظر/.test(text)?"حظر":/إزالة/.test(text)?"إزالة":/رفض/.test(text)?"رفض":/إرسال/.test(text)?"إرسال":"تأكيد");
  return new Promise(res=>{
    document.getElementById("uiConfirm")?.remove();
    const ov=document.createElement("div");ov.id="uiConfirm";ov.className="ui-ov";
    ov.innerHTML='<div class="ui-box'+(danger?" danger":"")+'" role="dialog" aria-modal="true"><div class="ui-ic"><i class="fa-solid '+(danger?"fa-triangle-exclamation":"fa-circle-question")+'"></i></div><h4></h4><p></p><div class="ui-btns"><button type="button" class="no">إلغاء</button><button type="button" class="yes"></button></div></div>';
    ov.querySelector("h4").textContent=o.title||(danger?"تأكيد العملية":"تأكيد");
    ov.querySelector("p").textContent=text;
    ov.querySelector(".yes").textContent=yesTxt;
    document.body.appendChild(ov);
    const key=e=>{if(e.key==="Escape"){e.stopPropagation();done(false);}};
    const done=v=>{document.removeEventListener("keydown",key,true);ov.remove();res(v);};
    document.addEventListener("keydown",key,true);
    ov.querySelector(".no").onclick=()=>done(false);
    ov.querySelector(".yes").onclick=()=>done(true);
    ov.addEventListener("click",e=>{if(e.target===ov)done(false);});
    (danger?ov.querySelector(".no"):ov.querySelector(".yes")).focus();
  });
}