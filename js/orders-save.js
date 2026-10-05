// ============================================================
//  🧾 حفظ الطلب أول ما العميل يدوس "تأكيد الطلب والدفع" ثم تحويله لصفحة "الطلبات" في حسابه
//  الملف ده بيتحمّل في chexkout.html (type="module")
// ============================================================
import{initializeApp,getApps,getApp}from"https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import{getDatabase,ref,set,get,update,runTransaction}from"https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const cfg={apiKey:"AIzaSyCCk0w_KHVCswjp16TSkNToRSSOjlPC5kE",authDomain:"data-customer-d722f.firebaseapp.com",databaseURL:"https://data-customer-d722f-default-rtdb.firebaseio.com/",projectId:"data-customer-d722f",storageBucket:"data-customer-d722f.firebasestorage.app",messagingSenderId:"398522341614",appId:"1:398522341614:web:99e0f897c61ec960cffbff"};
const app=getApps().length?getApp():initializeApp(cfg);
const db=getDatabase(app);
const eKey=e=>e.replace(/\./g,"_").replace(/@/g,"__");

const ORDERS_URL="user/accoun.html?tab=orders";
const MAX_DAYS=7;                       // أقصى مدة لاستلام الطلب
const ONLINE_LABEL="دفع أونلاين";       // لازم يطابق data-label بتاع خيار الدفع في chexkout.html
let orderSaved=false;                   // اتحفظ طلب في الجلسة دي؟ (عشان التحويل)

// كود الطلب: KH-XXXXXX (من غير حروف/أرقام بتتلخبط زي 0 O 1 I)
function makeOrderCode(){
  const chars="ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let s="";for(let i=0;i<6;i++)s+=chars[Math.floor(Math.random()*chars.length)];
  return"KH-"+s;
}
const txt=(id)=>(document.getElementById(id)?.textContent||"").trim();

function readCart(){try{return JSON.parse(localStorage.getItem("cart"))||[];}catch(e){return[];}}

// ---------- كود الخصم المطبّق (لو فيه)، مخزّن من js/coupons.js ----------
function readAppliedCoupon(){try{return JSON.parse(localStorage.getItem("kashmirCoupon"))||null;}catch(e){return null;}}

function buildOrder(code){
  const email=(localStorage.getItem("kashmirSessionEmail")||document.getElementById("email")?.value||"").trim();
  const now=Date.now();
  const items=readCart().map(i=>{
    const it={
      name:String(i.name||i.title||"منتج"),
      price:Number(i.price)||0,
      qty:Number(i.quantity||i.qty||i.count||1)||1,
      img:String(i.img||i.image||i.imgSrc||i.photo||"")
    };
    // اللون + بيانات تعريف المنتج (Firebase مبيقبلش undefined، فبنضيف الحقل بس لو موجود)
    const color=String(i.color||i.colour||"").trim();
    if(color)it.color=color;
    if(i.id!==undefined&&i.id!==null&&i.id!=="")it.id=String(i.id);
    if(i.col)it.col=String(i.col);
    if(i.docId)it.docId=String(i.docId);
    return it;
  });
  const order={
    id:"o"+now.toString(36)+Math.random().toString(36).slice(2,5),
    code,
    email,
    createdAt:now,
    deadline:now+MAX_DAYS*24*60*60*1000,   // أقصى موعد للاستلام = بعد 7 أيام
    stage:0,                                // عدد الخطوات اللي عدّلتها يدوي (0..4) — الخطوتين الأوليين بيكتملوا تلقائي بالوقت (١٠ ثواني / دقيقة)
    items,
    total:document.querySelector(".total_checkout")?.textContent.trim()||"",
    subtotal:document.querySelector(".subtotal_checkout")?.textContent.trim()||"",
    shipping:txt("shipping_display"),
    packaging:txt("packaging_display"),
    payment:document.getElementById("paymentMethodInput")?.value||"",
    address:txt("cnAddressText"),
    addressType:txt("cnAddressType"),
    recipient:txt("cnRecipientName"),
    phone:txt("cnRecipientPhone"),
    notes:document.querySelector('textarea[name="Notes"]')?.value.trim()||"",
    leaveAtDoor:!!document.getElementById("leaveAtDoorCheckbox")?.checked
  };
  // كود الخصم (لو العميل طبّق واحد في السلة) — الرقم النهائي متسجّل خلاص جوه total فوق
  const coupon=readAppliedCoupon();
  if(coupon&&coupon.id&&coupon.code){
    order.couponId=String(coupon.id);
    order.couponCode=String(coupon.code);
    order.discountType=coupon.type==="fixed"?"fixed":"percent";
    order.discountValue=Number(coupon.value)||0;
  }
  return order;
}

// ---------- 💰 رصيدك ----------
const WALLET_LABEL=window.kashmirWalletLabel||"الدفع من الرصيد";
const r2=n=>Math.round((Number(n)||0)*100)/100;
const fmMoney=n=>Number(n||0).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})+" ج.م.";
// المبلغ اللي العميل اختار يدفعه من رصيده (محسوب في js/wallet.js)
function walletWanted(){const W=window.kashmirWallet||{};return W.on?r2(W.use):0;}
// يسجّل في الطلب المبلغ المخصوم من الرصيد، و order.total يبقى الباقي بعد الرصيد
function applyWallet(order,use){
  const W=window.kashmirWallet||{};
  const full=r2(W.total);
  order.walletUsed=use;
  order.totalBeforeWallet=full;
  order.total=fmMoney(Math.max(0,full-use));
  if(Math.max(0,full-use)<=0.005)order.payment=WALLET_LABEL;
}
const itemsDesc=order=>(order.items||[]).map(i=>i.name+(i.qty>1?" ×"+i.qty:"")).join("، ");
// خصم ذرّي من الرصيد (transaction) — لو الرصيد مش كفاية يرجّع false من غير ما يخصم
async function walletDeduct(order,use){
  const ek=eKey(order.email);
  const res=await runTransaction(ref(db,`wallet/${ek}/balance`),cur=>{
    const b=Number(cur)||0;
    if(b+0.0001<use)return;           // abort
    return r2(b-use);
  });
  if(!res.committed)return false;
  try{
    await set(ref(db,`wallet/${ek}/log/d_${order.id}`),{type:"debit",amount:use,at:Date.now(),orderId:order.id,orderCode:order.code,desc:itemsDesc(order)});
  }catch(e){console.error("wallet log failed",e);}
  return true;
}
async function walletRefund(order,use,note){
  const ek=eKey(order.email);
  try{
    await runTransaction(ref(db,`wallet/${ek}/balance`),cur=>r2((Number(cur)||0)+use));
    await set(ref(db,`wallet/${ek}/log/r_${order.id}`),{type:"refund",amount:use,at:Date.now(),orderId:order.id,orderCode:order.code,note:note||"استرجاع"});
  }catch(e){console.error("wallet refund failed",e);}
}

// حفظ الطلب في Firebase (نفس المسار العادي القديم)
async function persistOrder(order){
  localStorage.setItem("kashmirPendingOrder",JSON.stringify(order));
  if(!order.email)return;
  try{
    await set(ref(db,`userOrders/${eKey(order.email)}/${order.id}`),order);
    try{await set(ref(db,`orders/${order.id}`),order);}catch(e){console.error("orders/ write failed",e);}
    localStorage.removeItem("kashmirPendingOrder");
  }catch(e){console.error("order save failed",e);}
  if(order.couponId){
    try{
      const snap=await get(ref(db,`coupons/${order.couponId}/usedCount`));
      const cur=snap.exists()?(Number(snap.val())||0):0;
      const ek=eKey(order.email);
      const ubSnap=await get(ref(db,`coupons/${order.couponId}/usedBy/${ek}`));
      const curForMe=ubSnap.exists()?(Number(ubSnap.val())||0):0;
      await update(ref(db),{
        [`coupons/${order.couponId}/usedCount`]:cur+1,
        [`coupons/${order.couponId}/usedBy/${ek}`]:curForMe+1
      });
    }catch(e){console.error("coupon usedCount update failed",e);}
    localStorage.removeItem("kashmirCoupon");
  }
}

// طلب بيستخدم الرصيد (كله أو جزء) بالدفع العادي: نمنع المسار القديم ونكمل بنفسنا بعد ما الخصم يتأكد
let placing=false;
async function placeWalletOrder(form,codeInput,btn,use){
  if(placing||orderSaved)return;
  placing=true;
  const oldText=btn.textContent;
  btn.disabled=true;btn.textContent="جاري تأكيد الطلب...";
  try{
    const code=makeOrderCode();
    codeInput.value=code;
    const order=buildOrder(code);
    if(!order.email)throw new Error("سجّل الدخول الأول عشان تستخدم رصيدك");
    applyWallet(order,use);
    const ok=await walletDeduct(order,use);
    if(!ok)throw new Error("رصيدك الحالي مش كفاية. حدّث الصفحة وجرّب تاني.");
    orderSaved=true;
    await persistOrder(order);
    // نبعت للشيت (Google Script) — الـ hook تحت هو اللي بيفضّي السلة ويحوّل لصفحة الطلبات
    fetch(form.action,{method:"POST",body:new FormData(form)}).catch(()=>{});
  }catch(err){
    console.error("wallet order failed:",err);
    const m=err&&err.message||"";
    alert(/[\u0600-\u06FF]/.test(m)?m:"حصلت مشكلة وإحنا بنأكد الطلب. حاول تاني.");
    placing=false;
    btn.textContent=oldText;
    if(window.refreshPayButtonState)window.refreshPayButtonState();
  }
}

// ---------- 💳 الدفع الأونلاين (EasyKash) ----------
// الطلب بيتحفظ "معلّق" في paymentOrders، ومبيظهرش في طلبات العميل ولا عندك غير لما EasyKash يأكد الدفع (السيرفر بس هو اللي بيعمل كده).
let paying=false;
async function startOnlinePayment(btn){
  if(paying)return;
  paying=true;
  const oldText=btn.textContent;
  btn.disabled=true;
  btn.textContent="جاري تحويلك لصفحة الدفع...";
  let order=null,walletTaken=0;
  try{
    order=buildOrder(makeOrderCode());
    if(!order.email)throw new Error("سجّل الدخول الأول عشان تكمل الدفع الأونلاين");
    order.payment=document.getElementById("paymentMethodInput").value||ONLINE_LABEL;
    // اسم الطريقة (card / wallet / fawry / aman / meeza) من الكارت المختار — السيرفر هو اللي يحوّله لرقم EasyKash
    const method=(document.querySelector(".cn-pay-option.active")?.dataset.method||"").replace(/^online-?/,"");
    // رصيد جزئي + دفع أونلاين: نخصم من الرصيد الأول، والباقي (order.total) يتدفع أونلاين
    const wUse=walletWanted();
    if(wUse>0){
      applyWallet(order,wUse);
      if(!(await walletDeduct(order,wUse)))throw new Error("رصيدك الحالي مش كفاية. حدّث الصفحة وجرّب تاني.");
      walletTaken=wUse;
    }
    await set(ref(db,`paymentOrders/${order.id}`),{order,state:"pending",createdAt:Date.now()});
    const res=await fetch("/api/create-payment",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({orderId:order.id,method})});
    const data=await res.json().catch(()=>({}));
    if(!res.ok||!data.url)throw new Error(data.error||"payment_init_failed");
    location.href=data.url;
  }catch(err){
    console.error("online payment failed:",err);
    if(walletTaken>0&&order)await walletRefund(order,walletTaken,"استرجاع — تعذّر بدء الدفع الأونلاين");
    const m=err&&err.message||"";
    alert(/[\u0600-\u06FF]/.test(m)?m:"تعذّر بدء الدفع الأونلاين. حاول تاني أو اختر طريقة دفع تانية.");
    paying=false;
    btn.textContent=oldText;
    if(window.refreshPayButtonState)window.refreshPayButtonState();
  }
}

const form=document.getElementById("form_contact");
if(form){
  // كود الطلب يتحط في الفورم قبل الإرسال عشان يوصلك في الشيت (Google Sheet) كمان
  let codeInput=document.getElementById("order_code");
  if(!codeInput){codeInput=document.createElement("input");codeInput.type="hidden";codeInput.id="order_code";codeInput.name="OrderCode";form.appendChild(codeInput);}

  // capture=true عشان نشتغل قبل أي submit handler تاني
  form.addEventListener("submit",async(e)=>{
    const btn=document.getElementById("cnSubmitBtn");
    if(!btn||!btn.classList.contains("ready"))return;     // الفورم مش جاهز → الصفحة نفسها هتمنع الإرسال
    // 💳 دفع أونلاين: نوقف المسار العادي (الشيت + التحويل لصفحة الطلبات) ونحوّل العميل لصفحة الدفع
    if(String(document.getElementById("paymentMethodInput")?.value||"").startsWith(ONLINE_LABEL)){
      e.preventDefault();
      e.stopImmediatePropagation();
      startOnlinePayment(btn);
      return;
    }
    // 💰 استخدام الرصيد (دفع كامل أو جزئي بالطريقة العادية)
    const wUse=walletWanted();
    if(wUse>0){
      e.preventDefault();
      e.stopImmediatePropagation();
      placeWalletOrder(form,codeInput,btn,wUse);
      return;
    }
    if(orderSaved)return;

    const code=makeOrderCode();
    codeInput.value=code;
    const order=buildOrder(code);
    orderSaved=true;

    // نسخة احتياطية في localStorage (لو الصفحة اتقفلت قبل ما Firebase يخلص، صفحة الحساب هتكمل الحفظ)
    localStorage.setItem("kashmirPendingOrder",JSON.stringify(order));
    if(order.email){
      try{
        await set(ref(db,`userOrders/${eKey(order.email)}/${order.id}`),order);
        try{await set(ref(db,`orders/${order.id}`),order);}catch(e){console.error("orders/ write failed",e);}   // نسخة عامة تشوفها انت كصاحب المحل
        localStorage.removeItem("kashmirPendingOrder");
      }catch(e){console.error("order save failed",e);}
      // زوّد عداد استخدام كود الخصم (لو اتطبق كود) وامسحه من السلة عشان الطلب اللي بعده يبدأ نضيف
      if(order.couponId){
        try{
          const snap=await get(ref(db,`coupons/${order.couponId}/usedCount`));
          const cur=snap.exists()?(Number(snap.val())||0):0;
          const ek=eKey(order.email);
          const ubSnap=await get(ref(db,`coupons/${order.couponId}/usedBy/${ek}`));
          const curForMe=ubSnap.exists()?(Number(ubSnap.val())||0):0;
          await update(ref(db),{
            [`coupons/${order.couponId}/usedCount`]:cur+1,
            [`coupons/${order.couponId}/usedBy/${ek}`]:curForMe+1
          });
        }catch(e){console.error("coupon usedCount update failed",e);}
        localStorage.removeItem("kashmirCoupon");
      }
    }
  },true);
}

// بعد ما الطلب يتبعت لـ Google Script بنجاح → حوّل العميل لصفحة الطلبات
// (بنراقب fetch بدل ما نعدّل submit_checkout.js)
const _fetch=window.fetch;
window.fetch=function(...args){
  const p=_fetch.apply(this,args);
  try{
    const u=String(args[0]&&args[0].url||args[0]||"");
    if(u.includes("script.google.com")){
      p.finally(()=>{
        if(!orderSaved)return;
        // العميل اشترى خلاص → نفضّي السلة عشان المنتجات ماتفضلش فيها
        try{localStorage.setItem("cart","[]");}catch(e){}
        setTimeout(()=>{location.href=ORDERS_URL;},700);
      });
    }
  }catch(e){}
  return p;
};
window.kashmirGoToOrders=()=>{location.href=ORDERS_URL;};