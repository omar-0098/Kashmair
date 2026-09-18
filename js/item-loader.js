// item-loader.js
// بيقرا المنتج من Firestore حسب البارامترات في الرابط:
// item.html?col=paranes&docId=6EkprykWLkPL91jqxDrM
// وبيعرض بياناته في صفحة item.html

import { db } from "./firebase-config.js";
import {
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

// حالة اللون/الصورة المختارة حاليًا (بتتحدث لما المستخدم يغيّر اللون)
let currentSelectedColor = undefined;
let currentSelectedImg = "";

// بيتأكد إن المستخدم مسجل دخول فعلاً (نفس الجلسة اللي بيستخدمها login2.js / account.js)
function isLoggedIn() {
  return !!(
    localStorage.getItem("kashmirSessionId") &&
    localStorage.getItem("kashmirUser")
  );
}

function getCartItem(id, color) {
  const cart = JSON.parse(localStorage.getItem("cart")) || [];
  return cart.find((item) => item.id === id && (item.color || undefined) === (color || undefined));
}

// بيرسم إما زرار "أضف للسلة" أو عداد الكمية (- / +) حسب حالة المنتج في السلة
function renderCartControl(product) {
  const wrapper = document.getElementById("detailsCartControl");
  if (!wrapper) return;

  const cartItem = getCartItem(product.id, currentSelectedColor);
  wrapper.innerHTML = "";

  if (cartItem) {
    // المنتج (باللون الحالي) موجود في السلة بالفعل: العداد بيتحكم في كميته جوه السلة مباشرة
    const qtyBox = document.createElement("div");
    qtyBox.className = "qty-control";
    qtyBox.innerHTML = `
      <button type="button" class="qty-decrease">-</button>
      <span class="qty-value">${cartItem.quantity}</span>
      <button type="button" class="qty-increase">+</button>
    `;
    wrapper.appendChild(qtyBox);

    qtyBox.querySelector(".qty-increase").addEventListener("click", () => {
      changeDetailsQuantity(product, 1);
    });
    qtyBox.querySelector(".qty-decrease").addEventListener("click", () => {
      changeDetailsQuantity(product, -1);
    });
  } else {
    // لسه مش في السلة: نعرض زرار "أضف الي السلة" جنب عداد ثابت (واقف على 1، مش بيزود ولا بينقص)
    const row = document.createElement("div");
    row.className = "add-to-cart-row";

    const btn = document.createElement("span");
    btn.className = "btn_add_cart btn";
    btn.id = "detailsAddToCartBtn";
    btn.innerHTML = `<i class="fa-solid fa-cart-plus"></i> اضف الي السلة`;

    const qtyBox = document.createElement("div");
    qtyBox.className = "qty-control qty-control-static";
    qtyBox.innerHTML = `
      <button type="button" class="qty-decrease" disabled>-</button>
      <span class="qty-value">1</span>
      <button type="button" class="qty-increase" disabled>+</button>
    `;

    btn.addEventListener("click", () => {
      if (!isLoggedIn()) {
        if (typeof window.openModal === "function") {
          window.openModal();
        } else {
          alert("لازم تسجل دخول الأول عشان تقدر تضيف المنتج للسلة");
        }
        return;
      }

      const productToAdd = {
        id: product.id,
        name: product.name,
        price: product.price,
        img: currentSelectedImg,
      };
      if (currentSelectedColor) productToAdd.color = currentSelectedColor;
      if (product.size) productToAdd.size = product.size;
      if (product.type) productToAdd.type = product.type;
      const { col } = getParams();
      if (col) productToAdd.col = col;
      if (product.docId) productToAdd.docId = product.docId;
      const variants = collectColorVariants(product);
      if (variants.length > 0) productToAdd.colorVariants = variants;

      if (typeof addToCart === "function") {
        addToCart(productToAdd);
      }

      // العداد بياخد مكان زرار "أضف الي السلة" ويبقى فعّال (بيزود/بينقص كمية السلة)
      renderCartControl(product);
    });

    row.appendChild(btn);
    row.appendChild(qtyBox);
    wrapper.appendChild(row);
  }
}

// بيزود أو بينقص كمية المنتج المختار (باللون الحالي)، ولو وصلت صفر بيتشال من السلة
function changeDetailsQuantity(product, delta) {
  let cart = JSON.parse(localStorage.getItem("cart")) || [];
  const idx = cart.findIndex(
    (item) => item.id === product.id && (item.color || undefined) === (currentSelectedColor || undefined)
  );
  if (idx === -1) return;

  cart[idx].quantity += delta;

  if (cart[idx].quantity <= 0) {
    cart.splice(idx, 1);
  }

  localStorage.setItem("cart", JSON.stringify(cart));
  if (typeof updateCart === "function") updateCart();
  renderCartControl(product);
}

// حقول ثابتة بنعرضها بأسماء عربية واضحة ومزودة بالأيقونات
const FIELD_LABELS = {
  size: '<i class="fa-solid fa-ruler"></i> المقاس',
  color: '<i class="fa-solid fa-palette"></i> اللون',
  Pieces: '<i class="fa-solid fa-box-open"></i> القطع',
  Number_pieces: '<i class="fa-solid fa-list-ul"></i> عدد القطع',
  type: '<i class="fa-regular fa-square-plus"></i> النوع',
  manufacturer: '<i class="fa-solid fa-industry"></i> الشركة المصنعة',
};

// حقول مش هنعرضها في قسم "تفاصيل إضافية" لأنها بتتعرض في مكان تاني أو داخلية
const HIDDEN_FIELDS = new Set([
  "id",
  "catetory",
  "name",
  "price",
  "old_price",
  "link",
  "word",
]);

// بيجمع كل الألوان الموجودة في المنتج (colorN + colorN_img)
function collectColorVariants(product) {
  const colorKeys = Object.keys(product)
    .filter((key) => /^color\d+$/.test(key))
    .sort((a, b) => {
      const numA = parseInt(a.replace("color", ""), 10);
      const numB = parseInt(b.replace("color", ""), 10);
      return numA - numB;
    });

  return colorKeys
    .map((key) => {
      const index = key.replace("color", "");
      const colorName = product[key];
      const imgKey = `color${index}_img`;
      const img = product[imgKey] && product[imgKey].trim() !== "" ? product[imgKey] : null;
      return { color: colorName, img };
    })
    .filter((v) => v.color && v.color.trim() !== "");
}

function getParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    col: params.get("col"),
    docId: params.get("docId"),
  };
}

function collectImages(product) {
  // بيجمع كل الحقول اللي اسمها img أو img1 أو img2... وبيرتبهم
  const imageKeys = Object.keys(product)
    .filter((key) => /^img\d*$/.test(key))
    .sort((a, b) => {
      const numA = parseInt(a.replace("img", "") || "0", 10);
      const numB = parseInt(b.replace("img", "") || "0", 10);
      return numA - numB;
    });

  return imageKeys
    .map((key) => product[key])
    .filter((val) => val && val.trim() !== "");
}

function renderImages(images) {
  const bigImg = document.getElementById("bidImg");
  const smContainer = document.getElementById("smImgsContainer");

  if (images.length === 0) {
    bigImg.src = "../images/placeholder.jpg";
    return;
  }

  bigImg.src = images[0];

  images.forEach((src) => {
    const imgEl = document.createElement("img");
    imgEl.src = src;
    imgEl.addEventListener("click", () => changeItemImage(src));
    smContainer.appendChild(imgEl);
  });
}

// بتضيف الـ CSS الخاص باللايت بوكس مرة واحدة بس (أول ما الملف يشتغل)
function injectLightboxStyles() {
  if (document.getElementById("imageLightboxStyles")) return;

  const style = document.createElement("style");
  style.id = "imageLightboxStyles";
  style.textContent = `
    .image-lightbox-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.45s ease, visibility 0s linear 0.45s;
      cursor: zoom-out;
    }
    .image-lightbox-overlay.active {
      opacity: 1;
      visibility: visible;
      transition: opacity 0.45s ease, visibility 0s linear 0s;
    }
    .image-lightbox-content img {
      max-width: 90vw;
      max-height: 90vh;
      border-radius: 8px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.45);
      transform: scale(0.85);
      transition: transform 0.45s ease;
    }
    .image-lightbox-overlay.active .image-lightbox-content img {
      transform: scale(1);
    }
    .color-swatch {
      cursor: zoom-in;
    }
  `;
  document.head.appendChild(style);
}

// بتجهز عنصر اللايت بوكس نفسه (لو مش موجود بتعمله)
function ensureLightboxElement() {
  let overlay = document.getElementById("imageLightboxOverlay");
  if (overlay) return overlay;

  overlay = document.createElement("div");
  overlay.id = "imageLightboxOverlay";
  overlay.className = "image-lightbox-overlay";
  overlay.innerHTML = `
    <div class="image-lightbox-content">
      <img id="imageLightboxImg" src="" alt="" />
    </div>
  `;

  // الضغط في أي حتة على الخلفية المعتمة بيقفل اللايت بوكس
  overlay.addEventListener("click", () => {
    overlay.classList.remove("active");
  });

  document.body.appendChild(overlay);
  return overlay;
}

// بتفتح اللايت بوكس على صورة معينة (تكبير الصورة + تعتيم الشاشة)
function openImageLightbox(src) {
  if (!src) return;
  injectLightboxStyles();
  const overlay = ensureLightboxElement();
  const img = document.getElementById("imageLightboxImg");
  img.src = src;
  overlay.classList.add("active");
}

// بتفتح اللايت بوكس بس لما يحصل دبل كليك بالماوس أو دبل تاب على الموبايل
function attachZoomOnDoubleActivation(element, handler) {
  // بيمنع المتصفح إنه يعمل الزوم الافتراضي بتاعه لما المستخدم يدوس مرتين بسرعة
  element.style.touchAction = "manipulation";

  // دبل كليك بالماوس (ديسكتوب)
  element.addEventListener("dblclick", (e) => {
    e.preventDefault();
    handler();
  });

  // دبل تاب باللمس (موبايل) - بنحسب الوقت بين الضغطتين يدويًا
  let lastTapTime = 0;
  element.addEventListener("touchend", (e) => {
    const now = Date.now();
    if (now - lastTapTime < 350) {
      e.preventDefault();
      handler();
    }
    lastTapTime = now;
  });
}

function renderColorVariants(product) {
  const variants = collectColorVariants(product);
  const container = document.getElementById("productColorSwatches");

  if (variants.length === 0) {
    container.style.display = "none";
    return;
  }

  container.style.display = "flex";
  container.innerHTML = "";

  const label = document.createElement("span");
  label.className = "color-swatches-label";
  label.innerHTML = `<i class="fa-solid fa-palette"></i> اختر اللون:`;
  container.appendChild(label);

  variants.forEach((v, i) => {
    const wrapper = document.createElement("div");
    wrapper.className = `color-swatch-wrapper ${i === 0 ? "active" : ""}`;

    const swatch = document.createElement("img");
    swatch.className = "color-swatch";
    swatch.src = v.img || "../images/placeholder.jpg";
    swatch.alt = v.color;

    // الضغط مرتين (دبل كليك بالماوس أو دبل تاب بالموبايل) على صورة اللون بيكبرها في لايت بوكس
    // (من غير ما يمنع اختيار اللون اللي بيحصل من ضغطة الـ wrapper العادية بره)
    attachZoomOnDoubleActivation(swatch, () => {
      openImageLightbox(v.img || swatch.src);
    });

    const nameLabel = document.createElement("span");
    nameLabel.className = "color-swatch-name";
    nameLabel.textContent = v.color;

    wrapper.appendChild(swatch);
    wrapper.appendChild(nameLabel);

    wrapper.addEventListener("click", () => {
      if (v.img) changeItemImage(v.img);
      container.querySelectorAll(".color-swatch-wrapper").forEach((el) => el.classList.remove("active"));
      wrapper.classList.add("active");

      // تحديث اللون/الصورة المختارة وإعادة رسم عنصر السلة (زرار أو عداد) حسب اللون الجديد
      currentSelectedColor = v.color;
      if (v.img) currentSelectedImg = v.img;
      renderCartControl(product);
    });

    container.appendChild(wrapper);
  });
}

function renderDetails(product) {
  const list = document.getElementById("productDetailsList");
  list.innerHTML = "";

  // الحقول المعروفة بترتيبها المنسق لو موجودة
  Object.keys(FIELD_LABELS).forEach((key) => {
    if (product[key] !== undefined && product[key] !== null && product[key] !== "") {
      const h5 = document.createElement("h5");
      h5.innerHTML = `${FIELD_LABELS[key]}: <span>${product[key]}</span>`;
      list.appendChild(h5);
    }
  });

  // أي حقول تانية مش معروفة ومش مخفية
  Object.keys(product).forEach((key) => {
    if (
      !HIDDEN_FIELDS.has(key) &&
      !FIELD_LABELS[key] &&
      !/^img\d*$/.test(key) &&
      !/^color\d+$/.test(key) &&
      !/^color\d+_img$/.test(key) &&
      key !== "docId"
    ) {
      const value = product[key];
      if (value === undefined || value === null || value === "") return;
      const h5 = document.createElement("h5");
      h5.innerHTML = `${key}: <span>${value}</span>`;
      list.appendChild(h5);
    }
  });
}

async function loadItem() {
  const { col, docId } = getParams();

  if (!col || !docId) {
    document.getElementById("productName").textContent = "المنتج غير موجود";
    return;
  }

  try {
    const docRef = doc(db, col, docId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      document.getElementById("productName").textContent = "المنتج غير موجود";
      return;
    }

    const product = { docId: docSnap.id, ...docSnap.data() };

    document.title = product.name ? `${product.name} | Kashmir Home` : document.title;
    document.getElementById("productName").textContent = product.name || "";
    document.getElementById("productNameRepeat").textContent = product.name || "";
    document.getElementById("productPrice").textContent = ` ${product.price} `;

    if (product.old_price && Number(product.old_price) > 0) {
      const oldPriceEl = document.getElementById("productOldPrice");
      oldPriceEl.textContent = `جنيه ${product.old_price}`;
      oldPriceEl.style.display = "block";
    }

    const images = collectImages(product);
    renderImages(images);
    renderColorVariants(product);
    renderDetails(product);

    // تجهيز حالة اللون/الصورة الافتراضية ورسم عنصر السلة (زرار أو عداد)
    currentSelectedImg = images[0] || "../images/placeholder.jpg";
    const initialVariants = collectColorVariants(product);
    if (initialVariants.length > 0) {
      currentSelectedColor = initialVariants[0].color;
      if (initialVariants[0].img) currentSelectedImg = initialVariants[0].img;
    } else {
      currentSelectedColor = undefined;
    }

    renderCartControl(product);

    // بيانات بتفيد باقي السكريبتات
    window.currentProduct = product;

    window.refreshDetailsCartControl = () => renderCartControl(product);
  } catch (err) {
    console.error("حصل خطأ في تحميل المنتج:", err);
    document.getElementById("productName").textContent = "حصل خطأ في تحميل المنتج";
  }
}

// دالة تغيير الصورة الكبيرة عند الضغط على صورة صغيرة
window.changeItemImage = function (src) {
  document.getElementById("bidImg").src = src;
};

loadItem();