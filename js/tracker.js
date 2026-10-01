// ============================================================
//  📈 تتبّع الزيارات والضغطات (كشمير هوم) — ملف: js/tracker.js
//  بيسجّل في Firebase تحت المسار  analytics/  وبتقراه لوحة التحكم (admin-stats.js).
//
//  الاستخدام: ضيف السطر ده في كل صفحة قسم + صفحة المنتج (item.html) (عدّل المسار حسب مكان الصفحة):
//     <script type="module" src="../js/tracker.js"></script>
//     مثال من صفحة Furniture/feyat/feyat1.html →  ../../js/tracker.js
//
//  - صفحة المنتج (فيها ?col=...&docId=...)  → "زيارة" للمنتج وللقسم بتاعه (مرة لكل جلسة).
//  - صفحة القسم → "زيارة قسم". اسم القسم بيتحدد بالترتيب ده:
//       1) <body data-kashmir-cat="feyat">   2) <meta name="kashmir-category" content="feyat">
//       3) ?col=... في الرابط                4) اسم الفولدر بعد Furniture/ (مثلاً Furniture/feyat/feyat1.html ← feyat)
//    ⚠️ لازم اسم القسم يكون نفس قيمة col في روابط المنتجات (item.html?col=feyat&docId=1).
//  - أي ضغطة على لينك بيروح لـ item.html?col=..&docId=.. (من أي صفحة) → "ضغطة" للمنتج والقسم.
//  - بيسجّل كمان أعداد يومية تحت analytics/daily عشان لوحة التحكم تقارن الفترات وتكشف التراجع.
//  - حساب المشرف مش بيتحسب (للتجربة بحسابك: اكتب في Console:  localStorage.khCountAdmin=1 ).
//  - الملف مستقل: مش محتاج admin-config.js في نفس الفولدر (لو موجود بيقرا منه إيميل المشرف).
// ============================================================
import{initializeApp,getApps,getApp}from"https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import{getDatabase,ref,update,increment}from"https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

let ADMIN_EMAIL="oo9mar9988@gmail.com";
try{ADMIN_EMAIL=(await import("./admin-config.js")).ADMIN_EMAIL||ADMIN_EMAIL;}catch(e){/* عادي: بنستخدم الإيميل الافتراضي */}

const cfg={apiKey:"AIzaSyCCk0w_KHVCswjp16TSkNToRSSOjlPC5kE",authDomain:"data-customer-d722f.firebaseapp.com",databaseURL:"https://data-customer-d722f-default-rtdb.firebaseio.com/",projectId:"data-customer-d722f",storageBucket:"data-customer-d722f.firebasestorage.app",messagingSenderId:"398522341614",appId:"1:398522341614:web:99e0f897c61ec960cffbff"};
const db=getDatabase(getApps().length?getApp():initializeApp(cfg));

const day=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;};   // يوم النهارده (للتحليل اليومي)
const clean=s=>String(s??"").replace(/[.$#\[\]\/]/g,"_").slice(0,120);
const isAdmin=()=>!localStorage.getItem("khCountAdmin")&&(localStorage.getItem("kashmirSessionEmail")||"").trim().toLowerCase()===ADMIN_EMAIL.toLowerCase();

// مرة واحدة لكل جلسة (عشان الريفريش ما يزوّدش الرقم)
function firstTime(k){
  try{
    const s=JSON.parse(sessionStorage.getItem("khSeen")||"{}");
    if(s[k])return false;
    s[k]=1;sessionStorage.setItem("khSeen",JSON.stringify(s));
  }catch(e){}
  return true;
}
async function bump(paths){
  if(isAdmin())return;
  try{await update(ref(db),paths);}
  catch(e){
    console.warn("[tracker] فشل التسجيل:",e.code||"",e.message);
    if(/permission/i.test(e.message||""))console.warn('[tracker] Firebase رافض الكتابة — ضيف في Rules:  "analytics": { ".read": true, ".write": true }');
  }
}

export function trackProductView(col,docId){
  if(!col||!docId||!firstTime(`pv:${col}|${docId}`))return;
  const k=clean(`${col}-${docId}`),c=clean(col);
  bump({
    [`analytics/products/${k}/views`]:increment(1),
    [`analytics/products/${k}/col`]:String(col),
    [`analytics/products/${k}/docId`]:String(docId),
    [`analytics/categories/${c}/itemViews`]:increment(1),
    [`analytics/daily/${day()}/p/${k}/v`]:increment(1),
    [`analytics/daily/${day()}/c/${c}/iv`]:increment(1)
  });
}
export function trackProductClick(col,docId){
  if(!col||!docId)return;
  const k=clean(`${col}-${docId}`),c=clean(col);
  bump({
    [`analytics/products/${k}/clicks`]:increment(1),
    [`analytics/products/${k}/col`]:String(col),
    [`analytics/products/${k}/docId`]:String(docId),
    [`analytics/categories/${c}/itemClicks`]:increment(1),
    [`analytics/daily/${day()}/p/${k}/c`]:increment(1),
    [`analytics/daily/${day()}/c/${c}/ic`]:increment(1)
  });
}
export function trackCategoryView(col){
  if(!col||!firstTime(`cv:${col}`))return;
  bump({
    [`analytics/categories/${clean(col)}/views`]:increment(1),
    [`analytics/daily/${day()}/c/${clean(col)}/v`]:increment(1)
  });
}
window.kashmirTrack={product:trackProductView,click:trackProductClick,category:trackCategoryView};

// اسم القسم للصفحة الحالية
function guessCategory(P){
  const explicit=document.body?.dataset?.kashmirCat||document.querySelector('meta[name="kashmir-category"]')?.content||P.get("col");
  if(explicit)return explicit;
  const parts=location.pathname.split("/").filter(Boolean);
  const file=(parts.pop()||"").toLowerCase();
  if(file==="item.html")return "";
  const i=parts.map(s=>s.toLowerCase()).lastIndexOf("furniture");
  if(i<0||!parts[i+1])return "";
  try{return decodeURIComponent(parts[i+1]);}catch(e){return parts[i+1];}
}

// ---- تشغيل تلقائي ----
function start(){
  const P=new URLSearchParams(location.search);
  const col=P.get("col"),docId=P.get("docId");
  if(col&&docId)trackProductView(col,docId);
  else{const cat=guessCategory(P);if(cat)trackCategoryView(cat);}
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();

// ضغطة على أي لينك لصفحة منتج
document.addEventListener("click",e=>{
  const a=e.target.closest&&e.target.closest("a[href]");
  if(!a)return;
  let u;try{u=new URL(a.getAttribute("href"),location.href);}catch(_){return;}
  if(!/item\.html$/i.test(u.pathname))return;
  const c=u.searchParams.get("col"),d=u.searchParams.get("docId");
  if(c&&d)trackProductClick(c,d);
},true);