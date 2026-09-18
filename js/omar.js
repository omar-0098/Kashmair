
document.addEventListener('DOMContentLoaded', function() {
    const registerSection = document.getElementById('registerSection');
    const buyButton = document.querySelectorAll('.btn_cart')[0];
    const check = document.querySelector('.check');
    
    // دالة التحقق من ظهور العنصر
    function checkVisibility() {
        if (registerSection && registerSection.offsetParent !== null) {
            // إذا كان العنصر ظاهرًا، أخفي الزر
            if (buyButton) {
                buyButton.style.pointerEvents = 'none';
                buyButton.style.background = '#a6a6a6';
                buyButton.style.borderColor = '#5e5e5e';
                check.style.display = 'none';
            }
            
            // بدء عرض الرسالة كل دقيقة
        } else {
            // إذا كان العنصر غير ظاهر، أظهر الزر
            if (buyButton) {
                buyButton.style.pointerEvents = 'all';
                buyButton.style.background = '#f9607f';
                buyButton.style.borderColor = '#f9607f';
                check.style.display = 'block';
            }
            
            // إيقاف عرض الرسالة إذا كان يعمل
        }
    }
    
    // متغيرات للتحكم في interval الرسالة
    let messageInterval;
    
    // التحقق الأولي عند تحميل الصفحة
    checkVisibility();
    
    // إذا كنت تتوقع تغييرات ديناميكية، يمكنك إضافة مراقب للتحقق
    const observer = new MutationObserver(checkVisibility);
    
    if (registerSection) {
        observer.observe(registerSection.parentNode, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['style', 'class']
        });
    }
});
/////////////////////////



/////////////////////////


// the check box
const checkboxes = document.querySelectorAll('.exclusive');

checkboxes.forEach((checkbox) => {
  checkbox.addEventListener('change', function() {
    if (this.checked) {
      // الغي التشيك من الباقيين
      checkboxes.forEach((cb) => {
        if (cb !== this) cb.checked = false;
      });

      // روح للموقع الخاص
      const url = this.getAttribute('data-url');
      window.location.href = url;
    }
  });
});


////////////////////


function scrollToTop() {
  window.scrollTo({
    top: 0,
    behavior: 'smooth' // السلاسة 😍
  });
}

/////////////////


// img-big
window.onload = function() {
  let bigImags = document.getElementById("bidImg");

  window.changeItemImage = function(img) {
    bigImags.style.opacity = 0; // نخفيها الأول بحركة ناعمة

    setTimeout(function() {
      bigImags.src = img; // نغير الصورة
      bigImags.style.opacity = 1; // نظهرها بحركة
    }, 250); // نص ثانية تقريباً
  }
}




// document.getElementById("linkSelect").addEventListener("change", function () {
//   const selectedUrl = this.value;
//   if (selectedUrl) {
//     window.open(selectedUrl, "_blank"); // يفتح الرابط في تبويب جديد
//     this.selectedIndex = 0; // يرجّع الاختيار لأول عنصر
//   }
// });

document.addEventListener('click', function(e) {
  const img = e.target.closest('.img_product img');
  if (img) {
    e.preventDefault();

    const link = img.closest('a').getAttribute('href');

    // إنشاء overlay والدوران
    const overlay = document.createElement('div');
    overlay.className = 'overlay';

    const spinner = document.createElement('div');
    spinner.className = 'spinner';

    overlay.appendChild(spinner);
    document.body.appendChild(overlay);

    // بعد 3 ثواني، إزالة الأنيميشن وفتح الرابط
    setTimeout(() => {
      overlay.remove();
      window.location.href = link;
    }, 1000);
  }
});



/////////////////////////////////////////////////
// window.onload = function() {
//   const darkMode = localStorage.getItem('darkMode');
//   if (darkMode === 'enabled') {
//     document.body.classList.add('dark-mode');
//   }
// }

// function toggleDarkMode() {
//   document.body.classList.toggle('dark-mode');
//   if (document.body.classList.contains('dark-mode')) {
//     localStorage.setItem('darkMode', 'enabled');
//   } else {
//     localStorage.setItem('darkMode', 'disabled');
//   }
// }



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


