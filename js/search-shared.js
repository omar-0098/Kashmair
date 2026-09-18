// js/search-shared.js

import { db } from "./firebase-config.js";
import {
  collection,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

// ⭐ نفس الـ Realtime Database اللي بتتخزن فيها تقييمات المنتج في item.js / items_home_all.js / filters.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getDatabase,
  ref as rtdbRef,
  get as rtdbGet,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

export const COLLECTIONS = ["paranes", "feyat", "mlayat", "ellehaf", "patatin", "coferta"];
export const PLACEHOLDER_IMG = "/img/placeholder.jpg";
export const COLLECTION_LABELS = {
  paranes: "برانس",
  feyat: "فوط",
  mlayat: "ملايات",
  ellehaf: "لحاف",
  patatin: "بطاطين",
  coferta: "كوفرتا",
};

// ============================================================================
// ⭐ تقييم النجوم الحقيقي (نفس الكونفيج بالظبط اللي في item.js / items_home_all.js / filters.js)
// ============================================================================
const ratingsFirebaseConfig = {
  apiKey:            "AIzaSyCCk0w_KHVCswjp16TSkNToRSSOjlPC5kE",
  authDomain:        "data-customer-d722f.firebaseapp.com",
  databaseURL:       "https://data-customer-d722f-default-rtdb.firebaseio.com/",
  projectId:         "data-customer-d722f",
  storageBucket:     "data-customer-d722f.firebasestorage.app",
  messagingSenderId: "398522341614",
  appId:             "1:398522341614:web:99e0f897c61ec960cffbff"
};

// بنسميه اسم مختلف عشان ميتعارضش مع الـ app الافتراضي بتاع الفايرستور (db)
const ratingsApp = initializeApp(ratingsFirebaseConfig, "ratingsAppSearch");
const ratingsDb  = getDatabase(ratingsApp);

// كاش بسيط عشان لو نفس المنتج اتكرر ميتجابش مرتين من النت
const ratingsCache = new Map();

function renderStarsIcons(starsEl, average) {
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
}

export async function fetchProductRating(itemId) {
  if (ratingsCache.has(itemId)) return ratingsCache.get(itemId);

  const promise = (async () => {
    try {
      const snap = await rtdbGet(rtdbRef(ratingsDb, `comments/${itemId}`));
      let total = 0;
      let sum = 0;
      if (snap.exists()) {
        snap.forEach((child) => {
          const rating = child.val()?.rating;
          if (rating >= 1 && rating <= 5) {
            total++;
            sum += rating;
          }
        });
      }
      return { average: total > 0 ? sum / total : 0, total };
    } catch (err) {
      console.error("تعذر تحميل تقييم المنتج:", itemId, err);
      return { average: 0, total: 0 };
    }
  })();

  ratingsCache.set(itemId, promise);
  return promise;
}

// صياغة عدد التقييمات بالعربي (0 تقييم / تقييم واحد / تقييمين / كذا تقييم)
function ratingsCountLabel(total) {
  if (total === 0) return "(0 تقييم)";
  if (total === 1) return "(تقييم واحد)";
  if (total === 2) return "(تقييمين)";
  if (total >= 3 && total <= 10) return `(${total} تقييمات)`;
  return `(${total} تقييم)`;
}

// بيدور جوه أي حاوية على كل ".stars[data-item-id]" ويجيبلها التقييم الحقيقي من فايربيز
export function applyRealRatings(container) {
  if (!container) return;
  container.querySelectorAll(".stars[data-item-id]").forEach(async (starsEl) => {
    const itemId = starsEl.dataset.itemId;
    const { average, total } = await fetchProductRating(itemId);
    renderStarsIcons(starsEl, average);
    starsEl.title = total > 0
      ? `${average.toFixed(1)} من 5 (${total} تقييم)`
      : "لا يوجد تقييمات بعد";

    const countEl = container.querySelector(`.rating-count[data-item-id="${itemId}"]`);
    if (countEl) countEl.textContent = ratingsCountLabel(total);
  });
}

// ============================================================================
// 📊 بوكس "إحصائيات تقييم المنتج" — بوب أب عائم في نص الشاشة (زي أمازون)
// بوكس واحد مشترك لكل الكروت، بيتفتح لما نضغط على السهم جنب النجوم
// ============================================================================
const commentsCache = new Map();

async function fetchProductComments(itemId) {
  if (commentsCache.has(itemId)) return commentsCache.get(itemId);

  const promise = (async () => {
    try {
      const snap = await rtdbGet(rtdbRef(ratingsDb, `comments/${itemId}`));
      const comments = [];
      if (snap.exists()) {
        snap.forEach((child) => comments.push({ id: child.key, ...child.val() }));
      }
      return comments;
    } catch (err) {
      console.error("تعذر تحميل تعليقات المنتج:", itemId, err);
      return [];
    }
  })();

  commentsCache.set(itemId, promise);
  return promise;
}

const STAR_LABELS = { 5: "5 نجوم", 4: "4 نجوم", 3: "3 نجوم", 2: "نجمتان", 1: "نجمة واحدة" };

function buildStatsHtml(comments, detailsLink) {
  const counts = [0, 0, 0, 0, 0];
  comments.forEach((c) => { if (c.rating >= 1 && c.rating <= 5) counts[c.rating - 1]++; });
  const total = counts.reduce((a, b) => a + b, 0);
  const averageRating = total > 0
    ? (counts.reduce((sum, count, i) => sum + count * (i + 1), 0) / total).toFixed(1) : 0;

  const starsHtml = Array.from({ length: 5 }, (_, idx) => {
    const i = idx + 1;
    return `<i class="fa-${i <= Math.round(averageRating) ? "solid" : "regular"} fa-star"></i>`;
  }).join("");

  const rowsHtml = [5, 4, 3, 2, 1].map((i) => {
    const percent = total > 0 ? Math.round((counts[i - 1] / total) * 100) : 0;
    return `
      <div class="rating-stats-row">
        <span class="pct">${percent}%</span>
        <div class="bar-track"><div class="bar-fill" style="width:${percent}%;"></div></div>
        <span class="label">${STAR_LABELS[i]}</span>
      </div>`;
  }).join("");

  return `
    <div class="rating-stats-head">
      <span class="num">${averageRating}</span>
      <span class="outof">من 5</span>
      <span class="stars">${starsHtml}</span>
    </div>
    <div class="rating-stats-sub">${total} من التقييمات العالمية</div>
    <div class="rating-stats-rows">${rowsHtml}</div>
    ${detailsLink ? `<a class="rating-stats-link" href="${detailsLink}#productStats">عرض تقييمات المستخدمين ‹</a>` : ""}
  `;
}

// حقن الـ CSS بتاع البوكس مرة واحدة بس (متضمن تظبيط الموبايل بـ media query)
function injectRatingStatsStyles() {
  if (document.getElementById("ratingStatsStyles")) return;
  const style = document.createElement("style");
  style.id = "ratingStatsStyles";
  style.textContent = `
    .rating-stats-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.45);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 99999;
      padding: 16px;
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.3s ease, visibility 0.3s ease;
    }
    .rating-stats-overlay.open {
      opacity: 1;
      visibility: visible;
    }
    .rating-stats-modal {
      position: relative;
      background: #fff;
      border-radius: 16px;
      width: 360px;
      max-width: 100%;
      padding: 24px 22px;
      box-shadow: 0 12px 34px rgba(0, 0, 0, 0.28);
      direction: rtl;
      font-family: "Readex Pro", sans-serif;
      transform: translateY(20px) scale(0.95);
      transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .rating-stats-overlay.open .rating-stats-modal {
      transform: translateY(0) scale(1);
    }
    .rating-stats-close {
      position: absolute;
      top: 12px;
      right: 12px;
      width: 30px;
      height: 30px;
      border-radius: 50%;
      border: 1px solid #ddd;
      background: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 14px;
      color: #333;
      padding: 0;
      transition: background 0.2s ease;
    }
    .rating-stats-close:hover { background: #f2f2f2; }
    .rating-stats-head { display: flex; align-items: baseline; gap: 8px; justify-content: flex-start; flex-direction: row-reverse; }
    .rating-stats-head .num { font-size: 26px; font-weight: 800; color: #111; }
    .rating-stats-head .outof { font-size: 14px; color: #565959; }
    .rating-stats-head .stars { color: #ffa41c; font-size: 16px; letter-spacing: 2px; margin-inline-start: 6px; }
    .rating-stats-sub { color: #767676; font-size: 13px; margin: 1px 0 11px; text-align: right; font-family: 'Cairo', sans-serif; font-weight: 600; }
    .rating-stats-row { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
    .rating-stats-row .pct { width: 34px; font-size: 12px; color: #007185; text-align: left; }
    .rating-stats-row .bar-track { flex: 1; height: 14px; background: #fff; border: 1px solid #ccc; border-radius: 3px; overflow: hidden; }
    .rating-stats-row .bar-fill { height: 100%; background: #de7921; transition: width 0.4s ease; }
    .rating-stats-row .label { width: 74px; font-size: 13px; color: #111; text-align: right; }
    .rating-stats-link { display: block; text-align: center; margin-top: 16px; color: #3F51B5; font-size: 13px; text-decoration: none; font-family: 'Cairo', sans-serif; }
    .rating-stats-link:hover { text-decoration: underline; }
    .rating-stats-loading { text-align: center; color: #888; font-size: 13px; padding: 20px 0; }
    @media (max-width: 580px) {
      .rating-stats-overlay { align-items: flex-end; padding: 0; }
      .rating-stats-modal {
        width: 100%;
        border-radius: 16px 16px 0 0;
        padding: 20px 16px 15px;
        transform: translateY(100%);
      }
      .rating-stats-overlay.open .rating-stats-modal { transform: translateY(0); }
      .rating-stats-head .num { font-size: 22px; }
      .rating-stats-row .label { width: 64px; font-size: 12px; }
    }
  `;
  document.head.appendChild(style);
}

// بيتعمل مرة واحدة بس: بوكس مشترك متضاف لآخر الصفحة، وclick delegation على الدوكيومنت كله
// (شغال حتى بعد أي إعادة رندر للكروت لأنه مش متعلق بحاوية معينة)
export function initRatingStatsModal() {
  if (document.getElementById("ratingStatsOverlay")) return;

  injectRatingStatsStyles();

  const overlay = document.createElement("div");
  overlay.className = "rating-stats-overlay";
  overlay.id = "ratingStatsOverlay";
  overlay.innerHTML = `
    <div class="rating-stats-modal">
      <button type="button" class="rating-stats-close" id="ratingStatsClose"><i class="fa-solid fa-xmark"></i></button>
      <div id="ratingStatsBody"></div>
    </div>`;
  document.body.appendChild(overlay);

  const close = () => overlay.classList.remove("open");

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close(); // ضغط على الخلفية الغامقة بره البوكس
  });
  document.getElementById("ratingStatsClose").addEventListener("click", close);

  document.addEventListener("click", async (e) => {
    const toggle = e.target.closest(".rating-stats-toggle");
    if (!toggle) return;
    e.preventDefault();

    const body = document.getElementById("ratingStatsBody");
    body.innerHTML = `<div class="rating-stats-loading">جاري التحميل...</div>`;
    overlay.classList.add("open");

    const comments = await fetchProductComments(toggle.dataset.itemId);
    body.innerHTML = buildStatsHtml(comments, toggle.dataset.detailsLink);
  });
}

let productsCache = null;
let productsCachePromise = null;

export async function fetchAllProducts() {
  if (productsCache) return productsCache;
  if (productsCachePromise) return productsCachePromise;

  productsCachePromise = Promise.all(
    COLLECTIONS.map(async (col) => {
      const snap = await getDocs(collection(db, col));
      const items = [];
      snap.forEach((docSnap) => {
        items.push({ docId: docSnap.id, col, ...docSnap.data() });
      });
      return items;
    })
  ).then((results) => {
    productsCache = results.flat();
    return productsCache;
  });

  return productsCachePromise;
}

export function normalizeArabic(text) {
  if (!text) return "";
  return String(text)
    .trim()
    .toLowerCase()
    .replace(/[\u064B-\u0652]/g, "") // تشكيل
    .replace(/[إأآا]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/\s+/g, " ");
}

// حساب المسافة بين كلمتين للبحث الضبابي (Levenshtein Distance)
function levenshteinDistance(a, b) {
  const matrix = Array.from({ length: a.length + 1 }, () =>
    Array(b.length + 1).fill(0)
  );

  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][1 - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[a.length][b.length];
}

export function collectColorValues(product) {
  return Object.keys(product)
    .filter((key) => /^color\d*$/.test(key) && !/_img$/.test(key))
    .map((key) => product[key])
    .filter(Boolean);
}

export function collectColorVariants(product) {
  const colorKeys = Object.keys(product)
    .filter((key) => /^color\d+$/.test(key))
    .sort((a, b) => parseInt(a.replace("color", ""), 10) - parseInt(b.replace("color", ""), 10));

  const variants = colorKeys
    .map((key) => {
      const index = key.replace("color", "");
      const colorName = product[key];
      const imgKey = `color${index}_img`;
      const img = product[imgKey] && String(product[imgKey]).trim() !== "" ? product[imgKey] : (product.img || PLACEHOLDER_IMG);
      return { color: colorName, img };
    })
    .filter((v) => v.color && String(v.color).trim() !== "");

  if (variants.length > 0) return variants;
  if (product.color) {
    return [{ color: product.color, img: product.img || PLACEHOLDER_IMG }];
  }
  return [];
}

// دالة فحص المطابقة المباشرة والتقريبية
export function matchesQuery(product, rawQuery) {
  const q = normalizeArabic(rawQuery);
  if (!q) return false;

  const fields = [
    product.name,
    product.type,
    product.size,
    COLLECTION_LABELS[product.col],
    ...collectColorValues(product),
  ]
    .filter(Boolean)
    .map(normalizeArabic);

  // 1. مطابقة مباشرة
  if (fields.some((field) => field.includes(q))) return true;

  // 2. مطابقة تقريبية (إذا كانت الكلمة تحتوي أخطاء إملائية)
  const queryWords = q.split(" ");
  return fields.some((field) => {
    const fieldWords = field.split(" ");
    return queryWords.every((qWord) => {
      if (qWord.length < 3) return field.includes(qWord);
      return fieldWords.some((fWord) => {
        const dist = levenshteinDistance(qWord, fWord);
        const maxAllowed = qWord.length > 5 ? 2 : 1;
        return dist <= maxAllowed;
      });
    });
  });
}

export function searchProducts(products, rawQuery) {
  const q = normalizeArabic(rawQuery);
  if (!q) return [];
  return products.filter((p) => matchesQuery(p, q));
}

export function getDetailLine(product) {
  if (product.color && String(product.color).trim() !== "") {
    return { label: "اللون", value: product.color };
  }
  const colorKeys = Object.keys(product)
    .filter((key) => /^color\d+$/.test(key))
    .sort((a, b) => parseInt(a.replace("color", ""), 10) - parseInt(b.replace("color", ""), 10));

  if (colorKeys.length > 0 && product[colorKeys[0]]) {
    return { label: "اللون", value: product[colorKeys[0]] };
  }

  if (product.size && String(product.size).trim() !== "") {
    return { label: "المقاس", value: product.size };
  }

  if (product.type && String(product.type).trim() !== "") {
    return { label: "النوع", value: product.type };
  }
  return null;
}

export function buildProductCard(product, preferredColorKey) {
  const cart = JSON.parse(localStorage.getItem("cart")) || [];
  const isInCart = cart.some((item) => item.id === product.id);

  const oldPrice = Number(product.old_price) || 0;
  const old_price_pragrahp = oldPrice ? `<p class="old_price">جنيه ${oldPrice}</p>` : "";
  const parcent_disc_div =
    oldPrice > product.price
      ? `<span class="sale_present">%${Math.floor(((oldPrice - product.price) / oldPrice) * 100)}</span>`
      : "";

  let matchedVariant = null;
  if (preferredColorKey) {
    const variants = collectColorVariants(product);
    matchedVariant = variants.find((v) => normalizeArabic(v.color) === preferredColorKey) || null;
  }

  const imgSrc =
    (matchedVariant && matchedVariant.img && matchedVariant.img.trim() !== "" && matchedVariant.img) ||
    (product.img && product.img.trim() !== "" ? product.img : PLACEHOLDER_IMG);

  const detailsLink = `/Furniture/item.html?col=${product.col}&docId=${product.docId}`;
  const detail = matchedVariant
    ? { label: "اللون", value: matchedVariant.color }
    : getDetailLine(product);
  const detailLine = detail
    ? `<div class="size"><p><span> <span> ${detail.label} :</span> ${detail.value}</span></p></div>`
    : "";

  return `
    <div class="product search-result-card" data-col="${product.col}">
      ${product.word ? `<p class="ooo">${product.word}</p>` : ""}
      ${parcent_disc_div}
      <div class="img_product">
        <a href="${detailsLink}"><img src="${imgSrc}" alt="" class="product-image" data-id="${product.id}"></a>
      </div>

      <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;flex-direction: row-reverse;margin: 8px 0px 7px 0px;">
        <div class="stars rating-stats-toggle" data-item-id="${product.col}-${product.docId}" data-details-link="${detailsLink}" title="إحصائيات التقييم" style="cursor:pointer;"></div>
        <div style="display:flex;align-items:center;gap:4px;">
          <i class="fa-solid fa-chevron-down rating-stats-toggle" data-item-id="${product.col}-${product.docId}" data-details-link="${detailsLink}" title="إحصائيات التقييم" style="cursor:pointer;color:#6c757d;font-size:12px;"></i>
          <span class="rating-count" data-item-id="${product.col}-${product.docId}" style="font-size:12px;color:#6c757d;"></span>
        </div>
      </div>

      <p class="name_product">${product.name}</p>

      <div class="price">
        ${old_price_pragrahp}
        <p><span> <span>${product.price} </span> جنيه</span></p>
      </div>

      ${detailLine}

      ${
        (product.type && String(product.type).trim() !== "") || (product.manufacturer && String(product.manufacturer).trim() !== "")
          ? `<div class="shipping-container">
              ${
                product.type && String(product.type).trim() !== ""
                  ? `<div class="shipping-label">
                      <i class="fa-solid fa-paperclip"></i>
                      <span> ${product.type} </span>
                    </div>`
                  : ""
              }
              ${
                product.manufacturer && String(product.manufacturer).trim() !== ""
                  ? `<div class="shipping-label">
                      <i class="fa-solid fa-industry"></i>
                      <span>شركة ${product.manufacturer}</span>
                    </div>`
                  : ""
              }
            </div>`
          : ""
      }

      <div class="icons">
        <span class="btn_add_cart ${isInCart ? "active" : ""}" data-id="${product.id}" data-name="${product.name}" data-price="${product.price}" data-img="${imgSrc}" ${matchedVariant ? `data-color="${matchedVariant.color}"` : ""}>
          <i class="fa-solid fa-cart-plus"></i> ${isInCart ? "تم اضافة الي السلة" : "اضف الي السلة"}
        </span>
      </div>
    </div>
  `;
}

export function buildSuggestionItem(product) {
  const imgSrc = product.img && product.img.trim() !== "" ? product.img : PLACEHOLDER_IMG;
  const detailsLink = `/Furniture/item.html?col=${product.col}&docId=${product.docId}`;
  const oldPrice = Number(product.old_price) || 0;
  const priceLine =
    oldPrice > product.price
      ? `<span class="suggestion-old-price">${oldPrice}</span> <span class="suggestion-price">${product.price} جنيه</span>`
      : `<span class="suggestion-price">${product.price} جنيه</span>`;

  return `
    <a href="${detailsLink}" class="search-suggestion-item">
      <img src="${imgSrc}" alt="${product.name}">
      <span class="suggestion-info">
        <span class="suggestion-name">${product.name}</span>
        <span class="suggestion-meta">${priceLine}</span>
      </span>
    </a>
  `;
}