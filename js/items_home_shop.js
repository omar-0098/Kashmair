// items_home_shop.js
// بيملأ 3 أقسام في الصفحة الرئيسية من كل كوليكشنز المنتجات في Firestore:
// 1) العروضات: أي منتج عليه خصم فعلي (old_price أكبر من price)
// 2) الأكثر مبيعاً: أعلى 20 منتج اتضافت للسلة مع ظهور شارة "الأكثر مبيعا"
// 3) بعض من منتجاتنا: 20 منتج عشوائي، بيتغيروا كل ريفريش للصفحة

import { db } from "./firebase-config.js";
import {
  collection,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { trackAddToCart } from "./bestseller-tracker.js";

// ⭐ نفس الـ Realtime Database اللي بتتخزن فيها تقييمات المنتج في item.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getDatabase,
  ref as rtdbRef,
  get as rtdbGet,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const COLLECTIONS = ["paranes", "feyat", "mlayat", "ellehaf", "patatin", "coferta"];
const PLACEHOLDER_IMG = "img/placeholder.jpg";
const OUR_PRODUCTS_LIMIT = 20;
const BESTSELLER_LIMIT = 20;

// بيتأكد إن المستخدم مسجل دخول فعلاً
function isLoggedIn() {
  return !!(
    localStorage.getItem("kashmirSessionId") &&
    localStorage.getItem("kashmirUser")
  );
}

// بيمنع إضافة أي منتج للسلة لو المستخدم مش مسجل دخول
function guardAddToCartRequiresLogin() {
  document.addEventListener(
    "click",
    (e) => {
      const btn = e.target.closest(".btn_add_cart");
      if (!btn) return;

      if (btn.classList.contains("active")) return;

      if (!isLoggedIn()) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        if (typeof window.openModal === "function") {
          window.openModal();
        } else {
          alert("لازم تسجل دخول الأول عشان تقدر تضيف المنتج للسلة");
        }
      }
    },
    true
  );
}
guardAddToCartRequiresLogin();

// ============================================================================
// ⭐ تقييم النجوم الحقيقي
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

const ratingsApp = initializeApp(ratingsFirebaseConfig, "ratingsApp");
const ratingsDb  = getDatabase(ratingsApp);

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

function colorsCountLabel(count) {
  if (count === 1) return "لون واحد";
  if (count === 2) return "لونين";
  if (count >= 3 && count <= 10) return `متوفر ${count} ألوان`;
  return `متوفر ${count} لون`;
}

function getDetailLine(product, variants, defaultVariant) {
  if (variants.length > 0) {
    return {
      label: "اللون",
      value: variants.length > 1 ? colorsCountLabel(variants.length) : defaultVariant.color,
    };
  }

  if (product.size && String(product.size).trim() !== "") {
    return { label: "المقاس", value: product.size };
  }

  if (product.type && String(product.type).trim() !== "") {
    return { label: "النوع", value: product.type };
  }

  return null;
}

function collectColorVariants(product) {
  const colorKeys = Object.keys(product)
    .filter((key) => /^color\d+$/.test(key))
    .sort((a, b) => parseInt(a.replace("color", ""), 10) - parseInt(b.replace("color", ""), 10));

  const variants = colorKeys
    .map((key) => {
      const index = key.replace("color", "");
      const colorName = product[key];
      const imgKey = `color${index}_img`;
      const img =
        product[imgKey] && product[imgKey].trim() !== ""
          ? product[imgKey]
          : product.img || PLACEHOLDER_IMG;
      return { color: colorName, img };
    })
    .filter((v) => v.color && String(v.color).trim() !== "");

  if (variants.length > 0) return variants;

  if (product.color && String(product.color).trim() !== "") {
    return [{ color: product.color, img: product.img || PLACEHOLDER_IMG }];
  }

  return [];
}

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
          alt="${v.color}"
        >`
    )
    .join("");

  return `<div class="color-swatches" data-product-id="${productId}">${swatches}</div>`;
}

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

    productCard
      .querySelectorAll(".color-swatch")
      .forEach((el) => el.classList.remove("active"));
    swatch.classList.add("active");
  });
}

function diversifyByCollection(list) {
  const arr = [...list];
  for (let i = 1; i < arr.length; i++) {
    if (arr[i].col === arr[i - 1].col) {
      let swapIndex = -1;
      for (let j = i + 1; j < arr.length; j++) {
        if (arr[j].col !== arr[i - 1].col) {
          swapIndex = j;
          break;
        }
      }
      if (swapIndex !== -1) {
        [arr[i], arr[swapIndex]] = [arr[swapIndex], arr[i]];
      }
    }
  }
  return arr;
}

async function fetchAllProducts() {
  const results = await Promise.all(
    COLLECTIONS.map(async (col) => {
      const snap = await getDocs(collection(db, col));
      const items = [];
      snap.forEach((docSnap) => {
        items.push({ docId: docSnap.id, col, ...docSnap.data() });
      });
      return items;
    })
  );
  return results.flat();
}

async function fetchBestsellerCounts() {
  const counts = {};
  try {
    const snap = await getDocs(collection(db, "bestsellers"));
    snap.forEach((docSnap) => {
      const d = docSnap.data();
      counts[`${d.collection}-${d.productId}`] = d.count || 0;
    });
  } catch (err) {
    console.error("تعذر تحميل بيانات الأكثر مبيعاً:", err);
  }
  return counts;
}

function buildProductCard(product, isBestseller = false) {
  const cart = JSON.parse(localStorage.getItem("cart")) || [];
  const isInCart = cart.some((item) => item.id === product.id);

  const variants = collectColorVariants(product);
  const defaultVariant = variants[0] || {
    color: product.color || "",
    img: product.img || PLACEHOLDER_IMG,
  };

  const oldPrice = Number(product.old_price) || 0;
  const old_price_pragrahp = oldPrice ? `<p class="old_price">جنيه ${oldPrice}</p>` : "";
  const parcent_disc_div =
    oldPrice > product.price
      ? `<span class="sale_present">%${Math.floor(((oldPrice - product.price) / oldPrice) * 100)}</span>`
      : "";

  const imgSrc =
    defaultVariant.img && defaultVariant.img.trim() !== "" ? defaultVariant.img : PLACEHOLDER_IMG;
  const detailsLink = `Furniture/item.html?col=${product.col}&docId=${product.docId}`;
  const detail = getDetailLine(product, variants, defaultVariant);
  const detailLine = detail
    ? `<div class="size"><p><span> <span> ${detail.label} :</span> <span class="selected-color" data-product-id="${product.id}">${detail.value}</span></span></p></div>`
    : "";

  const bestsellerBadge = isBestseller ? `<span class="bestseller_badge">الاكثر مبيعا</span>` : "";

  return `
    <div class="product swiper-slide">
      ${bestsellerBadge}
      ${product.word ? `<p class="ooo">${product.word}</p>` : ""}
      ${parcent_disc_div}
      <div class="img_product">
        <a href="${detailsLink}"><img src="${imgSrc}" alt="" class="product-image" data-id="${product.id}"></a>
      </div>

      ${renderColorSwatches(variants, product.id)}

      <div style="    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
    margin: 8px 0px 7px 0px;
    flex-direction: row-reverse;
">
        <div class="stars rating-stats-toggle" data-item-id="${product.col}-${product.docId}" data-details-link="${detailsLink}" title="إحصائيات التقييم" style="cursor:pointer;">
          <i class="fa-solid fa-star"></i>
          <i class="fa-solid fa-star"></i>
          <i class="fa-solid fa-star"></i>
          <i class="fa-solid fa-star"></i>
          <i class="fa-solid fa-star"></i>
        </div>
        <div style="display:flex;align-items:center;gap:4px;">
          <i class="fa-solid fa-chevron-down rating-stats-toggle" 
             data-item-id="${product.col}-${product.docId}" 
             data-details-link="${detailsLink}" 
             title="إحصائيات التقييم" 
             style="cursor:pointer;color:#6c757d;font-size:12px;"></i>
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
        product.type && String(product.type).trim() !== ""
          ? `<div class="shipping-container">
              <div class="shipping-label">
                <i class="fa-solid fa-paperclip"></i>
                <span> ${product.type} </span>
              </div>
              <div class="shipping-label">
                <i class="fa-solid fa-industry"></i>
                <span>شركة ${product.manufacturer || ""}</span>
              </div>
            </div>`
          : ""
      }

      <div class="icons">
        <span class="btn_add_cart ${isInCart ? "active" : ""}" data-id="${product.id}" data-name="${product.name}" data-price="${product.price}" data-img="${imgSrc}" data-col="${product.col}" data-doc-id="${product.docId}" data-color="${defaultVariant.color}" data-size="${product.size || ""}" data-type="${product.type || ""}" data-colors="${encodeURIComponent(JSON.stringify(variants))}">
          <i class="fa-solid fa-cart-plus"></i> ${isInCart ? "تم اضافة الي السلة" : "اضف الي السلة"}
        </span>
      </div>
    </div>
  `;
}

function renderSection(containerId, products, isBestsellerSection = false) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = products.map((p) => buildProductCard(p, isBestsellerSection)).join("");
}

function attachTracking(containerId, products) {
  const el = document.getElementById(containerId);
  if (!el) return;

  el.addEventListener("click", (e) => {
    const btn = e.target.closest(".btn_add_cart");
    if (!btn) return;
    if (btn.classList.contains("active")) return;

    const product = products.find((p) => String(p.id) === String(btn.dataset.id));
    if (product) trackAddToCart(product.col, product.id);
  });
}

// ============================================================================
// 📊 بوكس "إحصائيات تقييم المنتج" - مع تأثيرات الترانزيشن (Transition)
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

// إضافة ستايل الترانزيشن للـ Overlay والـ Modal
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

function initRatingStatsModal() {
  injectRatingStatsStyles();

  if (!document.getElementById("ratingStatsOverlay")) {
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
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
    document.getElementById("ratingStatsClose").addEventListener("click", close);
  }

  document.addEventListener("click", async (e) => {
    const toggle = e.target.closest(".rating-stats-toggle");
    if (!toggle) return;
    
    e.preventDefault();
    e.stopPropagation();

    const overlay = document.getElementById("ratingStatsOverlay");
    const body = document.getElementById("ratingStatsBody");

    if (!overlay || !body) return;

    body.innerHTML = `<div class="rating-stats-loading">جاري التحميل...</div>`;
    overlay.classList.add("open");

    const itemId = toggle.dataset.itemId;
    const detailsLink = toggle.dataset.detailsLink;

    const comments = await fetchProductComments(itemId);
    body.innerHTML = buildStatsHtml(comments, detailsLink);
  });
}

async function init() {
  const [allProducts, bestsellerCounts] = await Promise.all([
    fetchAllProducts(),
    fetchBestsellerCounts(),
  ]);

  const offers = diversifyByCollection(
    allProducts.filter((p) => Number(p.old_price) > 0 && Number(p.old_price) > Number(p.price))
  );

  const bestsellers = diversifyByCollection(
    allProducts
      .map((p) => ({ ...p, _count: bestsellerCounts[`${p.col}-${p.id}`] || 0 }))
      .sort((a, b) => b._count - a._count)
      .slice(0, BESTSELLER_LIMIT)
  );

  const ourProducts = diversifyByCollection(
    [...allProducts].sort(() => 0.5 - Math.random()).slice(0, OUR_PRODUCTS_LIMIT)
  );

  renderSection("swiper_items_sale", offers, false);
  renderSection("swiper_Bestseller", bestsellers, true);
  renderSection("swiper_Ourproduct", ourProducts, false);

  attachTracking("swiper_items_sale", offers);
  attachTracking("swiper_Bestseller", bestsellers);
  attachTracking("swiper_Ourproduct", ourProducts);

  const saleEl = document.getElementById("swiper_items_sale");
  const bestsellerEl = document.getElementById("swiper_Bestseller");
  const ourProductEl = document.getElementById("swiper_Ourproduct");

  setupColorSwitching(saleEl);
  setupColorSwitching(bestsellerEl);
  setupColorSwitching(ourProductEl);

  applyRealRatings(saleEl);
  applyRealRatings(bestsellerEl);
  applyRealRatings(ourProductEl);

  initRatingStatsModal();

  setTimeout(() => {
    if (typeof setupCartEvents === "function") setupCartEvents();
    if (typeof initSwipers === "function") initSwipers();
  }, 150);
}

init();