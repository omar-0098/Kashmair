// ============================================================
//  📊 الإحصائيات + الإيرادات (كشمير هوم) — ملف: js/admin-stats.js
//  اتنقلوا من admin.js لملف لوحدهم. admin.js بيستدعي initStats() مرة واحدة
//  وبياخد منها: vStats (الإحصائيات) و vRevenue (الإيرادات) و bind (ربط الأزرار).
//
//  🔧 أسماء الأقسام بالعربي: عدّل CAT_NAMES تحت (المفتاح = قيمة col في رابط المنتج).
// ============================================================
import{createInsights}from"./admin-insights.js";

// ---------- ستايل تبويبات قسم العروض ----------
(function(){
  if(document.getElementById("ofTabsCss"))return;
  const st=document.createElement("style");st.id="ofTabsCss";
  st.textContent=".oftabs{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;padding:6px 16px 12px}"+
  ".oftab{position:relative;display:flex;flex-direction:column;align-items:center;gap:3px;padding:10px 6px;border:2px solid var(--line,#e3e6ee);border-radius:14px;background:none;cursor:pointer;font:inherit;color:inherit}"+
  ".oftab .n{position:absolute;top:6px;right:8px;font-size:11px;font-weight:900;opacity:.55}"+
  ".oftab i{font-size:18px;color:var(--pri)}.oftab .t{font-weight:900;font-size:13px}.oftab small{font-size:10px;opacity:.6}"+
  ".oftab .ok{position:absolute;top:5px;left:8px;color:#1b8a3a;font-size:13px}"+
  ".oftab.on{background:var(--pri);border-color:var(--pri);color:#fff}.oftab.on i,.oftab.on .ok{color:#fff}"+
  ".ofguide{margin:4px 16px 12px;padding:10px 14px;border-radius:12px;background:#eef4ff;font-size:13px;line-height:1.8;font-weight:600}"+
  ".ofnext{display:flex;justify-content:space-between;gap:10px;padding:10px 16px 14px}";
  document.head.appendChild(st);
})();

// لو الصورة النسبية ما اتلقتش محلياً (مثلاً فولدر الصور مش موجود على جهازك) جرّبها من الموقع الأونلاين مرة واحدة
if(!window.__ofImgFallback){window.__ofImgFallback=true;
  document.addEventListener("error",e=>{
    const im=e.target;if(!im||im.tagName!=="IMG")return;
    if(im.dataset.fb){if(!im.dataset.fb2){im.dataset.fb2="1";im.src="data:image/svg+xml;utf8,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%27200%27 height=%27200%27%3E%3Crect width=%27200%27 height=%27200%27 fill=%27%23eceff4%27/%3E%3Ctext x=%27100%27 y=%27108%27 font-size=%2714%27 text-anchor=%27middle%27 fill=%27%239aa3b2%27 font-family=%27sans-serif%27%3Eno image%3C/text%3E%3C/svg%3E";}return;}
    const src=im.getAttribute("src")||"";if(!src||/^(https?:)?\/\/|^data:/.test(src)){if(src&&!/^data:/.test(src)){im.dataset.fb="1";im.dataset.fb2="1";im.src="data:image/svg+xml;utf8,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%27200%27 height=%27200%27%3E%3Crect width=%27200%27 height=%27200%27 fill=%27%23eceff4%27/%3E%3Ctext x=%27100%27 y=%27108%27 font-size=%2714%27 text-anchor=%27middle%27 fill=%27%239aa3b2%27 font-family=%27sans-serif%27%3Eno image%3C/text%3E%3C/svg%3E";}return;}
    im.dataset.fb="1";im.src="https://kashmair.vercel.app/"+src.replace(/^(\.\.\/|\.\/)+/,"");
  },true);
}

export function initStats(ctx){
const{D,$,esc,fNum,fDT,money,toast,ST,stepsDone,findProduct,emptyBox,match,render,loadH2C,fb,isNegative,openModal}=ctx;

// ---------- الإحصائيات (المنتجات والأقسام: مبيعات + زيارات + ضغطات) ----------
// أسماء الأقسام: المفتاح = قيمة col في رابط المنتج (item.html?col=...). اكتب الاسم العربي اللي عايز يظهر.
// مثال:  const CAT_NAMES={ towels:"الفوط", sheets:"الملايات" };
const CAT_NAMES={};
const catName=c=>CAT_NAMES[c]||c||"غير محدد";
const sKey=s=>String(s??"").replace(/[.$#\[\]\/]/g,"_");
const nrm=s=>String(s||"").replace(/\s+/g," ").trim().toLowerCase();
// تطبيع أقوى للأسماء (بيشيل التشكيل والتطويل ويوحّد أ/إ/آ و ة/ه و ى/ي) عشان اسم المنتج في الطلب يطابق اسمه في ملف المنتجات
const normName=s=>String(s||"").replace(/[\u064B-\u065F\u0640]/g,"").replace(/[أإآ]/g,"ا").replace(/ى/g,"ي").replace(/ة/g,"ه").replace(/[^\p{L}\p{N}]+/gu," ").trim().toLowerCase();
const imgKey=u=>{const s=String(u||"").split(/[?#]/)[0].split("/").pop();try{return decodeURIComponent(s).toLowerCase();}catch(e){return s.toLowerCase();}};
let _ix=null,_ixN=-1;
function prodIndex(){
  const list=[...new Set(Object.values(D.products||{}))].filter(Boolean);
  if(_ix&&_ixN===list.length)return _ix;
  const name={},img={};
  list.forEach(p=>{
    const n=normName(p.name||p.title);if(n&&!name[n])name[n]=p;
    const im=imgKey(p.img||p.image);if(im&&!img[im])img[im]=p;
  });
  _ix={list,name,img};_ixN=list.length;return _ix;
}

// بيحدد المنتج اللي جوه الطلب: (col+docId) ← id مركّب ← الاسم ← اسم ملف الصورة ← id/docId لوحده ← الاسم جزئياً
function resolveItem(it){
  const pid=it.id??it.itemId??it.productId;
  const ix=prodIndex();
  let p=null;
  if(it.col&&it.docId)p=findProduct(`${it.col}-${it.docId}`);
  if(!p&&pid!==undefined&&pid!==null&&String(pid).includes("-"))p=findProduct(pid);
  if(!p){const n=normName(it.name);if(n)p=ix.name[n]||null;}
  if(!p&&it.img)p=ix.img[imgKey(it.img)]||null;
  if(!p&&it.docId)p=findProduct(it.docId)||null;
  if(!p&&pid!==undefined&&pid!==null)p=findProduct(pid)||null;
  if(!p){                                   // مطابقة جزئية (الاسم في الطلب فيه إضافة زي اللون/المقاس)
    const n=normName(it.name);
    if(n.length>=6)p=ix.list.find(x=>{const m=normName(x.name||x.title);return m.length>=6&&(n.includes(m)||m.includes(n));})||null;
  }
  const col=it.col||it.category||p?.col||"";
  const docId=it.docId||p?.docId||"";
  const key=(col&&docId)?sKey(`${col}-${docId}`):`n:${nrm(it.name)}`;
  return{key,col,docId,name:it.name||p?.name||p?.title||"",img:it.img||p?.img||p?.image||""};
}

function computeStats(){
  const P={},C={};
  const gp=k=>P[k]||(P[k]={key:k,col:"",docId:"",name:"",img:"",views:0,clicks:0,sold:0,orders:0,revenue:0});
  const gc=c=>{const k=sKey(c);return C[k]||(C[k]={col:c,views:0,itemViews:0,itemClicks:0,sold:0,orders:0,revenue:0});};
  const A=D.analytics||{};
  Object.entries(A.products||{}).forEach(([k,v])=>{
    if(!v)return;
    const p=gp(k);p.col=v.col||p.col;p.docId=v.docId||p.docId;p.name=v.name||p.name;p.img=v.img||p.img;
    p.views=Number(v.views)||0;p.clicks=Number(v.clicks)||0;
  });
  Object.entries(A.categories||{}).forEach(([c,v])=>{
    if(!v)return;
    const x=gc(c);x.views=Number(v.views)||0;x.itemViews=Number(v.itemViews)||0;x.itemClicks=Number(v.itemClicks)||0;
  });
  D.orders.forEach(o=>{
    const cats=new Set();
    (Array.isArray(o.items)?o.items:[]).forEach(it=>{
      if(!it)return;
      const r=resolveItem(it),q=parseInt(it.qty)||1,rev=q*money(it.price);
      const p=gp(r.key);
      p.col=p.col||r.col;p.docId=p.docId||r.docId;p.name=p.name||r.name;p.img=p.img||r.img;
      p.sold+=q;p.orders++;p.revenue+=rev;
      const c=gc(r.col||"");c.sold+=q;c.revenue+=rev;cats.add(r.col||"");
    });
    cats.forEach(cn=>gc(cn).orders++);
  });
  return{P:Object.values(P),C:Object.values(C)};
}

const pName=p=>p.name||findProduct(p.key)?.name||(p.docId&&findProduct(p.docId)?.name)||p.docId||String(p.key).replace(/^n:/,"");
function statChip(p){
  const pr=findProduct(p.key)||(p.docId?findProduct(p.docId):null);
  const img=p.img||pr?.img;
  const link=(p.col&&p.docId)?`../Furniture/item.html?col=${encodeURIComponent(p.col)}&docId=${encodeURIComponent(p.docId)}`:null;
  const im=img?`<img src="${esc(img)}" alt="" style="width:34px;height:34px;object-fit:cover;border-radius:6px;flex-shrink:0">`:`<div class="ava" style="width:34px;height:34px;border-radius:6px"><i class="fa-solid fa-box"></i></div>`;
  const nm=esc(pName(p));
  return `<div style="display:flex;align-items:center;gap:9px">${im}<div>${link?`<a href="${esc(link)}" target="_blank" rel="noopener" style="color:var(--pri);font-weight:800">${nm}</a>`:`<b>${nm}</b>`}</div></div>`;
}
const pbar=(v,mx,cls)=>`<div class="pbar ${cls||""}"><i style="width:${mx?Math.max(3,v/mx*100):0}%"></i></div>`;
const rk=i=>`<span class="rk${i===0?" t1":""}">${fNum(i+1)}</span>`;
function statsTable(head,rows,emptyTxt){
  return rows?`<div class="tw"><table><thead><tr>${head.map(h=>`<th>${h}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table></div>`:emptyBox("fa-chart-simple",emptyTxt);
}

// أكثر المنتجات مبيعاً
function bestSellersRows(P,n){
  const rows=P.filter(p=>p.sold>0&&match([pName(p),p.col,p.docId].join(" "))).sort((a,b)=>b.sold-a.sold||b.revenue-a.revenue).slice(0,n);
  const mx=rows[0]?.sold||0;
  return rows.map((p,i)=>`<tr><td>${rk(i)}</td><td>${statChip(p)}</td><td>${esc(catName(p.col))}</td><td style="min-width:120px">${pbar(p.sold,mx,"g")}</td><td><b>${fNum(p.sold)}</b></td><td>${fNum(p.orders)}</td><td>${fNum(p.revenue)} ج.م.</td></tr>`).join("");
}
const BEST_HEAD=["#","المنتج","القسم","","المباع (قطعة)","عدد الطلبات","الإيراد"];

function vOverview(){
  const{P,C}=computeStats();
  const tracked=P.some(p=>p.views||p.clicks)||C.some(c=>c.views||c.itemViews||c.itemClicks);
  const vis=c=>c.views+c.itemViews;
  const top=(arr,f)=>{const r=[...arr].sort((a,b)=>f(b)-f(a))[0];return r&&f(r)>0?r:null;};
  const tCV=top(C,vis),tCS=top(C,c=>c.sold),tPS=top(P,p=>p.sold),tPV=top(P,p=>p.views);
  const kpi=(l,ic,cl,name,sub)=>`<div class="card stat"><div class="l">${l} <i class="${cl} fa-solid ${ic}"></i></div><div class="kpi-s">${name}</div><div class="mut" style="margin-top:4px;font-size:12.5px">${sub}</div></div>`;
  const none=`<span class="mut">—</span>`;

  // الأقسام
  const cRows=[...C].filter(c=>vis(c)||c.itemClicks||c.sold).sort((a,b)=>vis(b)-vis(a)||b.sold-a.sold);
  const mv=Math.max(0,...cRows.map(vis)),ms=Math.max(0,...cRows.map(c=>c.sold));
  const cTr=cRows.map((c,i)=>`<tr><td>${rk(i)}</td><td><b>${esc(catName(c.col))}</b>${CAT_NAMES[c.col]?`<small class="mut" style="display:block">${esc(c.col)}</small>`:""}</td>
    <td>${fNum(c.views)}</td><td>${fNum(c.itemViews)}</td><td>${fNum(c.itemClicks)}</td>
    <td style="min-width:130px"><b>${fNum(vis(c))}</b>${pbar(vis(c),mv)}</td>
    <td style="min-width:130px"><b>${fNum(c.sold)}</b>${pbar(c.sold,ms,"g")}</td>
    <td>${fNum(c.orders)}</td><td>${fNum(c.revenue)} ج.م.</td></tr>`).join("");

  // الأكثر زيارة / ضغط
  const sk=window._as||"views";
  const vRows=P.filter(p=>(p.views||p.clicks)&&match([pName(p),p.col,p.docId].join(" "))).sort((a,b)=>b[sk]-a[sk]||b.views-a.views||b.clicks-a.clicks).slice(0,10);
  const mvv=Math.max(0,...vRows.map(p=>p[sk]));
  const vTr=vRows.map((p,i)=>`<tr><td>${rk(i)}</td><td>${statChip(p)}</td><td>${esc(catName(p.col))}</td>
    <td style="min-width:120px"><b>${fNum(p[sk])}</b>${pbar(p[sk],mvv)}</td>
    <td>${fNum(p.views)}</td><td>${fNum(p.clicks)}</td><td>${fNum(p.sold)}</td>
    <td>${p.views?Math.min(100,Math.round(p.orders/p.views*100))+"%":"—"}</td></tr>`).join("");

  return `${tracked?"":`<div class="note"><b>الزيارات والضغطات لسه مش متسجّلة.</b> عشان تشتغل لازم تتأكد من 3 حاجات:<br>
    ١) ضيف السطر <code dir="ltr">&lt;script type="module" src="../js/tracker.js"&gt;&lt;/script&gt;</code> في كل صفحات الأقسام وفي <code>item.html</code> (عدّل المسار حسب مكان الصفحة).<br>
    ٢) اسمح بالكتابة على <code>analytics</code> في Rules بتاعة Firebase Realtime Database.<br>
    ٣) افتح الموقع من متصفح مش داخل بحساب المشرف (زيارات المشرف مش بتتحسب).<br>
    <button type="button" class="btn" data-trtest style="margin-top:8px"><i class="fa-solid fa-vial"></i> اختبار الكتابة في Firebase</button> — المبيعات شغالة من الطلبات الموجودة.</div>`}
  <div class="grid g4" style="margin-bottom:20px">
    ${kpi("أكثر قسم زيارةً","fa-eye","i-b",tCV?esc(catName(tCV.col)):none,tCV?`${fNum(vis(tCV))} زيارة`:"مفيش بيانات لسه")}
    ${kpi("أكثر قسم مبيعاً","fa-cart-shopping","i-g",tCS?esc(catName(tCS.col)):none,tCS?`${fNum(tCS.sold)} قطعة · ${fNum(tCS.revenue)} ج.م.`:"مفيش مبيعات لسه")}
    ${kpi("أكثر منتج مبيعاً","fa-trophy","i-o",tPS?esc(pName(tPS)):none,tPS?`${fNum(tPS.sold)} قطعة`:"مفيش مبيعات لسه")}
    ${kpi("أكثر منتج زيارةً","fa-fire","i-p",tPV?esc(pName(tPV)):none,tPV?`${fNum(tPV.views)} زيارة · ${fNum(tPV.clicks)} ضغطة`:"مفيش بيانات لسه")}
  </div>
  <div class="card" style="margin-bottom:20px"><div class="card-h">الأقسام — الزيارات والمبيعات</div>
    ${statsTable(["#","القسم","زيارات صفحة القسم","مشاهدات منتجاته","ضغطات على منتجاته","إجمالي الزيارات","المباع (قطعة)","الطلبات","الإيراد"],cTr,"مفيش بيانات أقسام لسه")}
    <div class="hint">إجمالي الزيارات = زيارات صفحة القسم + مشاهدات المنتجات اللي جواه.</div></div>
  <div class="card" style="margin-bottom:20px"><div class="card-h"><span>أكثر المنتجات مبيعاً</span></div>${statsTable(BEST_HEAD,bestSellersRows(P,10),"مفيش مبيعات لسه")}</div>
  <div class="card"><div class="card-h"><span>أكثر المنتجات زيارةً وضغطاً</span>
    <select class="sel" id="asort"><option value="views"${sk==="views"?" selected":""}>ترتيب حسب الزيارات</option><option value="clicks"${sk==="clicks"?" selected":""}>ترتيب حسب الضغطات</option></select></div>
    ${statsTable(["#","المنتج","القسم","الترتيب حسب","زيارات","ضغطات","المباع (قطعة)","معدل الشراء"],vTr,"مفيش زيارات متسجّلة لسه")}
    <div class="hint">الزيارة = فتح صفحة المنتج (مرة واحدة لكل جلسة). الضغطة = الضغط على المنتج من صفحات القسم. معدل الشراء = الطلبات ÷ الزيارات.</div></div>`;
}


// ---------- الإيرادات (يومي / أسبوعي / شهري + رسوم بيانية + تقرير كصورة) ----------
// الإيراد = إجمالي الطلبات الشغالة (الملغي مش داخل). الإجمالي بيتفكك لـ: مبيعات المنتجات + الشحن + التغليف + رسوم/خصومات أخرى (الفرق).
// الأسبوع بيبدأ السبت. الحقول المقروءة من الطلب: total / subtotal / shipping / packaging
const RVS={g:"day",n:30,f:"all",hide:{},cf:null,ct:null};
let _cpModalData=null;   // بيانات مودال "أكواد الخصم" — بيتحدث كل رندر لصفحة الإيرادات
const RV_N={day:[7,14,30,60,90],week:[4,8,12,26],month:[3,6,12,24]};
const RV_DEF={day:30,week:12,month:12};
const RV_GL={day:"يومي",week:"أسبوعي",month:"شهري",custom:"فترة مخصصة"};
const rvUnit=(g,n)=>({day:n<=10?"أيام":"يوم",week:n<=10?"أسابيع":"أسبوع",month:n<=10?"شهور":"شهر"})[g];
const RV_SER=[
  {k:"total",n:"الإجمالي",c:"#2c7be5"},
  {k:"sub",n:"مبيعات المنتجات",c:"#00b86b"},
  {k:"ship",n:"الشحن",c:"#f5803e"},
  {k:"pack",n:"التغليف",c:"#9a55e6"}
];

// ----- تواريخ -----
const rvSod=t=>{const d=new Date(t);d.setHours(0,0,0,0);return d.getTime();};
const rvAddD=(t,n)=>{const d=new Date(t);d.setDate(d.getDate()+n);return d.getTime();};
const rvAddM=(t,n)=>{const d=new Date(t);return new Date(d.getFullYear(),d.getMonth()+n,1).getTime();};
const rvWk=t=>{const d=new Date(rvSod(t));d.setDate(d.getDate()-((d.getDay()+1)%7));return d.getTime();};
const rvMs=t=>{const d=new Date(t);return new Date(d.getFullYear(),d.getMonth(),1).getTime();};
const rvL=(t,o)=>new Date(t).toLocaleDateString("ar-EG",o);
const rvShort=t=>rvL(t,{day:"numeric",month:"short"});
const rvFull=t=>rvL(t,{weekday:"long",day:"numeric",month:"long",year:"numeric"});
const rvIso=t=>{const d=new Date(t);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;};
const fM=n=>fNum(Math.round((n||0)*100)/100)+" ج.م.";
// ----- فترة مخصصة (بتاريخين من - لحد) — بتبني سلة أيام بين تاريخين بالظبط -----
function rvDefsBetween(s,e){
  const out=[];
  for(let t=s;t<e;t=rvAddD(t,1))out.push({s:t,e:rvAddD(t,1),label:rvShort(t),full:rvFull(t)});
  return out;
}

// ----- حسابات -----
function rvFin(o){
  const total=money(o.total)+(Number(o.walletUsed)||0),ship=money(o.shipping),pack=money(o.packaging??o.packing);
  const sub=o.subtotal?money(o.subtotal):Math.max(0,total-ship-pack);
  const qty=(Array.isArray(o.items)?o.items:[]).reduce((s,it)=>s+(parseInt(it&&it.qty)||1),0);
  return{total,ship,pack,sub,other:total-sub-ship-pack,qty};
}
const rvAgg=()=>({orders:0,total:0,sub:0,ship:0,pack:0,other:0,qty:0});
const RV_KEYS=["total","sub","ship","pack","other","qty","orders"];
function rvAdd(a,f){a.orders++;a.qty+=f.qty;["total","sub","ship","pack","other"].forEach(k=>{a[k]+=f[k];});return a;}
const rvOrders=f=>D.orders.filter(o=>f!=="done"||stepsDone(o)===4);

function rvDefs(g,n,ref){
  const now=ref||Date.now(),out=[];
  if(g==="day"){
    const s0=rvAddD(rvSod(now),-(n-1));
    for(let i=0;i<n;i++){const s=rvAddD(s0,i);out.push({s,e:rvAddD(s,1),label:rvShort(s),full:rvFull(s)});}
  }else if(g==="week"){
    const w0=rvAddD(rvWk(now),-7*(n-1));
    for(let i=0;i<n;i++){const s=rvAddD(w0,7*i),e=rvAddD(s,7);out.push({s,e,label:rvShort(s),full:`أسبوع ${rvShort(s)} – ${rvShort(rvAddD(e,-1))}`});}
  }else{
    const m0=rvAddM(rvMs(now),-(n-1));
    for(let i=0;i<n;i++){const s=rvAddM(m0,i),e=rvAddM(s,1);out.push({s,e,label:rvL(s,{month:"short"}),full:rvL(s,{month:"long",year:"numeric"})});}
  }
  return out;
}
function rvFill(defs,orders){
  defs.forEach(d=>{d.a=rvAgg();});
  orders.forEach(o=>{const t=o.createdAt||0,d=defs.find(x=>t>=x.s&&t<x.e);if(d)rvAdd(d.a,rvFin(o));});
  return defs;
}
const rvSum=defs=>defs.reduce((s,d)=>{RV_KEYS.forEach(k=>{s[k]+=d.a[k];});return s;},rvAgg());
const rvPct=(v,t)=>t?fNum(Math.round(v/t*1000)/10)+"٪":"—";
function rvChg(c,p){
  if(!p)return c?`<span class="chg up">جديد</span>`:`<span class="chg" style="color:var(--mut)">—</span>`;
  const v=(c-p)/p*100;
  return `<span class="chg ${v>=0?"up":"dn"}">${v>=0?"▲":"▼"} ${fNum(Math.abs(Math.round(v*10)/10))}٪</span>`;
}
function rvGroup(list,keyFn){
  const m={};
  list.forEach(o=>{const k=keyFn(o),a=m[k]||(m[k]=rvAgg());rvAdd(a,rvFin(o));});
  return Object.entries(m).sort((a,b)=>b[1].total-a[1].total);
}
// أكواد الخصم المستخدمة في مجموعة طلبات معينة: كام مرة، وقللت كام من الإيراد الأصلي
function couponBreakdown(list){
  const m={};
  list.forEach(o=>{
    if(!o.couponCode)return;
    const f=rvFin(o),discount=Math.max(0,-f.other); // other=total-sub-ship-pack، وده بيطلع سالب بمقدار الخصم بالظبط
    const a=m[o.couponCode]||(m[o.couponCode]={code:o.couponCode,count:0,discount:0});
    a.count++;a.discount+=discount;
  });
  return Object.values(m).sort((a,b)=>b.discount-a.discount);
}

// ----- رسم بياني زجزاج (SVG) -----
const RVC={};
function rvCompact(v){return v>=1e6?(Math.round(v/1e5)/10).toLocaleString("ar-EG")+" مليون":v>=1e3?(Math.round(v/100)/10).toLocaleString("ar-EG")+" ألف":fNum(Math.round(v));}
function rvScale(max,cnt,int){
  if(max<=0){const st=int?1:100;return{step:st,top:st*cnt};}
  const raw=max/cnt,p=Math.pow(10,Math.floor(Math.log10(raw))),m=raw/p;
  let step=(m<=1?1:m<=2?2:m<=2.5?2.5:m<=5?5:10)*p;
  if(int)step=Math.max(1,Math.ceil(step));
  return{step,top:Math.ceil(max/step)*step};
}
function rvChart(id,defs,series,o={}){
  const W=o.W||820,H=o.H||300,L=o.L||66,R=18,T=24,B=40,n=defs.length;
  const max=Math.max(0,...series.flatMap(s=>defs.map(d=>d.a[s.k])));
  const sc=rvScale(max,4,o.int),ticks=Math.round(sc.top/sc.step);
  const x=i=>n<=1?L+(W-L-R)/2:L+(W-L-R)*i/(n-1);
  const y=v=>T+(H-T-B)*(1-v/sc.top);
  const fy=o.int?fNum:rvCompact,FF='font-family="Almarai,Tahoma,Arial,sans-serif"';
  let s=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" ${o.bare?`width="${W}" height="${H}"`:'style="width:100%;height:auto;display:block;direction:ltr"'}>`;
  s+=`<defs><linearGradient id="g-${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${series[0].c}" stop-opacity=".25"/><stop offset="1" stop-color="${series[0].c}" stop-opacity="0"/></linearGradient></defs>`;
  for(let i=0;i<=ticks;i++){
    const v=i*sc.step,yy=y(v);
    s+=`<line x1="${L}" x2="${W-R}" y1="${yy.toFixed(1)}" y2="${yy.toFixed(1)}" stroke="#e3ebf6" stroke-width="1"/><text x="${L-10}" y="${(yy+4).toFixed(1)}" text-anchor="end" font-size="11" fill="#9da9bb" ${FF}>${fy(v)}</text>`;
  }
  const stp=Math.max(1,Math.ceil(n/8));
  defs.forEach((d,i)=>{if((n-1-i)%stp===0)s+=`<text x="${x(i).toFixed(1)}" y="${H-14}" text-anchor="middle" font-size="11" fill="#9da9bb" ${FF}>${esc(d.label)}</text>`;});
  series.forEach((sr,si)=>{
    const pts=defs.map((d,i)=>`${x(i).toFixed(1)},${y(d.a[sr.k]).toFixed(1)}`);
    if(si===0&&n>1)s+=`<polygon points="${x(0).toFixed(1)},${y(0).toFixed(1)} ${pts.join(" ")} ${x(n-1).toFixed(1)},${y(0).toFixed(1)}" fill="url(#g-${id})"/>`;
    s+=`<polyline points="${pts.join(" ")}" fill="none" stroke="${sr.c}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/>`;
    defs.forEach((d,i)=>{s+=`<circle cx="${x(i).toFixed(1)}" cy="${y(d.a[sr.k]).toFixed(1)}" r="${n>45?2:3.6}" fill="#fff" stroke="${sr.c}" stroke-width="2"/>`;});
    if(o.labels&&si===0)defs.forEach((d,i)=>{s+=`<text x="${x(i).toFixed(1)}" y="${(y(d.a[sr.k])-11).toFixed(1)}" text-anchor="middle" font-size="11" font-weight="700" fill="${sr.c}" ${FF}>${fy(d.a[sr.k])}</text>`;});
  });
  if(o.bare)return s+"</svg>";
  s+=`<line class="lc-g" x1="0" x2="0" y1="${T}" y2="${H-B}" stroke="#c9d3e3" stroke-dasharray="4 4" style="display:none"/></svg>`;
  RVC[id]={W,L,R,n,defs,series,fmt:o.fmt||fM,extra:o.extra};
  return `<div class="lc" data-lc="${id}">${s}<div class="lc-tip"></div></div>`;
}
function rvBindCharts(){
  document.querySelectorAll(".lc[data-lc]").forEach(el=>{
    const c=RVC[el.dataset.lc];if(!c)return;
    const svg=el.querySelector("svg"),tip=el.querySelector(".lc-tip"),gd=el.querySelector(".lc-g");
    const move=e=>{
      const p=e.touches?e.touches[0]:e,r=svg.getBoundingClientRect();
      const px=(p.clientX-r.left)/r.width*c.W;
      let i=c.n<=1?0:Math.round((px-c.L)/((c.W-c.L-c.R)/(c.n-1)));
      i=Math.max(0,Math.min(c.n-1,i));
      const d=c.defs[i],xx=c.n<=1?c.L+(c.W-c.L-c.R)/2:c.L+(c.W-c.L-c.R)*i/(c.n-1);
      gd.setAttribute("x1",xx);gd.setAttribute("x2",xx);gd.style.display="";
      tip.innerHTML=`<b>${esc(d.full||d.label)}</b>`+c.series.map(sr=>`<div><i style="background:${sr.c}"></i>${sr.n}: <b>${c.fmt(d.a[sr.k])}</b></div>`).join("")+(c.extra?c.extra(d):"");
      const left=xx/c.W*100;
      tip.style.left=left+"%";tip.style.transform=left>55?"translateX(-108%)":"translateX(8%)";tip.style.display="block";
    };
    el.addEventListener("mousemove",move);
    el.addEventListener("touchmove",move,{passive:true});
    el.addEventListener("mouseleave",()=>{tip.style.display="none";gd.style.display="none";});
  });
}

// ----- أهداف أكواد الخصم (بتتخزن جوه الكود نفسه: coupons/{key}/goal) -----
// الهدف = عدد طلبات (أو إيراد) على الكود في مدة معينة. نسبة النجاح = المحقق ÷ الهدف.
const gKey=s=>String(s||"").trim().toUpperCase();
const gD=t=>rvL(t,{day:"numeric",month:"short",year:"numeric"});
function goalProgress(c,base){
  const g=c.goal,code=gKey(c.code);
  let orders=0,revenue=0;
  base.forEach(o=>{
    if(gKey(o.couponCode)!==code)return;
    const t=o.createdAt||0;if(t<g.startAt||t>g.endAt)return;
    orders++;revenue+=rvFin(o).total;
  });
  const isRev=g.metric==="revenue",actual=isRev?revenue:orders;
  const pct=g.target?actual/g.target*100:0,now=Date.now();
  const dl=Math.ceil((g.endAt-now)/86400000);
  let st,dt;
  if(pct>=100)st={t:"تحقق الهدف ✅",cls:"b4"};
  else if(now>g.endAt)st={t:"انتهت المدة — لم يتحقق",cls:"b3"};
  else if(now<g.startAt)st={t:"لسه مبدأش",cls:"b1"};
  else st={t:"شغّال",cls:"b2"};
  if(now<g.startAt)dt=`يبدأ بعد ${fNum(Math.ceil((g.startAt-now)/86400000))} يوم`;
  else if(now>g.endAt)dt="انتهت المدة";
  else dt=`باقي ${fNum(Math.max(dl,0))} يوم`;
  return{isRev,actual,orders,revenue,pct,st,dt,left:Math.max(0,g.target-actual)};
}
function goalsCard(){
  const base=rvOrders("all");
  const list=D.coupons.filter(c=>c.goal&&c.goal.target).map(c=>({c,p:goalProgress(c,base)})).sort((a,b)=>b.c.goal.endAt-a.c.goal.endAt);
  const tr=list.map(({c,p})=>{
    const g=c.goal;
    return `<tr><td><span class="code">${esc(c.code)}</span>${c.note?`<br><small class="mut">${esc(c.note)}</small>`:""}</td>
      <td>${esc(gD(g.startAt))} → ${esc(gD(g.endAt))}<br><small class="mut">${p.dt}</small></td>
      <td>${p.isRev?fM(g.target):fNum(g.target)+" طلب"}<br><small class="mut">${p.isRev?"هدف إيراد":"هدف طلبات"}</small></td>
      <td><b>${p.isRev?fM(p.actual):fNum(p.actual)+" طلب"}</b>${p.left>0?`<br><small class="mut">فاضل ${p.isRev?fM(p.left):fNum(p.left)+" طلب"}</small>`:""}</td>
      <td style="min-width:150px"><b>${fNum(Math.round(p.pct*10)/10)}٪</b>${pbar(Math.min(100,p.pct),100,p.pct>=100?"g":"")}</td>
      <td><span class="badge ${p.st.cls}">${p.st.t}</span></td>
      <td style="white-space:nowrap"><button type="button" class="btn" data-gledit="${esc(c.key)}">تعديل</button> <button type="button" class="btn red" data-gldel="${esc(c.key)}">حذف</button></td></tr>`;
  }).join("");
  const fin=list.filter(x=>Date.now()>x.c.goal.endAt||x.p.pct>=100),ok=fin.filter(x=>x.p.pct>=100);
  return `<div class="card" style="margin-bottom:20px"><div class="card-h"><span><i class="fa-solid fa-bullseye" style="color:var(--pri)"></i> أهداف أكواد الخصم ونسب النجاح</span><button type="button" class="btn solid" data-glnew><i class="fa-solid fa-plus"></i> هدف جديد</button></div>
    ${statsTable(["الكود","المدة","الهدف","المحقق","نسبة النجاح","الحالة",""],tr,"لسه مفيش أهداف — دوس «هدف جديد» وحدد كود وعدد طلبات ومدة")}
    <div class="hint">نسبة النجاح = المحقق ÷ الهدف. بتتحسب من الطلبات الشغالة اللي استخدمت الكود جوه مدة الهدف (الملغي مش محسوب).${fin.length?` · الأهداف اللي خلصت أو اتحققت: <b>${fNum(ok.length)}</b> اتحقق من <b>${fNum(fin.length)}</b>.`:""}</div></div>`;
}
function openGoalForm(cEdit){
  if(!D.coupons.length){toast("❌ ضيف كود خصم الأول");return;}
  const g=cEdit&&cEdit.goal;
  const fl=(l,h,full)=>`<div style="${full?"grid-column:1/-1;":""}"><label style="display:block;font-size:12px;font-weight:800;color:var(--mut);margin-bottom:5px">${l}</label>${h}</div>`;
  const opts=[...D.coupons].sort((a,b)=>(b.createdAt||0)-(a.createdAt||0)).map(c=>`<option value="${esc(c.key)}"${cEdit&&cEdit.key===c.key?" selected":""}>${esc(c.code)}${c.goal&&!cEdit?" (ليه هدف حالي — هيتبدل)":""}</option>`).join("");
  const s0=g?g.startAt:rvSod(Date.now()),e0=g?g.endAt:rvAddD(rvSod(Date.now()),29);
  openModal(cEdit?`تعديل هدف الكود ${cEdit.code}`:"هدف جديد لكود خصم",`
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px">
      ${fl("كود الخصم",`<select id="glCode" class="sel" style="width:100%"${cEdit?" disabled":""}>${opts}</select>`,true)}
      ${fl("نوع الهدف",`<select id="glMetric" class="sel" style="width:100%"><option value="orders"${!g||g.metric!=="revenue"?" selected":""}>عدد الطلبات على الكود</option><option value="revenue"${g&&g.metric==="revenue"?" selected":""}>إيراد الطلبات على الكود (ج.م.)</option></select>`)}
      ${fl("الهدف (الرقم المطلوب)",`<input id="glTarget" type="number" min="1" class="inp" style="width:100%" value="${esc(g?g.target:"")}" placeholder="مثلاً 50">`)}
      ${fl("من تاريخ",`<input id="glFrom" type="date" class="inp" style="width:100%" value="${esc(rvIso(s0))}">`)}
      ${fl("إلى تاريخ",`<input id="glTo" type="date" class="inp" style="width:100%" value="${esc(rvIso(e0))}">`)}
    </div>
    <div class="del-err" id="glErr" style="margin-top:10px"></div>
    <div style="display:flex;gap:10px;margin-top:16px"><button type="button" class="btn solid" id="glSave" style="flex:1">${cEdit?"حفظ التعديلات":"حفظ الهدف"}</button><button type="button" class="btn" id="glCancel">إلغاء</button></div>`);
  $("glCancel").onclick=()=>$("modal").classList.remove("open");
  $("glSave").onclick=async()=>{
    const err=$("glErr");err.textContent="";
    const c=cEdit||D.coupons.find(x=>x.key===$("glCode").value);
    const metric=$("glMetric").value==="revenue"?"revenue":"orders";
    const target=parseFloat($("glTarget").value);
    const from=$("glFrom").value,to=$("glTo").value;
    if(!c){err.textContent="اختار الكود";return;}
    if(!target||target<=0){err.textContent="اكتب الهدف";return;}
    if(!from||!to){err.textContent="حدد تاريخ البداية والنهاية";return;}
    const startAt=new Date(from+"T00:00:00").getTime(),endAt=new Date(to+"T23:59:59").getTime();
    if(startAt>endAt){err.textContent="تاريخ البداية لازم يكون قبل النهاية";return;}
    const goal={metric,target,startAt,endAt,createdAt:(g&&g.createdAt)||Date.now()};
    $("glSave").disabled=true;
    try{
      await fb.update(fb.ref(fb.db),{[`coupons/${c.key}/goal`]:goal});
      c.goal=goal;
      toast("✅ اتحفظ الهدف");$("modal").classList.remove("open");render();
    }catch(e){console.error(e);err.textContent="❌ حصل خطأ، جرّب تاني";$("glSave").disabled=false;}
  };
}

// ----- صفحة الإيرادات -----
function vRevenue(){
  const{g,f}=RVS;
  const base=rvOrders(f);
  let n,cur,prev;
  if(g==="custom"){
    if(!RVS.cf)RVS.cf=rvIso(rvAddD(Date.now(),-29));
    if(!RVS.ct)RVS.ct=rvIso(Date.now());
    let s=rvSod(new Date(RVS.cf+"T00:00:00").getTime()),e=rvAddD(rvSod(new Date(RVS.ct+"T00:00:00").getTime()),1);
    if(e<=s)e=rvAddD(s,1); // لو المستخدم قلب التاريخين بالغلط
    n=Math.round((e-s)/86400000);
    cur=rvFill(rvDefsBetween(s,e),base);
    prev=rvFill(rvDefsBetween(rvAddD(s,-n),s),base);
  }else{
    n=RVS.n;
    const all=rvFill(rvDefs(g,n*2),base);
    prev=all.slice(0,n);cur=all.slice(n);
  }
  const S=rvSum(cur),P=rvSum(prev);
  const rs=cur[0].s,re=cur[n-1].e,inR=t=>(t||0)>=rs&&(t||0)<re;
  const canc=D.cancelled.filter(o=>inR(o.createdAt)),cancTotal=canc.reduce((s,o)=>s+money(o.total)+(Number(o.walletUsed)||0),0);
  const avg=S.orders?S.total/S.orders:0,pavg=P.orders?P.total/P.orders:0;
  const best=[...cur].sort((a,b)=>b.a.total-a.a.total)[0];
  const kpi=(l,ic,cl,v,sub)=>`<div class="card stat"><div class="l">${l} <i class="${cl} fa-solid ${ic}"></i></div><div class="kpi-n">${v}</div><div class="kpi-sub">${sub}</div></div>`;
  const vs=`<span class="mut"> عن الفترة السابقة</span>`;

  const hasAny=S.orders>0;
  const vis=RV_SER.filter(s=>!RVS.hide[s.k]);
  const lg=RV_SER.map(s=>`<button type="button" class="lgb${RVS.hide[s.k]?" off":""}" data-rlg="${s.k}"><i style="background:${s.c}"></i>${s.n}</button>`).join("");
  const ch1=rvChart("rv1",cur,vis,{extra:d=>`<div style="opacity:.75">عدد الطلبات: ${fNum(d.a.orders)}</div>`});
  const ch2=rvChart("rv2",cur,[{k:"orders",n:"عدد الطلبات",c:"#e63757"}],{int:true,H:260,fmt:fNum,extra:d=>`<div style="opacity:.75">الإجمالي: ${fM(d.a.total)}</div>`});

  // تفصيل الإيراد
  const parts=[["مبيعات المنتجات",S.sub,"#00b86b"],["رسوم الشحن",S.ship,"#f5803e"],["رسوم التغليف",S.pack,"#9a55e6"],["رسوم / خصومات أخرى (الفرق)",S.other,"#9da9bb"]];
  const dist=parts.map(([l,v,c])=>`<div style="padding:11px 20px;border-top:1px solid var(--line)">
      <div style="display:flex;justify-content:space-between;gap:10px;font-weight:700"><span>${l}</span><span>${v<0?"−":""}${fM(Math.abs(v))} <span class="mut" style="font-weight:400">· ${rvPct(v,S.total)}</span></span></div>
      <div class="pbar"><i style="width:${S.total>0?Math.min(100,Math.max(v?2:0,Math.abs(v)/S.total*100)):0}%;background:${c}"></i></div></div>`).join("")
    +`<div style="display:flex;justify-content:space-between;padding:14px 20px;border-top:2px solid var(--line);font-weight:800;font-size:15px"><span>الإجمالي</span><span>${fM(S.total)}</span></div>`;

  // جدول الفترات (الأحدث فوق)
  const trs=[...cur].reverse().map(d=>`<tr${d.a.orders?"":' style="color:var(--mut)"'}><td><b>${esc(d.full)}</b></td><td>${fNum(d.a.orders)}</td><td>${fNum(d.a.qty)}</td><td>${fM(d.a.sub)}</td><td>${fM(d.a.ship)}</td><td>${fM(d.a.pack)}</td><td>${d.a.other?fM(d.a.other):"—"}</td><td><b>${fM(d.a.total)}</b></td><td>${d.a.orders?fM(d.a.total/d.a.orders):"—"}</td></tr>`).join("");
  const foot=`<tr><td>الإجمالي</td><td>${fNum(S.orders)}</td><td>${fNum(S.qty)}</td><td>${fM(S.sub)}</td><td>${fM(S.ship)}</td><td>${fM(S.pack)}</td><td>${S.other?fM(S.other):"—"}</td><td>${fM(S.total)}</td><td>${S.orders?fM(avg):"—"}</td></tr>`;

  // طرق الدفع + حالات الطلبات
  const inRangeOrders=base.filter(o=>inR(o.createdAt));
  const cpBreak=couponBreakdown(inRangeOrders),cpTotal=cpBreak.reduce((s,a)=>s+a.discount,0);
  const ps=prev[0].s,pe=prev[n-1].e,inP=t=>(t||0)>=ps&&(t||0)<pe;
  const cpBreakPrev=couponBreakdown(base.filter(o=>inP(o.createdAt)));
  _cpModalData={
    title:`أكواد الخصم — ${cur[0].full} إلى ${cur[n-1].full}`,
    rows:cpBreak.map(a=>{
      const prevCount=cpBreakPrev.find(x=>x.code===a.code)?.count||0;
      return `<tr><td><span class="code">${esc(a.code)}</span></td><td>${fNum(a.count)}</td><td>${fNum(prevCount)}</td><td>${rvChg(a.count,prevCount)}</td><td><b style="color:var(--err)">−${fM(a.discount)}</b></td></tr>`;
    }).join("")
  };
  const onl=inRangeOrders.filter(o=>o.paymentStatus==="paid"),onlTotal=onl.reduce((t,o)=>t+money(o.total),0),onlFees=onl.reduce((t,o)=>t+(Number(o.gatewayFee)||0),0);
  const pays=rvGroup(inRangeOrders,o=>String(o.payment||"").trim()||"غير محدد");
  const maxPay=Math.max(0,...pays.map(([,a])=>a.total));
  const payRows=pays.map(([k,a])=>`<tr><td><b>${esc(k)}</b></td><td>${fNum(a.orders)}</td><td style="min-width:110px">${pbar(a.total,maxPay)}</td><td><b>${fM(a.total)}</b></td></tr>`).join("");
  const stAgg=ST.map(()=>rvAgg());
  D.orders.filter(o=>inR(o.createdAt)).forEach(o=>rvAdd(stAgg[stepsDone(o)],rvFin(o)));
  const stRows=stAgg.map((a,i)=>a.orders?`<tr><td><span class="badge b${i}">${ST[i]}</span></td><td>${fNum(a.orders)}</td><td><b>${fM(a.total)}</b></td></tr>`:"").join("")
    +(canc.length?`<tr><td><span class="badge" style="background:#fde8ec;color:var(--err)">ملغي</span></td><td>${fNum(canc.length)}</td><td style="color:var(--err)"><b>${fM(cancTotal)}</b></td></tr>`:"");

  const nOpts=g==="custom"?"":RV_N[g].map(k=>`<option value="${k}"${k===n?" selected":""}>آخر ${fNum(k)} ${rvUnit(g,k)}</option>`).join("");
  const rangePicker=g==="custom"?`<span class="sel" style="display:flex;align-items:center;gap:6px;padding:4px 10px">
        <input type="date" id="rvFrom" class="inp" style="border:none;padding:4px;font-size:13px" value="${esc(RVS.cf)}"> إلى
        <input type="date" id="rvTo" class="inp" style="border:none;padding:4px;font-size:13px" value="${esc(RVS.ct)}">
        <button type="button" class="btn solid" id="rvApply" style="padding:7px 12px">تطبيق</button>
      </span>`:`<select class="sel" id="rvN">${nOpts}</select>`;
  return `<div class="card" style="margin-bottom:20px"><div class="card-h"><span><i class="fa-solid fa-sack-dollar" style="color:var(--pri)"></i> الإيرادات</span>
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
        <div class="seg">${Object.entries(RV_GL).map(([k,l])=>`<button type="button" data-rg="${k}" class="${g===k?"on":""}">${l}</button>`).join("")}</div>
        ${rangePicker}
        <select class="sel" id="rvF"><option value="all"${f==="all"?" selected":""}>كل الطلبات الشغالة</option><option value="done"${f==="done"?" selected":""}>المسلّمة فقط</option></select>
        <button type="button" class="btn" data-rep="week"><i class="fa-solid fa-image"></i> تقرير الأسبوع</button>
        <button type="button" class="btn" data-rep="month"><i class="fa-solid fa-image"></i> تقرير الشهر</button>
      </div></div>
      <div class="hint" style="padding-top:12px">الفترة: ${esc(cur[0].full.replace(/^أسبوع /,""))} ← ${esc(cur[n-1].full.replace(/^أسبوع /,""))} · الطلبات الملغية مش محسوبة${f==="done"?" · محسوب المسلّم بس":""}${g==="custom"?"":" · الأسبوع بيبدأ السبت."}</div></div>
    ${hasAny?"":`<div class="note">مفيش طلبات في الفترة دي.</div>`}
    <div class="grid g4" style="margin-bottom:20px">
      ${kpi("إجمالي الإيرادات","fa-sack-dollar","i-b",fM(S.total),rvChg(S.total,P.total)+vs)}
      ${kpi("عدد الطلبات","fa-box-open","i-o",fNum(S.orders),rvChg(S.orders,P.orders)+vs)}
      ${kpi("متوسط قيمة الطلب","fa-scale-balanced","i-p",S.orders?fM(avg):"—",rvChg(avg,pavg)+vs)}
      ${kpi("مبيعات المنتجات","fa-bag-shopping","i-g",fM(S.sub),`${fNum(S.qty)} قطعة · ${rvPct(S.sub,S.total)} من الإجمالي`)}
      ${kpi("رسوم الشحن","fa-truck-fast","i-o",fM(S.ship),`${rvPct(S.ship,S.total)} من الإجمالي`)}
      ${kpi("رسوم التغليف","fa-box","i-p",fM(S.pack),`${rvPct(S.pack,S.total)} من الإجمالي`)}
      ${kpi("رسوم / خصومات أخرى","fa-percent","i-b",(S.other<0?"−":"")+fM(Math.abs(S.other)),"الفرق بين الإجمالي والمكوّنات")}
      ${kpi("مدفوع أونلاين (EasyKash)","fa-credit-card","i-g",fM(onlTotal),onl.length?`${fNum(onl.length)} طلب مؤكد الدفع · رسوم البوابة على العملاء ${fM(onlFees)} (مش محسوبة في الإيراد)`:"مفيش دفع أونلاين في الفترة دي")}
      <div class="card stat" data-cpkpi style="cursor:pointer" title="دوس لعرض كل كود وهل نشاطه زاد ولا قل عن الفترة اللي فاتت">
        <div class="l">خصومات أكواد الخصم <i class="i-o fa-solid fa-tag"></i></div>
        <div class="kpi-n">${cpTotal?"−"+fM(cpTotal):"لا يوجد"}</div>
        <div class="kpi-sub">${cpBreak.length?`من ${fNum(cpBreak.length)} كود مختلف — دوس للتفاصيل`:"مفيش أكواد اتستخدمت"}</div>
      </div>
      ${kpi("الإيراد الأصلي (قبل الأكواد)","fa-sack-dollar","i-g",fM(S.total+cpTotal),cpTotal?`لو من غير خصم الأكواد كان هيبقى أعلى بـ ${fM(cpTotal)}`:"مفيش فرق — مفيش أكواد اتستخدمت")}
      ${kpi("الطلبات الملغية","fa-ban","i-o",fNum(canc.length),canc.length?`قيمتها ${fM(cancTotal)}`:"مفيش")}
    </div>
    <div class="card" style="margin-bottom:20px"><div class="card-h"><span><i class="fa-solid fa-tag" style="color:var(--pri)"></i> أكواد الخصم المستخدمة في الفترة دي</span></div>
      ${statsTable(["الكود","عدد مرات الاستخدام","إجمالي الخصم","نسبته من الإيراد الأصلي"],cpBreak.map(a=>`<tr><td><span class="code">${esc(a.code)}</span></td><td>${fNum(a.count)}</td><td><b style="color:var(--err)">−${fM(a.discount)}</b></td><td>${rvPct(a.discount,S.total+cpTotal)}</td></tr>`).join(""),"مفيش أكواد خصم اتستخدمت في الفترة دي")}
      ${cpBreak.length?`<div class="hint">إجمالي اللي اتخصم من كل الأكواد في الفترة دي: <b>${fM(cpTotal)}</b> — يعني الإيراد كان هيبقى <b>${fM(S.total+cpTotal)}</b> لو من غيرهم.</div>`:""}</div>
    <div class="card" style="margin-bottom:20px"><div class="card-h"><span>منحنى الإيرادات — ${RV_GL[g]}</span><div class="lg">${lg}</div></div>
      <div class="card-b">${ch1}</div>
      ${best&&best.a.total>0?`<div class="hint">أعلى فترة: <b>${esc(best.full)}</b> — ${fM(best.a.total)} من ${fNum(best.a.orders)} طلب.</div>`:""}</div>
    <div class="grid g2" style="margin-bottom:20px">
      <div class="card"><div class="card-h">عدد الطلبات</div><div class="card-b">${ch2}</div></div>
      <div class="card"><div class="card-h">تفصيل الإيراد</div>${dist}</div>
    </div>
    <div class="card" style="margin-bottom:20px"><div class="card-h">مبيعات ${g==="week"?"الأسابيع":g==="month"?"الشهور":"الأيام"} بالتفصيل</div>
      <div class="tw" style="max-height:520px;overflow:auto"><table><thead><tr><th>الفترة</th><th>الطلبات</th><th>القطع</th><th>مبيعات المنتجات</th><th>الشحن</th><th>التغليف</th><th>رسوم/خصومات أخرى</th><th>الإجمالي</th><th>متوسط الطلب</th></tr></thead><tbody>${trs}</tbody><tfoot>${foot}</tfoot></table></div></div>
    <div class="grid g2">
      <div class="card"><div class="card-h">طرق الدفع</div>${statsTable(["الطريقة","الطلبات","","الإجمالي"],payRows,"مفيش طلبات")}</div>
      <div class="card"><div class="card-h">حالات الطلبات في الفترة</div>${statsTable(["الحالة","الطلبات","الإجمالي"],stRows,"مفيش طلبات")}</div>
    </div>`;
}

// ----- تقرير كصورة (أسبوع / شهر) -----
const REP_W=1000;
let _rp={kind:"week",idx:0};
function rvPeriods(kind){
  const now=Date.now(),out=[];
  for(let i=0;i<12;i++){
    if(kind==="week"){
      const s=rvAddD(rvWk(now),-7*i);
      out.push({s,label:(i===0?"هذا الأسبوع":i===1?"الأسبوع اللي فات":"أسبوع")+` (${rvShort(s)} – ${rvShort(rvAddD(s,6))})`});
    }else{
      const s=rvAddM(rvMs(now),-i);
      out.push({s,label:(i===0?"هذا الشهر — ":i===1?"الشهر اللي فات — ":"")+rvL(s,{month:"long",year:"numeric"})});
    }
  }
  return out;
}
function rvReportHtml(kind,s){
  const isW=kind==="week",base=rvOrders(RVS.f);
  const e=isW?rvAddD(s,7):rvAddM(s,1),ps=isW?rvAddD(s,-7):rvAddM(s,-1);
  const daily=[];
  for(let t=s;t<e;t=rvAddD(t,1))daily.push({s:t,e:rvAddD(t,1),label:rvShort(t),full:rvFull(t)});
  rvFill(daily,base);
  const S=rvSum(daily),P=rvSum(rvFill([{s:ps,e:s}],base));
  let rows;
  if(isW)rows=daily.map(d=>({...d,name:rvL(d.s,{weekday:"long",day:"numeric",month:"short"})}));
  else{
    rows=[];
    for(let ws=rvWk(s);ws<e;ws=rvAddD(ws,7)){const cs=Math.max(ws,s),ce=Math.min(rvAddD(ws,7),e);rows.push({s:cs,e:ce,name:`${rvShort(cs)} – ${rvShort(rvAddD(ce,-1))}`});}
    rvFill(rows,base);
  }
  const inR=t=>(t||0)>=s&&(t||0)<e;
  const cancL=D.cancelled.filter(o=>inR(o.createdAt)),cancTotal=cancL.reduce((a,o)=>a+money(o.total)+(Number(o.walletUsed)||0),0);
  const inAll=D.orders.filter(o=>inR(o.createdAt)),delivered=inAll.filter(o=>stepsDone(o)===4).length;
  const avg=S.orders?S.total/S.orders:0,pavg=P.orders?P.total/P.orders:0;
  // أكتر المنتجات
  const prod={};
  base.filter(o=>inR(o.createdAt)).forEach(o=>(Array.isArray(o.items)?o.items:[]).forEach(it=>{
    if(!it)return;
    const r=resolveItem(it),p=prod[r.key]||(prod[r.key]={name:it.name||r.name||"—",qty:0,rev:0}),q=parseInt(it.qty)||1;
    p.qty+=q;p.rev+=q*money(it.price);
  }));
  const top=Object.values(prod).sort((a,b)=>b.qty-a.qty||b.rev-a.rev).slice(0,5);
  const pays=rvGroup(base.filter(o=>inR(o.createdAt)),o=>String(o.payment||"").trim()||"غير محدد").slice(0,5);

  const period=isW?`من ${rvFull(s)} إلى ${rvFull(rvAddD(e,-1))}`:rvL(s,{month:"long",year:"numeric"});
  const cd=(l,v,sub,c)=>`<div style="background:#f7f9fc;border:1px solid #e3ebf6;border-radius:14px;padding:16px 18px"><div style="font-size:12.5px;color:#7c8aa0;font-weight:700">${l}</div><div style="font-size:23px;font-weight:800;color:${c||"#1f2937"};margin-top:8px">${v}</div><div style="font-size:12px;margin-top:6px;color:#9da9bb">${sub||"&nbsp;"}</div></div>`;
  const th=t=>`<th style="padding:10px 10px;text-align:right;font-size:12px;background:#111827;color:#fff;font-weight:800">${t}</th>`;
  const td=(t,b)=>`<td style="padding:9px 10px;border-bottom:1px solid #eef1f6;font-size:13px;${b?"font-weight:800":""}">${t}</td>`;
  const trs=rows.map(r=>`<tr>${td(esc(r.name),1)}${td(fNum(r.a.orders))}${td(fM(r.a.sub))}${td(fM(r.a.ship))}${td(fM(r.a.pack))}${td(r.a.other?fM(r.a.other):"—")}${td(fM(r.a.total),1)}</tr>`).join("");
  const tf=`<tr style="background:#eaf1ff">${td("الإجمالي",1)}${td(fNum(S.orders),1)}${td(fM(S.sub),1)}${td(fM(S.ship),1)}${td(fM(S.pack),1)}${td(S.other?fM(S.other):"—",1)}${td(fM(S.total),1)}</tr>`;
  const topRows=top.map((p,i)=>`<div style="display:flex;justify-content:space-between;gap:10px;padding:9px 0;border-bottom:1px solid #eef1f6;font-size:13px"><span><b style="color:#2c7be5">${fNum(i+1)}.</b> ${esc(p.name)}</span><span><b>${fNum(p.qty)}</b> قطعة · ${fM(p.rev)}</span></div>`).join("")||`<div style="color:#9da9bb;font-size:13px;padding:10px 0">مفيش مبيعات</div>`;
  const payRows=pays.map(([k,a])=>`<div style="display:flex;justify-content:space-between;gap:10px;padding:9px 0;border-bottom:1px solid #eef1f6;font-size:13px"><span>${esc(k)} <span style="color:#9da9bb">(${fNum(a.orders)} طلب)</span></span><b>${fM(a.total)}</b></div>`).join("")||`<div style="color:#9da9bb;font-size:13px;padding:10px 0">مفيش طلبات</div>`;
  const c1=rvChart("rp1",daily,[RV_SER[0]],{bare:true,W:912,H:250,labels:daily.length<=8});
  const c2=rvChart("rp2",daily,[{k:"orders",n:"عدد الطلبات",c:"#e63757"}],{bare:true,W:912,H:190,int:true,labels:daily.length<=8});
  return `<div dir="rtl" style="font-family:'Almarai','Cairo',Tahoma,sans-serif;width:${REP_W}px;background:#fff;color:#1f2937;box-sizing:border-box">
    <div style="background:linear-gradient(135deg,#1e3a8a,#2c7be5);color:#fff;padding:34px 44px;display:flex;justify-content:space-between;align-items:center">
      <div><div style="font-size:30px;font-weight:800">كشمير <span style="color:#ffd98a">هوم</span></div><div style="font-size:13px;opacity:.85;margin-top:6px">تقرير الإيرادات</div></div>
      <div style="text-align:left"><div style="font-size:25px;font-weight:800">${isW?"تقرير الأسبوع":"تقرير الشهر"}</div><div style="font-size:13px;opacity:.9;margin-top:6px">${esc(period)}</div></div>
    </div>
    <div style="padding:30px 44px 26px">
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px">
        ${cd("إجمالي الإيرادات",fM(S.total),rvChg(S.total,P.total)+" عن "+(isW?"الأسبوع":"الشهر")+" السابق","#2c7be5")}
        ${cd("عدد الطلبات",fNum(S.orders),rvChg(S.orders,P.orders)+` · ${fNum(delivered)} تم تسليمه`)}
        ${cd("متوسط قيمة الطلب",S.orders?fM(avg):"—",rvChg(avg,pavg))}
        ${cd("مبيعات المنتجات",fM(S.sub),`${fNum(S.qty)} قطعة`,"#00a15c")}
        ${cd("رسوم الشحن",fM(S.ship),rvPct(S.ship,S.total)+" من الإجمالي","#f5803e")}
        ${cd("رسوم التغليف",fM(S.pack),rvPct(S.pack,S.total)+" من الإجمالي","#9a55e6")}
      </div>
      <div style="margin-top:22px;border:1px solid #e3ebf6;border-radius:14px;padding:16px 18px 8px"><div style="font-weight:800;font-size:15px;margin-bottom:6px">الإيرادات اليومية</div>${c1}</div>
      <div style="margin-top:16px;border:1px solid #e3ebf6;border-radius:14px;padding:16px 18px 8px"><div style="font-weight:800;font-size:15px;margin-bottom:6px">عدد الطلبات اليومي</div>${c2}</div>
      <div style="margin-top:22px"><div style="font-weight:800;font-size:15px;margin-bottom:10px">${isW?"تفاصيل الأيام":"تفاصيل الأسابيع"}</div>
        <table style="width:100%;border-collapse:collapse"><thead><tr>${th("الفترة")}${th("الطلبات")}${th("مبيعات المنتجات")}${th("الشحن")}${th("التغليف")}${th("رسوم/خصومات أخرى")}${th("الإجمالي")}</tr></thead><tbody>${trs}</tbody><tfoot>${tf}</tfoot></table></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:22px">
        <div style="border:1px solid #e3ebf6;border-radius:14px;padding:16px 18px"><div style="font-weight:800;font-size:15px;margin-bottom:4px">أكثر المنتجات مبيعاً</div>${topRows}</div>
        <div style="border:1px solid #e3ebf6;border-radius:14px;padding:16px 18px"><div style="font-weight:800;font-size:15px;margin-bottom:4px">طرق الدفع</div>${payRows}</div>
      </div>
      <div style="margin-top:20px;background:#fff8e1;border:1px solid #ffe082;border-radius:12px;padding:12px 16px;font-size:12.5px;color:#7c5e00;line-height:1.9">الطلبات الملغية في الفترة: <b>${fNum(cancL.length)}</b>${cancL.length?` (قيمتها ${fM(cancTotal)} — غير محسوبة في الإيرادات)`:""} · الطلبات المحسوبة: ${RVS.f==="done"?"المسلّمة فقط":"كل الطلبات الشغالة"}.</div>
      <div style="text-align:center;margin-top:18px;font-size:11.5px;color:#9da9bb">اتعمل التقرير في ${esc(fDT(Date.now()))} — كشمير هوم</div>
    </div></div>`;
}
function ensureRepModal(){
  let m=$("repModal");
  if(m)return m;
  m=document.createElement("div");m.id="repModal";
  m.innerHTML=`<div class="inv-box" style="max-width:1080px">
    <div class="mh"><span><i class="fa-solid fa-image"></i> تقرير الإيرادات كصورة</span><button type="button" class="mx" id="repX">✕</button></div>
    <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;padding:12px 18px;border-bottom:1px solid var(--line)">
      <div class="seg" id="repSeg"><button type="button" data-k="week">أسبوع</button><button type="button" data-k="month">شهر</button></div>
      <select class="sel" id="repSel"></select>
    </div>
    <div class="inv-body" id="repBody"></div>
    <div class="inv-foot"><button type="button" class="btn solid" id="repDl"><i class="fa-solid fa-download"></i> تنزيل صورة</button><button type="button" class="btn" id="repCl">إغلاق</button></div>
  </div>`;
  document.body.appendChild(m);
  const close=()=>m.classList.remove("open");
  m.addEventListener("click",e=>{if(e.target===m)close();});
  $("repX").onclick=close;$("repCl").onclick=close;
  $("repSeg").onclick=e=>{const b=e.target.closest("[data-k]");if(!b)return;_rp.kind=b.dataset.k;_rp.idx=0;syncReport();};
  $("repSel").onchange=()=>{_rp.idx=parseInt($("repSel").value)||0;syncReport(true);};
  $("repDl").onclick=()=>downloadReport($("repDl"));
  return m;
}
function syncReport(keepSel){
  const m=ensureRepModal(),body=$("repBody"),per=rvPeriods(_rp.kind),cur=per[_rp.idx]||per[0];
  if(!keepSel)$("repSel").innerHTML=per.map((p,i)=>`<option value="${i}"${i===_rp.idx?" selected":""}>${esc(p.label)}</option>`).join("");
  $("repSeg").querySelectorAll("[data-k]").forEach(b=>b.classList.toggle("on",b.dataset.k===_rp.kind));
  body.innerHTML=`<div class="inv-scale"><div class="inv-paper" style="width:${REP_W}px">${rvReportHtml(_rp.kind,cur.s)}</div></div>`;
  m.classList.add("open");
  requestAnimationFrame(()=>{
    const w=body.querySelector(".inv-scale"),p=body.querySelector(".inv-paper"),sc=Math.min(1,(body.clientWidth-24)/REP_W);
    p.style.transform=`scale(${sc})`;w.style.width=(REP_W*sc)+"px";w.style.height=(p.offsetHeight*sc)+"px";
  });
}
function openReport(kind){_rp={kind,idx:0};syncReport();}
async function downloadReport(btn){
  const per=rvPeriods(_rp.kind),cur=per[_rp.idx]||per[0];
  const old=btn.innerHTML;btn.disabled=true;btn.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> جاري التجهيز...';
  const wrap=document.createElement("div");
  wrap.style.cssText=`position:fixed;top:0;left:-12000px;width:${REP_W}px;background:#fff;pointer-events:none`;
  wrap.innerHTML=rvReportHtml(_rp.kind,cur.s);
  document.body.appendChild(wrap);
  try{
    await loadH2C();
    if(document.fonts&&document.fonts.ready)await document.fonts.ready;
    const canvas=await window.html2canvas(wrap.firstElementChild,{scale:2,backgroundColor:"#ffffff",useCORS:true});
    const blob=await new Promise(r=>canvas.toBlob(r,"image/png"));
    if(!blob)throw new Error("toBlob failed");
    const url=URL.createObjectURL(blob),a=document.createElement("a");
    a.href=url;a.download=`kashmir-report-${_rp.kind}-${rvIso(cur.s)}.png`;
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),4000);
    toast("✅ تم تنزيل التقرير");
  }catch(e){console.error(e);toast("❌ تعذّر تنزيل التقرير — تأكد من الإنترنت وجرّب تاني");}
  finally{wrap.remove();btn.disabled=false;btn.innerHTML=old;}
}


// ---------- أوقات ذروة المبيعات (بتظهر في تبويب التحليل والتوصيات) ----------
const PK_DAYS=["الأحد","الاثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"];
const PK_ORDER=[6,0,1,2,3,4,5];   // الأسبوع بيبدأ السبت
const pkHr=h=>fNum(h%12||12)+" "+(h<12?"ص":"م");
const pkRange=h=>pkHr(h)+" – "+pkHr((h+1)%24);
function pkCols(arr,labels,key,hi,lo){
  const mx=Math.max(1,...arr.map(a=>a[key]));
  return `<div style="display:flex;align-items:flex-end;gap:3px;height:150px;direction:ltr">${arr.map((a,i)=>`<div title="${esc(labels[i])}: ${fNum(a.orders)} طلب · ${fM(a.total)}" style="flex:1;height:100%;display:flex;flex-direction:column;justify-content:flex-end"><div style="height:${a[key]?Math.max(4,a[key]/mx*100):0}%;background:${hi.includes(i)?"#f5803e":lo.includes(i)?"#c9d3e3":"#2c7be5"};border-radius:4px 4px 0 0"></div></div>`).join("")}</div>`;
}
function peakTimesHtml(){
  const win=window._pkwin===undefined?90:window._pkwin;
  const from=win?Date.now()-win*86400000:0;
  const list=rvOrders("all").filter(o=>o.createdAt&&o.createdAt>=from);
  const mk=n=>Array.from({length:n},()=>({orders:0,total:0}));
  const H=mk(24),W=mk(7);
  list.forEach(o=>{const d=new Date(o.createdAt),t=money(o.total)+(Number(o.walletUsed)||0);H[d.getHours()].orders++;H[d.getHours()].total+=t;W[d.getDay()].orders++;W[d.getDay()].total+=t;});
  const N=list.length;
  const sel=`<select class="sel" id="pkwin">${[[30,"آخر ٣٠ يوم"],[90,"آخر ٩٠ يوم"],[180,"آخر ٦ شهور"],[0,"كل الوقت"]].map(([v,l])=>`<option value="${v}"${v===win?" selected":""}>${l}</option>`).join("")}</select>`;
  if(!N)return `<div class="card" style="margin-top:20px"><div class="card-h"><span><i class="fa-solid fa-clock" style="color:var(--pri)"></i> أوقات ذروة المبيعات</span>${sel}</div>${emptyBox("fa-clock","مفيش طلبات في الفترة دي")}</div>`;
  const hrs=H.map((a,i)=>({...a,i})),byO=(a,b)=>b.orders-a.orders||b.total-a.total;
  const topH=[...hrs].sort(byO).slice(0,3).filter(x=>x.orders>0);
  const quietH=[...hrs].filter(x=>x.i>=9).sort((a,b)=>a.orders-b.orders||a.total-b.total)[0];   // أهدى ساعة بين ٩ ص وآخر اليوم
  const days=W.map((a,i)=>({...a,i})),bestD=[...days].sort(byO)[0],worstD=[...days].sort((a,b)=>a.orders-b.orders||a.total-b.total)[0];
  const pct=v=>fNum(Math.round(v/N*100))+"٪";
  const parts=[["صباحاً","٦ ص – ١٢ ظ",h=>h>=6&&h<12],["ظهراً وعصراً","١٢ ظ – ٦ م",h=>h>=12&&h<18],["مساءً","٦ م – ١٠ م",h=>h>=18&&h<22],["ليلاً وفجراً","١٠ م – ٦ ص",h=>h>=22||h<6]]
    .map(([l,r,fn])=>{const c=H.reduce((t,a,h)=>t+(fn(h)?a.orders:0),0);return{l,r,c};});
  const bestP=[...parts].sort((a,b)=>b.c-a.c)[0];
  const chips=parts.map(x=>`<div style="flex:1;min-width:120px;background:var(--bg2,#f3f3f6);border-radius:10px;padding:10px 12px${x===bestP?";outline:2px solid #f5803e":""}"><div style="font-weight:800">${x.l}</div><div class="mut" style="font-size:11.5px">${x.r}</div><div style="margin-top:6px"><b>${pct(x.c)}</b> <span class="mut" style="font-size:12px">· ${fNum(x.c)} طلب</span></div></div>`).join("");
  const wOrd=PK_ORDER.map(i=>days[i]);
  const hl=Array.from({length:24},(_,h)=>pkRange(h));
  const hiH=topH.map(x=>x.i),loH=quietH?[quietH.i]:[];
  const hourLbl=`<div style="display:flex;gap:3px;direction:ltr;margin-top:4px">${H.map((_,h)=>`<div style="flex:1;text-align:center;font-size:10px;color:#9da9bb">${h%3===0?fNum(h):""}</div>`).join("")}</div>`;
  const dayLbl=`<div style="display:flex;gap:3px;direction:ltr;margin-top:4px">${wOrd.map(d=>`<div style="flex:1;text-align:center;font-size:11px;color:#9da9bb">${PK_DAYS[d.i]}</div>`).join("")}</div>`;
  const recs=[];
  if(topH.length)recs.push(`أعلى ذروة للطلبات: <b>${topH.map(x=>pkRange(x.i)).join("، ")}</b> — ${pct(topH.reduce((t,x)=>t+x.orders,0))} من الطلبات في ${fNum(topH.length)} ساعات بس. انزّل البوستات والإعلانات الممولة قبلها بحوالي ساعة، وتأكد إن الموظفين متاحين للرد على العملاء وقتها.`);
  if(quietH)recs.push(`أهدى وقت: <b>${pkRange(quietH.i)}</b> (${fNum(quietH.orders)} طلب). مناسب لعروض فلاش أو كود خصم محدود عشان تحرك المبيعات فيه.`);
  if(bestD.orders>0)recs.push(`أنشط يوم: <b>${PK_DAYS[bestD.i]}</b> (${fNum(bestD.orders)} طلب · ${fM(bestD.total)})، وأضعف يوم: <b>${PK_DAYS[worstD.i]}</b> (${fNum(worstD.orders)} طلب). جرّب تنزّل عروض ${PK_DAYS[worstD.i]} عشان تعوّضه.`);
  recs.push(`أنشط فترة في اليوم: <b>${bestP.l}</b> (${pct(bestP.c)} من الطلبات).`);
  return `<div class="card" style="margin-top:20px"><div class="card-h"><span><i class="fa-solid fa-clock" style="color:var(--pri)"></i> أوقات ذروة المبيعات</span>${sel}</div>
    <div class="card-b">
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:18px">${chips}</div>
      <div style="font-weight:800;margin-bottom:8px">الطلبات حسب ساعة اليوم</div>${pkCols(H,hl,"orders",hiH,loH)}${hourLbl}
      <div style="font-weight:800;margin:20px 0 8px">الطلبات حسب يوم الأسبوع</div>${pkCols(wOrd,wOrd.map(d=>PK_DAYS[d.i]),"orders",[wOrd.findIndex(d=>d.i===bestD.i)],[wOrd.findIndex(d=>d.i===worstD.i)])}${dayLbl}
      <div style="margin-top:20px;background:#fff8e1;border:1px solid #ffe082;border-radius:12px;padding:12px 16px;font-size:13px;color:#7c5e00;line-height:2"><b>💡 توصيات:</b><br>${recs.map(r=>"• "+r).join("<br>")}</div>
    </div>
    <div class="hint">محسوب على ${fNum(N)} طلب شغّال (الملغي مش داخل). البرتقالي = أعلى الأوقات، والرمادي = الأهدأ. ${N<30?"<b>البيانات لسه قليلة</b> فالنتايج تقريبية.":""}</div></div>`;
}

// ---------- تبويبات الإحصائيات: نظرة عامة | التحليل والتوصيات ----------
// ---------- 🏷️ قسم العروض (Realtime Database: offers/<key> — وصفحة offers.html?offer=<key> بتقراه) ----------
const OFF={orig:{},tab:"basic",loaded:false,loading:false,all:{},sel:"comfort",draft:null,legacy:false,extra:[]};
const OFF_SLOTS=[["comfort","عرض الراحة والنعومة"],["towels","فوط قطن للحمام"]];
const offDT=t=>{const d=new Date(t),p=n=>String(n).padStart(2,"0");return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;};
const offColors=p=>p?Object.keys(p).filter(k=>/^color\d+$/.test(k)&&p[k]).sort((a,b)=>parseInt(a.slice(5))-parseInt(b.slice(5))).map(k=>String(p[k])):[];
const OFF_THEMES={"":["افتراضي (البرتقالي)","linear-gradient(227deg,#f5934e,#d27039)"],orange:["برتقالي","linear-gradient(227deg,#f5934e,#d27039)"],blue:["أزرق","linear-gradient(159deg,#2196F3,#3F51B5)"],green:["أخضر","linear-gradient(159deg,#43a047,#1b5e20)"],purple:["بنفسجي","linear-gradient(159deg,#8e24aa,#4527a0)"],red:["أحمر","linear-gradient(159deg,#ef5350,#b71c1c)"],dark:["كحلي/غامق","linear-gradient(159deg,#455a64,#212121)"]};
const OFF_MODES=[["auto-gray","يظهر لو فيه منتجات — ورمادي (قريباً) لو مفيش"],["auto-hide","يظهر لو فيه منتجات — ويتخفي لو مفيش"],["gray","رمادي دايماً (قريباً)"],["hide","مخفي من الرئيسية"]];
function offVidSrc(raw){   // لو لزقت كود <iframe> كامل بناخد منه الرابط بس
  raw=String(raw||"").trim();
  const m=raw.match(/<iframe[^>]*\ssrc\s*=\s*["']([^"']+)["']/i);
  return m?m[1].replace(/&amp;/g,"&"):raw;
}
function offVidType(u){
  u=offVidSrc(u);if(!u)return"";
  if(/facebook\.com\/plugins\/video\.php/.test(u))return"✅ Facebook (كود التضمين) — "+(/%2Freel%2F|\/reel\//.test(u)?"ريلز عمودي":"فيديو");
  if(/facebook\.com\/(reel|watch|[^\/?#]+\/videos|share\/[rv])|fb\.watch\//.test(u))return"✅ Facebook";
  if(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)[\w-]{11}/.test(u))return"✅ YouTube";
  if(/vimeo\.com\/(?:video\/)?\d+/.test(u))return"✅ Vimeo";
  if(/drive\.google\.com\/file\/d\/[\w-]+/.test(u))return"✅ Google Drive (لازم الملف يكون «أي حد معاه الرابط»)";
  if(/\.(mp4|webm|ogg|mov)(\?|#|$)/i.test(u))return"✅ ملف فيديو مباشر";
  if(/^https?:\/\//.test(u))return"⚠️ رابط غير معروف — هيتجرّب كملف فيديو";
  return"❌ الرابط مش مدعوم";
}
const offIsData=u=>String(u||"").startsWith("data:");
function offCompress(file,max,q){   // بيصغّر الصورة ويحوّلها JPEG عشان تتخزن جوه العرض
  return new Promise((res,rej)=>{
    const fr=new FileReader();
    fr.onerror=rej;
    fr.onload=()=>{
      const im=new Image();
      im.onerror=rej;
      im.onload=()=>{
        const k=Math.min(1,max/Math.max(im.width,im.height)),w=Math.max(1,Math.round(im.width*k)),h=Math.max(1,Math.round(im.height*k));
        const c=document.createElement("canvas");c.width=w;c.height=h;
        const x=c.getContext("2d");x.fillStyle="#fff";x.fillRect(0,0,w,h);x.drawImage(im,0,0,w,h);
        let out=c.toDataURL("image/jpeg",q);
        if(out.length>260000)out=c.toDataURL("image/jpeg",Math.max(.5,q-.25));   // لو لسه كبيرة قلّل الجودة
        res(out);
      };
      im.src=fr.result;
    };
    fr.readAsDataURL(file);
  });
}
const offAbs=u=>/^(https?:)?\/\/|^data:|^\//.test(u);
const offClean=u=>{u=String(u||"").trim();return !u||offAbs(u)?u:u.replace(/^(\.\.\/|\.\/)+/,"");};   // مسار من جذر الموقع
const offSrc=u=>{const c=offClean(u);return !c||offAbs(c)?c:"../"+c;};                                       // لوحة الأدمن جوه فولدر user
const offImg=p=>p?(p.img||p.image||p.color1_img||Object.keys(p).filter(k=>/^color\d+_img$/.test(k)).map(k=>p[k]).find(Boolean)||""):"";
let _ofCanon=null,_ofCanonN=-1;
function offCanon(){   // كل منتج ← مفتاحه الكامل "القسم-docId" عشان منتجين من أقسام مختلفة ما يتلخبطوش
  const n=Object.keys(D.products||{}).length;if(_ofCanon&&_ofCanonN===n)return _ofCanon;
  _ofCanon=new Map();
  Object.entries(D.products||{}).forEach(([k,p])=>{if(p&&/^[A-Za-z_]+-/.test(k)&&!_ofCanon.has(p))_ofCanon.set(p,k);});
  _ofCanonN=n;return _ofCanon;
}
const offRef=p=>offCanon().get(p)||((p.col&&p.docId)?`${p.col}-${p.docId}`:String(p.id??p.docId));
function offThumbs(d,attr,cur){
  const urls=[...new Set(d.items.map(it=>{const p=findProduct(it.id);return p?offClean(offImg(p)):"";}).filter(Boolean))];
  return urls.map(u=>`<img ${attr}="${esc(u)}" src="${esc(offSrc(u))}" style="width:56px;height:56px;border-radius:10px;object-fit:cover;cursor:pointer;border:2px solid ${u===offClean(cur)?"var(--pri)":"transparent"}">`).join("");
}
function offPrev(){
  const g=id=>{const e=$(id);return e?e.value:"";};
  const el=$("ofHPrev");if(!el)return;
  const d=OFF.draft,th=(OFF_THEMES[g("ofHomeTheme")]||OFF_THEMES[""])[1],
    mode=g("ofHomeMode"),gray=mode==="gray"||(mode.startsWith("auto")&&!d.items.length);
  el.innerHTML=`<div class="hint" style="padding:0 0 6px">معاينة الكارت ${mode==="hide"?"(مخفي)":gray?"(رمادي — قريباً)":""}</div>
    <div style="border-radius:16px;padding:12px;display:flex;gap:12px;align-items:center;color:#fff;background:${gray?"linear-gradient(159deg,#9aa0a6,#6f757b)":th};${gray?"filter:grayscale(1);opacity:.85":""}">
      <div style="width:84px;height:84px;border-radius:12px;background:rgba(255,255,255,.22);display:grid;place-items:center;font-size:11px;text-align:center;line-height:1.4;padding:6px">صورتك<br>من index.html</div>
      <div style="flex:1;min-width:0"><b style="font-size:16px">${esc(g("ofHomeTitle")||g("ofName")||"")}</b><div style="opacity:.9;font-size:12px">${esc(g("ofHomeSub")||g("ofSub")||"")}</div>
      <div style="margin-top:6px"><b style="font-size:20px">${esc(g("ofHomePrice")||g("ofPrice")||"")}</b> ج.م <span style="background:#fff;color:#333;border-radius:99px;padding:2px 10px;font-size:11px;font-weight:800;margin-inline-start:6px">${gray?"قريباً":esc(g("ofHomePill")||"خصم %")}</span></div></div></div>`;
}
// يحوّل أي id قديم (زي "1") للمفتاح الكامل "القسم-docId" بنفس المنتج اللي اللوحة بتعرضه، عشان صفحة العروض تجيب نفس المنتج بالظبط
function offUpgrade(d){
  const seen=new Set();
  d.items.forEach(it=>{
    const p=findProduct(it.id);
    if(p){const r=offRef(p);if(r&&/^[A-Za-z_]+-./.test(r))it.id=r;}
  });
  d.items=d.items.filter(it=>!seen.has(it.id)&&seen.add(it.id));
}
function offSearch(q){
  q=String(q||"").trim();if(!q)return[];
  const list=prodIndex().list,low=q.toLowerCase(),res=[];
  const d=findProduct(q);if(d)res.push(d);
  list.forEach(p=>{
    if([p.id,p.docId,offRef(p)].some(v=>v!==undefined&&v!==null&&String(v)===q))res.unshift(p);
    else if(String(p.name||p.title||"").toLowerCase().includes(low))res.push(p);
  });
  return[...new Set(res)].slice(0,6);
}
const OFF_CANON_RE=/^[A-Za-z_][A-Za-z0-9_]*-/;
function offUpgradeIds(){   // ids قديمة (رقم لوحده) ← صيغة "القسم-docId" بنفس المنتج اللي اتعرضلك في اللوحة
  let n=0;
  if(!OFF.draft)return 0;
  OFF.draft.items.forEach(it=>{
    if(OFF_CANON_RE.test(it.id))return;
    const p=findProduct(it.id);if(!p)return;
    const r=offRef(p);if(r&&r!==it.id&&OFF_CANON_RE.test(r)){it.id=r;n++;}
  });
  if(n)OFF.pendingSave=true;
  return n;
}
const offNorm=it=>typeof it==="object"&&it?{id:String(it.id),colors:Array.isArray(it.colors)?it.colors.slice():[],size:it.size||""}:{id:String(it),colors:[],size:""};
function offPick(key){
  const o=OFF.all[key];
  OFF.sel=key;
  OFF.draft=o?{name:o.name||"",cartName:o.cartName||"",img:o.img||"",note:o.note||"",sub:o.sub||"",price:o.price||"",end:o.endAt?offDT(o.endAt):"",items:(o.items||[]).map(offNorm),tiers:(o.tiers||[]).map(t=>({qty:t.qty,mode:t.mode||"auto",type:t.type||"percent",value:t.value,code:t.code||""})),videoUrl:o.videoUrl||"",videoTitle:o.videoTitle||"",videoAuto:o.videoAuto===true,homeMode:o.homeMode||"auto-gray",homeTitle:o.homeTitle||"",homeSub:o.homeSub||"",homePrice:o.homePrice||"",homePill:o.homePill||"",homeTheme:o.homeTheme||"",tagOn:o.tagOn!==false,tag:o.tag||""}
            :{name:(OFF_SLOTS.find(x=>x[0]===key)||[0,""])[1],cartName:"",img:"",note:"",sub:"",price:"",end:"",items:[],tiers:[],videoUrl:"",videoTitle:"",videoAuto:false,homeMode:"auto-gray",homeTitle:"",homeSub:"",homePrice:"",homePill:"",homeTheme:"",tagOn:true,tag:""};
}
async function loadOffer(){
  OFF.loading=true;
  try{
    let v;
    if(typeof fb.get==="function")v=(await fb.get(fb.ref(fb.db,"offers"))).val();
    else{const u=(fb.db&&fb.db.app&&fb.db.app.options&&fb.db.app.options.databaseURL)||"https://data-customer-d722f-default-rtdb.firebaseio.com/";v=await (await fetch(u.replace(/\/$/,"")+"/offers.json")).json();}
    v=v||{};
    if(v.current&&!v.comfort){v.comfort=v.current;OFF.legacy=true;}
    delete v.current;
    OFF.all=v;
  }catch(e){console.error("[offers load]",e);OFF.all={};}
  offPick(OFF.sel);
  OFF.loaded=true;OFF.loading=false;render();
}
function offRead(){   // اقرأ اللي في الخانات قبل أي إعادة رسم
  const g=id=>{const e=$(id);return e?e.value:null;};
  if(!OFF.draft||g("ofName")===null)return;
  OFF.draft.name=g("ofName");OFF.draft.cartName=g("ofCartName");{const v=g("ofImg");if(v||!offIsData(OFF.draft.img))OFF.draft.img=v;}OFF.draft.note=g("ofNote");OFF.draft.sub=g("ofSub");OFF.draft.price=g("ofPrice");OFF.draft.end=g("ofEnd");
  document.querySelectorAll("[data-ofcoltxt]").forEach(i=>{
    OFF.draft.items[+i.dataset.ofcoltxt].colors=i.value.split(/[,،\n]+/).map(x=>x.trim()).filter(Boolean);
  });
  const D2=OFF.draft,gv=id=>{const e=$(id);return e?e.value:null;};
  if(gv("ofHomeMode")!==null){D2.homeMode=gv("ofHomeMode");D2.homeTitle=gv("ofHomeTitle");D2.homeSub=gv("ofHomeSub");D2.homePrice=gv("ofHomePrice");D2.homePill=gv("ofHomePill");D2.homeTheme=gv("ofHomeTheme");D2.tag=gv("ofTag");const tg=$("ofTagOn");if(tg)D2.tagOn=tg.checked;}
  if(gv("ofVideoUrl")!==null){D2.videoUrl=gv("ofVideoUrl");D2.videoTitle=gv("ofVideoTitle");const va=$("ofVideoAuto");if(va)D2.videoAuto=va.checked;}
  document.querySelectorAll("[data-oft]").forEach(i=>{const t=OFF.draft.tiers[+i.dataset.oft];if(t)t[i.dataset.f]=i.value;});
  document.querySelectorAll("[data-ofsize]").forEach(i=>{OFF.draft.items[+i.dataset.ofsize].size=i.value.trim();});
}
function offersCard(){
  if(!OFF.loaded)return `<div class="card"><div class="card-h"><span><i class="fa-solid fa-tags" style="color:var(--pri)"></i> العروض</span></div><div class="hint"><i class="fa-solid fa-spinner fa-spin"></i> جاري التحميل...</div></div>`;
  offUpgrade(OFF.draft);
  offUpgradeIds();
  const d=OFF.draft,key=OFF.sel,o=OFF.all[key],now=Date.now();
  const keys=[...OFF_SLOTS.map(x=>x[0]),...[...new Set([...Object.keys(OFF.all),...OFF.extra])].filter(k=>!OFF_SLOTS.some(x=>x[0]===k))];
  const label=k=>(OFF.all[k]&&OFF.all[k].name)||(OFF_SLOTS.find(x=>x[0]===k)||[0,k])[1];
  const pills=keys.map(k=>{
    const x=OFF.all[k],live=x&&x.endAt>now;
    return `<button type="button" data-ofk="${esc(k)}" style="border:0;cursor:pointer;font:inherit;font-weight:800;font-size:13px;padding:8px 14px;border-radius:99px;background:${k===key?"var(--pri)":"var(--soft,#eef1f7)"};color:${k===key?"#fff":"inherit"}">${live?"🟢":x?"🔴":"⚪"} ${esc(label(k))}</button>`;
  }).join(" ")+` <button type="button" data-ofnew style="border:1px dashed var(--mut);background:none;cursor:pointer;font:inherit;font-weight:800;font-size:13px;padding:8px 14px;border-radius:99px"><i class="fa-solid fa-plus"></i> عرض جديد</button>`;
  let st="";
  if(o){ if(!(o.items&&o.items.length))st=`<span class="badge b3">بدون منتجات</span>`;
    else if(o.endAt<now)st=`<span class="badge b3">انتهى العرض</span>`;
    else{const left=o.endAt-now,dd=Math.floor(left/864e5),h=Math.floor(left/36e5)%24;st=`<span class="badge b2">شغّال — باقي ${fNum(dd)} يوم و ${fNum(h)} ساعة</span>`;} }
  const lb=l=>`<label style="display:block;font-size:12px;font-weight:800;color:var(--mut);margin-bottom:5px">${l}</label>`;
  const rows=d.items.map((it,i)=>{
    const p=findProduct(it.id),cols=offColors(p);
    const keys=p?Object.keys(p).filter(k=>/^color\d+$/.test(k)&&p[k]).sort((m,n)=>parseInt(m.slice(5))-parseInt(n.slice(5))):[];
    const colorsUI=`<input class="inp" data-ofcoltxt="${i}" style="width:100%" placeholder="اكتب color1 أو color_1 أو اسم اللون — وافصل بفاصلة لو أكتر من لون" value="${esc(it.colors.join("، "))}">
      <input class="inp" data-ofsize="${i}" style="width:100%;margin-top:8px" placeholder="المقاس (اختياري — فاضي = بياخده من بيانات المنتج)" value="${esc(it.size||"")}">
      ${keys.length?`<div class="hint" style="padding:6px 0 0">المتاح في المنتج: ${keys.map(k=>`<b dir="ltr">${k}</b> = ${esc(p[k])}`).join(" ، ")}</div>`:""}`;
    return `<div style="border:1px solid var(--line,#e3e6ee);border-radius:14px;padding:12px;margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px"><span style="display:flex;align-items:center;gap:10px">${p&&offImg(p)?`<img src="${esc(offSrc(offImg(p)))}" style="width:46px;height:46px;border-radius:10px;object-fit:cover">`:""}<b>${p?esc(p.name||p.title||""):"⚠️ غير موجود في اللوحة"} <span class="mut" style="font-weight:600">(${esc(it.id)})</span></b></span>
      <button type="button" data-ofrm="${i}" class="btn red" style="padding:4px 10px"><i class="fa-solid fa-xmark"></i></button></div>
      ${colorsUI}
      <div class="hint" style="padding:6px 0 0">${it.colors.length?"":"فاضي = هتتاح كل ألوان المنتج للعميل"}</div></div>`;
  }).join("");
  const tabOn=k=>OFF.tab===k,vis=k=>OFF.tab===k?"":"display:none";
  const doneBasic=!!(d.name&&d.price&&d.end),doneProd=d.items.length>0,doneLook=!!(d.img||d.homeTitle||d.homeSub||d.homePrice||d.homePill||d.homeTheme),doneExtra=!!((d.tiers&&d.tiers.length)||d.videoUrl);
  const tabBtn=(k,n,ic,txt,done,req)=>`<button type="button" data-oftab="${k}" class="oftab${tabOn(k)?" on":""}"><span class="n">${n}</span><i class="fa-solid ${ic}"></i><span class="t">${txt}</span><small>${req?"مطلوب":"اختياري"}</small>${done?'<b class="ok">✓</b>':""}</button>`;
  const guide=(txt)=>`<div class="ofguide">${txt}</div>`;
  const nextBtn=(next,txt,prev)=>`<div class="ofnext">${prev?`<button type="button" class="btn" data-ofgo="${prev}">→ رجوع</button>`:"<span></span>"}${next?`<button type="button" class="btn solid" data-ofgo="${next}">${txt} ←</button>`:""}</div>`;
  return `<div class="card"><div class="card-h"><span><i class="fa-solid fa-tags" style="color:var(--pri)"></i> العروض</span>${st}</div>
    ${OFF.pendingSave?`<div style="margin:12px 16px 0;padding:10px 12px;border-radius:12px;background:#fff7e0;border:1px solid #f0d58a;font-weight:700;font-size:13px">⚠️ حدّثت أكواد المنتجات لصيغة كاملة (القسم-id) عشان ما يحصلش لخبطة بين أقسام. اضغط <b>حفظ</b> عشان تتثبّت.</div>`:""}
    <div style="padding:14px 16px 4px;display:flex;gap:8px;flex-wrap:wrap">${pills}</div>
    <div class="hint" style="padding:6px 16px">رابط الصفحة: <b dir="ltr">offers.html?offer=${esc(key)}</b></div>
    <div class="oftabs" id="ofTabs">${tabBtn("basic","١","fa-pen","الأساسيات",doneBasic,true)}${tabBtn("products","٢","fa-box-open","المنتجات",doneProd,true)}${tabBtn("look","٣","fa-image","الشكل والصور",doneLook,false)}${tabBtn("extras","٤","fa-gift","الخصم والفيديو",doneExtra,false)}</div>
    <div class="ofpanel" data-ofpanel="basic" style="${vis("basic")}">${guide("الخطوة ١ — اكتب <b>اسم العرض</b> و<b>سعره</b> و<b>وقت انتهائه</b>. ده كل اللي محتاجه عشان العرض يشتغل.")}
    <div style="padding:10px 16px;display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px">
      <div>${lb("اسم العرض (بيظهر في السلة)")}<input id="ofName" class="inp" style="width:100%" value="${esc(d.name)}"></div>
      <div>${lb("سعر العرض الإجمالي (ج.م.)")}<input id="ofPrice" type="number" min="1" class="inp" style="width:100%" value="${esc(d.price)}" placeholder="مثلاً 500"></div>
      <div>${lb("وقت انتهاء العرض")}<input id="ofEnd" type="datetime-local" class="inp" style="width:100%" value="${esc(d.end)}"></div>
      <div>${lb("وصف قصير (اختياري)")}<input id="ofSub" class="inp" style="width:100%" value="${esc(d.sub)}" placeholder="مثلاً: فوط قطن للحمام بأعلى جودة"></div>
    </div>
    ${nextBtn("products","التالي: المنتجات")}</div>
    <div class="ofpanel" data-ofpanel="products" style="${vis("products")}">${guide("الخطوة ٢ — دوّر على المنتج بالـ id أو بجزء من اسمه وضيفه للعرض. تقدر تحدد لون ومقاس كل منتج.")}
    <div style="padding:6px 16px 0">${lb("المنتجات واللون اللي هيظهر لكل منتج (color1 أو الاسم)")}
      ${rows||`<div class="hint" style="padding:0 0 8px">لسه مضفتش منتجات</div>`}
      <div style="display:flex;gap:8px;margin:8px 0 4px"><input id="ofAddId" class="inp" style="flex:1" placeholder="اكتب id المنتج (أو جزء من اسمه) وهيظهرلك"><button type="button" class="btn solid" id="ofAdd"><i class="fa-solid fa-magnifying-glass"></i> بحث</button></div><div id="ofFound"></div></div>
    ${nextBtn("look","التالي: الشكل والصور","basic")}</div>
    <div class="ofpanel" data-ofpanel="look" style="${vis("look")}">${guide("الخطوة ٣ (اختياري) — شكل العرض في <b>السلة</b> وفي كارت <b>الصفحة الرئيسية</b>. لو سبتها فاضية بتتحط قيم تلقائية.")}
    <div style="padding:0 16px 10px"><div style="border:1px solid var(--line,#e3e6ee);border-radius:14px;padding:12px;display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px">
      <div style="grid-column:1/-1;font-weight:900"><i class="fa-solid fa-bag-shopping" style="color:var(--pri)"></i> شكل العرض جوه السلة</div>
      <div>${lb("اسم العرض في السلة (فاضي = نفس اسم العرض)")}<input id="ofCartName" class="inp" style="width:100%" value="${esc(d.cartName)}" placeholder="${esc(d.name)}"></div>
      <div>${lb("الوصف تحت الاسم (مكان اللون) — فاضي = أسماء المنتجات والألوان")}<input id="ofNote" class="inp" style="width:100%" value="${esc(d.note)}" placeholder="مثلاً: 3 فوط + بشكير هدية"></div>
      <div style="grid-column:1/-1">${lb("صورة العرض في السلة (رابط أو ارفع من جهازك) — أو دوس على صورة من تحت")}<div style="display:flex;gap:8px"><input id="ofImg" class="inp" style="flex:1" dir="ltr" value="${offIsData(d.img)?"":esc(d.img)}" placeholder="${offIsData(d.img)?"✓ صورة مرفوعة من الجهاز":"https://..."}"><label class="btn" style="cursor:pointer;white-space:nowrap"><i class="fa-solid fa-upload"></i> رفع من الجهاز<input type="file" accept="image/*" data-ofup="img" hidden></label>${d.img?`<button type="button" class="btn red" data-ofclr="img" title="مسح الصورة"><i class="fa-solid fa-xmark"></i></button>`:""}</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">${d.items.map(it=>{const p=findProduct(it.id);return p?[offClean(offImg(p))]:[];}).flat().filter(Boolean).map(u=>`<img data-ofpick="${esc(u)}" src="${esc(offSrc(u))}" style="width:56px;height:56px;border-radius:10px;object-fit:cover;cursor:pointer;border:2px solid ${u===offClean(d.img)?"var(--pri)":"transparent"}">`).join("")}
        ${d.img?`<img src="${esc(offSrc(d.img))}" style="width:56px;height:56px;border-radius:10px;object-fit:cover;margin-inline-start:auto" title="الصورة الحالية">`:""}</div></div>
    </div></div>
    <div style="padding:0 16px 10px"><div style="border:1px solid var(--line,#e3e6ee);border-radius:14px;padding:12px;display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px">
      <div style="grid-column:1/-1;font-weight:900"><i class="fa-solid fa-house" style="color:var(--pri)"></i> كارت العرض في الصفحة الرئيسية (الصورة اللي العميل بيدوس عليها)</div>
      <div style="grid-column:1/-1">${lb("حالة الكارت")}<select id="ofHomeMode" class="inp" style="width:100%">${OFF_MODES.map(m=>`<option value="${m[0]}"${d.homeMode===m[0]?" selected":""}>${m[1]}</option>`).join("")}</select></div>
      <div>${lb("عنوان الكارت (فاضي = اسم العرض)")}<input id="ofHomeTitle" class="inp" style="width:100%" value="${esc(d.homeTitle)}" placeholder="${esc(d.name)}"></div>
      <div>${lb("الوصف تحت العنوان (فاضي = الوصف القصير)")}<input id="ofHomeSub" class="inp" style="width:100%" value="${esc(d.homeSub)}" placeholder="${esc(d.sub)}"></div>
      <div>${lb("السعر على الكارت (فاضي = سعر العرض)")}<input id="ofHomePrice" class="inp" style="width:100%" value="${esc(d.homePrice)}" placeholder="${esc(d.price)}"></div>
      <div>${lb("الشارة (فاضي = خصم % بيتحسب تلقائي)")}<input id="ofHomePill" class="inp" style="width:100%" value="${esc(d.homePill)}" placeholder="مثلاً: خصم 50%"></div>
      <div>${lb("لون الكارت")}<select id="ofHomeTheme" class="inp" style="width:100%">${Object.keys(OFF_THEMES).map(k=>`<option value="${k}"${d.homeTheme===k?" selected":""}>${OFF_THEMES[k][0]}</option>`).join("")}</select></div>
      <div class="hint" style="grid-column:1/-1;padding:0">🖼️ صورة الكارت بتحطها إنت بنفسك في <b>index.html</b> — اللوحة مش بتغيّرها خالص.</div>
      <div style="grid-column:1/-1"><div id="ofHPrev"></div></div>
      <div style="grid-column:1/-1;border-top:1px dashed var(--line,#e3e6ee);padding-top:10px"><label style="display:flex;gap:8px;align-items:center;font-weight:800"><input type="checkbox" id="ofTagOn"${d.tagOn?" checked":""}> اظهر وسم على منتجات العرض في الرئيسية (بيدوس عليه يفتح العرض)</label></div>
      <div style="grid-column:1/-1">${lb("نص الوسم اللي بيظهر على صورة المنتج (فاضي = «موجود في العرض»)")}<input id="ofTag" class="inp" style="width:100%" value="${esc(d.tag)}" placeholder="موجود في العرض"></div>
    </div></div>
    ${nextBtn("extras","التالي: الخصم والفيديو","products")}</div>
    <div class="ofpanel" data-ofpanel="extras" style="${vis("extras")}">${guide("الخطوة ٤ (اختياري) — <b>خصم الكمية</b> لو اشترى أكتر من قطعة، و<b>فيديو توضيحي</b> للعرض. بعدها دوس <b>نشر العرض</b> تحت.")}
    <div style="padding:0 16px 10px"><div style="border:1px solid var(--line,#e3e6ee);border-radius:14px;padding:12px">
      <div style="font-weight:900;margin-bottom:4px"><i class="fa-solid fa-gift" style="color:var(--pri)"></i> خصم الكمية — لو العميل اشترى أكتر من واحد من العرض</div>
      <div class="hint" style="padding:0 0 10px">كل شريحة بتتحفظ كمان كـ <b>كود حقيقي في صفحة أكواد الخصم</b>. «تلقائي» بيتطبق لوحده في السلة، و«كود» بيظهر للعميل في السلة وهو يدوس تطبيق. الخصم بيتحسب على سطر العرض بس.</div>
      ${(d.tiers||[]).map((t,i)=>`<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(105px,1fr));gap:8px;align-items:end;margin-bottom:10px;padding-bottom:10px;border-bottom:1px dashed var(--line,#e3e6ee)">
        <div>${lb("لو اشترى (قطع)")}<input type="number" min="2" class="inp" style="width:100%" data-oft="${i}" data-f="qty" value="${esc(t.qty??"")}"></div>
        <div>${lb("الطريقة")}<select class="inp" style="width:100%" data-oft="${i}" data-f="mode"><option value="auto"${t.mode!=="code"?" selected":""}>يتطبق تلقائي</option><option value="code"${t.mode==="code"?" selected":""}>كود للعميل</option></select></div>
        <div>${lb("نوع الخصم")}<select class="inp" style="width:100%" data-oft="${i}" data-f="type"><option value="percent"${t.type!=="fixed"?" selected":""}>نسبة %</option><option value="fixed"${t.type==="fixed"?" selected":""}>مبلغ ثابت</option></select></div>
        <div>${lb("القيمة")}<input type="number" min="0" class="inp" style="width:100%" data-oft="${i}" data-f="value" value="${esc(t.value??"")}"></div>
        ${t.mode==="code"?`<div>${lb("الكود (فاضي = تلقائي)")}<input class="inp" style="width:100%;text-transform:uppercase" dir="ltr" data-oft="${i}" data-f="code" value="${esc(t.code||"")}" placeholder="مثلاً: PAIR10"></div>`:""}
        <button type="button" class="btn red" data-oftrm="${i}" title="شيل الشريحة"><i class="fa-solid fa-xmark"></i></button></div>`).join("")}
      <button type="button" class="btn" data-oftadd><i class="fa-solid fa-plus"></i> شريحة خصم (مثلاً: لو اشترى 2)</button>
    </div></div>
    <div style="padding:0 16px 10px"><div style="border:1px solid var(--line,#e3e6ee);border-radius:14px;padding:12px;display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px">
      <div style="grid-column:1/-1;font-weight:900"><i class="fa-solid fa-circle-play" style="color:var(--pri)"></i> فيديو توضيحي للعرض (اختياري)</div>
      <div>${lb("اسم الفيديو (بيظهر فوق الفيديو)")}<input id="ofVideoTitle" class="inp" style="width:100%" value="${esc(d.videoTitle)}" placeholder="مثلاً: شوف إيه اللي جوه العرض"></div>
      <div>${lb("رابط الفيديو أو كود التضمين (iframe) — YouTube / Facebook / Vimeo / Drive / mp4")}<input id="ofVideoUrl" class="inp" style="width:100%" dir="ltr" value="${esc(d.videoUrl)}" placeholder="لينك أو كود iframe (يوتيوب / فيسبوك / فيميو / درايف / mp4)"></div>
      <div id="ofVidHint" class="hint" style="grid-column:1/-1;padding:0">${esc(offVidType(d.videoUrl))}</div>
      <label style="grid-column:1/-1;display:flex;gap:8px;align-items:flex-start;font-weight:800"><input type="checkbox" id="ofVideoAuto"${d.videoAuto?" checked":""} style="margin-top:4px"> اظهر الفيديو لوحده أول ما العميل يفتح العرض (وفيه زرار «لا أريد ظهورها مجدداً» العميل يقدر يدوس عليه)</label>
      <div class="hint" style="grid-column:1/-1;padding:0">ارفع الفيديو على يوتيوب (يفضّل «غير مدرج») أو درايف وحط الرابط هنا — الفيديوهات الكبيرة مينفعش تتخزن جوه العرض نفسه.</div>
    </div></div>
    ${nextBtn(null,"","look")}</div>
    <div style="position:sticky;bottom:0;z-index:6;background:var(--card,#fff);border-top:1px solid var(--line,#e3e6ee);border-radius:0 0 18px 18px;padding-top:6px">
    <div class="del-err" id="ofErr" style="padding:0 16px"></div>
    <div style="display:flex;gap:10px;padding:8px 16px 16px"><button type="button" class="btn solid" id="ofSave" style="flex:1">${o?"حفظ التعديلات":"نشر العرض"}</button>${o?`<button type="button" class="btn red" id="ofDel">حذف العرض</button>`:""}</div>
    </div>
    <div class="hint">المنتجات بتتحط في السلة كمنتج واحد بالاسم والسعر اللي هنا، واللون بيتكتب جنب كل منتج. لو حددت أكتر من لون العميل بيختار واحد منهم، ولو حددت لون واحد بيتثبّت.</div></div>`;
}
function offGoTab(k){
  OFF.tab=k;
  document.querySelectorAll("[data-ofpanel]").forEach(p=>{p.style.display=p.dataset.ofpanel===k?"":"none";});
  document.querySelectorAll("[data-oftab]").forEach(b=>b.classList.toggle("on",b.dataset.oftab===k));
  if(k==="look")offPrev();
  const tb=$("ofTabs");if(tb)tb.scrollIntoView({behavior:"smooth",block:"nearest"});
}
function bindOffers(){
  const sv=$("ofSave");if(!sv)return;
  document.querySelectorAll("[data-oftab],[data-ofgo]").forEach(b=>b.onclick=()=>offGoTab(b.dataset.oftab||b.dataset.ofgo));
  const redo=()=>{offRead();render();};
  document.querySelectorAll("[data-ofk]").forEach(b=>b.onclick=()=>{offRead();offPick(b.dataset.ofk);render();});
  const nw=document.querySelector("[data-ofnew]");
  if(nw)nw.onclick=()=>{
    const k=(prompt("اكتب كود قصير للعرض بالإنجليزي (مثلاً: sheets)")||"").trim().toLowerCase().replace(/[^a-z0-9_-]/g,"");
    if(!k)return;offRead();
    if(!OFF.extra.includes(k)&&!OFF_SLOTS.some(x=>x[0]===k)&&!OFF.all[k])OFF.extra.push(k);
    offPick(k);render();
  };
  const showFound=()=>{
    const q=$("ofAddId").value,box=$("ofFound");
    if(!q.trim()){box.innerHTML="";return;}
    const res=offSearch(q);
    if(!res.length){box.innerHTML=`<div class="hint" style="padding:8px 0;color:#c62828">❌ مفيش منتج بالـ id أو الاسم ده</div>`;return;}
    box.innerHTML=res.map((p,i)=>{
      const ref=offRef(p),has=OFF.draft.items.some(x=>x.id===ref);
      return `<div style="display:flex;align-items:center;gap:12px;border:1px solid var(--line,#e3e6ee);border-radius:14px;padding:10px;margin-bottom:8px">
        ${offImg(p)?`<img src="${esc(offSrc(offImg(p)))}" style="width:64px;height:64px;border-radius:12px;object-fit:cover">`:`<div style="width:64px;height:64px;border-radius:12px;background:#eee"></div>`}
        <div style="flex:1;min-width:0"><b>${esc(p.name||p.title||"")}</b><div class="mut" style="font-size:12px">id: ${esc(ref)}${p.price?` · ${esc(p.price)} ج.م`:""}</div></div>
        <button type="button" class="btn ${has?"":"solid"}" data-offound="${i}" ${has?"disabled":""}>${has?"✓ مضاف":"<i class=\"fa-solid fa-plus\"></i> أضف للعرض"}</button></div>`;
    }).join("");
    box.querySelectorAll("[data-offound]").forEach(b=>b.onclick=()=>{
      offRead();const p=res[+b.dataset.offound];
      OFF.draft.items.push({id:offRef(p),colors:[],size:""});render();
    });
  };
  let _t;$("ofAddId").oninput=()=>{clearTimeout(_t);_t=setTimeout(showFound,250);};
  const add=showFound;
  document.querySelectorAll("[data-ofup]").forEach(inp=>inp.onchange=async()=>{
    const f=inp.files&&inp.files[0];if(!f)return;
    const fld=inp.dataset.ofup;
    try{
      const url=await offCompress(f,fld==="img"?420:640,.82);
      offRead();OFF.draft[fld]=url;render();toast("✅ اتحملت الصورة ("+Math.round(url.length*.75/1024)+" KB)");
    }catch(e){console.error(e);toast("❌ مقدرتش أقرأ الصورة دي");}
  });
  document.querySelectorAll("[data-ofclr]").forEach(b=>b.onclick=()=>{offRead();OFF.draft[b.dataset.ofclr]="";render();});
  const ta=document.querySelector("[data-oftadd]");
  if(ta)ta.onclick=()=>{offRead();const has=OFF.draft.tiers.map(t=>+t.qty);OFF.draft.tiers.push({qty:Math.max(1,...has,1)+1,mode:"auto",type:"percent",value:"",code:""});render();};
  document.querySelectorAll("[data-oftrm]").forEach(b=>b.onclick=()=>{offRead();OFF.draft.tiers.splice(+b.dataset.oftrm,1);render();});
  document.querySelectorAll('[data-oft][data-f="mode"]').forEach(x=>x.onchange=()=>{offRead();render();});
  {const vu=$("ofVideoUrl");if(vu)vu.oninput=()=>{const h=$("ofVidHint");if(h)h.textContent=offVidType(vu.value);};}
  ["ofHomeMode","ofHomeTitle","ofHomeSub","ofHomePrice","ofHomePill","ofHomeTheme","ofName","ofSub","ofPrice"].forEach(id=>{const e=$(id);if(e){e.oninput=offPrev;e.onchange=offPrev;}});
  offPrev();
  document.querySelectorAll("[data-ofpick]").forEach(i=>i.onclick=()=>{offRead();OFF.draft.img=i.dataset.ofpick;render();});
  $("ofAdd").onclick=add;$("ofAddId").onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();add();}};
  document.querySelectorAll("[data-ofrm]").forEach(b=>b.onclick=()=>{offRead();OFF.draft.items.splice(+b.dataset.ofrm,1);render();});
  document.querySelectorAll("[data-ofcol]").forEach(b=>b.onclick=()=>{
    offRead();const it=OFF.draft.items[+b.dataset.ofcol],c=b.dataset.c,i=it.colors.indexOf(c);
    i>=0?it.colors.splice(i,1):it.colors.push(c);render();
  });
  sv.onclick=async()=>{
    offRead();offUpgrade(OFF.draft);const d=OFF.draft,err=$("ofErr");err.textContent="";
    const name=d.name.trim(),price=parseFloat(d.price),endAt=new Date(d.end).getTime();
    if(!name){err.textContent="اكتب اسم العرض";offGoTab("basic");return;}
    const has=d.items.length>0;                     // من غير منتجات: ينفع تحفظ إعدادات الكارت (هيظهر رمادي أو مخفي)
    if(has&&(!price||price<=0)){err.textContent="اكتب سعر العرض";offGoTab("basic");return;}
    if(has&&(!d.end||!endAt)){err.textContent="حدد وقت انتهاء العرض";offGoTab("basic");return;}
    if(has&&endAt<=Date.now()){err.textContent="وقت الانتهاء لازم يكون في المستقبل";offGoTab("basic");return;}
    let sum=0;d.items.forEach(x=>{const p=findProduct(x.id);sum+=p?(parseFloat(p.price)||0):0;});
    const autoPill=(sum>price&&price>0)?"خصم "+Math.round((sum-price)/sum*100)+"%":"";
    if(offVidSrc(d.videoUrl)&&offVidType(d.videoUrl).startsWith("❌")){err.textContent="رابط الفيديو مش مدعوم";offGoTab("extras");return;}
    const key=OFF.sel;
    const tiers=[],seen=new Set();
    for(const t of d.tiers){
      const q=parseInt(t.qty),v=parseFloat(t.value);
      if(!q||q<2){err.textContent="شريحة الخصم: عدد القطع لازم يكون 2 أو أكتر";offGoTab("extras");return;}
      if(!v||v<=0){err.textContent="شريحة الخصم: اكتب قيمة الخصم";offGoTab("extras");return;}
      if(t.type!=="fixed"&&v>100){err.textContent="نسبة الخصم متقدرش تزيد عن 100%";offGoTab("extras");return;}
      if(seen.has(q)){err.textContent="فيه شريحتين لنفس عدد القطع ("+q+")";return;}
      seen.add(q);
      const mode=t.mode==="code"?"code":"auto",ck="of_"+key+"_"+q;
      let code=String(t.code||"").trim().toUpperCase(),typed=!!code;
      if(!code){code=(mode==="auto"?"AUTO-":"")+(key.replace(/[^A-Za-z0-9]/g,"").toUpperCase().slice(0,6)||"OFFER")+q+(mode==="code"?"X":"");}
      if(!/^[A-Za-z0-9_-]{3,20}$/.test(code)){err.textContent="الكود لازم يكون حروف/أرقام إنجليزي (3-20 خانة)";return;}
      const dup=D.coupons.find(x=>String(x.code).toUpperCase()===code&&x.key!==ck)||tiers.find(x=>x.code===code);
      if(dup){if(typed){err.textContent="الكود "+code+" مستخدم قبل كده";return;}code=code.slice(0,17)+Math.random().toString(36).slice(2,5).toUpperCase();}
      tiers.push({qty:q,mode,type:t.type==="fixed"?"fixed":"percent",value:v,code});
    }
    const data={id:"offer-"+key+"-"+Date.now(),key,name,cartName:d.cartName.trim(),img:d.img.trim(),note:d.note.trim(),sub:d.sub.trim(),price:price||0,endAt:endAt||0,items:d.items.map(x=>({id:x.id,colors:x.colors,size:x.size||""})),homeMode:d.homeMode,homeTitle:d.homeTitle.trim(),homeSub:d.homeSub.trim(),homePrice:String(d.homePrice).trim(),homePill:d.homePill.trim()||autoPill,homeTheme:d.homeTheme,tagOn:!!d.tagOn,tag:d.tag.trim(),tiers,videoUrl:offVidSrc(d.videoUrl),videoTitle:d.videoTitle.trim(),videoAuto:!!d.videoAuto&&!!offVidSrc(d.videoUrl),updatedAt:Date.now()};
    sv.disabled=true;
    try{
      const up={["offers/"+key]:data},cpNew=[];
      tiers.forEach(t=>{                                   // كل شريحة = كود حقيقي في صفحة أكواد الخصم
        const ck="of_"+key+"_"+t.qty,old=D.coupons.find(x=>x.key===ck)||{};
        const cp={code:t.code,type:t.type,value:t.value,maxDiscount:null,minOrder:null,targetType:"all",targetValue:"",startAt:null,
          expiresAt:endAt||null,maxUses:old.maxUses||null,maxUsesPerCustomer:old.maxUsesPerCustomer||null,usedCount:old.usedCount||0,usedBy:old.usedBy||null,
          active:has,autoApply:t.mode==="auto",unlisted:t.mode==="code",note:`عرض «${name}» — لو اشترى ${t.qty} أو أكتر`,
          createdAt:old.createdAt||Date.now(),updatedAt:Date.now(),offerKey:key,minOfferQty:t.qty,offerName:name,source:"offer"};
        up["coupons/"+ck]=cp;cpNew.push({key:ck,...cp});
      });
      D.coupons.filter(x=>x.offerKey===key&&!tiers.some(t=>"of_"+key+"_"+t.qty===x.key)).forEach(x=>{up["coupons/"+x.key]=null;});
      if(key==="comfort"&&OFF.legacy){up["offers/current"]=null;OFF.legacy=false;}
      await fb.update(fb.ref(fb.db),up);OFF.all[key]=data;OFF.pendingSave=false;
      D.coupons=D.coupons.filter(x=>x.offerKey!==key).concat(cpNew);{const cc=$("cntCoupons");if(cc)cc.textContent=fNum(D.coupons.length);}toast("✅ اتحفظ العرض");render();
    }catch(e){console.error(e);err.textContent="❌ حصل خطأ في الحفظ (راجع الـ Rules: offers)";sv.disabled=false;}
  };
  const dl=$("ofDel");
  if(dl)dl.onclick=async()=>{
    if(!confirm("حذف العرض ده؟"))return;
    try{const key=OFF.sel,up={["offers/"+key]:null};if(key==="comfort")up["offers/current"]=null;
      D.coupons.filter(x=>x.offerKey===key).forEach(x=>{up["coupons/"+x.key]=null;});
      await fb.update(fb.ref(fb.db),up);D.coupons=D.coupons.filter(x=>x.offerKey!==key);{const cc=$("cntCoupons");if(cc)cc.textContent=fNum(D.coupons.length);}delete OFF.all[key];offPick(key);toast("🗑️ اتحذف العرض");render();}
    catch(e){console.error(e);toast("❌ فشل الحذف");}
  };
}

function vStats(){
  const tab=window._at||"over",N=window._awin||14;
  const tabs=`<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:16px"><div class="seg"><button type="button" data-atab="over" class="${tab==="over"?"on":""}">نظرة عامة</button><button type="button" data-atab="ins" class="${tab==="ins"?"on":""}"><i class="fa-solid fa-lightbulb"></i> التحليل والتوصيات</button><button type="button" data-atab="offers" class="${tab==="offers"?"on":""}"><i class="fa-solid fa-tags"></i> العروض</button></div>${tab==="ins"?`<select class="sel" id="awin">${[7,14,30,60].map(n=>`<option value="${n}"${n===N?" selected":""}>مقارنة آخر ${fNum(n)} يوم بالفترة اللي قبلها</option>`).join("")}</select>`:""}</div>`;
  if(tab==="offers"){if(!OFF.loaded&&!OFF.loading)loadOffer();return tabs+offersCard();}
  return tabs+(tab==="ins"?INS.html(N)+peakTimesHtml():goalsCard()+vOverview());
}

// ---------- ربط أحداث الإحصائيات والإيرادات (بيتنادى من bind() في admin.js) ----------
async function runTrackerTest(btn){
  const old=btn.innerHTML;btn.disabled=true;btn.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> بيجرّب...';
  try{
    await fb.update(fb.ref(fb.db),{"analytics/_diag/t":Date.now()});
    await fb.remove(fb.ref(fb.db,"analytics/_diag"));
    toast("✅ الكتابة في analytics شغّالة — يبقى الناقص إضافة tracker.js في الصفحات");
  }catch(e){
    console.error("[analytics test]",e);
    toast("❌ Firebase رفض الكتابة في analytics — عدّل الـ Rules");
    alert("Firebase رفض الكتابة على analytics:\n"+(e&&e.message||e)+"\n\nافتح Firebase Console ← Realtime Database ← Rules وضيف:\n\n\"analytics\": { \".read\": true, \".write\": true }");
  }finally{btn.disabled=false;btn.innerHTML=old;}
}
const INS=createInsights({D,esc,fNum,money,resolveItem,sKey,catName,statChip,isNegative,findProduct});
function bindStats(){
  document.querySelectorAll("[data-atab]").forEach(el=>el.onclick=()=>{window._at=el.dataset.atab;render();});
  const aw=$("awin");if(aw)aw.onchange=()=>{window._awin=parseInt(aw.value)||14;render();};
  const am=document.querySelector("[data-amore]");if(am)am.onclick=()=>{window._amore=!window._amore;render();};
  document.querySelectorAll("[data-rg]").forEach(el=>el.onclick=()=>{RVS.g=el.dataset.rg;if(RV_DEF[RVS.g])RVS.n=RV_DEF[RVS.g];render();});
  const rn=$("rvN");if(rn)rn.onchange=()=>{RVS.n=parseInt(rn.value)||RV_DEF[RVS.g];render();};
  const rf=$("rvF");if(rf)rf.onchange=()=>{RVS.f=rf.value;render();};
  const rApply=$("rvApply");
  if(rApply)rApply.onclick=()=>{
    const cf=$("rvFrom").value,ct=$("rvTo").value;
    if(!cf||!ct){toast("❌ اختار التاريخين");return;}
    RVS.cf=cf;RVS.ct=ct;render();
  };
  document.querySelectorAll("[data-rlg]").forEach(el=>el.onclick=()=>{const k=el.dataset.rlg;RVS.hide[k]=!RVS.hide[k];if(RV_SER.every(s=>RVS.hide[s.k]))RVS.hide[k]=false;render();});
  document.querySelectorAll("[data-rep]").forEach(el=>el.onclick=()=>openReport(el.dataset.rep));
  const cpk=document.querySelector("[data-cpkpi]");
  if(cpk)cpk.onclick=()=>{
    if(!_cpModalData)return;
    openModal(_cpModalData.title,`${statsTable(["الكود","الاستخدام دلوقتي","الاستخدام قبل كده","النشاط","إجمالي الخصم"],_cpModalData.rows,"مفيش أكواد خصم اتستخدمت في الفترة دي")}<div class="hint" style="margin-top:10px">"النشاط" بيقارن عدد مرات استخدام الكود في الفترة الحالية بالفترة اللي قبلها بنفس الطول.</div>`);
  };
  const pk=$("pkwin");if(pk)pk.onchange=()=>{window._pkwin=parseInt(pk.value);render();};
  bindOffers();
  const gn=document.querySelector("[data-glnew]");if(gn)gn.onclick=()=>openGoalForm(null);
  document.querySelectorAll("[data-gledit]").forEach(b=>b.onclick=()=>{const c=D.coupons.find(x=>x.key===b.dataset.gledit);if(c)openGoalForm(c);});
  document.querySelectorAll("[data-gldel]").forEach(b=>b.onclick=async()=>{
    const c=D.coupons.find(x=>x.key===b.dataset.gldel);if(!c)return;
    if(!confirm(`حذف هدف الكود "${c.code}"؟ (الكود نفسه مش هيتأثر)`))return;
    b.disabled=true;
    try{await fb.update(fb.ref(fb.db),{[`coupons/${c.key}/goal`]:null});delete c.goal;toast("🗑️ اتحذف الهدف");render();}
    catch(e){console.error(e);toast("❌ فشل حذف الهدف");b.disabled=false;}
  });
  rvBindCharts();
  const as=$("asort");if(as)as.onchange=()=>{window._as=as.value;render();};
  const tt=document.querySelector("[data-trtest]");if(tt)tt.onclick=()=>runTrackerTest(tt);
}

return{vOffers:offersCard,loadOffer,vStats,vRevenue,bestSellersRows,computeStats,statsTable,BEST_HEAD,bind:bindStats};
}