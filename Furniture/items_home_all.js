// items_home_all.js
// ============================================================================
// ملف واحد موحّد يجمع كل أقسام المنتجات في الصفحة الرئيسية:
// كوفرتة (رجالي/أطفال) - لحاف (كبير/أطفال) - فوط (4 أقسام) - ملايات (مشجر/سادة/أطفال) - براريس
//
// لازم يتحمل كـ module في الـ HTML، بدل الـ 9 ملفات القديمة:
// <script src="items_home_all.js" type="module"></script>
//
// ملاحظة: كل قسم بيتفحص وجود عنصره في الصفحة (getElementById) قبل ما يشتغل عليه،
// فمفيش مشكلة لو الملف اتحمّل في صفحة مفيهاش كل الحاويات دي.
// ============================================================================

import { db } from "../../js/firebase-config.js";
import { trackAddToCart } from "../../js/bestseller-tracker.js";
import {
  collection,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

// ⭐ نفس الـ Realtime Database اللي بتتخزن فيها تقييمات المنتج في item.js
// (بروجيكت مختلف عن الفايرستور بتاع المنتجات، فلازم نعمله app منفصل)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getDatabase,
  ref as rtdbRef,
  get as rtdbGet,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// السلة الحالية (نفس المنطق القديم بالظبط: بيقرأ بس، ما بيمسحش حاجة)
const cart = JSON.parse(localStorage.getItem("cart")) || [];

// صورة بديلة لو المنتج لسه معندوش صورة مرفوعة
const PLACEHOLDER_IMG = "../../images/placeholder.jpg";

// بيتأكد إن المستخدم مسجل دخول فعلاً (نفس الجلسة اللي بيستخدمها login2.js / account.js)
function isLoggedIn() {
  return !!(
    localStorage.getItem("kashmirSessionId") &&
    localStorage.getItem("kashmirUser")
  );
}

// بيمنع إضافة أي منتج للسلة (من أي قسم في الصفحة) لو المستخدم مش مسجل دخول
// بيشتغل في مرحلة الـ capture عشان يوقف الحدث قبل ما يوصل لأي كود تاني بيضيف المنتج فعليًا
function guardAddToCartRequiresLogin() {
  document.addEventListener(
    "click",
    (e) => {
      const btn = e.target.closest(".btn_add_cart");
      if (!btn) return;

      // لو المنتج أصلاً في السلة (زرار في وضع "active")، الضغطة دي بتشيله مش بتضيفه، فمسموح دايمًا
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
// دوال مشتركة (كانت مكررة في كل الملفات القديمة - دلوقتي مكتوبة مرة واحدة بس)
// ============================================================================

// بيرجع نص عربي سليم لعدد الألوان (لون واحد / لونين / متوفر 3 ألوان...)
function colorsCountLabel(count) {
  if (count === 1) return "لون واحد";
  if (count === 2) return "لونين";
  if (count >= 3 && count <= 10) return `متوفر ${count} ألوان`;
  return `متوفر ${count} لون`;
}

// بيجمع كل الألوان الموجودة في المنتج، بيدعم صيغتين:
// 1) الصيغة الجديدة (تفضيلية): color1/color1_img, color2/color2_img, color3/color3_img ...
// 2) الصيغة القديمة (fallback): حقل color واحد + img واحد بس
function collectColorVariants(product) {
  const colorKeys = Object.keys(product)
    .filter((key) => /^color\d+$/.test(key))
    .sort((a, b) => {
      const numA = parseInt(a.replace("color", ""), 10);
      const numB = parseInt(b.replace("color", ""), 10);
      return numA - numB;
    });

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
    .filter((v) => v.color && v.color.trim() !== "");

  if (variants.length > 0) return variants;

  // fallback للمنتجات القديمة اللي لسه فيها color واحد بس
  if (product.color && product.color.trim() !== "") {
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

// عند الضغط على أي دائرة لون، بيغير الصورة الرئيسية + النص + data-color/data-img بتاع زرار السلة
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

// بيربط "تتبع الأكثر مبيعاً" على أي حاوية: كل مرة يتضاف منتج للسلة (مش يتشال)
function setupBestsellerTracking(container, collectionName) {
  if (!container) return;
  container.addEventListener("click", (e) => {
    const btn = e.target.closest(".btn_add_cart");
    if (!btn || btn.classList.contains("active")) return;
    trackAddToCart(collectionName, btn.dataset.id);
  });
}

function isInCart(product) {
  return cart.some((cartItem) => cartItem.id === product.id);
}

function oldPriceOf(product) {
  return product.old_price === undefined || product.old_price === null
    ? 0
    : product.old_price;
}

function discountBadge(product, oldPrice) {
  return oldPrice > 0
    ? `<span class="sale_present">%${Math.floor(
        ((oldPrice - product.price) / oldPrice) * 100
      )}</span>`
    : "";
}

function oldPriceParagraph(oldPrice) {
  return oldPrice ? `<p class="old_price">جنيه ${oldPrice}</p>` : "";
}

// ============================================================================
// ⭐ تقييم النجوم الحقيقي (بيتجاب من نفس التقييمات اللي بتتسجل جوه صفحة المنتج)
// ============================================================================

// نفس الكونفيج بالظبط اللي في item.js
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
const ratingsApp = initializeApp(ratingsFirebaseConfig, "ratingsApp");
const ratingsDb  = getDatabase(ratingsApp);

// كاش بسيط عشان لو نفس المنتج اتكرر في أكتر من سكشن ميتجابش مرتين من النت
const ratingsCache = new Map();

// بيرسم أيقونات النجوم (كامل / نص / فاضي) بنفس منطق renderHeaderRating في item.js
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

// بيجيب متوسط وعدد تقييمات منتج واحد (comments/{itemId}) من الـ Realtime Database
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

// بيحدّث كل حاويات النجوم (.stars) جوه حاوية معينة بالتقييم الحقيقي بتاعها
function applyRealRatings(container) {
  if (!container) return;
  container.querySelectorAll(".stars[data-item-id]").forEach(async (starsEl) => {
    const itemId = starsEl.dataset.itemId;
    const { average, total } = await fetchProductRating(itemId);
    renderStarsIcons(starsEl, average);
    starsEl.title = total > 0
      ? `${average.toFixed(1)} من 5 (${total} تقييم)`
      : "لا يوجد تقييمات بعد";
  });
}

// ============================================================================
// قسم الكوفرتة (كان items_home_coferta1.js + items_home_coferta2.js)
// ============================================================================

const coferta_man = document.getElementById("coferta_man");
const coferta_child = document.getElementById("coferta_child");

function renderCofertaMan(container, product) {
  const inCart = isInCart(product);
  const oldPrice = oldPriceOf(product);
  const variants = collectColorVariants(product);
  const defaultVariant = variants[0] || {
    color: product.color || "",
    img: product.img || PLACEHOLDER_IMG,
  };
  const imgSrc =
    defaultVariant.img && defaultVariant.img.trim() !== ""
      ? defaultVariant.img
      : PLACEHOLDER_IMG;
  const detailsLink = `../item.html?col=coferta&docId=${product.docId}`;

  container.innerHTML += `
        <div class="product">
                                          ${product.word ? `<p class="ooo">${product.word}</p>` : ""}
                    ${discountBadge(product, oldPrice)}
                   <div class="img_product">
          <a href="${detailsLink}"> <img src="${imgSrc}" alt="" class="product-image" data-id="${product.id}"></a>
                   </div>

                   ${renderColorSwatches(variants, product.id)}

                   <div class="stars" data-item-id="coferta-${product.docId}">
                       <i class="fa-solid fa-star"></i>
                       <i class="fa-solid fa-star"></i>
                       <i class="fa-solid fa-star"></i>
                       <i class="fa-solid fa-star"></i>
                       <i class="fa-solid fa-star"></i>
                   </div>

                        <p class="name_product">${product.name}</p>

                        <div class="price">
                        ${oldPriceParagraph(oldPrice)}
                        <p><span> <span>${product.price} </span> جنيه</span></p>
                        </div>

                        <div class="size">
                          <p><span> <span> اللون :</span> <span class="selected-color" data-product-id="${product.id}">${variants.length > 1 ? colorsCountLabel(variants.length) : defaultVariant.color}</span></span></p>
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
                            <span class="btn_add_cart ${inCart ? "active" : ""}" data-id="${product.id}" data-name="${product.name}" data-price="${product.price}" data-img="${imgSrc}" data-color="${defaultVariant.color}">
                                    <i class="fa-solid fa-cart-plus"></i> ${inCart ? "تم اضافة الي السلة" : "اضف الي السلة"}
                                </span>
                        </div>
               </div>
       `;
}

function renderCofertaChild(container, product) {
  const inCart = isInCart(product);
  const oldPrice = oldPriceOf(product);
  const variants = collectColorVariants(product);
  const defaultVariant = variants[0] || {
    color: product.color || "",
    img: product.img || PLACEHOLDER_IMG,
  };
  const imgSrc =
    defaultVariant.img && defaultVariant.img.trim() !== ""
      ? defaultVariant.img
      : PLACEHOLDER_IMG;
  const detailsLink = `../item.html?col=coferta&docId=${product.docId}`;

  container.innerHTML += `
        <div class="product">
                                          ${product.word ? `<p class="ooo">${product.word}</p>` : ""}
                    ${discountBadge(product, oldPrice)}
                   <div class="img_product">
          <a href="${detailsLink}"> <img src="${imgSrc}" alt="" class="product-image" data-id="${product.id}"></a>
                   </div>

                   ${renderColorSwatches(variants, product.id)}

                   <div class="stars" data-item-id="coferta-${product.docId}">
                       <i class="fa-solid fa-star"></i>
                       <i class="fa-solid fa-star"></i>
                       <i class="fa-solid fa-star"></i>
                       <i class="fa-solid fa-star"></i>
                       <i class="fa-solid fa-star"></i>
                   </div>

                        <p class="name_product">${product.name}</p>

                        <div class="price">
                        ${oldPriceParagraph(oldPrice)}
                        <p><span> <span>${product.price} </span> جنيه</span></p>
                        </div>

                        <div class="size">
                          <p><span> <span> اللون :</span> <span class="selected-color" data-product-id="${product.id}">${variants.length > 1 ? colorsCountLabel(variants.length) : defaultVariant.color}</span></span></p>
                        </div>

                          <div class="shipping-container">
    <div class="shipping-label">
    <i class="fa-solid fa-paperclip"></i>
      <span> ${"كوفرتي اطفال"} </span>
    </div>

    <div class="shipping-label">
    <i class="fa-solid fa-industry"></i>
      <span>شركة ${product.manufacturer || ""}</span>
    </div>
  </div>

                        <div class="icons">
                            <span class="btn_add_cart ${inCart ? "active" : ""}" data-id="${product.id}" data-color="${defaultVariant.color}">
                                    <i class="fa-solid fa-cart-plus"></i> ${inCart ? "تم اضافة الي السلة" : "اضف الي السلة"}
                                </span>
                        </div>
               </div>
       `;
}

async function loadCoferta() {
  if (!coferta_man && !coferta_child) return;
  try {
    const snapshot = await getDocs(collection(db, "coferta"));
    let date = [];
    snapshot.forEach((docSnap) => date.push({ docId: docSnap.id, ...docSnap.data() }));
    date.sort(() => 0.5 - Math.random());

    date.forEach((product) => {
      if (product.catetory === "coferta_man" && coferta_man) {
        renderCofertaMan(coferta_man, product);
      }
      if (product.catetory === "coferta_child" && coferta_child) {
        renderCofertaChild(coferta_child, product);
      }
    });

    setupColorSwitching(coferta_man);
    setupColorSwitching(coferta_child);
    setupBestsellerTracking(coferta_man, "coferta");
    setupBestsellerTracking(coferta_child, "coferta");

    applyRealRatings(coferta_man);
    applyRealRatings(coferta_child);

    setTimeout(setupCartEvents, 100);
  } catch (err) {
    console.error("حصل خطأ في تحميل منتجات الكوفرتة من Firestore:", err);
  }
}

// ============================================================================
// قسم اللحاف (كان items_home_ellehaf1.js + items_home_ellehaf2.js)
// ============================================================================

const ellehaf_man = document.getElementById("ellehaf_man");
const ellehaf_child = document.getElementById("ellehaf_child");

function renderEllehaf(container, product, shippingLabel) {
  const inCart = isInCart(product);
  const oldPrice = oldPriceOf(product);
  const variants = collectColorVariants(product);
  const defaultVariant = variants[0] || {
    color: product.color || "",
    img: product.img || PLACEHOLDER_IMG,
  };
  const imgSrc =
    defaultVariant.img && defaultVariant.img.trim() !== ""
      ? defaultVariant.img
      : PLACEHOLDER_IMG;
  const detailsLink = `../item.html?col=ellehaf&docId=${product.docId}`;

  container.innerHTML += `
         <div class=" product">
                           ${product.word ? `<p class="ooo">${product.word}</p>` : ""}
                    ${discountBadge(product, oldPrice)}
                   <div class="img_product">
          <a href="${detailsLink}"> <img src="${imgSrc}" alt="" class="product-image" data-id="${product.id}"></a>
                   </div>

                   ${renderColorSwatches(variants, product.id)}

                   <div class="stars" data-item-id="ellehaf-${product.docId}">
                       <i class="fa-solid fa-star"></i>
                       <i class="fa-solid fa-star"></i>
                       <i class="fa-solid fa-star"></i>
                       <i class="fa-solid fa-star"></i>
                       <i class="fa-solid fa-star"></i>
                   </div>

                        <p class="name_product">${product.name}</p>

                        <div class="price">
                        ${oldPriceParagraph(oldPrice)}
                        <p><span> <span>${product.price} </span> جنيه</span></p>
                        </div>
                        <div class="size">
                          <p><span> <span>  اللون : </span> <span class="selected-color" data-product-id="${product.id}">${variants.length > 1 ? colorsCountLabel(variants.length) : defaultVariant.color}</span>  </span></p>
                        </div>

  <div class="shipping-container">
    <div class="shipping-label">
    <i class="fa-solid fa-paperclip"></i>
      <span> ${shippingLabel} </span>
    </div>

    <div class="shipping-label">
    <i class="fa-solid fa-industry"></i>
      <span>شركة ${product.manufacturer || ""}</span>
    </div>
  </div>
                        <div class="icons">
                            <span class="btn_add_cart ${inCart ? "active" : ""}" data-id="${product.id}" data-color="${defaultVariant.color}">
                                    <i class="fa-solid fa-cart-plus"></i> ${inCart ? "تم اضافة الي السلة" : "اضف الي السلة"}
                                </span>
                        </div>
               </div>
       `;
}

async function loadEllehaf() {
  if (!ellehaf_man && !ellehaf_child) return;
  try {
    const snapshot = await getDocs(collection(db, "ellehaf"));
    let date = [];
    snapshot.forEach((docSnap) => date.push({ docId: docSnap.id, ...docSnap.data() }));
    date.sort(() => 0.5 - Math.random());

    date.forEach((product) => {
      if (product.catetory === "ellehaf_man" && ellehaf_man) {
        renderEllehaf(ellehaf_man, product, "لحاف كبير");
      }
      if (product.catetory === "ellehaf_child" && ellehaf_child) {
        renderEllehaf(ellehaf_child, product, "لحاف اطفال");
      }
    });

    setupColorSwitching(ellehaf_man);
    setupColorSwitching(ellehaf_child);
    setupBestsellerTracking(ellehaf_man, "ellehaf");
    setupBestsellerTracking(ellehaf_child, "ellehaf");

    applyRealRatings(ellehaf_man);
    applyRealRatings(ellehaf_child);

    setTimeout(setupCartEvents, 100);
  } catch (err) {
    console.error("حصل خطأ في تحميل منتجات الباتاتين من Firestore:", err);
  }
}

// ============================================================================
// قسم الفوط (كان items_home_feyat1.js + items_home_feyat2.js)
// نفس القالب بالظبط لكل الحاويات الأربعة
// ============================================================================

const feyat_three = document.getElementById("feyat_three");
const feyat_four = document.getElementById("feyat_four");
const feyat_six = document.getElementById("feyat_six");
const feyat_child = document.getElementById("feyat_child");

function renderFeyat(container, product) {
  const inCart = isInCart(product);
  const oldPrice = oldPriceOf(product);
  const imgSrc = product.img && product.img.trim() !== "" ? product.img : PLACEHOLDER_IMG;
  const detailsLink = `../item.html?col=feyat&docId=${product.docId}`;

  container.innerHTML += `
        <div class=" product">
                                       ${product.word ? `<p class="ooo">${product.word}</p>` : ""}
                    ${discountBadge(product, oldPrice)}
                   <div class="img_product">
          <a href="${detailsLink}"> <img src="${imgSrc}" alt="" class="product-image" data-id="${product.id}"></a>
                   </div>

                   <div class="stars" data-item-id="feyat-${product.docId}">
                       <i class="fa-solid fa-star"></i>
                       <i class="fa-solid fa-star"></i>
                       <i class="fa-solid fa-star"></i>
                       <i class="fa-solid fa-star"></i>
                       <i class="fa-solid fa-star"></i>
                   </div>

                        <p class="name_product">${product.name}</p>

                        <div class="price">
                        ${oldPriceParagraph(oldPrice)}
                        <p><span> <span>${product.price} </span> جنيه</span></p>
                        </div>
                           <div class="size">
                          <p><span> <span>${product.size || ""} </span>: مقاس </span></p>
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
                            <span class="btn_add_cart ${inCart ? "active" : ""}" data-id="${product.id}">
                                    <i class="fa-solid fa-cart-plus"></i> ${inCart ? "تم اضافة الي السلة" : "اضف الي السلة"}
                                </span>
                        </div>
               </div>
       `;
}

async function loadFeyat() {
  if (!feyat_three && !feyat_four && !feyat_six && !feyat_child) return;
  try {
    const snapshot = await getDocs(collection(db, "feyat"));
    let date = [];
    snapshot.forEach((docSnap) => date.push({ docId: docSnap.id, ...docSnap.data() }));
    date.sort(() => 0.5 - Math.random());

    date.forEach((product) => {
      if (product.catetory === "feyat_three" && feyat_three) renderFeyat(feyat_three, product);
      if (product.catetory === "feyat_four" && feyat_four) renderFeyat(feyat_four, product);
      if (product.catetory === "feyat_six" && feyat_six) renderFeyat(feyat_six, product);
      if (product.catetory === "feyat_child" && feyat_child) renderFeyat(feyat_child, product);
    });

    applyRealRatings(feyat_three);
    applyRealRatings(feyat_four);
    applyRealRatings(feyat_six);
    applyRealRatings(feyat_child);

    setTimeout(setupCartEvents, 100);
  } catch (err) {
    console.error("حصل خطأ في تحميل منتجات الفوط من Firestore:", err);
  }
}

// ============================================================================
// قسم الملايات (كان items_home_mlayat1.js + items_home_mlayat2.js)
// ============================================================================

const mlayat_meshgar = document.getElementById("mlayat_meshgar");
const mlayat_sada = document.getElementById("mlayat_sada");
const mlayat_child = document.getElementById("mlayat_child");

// قالب المشجر/السادة (زي ملايات الكبار)
function renderMlayatStandard(container, product) {
  const inCart = isInCart(product);
  const oldPrice = oldPriceOf(product);
  const variants = collectColorVariants(product);
  const defaultVariant = variants[0] || {
    color: product.color || "",
    img: product.img || PLACEHOLDER_IMG,
  };
  const imgSrc =
    defaultVariant.img && defaultVariant.img.trim() !== ""
      ? defaultVariant.img
      : PLACEHOLDER_IMG;
  const detailsLink = `../item.html?col=mlayat&docId=${product.docId}`;

  container.innerHTML += `
        <div class=" product">
                                ${product.word ? `<p class="ooo">${product.word}</p>` : ""}
                    ${discountBadge(product, oldPrice)}
                   <div class="img_product">
          <a href="${detailsLink}"> <img src="${imgSrc}" alt="" class="product-image" data-id="${product.id}"></a>
                   </div>

                   ${renderColorSwatches(variants, product.id)}

                   <div class="stars" data-item-id="mlayat-${product.docId}">
                       <i class="fa-solid fa-star"></i>
                       <i class="fa-solid fa-star"></i>
                       <i class="fa-solid fa-star"></i>
                       <i class="fa-solid fa-star"></i>
                       <i class="fa-solid fa-star"></i>
                   </div>

                   <p class="name_product">${product.name}</p>

                        <div class="price">
                        ${oldPriceParagraph(oldPrice)}
                        <p><span> <span>${product.price} </span> جنيه</span></p>
                        </div>
                        <div class="size">
                          <p><span> <span>  اللون : </span> <span class="selected-color" data-product-id="${product.id}">${variants.length > 1 ? colorsCountLabel(variants.length) : defaultVariant.color}</span>  </span></p>
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
                            <span class="btn_add_cart ${inCart ? "active" : ""}" data-id="${product.id}" data-name="${product.name}" data-price="${product.price}" data-img="${imgSrc}" data-color="${defaultVariant.color}">
                                    <i class="fa-solid fa-cart-plus"></i> ${inCart ? "تم اضافة الي السلة" : "اضف الي السلة"}
                                </span>
                        </div>
               </div>
       `;
}

// قالب ملايات الأطفال (بيعرض المقاس بدل اللون لو مفيش لون)
function renderMlayatChild(container, product) {
  const variants = collectColorVariants(product);
  const hasColor = variants.length > 0;

  let label = "اللون";
  let displayValue = hasColor
    ? variants.length > 1
      ? colorsCountLabel(variants.length)
      : variants[0].color
    : "";

  if (!hasColor && product.size) {
    label = "المقاس";
    if (product.size.includes("x")) {
      const sizes = product.size.split("x").map((s) => s.trim());
      displayValue = sizes.length === 2 ? ` ${sizes[1]} سم ×  ${sizes[0]} سم` : product.size;
    } else {
      displayValue = product.size;
    }
  }

  const inCart = isInCart(product);
  const oldPrice = oldPriceOf(product);
  const defaultImg = hasColor ? variants[0].img : product.img || PLACEHOLDER_IMG;
  const imgSrc = defaultImg && defaultImg.trim() !== "" ? defaultImg : PLACEHOLDER_IMG;
  const detailsLink = `../item.html?col=mlayat&docId=${product.docId}`;

  container.innerHTML += `
                <div class="product">
                   ${product.word ? `<p class="ooo">${product.word}</p>` : ""}
                    ${discountBadge(product, oldPrice)}
                    <div class="img_product">
          <a href="${detailsLink}"> <img src="${imgSrc}" alt="" class="product-image" data-id="${product.id}"></a>
                    </div>

                    ${renderColorSwatches(variants, product.id)}

                    <div class="stars" data-item-id="mlayat-${product.docId}">
                        <i class="fa-solid fa-star"></i>
                        <i class="fa-solid fa-star"></i>
                        <i class="fa-solid fa-star"></i>
                        <i class="fa-solid fa-star"></i>
                        <i class="fa-solid fa-star"></i>
                    </div>

                        <p class="name_product">${product.name}</p>

                    <div class="price">
                        ${oldPriceParagraph(oldPrice)}
                        <p><span><span>${product.price}</span> جنيه</span></p>
                    </div>

                    <div class="size">
                        <p><span><span> ${label} : </span> <span class="${hasColor ? "selected-color" : ""}" ${hasColor ? `data-product-id="${product.id}"` : ""}>${displayValue}</span></span></p>
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
                        <span class="btn_add_cart ${inCart ? "active" : ""}" data-id="${product.id}" data-name="${product.name}" data-price="${product.price}" data-img="${imgSrc}" ${hasColor ? `data-color="${variants[0].color}"` : ""}>
                            <i class="fa-solid fa-cart-plus"></i> ${inCart ? "تم اضافة الي السلة" : "اضف الي السلة"}
                        </span>
                    </div>
                </div>
            `;
}

async function loadMlayat() {
  if (!mlayat_meshgar && !mlayat_sada && !mlayat_child) return;
  try {
    const snapshot = await getDocs(collection(db, "mlayat"));
    let date = [];
    snapshot.forEach((docSnap) => date.push({ docId: docSnap.id, ...docSnap.data() }));
    date.sort(() => 0.5 - Math.random());

    date.forEach((product) => {
      if (product.catetory === "mlayat_meshgar" && mlayat_meshgar) {
        renderMlayatStandard(mlayat_meshgar, product);
      }
      if (product.catetory === "mlayat_sada" && mlayat_sada) {
        renderMlayatStandard(mlayat_sada, product);
      }
      if (product.catetory === "mlayat_child" && mlayat_child) {
        renderMlayatChild(mlayat_child, product);
      }
    });

    setupColorSwitching(mlayat_meshgar);
    setupColorSwitching(mlayat_sada);
    setupColorSwitching(mlayat_child);

    setupBestsellerTracking(mlayat_meshgar, "mlayat");
    setupBestsellerTracking(mlayat_sada, "mlayat");
    setupBestsellerTracking(mlayat_child, "mlayat");

    applyRealRatings(mlayat_meshgar);
    applyRealRatings(mlayat_sada);
    applyRealRatings(mlayat_child);

    setTimeout(setupCartEvents, 100);
  } catch (err) {
    console.error("حصل خطأ في تحميل منتجات الملايات من Firestore:", err);
  }
}

// ============================================================================
// قسم الباتاتين (كان items_home_patatin1.js + items_home_patatin2.js)
// ============================================================================

const patatin_man = document.getElementById("patatin_man");
const patatin_child = document.getElementById("patatin_child");

function renderPatatinMan(container, product) {
  const inCart = isInCart(product);
  const oldPrice = oldPriceOf(product);
  const variants = collectColorVariants(product);
  const defaultVariant = variants[0] || {
    color: product.color || "",
    img: product.img || PLACEHOLDER_IMG,
  };
  const imgSrc =
    defaultVariant.img && defaultVariant.img.trim() !== ""
      ? defaultVariant.img
      : PLACEHOLDER_IMG;
  const detailsLink = `../item.html?col=patatin&docId=${product.docId}`;

  container.innerHTML += `
         <div class=" product">
                           ${product.word ? `<p class="ooo">${product.word}</p>` : ""}
                    ${discountBadge(product, oldPrice)}
                   <div class="img_product">
          <a href="${detailsLink}"> <img src="${imgSrc}" alt="" class="product-image" data-id="${product.id}"></a>
                   </div>

                   ${renderColorSwatches(variants, product.id)}

                   <div class="stars" data-item-id="patatin-${product.docId}">
                       <i class="fa-solid fa-star"></i>
                       <i class="fa-solid fa-star"></i>
                       <i class="fa-solid fa-star"></i>
                       <i class="fa-solid fa-star"></i>
                       <i class="fa-solid fa-star"></i>
                   </div>

                        <p class="name_product">${product.name}</p>

                        <div class="price">
                        ${oldPriceParagraph(oldPrice)}
                        <p><span> <span>${product.price} </span> جنيه</span></p>
                        </div>
                        <div class="size">
                          <p><span> <span>  اللون : </span> <span class="selected-color" data-product-id="${product.id}">${variants.length > 1 ? colorsCountLabel(variants.length) : defaultVariant.color}</span>  </span></p>
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
                            <span class="btn_add_cart ${inCart ? "active" : ""}" data-id="${product.id}" data-name="${product.name}" data-price="${product.price}" data-img="${imgSrc}" data-color="${defaultVariant.color}">
                                    <i class="fa-solid fa-cart-plus"></i> ${inCart ? "تم اضافة الي السلة" : "اضف الي السلة"}
                                </span>
                        </div>
               </div>
       `;
}

function renderPatatinChild(container, product) {
  const inCart = isInCart(product);
  const oldPrice = oldPriceOf(product);
  const variants = collectColorVariants(product);
  const defaultVariant = variants[0] || {
    color: product.color || "",
    img: product.img || PLACEHOLDER_IMG,
  };
  const imgSrc =
    defaultVariant.img && defaultVariant.img.trim() !== ""
      ? defaultVariant.img
      : PLACEHOLDER_IMG;
  const detailsLink = `../item.html?col=patatin&docId=${product.docId}`;

  container.innerHTML += `
         <div class=" product">
                           ${product.word ? `<p class="ooo">${product.word}</p>` : ""}
                    ${discountBadge(product, oldPrice)}
                   <div class="img_product">
          <a href="${detailsLink}"> <img src="${imgSrc}" alt="" class="product-image" data-id="${product.id}"></a>
                   </div>

                   ${renderColorSwatches(variants, product.id)}

                   <div class="stars" data-item-id="patatin-${product.docId}">
                       <i class="fa-solid fa-star"></i>
                       <i class="fa-solid fa-star"></i>
                       <i class="fa-solid fa-star"></i>
                       <i class="fa-solid fa-star"></i>
                       <i class="fa-solid fa-star"></i>
                   </div>

                        <p class="name_product">${product.name}</p>

                        <div class="price">
                        ${oldPriceParagraph(oldPrice)}
                        <p><span> <span>${product.price} </span> جنيه</span></p>
                        </div>
                        <div class="size">
                          <p><span> <span>  اللون : </span> <span class="selected-color" data-product-id="${product.id}">${variants.length > 1 ? colorsCountLabel(variants.length) : defaultVariant.color}</span>  </span></p>
                        </div>

  <div class="shipping-container">
    <div class="shipping-label">
    <i class="fa-solid fa-paperclip"></i>
      <span> ${"بطاطين طفال"} </span>
    </div>

    <div class="shipping-label">
    <i class="fa-solid fa-industry"></i>
      <span>شركة ${product.manufacturer || ""}</span>
    </div>
  </div>
                        <div class="icons">
                            <span class="btn_add_cart ${inCart ? "active" : ""}" data-id="${product.id}" data-color="${defaultVariant.color}">
                                    <i class="fa-solid fa-cart-plus"></i> ${inCart ? "تم اضافة الي السلة" : "اضف الي السلة"}
                                </span>
                        </div>
               </div>
       `;
}

async function loadPatatin() {
  if (!patatin_man && !patatin_child) return;
  try {
    const snapshot = await getDocs(collection(db, "patatin"));
    let date = [];
    snapshot.forEach((docSnap) => date.push({ docId: docSnap.id, ...docSnap.data() }));
    date.sort(() => 0.5 - Math.random());

    date.forEach((product) => {
      if (product.catetory === "patatin_man" && patatin_man) {
        renderPatatinMan(patatin_man, product);
      }
      if (product.catetory === "patatin_child" && patatin_child) {
        renderPatatinChild(patatin_child, product);
      }
    });

    setupColorSwitching(patatin_man);
    setupColorSwitching(patatin_child);
    setupBestsellerTracking(patatin_man, "patatin");
    setupBestsellerTracking(patatin_child, "patatin");

    applyRealRatings(patatin_man);
    applyRealRatings(patatin_child);

    setTimeout(setupCartEvents, 100);
  } catch (err) {
    console.error("حصل خطأ في تحميل منتجات الباتاتين من Firestore:", err);
  }
}

// ============================================================================
// قسم البراريس (كان items_home_paranes.js)
// ============================================================================

const paranes = document.getElementById("paranes");

async function loadParanes() {
  if (!paranes) return;
  try {
    const snapshot = await getDocs(collection(db, "paranes"));
    let date = [];
    snapshot.forEach((docSnap) => date.push({ docId: docSnap.id, ...docSnap.data() }));
    date.sort(() => 0.5 - Math.random());

    date.forEach((product) => {
      const inCart = isInCart(product);
      const oldPrice = oldPriceOf(product);
      const detailsLink = `../item.html?col=paranes&docId=${product.docId}`;
      const imgSrc = product.img && product.img.trim() !== "" ? product.img : PLACEHOLDER_IMG;

      paranes.innerHTML += `
        <div class="product">
                  ${product.word ? `<p class="ooo">${product.word}</p>` : ""}

                    ${discountBadge(product, oldPrice)}
                   <div class="img_product">
          <a href="${detailsLink}"> <img src="${imgSrc}" alt="" class="product-image" data-id="${product.id}"></a>
                   </div>

                   <div class="stars" data-item-id="paranes-${product.docId}">
                       <i class="fa-solid fa-star"></i>
                       <i class="fa-solid fa-star"></i>
                       <i class="fa-solid fa-star"></i>
                       <i class="fa-solid fa-star"></i>
                       <i class="fa-solid fa-star"></i>
                   </div>

                        <p class="name_product">${product.name}</p>

                        <div class="price">
                        ${oldPriceParagraph(oldPrice)}
                        <p><span> <span>${product.price} </span> جنيه</span></p>
                        </div>

                        <div class="size">
                          <p><span> <span> اللون :</span> ${product.color}</span></p>
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
                            <span class="btn_add_cart ${inCart ? "active" : ""}" data-id="${product.id}" data-name="${product.name}" data-price="${product.price}" data-img="${imgSrc}">
                                    <i class="fa-solid fa-cart-plus"></i> ${inCart ? "تم اضافة الي السلة" : "اضف الي السلة"}
                                </span>
                        </div>
               </div>
       `;
    });

    setupBestsellerTracking(paranes, "paranes");

    applyRealRatings(paranes);

    setTimeout(setupCartEvents, 100);
  } catch (err) {
    console.error("حصل خطأ في تحميل المنتجات من Firestore:", err);
  }
}

// ============================================================================
// تشغيل كل الأقسام
// ============================================================================

loadCoferta();
loadEllehaf();
loadFeyat();
loadMlayat();
loadPatatin();
loadParanes();