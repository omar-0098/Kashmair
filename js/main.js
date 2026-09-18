const soldCounts = {};

// ✅ القوائم وفتح وإغلاق القوائم
let categoru_nav_list = document.querySelector(".categoru_nav_list");
function Open_Categ_list() {
  categoru_nav_list.classList.toggle("active");
}

let nav_links = document.querySelector(".nav_links");
function open_Menu() {
  nav_links.classList.toggle("active");
}

let cartPanel = document.querySelector(".cart");
function open_close_cart() {
  cartPanel.classList.toggle("active");
}

// ✅ أسعار الشحن حسب المحافظة
const shippingPrices = {
  cairo: 30, alexandria: 40, giza: 30, aswan: 50, asiyut: 50, beheira: 50,
  beni_suef: 50, dakahlia: 50, damietta: 50, fayoum: 50, gharbia: 50,
  ismailia: 50, kafr_elsheikh: 50, luxor: 60, matrouh: 50, minya: 50,
  monufia: 50, new_valley: 50, north_sinai: 70, port_said: 50, qalyubia: 50,
  qena: 50, red_sea: 50, sharqia: 50, sohag: 50, south_sinai: 70, suez: 50
};
// بنعرضها على window عشان أي سكربت تاني (زي js/cart-address.js) يقدر يتأكد من صحة اسم المحافظة
window.shippingPrices = shippingPrices;

const jsonFiles = [
  // "products-shop.json",
  "../../products-furniturre.json"
];

// ✅ سعر التغليف بيتحسب أوتوماتيك حسب نوع كل منتج في السلة (مفيش اختيار من المستخدم)
// السعر ده لكل قطعة، وبيتضرب في الكمية وبيتجمع على كل المنتجات في السلة
const packagingPriceByCollection = {
  ellehaf: 5,  // لحاف
  mlayat: 2,   // ملاية
  coferta: 2,  // كوفرتي
  patatin: 3,  // بطانية
  feyat: 2,    // فوط
  paranes: 3,  // برنس
};

function calculatePackagingCost(cart) {
  return cart.reduce((sum, item) => {
    const unitCost = packagingPriceByCollection[item.col] || 0;
    return sum + unitCost * (item.quantity || 1);
  }, 0);
}

// ✅ الانتقال لصفحة السلة الكاملة بدل فتح القائمة الجانبية
window.goToCart = function() {
  window.location.href = "cart.html";
    window.location.href = "../../cart.html";
    window.location.href = "../../../cart.html";
    window.location.href = "../../../../cart.html";

};

// ✅ دالة لرفع الصور إلى ImgBB
async function uploadImage(imagePath) {
  try {
    const fullPath = `../paranes/${imagePath}`;
    const response = await fetch(fullPath);
    const blob = await response.blob();
    
    const formData = new FormData();
    formData.append('image', blob);
    
    const uploadResponse = await fetch('https://api.imgbb.com/1/upload?key=YOUR_IMGBB_API_KEY', {
      method: 'POST',
      body: formData
    });
    
    const data = await uploadResponse.json();
    return data.data.url;
  } catch (error) {
    console.error('Error uploading image:', error);
    return 'رابط_صورة_افتراضية';
  }
}

// ✅ دالة إرسال الطلب إلى جوجل شيتس (محدثة)
async function submitOrderToGoogleSheets() {
  const cart = JSON.parse(localStorage.getItem('cart')) || [];
  const governorate = document.getElementById('governorates').value;
  const isPickup = document.getElementById("pickup_from_store")?.checked;
  const shippingCost = isPickup ? 0 : (shippingPrices[governorate] || 0);
  const customerName = document.getElementById('name')?.value || 'غير محدد';
  const customerPhone = document.getElementById('phone')?.value || 'غير محدد';
  const customerAddress = document.getElementById('address')?.value || 'غير محدد';

  const orderData = {
    customer: {
      name: customerName,
      phone: customerPhone,
      address: customerAddress,
      governorate: governorate
    },
    items: [],
    totalPrice: 0,
    shipping: shippingCost,
    timestamp: new Date().toISOString()
  };

  for (const item of cart) {
    try {
      const imageUrl = await uploadImage(item.img);
      const productName = item.name + (item.color ? ` - اللون: ${item.color}` : '');
      
      orderData.items.push({
        name: productName,
        price: item.price,
        quantity: item.quantity,
        imageUrl: imageUrl
      });
      
      orderData.totalPrice += item.price * item.quantity;
    } catch (error) {
      console.error('فشل رفع الصورة:', error);
      orderData.items.push({
        name: item.name + (item.color ? ` - اللون: ${item.color}` : ''),
        price: item.price,
        quantity: item.quantity,
        imageUrl: 'رابط_صورة_افتراضية'
      });
    }
  }

  try {
    const scriptUrl = 'YOUR_GOOGLE_SCRIPT_URL';
    console.log('بيانات الطلب المرسلة:', orderData); // للتتبع
    
    const response = await fetch(scriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderData)
    });
    
    const result = await response.text();
    console.log('تم الإرسال بنجاح:', result);
    return true;
  } catch (error) {
    console.error('Error submitting order:', error);
    return false;
  }
}

// ✅ دالة تحاول تحمل أول ملف شغال
function fetchFirstAvailableJSON(files) {
  if (files.length === 0) {
    throw new Error("مافي ولا ملف JSON متوفر 😓");
  }

  const currentFile = files[0];
  return fetch(currentFile).then(response => {
    if (!response.ok) {
      return fetchFirstAvailableJSON(files.slice(1));
    }
    return response.json();
  });
}

// ✅ إضافة منتج للسلة (محدثة)
function addToCart(product) {
  let cart = JSON.parse(localStorage.getItem('cart')) || [];
  const existingItem = cart.find(item => 
    item.id === product.id && 
    item.color === (product.color || undefined)
  );
  
  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    const newItem = { 
      ...product, 
      quantity: 1, 
      originalPrice: product.price 
    };
    if (!product.color) delete newItem.color;
    if (!product.size) delete newItem.size;
    if (!product.type) delete newItem.type;
    cart.push(newItem);
  }
  
  localStorage.setItem('cart', JSON.stringify(cart));
  updateCart();
}

// ✅ تحديث الكارت بالكامل (محدثة)
function updateCart() {
  const cartItemsContainer = document.getElementById("cart_items");
  const checkout_items = document.getElementById("checkout_items");
  // ✅ معاينة "شحنة" المصغّرة (كروت أفقية) اللي بتظهر في صفحة الدفع بس - عنصر مستقل عن checkout_items
  // عشان checkout_items بتستخدمها صفحة السلة (cart.html) كمان كقائمة تفصيلية كاملة للمنتجات
  const shipmentPreview = document.getElementById("cn_shipment_items");
  const cart = JSON.parse(localStorage.getItem('cart')) || [];

  let items_input = document.getElementById("items");
  let total_price_input = document.getElementById("total_price");
  let count_items_input = document.getElementById("count_items");

  let total_price = 0;
  let total_count = 0;

  const appliedCoupon = JSON.parse(localStorage.getItem("appliedCoupon"));
  const couponPercent = appliedCoupon?.percent || 0;

  if (checkout_items) checkout_items.innerHTML = "";
  if (items_input) items_input.value = "";
  if (total_price_input) total_price_input.value = "";
  if (count_items_input) count_items_input.value = "";

  if (shipmentPreview) shipmentPreview.innerHTML = "";

  if (cartItemsContainer) cartItemsContainer.innerHTML = "";

  cart.forEach((item, index) => {
    const itemPrice = item.originalPrice || item.price;
    const totalItemPrice = itemPrice * item.quantity;

    total_price += totalItemPrice;
    total_count += item.quantity;

    const hasColorSwitcher = Array.isArray(item.colorVariants) && item.colorVariants.length > 1;
    const colorHTML = hasColorSwitcher
      ? `
        <div class="cart-color-switcher" style="position:relative;margin:4px 0;">
          <button type="button" class="cart-color-toggle" data-index="${index}" style="border:1px solid #ddd;border-radius:6px;padding:3px 8px;font-size:13px;background:#fff;cursor:pointer;     font-weight: 700;
    font-style: normal;
    color: #0361c5; ">
            اللون: ${item.color || ""} <i class="fa-solid fa-chevron-down" style="font-size:10px;"></i>
          </button>
          <div class="cart-color-options" data-index="${index}" style="display:none;position:absolute;z-index:20;top:100%;right:0;background:#fff;border:1px solid #ddd;border-radius:6px;box-shadow:0 4px 12px rgba(0,0,0,0.1);min-width:140px;     padding: 0px 8px;">
            ${item.colorVariants
              .map(
                (v) => `
              <div class="cart-color-option" data-index="${index}" data-color="${v.color}" data-img="${v.img || ""}" style="display:flex;align-items:center;gap:6px;padding:8px 0px;cursor:pointer;font-size:13px; border-bottom: 1px solid #e0e0e0;">
                ${v.img ? `<img src="${v.img}" style="width:22px;height:22px;object-fit:cover;border-radius:4px;">` : ""}
                <span>${v.color}</span>
              </div>`
              )
              .join("")}
          </div>
        </div>`
      : item.color
      ? `<h5> اللون: ${item.color}</h5>`
      : "";

    const detailsLink = item.col && item.docId ? `Furniture/item.html?col=${item.col}&docId=${item.docId}` : null;
    const nameHTML = detailsLink ? `<a  href="${detailsLink}">${item.name}</a>` : item.name;
    const imgHTML = detailsLink
      ? `<a class="img" href="${detailsLink}"><img  src="${item.img}">           <h6 class="brand_tag" style="font-size:12px;color:#888;margin-top:4px;">من كشمير هوم</h6>
</a>`
      : `<img src="${item.img}">`;

    const itemHTML = `
      <div class="item_cart">
        ${imgHTML}
        <div class="content">
          <h4>${nameHTML}</h4>
          ${item.size ? `<h5> المقاس: ${item.size}</h5>` : ""}
          ${colorHTML}
          ${item.type ? `<h5> النوع: ${item.type}</h5>` : ""}
          <p class="price_cart">${totalItemPrice} ج</p>
          <div class="quantity_control">
            <button class="decrease_quantity" data-index="${index}">-</button>
            <span class="quantity">${item.quantity}</span>
            <button class="increase_quantity" data-index="${index}">+</button>
          </div>
        </div>
        <button class="delet_item" data-index="${index}"><i class="fa-solid fa-trash"></i></button>
      </div>
    `;

    if (cartItemsContainer) cartItemsContainer.innerHTML += itemHTML;
    if (checkout_items) checkout_items.innerHTML += itemHTML;

    if (shipmentPreview) {
      const shipmentItemHTML = `
        <div class="cn-ship-item">
          <div class="cn-ship-imgwrap">
            <img src="${item.img}" alt="${item.name}">
            <span class="cn-ship-qty">x${item.quantity}</span>
          </div>
          <p class="cn-ship-name">${item.name}</p>
          <p class="cn-ship-price">${totalItemPrice} جنيه</p>
        </div>
      `;
      shipmentPreview.innerHTML += shipmentItemHTML;
    }

    if (items_input) {
      const itemDescription = `${item.name}${item.size ? ` - المقاس: ${item.size}` : ''}${item.color ? ` - اللون: ${item.color}` : ''}${item.type ? ` - النوع: ${item.type}` : ''} ---- السعر: ${totalItemPrice} ---- الكمية: ${item.quantity}`;
      items_input.value += itemDescription + '\n';
    }
  });

  const shippingDisplay = document.getElementById("shipping_display");
  const pickupCheckbox = document.getElementById("pickup_from_store");
  const isPickup = pickupCheckbox?.checked;
  // لو مفيش قايمة اختيار محافظة في الصفحة (زي صفحة الكارت)، بنستخدم محافظة عنوان التوصيل
  // المحفوظ اللي بيحددها js/cart-address.js
  const selectedGovernorate = document.getElementById("governorates")?.value || window.cartAddressGovernorateKey || "";
  const shippingCost = isPickup ? 0 : (shippingPrices[selectedGovernorate] || 0);

  // ✅ فورمات الأرقام بفواصل الآلاف زي "33,297.00"
  const formatMoney = (n) => `${Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م.`;

  if (shippingDisplay) {
    if (isPickup) {
      shippingDisplay.innerHTML = `<span class="cn-ship-free">مجانًا</span>`;
    } else if (selectedGovernorate && shippingPrices[selectedGovernorate] != null) {
      if (shippingCost > 0) {
        shippingDisplay.innerHTML = formatMoney(shippingCost);
      } else {
        shippingDisplay.innerHTML = `<span class="cn-ship-free">مجانًا</span>`;
      }
    } else if (window.cartAddressShippingNote) {
      shippingDisplay.innerHTML = window.cartAddressShippingNote;
    } else {
      shippingDisplay.innerHTML = "—";
    }
  }

  // ✅ سعر التغليف المحسوب أوتوماتيك حسب أنواع المنتجات في السلة
  const packagingCost = calculatePackagingCost(cart);
  const packagingDisplay = document.getElementById("packaging_display");
  const packagingRow = document.getElementById("cnPackagingRow");
  if (packagingDisplay) packagingDisplay.innerText = packagingCost > 0 ? formatMoney(packagingCost) : "مجاني";
  if (packagingRow) packagingRow.style.display = packagingCost > 0 ? "flex" : "none";

  const discountAmount = Math.round(total_price * (couponPercent / 100));
  const discountedTotal = total_price - discountAmount;

  const subtotal_checkout = document.querySelector(".subtotal_checkout");
  const total_checkout = document.querySelector(".total_checkout");
  const discountSpan = document.querySelector(".discount_percent");
  const discountRow = document.getElementById("cnDiscountRow");

  if (subtotal_checkout) subtotal_checkout.innerHTML = formatMoney(total_price);
  if (total_checkout) total_checkout.innerHTML = formatMoney(discountedTotal + shippingCost + packagingCost);
  if (discountSpan) discountSpan.textContent = couponPercent ? `${couponPercent}%` : "0%";
  if (discountRow) discountRow.style.display = couponPercent ? "flex" : "none";

  const price_cart_total = document.querySelector(".price_cart_total");
  document.querySelectorAll(".Count_item_cart").forEach(el => { el.innerHTML = total_count; });
  const count_item_header = document.querySelector(".count_item_header");

  if (price_cart_total) price_cart_total.innerHTML = `${total_price + packagingCost} ج`;
  if (count_item_header) count_item_header.innerHTML = total_count;

  if (items_input) {
    items_input.value += `\n🚚 شحن (${selectedGovernorate || "غير محددة"}): ${shippingCost} ج`;
    items_input.value += `\n📦 تغليف: ${packagingCost} ج`;
    if (total_price_input) total_price_input.value = discountedTotal + shippingCost + packagingCost;
    if (count_items_input) count_items_input.value = total_count;
  }

  // ✅ سلايدر منتجات شحنة الدفع - أزرار التحريك بتظهر بس لو أكتر من منتج واحد
  if (shipmentPreview) {
    setupShipmentSlider(cart.length);
  }

  // ✅ تحديث حالة زرار الدفع (يشتغل بس لو كل بيانات الطلب جاهزة)
  if (typeof window.refreshPayButtonState === "function") {
    window.refreshPayButtonState();
  }

  const confirmOrderBtn = document.querySelector(".confirm_order");
  if (confirmOrderBtn) {
    confirmOrderBtn.onclick = async function() {
      const success = await submitOrderToGoogleSheets();
      if (success) {
        alert("تم تقديم الطلب بنجاح وسيتم التواصل معك قريباً!");
        localStorage.removeItem('cart');
        updateCart();
      } else {
        alert("حدث خطأ أثناء إرسال الطلب، يرجى المحاولة مرة أخرى.");
      }
    };
  }

  document.querySelectorAll(".increase_quantity").forEach(btn => {
    btn.addEventListener("click", () => increaseQuantity(btn.dataset.index));
  });

  document.querySelectorAll(".decrease_quantity").forEach(btn => {
    btn.addEventListener("click", () => decreaseQuantity(btn.dataset.index));
  });

  document.querySelectorAll(".delet_item").forEach(btn => {
    btn.addEventListener("click", () => removForCart(btn.dataset.index));
  });

  // ✅ فتح/قفل قائمة الألوان جوه الكارت
  document.querySelectorAll(".cart-color-toggle").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const list = btn.nextElementSibling;
      const isOpen = list.style.display === "block";
      document.querySelectorAll(".cart-color-options").forEach(el => { el.style.display = "none"; });
      list.style.display = isOpen ? "none" : "block";
    });
  });

  // ✅ اختيار لون جديد من القائمة: بيغيّر اللون والصورة للمنتج ده جوه السلة
  document.querySelectorAll(".cart-color-option").forEach(opt => {
    opt.addEventListener("click", (e) => {
      e.stopPropagation();
      changeCartItemColor(opt.dataset.index, opt.dataset.color, opt.dataset.img);
    });
  });

  // لو إحنا في صفحة تفاصيل منتج، نحدث شكل عداد السلة بتاعها (زرار / عداد -+)
  // عشان تتزامن مع أي تغيير حصل في السلة من مكان تاني (زي القائمة الجانبية)
  if (typeof window.refreshDetailsCartControl === "function") {
    window.refreshDetailsCartControl();
  }
}

// ✅ سلايدر منتجات شحنة الدفع (يمين/شمال) - بيظهر بس لو أكتر من منتج واحد
function setupShipmentSlider(productCount) {
  const track = document.getElementById("cn_shipment_items");
  const prevBtn = document.getElementById("cnSlidePrev");
  const nextBtn = document.getElementById("cnSlideNext");
  if (!track || !prevBtn || !nextBtn) return;

  const showArrows = productCount > 1;
  prevBtn.classList.toggle("hidden", !showArrows);
  nextBtn.classList.toggle("hidden", !showArrows);

  const getStep = () => {
    const card = track.querySelector(".cn-ship-item");
    const gap = 14;
    return card ? card.getBoundingClientRect().width + gap : 164;
  };

  // العنصر عربي (RTL): تحريك يمين = رجوع (scrollLeft يزيد نحو 0)، تحريك شمال = تقدم (scrollLeft يقل)
  if (!track.dataset.sliderBound) {
    track.dataset.sliderBound = "true";
    nextBtn.addEventListener("click", () => {
      track.scrollBy({ left: -getStep(), behavior: "smooth" });
    });
    prevBtn.addEventListener("click", () => {
      track.scrollBy({ left: getStep(), behavior: "smooth" });
    });
  }
}

// ✅ تعديل الكمية
function increaseQuantity(index) {
  let cart = JSON.parse(localStorage.getItem("cart")) || [];
  cart[index].quantity += 1;
  localStorage.setItem("cart", JSON.stringify(cart));
  updateCart();
}

function decreaseQuantity(index) {
  let cart = JSON.parse(localStorage.getItem("cart")) || [];
  if (cart[index].quantity > 1) {
    cart[index].quantity -= 1;
  }
  localStorage.setItem("cart", JSON.stringify(cart));
  updateCart();
}

function removForCart(index) {
  const cart = JSON.parse(localStorage.getItem('cart')) || [];
  const removed = cart.splice(index, 1)[0];
  localStorage.setItem("cart", JSON.stringify(cart));
  updateCart();
  updateButtonsState(removed.id);
}

// ✅ تغيير لون منتج معين جوه السلة (وتغيير صورته على حسب اللون الجديد)
function changeCartItemColor(index, newColor, newImg) {
  const cart = JSON.parse(localStorage.getItem("cart")) || [];
  const idx = Number(index);
  if (!cart[idx] || !newColor) return;
  cart[idx].color = newColor;
  if (newImg) cart[idx].img = newImg;
  localStorage.setItem("cart", JSON.stringify(cart));
  updateCart();
}

// ✅ قفل قائمة الألوان لو المستخدم دوس في أي مكان تاني برا القائمة
if (!window._cartColorOutsideClickBound) {
  window._cartColorOutsideClickBound = true;
  document.addEventListener("click", () => {
    document.querySelectorAll(".cart-color-options").forEach(el => { el.style.display = "none"; });
  });
}

// ✅ حذف منتج من السلة بالـ id (واللون لو موجود) بدل رقم index
function removeFromCartByIdColor(id, color) {
  let cart = JSON.parse(localStorage.getItem('cart')) || [];
  cart = cart.filter(item => !(item.id === id && (item.color || undefined) === (color || undefined)));
  localStorage.setItem("cart", JSON.stringify(cart));
  updateCart();
}

function updateButtonsState(productId) {
  document.querySelectorAll(`.btn_add_cart[data-id="${productId}"]`).forEach(button => {
    button.classList.remove('active');
    button.innerHTML = `<i class="fa-solid fa-cart-plus"></i> اضف الي السلة`;
  });
}

// ✅ كوبونات متاحة
const availableCoupons = {
  omar: 10,
  eid: 20,
  ramadan: 15
};

// ✅ تهيئة الصفحة عند التحميل
document.addEventListener("DOMContentLoaded", () => {
  if (!localStorage.getItem("appliedCouponFromUser")) {
    localStorage.removeItem("appliedCoupon");

    const pickupCheckbox = document.getElementById("pickup_from_store");
    pickupCheckbox?.addEventListener("change", (e) => {
      const governorateDiv = document.getElementById("governorates_wrapper");
      if (governorateDiv) {
        governorateDiv.style.display = e.target.checked ? "none" : "block";
      }
      updateCart();
    });


  }
  updateCart();

  // ✅ إضافة/حذف المنتج للسلة مباشرة من بيانات الزرار (بدون الاعتماد على JSON)
  // كل زرار "أضف للسلة" لازم يكون عليه: data-id, data-name, data-price, data-img
  // واختياريًا: data-color لو المنتج له لون مختار
  // ملحوظة: زرار صفحة تفاصيل المنتج (id="detailsAddToCartBtn") له منطقه الخاص في item-loader.js
  document.addEventListener("click", (event) => {
    const btn = event.target.closest(".btn_add_cart");
    if (!btn || btn.id === "detailsAddToCartBtn") return;

    const productId = btn.dataset.id;
    if (!productId) return;

    const numericId = isNaN(Number(productId)) ? productId : Number(productId);
    const color = btn.dataset.color || undefined;
    const size = btn.dataset.size || undefined;
    const type = btn.dataset.type || undefined;
    let colorVariants = [];
    if (btn.dataset.colors) {
      try {
        colorVariants = JSON.parse(decodeURIComponent(btn.dataset.colors)) || [];
      } catch (e) {
        colorVariants = [];
      }
    }

    const cart = JSON.parse(localStorage.getItem("cart")) || [];
    const alreadyInCart = cart.some(item => item.id === numericId && (item.color || undefined) === color);

    if (alreadyInCart) {
      // المنتج موجود بالفعل، فالدوسة دي بتشيله
      removeFromCartByIdColor(numericId, color);

      document.querySelectorAll(`.btn_add_cart[data-id="${productId}"]`).forEach(b => {
        if ((b.dataset.color || undefined) === color) {
          b.classList.remove("active");
          b.innerHTML = `<i class="fa-solid fa-cart-plus"></i> اضف الي السلة`;
        }
      });
      return;
    }

    const selectedProduct = {
      id: numericId,
      name: btn.dataset.name || "",
      price: Number(btn.dataset.price) || 0,
      img: btn.dataset.img || "",
    };

    if (color) {
      selectedProduct.color = color;
    }
    if (size) {
      selectedProduct.size = size;
    }
    if (type) {
      selectedProduct.type = type;
    }
    if (btn.dataset.col) {
      selectedProduct.col = btn.dataset.col;
    }
    if (btn.dataset.docId) {
      selectedProduct.docId = btn.dataset.docId;
    }
    if (colorVariants.length > 0) {
      selectedProduct.colorVariants = colorVariants;
    }

    if (!selectedProduct.name || !selectedProduct.price) {
      alert("⚠️ تعذر إضافة هذا المنتج، البيانات غير مكتملة!");
      return;
    }

    addToCart(selectedProduct);

    document.querySelectorAll(`.btn_add_cart[data-id="${productId}"]`).forEach(b => {
      if ((b.dataset.color || undefined) === color) {
        b.classList.add("active");
        b.innerHTML = `<i class="fa-solid fa-cart-plus"></i> تم اضافة الي السلة`;
      }
    });
  });
});

// ✅ تطبيق الكوبون
const coponBtn = document.querySelector(".copon");
if (coponBtn) {
  coponBtn.addEventListener("click", () => {
    const coponInputField = document.querySelector(".copon_input");
    if (!coponInputField) {
      alert("⚠️ خانة الكوبون غير موجودة!");
      return;
    }

    const coponInput = coponInputField.value.trim().toLowerCase();
    if (availableCoupons.hasOwnProperty(coponInput)) {
      const discountPercent = availableCoupons[coponInput];
      localStorage.setItem("appliedCoupon", JSON.stringify({ code: coponInput, percent: discountPercent }));
      localStorage.setItem("appliedCouponFromUser", "true");

      alert(`🎉 تم تطبيق خصم ${discountPercent}% بنجاح!`);
      updateCart();
    } else {
      alert("❌ الكوبون غير صالح!");
    }
  });
}


// ✅ بتحدث شكل كل أزرار "أضف للسلة" في الصفحة (نص + لون) حسب محتوى السلة الحالي
function refreshAddToCartButtonsState() {
  const cart = JSON.parse(localStorage.getItem("cart")) || [];

  document.querySelectorAll(".btn_add_cart").forEach((btn) => {
    if (btn.id === "detailsAddToCartBtn") return; // صفحة التفاصيل ليها منطقها الخاص

    const productId = btn.dataset.id;
    if (!productId) return;

    const numericId = isNaN(Number(productId)) ? productId : Number(productId);
    const color = btn.dataset.color || undefined;
    const inCart = cart.some(item => item.id === numericId && (item.color || undefined) === color);

    if (inCart) {
      btn.classList.add("active");
      btn.innerHTML = `<i class="fa-solid fa-cart-plus"></i> تم اضافة الي السلة`;
    } else {
      btn.classList.remove("active");
      btn.innerHTML = `<i class="fa-solid fa-cart-plus"></i> اضف الي السلة`;
    }
  });
}

window.addEventListener("beforeunload", () => {
  localStorage.removeItem("appliedCoupon");
  localStorage.removeItem("appliedCouponFromUser");
});

// ✅ لما ترجع لصفحة عن طريق زرار "رجوع" في المتصفح، المتصفح أحيانًا بيرجّع نسخة قديمة
// محفوظة (bfcache) من غير ما يعيد تشغيل السكريبتات. الحدث ده بيتأكد إن السلة
// (العداد، الأيقونة، القائمة الجانبية، وحالة الأزرار) بتتحدث فورًا من غير الحاجة لعمل ريفريش يدوي.
window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    updateCart();
    refreshAddToCartButtonsState();
  }
});

const governorateSelect = document.getElementById("governorates");
if (governorateSelect) {
  governorateSelect.addEventListener("change", () => {
    updateCart();
  });
}








//////////////////////////////

function setupCartEvents() {
   const cartIcon = document.querySelector(".fa-bag-shopping");


  document.addEventListener("click", function(e) {
    const btn = e.target.closest(".btn_add_cart");
    if (!btn) return;
    e.preventDefault(); // نمنع التنقل الفوري

    const productId = btn.dataset.id;
    const targetUrl = btn.dataset.url;
    const productImage = document.querySelector(`.product-image[data-id="${productId}"]`);

    if (!productImage || !cartIcon) return;

    const imgClone = productImage.cloneNode(true);
    const rect = productImage.getBoundingClientRect();
    const cartRect = cartIcon.getBoundingClientRect();

    imgClone.style.position = "fixed";
    imgClone.style.top = `${rect.top}px`;
    imgClone.style.left = `${rect.left}px`;
    imgClone.style.width = `${rect.width}px`;
    imgClone.style.height = `${rect.height}px`;
    imgClone.style.transition = "all 0.8s ease-in-out";
    imgClone.style.zIndex = 9999;

    document.body.appendChild(imgClone);

    setTimeout(() => {
      imgClone.style.top = `${cartRect.top}px`;
      imgClone.style.left = `${cartRect.left}px`;
      imgClone.style.width = "0px";
      imgClone.style.height = "0px";
      imgClone.style.opacity = 0;
    }, 10);

    setTimeout(() => {
      cartIcon.classList.add("shake-cart");
      imgClone.remove();
      setTimeout(() => {
        cartIcon.classList.remove("shake-cart");

        // ✅ ننتقل بعد الانيميشن
        if (targetUrl) {
          window.location.href = targetUrl;
        }

      }, 300);
    }, 900);
  });
}

////////////////////////////










// script.js