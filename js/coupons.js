// ============================================================
//  🏷️ كود الخصم (كشمير هوم) — ملف: js/coupons.js
//  بيتحمّل في cart.html و chexkout.html.
//  - في السلة: بيربط حقل "عندك كود خصم؟" (.copon_input / .copon) بفايربيز، وبيتحقق من
//    الصلاحية وعدد الاستخدامات والتخصيص (إيميل/اسم)، وبيخصم من الإجمالي فوراً.
//  - في صفحة الدفع: بيعرض الكود المطبّق (لو موجود) في صف "تم خصم" وبيفضل الخصم شغال
//    في .total_checkout عشان orders-save.js يسجّله صح مع الطلب.
//  - بعد ما الطلب يتسجّل، orders-save.js هو اللي بيزوّد عداد الاستخدام usedCount.
// ============================================================
import{initializeApp,getApps,getApp}from"https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import{getDatabase,ref,get}from"https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const cfg={apiKey:"AIzaSyCCk0w_KHVCswjp16TSkNToRSSOjlPC5kE",authDomain:"data-customer-d722f.firebaseapp.com",databaseURL:"https://data-customer-d722f-default-rtdb.firebaseio.com/",projectId:"data-customer-d722f",storageBucket:"data-customer-d722f.firebasestorage.app",messagingSenderId:"398522341614",appId:"1:398522341614:web:99e0f897c61ec960cffbff"};
const app=getApps().length?getApp():initializeApp(cfg);
const db=getDatabase(app);

const STORE_KEY="kashmirCoupon";
const eKey=e=>String(e||"").replace(/\./g,"_").replace(/@/g,"__");
const normName=s=>String(s||"").replace(/[\u064B-\u065F\u0640]/g,"").replace(/[أإآ]/g,"ا").replace(/ى/g,"ي").replace(/ة/g,"ه").replace(/\s+/g," ").trim().toLowerCase();
const fNum=n=>Number(n||0).toLocaleString("ar-EG");
const money=s=>{
  if(typeof s==="number")return s;
  const t=String(s||"").replace(/[٠-٩]/g,d=>"٠١٢٣٤٥٦٧٨٩".indexOf(d)).replace(/[٬,]/g,"").replace("٫",".");
  const m=t.match(/\d+(\.\d+)?/);return m?parseFloat(m[0]):0;
};

function toast(msg,type="info"){
  const t=document.getElementById("toast");
  if(!t){alert(msg);return;}
  t.textContent=msg;
  t.className="toast "+type+" show";
  clearTimeout(t._couponToastTimer);
  t._couponToastTimer=setTimeout(()=>t.classList.remove("show"),3500);
}

// سبينر دوران بسيط على زرار "تطبيق" وقت التحقق من الكود — متضاف مرة واحدة، من غير ما نلمس ملفات الـ CSS
function ensureSpinnerStyle(){
  if(document.getElementById("kashmirCouponSpinnerStyle"))return;
  const st=document.createElement("style");
  st.id="kashmirCouponSpinnerStyle";
  st.textContent=`
    @keyframes kashmirCouponSpin{to{transform:rotate(360deg)}}
    .copon-spinner{display:inline-block;width:15px;height:15px;border:2px solid rgba(255,255,255,.45);border-top-color:#fff;border-radius:50%;animation:kashmirCouponSpin .6s linear infinite;vertical-align:middle}
    button.copon:disabled{opacity:.85;cursor:not-allowed}
  `;
  document.head.appendChild(st);
}
const wait=ms=>new Promise(r=>setTimeout(r,ms));

function getApplied(){try{return JSON.parse(localStorage.getItem(STORE_KEY))||null;}catch(e){return null;}}
function setApplied(c){if(c)localStorage.setItem(STORE_KEY,JSON.stringify(c));else localStorage.removeItem(STORE_KEY);}
window.kashmirClearCoupon=function(){setApplied(null);paint();toast("تم إلغاء كود الخصم","info");};

function currentUser(){
  const email=localStorage.getItem("kashmirSessionEmail")||"";
  let name="";
  try{const u=JSON.parse(localStorage.getItem("kashmirUser")||"null");if(u)name=[u.firstName,u.lastName].filter(Boolean).join(" ")||u.name||"";}catch(e){}
  return{email,name};
}

// ---------- التحقق من الكود ----------
function validate(coupon,subtotal){
  const now=Date.now();
  if(!coupon) return{ok:false,msg:"الكود ده غلط"};
  if(coupon.active===false) return{ok:false,msg:"الكود ده متوقف حالياً"};
  if(coupon.startAt&&now<coupon.startAt) return{ok:false,msg:"الكود ده لسه مبدأش"};
  if(coupon.expiresAt&&now>coupon.expiresAt) return{ok:false,msg:"انتهت صلاحية الكود ده"};
  if(coupon.maxUses&&(coupon.usedCount||0)>=coupon.maxUses) return{ok:false,msg:"الكود ده خلص من الاستخدام"};
  if(coupon.minOrder&&subtotal<coupon.minOrder) return{ok:false,msg:`أقل قيمة للطلب عشان تستخدم الكود ${fNum(coupon.minOrder)} ج.م.`};
  if(coupon.maxUsesPerCustomer){
    const{email}=currentUser();
    if(!email) return{ok:false,msg:"سجّل الدخول الأول عشان تستخدم الكود ده"};
    const usedByMe=(coupon.usedBy&&coupon.usedBy[eKey(email)])||0;
    if(usedByMe>=coupon.maxUsesPerCustomer) return{ok:false,msg:"استخدمت الكود ده قبل كده بالحد المسموح به"};
  }
  if(coupon.targetType==="email"){
    const{email}=currentUser();
    if(!email) return{ok:false,msg:"سجّل الدخول الأول عشان تستخدم الكود ده"};
    if(String(coupon.targetValue||"").toLowerCase()!==email.toLowerCase()) return{ok:false,msg:"الكود ده مخصص لعميل تاني"};
  }
  if(coupon.targetType==="name"){
    const{name}=currentUser();
    if(!name) return{ok:false,msg:"سجّل الدخول الأول عشان تستخدم الكود ده"};
    if(normName(coupon.targetValue)!==normName(name)) return{ok:false,msg:"الكود ده مخصص لعميل تاني"};
  }
  return{ok:true};
}

function computeDiscount(coupon,subtotal){
  let d=coupon.type==="percent"?subtotal*(Number(coupon.value)||0)/100:(Number(coupon.value)||0);
  if(coupon.type==="percent"&&coupon.maxDiscount) d=Math.min(d,Number(coupon.maxDiscount));
  return Math.max(0,Math.min(Math.round(d),subtotal));
}

let couponsCache=null;
async function loadAllCoupons(force){
  if(couponsCache&&!force) return couponsCache;
  try{
    const snap=await get(ref(db,"coupons"));
    couponsCache=snap.exists()?Object.entries(snap.val()).map(([id,c])=>({id,...c})):[];
  }catch(e){
    console.error("coupons load failed",e);
    couponsCache=couponsCache||[];
  }
  return couponsCache;
}

async function findCouponByCode(code){
  const norm=String(code||"").trim().toUpperCase();
  if(!norm) return null;
  const all=await loadAllCoupons();
  return all.find(c=>String(c.code||"").toUpperCase()===norm)||null;
}

// من كل الأكواد المتاحة، هات أفضل كود "تلقائي" (autoApply) ينطبق على السلة الحالية من غير ما العميل يكتب حاجة
function bestAutoCoupon(subtotal){
  const list=couponsCache||[];
  let best=null,bestDiscount=0;
  for(const c of list){
    if(!c.autoApply) continue;
    if(!validate(c,subtotal).ok) continue;
    const d=computeDiscount(c,subtotal);
    if(d>bestDiscount){bestDiscount=d;best=c;}
  }
  return best;
}

// ---------- تطبيق كود جديد (بيتنادى من زرار "تطبيق" في السلة) ----------
async function applyCode(rawCode,btn){
  const code=String(rawCode||"").trim();
  if(!code){toast("اكتب كود الخصم الأول","error");return;}
  const originalHTML=btn?btn.innerHTML:"";
  if(btn){
    btn.disabled=true;
    btn.innerHTML='<span class="copon-spinner"></span>';
  }
  const startedAt=Date.now();
  try{
    const coupon=await findCouponByCode(code);
    const subtotal=readSubtotal();
    const v=validate(coupon,subtotal);
    await wait(Math.max(0,2000-(Date.now()-startedAt))); // نضمن إن الدايرة تدور ٢ ثانية على الأقل
    if(!v.ok){toast("❌ "+v.msg,"error");return;}
    setApplied({...coupon,appliedAt:Date.now()});
    toast("✅ تم تطبيق كود الخصم","success");
    paint();
  }catch(e){
    console.error("coupon apply failed",e);
    await wait(Math.max(0,2000-(Date.now()-startedAt)));
    toast("❌ تعذّر التحقق من الكود دلوقتي","error");
  }finally{
    if(btn){btn.disabled=false;btn.innerHTML=originalHTML;}
  }
}

// ---------- الرسم على الشاشة ----------
function readSubtotal(){
  const el=document.querySelector(".subtotal_checkout");
  return el?money(el.textContent):0;
}

let cleanTotal=null;   // آخر إجمالي "نضيف" (قبل الخصم) اللي حسبه main.js
let selfWrite=false;

function paint(){
  const subtotal=readSubtotal();
  const manual=getApplied();
  const manualOk=manual&&validate(manual,subtotal).ok;
  const auto=manualOk?null:bestAutoCoupon(subtotal);
  const applied=manualOk?manual:auto;
  const isAuto=!manualOk&&!!auto;

  const pctEls=document.querySelectorAll(".discount_percent");
  const row=document.getElementById("cnDiscountRow");
  const inputBox=document.querySelector(".copon_main");

  if(!applied){
    pctEls.forEach(el=>el.textContent="0%");
    if(row)row.style.display="none";
    if(inputBox){
      inputBox.classList.remove("copon-applied");
      const note=inputBox.querySelector(".copon-note");
      if(note)note.remove();
    }
    return;
  }

  const discount=computeDiscount(applied,subtotal);
  const base=cleanTotal===null?readTotal():cleanTotal;

  selfWrite=true;
  pctEls.forEach(el=>el.textContent=applied.type==="percent"?`${fNum(applied.value)}%`:`${fNum(discount)} ج`);
  document.querySelectorAll(".total_checkout").forEach(el=>{el.textContent=`${fNum(Math.max(0,base-discount))} ج`;});
  if(row)row.style.display="";
  requestAnimationFrame(()=>{selfWrite=false;});

  // في السلة: نبدّل شكل الفورم لحالة "في خصم شغال" (كود مكتوب يدوي أو خصم تلقائي)
  if(inputBox){
    inputBox.classList.add("copon-applied");
    let note=inputBox.querySelector(".copon-note");
    if(!note){
      note=document.createElement("div");
      note.className="copon-note";
      note.style.cssText="margin-top:8px;font-size:12.5px;color:#2e7d32;display:flex;align-items:center;gap:8px;flex-wrap:wrap";
      inputBox.appendChild(note);
    }
    if(isAuto){
      note.innerHTML=`<span>🎉 اتطبق عليك خصم تلقائي لأن طلبك أكتر من ${fNum(applied.minOrder||0)} ج.م.</span>`;
    }else{
      note.innerHTML=`<span>✅ الكود <b dir="ltr">${applied.code}</b> مطبّق</span><a href="#" id="couponRemoveLink" style="color:#c81e37;text-decoration:underline">إلغاء</a>`;
      note.querySelector("#couponRemoveLink")?.addEventListener("click",e=>{e.preventDefault();window.kashmirClearCoupon();});
    }
  }
}
function readTotal(){
  const el=document.querySelector(".total_checkout");
  return el?money(el.textContent):0;
}

function observeTotals(){
  document.querySelectorAll(".total_checkout").forEach(el=>{
    cleanTotal=money(el.textContent);
    const mo=new MutationObserver(()=>{
      if(selfWrite)return;
      cleanTotal=money(el.textContent);
      paint();
    });
    mo.observe(el,{childList:true,characterData:true,subtree:true});
  });
  document.querySelectorAll(".subtotal_checkout").forEach(el=>{
    const mo=new MutationObserver(()=>paint());
    mo.observe(el,{childList:true,characterData:true,subtree:true});
  });
}

function bindCartInput(){
  const input=document.querySelector(".copon_input");
  const btn=document.querySelector(".copon");
  if(!input||!btn)return;
  ensureSpinnerStyle();
  const applied=getApplied();
  if(applied)input.value=applied.code;
  btn.addEventListener("click",e=>{e.preventDefault();applyCode(input.value,btn);});
  input.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();applyCode(input.value,btn);}});
}

// لو الكود المطبّق بقى غير صالح (اتشال/خلصت صلاحيته) وقت تحميل صفحة الدفع، منسيبوش يتسجل غلط
async function revalidateOnLoad(){
  const applied=getApplied();
  if(!applied)return;
  try{
    const fresh=await findCouponByCode(applied.code);
    const subtotal=readSubtotal();
    const v=validate(fresh,subtotal);
    if(!v.ok){
      setApplied(null);
      toast("⚠️ "+v.msg+" — تم إلغاء الخصم من طلبك","error");
    }else{
      setApplied({...fresh,appliedAt:applied.appliedAt});
    }
  }catch(e){/* لو فشل النت، نسيب الكود المخزّن زي ما هو */}
  paint();
}

document.addEventListener("DOMContentLoaded",async()=>{
  observeTotals();
  bindCartInput();
  await loadAllCoupons();
  await revalidateOnLoad();
  paint();
});