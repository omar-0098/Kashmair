// cart-suggestions.js
// بيقرا نوع (كوليكشن) المنتجات الموجودة في سلة المستخدم، وبيعرض قسم
// "مقترح لك" فيه منتجات تانية من نفس النوع من Firestore.
// لو مفيش بيانات كوليكشن محفوظة في السلة (منتجات قديمة اتضافت قبل التحديث ده)
// بيرجع تلقائياً يقترح من كل الكوليكشنز.

import { db } from "./firebase-config.js";
import {
  collection,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const ALL_COLLECTIONS = ["paranes", "feyat", "mlayat", "ellehaf", "patatin", "coferta"];
const PLACEHOLDER_IMG = "img/placeholder.jpg";
const SUGGESTIONS_LIMIT = 10;
const PER_COLLECTION_LIMIT = 6;

function shuffle(arr) {
  return [...arr].sort(() => 0.5 - Math.random());
}

// بيدور على أفضل تفصيلة نعرضها (لون، أو أول لون من ألوان متعددة، أو مقاس)
function getDetailLine(product) {
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

  return null;
}

// بيرجع أول لون متاح للمنتج (سواء color لوحده أو أول واحد من color1, color2, ...)
// عشان نضيفه كـ data-color على زرار "أضف للسلة" فيظهر في الكارت
function getPrimaryColor(product) {
  if (product.color && String(product.color).trim() !== "") {
    return product.color;
  }
  const colorKeys = Object.keys(product)
    .filter((key) => /^color\d+$/.test(key))
    .sort((a, b) => parseInt(a.replace("color", ""), 10) - parseInt(b.replace("color", ""), 10));
  if (colorKeys.length > 0 && product[colorKeys[0]]) {
    return product[colorKeys[0]];
  }
  return "";
}

// بيجمع كل الألوان المتاحة للمنتج (اللون + صورته) عشان نقدر نبدل بينهم من داخل السلة
function collectColorVariants(product) {
  const colorKeys = Object.keys(product)
    .filter((key) => /^color\d+$/.test(key))
    .sort((a, b) => parseInt(a.replace("color", ""), 10) - parseInt(b.replace("color", ""), 10));

  const variants = colorKeys
    .map((key) => {
      const index = key.replace("color", "");
      const colorName = product[key];
      const imgKey = `color${index}_img`;
      const img = product[imgKey] && product[imgKey].trim() !== "" ? product[imgKey] : "";
      return { color: colorName, img };
    })
    .filter((v) => v.color && String(v.color).trim() !== "");

  if (variants.length === 0 && product.color && String(product.color).trim() !== "") {
    variants.push({ color: product.color, img: product.img || "" });
  }

  return variants;
}

// بيحدد الكوليكشنز اللي هنجيب منها الاقتراحات بناءً على محتوى السلة الحالي
function getTargetCollections() {
  const cart = JSON.parse(localStorage.getItem("cart")) || [];
  const cols = [...new Set(cart.map((item) => item.col).filter(Boolean))];
  return {
    cart,
    cols: cols.length ? cols : ALL_COLLECTIONS,
  };
}

function buildSuggestionCard(product) {
  const cart = JSON.parse(localStorage.getItem("cart")) || [];
  const isInCart = cart.some((item) => item.id === product.id);

  const oldPrice = Number(product.old_price) || 0;
  const old_price_pragrahp = oldPrice ? `<p class="old_price">جنيه ${oldPrice}</p>` : "";
  const parcent_disc_div =
    oldPrice > product.price
      ? `<span class="sale_present">%${Math.floor(((oldPrice - product.price) / oldPrice) * 100)}</span>`
      : "";

  const imgSrc = product.img && product.img.trim() !== "" ? product.img : PLACEHOLDER_IMG;
  const detailsLink = `Furniture/item.html?col=${product.col}&docId=${product.docId}`;
  const detail = getDetailLine(product);
  const detailLine = detail
    ? `<div class="size"><p><span> <span> ${detail.label} :</span> ${detail.value}</span></p></div>`
    : "";

  return `
    <div class="product">
      ${parcent_disc_div}
      ${product.word ? `<p class="ooo">${product.word}</p>` : ""}
      <div class="img_product">
        <a href="${detailsLink}"><img src="${imgSrc}" alt="" class="product-image" data-id="${product.id}"></a>
      </div>

      <div class="stars">
        <i class="fa-solid fa-star"></i>
        <i class="fa-solid fa-star"></i>
        <i class="fa-solid fa-star"></i>
        <i class="fa-solid fa-star"></i>
        <i class="fa-solid fa-star"></i>
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
                <i class="fa-solid fa-truck-fast"></i>
                <span>خدمة سريعة</span>
              </div>
            </div>`
          : ""
      }

      <div class="icons">
        <span class="btn_add_cart ${isInCart ? "active" : ""}" data-id="${product.id}" data-name="${product.name}" data-price="${product.price}" data-img="${imgSrc}" data-col="${product.col}" data-doc-id="${product.docId}" data-color="${getPrimaryColor(product)}" data-size="${product.size || ""}" data-type="${product.type || ""}" data-colors="${encodeURIComponent(JSON.stringify(collectColorVariants(product)))}">
          <i class="fa-solid fa-cart-plus"></i> ${isInCart ? "تم اضافة الي السلة" : "اضف الي السلة"}
        </span>
      </div>
    </div>
  `;
}

async function loadSuggestions() {
  const container = document.getElementById("cart_suggestions");
  const section = document.getElementById("suggestions-section");
  if (!container) return;

  const { cart, cols } = getTargetCollections();
  const cartIds = new Set(cart.map((item) => String(item.id)));

  try {
    const results = await Promise.all(
      cols.map(async (col) => {
        const snap = await getDocs(collection(db, col));
        const items = [];
        snap.forEach((docSnap) => {
          const data = { docId: docSnap.id, col, ...docSnap.data() };
          if (data.name && data.price && !cartIds.has(String(data.id))) {
            items.push(data);
          }
        });
        return shuffle(items).slice(0, PER_COLLECTION_LIMIT);
      })
    );

    const suggestions = shuffle(results.flat()).slice(0, SUGGESTIONS_LIMIT);

    if (suggestions.length === 0) {
      if (section) section.style.display = "none";
      return;
    }

    container.innerHTML = suggestions.map(buildSuggestionCard).join("");
  } catch (err) {
    console.error("تعذر تحميل المنتجات المقترحة:", err);
    if (section) section.style.display = "none";
  }
}

loadSuggestions();