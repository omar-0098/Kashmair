// ============================================================
//  🛠️ لوحة تحكم كشمير هوم (user/admin.html)
//  أقسام: لوحة التحكم | الطلبات | التعليقات | الحسابات (تعديل بيانات العملاء) | الإحصائيات
// ============================================================
import{initializeApp,getApps,getApp}from"https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import{getDatabase,ref,get,set,update,remove,onValue,runTransaction}from"https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import{ADMIN_EMAIL,isAdminAccount,hasAdminAuth,clearAdminAuth}from"./admin-config.js";
import{initStats}from"./admin-stats.js";
import{initCoupons}from"./admin-coupons.js";

// ---------- بوابة الحماية ----------
if(!(isAdminAccount() && await hasAdminAuth())){ location.replace("accoun.html"); throw new Error("not admin"); }
document.getElementById("gateMsg").remove();

const cfg={apiKey:"AIzaSyCCk0w_KHVCswjp16TSkNToRSSOjlPC5kE",authDomain:"data-customer-d722f.firebaseapp.com",databaseURL:"https://data-customer-d722f-default-rtdb.firebaseio.com/",projectId:"data-customer-d722f",storageBucket:"data-customer-d722f.firebasestorage.app",messagingSenderId:"398522341614",appId:"1:398522341614:web:99e0f897c61ec960cffbff"};
const db=getDatabase(getApps().length?getApp():initializeApp(cfg));
const eKey=e=>String(e).replace(/\./g,"_").replace(/@/g,"__");

// ---------- أدوات ----------
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fDate=t=>t?new Date(t).toLocaleDateString("ar-EG",{year:"numeric",month:"short",day:"numeric"}):"—";
const fDT=t=>t?new Date(t).toLocaleString("ar-EG",{year:"numeric",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}):"—";
const fNum=n=>Number(n||0).toLocaleString("ar-EG");
const money=s=>{ // يحوّل "١٢٥٠ ج.م." أو "1,250 EGP" لرقم
  if(typeof s==="number")return s;
  const t=String(s||"").replace(/[٠-٩]/g,d=>"٠١٢٣٤٥٦٧٨٩".indexOf(d)).replace(/[٬,]/g,"").replace("٫",".");
  const m=t.match(/\d+(\.\d+)?/);return m?parseFloat(m[0]):0;
};
const gross=o=>money(o.total)+(Number(o.walletUsed)||0);   // إجمالي الطلب الحقيقي = المدفوع + اللي اتدفع من رصيد العميل
const r2=n=>Math.round((Number(n)||0)*100)/100;
const fMoney=n=>Number(n||0).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})+" ج.م.";
// 📝 تعديل / حذف حركة رصيد (إضافة أو خصم يدوي) — بيتسجّل تاريخ التعديل وإيه اللي اتغيّر وبيظهر للعميل
async function walletEntryApply(ek,id,mode,newAmt,newNote){
  const e=(((D.wallet||{})[ek]||{}).log||{})[id];if(!e)return"missing";
  const old=Number(e.amount)||0,sign=e.type==="deduct"?-1:1,now=Date.now(),upd={};let delta=0,text="";
  if(mode==="delete"){delta=-sign*old;text=`تم حذف هذه الحركة (${fMoney(old)})`;upd.deleted=true;upd.deletedAt=now;}
  else{
    newAmt=r2(newAmt);const parts=[];
    if(newAmt!==old){parts.push(`المبلغ من ${fMoney(old)} إلى ${fMoney(newAmt)}`);delta=sign*(newAmt-old);}
    if((newNote||"")!==(e.note||""))parts.push(`الملاحظة من "${e.note||"—"}" إلى "${newNote||"—"}"`);
    if(!parts.length)return"none";
    text="تم التعديل: "+parts.join(" • ");upd.amount=newAmt;upd.note=newNote||"";if(e.origAmount==null)upd.origAmount=old;
  }
  if(delta!==0)await runTransaction(ref(db,`wallet/${ek}/balance`),cur=>Math.max(0,r2((Number(cur)||0)+delta)));
  await update(ref(db,`wallet/${ek}/log/${id}`),{...upd,[`edits/e${now.toString(36)}`]:{at:now,text}});
  return"ok";
}
const walletEditsHtml=x=>Object.values(x.edits||{}).sort((a,b)=>(a.at||0)-(b.at||0)).map(e=>`<div style="font-size:11.5px;color:#b26a00;margin-top:2px">✏️ ${fDT(e.at)} — ${esc(e.text)}</div>`).join("");
function openWalletEntry(ek,id,after){
  const e=(((D.wallet||{})[ek]||{}).log||{})[id];if(!e)return;
  openModal("تعديل حركة رصيد",`
    <div class="kv"><div><div class="k">النوع</div><div class="vv">${e.type==="deduct"?"➖ خصم يدوي":"➕ إضافة رصيد"}</div></div><div><div class="k">تاريخها</div><div class="vv">${fDT(e.at)}</div></div></div>
    <div style="display:grid;gap:12px;margin-top:12px">
      <div><div class="k">المبلغ (ج.م.)</div><input class="inp" id="weAmt" type="number" min="0" step="0.01" style="width:100%" value="${Number(e.amount)||0}"></div>
      <div><div class="k">الملاحظة</div><input class="inp" id="weNote" maxlength="120" style="width:100%" value="${esc(e.note||"")}"></div>
      <div class="mut" style="font-size:12.5px;line-height:1.8">لما تحفظ، رصيد العميل بيتعدّل أوتوماتيك، وبيظهر له سطر: «تم التعديل يوم كذا والتعديل كان إيه». ولو حذفتها الرصيد بيرجع كأنها ماحصلتش (وبتفضل ظاهرة للعميل كحركة محذوفة).</div>
      ${walletEditsHtml(e)}
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="btn solid" id="weSave"><i class="fa-solid fa-floppy-disk"></i> حفظ التعديل</button><button type="button" class="btn red" id="weDel"><i class="fa-solid fa-trash-can"></i> حذف الحركة</button></div>
    </div>`);
  const done=async(mode)=>{
    const amt=Number($("weAmt").value);
    if(mode==="edit"&&!(amt>=0)){toast("❌ اكتب مبلغ صحيح");return;}
    if(mode==="delete"&&!confirm("حذف الحركة دي؟ رصيد العميل هيتعدّل."))return;
    $("weSave").disabled=$("weDel").disabled=true;
    try{
      const r=await walletEntryApply(ek,id,mode,amt,$("weNote").value.trim());
      if(r==="none"){toast("مفيش حاجة اتغيّرت");$("weSave").disabled=$("weDel").disabled=false;return;}
      D.wallet=await loadWallets();
      $("modal").classList.remove("open");toast(mode==="delete"?"🗑️ تم حذف الحركة وتعديل الرصيد":"✅ تم التعديل وتسجيله للعميل");
      render();if(after)after();
    }catch(err){console.error(err);toast("❌ فشلت العملية — راجع Rules في Firebase");$("weSave").disabled=$("weDel").disabled=false;}
  };
  $("weSave").onclick=()=>done("edit");$("weDel").onclick=()=>done("delete");
}
// 💰 رصيد العميل: type = credit (إضافة) | deduct (خصم يدوي)
async function walletAdjust(email,amount,type,note){
  const ek=eKey(email);amount=r2(amount);
  const res=await runTransaction(ref(db,`wallet/${ek}/balance`),cur=>{
    const b=Number(cur)||0;
    if(type==="deduct"&&b+0.0001<amount)return;
    return r2(type==="deduct"?b-amount:b+amount);
  });
  if(!res.committed)return false;
  const id="a"+Date.now().toString(36)+Math.random().toString(36).slice(2,5);
  await set(ref(db,`wallet/${ek}/log/${id}`),{type,amount,at:Date.now(),note:note||"",by:ADMIN_EMAIL});
  return true;
}
// استرجاع اللي اتدفع من الرصيد لما الطلب يتحذف (مرة واحدة بس لكل طلب)
async function walletRefundOrder(o){
  const use=Number(o.walletUsed)||0;
  if(use<=0||!o.email)return;
  const ek=eKey(o.email);
  await runTransaction(ref(db,`wallet/${ek}/balance`),cur=>r2((Number(cur)||0)+use));
  await set(ref(db,`wallet/${ek}/log/r_${o.id}`),{type:"refund",amount:use,at:Date.now(),orderId:o.id,orderCode:o.code,note:"استرجاع بعد حذف الطلب"});
}
const SENSITIVE=/pass|pwd|token|secret/i;    // مش بنعرض أي حقل سرّي
function toast(m){const t=document.createElement("div");t.className="toast";t.textContent=m;document.body.appendChild(t);setTimeout(()=>t.remove(),2400);}
const initials=n=>(String(n||"?").trim()[0]||"?").toUpperCase();

// ---------- حالة الطلب (نفس منطق صفحة العميل) ----------
const STEP1=10e3;   // بس "استلمنا الطلب" بيكتمل تلقائي — باقي الخطوات بتحددها من هنا
const ST=["جاري الاستلام","قيد التنفيذ","تم التنفيذ","تم الإرسال","تم التسليم"];
function stepsDone(o){
  const el=Date.now()-(o.createdAt||0);
  return Math.max(el>=STEP1?1:0,Math.min(4,parseInt(o.stage)||0));
}
const piecesOf=o=>(Array.isArray(o.items)?o.items:[]).reduce((n,it)=>n+(parseInt(it&&it.qty)||1),0);
const piecesBadge=o=>`<span class="badge" style="background:#e8f0fe;color:#1a56db;font-size:12.5px;font-weight:800;white-space:nowrap">🧺 ${fNum(piecesOf(o))} قطعة</span>`;
const badge=o=>{const c=stepsDone(o);return `<span class="badge b${c}">${ST[c]}</span>`;};

// ---------- تعليقات سلبية (تقييم واطي أو كلام وحش) — بتتلوّن حمرا عشان الأدمن يتابع مع العميل ----------
const NEG_WORDS=/وحش|وحشه|وحشة|زفت|سيء|سيئ|سيئة|رديء|رديئ|خربان|خربانة|تالف|تالفة|غالي\s*جدا|بطيء|بطيئ|متاخر|مقاطع|نصب|احتيال|مش\s*حلو|مش\s*كويس|مش\s*كويسة|هزل|فاشل|فاشلة|زبال|مكسور|مقطوع|رجعته|هرجع/i;
function isNegative(c){ return NEG_WORDS.test(String(c.text||"")); }

// ---------- البيانات ----------
let D={users:[],orders:[],comments:[],addr:{},products:{},byName:{},analytics:{},orderRoot:new Set(),cancelled:[],uoPaths:{},coupons:[]};
let view="dashboard",q="";
window._csel=new Set();

// ---------- بيانات المنتجات (نفس ملف JSON اللي الموقع بيستخدمه) عشان نعرض المنتج اللي اتعمله كومنت ----------
D.productsLoaded=false; D.productsTried=[];
async function loadProducts(){
  const candidates=["/products-furniturre.json","../../products-furniturre.json","../products-furniturre.json","products-furniturre.json","./products-furniturre.json"];
  for(const url of candidates){
    try{
      const r=await fetch(url,{cache:"no-store"});
      D.productsTried.push(`${url} → HTTP ${r.status}`);
      if(!r.ok) continue;
      const data=await r.json();
      const list=Array.isArray(data)?data:Object.values(data||{});
      const map={};
      list.forEach(p=>{
        if(!p) return;
        if(p.id!==undefined) map[String(p.id)]=p;
        if(p.docId!==undefined) map[String(p.docId)]=p;
        if(p.col!==undefined&&p.docId!==undefined) map[`${p.col}-${p.docId}`]=p;   // نفس مفتاح "col-docId" المستخدم كـ itemId في التعليقات
        if(p.slug!==undefined) map[String(p.slug)]=p;
        if(p.sku!==undefined) map[String(p.sku)]=p;
      });
      D.products=map;
      const byName={};
      list.forEach(p=>{ if(p&&p.name) byName[nrm(p.name)]=p; });
      D.byName=byName;
      D.productsLoaded=Object.keys(map).length>0;
      console.info(`[كشمير هوم] ملف المنتجات اتحمّل من "${url}" — ${list.length} منتج، ${Object.keys(map).length} مفتاح.`);
      if(list[0]) console.info("[كشمير هوم] شكل أول منتج في الملف (عشان نتأكد من أسماء الحقول col/docId/id):",JSON.parse(JSON.stringify(list[0])));
      if(!D.productsLoaded) console.warn("[كشمير هوم] الملف اتحمّل بس مفيش مفاتيح col/docId/id/slug/sku في العناصر — راجع شكل ملف JSON.");
      if(["comments","dashboard","analytics","orders","cancelled"].includes(view)) render();
      return;
    }catch(e){ D.productsTried.push(`${url} → خطأ: ${e.message}`); /* جرّب المسار اللي بعده */ }
  }
  console.warn("[كشمير هوم] فشل تحميل ملف المنتجات من كل المسارات المجرّبة:",D.productsTried);
  if(["comments","dashboard","analytics","orders","cancelled"].includes(view)) render();
}
function findProduct(itemId){
  const key=String(itemId).trim();
  if(D.products[key]) return D.products[key];
  const lk=key.toLowerCase();
  if(D.products[lk]) return D.products[lk];
  const i=key.lastIndexOf("-");                       // fallback: "feyat-1" → col="feyat", docId="1"
  if(i>0){
    const col=key.slice(0,i).trim(), docId=key.slice(i+1).trim();
    const hit=Object.values(D.products).find(p=>String(p.col).trim().toLowerCase()===col.toLowerCase()&&String(p.docId).trim()===docId);
    if(hit) return hit;
  }
  // آخر محاولة: دوّر بمطابقة case-insensitive على كل المفاتيح المخزّنة
  const hit2=Object.keys(D.products).find(k=>k.toLowerCase()===lk);
  return hit2?D.products[hit2]:undefined;
}
function prodThumb(itemId){ // صورة صغيرة بس للمنتج (للاستخدام جنب التعليق في القوايم المختصرة)
  const p=findProduct(itemId);
  const img=p&&p.img?`<img src="${esc(p.img)}" style="width:100%;height:100%;object-fit:cover;display:block">`:`<i class="fa-solid fa-couch" style="font-size:13px;color:var(--mut)"></i>`;
  return `<div class="zoomable" title="${esc(p?.name||itemId)}" style="width:36px;height:36px;border-radius:7px;overflow:hidden;flex-shrink:0;background:#eef1f6;display:flex;align-items:center;justify-content:center">${img}</div>`;
}
function productChip(itemId){
  const p=findProduct(itemId);
  if(!p) return `<div><span class="mut">المنتج مش موجود في الكتالوج</span><br><span class="code">${esc(itemId)}</span></div>`;
  const link=(p.col&&p.docId)?`../Furniture/item.html?col=${encodeURIComponent(p.col)}&docId=${encodeURIComponent(p.docId)}`:null;
  const nm=esc(p.name||itemId);
  const nameHtml=link?`<a href="${esc(link)}" target="_blank" rel="noopener" style="color:var(--pri);font-weight:800">${nm}</a>`:`<b>${nm}</b>`;
  return `<div>${nameHtml}<br><span class="mut" style="font-size:11px">${esc(itemId)}</span></div>`;
}

// ---------- صورة المنتج جنب كل منتج جوه الطلب ----------
function orderItemProduct(it){
  if(!it) return undefined;
  for(const k of [it.itemId,it.productId,it.id,it.key,it.slug,it.sku]){
    if(k!==undefined&&k!==null&&k!==""){const p=findProduct(k);if(p)return p;}
  }
  if(it.col!==undefined&&it.docId!==undefined){const p=findProduct(`${it.col}-${it.docId}`);if(p)return p;}
  const nm=nrm(it.name); if(!nm) return undefined;
  if(D.byName[nm]) return D.byName[nm];
  if(nm.length<3) return undefined;
  const hit=Object.keys(D.byName).find(k=>k.length>=3&&(k.includes(nm)||nm.includes(k)));   // تطابق جزئي لو الاسم اتكتب مختلف شوية
  return hit?D.byName[hit]:undefined;
}
function itemThumbHtml(it,size=44){
  const p=orderItemProduct(it);
  const src=(it&&it.img)||(p&&p.img)||it?.image||"";
  const inner=src?`<img src="${esc(src)}" alt="" loading="lazy" onerror="this.style.display='none'" style="width:100%;height:100%;object-fit:cover;display:block">`:`<i class="fa-solid fa-couch" style="font-size:${Math.round(size*.38)}px;color:var(--mut)"></i>`;
  return `<div data-thumb${src?' class="zoomable" title="'+esc(p?.name||it?.name||"")+' — اضغط مرتين للتكبير"':""} style="width:${size}px;height:${size}px;border-radius:9px;overflow:hidden;flex-shrink:0;background:#eef1f6;display:flex;align-items:center;justify-content:center">${inner}</div>`;
}
// ---------- لون المنتج جوه الطلب ----------
const COLOR_MAP={"أبيض":"#ffffff","ابيض":"#ffffff","أسود":"#111111","اسود":"#111111","رمادي":"#8a8f98","رصاصي":"#6b7280","بيج":"#d8c3a5","بني":"#7b4a2d","أحمر":"#d62828","احمر":"#d62828","أزرق":"#2563eb","ازرق":"#2563eb","كحلي":"#1e2a5a","سماوي":"#38bdf8","أخضر":"#16a34a","اخضر":"#16a34a","زيتي":"#6b7d2a","أصفر":"#facc15","اصفر":"#facc15","ذهبي":"#c8a96e","دهبي":"#c8a96e","فضي":"#c0c4cc","وردي":"#f472b6","برتقالي":"#f97316","بنفسجي":"#7c3aed","موف":"#9b5de5","عنابي":"#7f1d3a","تركواز":"#14b8a6","كريمي":"#f5ecd7","سكري":"#e8d5b0","جملي":"#c19a6b","خشبي":"#a47148","خشب":"#a47148","جوزي":"#5c3d2e"};
const itemColorKey=it=>it?Object.keys(it).find(k=>/colou?r|لون/i.test(k)&&!/hex|variant|img|image/i.test(k)&&it[k]!==undefined&&it[k]!==null&&it[k]!==""):undefined;
// لو الطلب متسجّلش فيه اللون، نطلعه من صورة المنتج (صورة اللون المختار بتتخزّن مع المنتج وبتطابق color1_img / color2_img ...)
const imgBase=u=>{ // اسم ملف الصورة بس (من غير مسار ولا ?query) عشان المطابقة تنجح حتى لو المسار اتكتب مختلف
  let t=String(u||"").trim().split(/[?#]/)[0];
  try{t=decodeURIComponent(t);}catch(e){}
  return t.split("/").pop().toLowerCase();
};
function colorFromImg(it){
  const vs=productVariants(orderItemProduct(it)); if(!vs.length) return "";
  if(vs.length===1) return vs[0].color;                     // منتج بلون واحد بس → اللون معروف أكيد
  const src=String(it&&(it.img||it.image)||"").trim(); if(!src) return "";
  let hit=vs.find(v=>v.img&&String(v.img).trim()===src);
  if(!hit){const b=imgBase(src);if(b)hit=vs.find(v=>v.img&&imgBase(v.img)===b);}
  return hit?hit.color:"";
}
function itemColor(it){
  const k=itemColorKey(it);
  if(k){
    const v=it[k];
    const t=(v&&typeof v==="object")?String(v.name||v.label||v.title||v.hex||""):String(v);
    if(t) return t;
  }
  return colorFromImg(it);
}
function colorDot(v,hex){
  const t=String(v||"").trim().toLowerCase();
  let c=hex||COLOR_MAP[t]||COLOR_MAP[t.replace(/^ال/,"")]||"";
  if(!c&&/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(t)) c=t;
  if(!c&&t&&window.CSS&&CSS.supports&&CSS.supports("color",t)) c=t;
  return c?`<span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${esc(c)};border:1px solid #cfd4dc;margin-inline-end:5px;flex-shrink:0"></span>`:"";
}
function productVariants(p){   // ألوان المنتج زي ما بتظهر في صفحة المنتج: color1/color1_img ...
  if(!p) return [];
  return Object.keys(p).filter(k=>/^color\d+$/.test(k)).sort((a,b)=>parseInt(a.slice(5))-parseInt(b.slice(5)))
    .map(k=>({color:String(p[k]||"").trim(),img:p[k+"_img"]||""})).filter(v=>v.color);
}
function colorSwatchHtml(it,c){
  const v=productVariants(orderItemProduct(it)).find(x=>nrm(x.color)===nrm(c));
  if(v&&v.img) return `<img src="${esc(v.img)}" alt="" onerror="this.style.display='none'" style="width:18px;height:18px;border-radius:50%;object-fit:cover;border:1px solid #cfd4dc;margin-inline-end:5px;flex-shrink:0">`;
  return colorDot(c,it&&it.colorHex);
}
function itemColorChip(it){
  const c=itemColor(it); if(!c) return "";
  return `<span style="display:inline-flex;align-items:center;background:#f3f5f9;border:1px solid #e3e7ee;border-radius:20px;padding:1px 9px;font-size:11px;font-weight:700;margin-top:3px">${colorSwatchHtml(it,c)}${esc(c)}</span>`;
}
const COLOR_PALETTE=[["أحمر","#d62828"],["أزرق","#2563eb"],["أخضر","#16a34a"],["أصفر","#facc15"],["أسود","#111111"],["أبيض","#ffffff"],["رمادي","#8a8f98"],["بيج","#d8c3a5"],["بني","#7b4a2d"],["وردي","#f472b6"],["برتقالي","#f97316"],["بنفسجي","#7c3aed"],["كحلي","#1e2a5a"],["سماوي","#38bdf8"],["ذهبي","#c8a96e"],["فضي","#c0c4cc"]];
function nearestColorName(hex){
  const rgb=h=>{h=h.replace("#","");if(h.length===3)h=h.split("").map(c=>c+c).join("");return [0,2,4].map(i=>parseInt(h.slice(i,i+2),16));};
  const [r,g,b]=rgb(hex);let best=COLOR_PALETTE[0][0],bd=Infinity;
  COLOR_PALETTE.forEach(([n,h])=>{const [r2,g2,b2]=rgb(h);const d=(r-r2)**2+(g-g2)**2+(b-b2)**2;if(d<bd){bd=d;best=n;}});
  return best;
}
function setRowColor(row,name,hex){   // يحط اللون المختار في صف المنتج (الاسم + الدايرة + الكود)
  if(!row)return;
  row.querySelector('[data-f="color"]').value=name;
  row.querySelector('[data-f="colorHex"]').value=hex||"";
  row.querySelector("[data-cdot]").innerHTML=colorDot(name,hex);
  const pk=row.querySelector("[data-cpick]");if(pk&&/^#[0-9a-f]{6}$/i.test(hex||""))pk.value=hex;
}
// نسخة مختصرة للجداول: اسم المنتج بس، في سطر واحد (من غير صورة ولا لون ولا سعر)
function orderNamesCell(o){
  const its=Array.isArray(o.items)?o.items:[];
  if(!its.length) return `<span class="mut">—</span>`;
  return `<div style="display:flex;flex-direction:column;gap:4px;max-width:300px">${its.map(it=>`<div title="${esc(it.name||"")}" style="font-weight:700;font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(it.name||"—")}</div>`).join("")}</div>`;
}
function orderItemsCell(o){
  const its=Array.isArray(o.items)?o.items:[];
  if(!its.length) return `<span class="mut">—</span>`;
  return `<div style="display:flex;flex-direction:column;gap:8px;min-width:190px">${its.map(it=>`<div style="display:flex;align-items:center;gap:9px">${itemThumbHtml(it,44)}<div style="min-width:0"><div style="font-weight:700;font-size:12.5px;line-height:1.45">${esc(it.name||"—")}</div><span class="mut" style="font-size:11px">× ${fNum(parseInt(it.qty)||1)}${Number(it.price)?` · ${fNum(Number(it.price))} ج.م.`:""}</span>${itemColor(it)?`<br>${itemColorChip(it)}`:""}</div></div>`).join("")}</div>`;
}

// قراءة بيانات لكل العملاء (wallet / gameClaims): الأول من الجذر، ولو الـ Rules مانعة قراءة الجذر بنقرا حساب حساب (عشان الأرصدة ما تظهرش فاضية بالغلط)
async function readByUsers(path){
  const root=await read(path);
  if(root!==undefined)return root||{};
  console.warn(`${path}: قراءة الجذر مرفوضة — بقرا لكل عميل لوحده`);
  const out={};
  await Promise.all((D.users||[]).filter(u=>u.email).map(async u=>{
    const ek=eKey(u.email),v=await read(`${path}/${ek}`);
    if(v)out[ek]=v;
  }));
  return out;
}
const loadWallets=()=>readByUsers("wallet");
const loadGameClaims=()=>readByUsers("gameClaims");

async function read(path){try{const s=await get(ref(db,path));return s.exists()?s.val():null;}catch(e){console.error(path,e);return undefined;}}

async function loadAll(){
  $("view").innerHTML=`<div class="empty"><i class="fa-solid fa-spinner fa-spin"></i>جاري تحميل البيانات...</div>`;
  const [u,o,uo,c,a,an,cp]=await Promise.all(["users","orders","userOrders","comments","userAddresses","analytics","coupons"].map(read));
  if([u,o,uo,c,a,an].some(x=>x===undefined)) toast("⚠️ بعض البيانات ما اتحمّلتش — راجع Rules في Firebase");
  D.gameCfg=(await read("gameConfig"))||{};
  D.coupons=Object.entries(cp||{}).map(([key,v])=>({key,...v}));
  D.analytics=an||{};
  Object.keys(PH).forEach(k=>delete PH[k]);
  D.orderRoot=new Set(Object.keys(o||{}));

  D.users=Object.entries(u||{}).map(([key,v])=>({key,...v}));
  [D.wallet,D.gameClaims]=await Promise.all([loadWallets(),loadGameClaims()]);   // بعد تحميل الحسابات (ممكن نحتاجها للقراءة حساب حساب)

  const map={};
  Object.values(o||{}).forEach(x=>{if(x&&x.id)map[x.id]=x;});
  Object.values(uo||{}).forEach(g=>Object.values(g||{}).forEach(x=>{if(x&&x.id&&!map[x.id])map[x.id]=x;}));   // طلبات قديمة موجودة في userOrders بس
  D.uoPaths={};
  Object.entries(uo||{}).forEach(([ek,g])=>Object.entries(g||{}).forEach(([oid,x])=>{if(x&&x.id)(D.uoPaths[x.id]||(D.uoPaths[x.id]=[])).push([ek,oid]);}));
  const all=Object.values(map).filter(x=>x.code);
  D.orders=all.filter(x=>!x.cancelled).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));           // الطلبات الشغالة بس (الملغي مش بيتحسب في المبيعات)
  D.cancelled=all.filter(x=>x.cancelled).sort((a,b)=>(b.cancelledAt||0)-(a.cancelledAt||0));

  D.comments=[];
  Object.entries(c||{}).forEach(([itemId,g])=>Object.entries(g||{}).forEach(([id,x])=>{if(x)D.comments.push({itemId,id,...x});}));
  D.comments.sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));

  D.addr={};
  Object.entries(a||{}).forEach(([ek,g])=>{D.addr[ek]=Object.entries(g||{}).map(([id,x])=>({id,...x}));});

  refreshCounts();
  $("cntComments").textContent=fNum(D.comments.length);
  $("cntUsers").textContent=fNum(D.users.length);
  const ccp=$("cntCoupons");if(ccp)ccp.textContent=fNum(D.coupons.length);
  render();
  watchUsers();
}

const uName=u=>[u.firstName,u.lastName].filter(Boolean).join(" ")||u.name||u.email||"—";
const ordersOf=email=>D.orders.filter(o=>(o.email||"").toLowerCase()===String(email||"").toLowerCase());
// أكواد الخصم اللي عميل معين استخدمها فعلياً (من طلباته الشغالة) + عدد المرات + إجمالي الخصم اللي أخده
function couponUsageOf(email){
  const g={};
  ordersOf(email).forEach(o=>{
    if(!o.couponCode)return;
    const discount=Math.max(0,money(o.subtotal)-(gross(o)-money(o.shipping)-money(o.packaging)));
    const k=o.couponCode;
    const a=g[k]||(g[k]={code:k,count:0,discount:0});
    a.count++;a.discount+=discount;
  });
  return Object.values(g).sort((a,b)=>b.count-a.count);
}
const commentsOf=email=>D.comments.filter(c=>(c.userEmail||"").toLowerCase()===String(email||"").toLowerCase());
const phoneOf=u=>u.phone||u.phoneNumber||u.mobile||(D.addr[eKey(u.email||"")]||[]).find(a=>a.phone)?.phone||"";
const match=(txt)=>!q||String(txt).toLowerCase().includes(q.toLowerCase());
const emptyBox=(ic,t)=>`<div class="empty"><i class="fa-solid ${ic}"></i>${t}</div>`;

// ---------- المودال ----------
function openModal(title,html){$("mt").textContent=title;$("mbody").onclick=null;$("mbody").innerHTML=html;$("modal").classList.add("open");}
$("mx").onclick=()=>$("modal").classList.remove("open");
$("modal").addEventListener("click",e=>{if(e.target.id==="modal")$("modal").classList.remove("open");});

// ---------- صور البروفايل (بتتحمّل واحدة واحدة وبتتخزّن مؤقتاً) + التكبير بدوبل كليك ----------
const PH={},PHQ=new Set();   // PH: مفتاح الإيميل → رابط الصورة (أو null لو مفيش صورة)
function avaFor(email,name){
  const ek=eKey(email||""),v=PH[ek];
  if(!ek)return `<div class="ava">${initials(name)}</div>`;
  if(v)return `<div class="ava zoomable" data-pk="${esc(ek)}" title="اضغط مرتين للتكبير"><img src="${esc(v)}" alt=""></div>`;
  return `<div class="ava"${v===undefined?` data-ph="${esc(ek)}"`:""} data-pk="${esc(ek)}">${initials(name)}</div>`;
}
function avaHtml(u){ return avaFor(u.email,uName(u)); }

// ---------- 🟢 متصل الآن (بيتحدّث لحظياً من غير ريلود) ----------
// الموقع بيكتب users/<key>/presence/<tab> وهو مفتوح عند العميل المسجّل دخول، وبيتمسح لوحده لما يقفل الصفحة
(()=>{const st=document.createElement("style");st.textContent=".pw{position:relative;display:inline-flex;flex-shrink:0}.pdot{position:absolute;bottom:-1px;right:-1px;width:13px;height:13px;border-radius:50%;background:#00d27a;border:2px solid #fff;display:none;animation:pdotp 2s infinite}.pdot.on{display:block}@keyframes pdotp{0%{box-shadow:0 0 0 0 rgba(0,210,122,.55)}70%{box-shadow:0 0 0 7px rgba(0,210,122,0)}100%{box-shadow:0 0 0 0 rgba(0,210,122,0)}}";document.head.appendChild(st);})();
const PRES_STALE=4*60*1000;   // الموقع بيجدّد كل دقيقة؛ أقدم من ٤ دقايق = مش متصل
const isOnline=u=>{const now=Date.now()+(D.srvOff||0);return Object.values((u&&u.presence)||{}).some(p=>p&&(now-(Number(p.t)||0))<PRES_STALE);};
const avaP=(u,email,name)=>u?`<span class="pw">${avaFor(u.email,uName(u))}<i class="pdot" data-pd="${esc(u.key)}"></i></span>`:avaFor(email,name);
function refreshPresence(){
  const on={};D.users.forEach(u=>{on[u.key]=isOnline(u);});
  document.querySelectorAll("[data-pd]").forEach(el=>el.classList.toggle("on",!!on[el.dataset.pd]));
  document.querySelectorAll("[data-pt]").forEach(el=>{el.style.display=on[el.dataset.pt]?"inline-block":"none";});
  const c=$("onlineCnt");if(c)c.textContent=`🟢 متصل الآن: ${fNum(D.users.filter(u=>on[u.key]).length)}`;
}
let _uw=null;
function watchUsers(){   // متابعة حية لكل الحسابات: المتصلين + الإلغاء/الاسترجاع (حتى لو اتعمل من جهاز أدمن تاني)
  if(_uw)return;
  onValue(ref(db,".info/serverTimeOffset"),s=>{D.srvOff=Number(s.val())||0;refreshPresence();});
  _uw=onValue(ref(db,"users"),snap=>{
    const val=snap.val()||{};let changed=false;
    D.users.forEach(u=>{
      const v=val[u.key];if(!v)return;
      u.presence=v.presence||null;
      if(!!v.disabled!==!!u.disabled){
        changed=true;
        ["disabled","disabledReason","disabledAt"].forEach(k=>{if(v[k]===undefined)delete u[k];else u[k]=v[k];});
      }
    });
    if(changed&&["accounts","dashboard"].includes(view))render();else refreshPresence();
  },e=>{console.error(e);toast("⚠️ مش قادر أتابع المتصلين لحظياً — راجع Rules في Firebase");});
  setInterval(refreshPresence,30000);
}
function paintPhotos(){
  document.querySelectorAll(".ava[data-ph]").forEach(el=>{
    const v=PH[el.dataset.ph];
    if(v===undefined)return;
    el.removeAttribute("data-ph");
    if(v){const im=document.createElement("img");im.alt="";im.src=v;el.textContent="";el.appendChild(im);el.classList.add("zoomable");el.title="اضغط مرتين للتكبير";}
  });
}
async function hydratePhotos(){
  const keys=[...new Set([...document.querySelectorAll(".ava[data-ph]")].map(e=>e.dataset.ph))].filter(k=>k&&!(k in PH)&&!PHQ.has(k));
  keys.forEach(k=>PHQ.add(k));
  let i=0;
  await Promise.all(Array.from({length:4},async()=>{
    while(i<keys.length){
      const k=keys[i++],v=await read(`userPhotos/${k}`);
      PH[k]=(typeof v==="string"&&v)?v:null;PHQ.delete(k);paintPhotos();
    }
  }));
  paintPhotos();
}
function showLightbox(src){
  let lb=$("lb");
  if(!lb){lb=document.createElement("div");lb.id="lb";lb.innerHTML='<img alt="">';lb.onclick=()=>lb.classList.remove("open");document.body.appendChild(lb);}
  lb.querySelector("img").src=src;lb.classList.add("open");
}
document.addEventListener("dblclick",e=>{
  const el=e.target.closest&&e.target.closest(".zoomable");
  if(!el)return;
  const src=PH[el.dataset.pk]||el.querySelector("img")?.src;
  if(src)showLightbox(src);
});
document.addEventListener("keydown",e=>{
  if(e.key!=="Escape")return;
  $("lb")?.classList.remove("open");
  $("invModal")?.classList.remove("open");
  $("delModal")?.classList.remove("open");
});

// ---------- الفاتورة (نفس شكل فاتورة العميل) — معاينة + تنزيل صورة + طباعة ----------
const invMoney=n=>Number(n||0).toLocaleString("ar-EG")+" ج.م.";
const fFull=t=>t?new Date(t).toLocaleDateString("ar-EG",{weekday:"long",month:"long",day:"numeric"}):"—";

function invoiceHtml(o){
  const items=Array.isArray(o.items)?o.items:[];
  const rows=items.map((it,i)=>{
    const q=parseInt(it.qty)||1,pr=Number(it.price)||0;
    return `<tr>
      <td style="padding:10px 8px;border-bottom:1px solid #eee;text-align:center;color:#888">${(i+1).toLocaleString("ar-EG")}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #eee">${esc(it.name)}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #eee;text-align:center">${itemColor(it)?`<span style="display:inline-flex;align-items:center;justify-content:center;font-weight:700">${colorDot(itemColor(it),it.colorHex)}${esc(itemColor(it))}</span>`:"—"}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #eee;text-align:center">${q.toLocaleString("ar-EG")}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #eee;text-align:center">${pr?invMoney(pr):"—"}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #eee;text-align:center;font-weight:800">${pr?invMoney(pr*q):"—"}</td>
    </tr>`;
  }).join("");
  const totRow=(l,v,big)=>`<div style="display:flex;justify-content:space-between;padding:${big?"12px 0 0":"6px 0"};${big?"border-top:2px solid #111;margin-top:6px;font-size:18px;font-weight:800":"font-size:14px;color:#555"}"><span>${l}</span><span>${esc(v)}</span></div>`;
  return `<div dir="rtl" style="font-family:'Almarai','Cairo',sans-serif;color:#222;padding:44px 42px;background:#fff;box-sizing:border-box;width:794px">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #c8a96e;padding-bottom:20px">
      <div>
        <div style="font-size:30px;font-weight:800;color:#111">كشمير <span style="color:#c8a96e">هوم</span></div>
        <div style="font-size:12px;color:#777;margin-top:6px;line-height:1.8">القاهرة - 53 شارع الغورية<br>هاتف / واتساب: 01028604523<br>kashmirhome.00@gmail.com</div>
      </div>
      <div style="text-align:left">
        <div style="font-size:26px;font-weight:800;color:#111">فاتورة</div>
        <div style="font-size:13px;color:#555;margin-top:8px;line-height:1.9">رقم الفاتورة: <b style="font-family:monospace;letter-spacing:1px">${esc(o.code)}</b><br>تاريخ الطلب: ${esc(fDT(o.createdAt))}</div>
      </div>
    </div>
    <div style="display:flex;gap:20px;margin:26px 0">
      <div style="flex:1;background:#f7f8fa;border-radius:12px;padding:16px 18px">
        <div style="font-size:12px;color:#888;font-weight:700;margin-bottom:6px">بيانات المستلم</div>
        <div style="font-size:14px;font-weight:800">${esc(o.recipient)||"—"}</div>
        <div style="font-size:13px;color:#555;margin-top:4px;direction:ltr;text-align:right">${esc(o.phone)}</div>
        <div style="font-size:13px;color:#555;margin-top:4px">${esc(o.email)}</div>
      </div>
      <div style="flex:1;background:#f7f8fa;border-radius:12px;padding:16px 18px">
        <div style="font-size:12px;color:#888;font-weight:700;margin-bottom:6px">عنوان التوصيل ${o.addressType?"("+esc(o.addressType)+")":""}</div>
        <div style="font-size:13px;line-height:1.8">${esc(o.address)||"—"}</div>
        <div style="font-size:12px;color:#888;margin-top:8px">طريقة الدفع: <b style="color:#222">${esc(o.payment)||"—"}</b></div>
      </div>
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:13px">
      <thead><tr style="background:#111;color:#fff">
        <th style="padding:10px 8px;width:40px">#</th>
        <th style="padding:10px 8px;text-align:right">المنتج</th>
        <th style="padding:10px 8px;width:100px">اللون</th>
        <th style="padding:10px 8px;width:70px">الكمية</th>
        <th style="padding:10px 8px;width:120px">سعر الوحدة</th>
        <th style="padding:10px 8px;width:130px">الإجمالي</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div style="width:300px;margin:22px 0 0 auto">
      ${o.subtotal?totRow("المجموع الفرعي",o.subtotal):""}
      ${o.shipping?totRow("رسوم الشحن",o.shipping):""}
      ${o.packaging?totRow("رسوم التغليف",o.packaging):""}
      ${Number(o.walletUsed)>0?totRow("إجمالي الطلب",fMoney(gross(o)))+totRow("مدفوع من رصيد العميل","−"+fMoney(o.walletUsed)):""}
      ${totRow(Number(o.walletUsed)>0?"المطلوب دفعه":"الإجمالي المطلوب",o.total||"—",true)}
    </div>
    <div style="margin-top:30px;background:#fff8e1;border:1px solid #ffe082;border-radius:12px;padding:14px 18px;font-size:13px;line-height:1.9;color:#7c5e00">
      <b>أقصى مدة لاستلام الطلب: ${esc(fFull(o.deadline))}</b><br>
      يُرجى استلام الطلب خلال ٧ أيام من تاريخ الطلب، وذكر كود الطلب <b style="font-family:monospace">${esc(o.code)}</b> للمندوب عند الاستلام.
    </div>
    <div style="text-align:center;margin-top:34px;padding-top:16px;border-top:1px dashed #ddd;font-size:12px;color:#999">شكراً لتسوقك من كشمير هوم 💚 — kashmair.netlify.app</div>
  </div>`;
}

let _invO=null;
function ensureInvModal(){
  let m=$("invModal");
  if(m)return m;
  m=document.createElement("div");m.id="invModal";
  m.innerHTML=`<div class="inv-box">
    <div class="mh"><span><i class="fa-solid fa-file-invoice"></i> الفاتورة</span><button type="button" class="mx" id="invX">✕</button></div>
    <div class="inv-body" id="invBody"></div>
    <div class="inv-foot">
      <button type="button" class="btn solid" id="invDl"><i class="fa-solid fa-download"></i> تنزيل صورة</button>
      <button type="button" class="btn" id="invPr"><i class="fa-solid fa-print"></i> طباعة</button>
      <button type="button" class="btn" id="invCl">إغلاق</button>
    </div></div>`;
  document.body.appendChild(m);
  const close=()=>m.classList.remove("open");
  m.addEventListener("click",e=>{if(e.target===m)close();});
  $("invX").onclick=close;$("invCl").onclick=close;
  $("invDl").onclick=()=>downloadInvoicePng(_invO,$("invDl"));
  $("invPr").onclick=()=>printInvoice(_invO);
  return m;
}
function openInvoice(o){
  if(!o)return;
  _invO=o;
  const m=ensureInvModal(),body=$("invBody");
  body.innerHTML=`<div class="inv-scale"><div class="inv-paper">${invoiceHtml(o)}</div></div>`;
  m.classList.add("open");
  requestAnimationFrame(()=>{   // نصغّر الورقة (٧٩٤px) عشان تناسب الشاشة
    const w=body.querySelector(".inv-scale"),p=body.querySelector(".inv-paper");
    const sc=Math.min(1,(body.clientWidth-24)/794);
    p.style.transform=`scale(${sc})`;w.style.width=(794*sc)+"px";w.style.height=(p.offsetHeight*sc)+"px";
  });
}
function loadH2C(){
  if(window.html2canvas)return Promise.resolve();
  return new Promise((res,rej)=>{
    const s=document.createElement("script");
    s.src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
    s.onload=res;s.onerror=()=>rej(new Error("html2canvas"));
    document.head.appendChild(s);
  });
}
async function downloadInvoicePng(o,btn){
  if(!o)return;
  const old=btn.innerHTML;btn.disabled=true;btn.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> جاري التنزيل...';
  const wrap=document.createElement("div");
  wrap.style.cssText="position:fixed;top:0;left:-10000px;width:794px;background:#fff;pointer-events:none";
  wrap.innerHTML=invoiceHtml(o);
  document.body.appendChild(wrap);
  try{
    await loadH2C();
    if(document.fonts&&document.fonts.ready)await document.fonts.ready;
    const canvas=await window.html2canvas(wrap.firstElementChild,{scale:2,backgroundColor:"#ffffff",useCORS:true});
    const blob=await new Promise(r=>canvas.toBlob(r,"image/png"));
    if(!blob)throw new Error("toBlob failed");
    const url=URL.createObjectURL(blob),a=document.createElement("a");
    a.href=url;a.download=`kashmir-invoice-${o.code}.png`;
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),4000);
    toast("✅ تم تنزيل الفاتورة");
  }catch(e){console.error(e);toast("❌ تعذّر تنزيل الفاتورة — تأكد من الإنترنت وجرّب تاني");}
  finally{wrap.remove();btn.disabled=false;btn.innerHTML=old;}
}
function printInvoice(o){
  if(!o)return;
  const w=window.open("","_blank","width=900,height=1000");
  if(!w){toast("⚠️ المتصفح منع نافذة الطباعة — اسمح بالنوافذ المنبثقة");return;}
  w.document.write(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>فاتورة ${esc(o.code)}</title><link href="https://fonts.googleapis.com/css2?family=Almarai:wght@400;700;800&display=swap" rel="stylesheet"><style>body{margin:0;background:#fff}@page{size:A4;margin:0}</style></head><body>${invoiceHtml(o)}</body></html>`);
  w.document.close();
  let done=false;const go=()=>{if(done)return;done=true;w.focus();w.print();};
  w.addEventListener("load",()=>setTimeout(go,500));
  setTimeout(go,1800);
}

// ---------- الإحصائيات + الإيرادات: في ملف لوحده (admin-stats.js) ----------
const nrm=s=>String(s||"").replace(/\s+/g," ").trim().toLowerCase();
const ST_=initStats({D,$,esc,fNum,fDT,money,toast,ST,stepsDone,findProduct,emptyBox,match,render:()=>render(),loadH2C,isNegative,openModal,fb:{db,ref,update,remove}});
const{vStats,vRevenue,bestSellersRows,computeStats,statsTable,BEST_HEAD}=ST_;

// ---------- أكواد الخصم: في ملف لوحده (admin-coupons.js) ----------
const CP_=initCoupons({D,$,esc,fNum,toast,match,emptyBox,render:()=>render(),openModal,fb:{db,ref,update,remove}});
const{vCoupons}=CP_;

// ---------- حذف الطلب (بكتابة الكود) + قائمة الطلبات الملغية ----------
// الحذف هنا "إلغاء": الطلب بيتعلّم cancelled في Firebase (مش بيتمسح)، فيظهر للعميل رسالة الحذف وبيتنقل لقائمة الملغي.
const normCode=s=>String(s||"").replace(/\s+/g,"").toUpperCase();
function refreshCounts(){
  $("cntOrders").textContent=fNum(D.orders.length);
  const c=$("cntCancelled");if(c)c.textContent=fNum(D.cancelled.length);
}
let _delO=null;
function ensureDelModal(){
  let m=$("delModal");
  if(m)return m;
  m=document.createElement("div");m.id="delModal";
  m.innerHTML=`<div class="del-box">
    <div class="del-ico"><i class="fa-solid fa-trash-can"></i></div>
    <h4>حذف الطلب</h4>
    <p>هيظهر للعميل: <b>"تم حذف طلبيتك وسوف يتواصل معك أحد من خدمة العملاء"</b>، والطلب بيتنقل لقائمة الطلبات الملغية ومش بيتحسب في المبيعات.</p>
    <p>اكتب كود الطلب <span class="code" id="delCode"></span> عشان تأكد الحذف</p>
    <input id="delInput" class="inp" dir="ltr" autocomplete="off" spellcheck="false" placeholder="كود الطلب" style="width:100%;text-align:center;letter-spacing:1px">
    <div class="del-err" id="delErr"></div>
    <div class="del-btns"><button type="button" class="btn red" id="delOk" disabled><i class="fa-solid fa-trash-can"></i> تأكيد الحذف</button><button type="button" class="btn" id="delCancel">إلغاء</button></div>
  </div>`;
  document.body.appendChild(m);
  const close=()=>m.classList.remove("open");
  m.addEventListener("click",e=>{if(e.target===m)close();});
  $("delCancel").onclick=close;
  $("delInput").addEventListener("input",()=>{
    const ok=!!_delO&&normCode($("delInput").value)===normCode(_delO.code);
    $("delOk").disabled=!ok;
    $("delErr").textContent=($("delInput").value&&!ok)?"الكود مش مطابق":"";
  });
  $("delInput").addEventListener("keydown",e=>{if(e.key==="Enter"&&!$("delOk").disabled)$("delOk").click();});
  $("delOk").onclick=async()=>{
    if(!_delO||normCode($("delInput").value)!==normCode(_delO.code))return;
    $("delOk").disabled=true;
    const done=await cancelOrder(_delO);
    if(done){close();$("modal").classList.remove("open");}
    else $("delOk").disabled=false;
  };
  return m;
}
function askDeleteOrder(o){
  if(!o)return;
  _delO=o;
  const m=ensureDelModal();
  $("delCode").textContent=o.code;
  $("delInput").value="";$("delErr").textContent="";$("delOk").disabled=true;
  m.classList.add("open");
  setTimeout(()=>$("delInput").focus(),50);
}
async function cancelOrder(o){
  const ts=Date.now(),upd={};
  const put=base=>{upd[`${base}/cancelled`]=true;upd[`${base}/cancelledAt`]=ts;};
  if(D.orderRoot.has(o.id))put(`orders/${o.id}`);
  (D.uoPaths[o.id]||[]).forEach(([ek,oid])=>put(`userOrders/${ek}/${oid}`));
  if(!Object.keys(upd).length){toast("⚠️ مقدرتش ألاقي الطلب في قاعدة البيانات — حدّث البيانات وجرّب تاني");return false;}
  const refund=(Number(o.walletUsed)||0)>0&&!o.walletRefunded;
  if(refund){
    if(D.orderRoot.has(o.id))upd[`orders/${o.id}/walletRefunded`]=true;
    (D.uoPaths[o.id]||[]).forEach(([ek,oid])=>{upd[`userOrders/${ek}/${oid}/walletRefunded`]=true;});
  }
  try{
    await update(ref(db),upd);
    if(refund){
      try{await walletRefundOrder(o);o.walletRefunded=true;toast(`💰 اترجّع ${fMoney(o.walletUsed)} لرصيد العميل`);}
      catch(e){console.error(e);toast("⚠️ الطلب اتحذف بس فشل استرجاع الرصيد — ضيفه يدوي من بيانات العميل");}
    }
    o.cancelled=true;o.cancelledAt=ts;
    D.orders=D.orders.filter(x=>x.id!==o.id);
    D.cancelled=[o,...D.cancelled.filter(x=>x.id!==o.id)];
    refreshCounts();render();
    toast(`🗑️ تم حذف الطلب ${o.code} — ظهر في قائمة الملغي`);
    return true;
  }catch(e){console.error(e);toast("❌ فشل حذف الطلب");return false;}
}

function vCancelled(){
  const rows=D.cancelled.filter(o=>match([o.code,o.email,o.recipient,o.phone,o.address].join(" ")));
  const tr=rows.map(o=>{
    const ph=String(o.phone||"").replace(/\D/g,"");
    const wa=/^01[0125]\d{8}$/.test(ph)?`https://wa.me/20${ph.slice(1)}`:"";
    return `<tr class="click" data-corder="${esc(o.id)}">
      <td><span class="code">${esc(o.code)}</span></td>
      <td>${esc(o.recipient||"—")}<small class="mut" style="display:block">${esc(o.email)}</small></td>
      <td dir="ltr" style="text-align:right">${esc(o.phone)||"—"}</td>
      <td><b>${esc(o.total)||"—"}</b></td>
      <td>${fDT(o.createdAt)}</td>
      <td>${fDT(o.cancelledAt)}</td>
      <td style="white-space:nowrap"><button class="btn">تفاصيل</button>${wa?` <a class="btn" data-stop href="${wa}" target="_blank" rel="noopener" style="background:#dcf8ec;color:#00a15c"><i class="fa-brands fa-whatsapp"></i> واتساب</a>`:""}</td></tr>`;
  }).join("");
  return `<div class="card"><div class="card-h"><span>الطلبات الملغية (${fNum(rows.length)})</span></div>
    ${rows.length?`<div class="tw"><table><thead><tr><th>الكود</th><th>العميل</th><th>الهاتف</th><th>الإجمالي</th><th>تاريخ الطلب</th><th>تاريخ الحذف</th><th></th></tr></thead><tbody>${tr}</tbody></table></div>`:emptyBox("fa-ban","مفيش طلبات ملغية")}</div>`;
}
function cancelledDetail(o){
  const items=(Array.isArray(o.items)?o.items:[]).map(it=>`<div class="mini" style="display:flex;align-items:center;gap:9px">${itemThumbHtml(it,40)}<span>${esc(it.name)} <span class="mut">× ${fNum(parseInt(it.qty)||1)}</span> ${itemColorChip(it)}${Number(it.price)?` — <b>${fNum(Number(it.price))} ج.م.</b>`:""}</span></div>`).join("")||`<div class="mut">مفيش منتجات</div>`;
  openModal(`طلب ملغي ${o.code}`,`
    <div class="kv">
      <div><div class="k">الحالة</div><div class="vv"><span class="badge" style="background:#fde8ec;color:var(--err)">ملغي</span></div></div>
      <div><div class="k">تاريخ الطلب</div><div class="vv">${fDT(o.createdAt)}</div></div>
      <div><div class="k">تاريخ الحذف</div><div class="vv">${fDT(o.cancelledAt)}</div></div>
      <div><div class="k">المستلم</div><div class="vv">${esc(o.recipient)||"—"}</div></div>
      <div><div class="k">الهاتف</div><div class="vv" dir="ltr" style="text-align:right">${esc(o.phone)||"—"}</div></div>
      <div><div class="k">البريد</div><div class="vv">${esc(o.email)||"—"}</div></div>
      <div><div class="k">العنوان</div><div class="vv">${esc(o.address)||"—"}</div></div>
      <div><div class="k">طريقة الدفع</div><div class="vv">${esc(o.payment)||"—"}</div></div>
      <div><div class="k">الإجمالي</div><div class="vv">${esc(o.total)||"—"}</div></div>
      ${Number(o.walletUsed)>0?`<div><div class="k">مدفوع من الرصيد</div><div class="vv">${fMoney(o.walletUsed)}${o.walletRefunded?" (اترجّع)":""}</div></div>`:""}
    </div>
    <div class="sub-t"><i class="fa-solid fa-bag-shopping"></i> المنتجات</div>${items}
    <div style="margin-top:16px"><button type="button" class="btn" id="cUserBtn"><i class="fa-solid fa-user"></i> بيانات العميل كاملة</button></div>`);
  $("cUserBtn").onclick=()=>{
    const u=D.users.find(x=>lc(x.email)===lc(o.email));
    if(u)userDetail(u);else toast("⚠️ مفيش حساب مسجّل مرتبط بالبريد ده");
  };
}

// ---------- الأقسام ----------
function render(){
  document.querySelectorAll(".nv[data-view]").forEach(b=>b.classList.toggle("active",b.dataset.view===view));
  const fn={dashboard:vDash,orders:vOrders,cancelled:vCancelled,comments:vComments,accounts:vAccounts,analytics:vStats,revenue:vRevenue,coupons:vCoupons,wallets:vWallets}[view];
  $("view").innerHTML=fn();
  bind();
  refreshPresence();
}

function vDash(){
  const sales=D.orders.reduce((s,o)=>s+gross(o),0);
  const days=[];for(let i=6;i>=0;i--){const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-i);days.push(d.getTime());}
  const counts=days.map(t=>D.orders.filter(o=>o.createdAt>=t&&o.createdAt<t+864e5).length);
  const mx=Math.max(1,...counts);
  const bars=days.map((t,i)=>`<div class="bar"><b>${fNum(counts[i])}</b><div style="height:${Math.max(3,counts[i]/mx*100)}%"></div><span>${new Date(t).toLocaleDateString("ar-EG",{weekday:"short"})}</span></div>`).join("");
  const rec=D.orders.slice(0,6).map(o=>`<tr class="click" data-order="${esc(o.id)}"><td><span class="code">${esc(o.code)}</span></td><td>${esc(o.recipient||o.email)}</td><td>${orderNamesCell(o)}</td><td>${esc(o.total)||"—"}</td><td>${badge(o)}</td></tr>`).join("");
  const bs=bestSellersRows(computeStats().P,5);
  const cm=D.comments.slice(0,5).map(c=>{const neg=isNegative(c);return `<div class="list-i"${neg?' style="background:#fff5f6"':""}>${avaFor(c.userEmail,c.userName)}<div style="flex:1"><div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"><b>${esc(c.userName||"مستخدم")}</b> <span class="stars">${"★".repeat(c.rating||0)}</span>${neg?' <span style="color:var(--err);font-weight:800;font-size:11px">⚠️ سلبي</span>':""}</div><p style="margin:4px 0 0${neg?';color:#c81e37;font-weight:700':""}">${esc(c.text)}</p></div></div>`;}).join("");
  return `<div class="grid g4" style="margin-bottom:20px">
    <div class="card stat"><div class="l">العملاء <i class="i-b fa-solid fa-users"></i></div><div class="v">${fNum(D.users.length)}</div></div>
    <div class="card stat"><div class="l">الطلبات <i class="i-o fa-solid fa-box-open"></i></div><div class="v">${fNum(D.orders.length)}</div></div>
    <div class="card stat"><div class="l">إجمالي المبيعات <i class="i-g fa-solid fa-sack-dollar"></i></div><div class="v">${fNum(sales)} <small style="font-size:14px">ج.م.</small></div></div>
    <div class="card stat"><div class="l">التعليقات <i class="i-p fa-solid fa-comments"></i></div><div class="v">${fNum(D.comments.length)}</div></div>
  </div>
  <div class="grid g21" style="margin-bottom:20px">
    <div class="card"><div class="card-h">أحدث الطلبات</div>${D.orders.length?`<div class="tw"><table><thead><tr><th>الكود</th><th>العميل</th><th>المنتجات</th><th>الإجمالي</th><th>الحالة</th></tr></thead><tbody>${rec}</tbody></table></div>`:emptyBox("fa-box-open","مفيش طلبات لسه")}</div>
    <div class="card"><div class="card-h">الطلبات آخر ٧ أيام</div><div class="card-b"><div class="bars">${bars}</div></div></div>
  </div>
  <div class="card" style="margin-bottom:20px"><div class="card-h"><span>أكثر المنتجات مبيعاً</span><button class="btn" data-goto="analytics">كل الإحصائيات</button></div>${statsTable(BEST_HEAD,bs,"مفيش مبيعات لسه")}</div>
  <div class="card"><div class="card-h">أحدث التعليقات</div>${cm||emptyBox("fa-comments","مفيش تعليقات لسه")}</div>`;
}

// ---------- فلتر التاريخ في الطلبات ----------
const ymd=t=>{const d=new Date(t);return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");};
function orderDateRange(){
  let d1=window._od1?new Date(window._od1+"T00:00:00").getTime():0;
  let d2=window._od2?new Date(window._od2+"T23:59:59.999").getTime():Infinity;
  if(d1>d2)[d1,d2]=[d2,d1];   // لو اتحطوا بالعكس نبدّلهم
  return [d1,d2];
}
function vOrders(){
  const f=window._of||"all";
  const [d1,d2]=orderDateRange();
  const dateOn=!!(window._od1||window._od2);
  const rows=D.orders.filter(o=>(f==="all"||String(stepsDone(o))===f)&&(o.createdAt||0)>=d1&&(o.createdAt||0)<=d2&&match([o.code,o.email,o.recipient,o.phone,o.address,o.couponCode,...(Array.isArray(o.items)?o.items.map(i=>i&&i.name):[])].join(" ")));
  const sum=rows.reduce((t,o)=>t+gross(o),0);
  // أكواد الخصم المستخدمة في الطلبات المعروضة (بتتأثر بفلتر التاريخ والحالة والبحث) + عدد الطلبات على كل كود
  const cpUse={};
  rows.forEach(o=>{if(!o.couponCode)return;const k=String(o.couponCode).trim().toUpperCase();const a=cpUse[k]||(cpUse[k]={count:0,total:0});a.count++;a.total+=gross(o);});
  const cpList=Object.entries(cpUse).sort((a,b)=>b[1].count-a[1].count);
  const cpOrders=cpList.reduce((t,[,a])=>t+a.count,0);
  const cpBox=cpList.length?`<div class="card" style="margin-bottom:16px"><div class="card-h"><span><i class="fa-solid fa-tag" style="color:var(--pri)"></i> أكواد الخصم المستخدمة</span><small class="mut" style="font-weight:600">${fNum(cpOrders)} طلب من ${fNum(rows.length)} استخدموا كود خصم</small></div>
    <div class="card-b" style="display:flex;flex-wrap:wrap;gap:10px">${cpList.map(([k,a])=>`<div style="display:flex;align-items:center;gap:8px;background:var(--bg2,#f3f3f6);padding:8px 12px;border-radius:10px"><span class="code">${esc(k)}</span><b>${fNum(a.count)}</b><span class="mut" style="font-size:12px">${a.count>2&&a.count<=10?"طلبات":"طلب"}</span></div>`).join("")}</div></div>`:"";
  const tr=rows.map(o=>`<tr class="click" data-order="${esc(o.id)}">
    <td><span class="code">${esc(o.code)}</span></td>
    <td>${esc(o.recipient||"—")}<small class="mut" style="display:block">${esc(o.email)}</small></td>
    <td>${orderNamesCell(o)}</td>
    <td>${fDT(o.createdAt)}</td><td><b>${esc(o.total)||"—"}</b><div style="margin-top:6px">${piecesBadge(o)}</div>${o.couponCode?`<div style="margin-top:6px"><span class="code" title="كود الخصم المستخدم">${esc(String(o.couponCode).toUpperCase())}</span></div>`:""}</td><td>${esc(o.payment)||"—"}</td><td>${badge(o)}</td>
    <td style="white-space:nowrap"><button class="btn">تفاصيل</button> <button class="btn" data-editord="${esc(o.id)}" title="تعديل الطلب"><i class="fa-solid fa-pen"></i> تعديل</button> <button class="btn" data-inv="${esc(o.id)}" title="الفاتورة"><i class="fa-solid fa-file-invoice"></i> فاتورة</button> <button class="btn red" data-del="${esc(o.id)}" title="حذف الطلب"><i class="fa-solid fa-trash-can"></i></button></td></tr>`).join("");
  const pre=(k,l)=>`<button type="button" class="btn" data-odp="${k}">${l}</button>`;
  return `${cpBox}<div class="card"><div class="card-h" style="flex-wrap:wrap;gap:10px"><span>الطلبات (${fNum(rows.length)})${dateOn&&rows.length?` <small class="mut" style="font-weight:600">· إجمالي ${invMoney(sum)}</small>`:""}</span>
    <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
      <span class="mut" style="font-size:12px;font-weight:700">من</span><input type="date" class="inp" id="od1" value="${esc(window._od1||"")}" style="width:auto">
      <span class="mut" style="font-size:12px;font-weight:700">إلى</span><input type="date" class="inp" id="od2" value="${esc(window._od2||"")}" style="width:auto">
      ${pre("today","اليوم")}${pre("7","آخر ٧ أيام")}${pre("30","آخر ٣٠ يوم")}${dateOn?`<button type="button" class="btn red" data-odp="clear"><i class="fa-solid fa-xmark"></i> مسح التاريخ</button>`:""}
      <select class="sel" id="ofilter"><option value="all">كل الحالات</option>${ST.map((s,i)=>`<option value="${i}"${f===String(i)?" selected":""}>${s}</option>`).join("")}</select>
    </div></div>
    ${rows.length?`<div class="tw"><table><thead><tr><th>الكود</th><th>العميل</th><th>المنتجات</th><th>التاريخ</th><th>الإجمالي</th><th>الدفع</th><th>الحالة</th><th></th></tr></thead><tbody>${tr}</tbody></table></div>`:emptyBox("fa-box-open",dateOn?"مفيش طلبات في الفترة دي":"مفيش طلبات")}</div>`;
}

function vComments(){
  const cf=window._cf||"all";
  const cs=window._cs||"date";
  const sel=window._csel||(window._csel=new Set());
  const selMode=sel.size>0;   // وضع التحديد: مفعّل بس لما يبقى فيه تعليق محدد (بيتفتح بالضغطة المطوّلة)
  const CF_OPTS=[["all","كل التعليقات"],["positive","👍 إيجابي"],["negative","👎 سلبي"],["5","⭐ ٥ نجوم"],["4","⭐ ٤ نجوم"],["3","⭐ ٣ نجوم"],["2","⭐ ٢ نجوم"],["1","⭐ ١ نجمة"]];
  const CS_OPTS=[["date","الأحدث أولاً"],["top","🔥 الأكثر تفاعلاً"]];
  const passCF=c=>{
    if(cf==="positive") return !isNegative(c);
    if(cf==="negative") return isNegative(c);
    if(["1","2","3","4","5"].includes(cf)) return (c.rating||0)===parseInt(cf);
    return true;
  };
  const inter=c=>(parseInt(c.likes)||0)+(parseInt(c.dislikes)||0);
  const rows=D.comments.filter(c=>match([c.userName,c.userEmail,c.text,c.itemId].join(" "))&&passCF(c));
  if(cs==="top") rows.sort((a,b)=>inter(b)-inter(a)||(b.createdAt||0)-(a.createdAt||0));
  const negCount=rows.filter(isNegative).length;
  const ckey=c=>`${c.itemId}|${c.id}`;
  const allChecked=rows.length>0&&rows.every(c=>sel.has(ckey(c)));
  const tr=rows.map(c=>{
    const neg=isNegative(c);
    const k=ckey(c);
    const on=sel.has(k);
    const bg=on?"background:#e3edff":neg?"background:#fff2f3":"";
    return `<tr class="click" data-comment="${esc(c.itemId)}|${esc(c.id)}"${bg?` style="${bg}"`:""}>
    ${selMode?`<td><input type="checkbox" class="csel" data-csel="${esc(k)}"${on?" checked":""}></td>`:""}
    <td><div class="usr">${avaFor(c.userEmail,c.userName)}<div>${esc(c.userName||"مستخدم")}<small>${esc(c.userEmail||"")}</small></div></div></td>
    <td>${productChip(c.itemId)}</td>
    <td><span class="stars">${"★".repeat(c.rating||0)}${"☆".repeat(5-(c.rating||0))}</span>${neg?' <br><span class="badge" style="background:#fde8ec;color:var(--err)">⚠️ سلبي</span>':""}</td>
    <td style="max-width:320px;line-height:1.7${neg?';color:#c81e37;font-weight:700':""}">${esc(c.text)}</td>
    <td>${fDate(c.createdAt)}</td>
    <td>👍 ${fNum(c.likes)} · 👎 ${fNum(c.dislikes)}</td>
    <td><button class="btn" data-comment="${esc(c.itemId)}|${esc(c.id)}"><i class="fa-solid fa-pen"></i> تعديل</button></td></tr>`;
  }).join("");
  const prodWarn=!D.productsLoaded?`<div class="note" style="background:#fde8ec;border-color:#f3b8c4;color:#c81e37;margin-bottom:16px"><i class="fa-solid fa-triangle-exclamation"></i> ملف المنتجات (<code>products-furniturre.json</code>) مش راضي يتحمّل، عشان كده صور المنتجات مش ظاهرة هنا. المسارات اللي اتجرّبت: <code>${esc(D.productsTried.join(" | "))}</code></div>`:"";
  const bulkBar=sel.size?`<div class="note" style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:16px">
      <span><b>${fNum(sel.size)}</b> تعليق متحدد</span>
      <button class="btn red" id="delSelBtn"><i class="fa-solid fa-trash-can"></i> حذف المحدد (${fNum(sel.size)})</button>
      <button class="btn" id="clearSelBtn">إلغاء التحديد</button>
    </div>`:"";
  return `${prodWarn}${bulkBar}<div class="card"><div class="card-h"><span>التعليقات (${fNum(rows.length)})</span>
    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
      ${negCount?`<span class="badge" style="background:#fde8ec;color:var(--err)">⚠️ ${fNum(negCount)} سلبي محتاج متابعة</span>`:""}
      <select class="sel" id="csort">${CS_OPTS.map(([v,l])=>`<option value="${v}"${cs===v?" selected":""}>${l}</option>`).join("")}</select>
      <select class="sel" id="cfilter">${CF_OPTS.map(([v,l])=>`<option value="${v}"${cf===v?" selected":""}>${l}</option>`).join("")}</select>
    </div></div>
    ${rows.length?`<div class="tw"><table><thead><tr>${selMode?`<th><input type="checkbox" id="cselAll"${allChecked?" checked":""}></th>`:""}<th>العميل</th><th>المنتج</th><th>التقييم</th><th>التعليق</th><th>التاريخ</th><th>التفاعل</th><th></th></tr></thead><tbody>${tr}</tbody></table></div>`:emptyBox("fa-comments","مفيش تعليقات بالفلتر ده")}</div>`;
}

// ---------- الحسابات: تبويبات (كل الحسابات / الملغية / الأكثر شراءً / الأكثر إلغاءً للطلبات / الأكثر تعليقاً) ----------
const isDisabled=u=>!!(u&&u.disabled);
const AC_TABS=[["all","كل الحسابات"],["cancelled","🚫 الحسابات الملغية"],["buyers","🛒 الأكثر شراءً"],["cancels","❌ الأكثر إلغاءً للطلبات"],["commenters","💬 الأكثر تعليقاً"]];
const TOP_N=20;
const CANC_BADGE=' <span class="badge" style="background:#fde8ec;color:var(--err)">🚫 ملغي</span>';

// إلغاء الحساب بسبب (بيظهر للعميل في رسالة حمراء لما يفتح الموقع) / إعادة التفعيل
async function cancelAccount(u,reason){
  const upd={disabled:true,disabledReason:reason,disabledAt:Date.now()};
  const multi={};
  Object.entries(upd).forEach(([k,v])=>multi[`users/${u.key}/${k}`]=v);
  multi[`users/${u.key}/presence`]=null;   // يبقى غير متصل فوراً
  if(u.email)multi[`sessions/${eKey(u.email)}`]=null;   // يطلّعه من كل أجهزته — وأول ما يفتح الموقع يشوف الرسالة الحمراء بالسبب
  await update(ref(db),multi);
  Object.assign(u,upd);
}
async function reactivateAccount(u){
  await update(ref(db,`users/${u.key}`),{disabled:null,disabledReason:null,disabledAt:null});
  delete u.disabled;delete u.disabledReason;delete u.disabledAt;
}

function vAccounts(){
  const ac=window._ac||"all",cn=D.users.filter(isDisabled).length;
  const tabs=`<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:16px"><div class="seg" style="flex-wrap:wrap">${AC_TABS.map(([k,l])=>`<button type="button" data-ac="${k}" class="${ac===k?"on":""}">${l}${k==="cancelled"&&cn?` (${fNum(cn)})`:""}</button>`).join("")}</div><span class="badge" id="onlineCnt" style="background:#dcf8ec;color:#00a15c;font-size:12.5px">🟢 متصل الآن: ${fNum(D.users.filter(isOnline).length)}</span></div>`;
  if(ac==="cancelled")return tabs+cancelledAccountsView();
  if(ac==="buyers"||ac==="cancels"||ac==="commenters")return tabs+rankView(ac);
  const rows=D.users.filter(u=>match([uName(u),u.email,phoneOf(u)].join(" ")));
  const tr=rows.map(u=>`<tr class="click" data-user="${esc(u.key)}"${isDisabled(u)?' style="background:#fff5f6"':""}>
    <td><div class="usr">${avaP(u)}<div>${esc(uName(u))}${isDisabled(u)?CANC_BADGE:""}<small>${esc(u.email)}</small></div></div></td>
    <td dir="ltr" style="text-align:right">${esc(phoneOf(u))||"—"}</td>
    <td>${u.gender==="male"||u.gender==="ذكر"?"ذكر":u.gender==="female"||u.gender==="أنثى"?"أنثى":esc(u.gender)||"—"}</td>
    <td>${fNum(ordersOf(u.email).length)}</td><td>${fNum(commentsOf(u.email).length)}</td><td>${fNum((D.addr[eKey(u.email||"")]||[]).length)}</td>
    <td><button class="btn">كل البيانات</button></td></tr>`).join("");
  return `${tabs}<div class="card"><div class="card-h">الحسابات (${fNum(rows.length)})</div>
    ${rows.length?`<div class="tw"><table><thead><tr><th>العميل</th><th>الهاتف</th><th>النوع</th><th>الطلبات</th><th>التعليقات</th><th>العناوين</th><th></th></tr></thead><tbody>${tr}</tbody></table></div>`:emptyBox("fa-users","مفيش حسابات")}</div>`;
}

// ---------- 💰 قسم الأرصدة (4 تبويبات بسيطة) ----------
function vWallets(){
  const W=D.wallet||{};
  const tab=window._wt||"add";
  const byEk={};D.users.forEach(u=>{if(u.email)byEk[eKey(u.email)]=u;});
  const nameOf=ek=>{const u=byEk[ek];return u?uName(u):ek.replace(/__/g,"@").replace(/_/g,".");};
  const ents=Object.entries(W).map(([ek,w])=>({ek,u:byEk[ek],bal:Math.max(0,Number(w&&w.balance)||0),log:Object.entries((w&&w.log)||{}).map(([id,v])=>({id,ek,...v}))}));
  const all=ents.flatMap(x=>x.log);
  const sum=t=>all.filter(x=>x.type===t&&!x.deleted).reduce((n,x)=>n+(Number(x.amount)||0),0);
  const stat=(l,v,c)=>`<div class="mini" style="flex:1;min-width:150px"><div class="mut" style="font-size:12px">${l}</div><div style="font-size:19px;font-weight:800;color:${c||"inherit"}">${v}</div></div>`;
  const stats=`<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px">${stat("إجمالي الأرصدة عند العملاء",fMoney(ents.reduce((t,x)=>t+x.bal,0)),"#00a15c")}${stat("إجمالي اللي ضفته",fMoney(sum("credit")))}${stat("إجمالي اللي صرفوه",fMoney(sum("debit")),"#c81e37")}${stat("عملاء ليهم رصيد",fNum(ents.filter(x=>x.bal>0).length))}</div>`;
  const pend=Object.entries(D.gameClaims||{}).flatMap(([ek,g])=>Object.entries(g||{}).filter(([,c])=>c&&c.status==="pending").map(([lv,c])=>({ek,lv,...c}))).sort((a,b)=>(b.at||0)-(a.at||0));
  const tabs=[["add","➕ إضافة رصيد"],["customers","👥 أرصدة العملاء"],["log","🧾 سجل الحركات"],["game","🎮 اللعبة والجوائز"]];
  const bar=`<div class="seg" style="flex-wrap:wrap;margin-bottom:16px">${tabs.map(([k,l])=>`<button type="button" data-wt="${k}" class="${tab===k?"on":""}">${l}${k==="game"&&pend.length?` <span class="badge" style="background:#fde8ec;color:var(--err)">${fNum(pend.length)}</span>`:""}</button>`).join("")}</div>`;

  let body="";
  if(tab==="add"){
    const opts=D.users.filter(u=>u.email).map(u=>`<option value="${esc(u.email)}">${esc(uName(u))}</option>`).join("");
    body=`<div class="card"><div class="card-h"><span>إضافة رصيد لعميل — ٣ خطوات</span></div>
      <div style="padding:16px 18px;display:grid;gap:14px;max-width:560px">
        <div><div class="k">١) العميل (اكتب البريد أو اختاره)</div>
          <input class="inp" id="wqEmail" list="wqUsers" placeholder="example@gmail.com" dir="ltr" style="width:100%">
          <datalist id="wqUsers">${opts}</datalist>
          <div id="wqInfo" class="mut" style="font-size:12.5px;margin-top:5px;min-height:18px"></div></div>
        <div><div class="k">٢) المبلغ (ج.م.)</div>
          <input class="inp" id="wqAmt" type="number" min="0" step="0.01" inputmode="decimal" placeholder="مثال: 100" style="width:100%">
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">${[50,100,200,500,1000].map(n=>`<button type="button" class="btn" data-wq="${n}">${n}</button>`).join("")}</div></div>
        <div><div class="k">٣) ملاحظة (اختياري — العميل هيشوفها)</div>
          <input class="inp" id="wqNote" maxlength="120" placeholder="مثال: هدية / تعويض" style="width:100%"></div>
        <button type="button" class="btn solid" id="wqAdd" style="padding:12px;font-size:15px"><i class="fa-solid fa-plus"></i> إضافة للرصيد</button>
      </div></div>`;
  }
  else if(tab==="customers"){
    const rows=ents.filter(x=>match([nameOf(x.ek),x.u&&x.u.email].join(" "))).sort((a,b)=>b.bal-a.bal);
    const tr=rows.map(x=>{
      const cin=x.log.filter(l=>l.type==="credit"&&!l.deleted).reduce((n,l)=>n+(Number(l.amount)||0),0),out=x.log.filter(l=>l.type==="debit"&&!l.deleted).reduce((n,l)=>n+(Number(l.amount)||0),0);
      return `<tr${x.u?` class="click" data-user="${esc(x.u.key)}"`:""}><td><b>${esc(nameOf(x.ek))}</b><small class="mut" style="display:block">${esc(x.u?x.u.email:"")}</small></td><td><b style="color:#00a15c">${fMoney(x.bal)}</b></td><td>${fMoney(cin)}</td><td>${fMoney(out)}</td><td><button class="btn">فتح / خصم</button></td></tr>`;
    }).join("");
    body=`<div class="card"><div class="card-h"><span>أرصدة العملاء (${fNum(rows.length)})</span></div>
      ${rows.length?`<div class="tw"><table><thead><tr><th>العميل</th><th>الرصيد الحالي</th><th>إجمالي المضاف</th><th>إجمالي المصروف</th><th></th></tr></thead><tbody>${tr}</tbody></table></div>`:emptyBox("fa-wallet","لسه ما ضفتش رصيد لأي عميل")}
      <div class="hint">اضغط على أي عميل تفتح بياناته وتخصم منه يدوي أو تشوف كل حركاته. للبحث اكتب في خانة البحث فوق.</div></div>`;
  }
  else if(tab==="log"){
    const lg=all.filter(x=>match([nameOf(x.ek),x.note,x.desc,x.orderCode].join(" "))).sort((a,b)=>(b.at||0)-(a.at||0)).slice(0,150);
    const T={credit:["➕ إضافة رصيد","#00a15c","+"],refund:["↩️ استرجاع","#00a15c","+"],debit:["🛒 صرف في طلب","#c81e37","−"],deduct:["➖ خصم يدوي","#c81e37","−"]};
    const ltr=lg.map(x=>{const m=T[x.type]||["•","#555",""];const editable=(x.type==="credit"||x.type==="deduct")&&!x.deleted;return `<tr${x.deleted?' style="opacity:.55"':""}><td>${fDT(x.at)}</td><td>${esc(nameOf(x.ek))}</td><td>${m[0]}${x.deleted?" 🗑️ محذوفة":""}</td><td><b style="color:${m[1]};${x.deleted?"text-decoration:line-through":""}">${m[2]}${fMoney(x.amount)}</b></td><td style="max-width:380px;line-height:1.7">${x.type==="debit"?`<span class="code">${esc(x.orderCode||"")}</span> ${esc(x.desc||"")}`:esc(x.note||"")+(x.orderCode?` <span class="code">${esc(x.orderCode)}</span>`:"")}${walletEditsHtml(x)}</td><td>${editable?`<button class="btn" data-wle="${esc(x.ek)}|${esc(x.id)}"><i class="fa-solid fa-pen"></i> تعديل / حذف</button>`:""}</td></tr>`;}).join("");
    body=`<div class="card"><div class="card-h"><span>سجل كل الحركات — إضافة وصرف (آخر ${fNum(lg.length)})</span></div>
      ${lg.length?`<div class="tw"><table><thead><tr><th>التاريخ</th><th>العميل</th><th>النوع</th><th>المبلغ</th><th>التفاصيل (صرفه في إيه)</th><th></th></tr></thead><tbody>${ltr}</tbody></table></div>`:emptyBox("fa-clock-rotate-left","مفيش حركات لسه")}</div>`;
  }
  else{
    const gc=D.gameCfg||{},gl=gc.levels||{},gt=gc.times||{};
    const pendTr=pend.map(c=>`<tr><td>${fDT(c.at)}</td><td>${esc(nameOf(c.ek))}</td><td>المستوى ${esc(c.lv)}</td><td><b>${fMoney(c.amount)}</b></td><td style="white-space:nowrap"><button class="btn solid" data-gcok="${esc(c.ek)}|${esc(c.lv)}">موافقة وإضافة</button> <button class="btn red" data-gcno="${esc(c.ek)}|${esc(c.lv)}">رفض</button></td></tr>`).join("");
    const gamePaid=Object.values(D.gameClaims||{}).flatMap(g=>Object.values(g||{})).filter(c=>c&&c.status==="paid").reduce((t,c)=>t+(Number(c.amount)||0),0);
    const lvRows=Array.from({length:10},(_,i)=>i+1).map(lv=>`<tr>
      <td><b>المستوى ${lv}</b>${lv===10?" 🔥 (المستحيل)":""}</td>
      <td>${lv<10?`<input class="inp" data-gt="${lv}" type="number" min="0" step="0.5" inputmode="decimal" placeholder="تلقائي" style="width:110px" value="${Number(gt[lv])>0?+(Number(gt[lv])/60).toFixed(2):""}"> <span class="mut">دقيقة</span>`:`<span class="mut">مفتوح للآخر</span>`}</td>
      <td>${lv>1?`<input class="inp" data-gl="${lv}" type="number" min="0" step="0.01" inputmode="decimal" placeholder="بدون" style="width:110px" value="${Number(gl[lv])>0?Number(gl[lv]):""}"> <span class="mut">ج.م.</span>`:`<span class="mut">—</span>`}</td></tr>`).join("");
    body=`${pend.length?`<div class="card" style="border:2px solid #f3b8c4"><div class="card-h"><span>⏳ جوائز بانتظار موافقتك (${fNum(pend.length)})</span></div><div class="tw"><table><thead><tr><th>التاريخ</th><th>العميل</th><th>المستوى</th><th>المبلغ</th><th></th></tr></thead><tbody>${pendTr}</tbody></table></div></div>`:""}
      <div class="card"><div class="card-h"><span>🎮 إعدادات لعبة Gravity Surge</span><a class="btn" href="../game.html" target="_blank" rel="noopener" data-stop>فتح اللعبة</a></div>
      <div style="padding:14px 18px">
        <label style="display:flex;align-items:center;gap:8px;font-weight:800;cursor:pointer;margin-bottom:10px;padding:10px 12px;background:#eef6ff;border-radius:10px"><input type="checkbox" id="gcVisible"${gc.visible?" checked":""}> 👁️ إظهار اللعبة للعملاء <span class="mut" style="font-weight:400">(لو مقفول: زرار اللعبة بيختفي من حساب العميل واللعبة نفسها مابتفتحش)</span></label>
        <label style="display:flex;align-items:center;gap:8px;font-weight:800;cursor:pointer"><input type="checkbox" id="gcEnabled"${gc.enabled?" checked":""}> تفعيل الجوائز <span class="mut" style="font-weight:400">(لو مقفول اللعبة بتشتغل من غير فلوس)</span></label>
        <label style="display:flex;align-items:center;gap:8px;font-weight:700;margin-top:8px;cursor:pointer"><input type="checkbox" id="gcApproval"${gc.approval?" checked":""}> الجوائز لازم أوافق عليها الأول <span class="mut" style="font-weight:400">(مش بتتضاف أوتوماتيك)</span></label>
      </div>
      <div class="sub-t" style="padding:0 18px">المستويات: مدة كل مستوى + جايزته</div>
      <div class="tw"><table><thead><tr><th>المستوى</th><th>مدة المستوى بالدقايق — بعدها يدخل اللي بعده</th><th>الجائزة عند الوصول ليه</th></tr></thead><tbody>${lvRows}</tbody></table></div>
      <div class="hint">• مدة المستوى: لو كتبت 1 يبقى بعد دقيقة لعب بيدخل المستوى اللي بعده أوتوماتيك (وتقدر تكتب 0.5 = نص دقيقة). سيبها فاضية = المستوى بيخلص بالنقط (١٠٠ نقطة).<br>• الجايزة: بتتاخد مرة واحدة بس لكل حساب. سيبها فاضية = من غير جايزة.</div>
      <div class="sub-t" style="padding:0 18px">🔒 قفل اللعبة بعد الخسارة</div>
      <div style="padding:0 18px 14px;display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end">
        <div><div class="k">يخسر كام مرة ورا بعض؟ (0 = من غير قفل)</div><input class="inp" id="gcMaxLoss" type="number" min="0" step="1" style="width:150px" value="${Number(gc.maxLosses)||0}"></div>
        <div><div class="k">تتقفل كام دقيقة؟</div><input class="inp" id="gcLockMin" type="number" min="0" step="1" style="width:150px" value="${Number(gc.lockMinutes)||0}"></div>
      </div>
      <div style="padding:0 18px 18px"><button type="button" class="btn solid" id="gcSave" style="padding:11px 22px"><i class="fa-solid fa-floppy-disk"></i> حفظ الإعدادات</button>
        <span class="mut" style="font-size:12.5px;margin-inline-start:10px">اللي اتصرف كجوائز لحد دلوقتي: <b>${fMoney(gamePaid)}</b></span></div>
    </div>`;
  }
  return `${stats}${bar}${body}`;
}

function cancelledAccountsView(){
  const rows=D.users.filter(isDisabled).filter(u=>match([uName(u),u.email,phoneOf(u),u.disabledReason].join(" "))).sort((a,b)=>(b.disabledAt||0)-(a.disabledAt||0));
  const tr=rows.map(u=>`<tr class="click" data-user="${esc(u.key)}" style="background:#fff5f6">
    <td><div class="usr">${avaHtml(u)}<div>${esc(uName(u))}<small>${esc(u.email)}</small></div></div></td>
    <td dir="ltr" style="text-align:right">${esc(phoneOf(u))||"—"}</td>
    <td style="max-width:340px;line-height:1.8;color:#c81e37;font-weight:700">${esc(u.disabledReason)||"—"}</td>
    <td>${fDT(u.disabledAt)}</td>
    <td style="white-space:nowrap"><button class="btn">كل البيانات</button> <button class="btn solid" data-react="${esc(u.key)}"><i class="fa-solid fa-user-check"></i> إعادة تفعيل</button></td></tr>`).join("");
  return `<div class="card"><div class="card-h"><span><i class="fa-solid fa-user-slash"></i> الحسابات الملغية (${fNum(rows.length)})</span></div>
    ${rows.length?`<div class="tw"><table><thead><tr><th>العميل</th><th>الهاتف</th><th>سبب الإلغاء (بيظهر للعميل)</th><th>تاريخ الإلغاء</th><th></th></tr></thead><tbody>${tr}</tbody></table></div>`:emptyBox("fa-user-slash","مفيش حسابات ملغية")}
    <div class="hint">لإلغاء حساب: افتح الحساب من تبويب «كل الحسابات» واكتب السبب. العميل بيشوف السبب في رسالة حمراء لما يفتح الموقع.</div></div>`;
}

// ترتيب العملاء (أعلى TOP_N): الأكثر شراءً / الأكثر إلغاءً لطلباتهم / الأكثر كتابةً للتعليقات
function rankView(kind){
  const um={};D.users.forEach(u=>{const k=lc(u.email);if(k&&!um[k])um[k]=u;});
  const g={};
  const add=(email,name,fn)=>{
    const k=lc(email);if(!k)return;
    const a=g[k]||(g[k]={email:String(email).trim(),name:"",n:0,sum:0,last:0,rc:0,rs:0,neg:0});
    if(!a.name&&name)a.name=name;fn(a);
  };
  let title,ic,hint,emptyMsg,heads,cells,sortF,valOf,barBg="";
  if(kind==="buyers"){
    D.orders.forEach(o=>add(o.email,o.recipient,a=>{a.n++;a.sum+=gross(o);a.last=Math.max(a.last,o.createdAt||0);}));
    title="العملاء الأكثر شراءً";ic="fa-cart-shopping";emptyMsg="مفيش مشتريات لسه";
    hint="بيتحسب من الطلبات الشغالة بس (الملغي مش داخل) — مترتّبين بإجمالي المشتريات.";
    heads=["عدد الطلبات","إجمالي المشتريات","آخر طلب"];
    cells=a=>`<td>${fNum(a.n)}</td><td><b>${fNum(a.sum)} ج.م.</b></td><td>${fDate(a.last)}</td>`;
    sortF=(a,b)=>b.sum-a.sum||b.n-a.n;valOf=a=>a.sum;
  }else if(kind==="cancels"){
    const ok={};D.orders.forEach(o=>{const k=lc(o.email);if(k)ok[k]=(ok[k]||0)+1;});
    D.cancelled.forEach(o=>add(o.email,o.recipient,a=>{a.n++;a.sum+=gross(o);a.last=Math.max(a.last,o.cancelledAt||0);}));
    title="العملاء الأكثر إلغاءً لطلباتهم";ic="fa-ban";emptyMsg="مفيش طلبات ملغية";
    hint="نسبة الإلغاء = الطلبات الملغية ÷ (الملغية + الشغالة) للعميل ده.";
    heads=["الطلبات الملغية","قيمتها","نسبة الإلغاء","آخر إلغاء"];
    cells=a=>{const t=a.n+(ok[lc(a.email)]||0);return `<td><b style="color:var(--err)">${fNum(a.n)}</b></td><td>${fNum(a.sum)} ج.م.</td><td>${fNum(Math.round(a.n/t*100))}%</td><td>${fDate(a.last)}</td>`;};
    sortF=(a,b)=>b.n-a.n||b.sum-a.sum;valOf=a=>a.n;barBg="linear-gradient(90deg,#f5798f,#e63757)";
  }else{
    D.comments.forEach(c=>add(c.userEmail,c.userName,a=>{a.n++;if(c.rating){a.rc++;a.rs+=Number(c.rating)||0;}if(isNegative(c))a.neg++;a.last=Math.max(a.last,c.createdAt||0);}));
    title="العملاء الأكثر كتابةً للتعليقات";ic="fa-comments";emptyMsg="مفيش تعليقات لسه";
    hint="التعليقات السلبية = اللي فيها كلام وحش أو مشكلة (نفس اللون الأحمر في قسم التعليقات).";
    heads=["عدد التعليقات","متوسط التقييم","تعليقات سلبية","آخر تعليق"];
    cells=a=>`<td><b>${fNum(a.n)}</b></td><td>${a.rc?`<span class="stars">★</span> ${(a.rs/a.rc).toLocaleString("ar-EG",{maximumFractionDigits:1})}`:"—"}</td><td>${a.neg?`<span class="badge" style="background:#fde8ec;color:var(--err)">⚠️ ${fNum(a.neg)}</span>`:"—"}</td><td>${fDate(a.last)}</td>`;
    sortF=(a,b)=>b.n-a.n||b.last-a.last;valOf=a=>a.n;
  }
  const all=Object.values(g).filter(a=>match([a.name,a.email].join(" "))).sort(sortF);
  const rows=all.slice(0,TOP_N),mx=Math.max(1,...rows.map(valOf));
  const tr=rows.map((a,i)=>{
    const u=um[lc(a.email)],nm=u?uName(u):(a.name||a.email),em=u?u.email:a.email;
    return `<tr${u?` class="click" data-user="${esc(u.key)}"`:""}>
    <td><span class="rk${i===0?" t1":""}">${fNum(i+1)}</span></td>
    <td><div class="usr">${avaP(u,em,nm)}<div>${esc(nm)}${isDisabled(u)?CANC_BADGE:""}<small>${esc(em)}</small></div></div></td>
    ${cells(a)}
    <td style="min-width:110px"><div class="pbar"><i style="width:${Math.max(4,Math.round(valOf(a)/mx*100))}%${barBg?`;background:${barBg}`:""}"></i></div></td></tr>`;
  }).join("");
  const cnt=`${fNum(rows.length)}${all.length>rows.length?` من ${fNum(all.length)}`:""}`;
  return `<div class="card"><div class="card-h"><span><i class="fa-solid ${ic}"></i> ${title} (${cnt})</span></div>
    ${rows.length?`<div class="tw"><table><thead><tr><th>#</th><th>العميل</th>${heads.map(h=>`<th>${h}</th>`).join("")}<th></th></tr></thead><tbody>${tr}</tbody></table></div>`:emptyBox(ic,emptyMsg)}
    <div class="hint">${hint}</div></div>`;
}

// ---------- تفاصيل طلب (كل حاجة قابلة للتعديل) ----------
function colorChoicesHtml(it){
  const vars=productVariants(orderItemProduct(it));
  if(vars.length) return vars.map(v=>`<button type="button" data-cv="${esc(v.color)}" data-cvimg="${esc(v.img)}" title="${esc(v.color)}" style="display:flex;flex-direction:column;align-items:center;gap:3px;width:80px;background:#fff;border:2px solid #e3e7ee;border-radius:10px;padding:5px;cursor:pointer;font:inherit;font-size:11px;font-weight:700;line-height:1.35;color:inherit">${v.img?`<img src="${esc(v.img)}" alt="" style="width:46px;height:46px;border-radius:8px;object-fit:cover">`:""}<span>${esc(v.color)}</span></button>`).join("");
  const hx=/^#[0-9a-f]{6}$/i.test(it?.colorHex||"")?it.colorHex:"#888888";
  return COLOR_PALETTE.map(([n,h])=>`<button type="button" data-cs="${n}|${h}" title="${n}" style="width:24px;height:24px;border-radius:50%;background:${h};border:2px solid #d5dae3;cursor:pointer;padding:0"></button>`).join("")
    +`<label title="أي لون تاني" style="display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:700;cursor:pointer"><input type="color" data-cpick value="${hx}" style="width:30px;height:24px;padding:0;border:none;background:none;cursor:pointer"> لون تاني</label>`;
}
function itemRowHtml(it,idx){
  return `<div class="mini" data-item-row="${idx}" data-orig="${esc(JSON.stringify(it||{}))}" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
    ${itemThumbHtml(it,52)}
    <input class="inp" data-f="name" style="flex:2;min-width:140px" value="${esc(it?.name||"")}" placeholder="اسم المنتج">
    <div style="display:flex;align-items:center;gap:6px"><span data-cdot style="display:inline-flex">${colorDot(itemColor(it),it?.colorHex)}</span><input class="inp" data-f="color" list="colorNames" style="width:110px" value="${esc(itemColor(it))}" placeholder="اللون"></div>
    <input type="hidden" data-f="colorHex" value="${esc(it?.colorHex||"")}">
    <input type="hidden" data-f="colorImg" value="">
    <input class="inp" data-f="qty" type="number" min="1" style="width:80px" value="${esc(it?.qty ?? 1)}" placeholder="الكمية">
    <input class="inp" data-f="price" type="number" style="width:110px" value="${esc(it?.price ?? "")}" placeholder="السعر">
    <button type="button" class="btn red" data-edit-only data-rmitem="${idx}" title="حذف المنتج ده من الطلب"><i class="fa-solid fa-trash"></i></button>
    <div data-edit-only style="flex-basis:100%"><div style="display:flex;gap:7px;flex-wrap:wrap;align-items:center">
      <span class="mut" style="font-size:11px;font-weight:700">اختار اللون:</span>
      ${colorChoicesHtml(it)}
      <button type="button" class="btn" data-cs="|" style="padding:2px 9px;font-size:11px">مسح اللون</button>
    </div></div>
  </div>`;
}
function orderDetail(o,startEdit=false){
  const c=stepsDone(o);
  const items=Array.isArray(o.items)?o.items:[];
  const itemsHtml=items.map((it,idx)=>itemRowHtml(it,idx)).join("");
  const opts=[[1,"قيد التنفيذ (لسه ما تمش)"],[2,"تم التنفيذ (جاهز للإرسال)"],[3,"تم الإرسال"],[4,"تم التسليم"]].map(([v,l])=>`<option value="${v}"${c===v?" selected":""}>${l}</option>`).join("");
  openModal(`طلب ${o.code}`,`
    <div class="kv">
      <div><div class="k">الحالة الحالية</div><div class="vv">${badge(o)}</div></div>
      <div><div class="k">تاريخ الطلب</div><div class="vv">${fDT(o.createdAt)}</div></div>
      <div><div class="k">عدد القطع</div><div class="vv">${piecesBadge(o)}</div></div>
      <div><div class="k">أقصى موعد للاستلام</div><div class="vv">${fDate(o.deadline)}</div></div>
      <div><div class="k">البريد (مش قابل للتعديل هنا)</div><div class="vv">${esc(o.email)||"—"}</div></div>
      <div><div class="k">المستلم</div><input class="inp" id="edRecipient" style="width:100%" value="${esc(o.recipient||"")}"></div>
      <div><div class="k">الهاتف</div><input class="inp" id="edPhone" dir="ltr" style="width:100%" value="${esc(o.phone||"")}"></div>
      <div><div class="k">طريقة الدفع</div><input class="inp" id="edPayment" style="width:100%" value="${esc(o.payment||"")}"></div>
      <div><div class="k">نوع العنوان</div><input class="inp" id="edAddressType" style="width:100%" value="${esc(o.addressType||"")}"></div>
      <div><div class="k">${Number(o.walletUsed)>0?"المطلوب دفعه (بعد الرصيد)":"الإجمالي"}</div><input class="inp" id="edTotal" style="width:100%" value="${esc(o.total||"")}"></div>
      ${Number(o.walletUsed)>0?`<div><div class="k">مدفوع من رصيد العميل</div><div class="vv" style="color:#00a15c">${fMoney(o.walletUsed)}${o.walletRefunded?" (اترجّع)":""}</div></div>`:""}
      <div><div class="k">المجموع الفرعي</div><input class="inp" id="edSubtotal" style="width:100%" value="${esc(o.subtotal||"")}"></div>
      <div><div class="k">الشحن</div><input class="inp" id="edShipping" style="width:100%" value="${esc(o.shipping||"")}"></div>
      <div><div class="k">التغليف</div><input class="inp" id="edPackaging" style="width:100%" value="${esc(o.packaging||"")}"></div>
    </div>
    <div class="sub-t"><i class="fa-solid fa-location-dot"></i> العنوان</div>
    <textarea class="inp" id="edAddress" style="width:100%;min-height:60px;font-family:inherit">${esc(o.address||"")}</textarea>
    <div class="sub-t"><i class="fa-solid fa-note-sticky"></i> ملاحظات</div>
    <textarea class="inp" id="edNotes" style="width:100%;min-height:50px;font-family:inherit">${esc(o.notes||"")}</textarea>
    <label style="display:flex;align-items:center;gap:8px;margin-top:8px;font-weight:700;font-size:13px;cursor:pointer"><input type="checkbox" id="edLeaveAtDoor"${o.leaveAtDoor?" checked":""}> يترك عند الباب</label>

    <div class="sub-t"><i class="fa-solid fa-bag-shopping"></i> المنتجات</div>
    <datalist id="colorNames">${COLOR_PALETTE.map(([n])=>`<option value="${n}">`).join("")}</datalist>
    <div id="itemsWrap">${itemsHtml}</div>
    <button type="button" class="btn" id="addItemBtn" data-edit-only style="margin-top:8px"><i class="fa-solid fa-plus"></i> إضافة منتج</button>

    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:18px">
      <button class="btn solid" id="editBtn"><i class="fa-solid fa-pen"></i> تعديل</button>
      <button class="btn solid" id="saveOrderBtn" data-edit-only><i class="fa-solid fa-floppy-disk"></i> حفظ كل التعديلات</button>
      <button class="btn" id="cancelEditBtn" data-edit-only><i class="fa-solid fa-xmark"></i> إلغاء التعديل</button>
      <button class="btn" id="viewCustomerBtn"><i class="fa-solid fa-user"></i> بيانات العميل كاملة</button>
      <button class="btn" id="invBtn"><i class="fa-solid fa-file-invoice"></i> الفاتورة</button>
      <button class="btn red" id="delOrderBtn"><i class="fa-solid fa-trash-can"></i> حذف الطلب</button>
    </div>

    <div class="sub-t"><i class="fa-solid fa-truck-fast"></i> تحديث حالة الطلب</div>
    <div style="display:flex;gap:10px;flex-wrap:wrap"><select class="sel" id="stSel">${opts}</select><button class="btn solid" id="stSave">حفظ الحالة</button></div>
    <p class="mut" style="font-size:12px;margin-top:8px">خطوة "استلمنا الطلب" بس هي اللي بتكتمل تلقائي. "قيد التنفيذ" مش بتتم غير لما تختار "تم التنفيذ" من هنا، وبعدها "تم الإرسال" و"تم التسليم".</p>${dlvSummary(o)}`);

  // وضع القراءة / وضع التعديل: الحقول مقفولة لحد ما تدوس "تعديل"
  const setEdit=on=>{
    $("mbody").querySelectorAll("input.inp,textarea.inp").forEach(el=>{el.readOnly=!on;el.style.background=on?"":"#f5f6f8";});
    const ck=$("edLeaveAtDoor");if(ck)ck.disabled=!on;
    $("mbody").querySelectorAll("[data-edit-only]").forEach(el=>el.style.display=on?"":"none");
    $("editBtn").style.display=on?"none":"";
    window._orderEditing=on;
  };
  $("editBtn").onclick=()=>setEdit(true);
  $("cancelEditBtn").onclick=()=>orderDetail(o);   // يرجّع البيانات الأصلية
  const itemsWrap=$("itemsWrap");
  const reindexItems=()=>{itemsWrap.querySelectorAll("[data-item-row]").forEach((row,i)=>{row.dataset.itemRow=i;row.querySelector("[data-rmitem]").dataset.rmitem=i;});};
  itemsWrap.addEventListener("click",e=>{
    const b=e.target.closest("[data-rmitem]");
    if(!b)return;
    b.closest("[data-item-row]").remove();
    reindexItems();
  });
  itemsWrap.addEventListener("input",e=>{   // الصورة بتتحدّث لو غيّرت اسم المنتج
    const row=e.target.closest("[data-item-row]");if(!row)return;
    if(e.target.matches("[data-cpick]")){setRowColor(row,nearestColorName(e.target.value),e.target.value);return;}
    if(e.target.dataset.f==="color"){   // كتبت اسم لون بإيدك
      const nm=e.target.value.trim(),known=COLOR_PALETTE.find(([n])=>n===nm);
      row.querySelector('[data-f="colorHex"]').value=known?known[1]:"";
      row.querySelector("[data-cdot]").innerHTML=colorDot(nm,known?known[1]:"");
      return;
    }
    if(e.target.dataset.f!=="name")return;
    const th=row.querySelector("[data-thumb]");
    if(th)th.outerHTML=itemThumbHtml({name:e.target.value},52);
  });
  itemsWrap.addEventListener("click",e=>{   // ضغطة على دايرة لون
    const cv=e.target.closest("[data-cv]");
    if(cv){
      const row=cv.closest("[data-item-row]"),img=cv.dataset.cvimg||"";
      setRowColor(row,cv.dataset.cv,"");
      row.querySelector('[data-f="colorImg"]').value=img;
      if(img){
        row.querySelector("[data-cdot]").innerHTML=`<img src="${esc(img)}" alt="" style="width:18px;height:18px;border-radius:50%;object-fit:cover;border:1px solid #cfd4dc">`;
        const th=row.querySelector("[data-thumb]");
        if(th)th.outerHTML=itemThumbHtml({name:row.querySelector('[data-f="name"]').value,img},52);   // الصورة تتغير للون المختار
      }
      return;
    }
    const b=e.target.closest("[data-cs]");if(!b)return;
    const [n,h]=b.dataset.cs.split("|");
    setRowColor(b.closest("[data-item-row]"),n,h);
  });
  $("addItemBtn").onclick=()=>{
    const idx=itemsWrap.querySelectorAll("[data-item-row]").length;
    itemsWrap.insertAdjacentHTML("beforeend",itemRowHtml({},idx));
  };
  setEdit(!!startEdit);
  $("invBtn").onclick=()=>openInvoice(o);
  if($("dlvEdit"))$("dlvEdit").onclick=()=>openDelivery(o);
  $("delOrderBtn").onclick=()=>askDeleteOrder(o);
  $("viewCustomerBtn").onclick=()=>{
    const u=D.users.find(x=>(x.email||"").toLowerCase()===(o.email||"").toLowerCase());
    if(u)userDetail(u); else toast("⚠️ مفيش حساب مسجّل مرتبط بالبريد ده");
  };
  $("stSave").onclick=async()=>{
    const v=parseInt($("stSel").value),upd={};
    if(v===4){openDelivery(o);return;}
    upd[`orders/${o.id}/stage`]=v;
    upd[`orders/${o.id}/delivery`]=null;
    if(o.email){upd[`userOrders/${eKey(o.email)}/${o.id}/stage`]=v;upd[`userOrders/${eKey(o.email)}/${o.id}/delivery`]=null;}
    try{await update(ref(db),upd);o.stage=v;delete o.delivery;toast("✅ تم تحديث الحالة");$("modal").classList.remove("open");render();}
    catch(e){console.error(e);toast("❌ فشل التحديث");}
  };
  $("saveOrderBtn").onclick=async()=>{
    const fields={
      recipient:$("edRecipient").value.trim(),
      phone:$("edPhone").value.trim(),
      payment:$("edPayment").value.trim(),
      addressType:$("edAddressType").value.trim(),
      total:$("edTotal").value.trim(),
      subtotal:$("edSubtotal").value.trim(),
      shipping:$("edShipping").value.trim(),
      packaging:$("edPackaging").value.trim(),
      address:$("edAddress").value.trim(),
      notes:$("edNotes").value.trim(),
      leaveAtDoor:$("edLeaveAtDoor").checked
    };
    const newItems=[...itemsWrap.querySelectorAll("[data-item-row]")].map(row=>{
      let orig={};try{orig=JSON.parse(row.dataset.orig||"{}")||{};}catch(_){}
      const name=row.querySelector('[data-f="name"]').value.trim();
      const base=(orig.name===name)?orig:{};   // نحافظ على باقي بيانات المنتج (كود/صورة) لو الاسم ما اتغيرش
      const nb={...base,
        name,
        qty:parseInt(row.querySelector('[data-f="qty"]').value)||1,
        price:parseFloat(row.querySelector('[data-f="price"]').value)||0
      };
      const colorVal=row.querySelector('[data-f="color"]').value.trim();
      const ck=itemColorKey(orig)||"color";
      if(colorVal)nb[ck]=colorVal;else delete nb[ck];
      const hexVal=row.querySelector('[data-f="colorHex"]').value.trim();
      if(hexVal&&colorVal)nb.colorHex=hexVal;else delete nb.colorHex;
      const ci=row.querySelector('[data-f="colorImg"]').value.trim();
      if(ci&&colorVal)nb.img=ci;   // صورة اللون المختار
      return nb;
    }).filter(it=>it.name);
    const upd={};
    Object.entries(fields).forEach(([k,v])=>{ upd[`orders/${o.id}/${k}`]=v; if(o.email)upd[`userOrders/${eKey(o.email)}/${o.id}/${k}`]=v; });
    upd[`orders/${o.id}/items`]=newItems;
    if(o.email)upd[`userOrders/${eKey(o.email)}/${o.id}/items`]=newItems;
    try{
      await update(ref(db),upd);
      Object.assign(o,fields,{items:newItems});
      toast("✅ تم حفظ كل التعديلات");
      $("modal").classList.remove("open");
      render();
    }catch(e){console.error(e);toast("❌ فشل حفظ التعديلات");}
  };
}

// ---------- تفاصيل تعليق (تعديل + حذف + شوف المنتج) ----------
function commentDetail(c){
  const starsOpts=[5,4,3,2,1].map(n=>`<option value="${n}"${(c.rating||0)===n?" selected":""}>${"★".repeat(n)}${"☆".repeat(5-n)}</option>`).join("");
  openModal(`تعليق — ${c.userName||"مستخدم"}`,`
    <div id="edNote"></div>
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
      ${avaFor(c.userEmail,c.userName)}
      <div><b>${esc(c.userName||"مستخدم")}</b><br><span class="mut">${esc(c.userEmail||"")}</span></div>
    </div>
    <div class="kv">
      <div><div class="k">المنتج</div><div class="vv">${productChip(c.itemId)}</div></div>
      <div><div class="k">تاريخ التعليق</div><div class="vv">${fDT(c.createdAt)}</div></div>
      <div><div class="k">التفاعل</div><div class="vv">👍 ${fNum(c.likes)} · 👎 ${fNum(c.dislikes)}</div></div>
    </div>
    <div class="sub-t"><i class="fa-solid fa-star"></i> التقييم <span id="edStatus"></span></div>
    <select class="sel" id="edRating" style="width:100%">${starsOpts}</select>
    <div class="sub-t"><i class="fa-solid fa-comment"></i> نص التعليق</div>
    <textarea class="inp" id="edCText" style="width:100%;min-height:110px;font-family:inherit">${esc(c.text||"")}</textarea>
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:16px">
      <button class="btn solid" id="saveCommentBtn"><i class="fa-solid fa-floppy-disk"></i> حفظ التعديل</button>
      <button class="btn red" id="delCommentBtn"><i class="fa-solid fa-trash"></i> حذف التعليق نهائي</button>
    </div>
    <p class="mut" style="font-size:12px;margin:10px 0 0">الحذف بيشيل التعليق من قاعدة البيانات على طول — هيختفي عندك وعند الموقع كله (صفحة المنتج) في نفس اللحظة.</p>`);
  // تحديث لون التنبيه والحالة فورًا مع أي تغيير — من غير ما يحتاج يحفظ الأول
  const refreshLive=()=>{
    const draftNeg=isNegative({rating:parseInt($("edRating").value),text:$("edCText").value});
    $("edNote").innerHTML=draftNeg?`<div class="note" style="background:#fde8ec;border-color:#f3b8c4;color:#c81e37"><i class="fa-solid fa-triangle-exclamation"></i> التعليق ده سلبي / وحش — يُفضّل تتواصل مع العميل لمتابعة المشكلة.</div>`:"";
    $("edStatus").innerHTML=draftNeg?'<span class="badge" style="background:#fde8ec;color:var(--err)">⚠️ سلبي</span>':'<span class="badge" style="background:#dcf8ec;color:#00a15c">👍 إيجابي</span>';
    $("edRating").style.borderColor=draftNeg?"var(--err)":"var(--line)";
  };
  refreshLive();
  $("edRating").onchange=refreshLive;
  $("edCText").oninput=refreshLive;
  $("saveCommentBtn").onclick=async()=>{
    const wasNeg=isNegative(c);
    const upd={text:$("edCText").value.trim(),rating:parseInt($("edRating").value)};
    try{
      await update(ref(db,`comments/${c.itemId}/${c.id}`),upd);
      Object.assign(c,upd);
      const nowNeg=isNegative(c);
      toast(wasNeg&&!nowNeg?"✅ تم الحفظ — التعليق بقى إيجابي وشيل من قايمة السلبيات":"✅ تم حفظ التعليق");
      $("modal").classList.remove("open");
      render();
    }catch(e){console.error(e);toast("❌ فشل حفظ التعديل");}
  };
  $("delCommentBtn").onclick=async()=>{
    if(!confirm("متأكد إنك عايز تحذف التعليق ده نهائياً من كل حتة؟"))return;
    const btn=$("delCommentBtn");btn.disabled=true;
    try{
      await remove(ref(db,`comments/${c.itemId}/${c.id}`));
      D.comments=D.comments.filter(x=>!(x.itemId===c.itemId&&x.id===c.id));
      $("cntComments").textContent=fNum(D.comments.length);
      toast("🗑️ تم حذف التعليق نهائياً من الموقع كله");
      $("modal").classList.remove("open");
      render();
    }catch(e){console.error(e);toast("❌ فشل الحذف");btn.disabled=false;}
  };
}

// ---------- تفاصيل عميل (تعديل الحساب + العناوين + كل حاجة عنه) ----------
const PHONE_RE=/^01[0125][0-9]{8}$/, EMAIL_RE=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const lc=s=>String(s||"").trim().toLowerCase();

function addrCardHtml(a){
  const f=(k,l,ltr)=>`<div><div class="k">${l}</div><input class="inp" data-af="${k}" ${ltr?'dir="ltr" ':""}style="width:100%" value="${esc(a[k]||"")}"></div>`;
  return `<div class="mini" data-addr="${esc(a.id)}">
    <div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:center">
      <span><b>${esc(a.name||"")}</b> ${a.isDefault?'<span class="badge b1">الافتراضي</span>':""} <span class="mut">(${esc(a.type||"")})</span></span>
      <span style="display:flex;gap:6px"><button type="button" class="btn" data-aedit="${esc(a.id)}"><i class="fa-solid fa-pen"></i> تعديل</button><button type="button" class="btn red" data-adel="${esc(a.id)}" title="حذف العنوان"><i class="fa-solid fa-trash"></i></button></span>
    </div>
    <div class="mut" style="margin-top:4px">${esc([a.governorate,a.center,a.city,a.street,a.building].filter(Boolean).join("، "))} · <span dir="ltr">${esc(a.phone||"")}${a.phone2?" / "+esc(a.phone2):""}</span></div>
    <div class="kv" data-aform="${esc(a.id)}" style="display:none;margin:12px 0 0">
      ${f("name","الاسم")}${f("phone","الهاتف",1)}${f("phone2","هاتف إضافي",1)}${f("governorate","المحافظة")}${f("center","المركز / المنطقة")}${f("city","المدينة")}${f("street","الشارع")}${f("building","المبنى / الشقة")}${f("type","نوع العنوان")}
      <div style="grid-column:1/-1"><button type="button" class="btn solid" data-asave="${esc(a.id)}"><i class="fa-solid fa-floppy-disk"></i> حفظ العنوان</button></div>
    </div></div>`;
}

// تغيير البريد = نقل كل بيانات العميل (عناوين/طلبات/صورة/تعليقات) للمفتاح الجديد في عملية واحدة (كلها أو ولا حاجة)
async function changeEmail(u,ne,fields){
  const old=String(u.email||"").trim(),ok=eKey(old),nk=eKey(ne);
  if(lc(old)===lc(ADMIN_EMAIL)){toast("⛔ مينفعش تغيّر بريد حساب المشرف من هنا (لوحة التحكم مربوطة بيه)");return false;}
  if(ok===nk){toast("❌ البريد الجديد بيتحوّل لنفس مفتاح القديم — اختار بريد تاني");return false;}
  if(D.users.some(x=>x.key!==u.key&&lc(x.email)===ne)){toast("❌ البريد ده مستخدم في حساب تاني");return false;}
  const rd=await Promise.all([`userAddresses/${nk}`,`userOrders/${nk}`,`userPhotos/${nk}`,`userAddresses/${ok}`,`userOrders/${ok}`,`userPhotos/${ok}`].map(read));
  if(rd.some(x=>x===undefined)){toast("⚠️ معرفتش أقرا بيانات العميل — راجع Rules في Firebase");return false;}
  const[na,nuo,nph,oa,ouo,oph]=rd;
  if(na||nuo||nph){toast("❌ فيه بيانات متسجّلة على البريد الجديد ده بالفعل");return false;}
  if(!confirm(`تغيير البريد من\n${old}\nإلى\n${ne}\n\nهتتنقل كل عناوين وطلبات وتعليقات العميل للبريد الجديد، وهيتسجّل خروجه من كل أجهزته ويدخل بالبريد الجديد.\nمتأكد؟`))return false;

  const upd={};
  Object.entries(fields).forEach(([k,v])=>upd[`users/${u.key}/${k}`]=v);
  upd[`users/${u.key}/email`]=ne;
  if(oa){Object.entries(oa).forEach(([id,a])=>{upd[`userAddresses/${nk}/${id}`]={...a,email:ne};});upd[`userAddresses/${ok}`]=null;}
  if(ouo){Object.entries(ouo).forEach(([id,o])=>{upd[`userOrders/${nk}/${id}`]={...o,email:ne};});upd[`userOrders/${ok}`]=null;}
  [...D.orders,...D.cancelled].filter(o=>D.orderRoot.has(o.id)&&lc(o.email)===lc(old)).forEach(o=>{upd[`orders/${o.id}/email`]=ne;});   // بس اللي موجود فعلاً في orders/
  if(oph){upd[`userPhotos/${nk}`]=oph;upd[`userPhotos/${ok}`]=null;}
  D.comments.filter(c=>lc(c.userEmail)===lc(old)).forEach(c=>{upd[`comments/${c.itemId}/${c.id}/userEmail`]=ne;});
  upd[`sessions/${ok}`]=null;   // يطلّعه من كل الأجهزة (الموقع بيعرض له رسالة تسجيل خروج)
  try{
    await update(ref(db),upd);
    toast("✅ تم تغيير البريد ونقل بيانات العميل");
    $("modal").classList.remove("open");
    await loadAll();
    return true;
  }catch(e){console.error(e);toast("❌ فشل تغيير البريد — مفيش حاجة اتغيّرت");return false;}
}

async function userDetail(u){
  const ek=eKey(u.email||""),email=u.email||"";
  openModal(uName(u),`<div class="empty"><i class="fa-solid fa-spinner fa-spin"></i>جاري التحميل...</div>`);
  const[photo,sess,wal]=await Promise.all([ek?read(`userPhotos/${ek}`):null,read(`sessions/${ek}`),ek?read(`wallet/${ek}`):null]);
  if(typeof photo==="string"&&photo)PH[ek]=photo;
  const own=new Set(["key","firstName","lastName","email","gender","phone","disabled","disabledReason","disabledAt"]);
  const others=Object.entries(u).filter(([k,v])=>!own.has(k)&&!SENSITIVE.test(k)&&typeof v!=="object");
  const kv=others.map(([k,v])=>`<div><div class="k">${esc(k==="createdAt"?"تاريخ التسجيل":k)}</div><div class="vv">${k==="createdAt"?fDT(v):esc(v)}</div></div>`).join("");
  const gs=/[\u0600-\u06FF]/.test(u.gender||"")?[["ذكر","ذكر"],["أنثى","أنثى"]]:[["male","ذكر"],["female","أنثى"]];
  const gOpts=`<option value="">—</option>`+gs.map(([v,l])=>`<option value="${v}"${u.gender===v?" selected":""}>${l}</option>`).join("");
  const addrList=D.addr[ek]||[];
  const addrs=addrList.map(addrCardHtml).join("")||`<div class="mut">مفيش عناوين</div>`;
  const ords=ordersOf(email).map(o=>`<div class="mini" style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:center"><span><span class="code">${esc(o.code)}</span> · ${fDate(o.createdAt)} · <b>${esc(o.total)||""}</b></span><span style="display:flex;gap:8px;align-items:center">${badge(o)}<button type="button" class="btn" data-inv="${esc(o.id)}"><i class="fa-solid fa-file-invoice"></i> فاتورة</button></span><div style="flex-basis:100%">${orderItemsCell(o)}</div></div>`).join("")||`<div class="mut">مفيش طلبات</div>`;
  const cms=commentsOf(email).map(c=>{const neg=isNegative(c);return `<div class="mini"${neg?' style="background:#fff2f3;border-color:#f3b8c4"':""}><div><span class="stars">${"★".repeat(c.rating||0)}</span> <span class="mut">${fDate(c.createdAt)} · ${esc(c.itemId)}</span>${neg?' <span style="color:var(--err);font-weight:800;font-size:11px">⚠️ سلبي</span>':""}<br><span${neg?' style="color:#c81e37;font-weight:700"':""}>${esc(c.text)}</span></div></div>`;}).join("")||`<div class="mut">مفيش تعليقات</div>`;
  const cpUsage=couponUsageOf(email);
  const cps=cpUsage.map(a=>`<div class="mini" style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:center"><span class="code">${esc(a.code)}</span><span>استخدمه <b>${fNum(a.count)}</b> مرة — خصملـه <b style="color:var(--err)">${fNum(a.discount)} ج.م.</b></span></div>`).join("")||`<div class="mut">العميل ده لسه ما استخدمش أي كود خصم</div>`;
  const devs=sess?Object.keys(sess).length:0;
  const dis=isDisabled(u),isAdm=lc(email)===lc(ADMIN_EMAIL);
  const acctBlock=dis?`
    <div class="note" style="background:#fde8ec;border-color:#f3b8c4;color:#c81e37;margin:16px 0 0"><b><i class="fa-solid fa-user-slash"></i> الحساب ده ملغي${u.disabledAt?` — من ${fDT(u.disabledAt)}`:""}</b><br>السبب اللي بيظهر للعميل: ${esc(u.disabledReason)||"—"}</div>
    <button type="button" class="btn solid" id="acReactBtn" style="margin-top:10px"><i class="fa-solid fa-user-check"></i> إعادة تفعيل الحساب</button>`
  :isAdm?"":`
    <div class="sub-t"><i class="fa-solid fa-user-slash"></i> إلغاء الحساب</div>
    <textarea class="inp" id="acReason" maxlength="300" rows="3" style="width:100%;resize:vertical;line-height:1.7" placeholder="اكتب سبب إلغاء الحساب — هيظهر للعميل في رسالة حمراء لما يفتح الموقع"></textarea>
    <button type="button" class="btn red" id="acCancelBtn" style="margin-top:8px"><i class="fa-solid fa-user-slash"></i> إلغاء الحساب</button>`;
  const spent=ordersOf(email).reduce((s,o)=>s+gross(o),0);
  const wBal=Math.max(0,Number(wal&&wal.balance)||0);
  const wLog=Object.entries((wal&&wal.log)||{}).map(([id,v])=>({id,...v})).sort((a,b)=>(b.at||0)-(a.at||0));
  const wTotalIn=wLog.filter(x=>x.type==="credit"&&!x.deleted).reduce((t,x)=>t+(Number(x.amount)||0),0);
  const wTotalOut=wLog.filter(x=>x.type==="debit"&&!x.deleted).reduce((t,x)=>t+(Number(x.amount)||0),0);
  const wRows=wLog.map(x=>{
    const amt=Number(x.amount)||0;
    const m={credit:["➕ إضافة رصيد","#00a15c","+"],refund:["↩️ استرجاع","#00a15c","+"],debit:["🛒 صرف في طلب","#c81e37","−"],deduct:["➖ خصم يدوي","#c81e37","−"]}[x.type]||["•","#555",""];
    const what=x.type==="debit"?`<span class="code">${esc(x.orderCode||"")}</span> ${esc(x.desc||"")}`:esc(x.note||(x.orderCode?x.orderCode:""));
    const editable=(x.type==="credit"||x.type==="deduct")&&!x.deleted;
    return `<div class="mini" style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:center${x.deleted?";opacity:.55":""}"><span><b>${m[0]}</b>${x.deleted?" 🗑️ محذوفة":""} ${what}<br><span class="mut" style="font-size:11.5px">${fDT(x.at)}</span>${walletEditsHtml(x)}</span><span style="display:flex;gap:8px;align-items:center"><b style="color:${m[1]};font-size:15px;${x.deleted?"text-decoration:line-through":""}">${m[2]}${fMoney(amt)}</b>${editable?`<button type="button" class="btn" data-wle="${esc(ek)}|${esc(x.id)}"><i class="fa-solid fa-pen"></i></button>`:""}</span></div>`;
  }).join("")||`<div class="mut">مفيش حركات على الرصيد لسه</div>`;
  const walletBlock=`
    <div class="sub-t"><i class="fa-solid fa-wallet"></i> رصيد العميل</div>
    <div class="kv">
      <div><div class="k">الرصيد الحالي</div><div class="vv" style="font-size:20px;font-weight:800;color:#00a15c">${fMoney(wBal)}</div></div>
      <div><div class="k">إجمالي اللي ضفته</div><div class="vv">${fMoney(wTotalIn)}</div></div>
      <div><div class="k">إجمالي اللي صرفه</div><div class="vv">${fMoney(wTotalOut)}</div></div>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin:10px 0">
      <input class="inp" id="wlAmt" type="number" min="0" step="0.01" inputmode="decimal" placeholder="المبلغ (ج.م.)" style="width:140px">
      <input class="inp" id="wlNote" maxlength="120" placeholder="ملاحظة (اختياري) — مثال: تعويض / هدية" style="flex:1;min-width:180px">
      <button type="button" class="btn solid" id="wlAdd"><i class="fa-solid fa-plus"></i> إضافة للرصيد</button>
      <button type="button" class="btn red" id="wlSub"><i class="fa-solid fa-minus"></i> خصم يدوي</button>
    </div>
    <div style="max-height:260px;overflow:auto">${wRows}</div>`;
  const inp=(id,l,v,ltr)=>`<div><div class="k">${l}</div><input class="inp" id="${id}" ${ltr?'dir="ltr" ':""}style="width:100%" value="${esc(v||"")}"></div>`;
  $("mbody").innerHTML=`
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:18px">
      ${photo?`<div class="ava zoomable" data-pk="${esc(ek)}" title="اضغط مرتين للتكبير" style="width:64px;height:64px;font-size:24px"><img src="${esc(photo)}" alt=""></div>`:`<div class="ava" style="width:64px;height:64px;font-size:24px">${initials(uName(u))}</div>`}
      <div><div style="font-size:18px;font-weight:800">${esc(uName(u))}${dis?CANC_BADGE:""} <span class="badge" data-pt="${esc(u.key)}" style="display:none;background:#dcf8ec;color:#00a15c">🟢 متصل الآن</span></div><div class="mut">${esc(email)}</div></div>
    </div>
    <div class="sub-t" style="margin-top:0"><i class="fa-solid fa-user-pen"></i> بيانات الحساب (قابلة للتعديل)</div>
    <div class="kv">
      ${inp("euFirst","الاسم الأول",u.firstName)}${inp("euLast","الاسم الأخير",u.lastName)}
      ${inp("euEmail","البريد الإلكتروني",u.email,1)}${inp("euPhone","الهاتف",u.phone,1)}
      <div><div class="k">النوع</div><select class="sel" id="euGender" style="width:100%">${gOpts}</select></div>
    </div>
    <button type="button" class="btn solid" id="euSave"><i class="fa-solid fa-floppy-disk"></i> حفظ بيانات الحساب</button>
    <p class="mut" style="font-size:12px;margin:8px 0 0">لو غيّرت البريد، كل عناوين وطلبات وتعليقات العميل بتتنقل للبريد الجديد وبيتسجّل خروجه من كل أجهزته.</p>
    ${acctBlock}
    <div class="kv" style="margin-top:16px">${kv}
      <div><div class="k">عدد الأجهزة المسجّلة</div><div class="vv">${fNum(devs)}</div></div>
      <div><div class="k">إجمالي مشترياته</div><div class="vv">${fNum(spent)} ج.م.</div></div>
    </div>
    ${walletBlock}
    <div class="sub-t"><i class="fa-solid fa-location-dot"></i> العناوين (${fNum(addrList.length)})</div>${addrs}
    <div class="sub-t"><i class="fa-solid fa-box-open"></i> الطلبات (${fNum(ordersOf(email).length)})</div>${ords}
    <div class="sub-t"><i class="fa-solid fa-tag"></i> أكواد الخصم المستخدمة (${fNum(cpUsage.length)})</div>${cps}
    <div class="sub-t"><i class="fa-solid fa-comments"></i> التعليقات (${fNum(commentsOf(email).length)})</div>${cms}`;

  refreshPresence();
  $("mbody").querySelectorAll("[data-wle]").forEach(b=>b.onclick=()=>{const[k,i]=b.dataset.wle.split("|");openWalletEntry(k,i,()=>userDetail(u));});
  const wlGo=async type=>{
    const amt=r2($("wlAmt").value),note=$("wlNote").value.trim();
    if(!(amt>0)){toast("❌ اكتب مبلغ صحيح");return;}
    if(!email){toast("❌ العميل ده ملوش بريد");return;}
    if(!confirm(`${type==="credit"?"إضافة":"خصم"} ${fMoney(amt)} ${type==="credit"?"إلى":"من"} رصيد ${uName(u)}؟`))return;
    $("wlAdd").disabled=$("wlSub").disabled=true;
    try{
      const ok=await walletAdjust(email,amt,type,note);
      if(!ok){toast("❌ رصيد العميل أقل من المبلغ ده");$("wlAdd").disabled=$("wlSub").disabled=false;return;}
      toast(type==="credit"?"✅ تمت إضافة الرصيد":"✅ تم الخصم من الرصيد");
      D.wallet=await loadWallets();
      userDetail(u);if(view==="wallets")render();
    }catch(e){console.error(e);toast("❌ فشلت العملية — راجع Rules في Firebase");$("wlAdd").disabled=$("wlSub").disabled=false;}
  };
  $("wlAdd").onclick=()=>wlGo("credit");
  $("wlSub").onclick=()=>wlGo("deduct");
  $("euSave").onclick=async()=>{
    const fn=$("euFirst").value.trim(),ln=$("euLast").value.trim(),ph=$("euPhone").value.trim(),g=$("euGender").value,ne=lc($("euEmail").value);
    if(!fn||!ln){toast("❌ اكتب الاسم الأول والأخير");return;}
    if(ph&&!PHONE_RE.test(ph)){toast("❌ رقم الهاتف غلط (١١ رقم يبدأ بـ 01)");return;}
    if(!EMAIL_RE.test(ne)||/[$#\[\]\/]/.test(ne)){toast("❌ البريد الإلكتروني غير صالح");return;}
    const fields={firstName:fn,lastName:ln};
    if(ph||u.phone)fields.phone=ph;
    if(g)fields.gender=g;
    const btn=$("euSave");btn.disabled=true;
    try{
      if(ne!==lc(email)){const done=await changeEmail(u,ne,fields);if(!done)btn.disabled=false;return;}
      const upd={};Object.entries(fields).forEach(([k,v])=>upd[`users/${u.key}/${k}`]=v);
      await update(ref(db),upd);
      Object.assign(u,fields);
      toast("✅ تم حفظ بيانات الحساب");
      $("modal").classList.remove("open");
      render();
    }catch(e){console.error(e);toast("❌ فشل الحفظ");btn.disabled=false;}
  };

  const acb=$("acCancelBtn");
  if(acb)acb.onclick=async()=>{
    const reason=$("acReason").value.trim();
    if(reason.length<3){toast("❌ اكتب سبب إلغاء الحساب الأول (هيظهر للعميل)");$("acReason").focus();return;}
    if(!confirm(`إلغاء حساب ${uName(u)}؟\n\nالسبب اللي هيظهر للعميل:\n${reason}`))return;
    acb.disabled=true;
    try{await cancelAccount(u,reason);toast("🚫 تم إلغاء الحساب");userDetail(u);render();}
    catch(e){console.error(e);toast("❌ فشل إلغاء الحساب");acb.disabled=false;}
  };
  const arb=$("acReactBtn");
  if(arb)arb.onclick=async()=>{
    if(!confirm(`إعادة تفعيل حساب ${uName(u)}؟`))return;
    arb.disabled=true;
    try{await reactivateAccount(u);toast("✅ تم إعادة تفعيل الحساب");userDetail(u);render();}
    catch(e){console.error(e);toast("❌ فشل إعادة التفعيل");arb.disabled=false;}
  };

  $("mbody").onclick=async e=>{
    const iv=e.target.closest("[data-inv]");
    if(iv){openInvoice(D.orders.find(x=>x.id===iv.dataset.inv));return;}
    const eb=e.target.closest("[data-aedit]");
    if(eb){const f=$("mbody").querySelector(`[data-aform="${CSS.escape(eb.dataset.aedit)}"]`);if(f)f.style.display=f.style.display==="none"?"grid":"none";return;}
    const sb=e.target.closest("[data-asave]");
    if(sb){
      const id=sb.dataset.asave,f=$("mbody").querySelector(`[data-aform="${CSS.escape(id)}"]`);
      const upd={updatedAt:new Date().toISOString()};
      f.querySelectorAll("[data-af]").forEach(i=>{upd[i.dataset.af]=i.value.trim();});
      if(!upd.name){toast("❌ اكتب اسم المستلم");return;}
      if((upd.phone&&!PHONE_RE.test(upd.phone))||(upd.phone2&&!PHONE_RE.test(upd.phone2))){toast("❌ أرقام الهاتف لازم تكون ١١ رقم وتبدأ بـ 01");return;}
      try{
        await update(ref(db,`userAddresses/${ek}/${id}`),upd);
        Object.assign((D.addr[ek]||[]).find(a=>a.id===id)||{},upd);
        toast("✅ تم حفظ العنوان");
        userDetail(u);
      }catch(err){console.error(err);toast("❌ فشل حفظ العنوان");}
      return;
    }
    const db_=e.target.closest("[data-adel]");
    if(db_){
      const id=db_.dataset.adel;
      if(!confirm("متأكد إنك عايز تحذف العنوان ده؟"))return;
      try{
        const wasDef=(D.addr[ek]||[]).find(a=>a.id===id)?.isDefault;
        await remove(ref(db,`userAddresses/${ek}/${id}`));
        D.addr[ek]=(D.addr[ek]||[]).filter(a=>a.id!==id);
        if(wasDef&&D.addr[ek][0]){await update(ref(db,`userAddresses/${ek}/${D.addr[ek][0].id}`),{isDefault:true});D.addr[ek][0].isDefault=true;}
        toast("🗑️ تم حذف العنوان");
        userDetail(u);render();
      }catch(err){console.error(err);toast("❌ فشل حذف العنوان");}
    }
  };
}

// ---------- ربط الأحداث ----------
function bind(){
  document.querySelectorAll("[data-order]").forEach(el=>el.onclick=e=>{if(e.target.closest(".zoomable"))return;const o=D.orders.find(x=>x.id===el.dataset.order);if(o)orderDetail(o);});
  document.querySelectorAll("[data-user]").forEach(el=>el.onclick=e=>{if(e.target.closest(".zoomable"))return;const u=D.users.find(x=>x.key===el.dataset.user);if(u)userDetail(u);});
  document.querySelectorAll("[data-comment]").forEach(el=>el.onclick=e=>{
    e.stopPropagation();
    if(Date.now()-(window._lpAt||0)<600)return;   // الكليك اللي جاي بعد الضغطة المطوّلة مباشرة — نتجاهله
    if(e.target.closest(".zoomable")||e.target.closest("[data-csel]")||e.target.closest("#cselAll"))return;
    if(el.tagName==="TR"&&window._csel&&window._csel.size&&!e.target.closest("button")){   // وضع التحديد: الضغطة العادية بتحدد/تلغي التحديد
      const k=el.dataset.comment;
      if(window._csel.has(k))window._csel.delete(k);else window._csel.add(k);
      render();return;
    }
    const [itemId,id]=el.dataset.comment.split("|");
    const c=D.comments.find(x=>x.itemId===itemId&&x.id===id);
    if(c)commentDetail(c);
  });
  // ضغطة مطوّلة على أي تعليق = يدخل وضع التحديد ويحدد التعليق ده
  document.querySelectorAll("tr[data-comment]").forEach(tr=>{
    let timer=null,sx=0,sy=0;
    const stop=()=>{if(timer){clearTimeout(timer);timer=null;}};
    tr.addEventListener("pointerdown",e=>{
      if(e.pointerType==="mouse"&&e.button!==0)return;
      if(e.target.closest("button,input,.zoomable"))return;
      sx=e.clientX;sy=e.clientY;stop();
      timer=setTimeout(()=>{
        timer=null;
        const k=tr.dataset.comment;
        window._lpAt=Date.now();
        if(window._csel.has(k))window._csel.delete(k);else window._csel.add(k);
        if(navigator.vibrate)try{navigator.vibrate(30);}catch(_){}
        render();
      },500);
    });
    tr.addEventListener("pointermove",e=>{if(timer&&Math.hypot(e.clientX-sx,e.clientY-sy)>10)stop();});
    ["pointerup","pointercancel","pointerleave"].forEach(ev=>tr.addEventListener(ev,stop));
    tr.addEventListener("contextmenu",e=>{if(window._lpAt&&Date.now()-window._lpAt<1500)e.preventDefault();});
  });
  document.querySelectorAll("[data-ac]").forEach(el=>el.onclick=()=>{window._ac=el.dataset.ac;render();});
  document.querySelectorAll("[data-react]").forEach(el=>el.onclick=async e=>{
    e.stopPropagation();
    const u=D.users.find(x=>x.key===el.dataset.react);if(!u)return;
    if(!confirm(`إعادة تفعيل حساب ${uName(u)}؟`))return;
    el.disabled=true;
    try{await reactivateAccount(u);toast("✅ تم إعادة تفعيل الحساب");render();}
    catch(err){console.error(err);toast("❌ فشل إعادة التفعيل");el.disabled=false;}
  });
  const of=$("ofilter");if(of)of.onchange=()=>{window._of=of.value;render();};
  document.querySelectorAll("[data-editord]").forEach(b=>b.onclick=e=>{e.stopPropagation();const o=D.orders.find(x=>x.id===b.dataset.editord);if(o)orderDetail(o,true);});
  const od1=$("od1");if(od1)od1.onchange=()=>{window._od1=od1.value;render();};
  const od2=$("od2");if(od2)od2.onchange=()=>{window._od2=od2.value;render();};
  document.querySelectorAll("[data-odp]").forEach(b=>b.onclick=e=>{
    e.stopPropagation();
    const k=b.dataset.odp,now=Date.now();
    if(k==="clear"){window._od1=window._od2="";}
    else{const n=k==="today"?0:parseInt(k)-1;window._od1=ymd(now-n*864e5);window._od2=ymd(now);}
    render();
  });
  const cf=$("cfilter");if(cf)cf.onchange=()=>{window._cf=cf.value;render();};
  const cs=$("csort");if(cs)cs.onchange=()=>{window._cs=cs.value;render();};
  document.querySelectorAll("[data-csel]").forEach(el=>el.onclick=e=>{
    e.stopPropagation();
    const k=el.dataset.csel;
    if(el.checked)window._csel.add(k);else window._csel.delete(k);
    render();
  });
  const cselAll=$("cselAll");
  if(cselAll)cselAll.onclick=e=>{
    e.stopPropagation();
    document.querySelectorAll("[data-comment]").forEach(el=>{
      if(el.tagName!=="TR")return;
      if(cselAll.checked)window._csel.add(el.dataset.comment);else window._csel.delete(el.dataset.comment);
    });
    render();
  };
  const clearSelBtn=$("clearSelBtn");
  if(clearSelBtn)clearSelBtn.onclick=()=>{window._csel.clear();render();};
  const delSelBtn=$("delSelBtn");
  if(delSelBtn)delSelBtn.onclick=async()=>{
    const keys=[...window._csel];
    if(!keys.length)return;
    if(!confirm(`متأكد إنك عايز تحذف ${keys.length} تعليق نهائياً من كل حتة؟`))return;
    delSelBtn.disabled=true;
    try{
      for(const k of keys){
        const [itemId,id]=k.split("|");
        await remove(ref(db,`comments/${itemId}/${id}`));
      }
      D.comments=D.comments.filter(x=>!window._csel.has(`${x.itemId}|${x.id}`));
      $("cntComments").textContent=fNum(D.comments.length);
      window._csel.clear();
      toast(`🗑️ تم حذف ${keys.length} تعليق نهائياً`);
      render();
    }catch(e){console.error(e);toast("❌ فشل حذف بعض التعليقات");delSelBtn.disabled=false;render();}
  };
  $("view").querySelectorAll("[data-inv]").forEach(el=>el.onclick=e=>{e.stopPropagation();openInvoice(D.orders.find(x=>x.id===el.dataset.inv));});
  $("view").querySelectorAll("[data-del]").forEach(el=>el.onclick=e=>{e.stopPropagation();askDeleteOrder(D.orders.find(x=>x.id===el.dataset.del));});
  document.querySelectorAll("[data-corder]").forEach(el=>el.onclick=()=>{const o=D.cancelled.find(x=>x.id===el.dataset.corder);if(o)cancelledDetail(o);});
  document.querySelectorAll("[data-stop]").forEach(el=>el.onclick=e=>e.stopPropagation());
  document.querySelectorAll("[data-wt]").forEach(b=>b.onclick=()=>{window._wt=b.dataset.wt;render();});
  document.querySelectorAll("#view [data-wle]").forEach(b=>b.onclick=()=>{const[k,i]=b.dataset.wle.split("|");openWalletEntry(k,i);});
  document.querySelectorAll("[data-wq]").forEach(b=>b.onclick=()=>{$("wqAmt").value=b.dataset.wq;});
  const wqEm=$("wqEmail");
  if(wqEm)wqEm.oninput=()=>{
    const u=D.users.find(x=>lc(x.email)===lc(wqEm.value));
    $("wqInfo").innerHTML=u?`✔️ <b>${esc(uName(u))}</b> — رصيده الحالي: <b style="color:#00a15c">${fMoney(Math.max(0,Number(((D.wallet||{})[eKey(u.email)]||{}).balance)||0))}</b>`:(wqEm.value?"مفيش عميل بالبريد ده":"");
  };
  const wqAdd=$("wqAdd");
  if(wqAdd)wqAdd.onclick=async()=>{
    const em=lc($("wqEmail").value),amt=r2($("wqAmt").value),note=$("wqNote").value.trim();
    const u=D.users.find(x=>lc(x.email)===em);
    if(!u){toast("❌ مفيش عميل بالبريد ده — اختاره من القائمة");return;}
    if(!(amt>0)){toast("❌ اكتب مبلغ صحيح");return;}
    if(!confirm(`إضافة ${fMoney(amt)} لرصيد ${uName(u)}؟`))return;
    wqAdd.disabled=true;
    try{
      await walletAdjust(u.email,amt,"credit",note);
      D.wallet=await loadWallets();
      toast("✅ تمت إضافة الرصيد");render();
    }catch(e){console.error(e);toast("❌ فشلت الإضافة — راجع Rules في Firebase");wqAdd.disabled=false;}
  };
  const gcSave=$("gcSave");
  if(gcSave)gcSave.onclick=async()=>{
    const levels={};
    document.querySelectorAll("[data-gl]").forEach(i=>{const a=r2(i.value);if(a>0)levels[i.dataset.gl]=a;});
    const times={};
    document.querySelectorAll("[data-gt]").forEach(i=>{const t=Math.round((Number(i.value)||0)*60);if(t>0)times[i.dataset.gt]=t;});
    const conf={times,visible:$("gcVisible").checked,enabled:$("gcEnabled").checked,approval:$("gcApproval").checked,maxLosses:Math.max(0,parseInt($("gcMaxLoss").value)||0),lockMinutes:Math.max(0,Number($("gcLockMin").value)||0),levels};
    gcSave.disabled=true;
    try{await set(ref(db,"gameConfig"),conf);D.gameCfg=conf;toast(conf.enabled?"✅ تم الحفظ — الجوائز شغالة":"✅ تم الحفظ — الجوائز متوقفة");}
    catch(e){console.error(e);toast("❌ فشل الحفظ — راجع Rules في Firebase");}
    gcSave.disabled=false;
  };
  const gcAct=async(raw,ok)=>{
    const [ek,lv]=raw.split("|"),c=((D.gameClaims||{})[ek]||{})[lv],u=D.users.find(x=>x.email&&eKey(x.email)===ek);
    if(!c||!u){toast("⚠️ مقدرتش ألاقي الطلب أو العميل");return;}
    if(!confirm(ok?`إضافة ${fMoney(c.amount)} لرصيد ${uName(u)}؟`:"رفض الجائزة دي؟"))return;
    try{
      if(ok)await walletAdjust(u.email,Number(c.amount)||0,"credit",`جائزة لعبة Gravity Surge — المستوى ${lv}`);
      await update(ref(db,`gameClaims/${ek}/${lv}`),{status:ok?"paid":"rejected",decidedAt:Date.now()});
      D.gameClaims=await loadGameClaims();D.wallet=await loadWallets();
      toast(ok?"✅ اتضافت للرصيد":"تم الرفض");render();
    }catch(e){console.error(e);toast("❌ فشلت العملية");}
  };
  document.querySelectorAll("[data-gcok]").forEach(b=>b.onclick=()=>gcAct(b.dataset.gcok,true));
  document.querySelectorAll("[data-gcno]").forEach(b=>b.onclick=()=>gcAct(b.dataset.gcno,false));
  ST_.bind();   // أحداث الإحصائيات والإيرادات (admin-stats.js)
  CP_.bind();   // أحداث أكواد الخصم (admin-coupons.js)
  hydratePhotos();
  document.querySelectorAll("[data-goto]").forEach(el=>el.onclick=()=>{view=el.dataset.goto;q="";$("q").value="";render();});
}

(()=>{const st=document.createElement("style");st.textContent="@media (pointer:coarse){tr[data-comment]{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}}";document.head.appendChild(st);})();
document.querySelectorAll(".nv[data-view]").forEach(b=>b.onclick=()=>{view=b.dataset.view;q="";$("q").value="";$("sb").classList.remove("open");render();});
let _qTimer=null;
$("q").addEventListener("input",e=>{
  const val=e.target.value.trim();
  clearTimeout(_qTimer);
  _qTimer=setTimeout(()=>{q=val;if(view!=="dashboard")render();},220);
});
$("refresh").onclick=()=>loadAll();
$("burger").onclick=()=>$("sb").classList.toggle("open");
$("adminLogout").onclick=()=>{clearAdminAuth();location.href="accoun.html";};

// ============================================================
//  🚚 بيانات التسليم — بتظهر لما تختار "تم التسليم": كاملة ولا على مراحل + اليوم والتاريخ
// ============================================================
const fDay=t=>t?new Date(t).toLocaleDateString("ar-EG",{weekday:"long",year:"numeric",month:"long",day:"numeric"}):"—";
const dateTs=v=>v?new Date(v+"T12:00:00").getTime():0;
const tsYmd=t=>t?ymd(t):"";
(()=>{
  const st=document.createElement("style");
  st.textContent=`#dlvModal{position:fixed;inset:0;background:rgba(15,23,42,.6);display:none;align-items:center;justify-content:center;z-index:360;padding:16px}
  #dlvModal.open{display:flex}
  .dlv-box{background:#fff;border-radius:14px;width:100%;max-width:520px;max-height:94vh;overflow:auto;padding:22px}
  .dlv-mode{display:flex;gap:10px;margin:14px 0}
  .dlv-mode label{flex:1;display:flex;align-items:center;gap:8px;border:2px solid var(--line);border-radius:10px;padding:11px 12px;font-weight:800;cursor:pointer}
  .dlv-mode label.on{border-color:var(--pri);background:#eaf1ff;color:var(--pri)}
  .dlv-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:8px}
  .dlv-day{font-size:12px;color:var(--pri);font-weight:800;min-width:90px}`;
  document.head.appendChild(st);
})();
function dlvSummary(o){
  const d=o.delivery;
  if(!d||!Array.isArray(d.parts)||!d.parts.length)return "";
  const rows=d.parts.map((p,i)=>`<div class="mini">${d.mode==="stages"?`<b>الدفعة ${fNum(i+1)}:</b> `:""}${esc(fDay(p.date))}${p.note?` <span class="mut">— ${esc(p.note)}</span>`:""}</div>`).join("");
  return `<div class="sub-t"><i class="fa-solid fa-circle-check"></i> بيانات التسليم — ${d.mode==="stages"?"على مراحل ("+fNum(d.parts.length)+" دفعات)":"تم التسليم كاملاً"}</div>${rows}
    <button type="button" class="btn" id="dlvEdit"><i class="fa-solid fa-pen"></i> تعديل بيانات التسليم</button>`;
}
function openDelivery(o,onDone){
  let m=$("dlvModal");
  if(!m){m=document.createElement("div");m.id="dlvModal";document.body.appendChild(m);m.addEventListener("click",e=>{if(e.target===m)m.classList.remove("open");});}
  const old=o.delivery&&Array.isArray(o.delivery.parts)?o.delivery:null;
  let mode=old?old.mode:"full";
  let parts=old?old.parts.map(p=>({date:tsYmd(p.date),note:p.note||""})):[{date:ymd(Date.now()),note:""}];
  const paint=()=>{
    m.innerHTML=`<div class="dlv-box">
      <div class="del-ico" style="background:#dcf8ec;color:#00a15c"><i class="fa-solid fa-truck-fast"></i></div>
      <h4 style="text-align:center;margin:0 0 4px;font-size:18px;font-weight:800">تسليم الطلب ${esc(o.code)}</h4>
      <div class="dlv-mode">
        <label class="${mode==="full"?"on":""}"><input type="radio" name="dlvMode" value="full"${mode==="full"?" checked":""}> تم تسليمها كاملة</label>
        <label class="${mode==="stages"?"on":""}"><input type="radio" name="dlvMode" value="stages"${mode==="stages"?" checked":""}> على مراحل</label>
      </div>
      <div class="mut" style="font-size:12.5px;margin-bottom:10px">${mode==="full"?"اختار يوم التسليم:":"اكتب تاريخ كل مرحلة تسليم (وممكن تكتب إيه اللي اتسلّم):"}</div>
      <div id="dlvRows">${(mode==="full"?parts.slice(0,1):parts).map((p,i)=>`<div class="dlv-row" data-i="${i}">
        ${mode==="stages"?`<b style="min-width:62px">دفعة ${fNum(i+1)}</b>`:""}
        <input type="date" class="inp" data-d value="${esc(p.date)}">
        <span class="dlv-day">${p.date?esc(fDay(dateTs(p.date))):""}</span>
        ${mode==="stages"?`<input class="inp" data-n placeholder="ملاحظة (اختياري)" value="${esc(p.note)}" style="flex:1;min-width:120px">${parts.length>1?`<button type="button" class="btn red" data-rm="${i}"><i class="fa-solid fa-xmark"></i></button>`:""}`:""}
      </div>`).join("")}</div>
      ${mode==="stages"?`<button type="button" class="btn" id="dlvAdd"><i class="fa-solid fa-plus"></i> إضافة مرحلة</button>`:""}
      <div class="del-err" id="dlvErr"></div>
      <div class="del-btns"><button type="button" class="btn solid" id="dlvOk"><i class="fa-solid fa-check"></i> حفظ التسليم</button><button type="button" class="btn" id="dlvCancel">إلغاء</button></div>
    </div>`;
    m.querySelectorAll('[name="dlvMode"]').forEach(r=>r.onchange=()=>{grab();mode=r.value;paint();});
    m.querySelectorAll("[data-d]").forEach(inp=>inp.onchange=()=>{grab();paint();});
    m.querySelectorAll("[data-rm]").forEach(b=>b.onclick=()=>{grab();parts.splice(+b.dataset.rm,1);paint();});
    const add=$("dlvAdd");if(add)add.onclick=()=>{grab();parts.push({date:ymd(Date.now()),note:""});paint();};
    $("dlvCancel").onclick=()=>m.classList.remove("open");
    $("dlvOk").onclick=save;
  };
  const grab=()=>{m.querySelectorAll(".dlv-row").forEach(r=>{const i=+r.dataset.i;if(!parts[i])return;parts[i].date=r.querySelector("[data-d]").value;const n=r.querySelector("[data-n]");if(n)parts[i].note=n.value.trim();});};
  const save=async()=>{
    grab();
    const use=(mode==="full"?parts.slice(0,1):parts);
    if(use.some(p=>!p.date)){$("dlvErr").textContent="لازم تحدد التاريخ لكل مرحلة";return;}
    const list=use.map(p=>({date:dateTs(p.date),...(p.note?{note:p.note}:{})})).sort((a,b)=>a.date-b.date);
    const delivery={mode,parts:list,at:list[list.length-1].date};
    $("dlvOk").disabled=true;
    const upd={};
    upd[`orders/${o.id}/stage`]=4;upd[`orders/${o.id}/delivery`]=delivery;
    if(o.email){const b=`userOrders/${eKey(o.email)}/${o.id}`;upd[`${b}/stage`]=4;upd[`${b}/delivery`]=delivery;}
    try{
      await update(ref(db),upd);
      o.stage=4;o.delivery=delivery;
      m.classList.remove("open");$("modal").classList.remove("open");
      toast("✅ تم حفظ التسليم");render();
      if(onDone)onDone();
    }catch(e){console.error(e);$("dlvErr").textContent="❌ فشل الحفظ";$("dlvOk").disabled=false;}
  };
  paint();m.classList.add("open");
}

// ============================================================
//  🧹 مسح جماعي — تختار إيه اللي يتمسح (وتحدد تاريخ لو عايز) وبعدين تأكد
// ============================================================
(()=>{
  const st=document.createElement("style");
  st.textContent=`#bulkModal{position:fixed;inset:0;background:rgba(15,23,42,.6);display:none;align-items:center;justify-content:center;z-index:350;padding:16px}
  #bulkModal.open{display:flex}
  .bk-box{background:#fff;border-radius:14px;width:100%;max-width:520px;max-height:94vh;overflow:auto;padding:22px}
  .bk-opt{display:flex;align-items:flex-start;gap:12px;border:1px solid var(--line);border-radius:10px;padding:12px 14px;margin-bottom:8px;cursor:pointer}
  .bk-opt:hover{background:#f9fafd}.bk-opt input{margin-top:4px;width:17px;height:17px;accent-color:var(--err)}
  .bk-opt b{display:block}.bk-opt small{color:var(--mut);line-height:1.7}
  .bk-n{margin-inline-start:auto;background:#eef1f6;border-radius:20px;padding:2px 10px;font-weight:800;font-size:12px;white-space:nowrap}`;
  document.head.appendChild(st);

  const oldEnough=(t,lim)=>!lim||((t||0)>0&&(t||0)<lim);
  const OPTS=[
    {id:"cancelled",ic:"fa-ban",t:"الطلبات الملغية",d:"حذف نهائي من قاعدة البيانات",
      list:lim=>D.cancelled.filter(o=>oldEnough(o.cancelledAt||o.createdAt,lim))},
    {id:"delivered",ic:"fa-circle-check",t:"الطلبات المسلّمة (تم التسليم)",d:"حذف نهائي — وهتتشال من الإيرادات والإحصائيات",
      list:lim=>D.orders.filter(o=>stepsDone(o)===4&&oldEnough(o.createdAt,lim))},
    {id:"allorders",ic:"fa-box-open",t:"كل الطلبات (الشغالة)",d:"حذف نهائي لكل الطلبات الحالية بأي حالة",
      list:lim=>D.orders.filter(o=>oldEnough(o.createdAt,lim))},
    {id:"revenue",ic:"fa-sack-dollar",t:"الإيرادات",d:"الإيرادات بتتحسب من الطلبات، فتصفيرها = حذف الطلبات اللي داخلة فيها (نفس مجموعة «كل الطلبات»)",
      list:lim=>D.orders.filter(o=>oldEnough(o.createdAt,lim))},
    {id:"stats",ic:"fa-chart-line",t:"الإحصائيات",d:"مسح بيانات الزيارات والتتبّع (analytics). «الأكثر مبيعاً» بتتحسب من الطلبات",
      list:()=>Object.keys(D.analytics||{}).length?[{k:"analytics"}]:[]},
    {id:"negcom",ic:"fa-thumbs-down",t:"التعليقات السلبية",d:"التعليقات اللي عليها علامة ⚠️ سلبي",
      list:lim=>D.comments.filter(c=>isNegative(c)&&oldEnough(c.createdAt,lim))},
    {id:"allcom",ic:"fa-comments",t:"كل التعليقات",d:"حذف نهائي من الموقع كله",
      list:lim=>D.comments.filter(c=>oldEnough(c.createdAt,lim))},
    {id:"expcp",ic:"fa-tag",t:"أكواد الخصم المنتهية والمتوقفة",d:"الأكواد اللي انتهت أو اتوقفت",
      list:()=>D.coupons.filter(c=>c.active===false||(c.expiresAt&&Date.now()>c.expiresAt))},
  ];
  const limit=()=>{const v=$("bkDate")?.value;return v?new Date(v+"T00:00:00").getTime():0;};

  function ensure(){
    let m=$("bulkModal");if(m)return m;
    m=document.createElement("div");m.id="bulkModal";
    m.innerHTML=`<div class="bk-box">
      <div class="del-ico"><i class="fa-solid fa-broom"></i></div>
      <h4 style="text-align:center;margin:0 0 6px;font-size:18px;font-weight:800">مسح جماعي</h4>
      <p style="text-align:center;color:#5e6e82;font-size:13px;margin:0 0 14px">اختار اللي عايز تمسحه — المسح نهائي ومفيش رجعة.</p>
      <div id="bkList"></div>
      <div style="display:flex;align-items:center;gap:8px;margin:12px 0;flex-wrap:wrap"><span style="font-weight:700;font-size:13px">امسح الأقدم من تاريخ (اختياري):</span><input type="date" id="bkDate" class="inp"></div>
      <p style="margin:6px 0;font-size:13px">اكتب <b>مسح</b> للتأكيد:</p>
      <input id="bkConfirm" class="inp" autocomplete="off" style="width:100%;text-align:center" placeholder="مسح">
      <div class="del-err" id="bkErr"></div>
      <div class="del-btns"><button type="button" class="btn red" id="bkOk" disabled><i class="fa-solid fa-trash-can"></i> <span id="bkOkT">مسح</span></button><button type="button" class="btn" id="bkCancel">إلغاء</button></div>
    </div>`;
    document.body.appendChild(m);
    m.addEventListener("click",e=>{if(e.target===m)m.classList.remove("open");});
    $("bkCancel").onclick=()=>m.classList.remove("open");
    $("bkDate").onchange=paint;
    $("bkConfirm").oninput=sync;
    $("bkOk").onclick=run;
    return m;
  }
  const picked=()=>OPTS.filter(o=>$("bk_"+o.id)?.checked);
  function paint(){
    const keep=new Set(picked().map(o=>o.id)),lim=limit();
    $("bkList").innerHTML=OPTS.map(o=>`<label class="bk-opt"><input type="checkbox" id="bk_${o.id}"${keep.has(o.id)?" checked":""}><div style="flex:1"><b><i class="fa-solid ${o.ic}" style="color:var(--err)"></i> ${o.t}</b><small>${o.d}</small></div><span class="bk-n">${fNum(o.list(lim).length)}</span></label>`).join("");
    OPTS.forEach(o=>$("bk_"+o.id).onchange=sync);
    sync();
  }
  function sync(){
    const lim=limit(),n=picked().reduce((s,o)=>s+o.list(lim).length,0);
    $("bkOk").disabled=!(n>0&&$("bkConfirm").value.trim()==="مسح");
    $("bkOkT").textContent=n?`مسح (${fNum(n)} عنصر)`:"مسح";
  }
  async function run(){
    const lim=limit(),sel=picked();
    const orders=new Map(),cmts=new Map(),cps=new Map();let wipeStats=false;
    sel.forEach(o=>o.list(lim).forEach(x=>{
      if(["cancelled","delivered","allorders","revenue"].includes(o.id))orders.set(x.id,x);
      else if(o.id==="expcp")cps.set(x.key,x);
      else if(o.id==="stats")wipeStats=true;
      else cmts.set(`${x.itemId}|${x.id}`,x);
    }));
    const total=orders.size+cmts.size+cps.size+(wipeStats?1:0);
    if(!total)return;
    $("bkOk").disabled=true;$("bkErr").textContent="";
    const upd={};
    orders.forEach((o,id)=>{
      if(D.orderRoot.has(id))upd[`orders/${id}`]=null;
      (D.uoPaths[id]||[]).forEach(([ek,oid])=>{upd[`userOrders/${ek}/${oid}`]=null;});
    });
    cmts.forEach(c=>{upd[`comments/${c.itemId}/${c.id}`]=null;});
    cps.forEach(c=>{upd[`coupons/${c.key}`]=null;});
    if(wipeStats)upd["analytics"]=null;
    try{
      const ks=Object.keys(upd);
      for(let i=0;i<ks.length;i+=200){const part={};ks.slice(i,i+200).forEach(k=>part[k]=null);await update(ref(db),part);}
      D.cancelled=D.cancelled.filter(o=>!orders.has(o.id));
      D.orders=D.orders.filter(o=>!orders.has(o.id));
      D.comments=D.comments.filter(c=>!cmts.has(`${c.itemId}|${c.id}`));
      D.coupons=D.coupons.filter(c=>!cps.has(c.key));
      if(wipeStats)D.analytics={};
      window._csel.clear();
      refreshCounts();
      $("cntComments").textContent=fNum(D.comments.length);
      const cc=$("cntCoupons");if(cc)cc.textContent=fNum(D.coupons.length);
      $("bulkModal").classList.remove("open");
      toast(`🧹 تم مسح ${fNum(total)} عنصر نهائياً`);
      render();
    }catch(e){console.error(e);$("bkErr").textContent="❌ فشل المسح — راجع Rules في Firebase وجرّب تاني";sync();}
  }
  $("bulkBtn").onclick=()=>{ensure();$("bkConfirm").value="";$("bkDate").value="";$("bkErr").textContent="";paint();$("bulkModal").classList.add("open");};
})();

loadAll();
loadProducts();