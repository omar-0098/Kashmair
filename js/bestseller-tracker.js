// bestseller-tracker.js
// وحدة مشتركة: كل مرة حد يضيف منتج للسلة (في أي صفحة في الموقع)،
// بتزود عداد المنتج ده في كوليكشن "bestsellers" في Firestore.
// من غير الملف ده، مفيش طريقة نعرف فعليًا "الأكثر مبيعاً" إلا بالتخمين.

import { db } from "./firebase-config.js";
import {
  doc,
  setDoc,
  increment,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

export async function trackAddToCart(collectionName, productId) {
  if (!collectionName || !productId) return;
  try {
    const ref = doc(db, "bestsellers", `${collectionName}-${productId}`);
    await setDoc(
      ref,
      {
        collection: collectionName,
        productId: String(productId),
        count: increment(1),
        lastAddedAt: Date.now(),
      },
      { merge: true }
    );
  } catch (err) {
    console.error("تعذر تحديث عداد الأكثر مبيعاً:", err);
  }
}

// بيحط listener على أي حاوية منتجات، وبيتتبع بس لحظة "الإضافة" الفعلية
// (مش الحذف)، عن طريق فحص هل الزرار كان active قبل الضغط ولا لأ
export function attachBestsellerTracking(container, getProductByBtn) {
  if (!container) return;
  container.addEventListener("click", (e) => {
    const btn = e.target.closest(".btn_add_cart");
    if (!btn) return;
    if (btn.classList.contains("active")) return; // يبقى هيتشال، مش هيتضاف

    const info = getProductByBtn(btn);
    if (info) trackAddToCart(info.col, info.id);
  });
}
