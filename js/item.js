// ============================================================
//  item.js — كشمير هوم
//  نظام التعليقات والتقييمات + Firebase Realtime Database
// ============================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getDatabase, ref, push, set, get, onValue, update, remove
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
    .like-btn.voted i   { color: #e53935 !important; }
    .dislike-btn.voted i { color: #888 !important; }
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
  if (confirm("هل أنت تأكد من رغبتك في حذف هذا التعليق؟")) {
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

function createCommentElement({ id, userName, text, createdAt, userPhoto, userEmail, rating, likes = 0, dislikes = 0 }) {
  const commentDiv = document.createElement("div");
  commentDiv.className = "comment";
  commentDiv.dataset.commentId = id;

  const avatar = document.createElement("div");
  avatar.className = "avatar";

  const setAvatarImage = (photoUrl) => {
    if (photoUrl) {
      avatar.style.backgroundImage    = `url(${photoUrl})`;
      avatar.style.backgroundSize     = "cover";
      avatar.style.backgroundPosition = "center";
      avatar.style.backgroundColor    = "transparent";
      avatar.textContent              = "";
    } else {
      avatar.style.backgroundImage    = "none";
      avatar.style.backgroundColor    = getColorForName(userName || "م");
      avatar.textContent              = (userName || "م").charAt(0);
    }
  };

  setAvatarImage(userPhoto);

  if (userEmail) {
    fetchUserPhoto(userEmail).then((latestPhoto) => {
      if (latestPhoto) setAvatarImage(latestPhoto);
    });
  }

  const content = document.createElement("div");
  content.className = "comment-content";
  const starsHtml = '<i class="fa-solid fa-star" id="star"></i>'.repeat(rating || 0);

  const currentUserEmail = getCurrentUserEmail();
  const isOwner = currentUserEmail && userEmail && currentUserEmail.toLowerCase() === userEmail.toLowerCase();
  const HALF_HOUR_MS = 30 * 60 * 1000;
  const isEditable = isOwner && (Date.now() - (createdAt || 0) < HALF_HOUR_MS);

  let actionBtnsHtml = "";
  if (isEditable) {
    actionBtnsHtml = `
      <div class="comment-action-btns" style="display:flex;gap:10px;">
        <button class="edit-comment-btn" onclick="openEditModal('${id}', '${escapeHtml(text || "")}')" style="background:none;border:none;color:#3498db;cursor:pointer;font-size:13px;"><i class="fa-solid fa-pen"></i> تعديل</button>
        <button class="delete-comment-btn" onclick="deleteComment('${id}')" style="background:none;border:none;color:#e53935;cursor:pointer;font-size:13px;"><i class="fa-solid fa-trash"></i> حذف</button>
      </div>
    `;
  }

  content.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;">
      <div class="comment-name">${escapeHtml(userName || "مجهول")}</div>
      ${actionBtnsHtml}
    </div>
    <div class="comment-date comment-stars">${formatDate(createdAt)}</div>
    <div class="comment-text">${starsHtml}</div>
    <div class="comment-text comment-text-body">${escapeHtml(text || "")}</div>
  `;

  const reactionDiv = document.createElement("div");
  reactionDiv.className = "comment-reactions";
  reactionDiv.innerHTML = `
    <button class="dislike-btn" data-comment-id="${id}">
      <i class="fa-regular fa-thumbs-down"></i>
      <span class="dislike-count">${dislikes}</span>
    </button>
    <span class="vote-separator"></span>
    <button class="like-btn" data-comment-id="${id}" style="position:relative;overflow:visible;">
      <i class="fa-regular fa-thumbs-up"></i>
      <span class="like-count">${likes}</span>
    </button>
  `;

  commentDiv.appendChild(avatar);
  commentDiv.appendChild(content);
  commentDiv.appendChild(reactionDiv);
  setTimeout(() => attachReactionEvents(commentDiv, id), 0);
  return commentDiv;
}

// ─── Like / Dislike ──────────────────────────────────────────

function attachReactionEvents(commentDiv, id) {
  const likeBtn    = commentDiv.querySelector(".like-btn");
  const dislikeBtn = commentDiv.querySelector(".dislike-btn");
  const voteKey    = `vote_${ITEM_ID}_${id}`;
  const prev       = localStorage.getItem(voteKey);

  if (prev === "like")    applyVotedStyle(likeBtn,    "like",    true);
  if (prev === "dislike") applyVotedStyle(dislikeBtn, "dislike", true);

  likeBtn?.addEventListener("click",    () => handleVote(id, "like",    likeBtn, dislikeBtn));
  dislikeBtn?.addEventListener("click", () => handleVote(id, "dislike", likeBtn, dislikeBtn));
}

function applyVotedStyle(btn, type, on) {
  if (!btn) return;
  const icon = btn.querySelector("i");
  if (on) {
    btn.classList.add("voted");
    if (type === "like") {
      btn.style.color      = "#e53935";
      btn.style.background = "#fff0f0";
      btn.style.border     = "1.5px solid #e53935";
      btn.style.transition = "all 0.25s ease";
      if (icon) { icon.style.color = "#e53935"; icon.classList.replace("fa-regular","fa-solid"); }
    } else {
      btn.style.color      = "#555";
      btn.style.background = "#f0f0f0";
      btn.style.border     = "1.5px solid #aaa";
      btn.style.transition = "all 0.25s ease";
      if (icon) { icon.style.color = "#555"; icon.classList.replace("fa-regular","fa-solid"); }
    }
  } else {
    btn.classList.remove("voted");
    btn.style.color      = "";
    btn.style.background = "";
    btn.style.border     = "";
    if (icon) { icon.style.color = ""; icon.classList.replace("fa-solid","fa-regular"); }
  }
}

function animateLike(btn) {
  btn.animate([
    { transform: "scale(1)",    offset: 0    },
    { transform: "scale(3.8)",  offset: 0.35 },
    { transform: "scale(2.8)",  offset: 0.5  },
    { transform: "scale(1.2)",  offset: 0.75 },
    { transform: "scale(1)",    offset: 1    }
  ], { duration: 600, easing: "cubic-bezier(0.34,1.56,0.64,1)" });

  const colors = ["#e53935","#ff5252","#ff4081","#f06292","#e91e63"];
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
  const statsContainer = document.getElementById("starsStats");
  if (!statsContainer) return;

  const counts = [0, 0, 0, 0, 0];
  allComments.forEach((c) => { if (c.rating >= 1 && c.rating <= 5) counts[c.rating - 1]++; });
  const total         = counts.reduce((a, b) => a + b, 0);
  const averageRating = total > 0
    ? (counts.reduce((sum, count, i) => sum + count * (i + 1), 0) / total).toFixed(1) : 0;

  statsContainer.innerHTML = "";
  const mainSection = document.createElement("div");

  const ratingSection = document.createElement("div");
  ratingSection.style.cssText = "text-align:center;min-width:120px;";

  const reviewsTitle = document.createElement("h3");
  reviewsTitle.textContent = "إحصائيات تقييم المنتج";
  reviewsTitle.style.cssText = `margin:0 0 35px 0;font-size:18px;color:#000;font-weight:600;
    font-family:"Readex Pro",sans-serif;font-optical-sizing:auto;font-style:normal;`;

  const ratingNumber = document.createElement("h6");
  ratingNumber.textContent = averageRating;
  ratingNumber.style.cssText = "font-size:48px;font-weight:bold;color:#333;margin:10px 0;line-height:1;";

  const starsDiv = document.createElement("div");
  starsDiv.style.cssText = "display:flex;justify-content:center;gap:2px;margin:10px 0;";
  for (let i = 1; i <= 5; i++) {
    const s = document.createElement("span");
    s.innerHTML = "★";
    s.style.cssText = `font-size:28px;color:${i <= Math.round(averageRating) ? "#ffc107" : "#e9ecef"};text-shadow:0 0 2px black;`;
    starsDiv.appendChild(s);
  }

  const reviewCount = document.createElement("div");
  reviewCount.textContent = `مراجعات ${total}`;
  reviewCount.style.cssText = `color:rgb(108,117,125);font-size:16px;margin-top:5px;margin-bottom:10px;
    font-family:"Readex Pro",sans-serif;font-optical-sizing:auto;font-style:normal;`;

  ratingSection.append(reviewsTitle, ratingNumber, starsDiv, reviewCount);

  const detailSection = document.createElement("div");
  detailSection.style.cssText = "flex:1;min-width:300px;";
  for (let i = 5; i >= 1; i--) {
    const percent = total > 0 ? (counts[i - 1] / total) * 100 : 0;
    const bar = document.createElement("div");
    bar.style.cssText = "display:flex;align-items:center;gap:12px;margin-bottom:13px;";

    const pLabel = document.createElement("span");
    pLabel.textContent = `${Math.round(percent)}%`;
    pLabel.style.cssText = "width:35px;text-align:right;font-size:15px;color:#6c757d;font-weight:500;";

    const pContainer = document.createElement("div");
    pContainer.style.cssText = `flex:1;height:8px;background-color:rgb(228,219,219);
      border-radius:6px;overflow:hidden;position:relative;direction:rtl;`;
    const pBar = document.createElement("div");
    pBar.style.cssText = `height:100%;width:${percent}%;
      background:linear-gradient(90deg,#333 0%,#555 100%);border-radius:6px;transition:width 0.3s ease;`;
    pContainer.appendChild(pBar);

    const sNum = document.createElement("span");
    sNum.textContent = i;
    sNum.style.cssText = "width:20px;text-align:center;font-size:14px;font-weight:600;color:#333;";

    bar.append(pLabel, pContainer, sNum);
    detailSection.appendChild(bar);
  }

  mainSection.append(ratingSection, detailSection);
  statsContainer.appendChild(mainSection);
}

function updateCommentCount() {
  const el = document.getElementById("totalComments");
  if (el) el.textContent = `عدد التقييمات: ${allComments.length}`;
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

  try {
    await push(ref(db, `comments/${ITEM_ID}`), {
      userName,
      userEmail: email || "",
      userPhoto: userPhoto || "",
      text,
      rating:    selectedRating,
      likes:     0,
      dislikes:  0,
      createdAt: Date.now()
    });

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