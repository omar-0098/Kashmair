// مشاركة المنتج
function toggleShare() {
    const menu = document.getElementById("shareMenu");
    menu.style.display = menu.style.display === "block" ? "none" : "block";
}

function shareWhatsApp() {
    const productName = document.querySelector(".name").innerText.trim();
    const pageLink = window.location.href;

    // اللينك لوحده في سطر
    const message = productName + "\n\n" + pageLink;

    window.open(
        "https://wa.me/?text=" + encodeURIComponent(message),
        "_blank"
    );
}

function shareTelegram() {
    const productName = document.querySelector(".name").innerText.trim();
    const pageLink = window.location.href;

    // تليجرام لازم اللينك يبقى url
    window.open(
        "https://t.me/share/url?url=" + encodeURIComponent(pageLink) +
        "&text=" + encodeURIComponent(productName),
        "_blank"
    );
}












// ===== إنشاء overlay ضبابي =====
const blurOverlay = document.createElement("div");
Object.assign(blurOverlay.style, {
  position: "fixed",
  inset: "0",
  background: "rgba(0,0,0,0.25)",
  backdropFilter: "blur(6px)",
  zIndex: "9998"
});

// ===== إنشاء dialog =====
const downloadDialog = document.createElement("dialog");
Object.assign(downloadDialog.style, {
  padding: "0",
  border: "none",
  borderRadius: "10px",
  zIndex: "9999",
  margin: "auto",
});

downloadDialog.innerHTML = `
  <form method="dialog"
    style="padding:22px; min-width:335px; text-align:center; font-family:Arial;">
    
    <!-- الصورة -->
    <img
      src="https://cdn-icons-png.flaticon.com/512/892/892634.png"
      alt="Download"
      style="width:55px; margin-bottom:12px;"
    >

    <p style="font-size:16px; margin-bottom:20px;">
      هل تريد تنزيل جميع الصور؟
    </p>

    <menu style="display:flex; gap:12px; justify-content:center;">
      <button value="cancel"
        style="padding:6px 14px;">
        إلغاء
      </button>

      <button value="ok"
        style="background:#0d6efd; color:#fff; border:none;
               padding:6px 18px; border-radius:6px;">
        موافق
      </button>
    </menu>
  </form>
`;

document.body.appendChild(downloadDialog);

// ===== دالة التحميل =====
function downloadAllImages() {

  // أضف الضبابية
  document.body.appendChild(blurOverlay);

  downloadDialog.showModal();

  // عند الإغلاق
  downloadDialog.addEventListener("close", () => {

    // شيل الضبابية
    blurOverlay.remove();

    if (downloadDialog.returnValue !== "ok") return;

    const imgElements = document.querySelectorAll(
      'img[onclick*="changeItemImage"]'
    );

    if (!imgElements.length) {
      alert("لا توجد صور للتحميل");
      return;
    }

    imgElements.forEach((img, index) => {
      setTimeout(() => {
        const link = document.createElement("a");
        link.href = img.src;

        const fileName = img.src.split("/").pop().split("\\").pop();
        link.download = fileName;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }, index * 300);
    });
  }, { once: true });
}






const HEART_COUNT = 10;
const HEART_DELAY = 120;
const HEART_LIFETIME = 1000;

// تحميل المفضلة
let favorites = JSON.parse(localStorage.getItem("favorites")) || [];

document.querySelectorAll(".fav-btn").forEach(button => {
  const productId = button.getAttribute("data-id");

  // لو المنتج في المفضلة
  if (favorites.includes(productId)) {
    button.classList.add("active");
  }

  button.addEventListener("click", () => {
    if (favorites.includes(productId)) {
      // إزالة
      favorites = favorites.filter(id => id !== productId);
      button.classList.remove("active");
    } else {
      // إضافة + قلوب
      favorites.push(productId);
      activateLike(button);
    }

    localStorage.setItem("favorites", JSON.stringify(favorites));
  });
});

function heartAnimation() {
  const heart = document.createElement("div");
  heart.textContent = "❤️";
  heart.style.position = "fixed";
  heart.style.left = Math.random() * 100 + "vw";
  heart.style.bottom = "-30px";
  heart.style.fontSize = "24px";
  heart.style.opacity = "1";
  heart.style.transition = `all ${HEART_LIFETIME}ms ease-out`;
  heart.style.zIndex = "9999";
  document.body.appendChild(heart);

  setTimeout(() => {
    heart.style.bottom = "50vh";
    heart.style.opacity = "0";
  }, 10);

  setTimeout(() => heart.remove(), HEART_LIFETIME);
}

function activateLike(button) {
  button.classList.add("active");

  for (let i = 0; i < HEART_COUNT; i++) {
    setTimeout(heartAnimation, i * HEART_DELAY);
  }
}

























/* ══════════════════════════════════════════════════════
   Kashmir Home — Dark Mode Script
   أضفه في كل صفحة قبل إغلاق </body>
   <script src="js/dark-mode.js"></script>
══════════════════════════════════════════════════════ */

(function () {
  "use strict";

  const STORAGE_KEY = "kashmirDarkMode";
  const DARK        = "dark";
  const LIGHT       = "light";

  // ── تطبيق الثيم فور تحميل الـ HTML قبل الرسم (يمنع الوميض) ──
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === "1") {
    document.documentElement.setAttribute("data-theme", DARK);
  }

  // ── إنشاء زر التبديل العائم ───────────────────────────────
  function createFloatBtn() {
    if (document.getElementById("darkModeFloatBtn")) return;

    const btn = document.createElement("button");
    // btn.id = "darkModeFloatBtn";
    btn.setAttribute("title", "تبديل الوضع المظلم");
    btn.setAttribute("aria-label", "تبديل الوضع المظلم");

    updateBtnIcon(btn);
    document.body.appendChild(btn);

    btn.addEventListener("click", () => {
      const isDark = document.documentElement.getAttribute("data-theme") === DARK;
      applyTheme(!isDark);
    });
  }

  // ── تحديث أيقونة الزر ────────────────────────────────────
  // function updateBtnIcon(btn) {
  //   const isDark = document.documentElement.getAttribute("data-theme") === DARK;
  //   btn = btn || document.getElementById("darkModeFloatBtn");
  //   if (!btn) return;
  //   btn.innerHTML = isDark
  //     ? '<i class="fa-solid fa-sun"></i>'
  //     : '<i class="fa-solid fa-moon"></i>';
  //   btn.setAttribute("title", isDark ? "الوضع الفاتح" : "الوضع المظلم");
  // }

  // ── تطبيق الثيم ──────────────────────────────────────────
  function applyTheme(dark) {
    document.documentElement.setAttribute("data-theme", dark ? DARK : LIGHT);
    localStorage.setItem(STORAGE_KEY, dark ? "1" : "0");
    updateBtnIcon();
    syncToggleInputs(dark);
    applyMuteState(); // حافظ على حالة الكتم لو موجودة
    showThemeToast(dark);
  }

  // ── مزامنة أي checkbox موجود في الصفحة (صفحة الحساب) ────
  function syncToggleInputs(dark) {
    const inputs = document.querySelectorAll("#darkModeToggle");
    inputs.forEach(inp => { inp.checked = dark; });
  }

  // ── Toast إشعار تغيير الثيم ──────────────────────────────
  let _toastTimer = null;
  function showThemeToast(dark) {
    let t = document.getElementById("dm-theme-toast");
    if (!t) {
      t = document.createElement("div");
      t.id = "dm-theme-toast";
      t.style.cssText = [
        "position:fixed","bottom:84px","left:24px","z-index:9001",
        "background:#1d346b","color:#fff","padding:10px 18px",
        "border-radius:24px","font-family:'Almarai',sans-serif",
        "font-size:13px","font-weight:700","opacity:0",
        "transform:translateY(10px)","pointer-events:none",
        "transition:all .3s cubic-bezier(.34,1.56,.64,1)",
        "box-shadow:0 4px 16px rgba(0,0,0,.25)","direction:rtl",
        "white-space:nowrap"
      ].join(";");
      document.body.appendChild(t);
    }
    t.style.background = dark ? "#0d1117" : "#1d346b";
    t.style.border     = dark ? "1px solid #30363d" : "1px solid #1d6fc4";
    t.textContent      = dark ? "🌙 الوضع المظلم" : "☀️ الوضع الفاتح";

    requestAnimationFrame(() => {
      t.style.opacity   = "1";
      t.style.transform = "translateY(0)";
    });
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => {
      t.style.opacity   = "0";
      t.style.transform = "translateY(10px)";
    }, 2000);
  }

  // ── حافظ على كتم الصوت ───────────────────────────────────
  function applyMuteState() {
    const muted = localStorage.getItem("kashmirMuted") === "1";
    document.querySelectorAll("video,audio").forEach(m => { m.muted = muted; });
  }

  // ── ربط checkbox الإعدادات (صفحة الحساب) ─────────────────
  function bindSettingsToggle() {
    const inp = document.getElementById("darkModeToggle");
    if (!inp || inp._dmBound) return;
    inp._dmBound = true;
    inp.checked  = document.documentElement.getAttribute("data-theme") === DARK;
    inp.addEventListener("change", () => {
      applyTheme(inp.checked);
    });
  }

  // ── keyboard shortcut: Alt + D ───────────────────────────
  document.addEventListener("keydown", (e) => {
    if (e.altKey && e.key === "d") {
      const isDark = document.documentElement.getAttribute("data-theme") === DARK;
      applyTheme(!isDark);
    }
  });

  // ── Init ──────────────────────────────────────────────────
  function init() {
    // تطبيق الثيم المحفوظ
    const on = localStorage.getItem(STORAGE_KEY) === "1";
    if (on) {
      document.documentElement.setAttribute("data-theme", DARK);
    }

    createFloatBtn();
    bindSettingsToggle();
    applyMuteState();

    // مراقبة أي تغيير في data-theme من مكان آخر
    const observer = new MutationObserver(() => {
      updateBtnIcon();
      syncToggleInputs(document.documentElement.getAttribute("data-theme") === DARK);
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"]
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // تصدير للاستخدام من صفحات أخرى
  window.kashmirDarkMode = { apply: applyTheme };

})();
