// js/filters.js
// فلتر وفرز موحّد لأي صفحة منتجات فيها حاوية ".products.swiper1-wrapper1" (فوط: feyat1/feyat2، كوفرتي: coferta1/coferta2، وأي صفحة تانية بنفس النمط)
// - نفس منطق فلتر صفحة البحث: مقاس - سعر - عروض - لون لو موجود
// الملف بيحقن كل مكونات الفلتر (الشريط، aside، overlay، تخطيط العمودين) ديناميكياً بالـ JS
// من غير أي تعديل يدوي في ملف الـ HTML، وبيكتشف تلقائياً أي حاويات منتجات موجودة في الصفحة
// واسم الكوليكشن في Firestore بيتحدد أوتوماتيك من أول جزء في id الحاوية (feyat_three -> feyat, coferta_man -> coferta)

import { db } from "../../js/firebase-config.js";
import {
  collection,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import {
  normalizeArabic,
  collectColorValues,
  collectColorVariants,
  PLACEHOLDER_IMG,
} from "../../js/search-shared.js";
import { trackAddToCart } from "../../js/bestseller-tracker.js";

// ⭐ نفس الـ Realtime Database اللي بتتخزن فيها تقييمات المنتج في item.js / items_home_all.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getDatabase,
  ref as rtdbRef,
  get as rtdbGet,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// ============================================================================
// حالة عامة
// ============================================================================
let allProducts = [];
let facets = { sizes: [], colors: [], manufacturers: [], priceMin: 0, priceMax: 0 };
let filters = { sizes: new Set(), colors: new Set(), manufacturers: new Set(), maxPrice: null, offersOnly: false };
let sortBy = "relevance";

const cart = JSON.parse(localStorage.getItem("cart")) || [];

// ============================================================================
// أدوات مساعدة
// ============================================================================
function debounce(fn, delay) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}

function isInCart(product) {
  return cart.some((item) => item.id === product.id);
}

function oldPriceOf(product) {
  return product.old_price === undefined || product.old_price === null ? 0 : product.old_price;
}

function discountBadge(product, oldPrice) {
  return oldPrice > 0
    ? `<span class="sale_present">%${Math.floor(((oldPrice - product.price) / oldPrice) * 100)}</span>`
    : "";
}

function oldPriceParagraph(oldPrice) {
  return oldPrice ? `<p class="old_price">جنيه ${oldPrice}</p>` : "";
}

function colorsCountLabel(count) {
  if (count === 1) return "لون واحد";
  if (count === 2) return "متوفر لونين ";
  if (count >= 3 && count <= 10) return `متوفر ${count} ألوان`;
  return `متوفر ${count} لون`;
}

function getDiscountPercent(p) {
  const oldPrice = Number(p.old_price) || 0;
  if (oldPrice <= p.price) return 0;
  return ((oldPrice - p.price) / oldPrice) * 100;
}

// ============================================================================
// ⭐ تقييم النجوم الحقيقي (نفس الكونفيج بالظبط اللي في item.js / items_home_all.js)
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
const ratingsApp = initializeApp(ratingsFirebaseConfig, "ratingsAppFilters");
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

async function fetchProductRating(itemId) {
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

function applyRealRatings(container) {
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
function initRatingStatsModal() {
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

// ============================================================================
// تحميل المنتجات من Firestore - بيحدد اسم الكوليكشن أوتوماتيك من أول جزء
// في id بتاع الحاوية (feyat_three -> feyat, coferta_man -> coferta ...)
// عشان نفس الملف يشتغل على أي صفحة/قسم من غير أي تعديل يدوي
// ============================================================================
function getCollectionName(containerId) {
  return containerId.split("_")[0];
}

async function loadProductsForContainers(containers) {
  const collectionNames = [...new Set(containers.map((c) => getCollectionName(c.id)))];

  const results = await Promise.all(
    collectionNames.map(async (colName) => {
      const snapshot = await getDocs(collection(db, colName));
      const items = [];
      snapshot.forEach((docSnap) => items.push({ docId: docSnap.id, col: colName, ...docSnap.data() }));
      return items;
    })
  );

  return results.flat();
}

// ============================================================================
// حساب الفلاتر المتاحة (Facets) من المنتجات الموجودة فعلاً
// ============================================================================
function computeFacets(products) {
  const sizeCounts = {};
  const colorCounts = {};
  const manufacturerCounts = {};
  let priceMin = Infinity;
  let priceMax = 0;

  products.forEach((p) => {
    if (p.size && String(p.size).trim() !== "") {
      const key = normalizeArabic(p.size);
      if (!sizeCounts[key]) sizeCounts[key] = { label: p.size, count: 0 };
      sizeCounts[key].count += 1;
    }

    collectColorValues(p).forEach((color) => {
      const key = normalizeArabic(color);
      if (!key) return;
      if (!colorCounts[key]) colorCounts[key] = { label: color, count: 0 };
      colorCounts[key].count += 1;
    });

    if (p.manufacturer && String(p.manufacturer).trim() !== "") {
      const key = normalizeArabic(p.manufacturer);
      if (!manufacturerCounts[key]) manufacturerCounts[key] = { label: p.manufacturer, count: 0 };
      manufacturerCounts[key].count += 1;
    }

    const price = Number(p.price) || 0;
    if (price < priceMin) priceMin = price;
    if (price > priceMax) priceMax = price;
  });

  return {
    sizes: Object.keys(sizeCounts)
      .map((key) => ({ key, label: sizeCounts[key].label, count: sizeCounts[key].count }))
      .sort((a, b) => b.count - a.count),
    colors: Object.keys(colorCounts)
      .map((key) => ({ key, label: colorCounts[key].label, count: colorCounts[key].count }))
      .sort((a, b) => b.count - a.count),
    manufacturers: Object.keys(manufacturerCounts)
      .map((key) => ({ key, label: manufacturerCounts[key].label, count: manufacturerCounts[key].count }))
      .sort((a, b) => b.count - a.count),
    priceMin: priceMin === Infinity ? 0 : priceMin,
    priceMax,
  };
}

// ============================================================================
// تطبيق الفلاتر + الترتيب
// ============================================================================
function applyFilters(products) {
  let filtered = products.filter((p) => {
    if (filters.sizes.size > 0 && !filters.sizes.has(normalizeArabic(p.size))) return false;

    if (filters.colors.size > 0) {
      const productColorKeys = collectColorValues(p).map(normalizeArabic);
      if (!productColorKeys.some((k) => filters.colors.has(k))) return false;
    }

    if (filters.manufacturers.size > 0 && !filters.manufacturers.has(normalizeArabic(p.manufacturer))) return false;

    if (filters.offersOnly) {
      const price = Number(p.price) || 0;
      const oldPrice = Number(p.old_price) || 0;
      if (!(oldPrice > price)) return false;
    }

    return true;
  });

  if (filters.maxPrice !== null && filtered.length > 0) {
    const targetMaxPrice = filters.maxPrice;
    const inRange = filtered.filter((p) => {
      const price = Number(p.price) || 0;
      return price >= facets.priceMin && price <= targetMaxPrice;
    });

    if (inRange.length > 0) {
      filtered = inRange;
    } else {
      const closest = filtered.reduce((prev, curr) => {
        const prevDiff = Math.abs((Number(prev.price) || 0) - targetMaxPrice);
        const currDiff = Math.abs((Number(curr.price) || 0) - targetMaxPrice);
        return currDiff < prevDiff ? curr : prev;
      });
      filtered = [closest];
    }
  }

  return filtered;
}

function applySort(products) {
  const arr = [...products];
  if (sortBy === "price_asc") arr.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
  else if (sortBy === "price_desc") arr.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
  else if (sortBy === "discount_desc") arr.sort((a, b) => getDiscountPercent(b) - getDiscountPercent(a));
  return arr;
}

function getPreferredColorKey(product) {
  if (filters.colors.size === 0) return null;
  const productColorKeys = collectColorVariants(product).map((v) => normalizeArabic(v.color));
  for (const key of productColorKeys) {
    if (filters.colors.has(key)) return key;
  }
  return null;
}

// ============================================================================
// رندر كارت المنتج (نفس شكل كروت الفوط الحالية + سواتش لون لو موجود)
// ============================================================================
function renderColorSwatches(variants, productId) {
  if (variants.length <= 1) return "";
  const swatches = variants
    .map(
      (v, i) => `
        <img
          src="${v.img}"
          class="color-swatch ${i === 0 ? "active" : ""}"
          data-product-id="${productId}"
          data-color="${v.color}"
          data-img="${v.img}"
          title="${v.color}"
          alt="${v.color}">`
    )
    .join("");
  return `<div class="color-swatches" data-product-id="${productId}">${swatches}</div>`;
}

function renderCard(product) {
  const inCart = isInCart(product);
  const oldPrice = oldPriceOf(product);
  const variants = collectColorVariants(product);
  const preferredKey = getPreferredColorKey(product);
  const matchedVariant = preferredKey
    ? variants.find((v) => normalizeArabic(v.color) === preferredKey)
    : null;
  const defaultVariant =
    matchedVariant || variants[0] || { color: product.color || "", img: product.img || PLACEHOLDER_IMG };
  const imgSrc = defaultVariant.img && defaultVariant.img.trim() !== "" ? defaultVariant.img : PLACEHOLDER_IMG;
  const detailsLink = `../item.html?col=${product.col}&docId=${product.docId}`;

  const infoLine =
    variants.length > 1
      ? `<p><span> <span> اللون :</span> <span class="selected-color" data-product-id="${product.id}">${colorsCountLabel(
          variants.length
        )}</span></span></p>`
      : `<p><span> <span>${product.size || ""} </span>: مقاس </span></p>`;

  return `
        <div class=" product">
                                       ${product.word ? `<p class="ooo">${product.word}</p>` : ""}
                    ${discountBadge(product, oldPrice)}
                   <div class="img_product">
          <a href="${detailsLink}"> <img src="${imgSrc}" alt="" class="product-image" data-id="${product.id}"></a>
                   </div>

                   ${renderColorSwatches(variants, product.id)}

                   <div style="display:flex;align-items:center;justify-content:space-between;flex-direction: row-reverse;margin: 8px 0px 7px 0px;">
                     <div class="stars rating-stats-toggle" data-item-id="${product.col}-${product.docId}" data-details-link="${detailsLink}" title="إحصائيات التقييم" style="cursor:pointer;">
                         <i class="fa-solid fa-star"></i>
                         <i class="fa-solid fa-star"></i>
                         <i class="fa-solid fa-star"></i>
                         <i class="fa-solid fa-star"></i>
                         <i class="fa-solid fa-star"></i>
                     </div>
                     <div style="display:flex;align-items:center;gap:4px;">
                                            <span class="rating-count" data-item-id="${product.col}-${product.docId}" style="font-size:12px;color:#6c757d;"></span>

                       <i class="fa-solid fa-chevron-down rating-stats-toggle" data-item-id="${product.col}-${product.docId}" data-details-link="${detailsLink}" title="إحصائيات التقييم" style="cursor:pointer;color:#6c757d;font-size:12px;"></i>
                     </div>
                   </div>

                        <p class="name_product">${product.name}</p>

                        <div class="price">
                        ${oldPriceParagraph(oldPrice)}
                        <p><span> <span>${product.price} </span> جنيه</span></p>
                        </div>
                           <div class="size">
                          ${infoLine}
                        </div>

  <div class="shipping-container">
    <div class="shipping-label">
    <i class="fa-solid fa-paperclip"></i>
      <span> ${product.type || ""} </span>
    </div>

    <div class="shipping-label">
    <i class="fa-solid fa-industry"></i>
      <span>شركة ${product.manufacturer || ""}</span>
    </div>
  </div>

                        <div class="icons">
                            <span class="btn_add_cart ${inCart ? "active" : ""}" data-id="${product.id}" data-col="${product.col}" data-name="${product.name}" data-price="${product.price}" data-img="${imgSrc}" ${defaultVariant.color ? `data-color="${defaultVariant.color}"` : ""}>
                                    <i class="fa-solid fa-cart-plus"></i> ${inCart ? "تم اضافة الي السلة" : "اضف الي السلة"}
                                </span>
                        </div>
               </div>
       `;
}

// ============================================================================
// بحث داخل خيارات الفلتر (اللون / الشركة المصنعة) - بيخفي أي خيار مش مطابق
// للنص اللي المستخدم بيكتبه، من غير ما يأثر على الاختيارات نفسها
// ============================================================================
function wireFilterSearch(inputId, listId) {
  const input = document.getElementById(inputId);
  const list = document.getElementById(listId);
  if (!input || !list) return;

  input.addEventListener("input", () => {
    const query = normalizeArabic(input.value.trim());
    list.querySelectorAll(".filter_option").forEach((opt) => {
      const label = normalizeArabic(opt.textContent);
      opt.style.display = !query || label.includes(query) ? "flex" : "none";
    });
  });
}

// ============================================================================
// رندر الفلاتر الجانبية
// ============================================================================
function renderFilters() {
  const container = document.getElementById("feyatFilters");
  if (!container) return;

  const sizesHtml = facets.sizes
    .map(
      (s) => `
      <label class="filter_option">
        <input type="checkbox" name="feyat-size" value="${s.key}" ${filters.sizes.has(s.key) ? "checked" : ""}>
        ${s.label} <span class="count">(${s.count})</span>
      </label>`
    )
    .join("");

  const colorsHtml = facets.colors
    .map(
      (c) => `
      <label class="filter_option filter_option_color ${filters.colors.has(c.key) ? "selected" : ""}">
        <input type="checkbox" name="feyat-color" value="${c.key}" ${filters.colors.has(c.key) ? "checked" : ""}>
        ${c.label} <span class="count">(${c.count})</span>
      </label>`
    )
    .join("");

  const manufacturersHtml = facets.manufacturers
    .map(
      (m) => `
      <label class="filter_option">
        <input type="checkbox" name="feyat-manufacturer" value="${m.key}" ${
        filters.manufacturers.has(m.key) ? "checked" : ""
      }>
        ${m.label} <span class="count">(${m.count})</span>
      </label>`
    )
    .join("");

  container.innerHTML = `
    <div class="sheet_handle"></div>
    ${
      facets.sizes.length > 0
        ? `
    <div class="filter_group collapsible" data-group="size">
      <div class="filter_group_header">
        <h4>المقاس</h4>
        <i class="fa-solid fa-chevron-down toggle_icon"></i>
      </div>
      <div class="filter_group_content">
        ${sizesHtml}
      </div>
    </div>`
        : ""
    }

    <div class="filter_group">
      <h4>السعر</h4>
      <div class="filter_price_inputs">
        <input type="number" id="feyatMinPrice" value="${facets.priceMin}" readonly title="أقل سعر متاح لا يمكن تعديله">
        <span>-</span>
        <input type="number" id="feyatMaxPrice" placeholder="أقصى سعر" min="${facets.priceMin}" value="${
    filters.maxPrice ?? ""
  }">
      </div>
    </div>

    <div class="filter_group">
      <label class="filter_option">
        <input type="checkbox" id="feyatOffersOnly" ${filters.offersOnly ? "checked" : ""}>
        عرض المنتجات المخصومة فقط
      </label>
    </div>

    ${
      facets.colors.length > 0
        ? `
    <div class="filter_group collapsible" data-group="color">
      <div class="filter_group_header">
        <h4>اللون</h4>
        <i class="fa-solid fa-chevron-down toggle_icon"></i>
      </div>
      <div class="filter_group_content">
        <div class="filter_search_box">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input type="text" id="feyatColorSearch" class="filter_search_input" placeholder="ابحث عن لون...">
        </div>
        <div class="filter_options_list" id="feyatColorOptionsList">
          ${colorsHtml}
        </div>
      </div>
    </div>`
        : ""
    }

    ${
      facets.manufacturers.length > 0
        ? `
    <div class="filter_group collapsible" data-group="manufacturer">
      <div class="filter_group_header">
        <h4>الشركة المصنعة</h4>
        <i class="fa-solid fa-chevron-down toggle_icon"></i>
      </div>
      <div class="filter_group_content">
        <div class="filter_search_box">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input type="text" id="feyatManufacturerSearch" class="filter_search_input" placeholder="ابحث عن شركة مصنعة...">
        </div>
        <div class="filter_options_list" id="feyatManufacturerOptionsList">
          ${manufacturersHtml}
        </div>
      </div>
    </div>`
        : ""
    }

    <button type="button" class="filter_clear_btn" id="feyatClearFilters">مسح كل الفلاتر</button>
  `;

  // فتح/قفل جروبات الفلتر القابلة للطي (المقاس، اللون، الشركة) بالدوس على العنوان
  container.querySelectorAll(".filter_group_header").forEach((header) => {
    header.addEventListener("click", () => {
      header.closest(".filter_group").classList.toggle("open");
    });
  });

  container.querySelectorAll("input[name='feyat-size']").forEach((el) => {
    el.addEventListener("change", () => {
      if (el.checked) filters.sizes.add(el.value);
      else filters.sizes.delete(el.value);
      renderResults();
    });
  });

  container.querySelectorAll("input[name='feyat-color']").forEach((el) => {
    el.addEventListener("change", () => {
      if (el.checked) filters.colors.add(el.value);
      else filters.colors.delete(el.value);
      el.closest(".filter_option_color")?.classList.toggle("selected", el.checked);
      renderResults();
    });
  });

  container.querySelectorAll("input[name='feyat-manufacturer']").forEach((el) => {
    el.addEventListener("change", () => {
      if (el.checked) filters.manufacturers.add(el.value);
      else filters.manufacturers.delete(el.value);
      renderResults();
    });
  });

  const applyMaxPrice = debounce(() => {
    const maxVal = document.getElementById("feyatMaxPrice").value;
    filters.maxPrice = maxVal !== "" && !isNaN(maxVal) ? Number(maxVal) : null;
    renderResults();
  }, 400);
  document.getElementById("feyatMaxPrice").addEventListener("input", applyMaxPrice);

  document.getElementById("feyatOffersOnly").addEventListener("change", (e) => {
    filters.offersOnly = e.target.checked;
    renderResults();
  });

  document.getElementById("feyatClearFilters").addEventListener("click", () => {
    filters = { sizes: new Set(), colors: new Set(), manufacturers: new Set(), maxPrice: null, offersOnly: false };
    renderFilters();
    renderResults();
  });

  wireFilterSearch("feyatColorSearch", "feyatColorOptionsList");
  wireFilterSearch("feyatManufacturerSearch", "feyatManufacturerOptionsList");
}

// ============================================================================
// شيبس الفلاتر النشطة
// ============================================================================
function renderActiveChips() {
  const box = document.getElementById("feyatActiveChips");
  if (!box) return;

  const chips = [];

  filters.sizes.forEach((key) => {
    const f = facets.sizes.find((s) => s.key === key);
    chips.push({ label: f ? f.label : key, onRemove: () => filters.sizes.delete(key) });
  });

  filters.colors.forEach((key) => {
    const f = facets.colors.find((c) => c.key === key);
    chips.push({ label: f ? f.label : key, onRemove: () => filters.colors.delete(key) });
  });

  filters.manufacturers.forEach((key) => {
    const f = facets.manufacturers.find((m) => m.key === key);
    chips.push({ label: f ? f.label : key, onRemove: () => filters.manufacturers.delete(key) });
  });

  if (filters.maxPrice !== null) {
    chips.push({
      label: `السعر: ${facets.priceMin} - ${filters.maxPrice} جنيه`,
      onRemove: () => (filters.maxPrice = null),
    });
  }

  if (filters.offersOnly) {
    chips.push({ label: "عروض فقط", onRemove: () => (filters.offersOnly = false) });
  }

  if (chips.length === 0) {
    box.innerHTML = "";
    return;
  }

  box.innerHTML = chips
    .map(
      (chip, i) =>
        `<span class="active_chip" data-i="${i}">${chip.label} <button type="button" data-i="${i}">✕</button></span>`
    )
    .join("");

  box.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      chips[Number(btn.dataset.i)].onRemove();
      renderFilters();
      renderResults();
    });
  });
}

// ============================================================================
// حقن كل مكونات الفلتر ديناميكياً (شريط الفلاتر + aside + overlay + تغليف
// أقسام المنتجات في تخطيط عمودين) - من غير أي تعديل يدوي في ملف الـ HTML
// ============================================================================
function injectFilterUI() {
  if (document.getElementById("feyatFilters")) return; // اتحقن قبل كده

  const productSections = Array.from(document.querySelectorAll(".products-all-main"));
  if (productSections.length === 0) return;

  // شريط الفلاتر العلوي (زرار الفلاتر + عدد النتايج + الترتيب + الشيبس)
  const filtersBar = document.createElement("div");
  filtersBar.className = "feyat_filters_bar";
  filtersBar.innerHTML = `
    <div class="container">
        <div class="feyat_filters_bar_inner">
            <button type="button" class="filters_toggle_btn" id="feyatFiltersToggleBtn">
                <i class="fa-solid fa-sliders"></i> الفلاتر
            </button>
            <span class="results_count" id="feyatResultsCount"></span>
            <div style="display: flex;gap: 30px;">
              <div class="search_active_chips" id="feyatActiveChips"></div>
            <div class="search_sort">
                <label for="feyatSortSelect"><i class="fa-solid fa-arrow-down-wide-short"></i> ترتيب حسب</label>
                <select id="feyatSortSelect">
                    <option value="relevance">الأكثر صلة</option>
                    <option value="price_asc">السعر: من الأقل للأعلى</option>
                    <option value="price_desc">السعر: من الأعلى للأقل</option>
                    <option value="discount_desc">الأعلى خصم</option>
                </select>
            </div>
              </div>
        </div>
    </div>`;

  // overlay بتاع الموبايل
  const overlay = document.createElement("div");
  overlay.className = "filters_overlay";
  overlay.id = "feyatFiltersOverlay";

  // aside الفلاتر نفسه (بيتملى لاحقاً بـ renderFilters)
  const aside = document.createElement("aside");
  aside.className = "search_filters";
  aside.id = "feyatFilters";

  // تخطيط عمودين: الفلتر + عمود النتايج
  const layout = document.createElement("div");
  layout.className = "feyat_layout container";

  const resultsCol = document.createElement("div");
  resultsCol.className = "feyat_results_col";

  const firstSection = productSections[0];

  // نحط شريط الفلاتر + الـ overlay قبل أول قسم منتجات
  firstSection.parentNode.insertBefore(filtersBar, firstSection);
  firstSection.parentNode.insertBefore(overlay, firstSection);
  firstSection.parentNode.insertBefore(layout, firstSection);

  layout.appendChild(aside);
  layout.appendChild(resultsCol);

  // نلف كل أقسام المنتجات (وأي بانرات بينهم) جوه عمود النتايج
  const lastSection = productSections[productSections.length - 1];
  let node = firstSection;
  while (node) {
    const next = node.nextSibling;
    resultsCol.appendChild(node);
    if (node === lastSection) break;
    node = next;
  }

  // ===== شريط سفلي على مقاس الموبايل: زرار الفلاتر + زرار الترتيب لازقين في بعض =====
  const mobileBar = document.createElement("div");
  mobileBar.className = "feyat_mobile_bar";
  mobileBar.id = "feyatMobileBar";
  mobileBar.innerHTML = `
    <button type="button" id="feyatMobileFiltersBtn">
        <i class="fa-solid fa-sliders"></i> الفلاتر
    </button>
    <button type="button" id="feyatMobileSortBtn">
        <i class="fa-solid fa-arrow-down-wide-short"></i> <span id="feyatMobileSortLabel">الأكثر صلة</span>
    </button>`;

  // شيت الترتيب اللي بيطلع من تحت على مقاس الموبايل
  const sortSheet = document.createElement("div");
  sortSheet.className = "feyat_sheet";
  sortSheet.id = "feyatSortSheet";
  sortSheet.innerHTML = `
    <div class="sheet_handle"></div>
    <h4>ترتيب حسب</h4>
    <div class="sort_option active" data-value="relevance">الأكثر صلة</div>
    <div class="sort_option" data-value="price_asc">السعر: من الأقل للأعلى</div>
    <div class="sort_option" data-value="price_desc">السعر: من الأعلى للأقل</div>
    <div class="sort_option" data-value="discount_desc">الأعلى خصم</div>`;

  document.body.appendChild(mobileBar);
  document.body.appendChild(sortSheet);
}

// ============================================================================
// اكتشاف حاويات المنتجات الموجودة فعلاً في الصفحة الحالية (feyat1, feyat2, ...)
// كل حاوية بتاخد اسم الكاتيجوري بتاعها من الـ id نفسه (feyat_three, feyat_six, feyat_child ...)
// ============================================================================
function getProductContainers() {
  return Array.from(document.querySelectorAll(".products.swiper1-wrapper1[id]"));
}

// ============================================================================
// رندر النتايج في كل حاويات المنتجات الموجودة في الصفحة (أياً كان عددها)
// ============================================================================
function renderResults() {
  const containers = getProductContainers();
  const countEl = document.getElementById("feyatResultsCount");

  const filtered = applySort(applyFilters(allProducts));

  if (countEl) countEl.textContent = `${filtered.length} منتج`;
  renderActiveChips();

  const emptyState = `<div class="search-empty-state"><i class="fa-solid fa-box-open"></i><p>مفيش منتجات مطابقة للفلاتر دي</p></div>`;

  containers.forEach((container) => {
    const items = filtered.filter((p) => p.catetory === container.id);
    container.innerHTML = items.length ? items.map(renderCard).join("") : emptyState;
    applyRealRatings(container);
  });

  setTimeout(() => {
    if (typeof setupCartEvents === "function") setupCartEvents();
  }, 100);
}

// ============================================================================
// تبديل اللون بالضغط على السواتش (يتحط مرة واحدة بس - event delegation)
// ============================================================================
function setupColorSwitching(container) {
  if (!container) return;
  container.addEventListener("click", (e) => {
    const swatch = e.target.closest(".color-swatch");
    if (!swatch) return;

    const newImg = swatch.dataset.img;
    const newColor = swatch.dataset.color;
    const productCard = swatch.closest(".product");
    if (!productCard) return;

    const mainImg = productCard.querySelector(".product-image");
    if (mainImg) mainImg.src = newImg;

    const colorLabel = productCard.querySelector(".selected-color");
    if (colorLabel) colorLabel.textContent = newColor;

    const addToCartBtn = productCard.querySelector(".btn_add_cart");
    if (addToCartBtn) {
      addToCartBtn.dataset.color = newColor;
      addToCartBtn.dataset.img = newImg;
    }

    productCard.querySelectorAll(".color-swatch").forEach((el) => el.classList.remove("active"));
    swatch.classList.add("active");
  });
}

function setupTrackingDelegation(container) {
  if (!container) return;
  container.addEventListener("click", (e) => {
    const btn = e.target.closest(".btn_add_cart");
    if (!btn || btn.classList.contains("active")) return;
    trackAddToCart(btn.dataset.col || "feyat", btn.dataset.id);
  });
}

// ============================================================================
// فتح/قفل درج الفلاتر
// ============================================================================
function initFiltersToggle() {
  const toggleBtn = document.getElementById("feyatFiltersToggleBtn");
  const aside = document.getElementById("feyatFilters");
  const overlay = document.getElementById("feyatFiltersOverlay");
  if (!toggleBtn || !aside || !overlay) return;

  const open = () => {
    aside.classList.add("open");
    overlay.classList.add("open");
  };
  const close = () => {
    aside.classList.remove("open");
    overlay.classList.remove("open");
  };

  toggleBtn.addEventListener("click", open);
  overlay.addEventListener("click", close);
}

// ============================================================================
// الشريط السفلي على مقاس الموبايل: فتح/قفل الفلاتر أو الترتيب من تحت الشاشة
// ============================================================================
const SORT_LABELS = {
  relevance: "الأكثر صلة",
  price_asc: "السعر: الأقل للأعلى",
  price_desc: "السعر: الأعلى للأقل",
  discount_desc: "الأعلى خصم",
};

function initMobileBar() {
  const filtersBtn = document.getElementById("feyatMobileFiltersBtn");
  const sortBtn = document.getElementById("feyatMobileSortBtn");
  const sortSheet = document.getElementById("feyatSortSheet");
  const sortLabel = document.getElementById("feyatMobileSortLabel");
  const aside = document.getElementById("feyatFilters");
  const overlay = document.getElementById("feyatFiltersOverlay");
  if (!filtersBtn || !sortBtn || !sortSheet || !aside || !overlay) return;

  const closeAll = () => {
    aside.classList.remove("open");
    sortSheet.classList.remove("open");
    overlay.classList.remove("open");
    filtersBtn.classList.remove("active_btn");
    sortBtn.classList.remove("active_btn");
  };

  filtersBtn.addEventListener("click", () => {
    sortSheet.classList.remove("open");
    sortBtn.classList.remove("active_btn");
    aside.classList.add("open");
    overlay.classList.add("open");
    filtersBtn.classList.add("active_btn");
  });

  sortBtn.addEventListener("click", () => {
    aside.classList.remove("open");
    filtersBtn.classList.remove("active_btn");
    sortSheet.classList.add("open");
    overlay.classList.add("open");
    sortBtn.classList.add("active_btn");
  });

  // نفس الـ overlay بيقفل أي شيت مفتوح (فلاتر أو ترتيب)
  overlay.addEventListener("click", closeAll);

  sortSheet.querySelectorAll(".sort_option").forEach((opt) => {
    opt.addEventListener("click", () => {
      sortBy = opt.dataset.value;
      if (sortLabel) sortLabel.textContent = SORT_LABELS[sortBy] || SORT_LABELS.relevance;

      sortSheet.querySelectorAll(".sort_option").forEach((o) => o.classList.remove("active"));
      opt.classList.add("active");

      const desktopSelect = document.getElementById("feyatSortSelect");
      if (desktopSelect) desktopSelect.value = sortBy;

      closeAll();
      renderResults();
    });
  });
}

// ============================================================================
// تشغيل
// ============================================================================
async function init() {
  injectFilterUI();

  const containers = getProductContainers();
  if (containers.length === 0) return;

  initFiltersToggle();
  initMobileBar();
  initRatingStatsModal();
  containers.forEach((container) => {
    setupColorSwitching(container);
    setupTrackingDelegation(container);
    container.innerHTML = `<div class="search-loading"> <h4 style="font-weight: 600;" >جاري التحميل...</h4> </div>`;
  });

  const sortSelect = document.getElementById("feyatSortSelect");
  if (sortSelect) {
    sortSelect.addEventListener("change", () => {
      sortBy = sortSelect.value;
      renderResults();
    });
  }

  try {
    allProducts = await loadProductsForContainers(containers);
    facets = computeFacets(allProducts);
    renderFilters();
    renderResults();
  } catch (err) {
    console.error("حصل خطأ في تحميل المنتجات:", err);
  }
}

init();