/* يميّز سطر "العرض" في السلة (صفحة السلة + قايمة السلة الجانبية) عن المنتجات العادية.
   ارفعه في فولدر js وضيف قبل </body>:  <script src="js/offer-cart-style.js"></script> */
(function () {
  console.info("[offer-cart] تفاصيل العرض بالصور — نسخة 3");
  var SELF = document.currentScript && document.currentScript.src;   // مكان الملف (js/) عشان نوصّل لباقي الملفات
  var css = `
  .of-cart-line{position:relative !important;background:linear-gradient(135deg,#fff4ea,#ffe2c8) !important;
    border:2px solid #f5934e !important;border-radius:16px !important;box-shadow:0 6px 18px rgba(210,112,57,.28) !important;
    margin-top:14px !important;overflow:visible !important}
  .of-cart-line::after{content:"";position:absolute;inset:0;border-radius:14px;pointer-events:none;
    background:linear-gradient(115deg,transparent 40%,rgba(255,255,255,.55) 50%,transparent 60%);background-size:250% 100%;animation:ofShine 3.2s infinite}
  @keyframes ofShine{0%{background-position:150% 0}100%{background-position:-100% 0}}
  .of-cart-badge{    font-family: 'Cairo', sans-serif;
    font-weight: 700;position:absolute;top:-12px;right:14px;z-index:3;background:linear-gradient(227deg,#f5934e,#d27039);color:#fff;
   font-size:12px;padding:4px 14px;border-radius:99px;box-shadow:0 3px 8px rgba(210,112,57,.45);}
  .of-tier-box{margin-top:10px;background:#e8f7ec;border:1px dashed #43a047;border-radius:12px;padding:9px 12px;font-size:13px;line-height:1.7;color:#1b5e20;position:relative;z-index:4}
  .of-tier-box .of-tier-next{color:#d27039;margin-top:4px}
  .of-tier-btns{display:flex;gap:8px;margin-top:6px}
  .of-tier-btns button{border:0;cursor:pointer;font:inherit;font-weight:800;font-size:12px;padding:6px 12px;border-radius:8px;background:#43a047;color:#fff}
  .of-tier-btns button[data-act=copy]{background:#fff;color:#2e7d32;border:1px solid #43a047}
  .of-dm{position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:14px;direction:rtl;font-family:inherit;animation:ofDmIn .18s ease-out}
  @keyframes ofDmIn{from{opacity:0}to{opacity:1}}
  .of-dm-card{background:#fff;color:#222;width:min(520px,100%);max-height:86vh;display:flex;flex-direction:column;border-radius:20px;box-shadow:0 20px 60px rgba(0,0,0,.4);animation:ofDmPop .22s ease-out;overflow:hidden}
  @keyframes ofDmPop{from{transform:translateY(24px);opacity:.6}to{transform:none;opacity:1}}
  .of-dm-h{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;padding:16px 18px 12px;background:linear-gradient(227deg,#f5934e,#d27039);color:#fff}
  .of-dm-k{font-size: 12px;
    opacity: .9;
    font-weight: 700;
    font-family: 'Cairo', sans-serif;}
  .of-dm-n{    font-size: 17px;
    font-weight: 600;
    margin-top: 0px;
    font-family: 'Cairo', sans-serif;}
  .of-dm-x{border:0;background:rgba(255,255,255,.25);color:#fff;width:34px;height:34px;border-radius:50%;font-size:22px;line-height:1;cursor:pointer}
  .of-dm-note{margin:12px 16px 0;padding:9px 12px;border-radius:12px;background:#fff4ea;color:#d27039;font-weight:800;font-size:13px}
  .of-dm-list{padding:8px 16px 16px;overflow:auto}
  .of-dm-row{display:flex;gap:12px;align-items:center;padding:12px 0;border-top:1px solid #f1e3d8}
  .of-dm-row:first-child{border-top:0}
  .of-dm-row img{width:78px;height:78px;border-radius:14px;object-fit:cover;flex:0 0 auto;background:#eceff4}
  .of-dm-t{min-width:0;display:flex;flex-direction:column;align-items:flex-start;gap:6px}
  .of-dm-t b{    font-family: 'Cairo', sans-serif;font-size:14px;font-weight:500;line-height:1.5}
  .of-dm-t .chip{display:inline-block;background:#f4f6fa;border-radius:99px;padding:3px 11px;font-size:12px;font-weight:700;color:#555}
  @media (max-width:600px){.of-dm{align-items:flex-end;padding:0}.of-dm-card{width:100%;border-radius:20px 20px 0 0;max-height:80vh}}
  .of-det-btn{background:none;border:0;padding:2px 0;cursor:pointer;font:inherit;font-weight:900;font-size:13px;color:#d27039;display:inline-flex;align-items:center;gap:6px}
  .of-det-btn i{transition:transform .25s;font-size:11px}
  .of-det-btn.open i{transform:rotate(180deg)}
  .of-det-panel{display:none;margin-top:8px;background:#fff;border:1px dashed #f5934e;border-radius:12px;padding:10px 12px;font-size:13px;line-height:1.7;color:#333;position:relative;z-index:4;text-align:start}
  .of-det-panel.open{display:block}
  .of-det-panel .note{font-weight:800;color:#d27039;margin-bottom:6px}
  .of-det-item{padding:6px 0;border-top:1px solid #f1e3d8}
  .of-det-item:first-of-type{border-top:0}
  .of-det-item b{display:block;font-weight:800}
  .of-det-item span{display:inline-block;margin-inline-end:12px;color:#666}

  @media (max-width:500px){
  .of-dm-row img {
    width: 60px;
    height: 60px;
    border-radius: 3px;
}
.of-dm-t b {
    font-size: 12px;

}
.of-dm-t .chip {
    font-size: 10px;
}
  }
  


@media (max-width:400px){
    .of-dm-row img {
        width: 52px;
        height: 52px;
}
.of-dm-row {
    gap: 10px;
    padding: 10px 0;
}





}
  
  
  
  
  `;
  var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  var norm = function (t) { return String(t || "").replace(/\s+/g, " ").trim(); };
  function offers() {
    try { return (JSON.parse(localStorage.getItem("cart")) || []).filter(function (i) { return String(i.id).indexOf("offer-") === 0; }); }
    catch (_) { return []; }
  }

  function detailsFor(id) {
    try { return (JSON.parse(localStorage.getItem("offerDetails")) || {})[id] || null; } catch (_) { return null; }
  }
  var esc = function (t) { return String(t == null ? "" : t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };

  // نافذة منبثقة بتفاصيل العرض: صورة كل منتج + الاسم + اللون + المقاس
  var PH = "data:image/svg+xml;utf8,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2790%27 height=%2790%27%3E%3Crect width=%2790%27 height=%2790%27 rx=%2714%27 fill=%27%23eceff4%27/%3E%3C/svg%3E";
  window.__ofImgErr = function (im) {          // الصورة ما اتلقتش محلياً: جرّبها من الموقع الأونلاين مرة، وبعدها مربع رمادي
    if (!im.dataset.t) {
      im.dataset.t = "1";
      try { var u = new URL(im.src); if (u.hostname !== "kashmair.vercel.app" && u.protocol.indexOf("http") === 0) { im.src = "https://kashmair.vercel.app" + u.pathname; return; } } catch (_) {}
    }
    im.onerror = null; im.src = PH;
  };

  // --- بيجيب صور المنتجات من Firestore لو العرض اتضاف للسلة قبل ما نحفظ الصور ---
  var fsP = null;
  function fsLoad() {
    if (!fsP) fsP = Promise.all([import(new URL("firebase-config.js", SELF).href), import("https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js")])
      .then(function (r) { return { db: r[0].db, doc: r[1].doc, getDoc: r[1].getDoc, collection: r[1].collection, getDocs: r[1].getDocs }; });
    return fsP;
  }
  function toAbs(u) {
    u = String(u || "").trim();
    if (!u || /^(https?:)?\/\/|^data:/.test(u)) return u;
    u = u.replace(/^(\.\.\/|\.\/)+/, "");
    try { return new URL("../" + u, SELF).href; } catch (_) { return u; }
  }
  function pickImg(p, color) {
    var keys = Object.keys(p).filter(function (k) { return /^color\d+$/.test(k) && p[k]; })
      .sort(function (x, y) { return parseInt(x.slice(5)) - parseInt(y.slice(5)); });
    if (color) for (var i = 0; i < keys.length; i++) if (String(p[keys[i]]).trim() === String(color).trim() && p[keys[i] + "_img"]) return p[keys[i] + "_img"];
    return p.img || keys.map(function (k) { return p[k + "_img"]; }).filter(Boolean)[0] || "";
  }
  var COLS = ["coferta", "ellehaf", "feyat", "mlayat", "patatin", "paranes"], byNameP = null;
  function productsByName() {                         // كل منتجات الأقسام بالاسم (بيتحمّل مرة واحدة)
    if (!byNameP) byNameP = fsLoad().then(function (fs) {
      return Promise.all(COLS.map(function (c) {
        return fs.getDocs(fs.collection(fs.db, c)).then(function (sn) { var a = []; sn.forEach(function (x) { a.push(x.data()); }); return a; }).catch(function () { return []; });
      }));
    }).then(function (arrs) {
      var map = {}; arrs.forEach(function (a) { a.forEach(function (p) { var n = String(p.name || "").trim(); if (n && !map[n]) map[n] = p; }); });
      return map;
    });
    return byNameP;
  }
  function fillImages(offer, d, bg) {
    var m = String(offer.id).match(/^offer-(.+)-\d+$/);
    var exact = !m ? Promise.resolve([]) : getOffers().then(function (v) {     // 1) المنتجات بالكود الكامل "القسم-id"
      v = v || {};
      var o = v[m[1]] || (m[1] === "comfort" ? v.current : null);
      if (!o || !Array.isArray(o.items)) return [];
      return fsLoad().then(function (fs) {
        return Promise.all(o.items.map(function (x) {
          var id = String(x && typeof x === "object" ? x.id : x), mm = id.match(/^([A-Za-z_][A-Za-z0-9_]*)-(.+)$/);
          if (!mm) return null;
          return fs.getDoc(fs.doc(fs.db, mm[1], mm[2])).then(function (s) { return s.exists() ? s.data() : null; }).catch(function () { return null; });
        }));
      });
    }).then(function (a) { return a.filter(Boolean); }).catch(function (e) { console.warn("[offer-cart] exact fetch failed", e); return []; });

    exact.then(function (prods) {
      var find = function (it) { return prods.filter(function (x) { return String(x.name || "").trim() === String(it.name || "").trim(); })[0]; };
      var missing = d.items.some(function (it) { return !it.img && !find(it); });
      return (missing ? productsByName().catch(function (e) { console.warn("[offer-cart] name scan failed", e); return {}; }) : Promise.resolve({})).then(function (map) {
        var imgs = bg.querySelectorAll(".of-dm-row img"), changed = false;
        d.items.forEach(function (it, i) {
          if (it.img) return;
          var p = find(it) || map[String(it.name || "").trim()];
          var src = p && pickImg(p, it.color);
          if (src) { it.img = toAbs(src); changed = true; if (imgs[i]) { imgs[i].dataset.t = ""; imgs[i].src = it.img; } }
          else console.warn("[offer-cart] مالقيتش صورة للمنتج:", it.name);
        });
        if (changed) {
          try { var all = JSON.parse(localStorage.getItem("offerDetails")) || {}; if (all[offer.id]) { all[offer.id].items = d.items; localStorage.setItem("offerDetails", JSON.stringify(all)); } } catch (_) {}
        }
      });
    }).catch(function (e) { console.warn("[offer-cart] تعذر تحميل صور المنتجات", e); });
  }

  function openDetails(offer, d) {
    if (document.querySelector(".of-dm")) return;
    var bg = document.createElement("div");
    bg.className = "of-dm";
    var rows = d.items.map(function (it) {
      return '<div class="of-dm-row"><img src="' + esc(it.img || PH) + '" alt="" onerror="__ofImgErr(this)">' +
        '<div class="of-dm-t"><b>' + esc(it.name) + '</b>' +
        (it.color ? '<span class="chip">اللون: ' + esc(it.color) + '</span>' : '') +
        (it.size ? '<span class="chip">المقاس: ' + esc(it.size) + '</span>' : '') + '</div></div>';
    }).join("");
    bg.innerHTML = '<div class="of-dm-card" role="dialog" aria-modal="true">' +
      '<div class="of-dm-h"><div><div class="of-dm-k"> تفاصيل العرض</div><div class="of-dm-n">' + esc(offer.name) + '</div></div>' +
      '<button type="button" class="of-dm-x" aria-label="إغلاق">&times;</button></div>' +
      (d.note ? '<div class="of-dm-note">' + esc(d.note) + '</div>' : '') +
      '<div class="of-dm-list">' + rows + '</div></div>';
    var close = function () { bg.remove(); document.body.style.overflow = ""; document.removeEventListener("keydown", onKey); };
    var onKey = function (e) { if (e.key === "Escape") close(); };
    bg.addEventListener("click", function (e) { if (e.target === bg || e.target.closest(".of-dm-x")) close(); });
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    document.body.appendChild(bg);
    if (d.items.some(function (it) { return !it.img; })) fillImages(offer, d, bg);
  }

  // بيستبدل سطر "اللون: ..." في سطر العرض بزرار "تفاصيل ▾" + لوحة بكل بيانات المنتجات
  function addDetails(row, offer) {
    if (row.getAttribute("data-of-det")) return;
    var d = detailsFor(offer.id);
    if (!d || !d.items || !d.items.length) return;
    // أكبر عنصر نصه بيبدأ بـ "اللون" ومفيهوش زرار حذف
    var target = null, all = row.querySelectorAll("*");
    for (var i = 0; i < all.length; i++) {
      if (all[i].querySelector(".delet_item")) continue;
      if (/^\s*اللون/.test(all[i].textContent)) { target = all[i]; break; }
    }
    if (target) {
      var up = target.parentElement;
      while (up && up !== row && !up.querySelector(".delet_item") && /^\s*اللون/.test(up.textContent)) { target = up; up = up.parentElement; }
    }
    var btn = document.createElement("button");
    btn.type = "button"; btn.className = "of-det-btn";
    btn.innerHTML = 'تفاصيل <i class="fa-solid fa-chevron-left"></i>';
    btn.addEventListener("click", function (e) {
      e.preventDefault(); e.stopPropagation();
      openDetails(offer, d);
    });
    if (target) { target.innerHTML = ""; target.appendChild(btn); }
    else { row.appendChild(btn); }
    row.setAttribute("data-of-det", "1");
  }

  var RTDB_URL = "https://data-customer-d722f-default-rtdb.firebaseio.com";
  var offersP = null;
  function getOffers() {
    if (!offersP) offersP = fetch(RTDB_URL + "/offers.json", { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; });
    return offersP;
  }
  function fmtTier(t) { return (t.type === "fixed" ? t.value + " ج.م" : t.value + "%"); }

  // رسالة خصم الكمية جوه سطر العرض: كود للعميل / خصم اتطبق / "أضف X كمان"
  function addTiers(row, offer) {
    if (row.getAttribute("data-of-tier")) return;
    row.setAttribute("data-of-tier", "1");
    var m = String(offer.id).match(/^offer-(.+)-\d+$/); if (!m) return;
    var key = m[1], re = new RegExp("^offer-" + key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "-\\d+$");
    getOffers().then(function (v) {
      v = v || {};
      var o = v[key] || (key === "comfort" ? v.current : null);
      var tiers = o && Array.isArray(o.tiers) ? o.tiers.slice().sort(function (a, b) { return a.qty - b.qty; }) : [];
      if (!tiers.length || !document.contains(row)) return;
      var cur = 0;
      try { (JSON.parse(localStorage.getItem("cart")) || []).forEach(function (i) { if (re.test(String(i.id))) cur += Number(i.quantity) || 1; }); } catch (_) {}
      var reached = tiers.filter(function (t) { return t.qty <= cur; }), best = reached[reached.length - 1];
      var next = tiers.filter(function (t) { return t.qty > cur; })[0];
      var html = "";
      if (best && best.mode === "code") {
        html += '<div>🎁 مبروك! خصم <b>' + fmtTier(best) + '</b> على العرض — كودك: <b dir="ltr" class="of-tier-code">' + best.code + '</b></div>' +
          '<div class="of-tier-btns"><button type="button" data-act="copy">نسخ الكود</button><button type="button" data-act="apply">تطبيق الكود</button></div>';
      } else if (best) {
        html += '<div>🎉 خصم <b>' + fmtTier(best) + '</b> اتطبق تلقائي على العرض</div>';
      }
      if (next) html += '<div class="of-tier-next">أضف <b>' + (next.qty - cur) + '</b> كمان من العرض واحصل على خصم <b>' + fmtTier(next) + '</b></div>';
      if (!html) return;
      var box = document.createElement("div");
      box.className = "of-tier-box"; box.innerHTML = html;
      box.addEventListener("click", function (e) {
        var b = e.target.closest("button"); if (!b) return;
        e.preventDefault(); e.stopPropagation();
        var code = (box.querySelector(".of-tier-code") || {}).textContent || "";
        if (b.getAttribute("data-act") === "copy") { try { navigator.clipboard.writeText(code); b.textContent = "✓ اتنسخ"; } catch (_) {} }
        else {
          var inp = document.querySelector(".copon_input"), btn = document.querySelector(".copon");
          if (inp && btn) { inp.value = code; btn.click(); } else { try { navigator.clipboard.writeText(code); } catch (_) {} b.textContent = "✓ اتنسخ — الصقه في السلة"; }
        }
      });
      (row.querySelector(".content") || row).appendChild(box);
    });
  }

  function mark() {
    var list = offers();
    if (!list.length) return;
    var names = list.map(function (i) { return norm(i.name); }).filter(Boolean);
    document.querySelectorAll(".delet_item").forEach(function (btn) {
      var cands = [], el = btn.parentElement;
      while (el && el !== document.body) {                         // كل الآباء اللي فيهم زرار حذف واحد بس = حدود السطر
        if (el.querySelectorAll(".delet_item").length !== 1) break;
        cands.push(el); el = el.parentElement;
      }
      for (var i = 0; i < cands.length; i++) {                      // أصغر أب فيه اسم العرض = سطر العرض
        var txt = norm(cands[i].textContent);
        if (names.some(function (n) { return txt.indexOf(n) !== -1; })) {
          var row = cands[i];
          var offer = list.filter(function (o) { return txt.indexOf(norm(o.name)) !== -1; })[0] || list[0];
          if (!row.classList.contains("of-cart-line")) {
            row.classList.add("of-cart-line");
            var b = document.createElement("span");
            b.className = "of-cart-badge"; b.textContent = " عرض خاص";
            row.insertBefore(b, row.firstChild);
          }
          addDetails(row, offer);
          addTiers(row, offer);
          return;
        }
      }
    });
  }

  var t;
  function later() { clearTimeout(t); t = setTimeout(mark, 80); }
  new MutationObserver(later).observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("storage", later);
  document.addEventListener("DOMContentLoaded", later);
  later();

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