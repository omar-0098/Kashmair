/* واجهة العروض للزوار:
   1) كروت العروض في الرئيسية (.coupons): بتظهر لو فيه منتجات، رمادية "قريباً" لو مفيش، أو بتتخفي — حسب اللي بتحدده من لوحة الأدمن.
   2) وسم "يوجد في عرض ..." على منتجات العروض في صفحات المنتجات.
   ارفعه في فولدر js وضيف قبل </body>:  <script src="js/offers-front.js"></script> */
(function () {
  var RTDB = "https://data-customer-d722f-default-rtdb.firebaseio.com";
  var SELF = document.currentScript && document.currentScript.src;
  var abs = function (u) { return /^(https?:)?\/\/|^data:|^\//.test(u); };
  var clean = function (u) { u = String(u || "").trim(); return !u || abs(u) ? u : u.replace(/^(\.\.\/|\.\/)+/, ""); };
  var rootURL = function (p) { p = clean(p); if (!p || abs(p)) return p; return SELF ? new URL("../" + p, SELF).href : p; };
  var THEMES = {
    orange: "linear-gradient(227deg,#f5934e,#d27039)", blue: "linear-gradient(159deg,#2196F3,#3F51B5)",
    green: "linear-gradient(159deg,#43a047,#1b5e20)", purple: "linear-gradient(159deg,#8e24aa,#4527a0)",
    red: "linear-gradient(159deg,#ef5350,#b71c1c)", dark: "linear-gradient(159deg,#455a64,#212121)"
  };

  var st = document.createElement("style");
  st.textContent =
    ".coupon.of-gray{background:linear-gradient(159deg,#9aa0a6,#6f757b) !important;filter:grayscale(1);opacity:.8;pointer-events:none;cursor:not-allowed}" +
    ".product.of-has-tag .ooo{transform:translateY(46px)}" +
    ".of-ptag{position:absolute;top:0;left:0;z-index:6;display:inline-flex;align-items:center;justify-content:center;min-width:120px;height:36px;padding:0 16px;cursor:pointer;" +
    "background:linear-gradient(135deg,#2196F3,#3F51B5);color:#fff;font:800 13px/1 inherit;font-family:inherit;border-radius:14px;" +
    "box-shadow:0 4px 12px rgba(63,81,181,.45);white-space:nowrap;box-sizing:border-box;user-select:none;transition:transform .15s,filter .15s}" +
    ".of-ptag:hover{filter:brightness(1.1);transform:translateY(-1px)}" +
    ".of-ptag-item{position:static;display:inline-flex;margin:0 0 12px;height:38px;font-size:14px}" +
    ".of-dlg-bg{position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:16px;direction:rtl;font-family:inherit}" +
    ".of-dlg{background:#fff;color:#222;border-radius:20px;max-width:380px;width:100%;padding:24px 20px 18px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.35);animation:ofPop .2s ease-out}" +
    "@keyframes ofPop{from{transform:scale(.9);opacity:0}to{transform:none;opacity:1}}" +
    ".of-dlg .ic{width:56px;height:56px;margin:0 auto 12px;border-radius:50%;background:#fff1e6;color:#d27039;display:grid;place-items:center;font-size:24px}" +
    ".of-dlg h3{margin:0 0 6px;font-size:18px;font-weight:900}" +
    ".of-dlg p{margin:0 0 18px;color:#555;font-size:14px;line-height:1.6}" +
    ".of-dlg p b{color:#d27039}" +
    ".of-dlg .row{display:flex;gap:10px}" +
    ".of-dlg button{flex:1;border:0;cursor:pointer;font:inherit;font-weight:800;font-size:15px;padding:12px;border-radius:12px}" +
    ".of-dlg .yes{background:linear-gradient(227deg,#f5934e,#d27039);color:#fff}" +
    ".of-dlg .no{background:#eee;color:#444}";
  document.head.appendChild(st);

  function state(o) {
    var mode = (o && o.homeMode) || "auto-gray";
    var has = !!(o && Array.isArray(o.items) && o.items.length);
    var live = has && Number(o.endAt) > Date.now();
    if (mode === "hide") return "hide";
    if (mode === "gray") return "gray";
    if (live) return "live";
    return mode === "auto-hide" ? "hide" : "gray";
  }

  /* ---------- كروت الرئيسية ---------- */
  function applyCard(card, key, o) {
    var s = state(o), q = function (x) { return card.querySelector(x); };
    card.setAttribute("data-offer", key);
    if (s === "hide") { card.style.display = "none"; return; }
    card.style.display = "";
    if (o) {
      var t = o.homeTitle || o.name, sub = o.homeSub || o.sub, price = o.homePrice || (o.price ? String(o.price) : "");
      if (t && q("h3")) q("h3").textContent = t;
      if (sub && q(".c-sub")) q(".c-sub").textContent = sub;
      if (price && q(".c-price")) q(".c-price").innerHTML = price + "<small>ج.م</small>";
      if (o.homePill && q(".c-pill")) q(".c-pill").textContent = o.homePill;
      if (o.homeTheme && THEMES[o.homeTheme]) card.style.background = THEMES[o.homeTheme];
    }
    if (s === "gray") {
      card.classList.add("of-gray");
      card.removeAttribute("href"); card.setAttribute("aria-disabled", "true");
      if (q(".c-pill")) q(".c-pill").textContent = "قريباً";
    } else {
      card.classList.remove("of-gray");
      card.setAttribute("href", rootURL("offers.html") + "?offer=" + encodeURIComponent(key));
      card.removeAttribute("aria-disabled");
    }
  }

  function renderCoupons(offers) {
    var box = document.querySelector(".coupons");
    if (!box) return;
    var cards = [].slice.call(box.querySelectorAll(".coupon")), byKey = {};
    cards.forEach(function (c) {
      var k = c.getAttribute("data-offer");
      if (!k) { try { k = new URL(c.getAttribute("href") || "", location.href).searchParams.get("offer"); } catch (_) {} }
      if (k) byKey[k] = c;
    });
    Object.keys(byKey).forEach(function (k) { applyCard(byKey[k], k, offers[k] || null); });   // كروت موجودة في الصفحة
    var tpl = cards[0];
    if (!tpl) return;
    Object.keys(offers).forEach(function (k) {                                                  // عروض جديدة من اللوحة
      if (byKey[k] || !offers[k] || state(offers[k]) === "hide") return;
      var c = tpl.cloneNode(true);
      c.classList.remove("of-gray"); c.style.display = ""; c.style.background = THEMES.orange;
      box.appendChild(c); applyCard(c, k, offers[k]);
    });
  }

  /* ---------- وسم "يوجد في عرض" على المنتجات ---------- */
  function buildTagMap(offers) {
    var map = {};
    Object.keys(offers).forEach(function (k) {
      var o = offers[k];
      if (!o || o.tagOn === false || state(o) !== "live") return;
      var info = { key: k, name: o.name || "", text: o.tag || "موجود في العرض" };
      o.items.forEach(function (it) {
        var id = String(it && typeof it === "object" ? it.id : it);
        if (!map[id]) map[id] = info;
      });
    });
    return map;
  }

  function tagItemPage(map) {                       // صفحة تفاصيل المنتج نفسها (Furniture/item.html)
    var h = document.getElementById("productName");
    if (!h || document.querySelector(".of-ptag-item")) return;
    var q = new URLSearchParams(location.search);
    if (q.get("offer")) return;                       // جاي من صفحة العرض نفسها: مفيش داعي
    var col = q.get("col"), doc = q.get("docId");
    var info = (col && map[col + "-" + doc]) || (doc && map[doc]);
    if (!info) return;
    var t = document.createElement("div");
    t.className = "of-ptag of-ptag-item"; t.setAttribute("role", "button"); t.tabIndex = 0;
    t.textContent = info.text;
    var go = function (e) { e.preventDefault(); e.stopPropagation(); confirmGo(info); };
    t.addEventListener("click", go);
    t.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") go(e); });
    h.parentNode.insertBefore(t, h);
  }

  function tagProducts(map) {
    if (!Object.keys(map).length) return;
    tagItemPage(map);
    document.querySelectorAll('a[href*="docId="]').forEach(function (a) {
      if (a.closest("header, .of-ptag, #cart, .cart") || !a.querySelector("img")) return;
      var u; try { u = new URL(a.getAttribute("href"), location.href); } catch (_) { return; }
      var col = u.searchParams.get("col"), doc = u.searchParams.get("docId");
      var img = a.querySelector("img"), did = img && img.getAttribute("data-id");
      var info = (col && map[col + "-" + doc]) || map[doc] || (did && map[did]);
      var card = a.closest(".product") || (a.parentElement && a.parentElement.closest("li, article, .card")) || a.parentElement;
      if (!info || !card || card.querySelector(".of-ptag")) return;
      var holder = a.closest(".img_product") || a.parentElement || card;           // حاوية الصورة
      if (getComputedStyle(holder).position === "static") holder.style.position = "relative";
      var t = document.createElement("div");
      t.className = "of-ptag"; t.setAttribute("role", "button"); t.tabIndex = 0;
      t.textContent = info.text;
      var go = function (e) { e.preventDefault(); e.stopPropagation(); confirmGo(info); };
      t.addEventListener("click", go);
      t.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") go(e); });
      card.classList.add("of-has-tag");
      holder.appendChild(t);
    });
  }

  /* نافذة "هل تريد الانتقال إلى العرض؟" */
  function confirmGo(info) {
    if (document.querySelector(".of-dlg-bg")) return;
    var bg = document.createElement("div");
    bg.className = "of-dlg-bg";
    bg.innerHTML =
      '<div class="of-dlg" role="dialog" aria-modal="true">' +
      '<div class="ic"><i class="fa-solid fa-tags"></i></div>' +
      '<h3>هل تريد الانتقال إلى العرض؟</h3>' +
      '<p>هذا المنتج موجود ضمن <b></b></p>' +
      '<div class="row"><button type="button" class="yes">نعم، انتقل للعرض</button><button type="button" class="no">لا، ابقَ هنا</button></div></div>';
    bg.querySelector("b").textContent = info.name || "العرض";
    var close = function () { bg.remove(); document.removeEventListener("keydown", esc); };
    var esc = function (e) { if (e.key === "Escape") close(); };
    bg.querySelector(".no").onclick = close;
    bg.querySelector(".yes").onclick = function () { location.href = rootURL("offers.html") + "?offer=" + encodeURIComponent(info.key); };
    bg.addEventListener("click", function (e) { if (e.target === bg) close(); });
    document.addEventListener("keydown", esc);
    document.body.appendChild(bg);
    bg.querySelector(".yes").focus();
  }

  fetch(RTDB + "/offers.json", { cache: "no-store" })
    .then(function (r) { if (!r.ok) throw new Error("offers read failed"); return r.json(); })
    .then(function (v) {
      if (v === null || v === undefined) v = {};
      if (v.current && !v.comfort) v.comfort = v.current;
      delete v.current;
      var go = function () { renderCoupons(v); };
      if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", go); else go();
      var map = buildTagMap(v), timer;
      try { console.info("[offers-front] منتجات داخل عروض شغّالة:", Object.keys(map).join(", ") || "(مفيش)"); } catch (_) {}
      var run = function () { clearTimeout(timer); timer = setTimeout(function () { tagProducts(map); }, 150); };
      new MutationObserver(run).observe(document.documentElement, { childList: true, subtree: true });
      run();
    })
    .catch(function () { /* لو القراءة فشلت سيب الصفحة زي ما هي */ });

  /* ---------- حذف العرض من السلة لما وقته يخلص ---------- */
  (function () {
    var RT = "https://data-customer-d722f-default-rtdb.firebaseio.com";
    function read(k, d) { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (_) { return d; } }
    function offersInCart() { return read("cart", []).filter(function (i) { return String(i.id).indexOf("offer-") === 0; }); }
    function purge(ids, names) {
      var cart = read("cart", []).filter(function (i) { return ids.indexOf(String(i.id)) === -1; });
      localStorage.setItem("cart", JSON.stringify(cart));
      try { sessionStorage.setItem("ofPurged", names.join("، ")); } catch (_) {}
      location.reload();                       // عشان السلة والعدّاد يتحدّثوا
    }
    function localCheck() {                    // الوقت متخزن مع العرض وقت الإضافة
      var det = read("offerDetails", {}), now = Date.now(), ids = [], names = [];
      offersInCart().forEach(function (i) {
        var d = det[i.id];
        if (d && d.endAt && Number(d.endAt) <= now) { ids.push(String(i.id)); names.push(i.name); }
      });
      if (ids.length) purge(ids, names);
    }
    function remoteCheck() {                   // العرض اتحذف أو اتفضّى أو خلص حسب Firebase
      var list = offersInCart(); if (!list.length) return;
      fetch(RT + "/offers.json", { cache: "no-store" })
        .then(function (r) { if (!r.ok) throw 0; return r.json(); })
        .then(function (v) {
          v = v || {}; if (v.current && !v.comfort) v.comfort = v.current;
          var ids = [], names = [];
          list.forEach(function (i) {
            var m = String(i.id).match(/^offer-(.+)-\d+$/); if (!m) return;
            var o = v[m[1]];
            if (!o || !Array.isArray(o.items) || !o.items.length || Number(o.endAt) <= Date.now()) { ids.push(String(i.id)); names.push(i.name); }
          });
          if (ids.length) purge(ids, names);
        }).catch(function () {});
    }
    var msg = null; try { msg = sessionStorage.getItem("ofPurged"); sessionStorage.removeItem("ofPurged"); } catch (_) {}
    if (msg) {
      var show = function () {
        var t = document.createElement("div");
        t.textContent = "⏰ انتهى العرض وتم حذفه من سلتك: " + msg;
        t.style.cssText = "position:fixed;bottom:84px;left:50%;transform:translateX(-50%);z-index:99999;background:#222;color:#fff;padding:12px 18px;border-radius:12px;font:700 14px inherit;font-family:inherit;max-width:90%;text-align:center;direction:rtl;box-shadow:0 6px 20px rgba(0,0,0,.35)";
        document.body.appendChild(t); setTimeout(function () { t.remove(); }, 6000);
      };
      if (document.body) show(); else document.addEventListener("DOMContentLoaded", show);
    }
    localCheck(); remoteCheck(); setInterval(localCheck, 15000);
  })();
})();