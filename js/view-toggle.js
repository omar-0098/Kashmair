/* شريط "عدد المنتجات + أيقونة تبديل طريقة العرض" لصفحات القوائم على الموبايل.
   - بيكتب عدد المنتجات الظاهرة حالياً (بيتحدّث مع الفلاتر).
   - الأيقونة بتبدّل بين شبكة (منتجين جنب بعض) وقائمة (كل منتج بعرض الشاشة، الصورة جنبه).
   ارفعه في فولدر js وضيف قبل </body> في صفحات الأقسام والبحث:
   <script src="../../js/view-toggle.js"></script>   (من صفحات Furniture/القسم)
   <script src="js/view-toggle.js"></script>         (من الفولدر الرئيسي زي search.html) */
(function () {
  var MODE_KEY = "kashmirViewMode";
  var path = location.pathname;
  if (/(^|\/)(index\.html)?$/.test(path)) return;           // مش في الصفحة الرئيسية

  var css =
    ".of-vbar{display:none}" +
    "@media (max-width:768px){" +
    ".of-vbar{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:10px 6px;padding:8px 8px 8px 14px;background:#fff;border-radius:14px;box-shadow:0 1px 8px rgba(0,0,0,.07);font-family:inherit;direction:rtl}" +
    ".of-vcount{font-weight:800;font-size:14px;color:#333}" +
    ".of-vcount b{color:#0f6ab4;font-size:16px;margin-inline-end:4px}" +
    ".of-vbtn{width:42px;height:42px;border:0;border-radius:12px;background:#e8f0fb;color:#0f4c9a;font-size:18px;cursor:pointer;display:grid;place-items:center;transition:transform .15s}" +
    ".of-vbtn:active{transform:scale(.92)}" +
    ".of-list{display:flex !important;flex-direction:column !important;gap:12px !important;grid-template-columns:1fr !important;flex-wrap:nowrap !important}" +
    ".of-list>.product{display:grid !important;grid-template-columns:40% minmax(0,1fr);column-gap:12px;align-items:start;width:100% !important;max-width:100% !important;min-width:0 !important;margin:0 !important;padding:10px !important;position:relative;text-align:start}" +
    ".of-list>.product>.img_product{grid-column:1;grid-row:1 / span 14;width:100% !important;height:auto !important;margin:0 !important}" +
    ".of-list>.product>.img_product img{width:100% !important;height:auto !important;aspect-ratio:1/1;object-fit:cover;border-radius:12px;display:block}" +
    ".of-list>.product>.ooo,.of-list>.product>.sale_present{position:absolute !important}" +
    ".of-list>.product>*:not(.img_product):not(.ooo):not(.sale_present){grid-column:2;min-width:0}" +
    ".of-list>.product .icons{margin-top:8px;width:100%}" +
    ".of-list>.product .name_product{margin-top:0}" +
    "}";
  var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  function visibleCount(box) {
    return [].filter.call(box.children, function (el) { return el.classList.contains("product") && el.getClientRects().length; }).length;
  }

  function init(first) {
    var box = first.parentElement;
    if (!box || document.querySelector(".of-vbar")) return;
    var bar = document.createElement("div");
    bar.className = "of-vbar";
    bar.innerHTML = '<div class="of-vcount"><b>0</b>منتج</div><button type="button" class="of-vbtn" aria-label="تغيير طريقة العرض"></button>';
    box.parentNode.insertBefore(bar, box);

    var btn = bar.querySelector(".of-vbtn"), num = bar.querySelector("b");
    function paintBtn() {
      var list = box.classList.contains("of-list");
      btn.innerHTML = list ? '<i class="fa-solid fa-table-cells-large"></i>' : '<i class="fa-solid fa-list-ul"></i>';
      btn.title = list ? "عرض شبكة" : "عرض قائمة";
    }
    function setMode(list) {
      box.classList.toggle("of-list", list);
      try { localStorage.setItem(MODE_KEY, list ? "list" : "grid"); } catch (_) {}
      paintBtn();
    }
    btn.addEventListener("click", function () { setMode(!box.classList.contains("of-list")); });
    try { if (localStorage.getItem(MODE_KEY) === "list") box.classList.add("of-list"); } catch (_) {}
    paintBtn();

    var t;
    function count() { num.textContent = visibleCount(box).toLocaleString("ar-EG"); }
    count();
    new MutationObserver(function () { clearTimeout(t); t = setTimeout(count, 120); })
      .observe(box, { childList: true, subtree: true, attributes: true, attributeFilter: ["style", "class", "hidden"] });
    box.addEventListener("transitionend", function () { clearTimeout(t); t = setTimeout(count, 60); });
  }

  // المنتجات بتتحمّل بعد الصفحة، فنستنى أول كارت
  var n = 0, iv = setInterval(function () {
    var first = document.querySelector(".product");
    if (first) { clearInterval(iv); init(first); }
    else if (++n > 60) clearInterval(iv);
  }, 250);
})();
