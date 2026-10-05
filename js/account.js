import{initializeApp}from"https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import{getDatabase,ref,set,get,update,onValue,off,remove,query,orderByChild,equalTo}from"https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import{getFirestore,doc,getDoc}from"https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import"./ban-notice.js";   // رسالة الحساب الملغي
const cfg={apiKey:"AIzaSyCCk0w_KHVCswjp16TSkNToRSSOjlPC5kE",authDomain:"data-customer-d722f.firebaseapp.com",databaseURL:"https://data-customer-d722f-default-rtdb.firebaseio.com/",projectId:"data-customer-d722f",storageBucket:"data-customer-d722f.firebasestorage.app",messagingSenderId:"398522341614",appId:"1:398522341614:web:99e0f897c61ec960cffbff"};
const app=initializeApp(cfg);
const db=getDatabase(app);
const fsdb=getFirestore(app);
const eKey=e=>e.replace(/\./g,"_").replace(/@/g,"__");
let _lp=null;

// toast
function toast(msg,type="info"){
  let t=document.getElementById("toast-acc");
  if(!t){t=document.createElement("div");t.id="toast-acc";document.body.appendChild(t);}
  t.style.borderColor={success:"#2e7d32",error:"#e53935",info:"#c8a96e"}[type]||"#c8a96e";
  t.textContent=msg;
  requestAnimationFrame(()=>{t.style.opacity="1";t.style.transform="translateX(-50%) translateY(0)";});
  clearTimeout(t._t);t._t=setTimeout(()=>{t.style.opacity="0";t.style.transform="translateX(-50%) translateY(70px)";},3200);
}

// tab switch
window.switchTab=function(name,btn){
  document.querySelectorAll(".tab-panel").forEach(p=>p.classList.remove("active"));
  document.querySelectorAll(".nav-btn").forEach(b=>b.classList.remove("active"));
  document.getElementById("tab-"+name).classList.add("active");
  btn.classList.add("active");
  if(name==="settings"){const e=localStorage.getItem("kashmirSessionEmail");if(e)renderDevices(e);}
  if(name==="location"){const e=localStorage.getItem("kashmirSessionEmail");hideMapStep();renderAddressList(e);}
  if(name==="comments"){const e=localStorage.getItem("kashmirSessionEmail");renderMyComments(e);}
  if(name==="orders"){const e=localStorage.getItem("kashmirSessionEmail");renderOrders(e);}
  if(name==="discount"){const e=localStorage.getItem("kashmirSessionEmail");renderDiscountCoupons(e);}
  if(name==="wallet"){const e=localStorage.getItem("kashmirSessionEmail");renderWallet(e);}
};

// ---------- 💰 رصيدك ----------
// فتح اللعبة جوه الصفحة (iframe بملء الشاشة) — الجوائز بتتضاف للرصيد تلقائي
window.openGame=function(){
  let box=document.getElementById("gameFrameBox");
  if(!box){box=document.createElement("div");box.id="gameFrameBox";document.body.appendChild(box);}
  box.innerHTML=`<iframe src="../game.html" allow="autoplay" title="Gravity Surge"></iframe>`;
  box.classList.add("open");document.body.style.overflow="hidden";
};
window.closeGame=function(){
  const box=document.getElementById("gameFrameBox");
  if(box){box.classList.remove("open");box.innerHTML="";}
  document.body.style.overflow="";
  const e=localStorage.getItem("kashmirSessionEmail");if(e)renderWallet(e);   // نحدّث الرصيد بعد اللعب
};
window.addEventListener("message",ev=>{if(ev.data&&ev.data.type==="gs-close")window.closeGame();});

async function renderWallet(email){
  const list=document.getElementById("walletList"),balEl=document.getElementById("walletBal"),stats=document.getElementById("walletStats");
  if(!list)return;
  const fm=n=>Number(n||0).toLocaleString("ar-EG",{minimumFractionDigits:2,maximumFractionDigits:2})+" ج.م.";
  if(!email){list.innerHTML=`<div class="wl-empty">سجّل الدخول الأول</div>`;return;}
  list.innerHTML=`<p class="my-comments-loading">جاري التحميل...</p>`;
  let w=null;
  try{const s=await get(ref(db,`wallet/${eKey(email)}`));w=s.exists()?s.val():null;}
  catch(e){console.error("renderWallet:",e);list.innerHTML=`<div class="wl-empty">تعذّر تحميل الرصيد</div>`;return;}
  try{const gv=await get(ref(db,"gameConfig/visible"));const card=document.querySelector(".wl-game");if(card)card.style.display=gv.val()===true?"":"none";}catch(e){}
  const bal=Math.max(0,Number(w&&w.balance)||0);
  const log=Object.entries((w&&w.log)||{}).map(([id,v])=>({id,...v})).sort((a,b)=>(b.at||0)-(a.at||0));
  const sum=t=>log.filter(x=>x.type===t&&!x.deleted).reduce((n,x)=>n+(Number(x.amount)||0),0);
  balEl.textContent=fm(bal);
  stats.innerHTML=`
    <div class="my-stat-card"><div class="my-stat-icon green"><i class="fa-solid fa-circle-plus"></i></div><div><div style="font-size:12px;color:#888">إجمالي اللي اتضاف</div><b>${fm(sum("credit"))}</b></div></div>
    <div class="my-stat-card"><div class="my-stat-icon gold"><i class="fa-solid fa-bag-shopping"></i></div><div><div style="font-size:12px;color:#888">إجمالي اللي صرفته</div><b>${fm(sum("debit"))}</b></div></div>`;
  if(!log.length){list.innerHTML=`<div class="wl-empty">مفيش حركات على رصيدك لسه</div>`;return;}
  list.innerHTML=log.map(x=>{
    const amt=Number(x.amount)||0;
    const cfg={credit:["تمت إضافة رصيد","in","+"],refund:["استرجاع للرصيد","in","+"],debit:["صرفته في طلب","out","−"],deduct:["خصم من الرصيد","out","−"]}[x.type]||["حركة","","" ];
    const when=x.at?new Date(x.at).toLocaleString("ar-EG",{year:"numeric",month:"long",day:"numeric",hour:"2-digit",minute:"2-digit"}):"";
    let d="";
    if(x.type==="debit")d=`${x.orderCode?`طلب <b>${escHtml(x.orderCode)}</b>`:""}${x.desc?` — ${escHtml(x.desc)}`:""}`;
    else d=escHtml(x.note||"")+(x.orderCode?` (طلب ${escHtml(x.orderCode)})`:"");
    const edits=Object.values(x.edits||{}).sort((a,b)=>(a.at||0)-(b.at||0)).map(e=>`<div style="color:#b26a00;font-size:12px;margin-top:3px">✏️ ${escHtml(new Date(e.at).toLocaleString("ar-EG",{year:"numeric",month:"long",day:"numeric",hour:"2-digit",minute:"2-digit"}))} — ${escHtml(e.text)}</div>`).join("");
    return `<div class="wl-item"${x.deleted?' style="opacity:.55"':""}><div><div class="wl-t">${cfg[0]}${x.deleted?" — 🗑️ محذوفة":""}</div><div class="wl-d">${d?d+"<br>":""}${escHtml(when)}${edits}</div></div><div class="wl-a ${cfg[1]}"${x.deleted?' style="text-decoration:line-through"':""}>${cfg[2]}${fm(amt)}</div></div>`;
  }).join("");
}

// dark mode
const dmToggle=document.getElementById("darkModeToggle");
function applyDark(on){document.documentElement.setAttribute("data-theme",on?"dark":"light");if(dmToggle)dmToggle.checked=on;}
applyDark(localStorage.getItem("kashmirDarkMode")==="1");
dmToggle?.addEventListener("change",()=>{localStorage.setItem("kashmirDarkMode",dmToggle.checked?"1":"0");applyDark(dmToggle.checked);});

// mute
const muteToggle=document.getElementById("muteToggle");
function applyMute(on){
  document.querySelectorAll("video,audio").forEach(m=>m.muted=on);
  const ico=document.getElementById("muteIcon");
  if(ico)ico.className=on?"fa-solid fa-volume-xmark":"fa-solid fa-volume-high";
  if(muteToggle)muteToggle.checked=on;
}
applyMute(localStorage.getItem("kashmirMuted")==="1");
muteToggle?.addEventListener("change",()=>{localStorage.setItem("kashmirMuted",muteToggle.checked?"1":"0");applyMute(muteToggle.checked);toast(muteToggle.checked?"🔇 تم كتم الأصوات":"🔊 تم تشغيل الأصوات","info");});

// copy coupon
window.copyCoupon=function(el,code){
  navigator.clipboard.writeText(code).then(()=>{const h=el.querySelector("h4"),o=h.textContent;h.textContent="✅ تم النسخ!";setTimeout(()=>h.textContent=o,1800);}).catch(()=>toast("❌ تعذّر النسخ","error"));
};

// ============================================================
//  🏷️ أكواد الخصم — بتعرض للعميل الأكواد المتاحة له (عامة لكل العملاء
//  أو مخصصة له بالإيميل/الاسم) من نفس عقدة "coupons" اللي بيديرها الأدمن.
// ============================================================
const _normName=s=>String(s||"").replace(/[\u064B-\u065F\u0640]/g,"").replace(/[أإآ]/g,"ا").replace(/ى/g,"ي").replace(/ة/g,"ه").replace(/\s+/g," ").trim().toLowerCase();
function _currentUserName(){
  try{const u=JSON.parse(localStorage.getItem("kashmirUser")||"null");if(u)return[u.firstName,u.lastName].filter(Boolean).join(" ")||u.name||"";}catch(e){}
  return "";
}
async function renderDiscountCoupons(email){
  const box=document.querySelector("#tab-discount .info-card");
  if(!box)return;
  const header=box.querySelector(".card-header");
  box.innerHTML="";
  if(header)box.appendChild(header);
  const msg=document.createElement("p");
  msg.style.cssText="text-align:center;padding:30px 10px;color:#9da9bb;font-size:13px";
  msg.textContent="جاري تحميل الأكواد...";
  box.appendChild(msg);

  let coupons=[];
  try{
    const snap=await get(ref(db,"coupons"));
    if(snap.exists()){const val=snap.val();coupons=Object.entries(val).map(([id,c])=>({id,...c}));}
  }catch(e){console.error("coupons load failed",e);}

  const now=Date.now(),name=_currentUserName();
  const visible=coupons.filter(c=>{
    if(!c.offerKey){   // أكواد العروض (خصم الكمية) بتظهر دايماً مع زرار "شوف العرض"
      if(c.autoApply)return false; // خصم تلقائي بيتطبق لوحده على السلة، مش كود يتعرض للعميل
      if(c.unlisted)return false; // كود سبونسر/انفلونسر — شغال بالكود بس مش معروض هنا
    }
    if(c.active===false)return false;
    if(c.startAt&&now<c.startAt)return false;
    if(c.expiresAt&&now>c.expiresAt)return false;
    if(c.maxUses&&(c.usedCount||0)>=c.maxUses)return false;
    if(!c.targetType||c.targetType==="all")return true;
    if(c.targetType==="email")return !!email&&String(c.targetValue||"").toLowerCase()===String(email).toLowerCase();
    if(c.targetType==="name")return !!name&&_normName(c.targetValue)===_normName(name);
    return false;
  }).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));

  msg.remove();

  if(!visible.length){
    const empty=document.createElement("p");
    empty.style.cssText="text-align:center;padding:30px 10px;color:#9da9bb;font-size:13px";
    empty.textContent="مفيش أكواد خصم متاحة ليك دلوقتي";
    box.appendChild(empty);
    return;
  }

  visible.forEach(c=>{
    const title=c.type==="percent"?`كود خصم ${c.value}%${c.maxDiscount?` (حتى ${Number(c.maxDiscount).toLocaleString("ar-EG")} ج.م.)`:""}`:`كود خصم ${Number(c.value).toLocaleString("ar-EG")} ج.م.`;
    const expText=c.expiresAt?`ساري حتى ${new Date(c.expiresAt).toLocaleDateString("ar-EG",{year:"numeric",month:"long",day:"numeric"})}`:"بدون تاريخ انتهاء";
    const badgeTxt=c.type==="percent"?`خصم<br>${c.value}%`:`خصم<br>${Number(c.value).toLocaleString("ar-EG")}ج.م.`;
    const usesParts=[];
    if(c.maxUses){
      const remaining=Math.max(0,c.maxUses-(c.usedCount||0));
      usesParts.push(`هذا الكود متاح للاستخدام ${remaining.toLocaleString("ar-EG")} من ${c.maxUses.toLocaleString("ar-EG")} استخدام`);
    }
    if(c.maxUsesPerCustomer)usesParts.push(c.maxUsesPerCustomer===1?"مرة واحدة لكل عميل":`${c.maxUsesPerCustomer.toLocaleString("ar-EG")} مرات لكل عميل`);
    const usesText=usesParts.join(" • ");
    const isOffer=!!c.offerKey;
    const offerTitle=isOffer?`${c.type==="percent"?`خصم ${c.value}%`:`خصم ${Number(c.value).toLocaleString("ar-EG")} ج.م.`} على «${c.offerName||"العرض"}» لو اشتريت ${Number(c.minOfferQty||1).toLocaleString("ar-EG")} أو أكتر`:"";
    const offerHref=isOffer?`../offers.html?offer=${encodeURIComponent(c.offerKey)}`:"";
    const card=document.createElement("div");
    card.className="coupon-card";
    card.innerHTML=`
      <div class="coupon-badge"><p>${badgeTxt}</p></div>
      <div class="coupon-body">
        <div class="coupon-meta">
          <div class="coupon-info">
            <h3>${escHtml(isOffer?offerTitle:title)}${!isOffer&&c.note?` — ${escHtml(c.note)}`:""}</h3>
            <div class="exp">${escHtml(expText)}</div>
            ${usesText?`<div class="exp">${escHtml(usesText)}</div>`:""}
          </div>
          <div class="coupon-store"><img src="../login.png" alt=""></div>
        </div>
        ${isOffer&&c.autoApply
          ?`<div style="margin:8px 0 0;padding:10px 12px;border-radius:12px;background:#e8f7ec;color:#1b5e20;font-weight:800;font-size:13px;text-align:center">🔁 بيتطبق تلقائي في سلتك لما تشتري ${Number(c.minOfferQty||1).toLocaleString("ar-EG")} من العرض</div>`
          :`<div class="coupon-code-row" onclick="copyCoupon(this,'${escHtml(c.code)}')"><h4>${escHtml(c.code)}</h4></div>`}
        ${isOffer?`<a href="${offerHref}" style="display:flex;align-items:center;justify-content:center;gap:8px;margin-top:10px;padding:11px;border-radius:12px;background:linear-gradient(227deg,#f5934e,#d27039);color:#fff;font-weight:900;font-size:14px;text-decoration:none">شوف العرض <i class="fa-solid fa-arrow-left"></i></a>`:""}
      </div>`;
    box.appendChild(card);
  });
}



// session
function devInfo(){const ua=navigator.userAgent;let d="جهاز",ic="💻";if(/iPhone/.test(ua)){d="iPhone";ic="📱";}else if(/iPad/.test(ua)){d="iPad";ic="📱";}else if(/Android/.test(ua)&&/Mobile/.test(ua)){d="Android موبايل";ic="📱";}else if(/Android/.test(ua)){d="Android تابلت";ic="📱";}else if(/Mac/.test(ua)){d="Mac";ic="💻";}else if(/Windows/.test(ua)){d="Windows PC";ic="🖥️";}else if(/Linux/.test(ua)){d="Linux";ic="🖥️";}let b="متصفح";if(/Chrome/.test(ua)&&!/Edg/.test(ua))b="Chrome";else if(/Firefox/.test(ua))b="Firefox";else if(/Safari/.test(ua))b="Safari";else if(/Edg/.test(ua))b="Edge";return{device:d,browser:b,icon:ic};}
function clearLocal(){["kashmirSessionId","kashmirSessionEmail","kashmirUser"].forEach(k=>localStorage.removeItem(k));}
async function destroySess(email,sid){try{await remove(ref(db,`sessions/${eKey(email)}/${sid}`));}catch(e){}}
async function validateSession(){const sid=localStorage.getItem("kashmirSessionId"),email=localStorage.getItem("kashmirSessionEmail");if(!sid||!email)return null;try{const sn=await get(ref(db,`sessions/${eKey(email)}/${sid}`));if(!sn.exists()||!sn.val().isActive){clearLocal();return null;}await set(ref(db,`sessions/${eKey(email)}/${sid}/lastSeen`),Date.now());return sn.val();}catch(e){return null;}}
function watchSession(email,sid){const path=`sessions/${eKey(email)}/${sid}`;if(_lp){try{off(ref(db,_lp));}catch(e){}}_lp=path;onValue(ref(db,path),(sn)=>{if(!sn.exists()||!sn.val().isActive){clearLocal();document.getElementById("forcedLogoutOverlay").classList.add("open");}});}

// devices
async function renderDevices(email){
  const c=document.getElementById("devices-list");if(!c)return;
  c.innerHTML=`<p style="color:var(--text-light);text-align:center;padding:20px;font-size:13px">جاري التحميل...</p>`;
  const sn=await get(ref(db,`sessions/${eKey(email)}`));
  if(!sn.exists()){c.innerHTML=`<p style="color:var(--text-light);text-align:center;padding:20px;font-size:13px">لا توجد أجهزة متصلة</p>`;return;}
  const sessions=sn.val(),mySid=localStorage.getItem("kashmirSessionId");
  let html="";
  Object.entries(sessions).sort(([,a],[,b])=>new Date(b.loginAt)-new Date(a.loginAt)).forEach(([sid,d])=>{
    const isMine=sid===mySid,date=new Date(d.loginAt).toLocaleDateString("ar-EG",{year:"numeric",month:"long",day:"numeric",hour:"2-digit",minute:"2-digit"});
    html+=`<div class="device-card ${isMine?"device-current":""}"><div class="device-icon">${d.icon||"💻"}</div><div class="device-info"><h4>${d.device||"جهاز"} — ${d.browser||"متصفح"} ${isMine?'<span class="device-badge">هذا الجهاز</span>':""}</h4><p>آخر دخول: ${date}</p></div>${!isMine?`<button class="device-end-btn" onclick="logoutDevice('${email}','${sid}')"><i class="fa-solid fa-right-from-bracket"></i> إنهاء</button>`:""}</div>`;
  });
  c.innerHTML=html;
}
window.logoutDevice=async function(email,sid){try{await remove(ref(db,`sessions/${eKey(email)}/${sid}`));toast("✅ تم إنهاء الجلسة","success");setTimeout(()=>renderDevices(email),700);}catch(e){toast("❌ حدث خطأ","error");}};
window.logoutAllDevices=async function(){const email=localStorage.getItem("kashmirSessionEmail");if(!email)return;try{await remove(ref(db,`sessions/${eKey(email)}`));clearLocal();toast("✅ تم تسجيل الخروج من كل الأجهزة","success");setTimeout(()=>location.href="../index.html",1500);}catch(e){toast("❌ حدث خطأ","error");}};

// ===== العناوين (Addresses, noon-style) =====
let _locMap=null,_locCenter=null,_locSearchTO=null,_pendingAddressId=null,_pendingAddressExisting=null,_selectedType="home";

function hideMapStep(){
  document.getElementById("locMapCard").style.display="none";
  document.getElementById("addrListGrid").style.display="";
}

function ensureMap(){
  if(_locMap||!window.L)return;
  _locMap=L.map("locationMap",{zoomControl:true}).setView([29.3084,30.8428],13); // الفيوم كمركز افتراضي
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:"© OpenStreetMap"}).addTo(_locMap);
  _locMap.on("moveend",()=>{
    const c=_locMap.getCenter();_locCenter={..._locCenter,lat:c.lat,lng:c.lng};
    const btn=document.getElementById("locConfirmBtn");if(btn)btn.disabled=false;
    reverseGeocode(c.lat,c.lng);
  });
}

function openMapStep(opts){
  opts=opts||{};
  document.getElementById("addrListGrid").style.display="none";
  document.getElementById("locMapCard").style.display="";
  ensureMap();
  setTimeout(()=>_locMap?.invalidateSize(),50);
  _pendingAddressId=opts.addressId||null;
  const btn=document.getElementById("locConfirmBtn"),txt=document.getElementById("locCurrentAddrText");
  if(opts.lat&&opts.lng){
    _locCenter={lat:opts.lat,lng:opts.lng,display:opts.display||""};
    if(btn)btn.disabled=false;
    if(txt)txt.textContent=opts.display||"...";
    _locMap.setView([opts.lat,opts.lng],16);
  }else{
    _locCenter=null;
    if(btn)btn.disabled=true;
    if(txt)txt.textContent="حدد نقطة على الخريطة";
    _locMap.setView([29.3084,30.8428],13);
  }
}
document.getElementById("locMapBackBtn")?.addEventListener("click",hideMapStep);

async function reverseGeocode(lat,lng){
  const el=document.getElementById("locCurrentAddrText");if(el)el.textContent="جاري تحديد العنوان...";
  try{
    const r=await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=ar&zoom=16`);
    const d=await r.json();
    if(el)el.textContent=d.display_name||`${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    _locCenter={..._locCenter,lat,lng,display:d.display_name,addr:d.address||{}};
  }catch(e){
    if(el)el.textContent=`${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
}

// "استخدم موقعك الحالي"
document.getElementById("locUseCurrentBtn")?.addEventListener("click",()=>{
  if(!navigator.geolocation){toast("❌ المتصفح لا يدعم تحديد الموقع","error");return;}
  toast("📍 جاري تحديد موقعك...","info");
  navigator.geolocation.getCurrentPosition(
    (pos)=>{_locMap?.setView([pos.coords.latitude,pos.coords.longitude],16);},
    ()=>toast("❌ تعذّر الوصول لموقعك، تأكد من إذن الموقع","error")
  );
});

// بحث عن عنوان
document.getElementById("locSearchInput")?.addEventListener("keydown",(e)=>{
  if(e.key!=="Enter")return;
  e.preventDefault();
  const q=e.target.value.trim();if(!q)return;
  clearTimeout(_locSearchTO);
  _locSearchTO=setTimeout(async()=>{
    try{
      const r=await fetch(`https://nominatim.openstreetmap.org/search?format=json&countrycodes=eg&accept-language=ar&q=${encodeURIComponent(q)}`);
      const arr=await r.json();
      if(arr && arr[0]){_locMap?.setView([parseFloat(arr[0].lat),parseFloat(arr[0].lon)],16);}
      else toast("❌ لم يتم العثور على العنوان","error");
    }catch(err){toast("❌ تعذّر البحث الآن","error");}
  },300);
});

// "تأكيد الموقع" في خطوة الخريطة → فتح فورم "تسليم إلى"
document.getElementById("locConfirmBtn")?.addEventListener("click",async()=>{
  if(!_locCenter){toast("❌ حدد نقطة على الخريطة أولاً","error");return;}
  let existing=null;
  if(_pendingAddressId){
    const email=localStorage.getItem("kashmirSessionEmail");
    try{const sn=await get(ref(db,`userAddresses/${eKey(email)}/${_pendingAddressId}`));if(sn.exists())existing=sn.val();}catch(e){}
  }
  hideMapStep();
  openAddressModal(existing);
});

// كارت "+ إضافة عنوان جديد"
const MAX_ADDRESSES=5;
window.addNewAddress=async function(){
  const email=localStorage.getItem("kashmirSessionEmail");
  if(email){
    try{
      const sn=await get(ref(db,`userAddresses/${eKey(email)}`));
      const count=sn.exists()?Object.keys(sn.val()).length:0;
      if(count>=MAX_ADDRESSES){toast(`❌ الحد الأقصى ${MAX_ADDRESSES} عناوين — احذف عنوان قديم لإضافة عنوان جديد`,"error");return;}
    }catch(e){}
  }
  openMapStep();
};

// زر "تعديل" على كارت عنوان محفوظ → يفتح فورم التفاصيل مباشرة (مع إمكانية "تغيير" الموقع)
window.editAddress=async function(addressId){
  const email=localStorage.getItem("kashmirSessionEmail");if(!email)return;
  try{
    const sn=await get(ref(db,`userAddresses/${eKey(email)}/${addressId}`));
    if(!sn.exists())return;
    const d=sn.val();
    _pendingAddressId=addressId;
    _pendingAddressExisting=d;
    _locCenter={lat:d.lat,lng:d.lng,display:d.displayAddress||""};
    openAddressModal(d);
  }catch(e){toast("❌ حدث خطأ","error");}
};

// زر "تغيير" داخل فورم التفاصيل → رجوع لخطوة الخريطة
document.getElementById("addrChangeLocBtn")?.addEventListener("click",()=>{
  closeAddressModal();
  openMapStep({addressId:_pendingAddressId,lat:_locCenter?.lat,lng:_locCenter?.lng,display:_locCenter?.display});
});

// تبويب المنزل/العمل
document.querySelectorAll(".addr-type-tab").forEach(tab=>{
  tab.addEventListener("click",()=>{
    document.querySelectorAll(".addr-type-tab").forEach(t=>t.classList.remove("active"));
    tab.classList.add("active");
    _selectedType=tab.dataset.type;
  });
});

function openAddressModal(prefill){
  const modal=document.getElementById("addressDetailsModal");if(!modal)return;
  const email=localStorage.getItem("kashmirSessionEmail")||"";
  const set=(id,v)=>{const e=document.getElementById(id);if(e)e.value=v||"";};
  const guess=_locCenter?.addr||{};
  const savedUser=JSON.parse(localStorage.getItem("kashmirUser")||"{}");

  document.getElementById("addrModalTitle").textContent=prefill?"تعديل العنوان":"إضافة عنوان جديد";

  const full=_locCenter?.display||"";
  const parts=full.split("،").map(s=>s.trim()).filter(Boolean);
  document.getElementById("addrSummaryLine1").textContent=parts[0]||"الموقع المحدد";
  document.getElementById("addrSummaryLine2").textContent=full||"حدد الموقع من الخريطة";

  _selectedType=prefill?.type||"home";
  document.querySelectorAll(".addr-type-tab").forEach(t=>t.classList.toggle("active",t.dataset.type===_selectedType));

  set("addrGovernorate",prefill?.governorate||guess.state||guess.governorate||"");
  set("addrCenter",prefill?.center||guess.county||guess.state_district||"");
  set("addrCity",prefill?.city||guess.city||guess.town||guess.village||"");
  set("addrStreet",prefill?.street||guess.road||"");
  set("addrBuilding",prefill?.building||"");
  set("addrName",prefill?.name||((savedUser.firstName||"")+" "+(savedUser.lastName||"")).trim());
  set("addrPhone",prefill?.phone||document.getElementById("userPhone")?.value||"");
  set("addrPhone2",prefill?.phone2||"");
  set("addrEmail",email);
  const err=document.getElementById("addrErrorMsg");if(err)err.textContent="";
  modal.classList.add("open");
}
function closeAddressModal(){document.getElementById("addressDetailsModal")?.classList.remove("open");}
document.getElementById("addrCancelBtn")?.addEventListener("click",closeAddressModal);
document.getElementById("addressDetailsModal")?.addEventListener("click",(e)=>{if(e.target.id==="addressDetailsModal")closeAddressModal();});

document.getElementById("addrConfirmBtn")?.addEventListener("click",async()=>{
  const g=(id)=>document.getElementById(id)?.value.trim()||"";
  const governorate=g("addrGovernorate"),center=g("addrCenter"),city=g("addrCity"),street=g("addrStreet"),building=g("addrBuilding"),name=g("addrName"),phone=g("addrPhone"),phone2=g("addrPhone2"),email=g("addrEmail");
  const errEl=document.getElementById("addrErrorMsg");
  if(!governorate||!city||!street||!name||!phone||!phone2||!email){if(errEl)errEl.textContent="❌ من فضلك أكمل جميع الحقول المطلوبة";return;}
  const nameWords=name.split(/\s+/).filter(Boolean);
  if(nameWords.length<4){if(errEl)errEl.textContent="❌ من فضلك اكتب الاسم رباعي (4 أسماء على الأقل)";return;}
  const emailOk=/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if(!emailOk){if(errEl)errEl.textContent="❌ البريد الإلكتروني غير صالح";return;}
  const phoneOk=/^01[0125][0-9]{8}$/.test(phone) && /^01[0125][0-9]{8}$/.test(phone2);
  if(!phoneOk){if(errEl)errEl.textContent="❌ تأكد من صحة أرقام الهواتف (11 رقم تبدأ بـ 01)";return;}

  const btn=document.getElementById("addrConfirmBtn");btn.disabled=true;btn.textContent="جاري الحفظ...";
  try{
    let existingCount=0;
    if(!_pendingAddressId){
      const sn=await get(ref(db,`userAddresses/${eKey(email)}`));
      existingCount=sn.exists()?Object.keys(sn.val()).length:0;
      if(existingCount>=MAX_ADDRESSES){if(errEl)errEl.textContent=`❌ الحد الأقصى ${MAX_ADDRESSES} عناوين`;btn.disabled=false;btn.textContent="حفظ العنوان";return;}
    }
    const id=_pendingAddressId||("a"+Date.now().toString(36)+Math.random().toString(36).slice(2,6));
    // العنوان الأول اللي المستخدم بيضيفه بيبقى تلقائياً هو "الافتراضي" (اللي بيتعرض في السلة)
    // ولو بيعدل عنوان موجود، بنحافظ على حالة isDefault بتاعته زي ما هي
    const isDefault=_pendingAddressId?(_pendingAddressExisting?.isDefault||false):(existingCount===0);
    const data={type:_selectedType,governorate,center,city,street,building,name,phone,phone2,email,lat:_locCenter?.lat||null,lng:_locCenter?.lng||null,displayAddress:_locCenter?.display||"",isDefault,updatedAt:new Date().toISOString()};
    await set(ref(db,`userAddresses/${eKey(email)}/${id}`),data);
    toast("✅ تم حفظ العنوان بنجاح","success");
    closeAddressModal();
    _pendingAddressId=null;
    _pendingAddressExisting=null;
    renderAddressList(email);
    // لو المستخدم جاي من صفحة تانية (زي الكارت) عشان يضيف عنوان، رجّعه لها تلقائياً بعد الحفظ
    const returnUrl=sessionStorage.getItem("kashmirAddrReturnUrl");
    if(returnUrl){
      sessionStorage.removeItem("kashmirAddrReturnUrl");
      setTimeout(()=>{location.href=returnUrl;},1200);
    }
  }catch(e){toast("❌ حدث خطأ أثناء الحفظ","error");}
  finally{btn.disabled=false;btn.textContent="حفظ العنوان";}
});

window.deleteAddress=async function(addressId){
  const email=localStorage.getItem("kashmirSessionEmail");if(!email)return;
  try{
    const sn=await get(ref(db,`userAddresses/${eKey(email)}`));
    const wasDefault=sn.exists()&&sn.val()[addressId]&&sn.val()[addressId].isDefault;
    await remove(ref(db,`userAddresses/${eKey(email)}/${addressId}`));
    // لو مسحنا العنوان الافتراضي، خلي أي عنوان تاني متبقي هو الافتراضي بدل ما تفضل السلة من غير عنوان
    if(wasDefault){
      const sn2=await get(ref(db,`userAddresses/${eKey(email)}`));
      if(sn2.exists()){
        const remainingId=Object.keys(sn2.val())[0];
        if(remainingId)await set(ref(db,`userAddresses/${eKey(email)}/${remainingId}/isDefault`),true);
      }
    }
    toast("✅ تم حذف العنوان","success");renderAddressList(email);
  }catch(e){toast("❌ حدث خطأ","error");}
};

// تعيين عنوان معين كعنوان التوصيل الافتراضي (اللي بيظهر في الكارت وصفحة الدفع)
window.setDefaultAddress=async function(addressId){
  const email=localStorage.getItem("kashmirSessionEmail");if(!email)return;
  try{
    const sn=await get(ref(db,`userAddresses/${eKey(email)}`));
    if(!sn.exists())return;
    const all=sn.val();
    await Promise.all(Object.keys(all).map(id=>set(ref(db,`userAddresses/${eKey(email)}/${id}/isDefault`),id===addressId)));
    toast("✅ تم تحديد عنوان التوصيل","success");
    renderAddressList(email);
  }catch(e){toast("❌ حدث خطأ","error");}
};

async function renderAddressList(email){
  const grid=document.getElementById("addrListGrid");if(!email||!grid)return;
  grid.innerHTML=`<p style="grid-column:1/-1;text-align:center;color:var(--text-light);padding:20px;font-family:'Almarai',sans-serif;font-size:13px">جاري التحميل...</p>`;
  let addresses={};
  try{const sn=await get(ref(db,`userAddresses/${eKey(email)}`));if(sn.exists())addresses=sn.val();}catch(e){}
  let html="";
  Object.entries(addresses).forEach(([id,d])=>{
    const isWork=d.type==="work";
    const isDefault=!!d.isDefault;
    html+=`<div class="addr-card${isDefault?" addr-card-default":""}">
      <div class="addr-card-type"><i class="fa-solid fa-${isWork?"building":"house"}"></i> ${isWork?"العمل":"المنزل"}${isDefault?'<span class="addr-default-badge">عنوان التوصيل الحالي</span>':""}</div>
      <div class="addr-card-text">${d.governorate||""} — ${d.center?d.center+" — ":""}${d.city||""} — ${d.street||""}${d.building?" — "+d.building:""}</div>
      <div class="addr-card-contact"><i class="fa-solid fa-circle-check"></i> ${d.name||""}${d.phone?", "+d.phone:""}</div>
      <div class="addr-card-bottom">
        <button type="button" class="addr-edit-link" style="color:#e53935" onclick="deleteAddress('${id}')">حذف</button>
        <button type="button" class="addr-edit-link" onclick="editAddress('${id}')">تعديل</button>
        ${isDefault?"":`<button type="button" class="addr-edit-link" onclick="setDefaultAddress('${id}')">استخدام هذا العنوان</button>`}
      </div>
    </div>`;
  });
  const count=Object.keys(addresses).length;
  if(count<MAX_ADDRESSES){
    html+=`<div class="addr-add-card" onclick="addNewAddress()"><i class="fa-solid fa-plus"></i><span>إضافة عنوان جديد</span></div>`;
  }else{
    html+=`<div class="addr-add-card" style="opacity:.5;cursor:not-allowed;color:#999" onclick="toastMaxAddresses()"><i class="fa-solid fa-lock"></i><span>وصلت للحد الأقصى (${MAX_ADDRESSES} عناوين)</span></div>`;
  }
  grid.innerHTML=html;
}
window.toastMaxAddresses=function(){toast(`❌ الحد الأقصى ${MAX_ADDRESSES} عناوين — احذف عنوان قديم لإضافة عنوان جديد`,"error");};

// fill page
async function fillPage(email){
  const sn=await get(query(ref(db,"users"),orderByChild("email"),equalTo(email)));
  if(!sn.exists())return;let ud=null;sn.forEach(c=>{ud=c.val();});if(!ud)return;
  const sv=(id,v)=>{const e=document.getElementById(id);if(e)e.value=v||"";};
  const st=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v||"";};
  sv("userEmail",ud.email);sv("userPhone",ud.phone);sv("userName",ud.firstName);sv("userFamily",ud.lastName);
  st("welcomeName","مرحباً، "+(ud.firstName||""));st("userEmailDisplay",ud.email);
  if(ud.gender)document.querySelectorAll('input[name="gender"]').forEach(r=>{r.checked=r.value===ud.gender;});
}

// update names
const ni=document.getElementById("userName"),fi=document.getElementById("userFamily"),ub=document.getElementById("updateNamesBtn");
if(ub){
  const en=()=>{ub.disabled=false;};
  ni?.addEventListener("input",en);fi?.addEventListener("input",en);
  document.querySelectorAll('input[name="gender"]').forEach(r=>r.addEventListener("change",en));
  ub.addEventListener("click",async()=>{
    const email=localStorage.getItem("kashmirSessionEmail");if(!email)return;
    const fn=ni?.value.trim(),ln=fi?.value.trim(),g=document.querySelector('input[name="gender"]:checked')?.value||"";
    if(!fn||!ln){toast("❌ أدخل الاسم الأول والأخير","error");return;}
    ub.disabled=true;ub.textContent="جاري التحديث...";
    try{const sn=await get(query(ref(db,"users"),orderByChild("email"),equalTo(email)));if(sn.exists()){let key=null;sn.forEach(c=>{key=c.key;});if(key){await set(ref(db,`users/${key}/firstName`),fn);await set(ref(db,`users/${key}/lastName`),ln);if(g)await set(ref(db,`users/${key}/gender`),g);const s=JSON.parse(localStorage.getItem("kashmirUser")||"{}");Object.assign(s,{firstName:fn,lastName:ln,...(g&&{gender:g})});localStorage.setItem("kashmirUser",JSON.stringify(s));toast("✅ تم تحديث البيانات بنجاح","success");}}}
    catch(e){toast("❌ "+e.message,"error");}finally{ub.textContent="تحديث الحساب";ub.disabled=true;}
  });
}

// logout modal
const logoutModal=document.getElementById("logoutModal"),logoutErrEl=document.getElementById("logoutErrorMsg");
document.getElementById("logoutBtn")?.addEventListener("click",()=>logoutModal.classList.add("open"));
document.getElementById("cancelLogoutBtn")?.addEventListener("click",()=>{logoutModal.classList.remove("open");if(logoutErrEl)logoutErrEl.textContent="";});
logoutModal?.addEventListener("click",(e)=>{if(e.target===logoutModal){logoutModal.classList.remove("open");if(logoutErrEl)logoutErrEl.textContent="";}});
document.getElementById("confirmLogoutBtn")?.addEventListener("click",async()=>{
  const input=document.getElementById("logoutEmailInput")?.value.trim(),email=localStorage.getItem("kashmirSessionEmail");
  if(!input){if(logoutErrEl)logoutErrEl.textContent="أدخل بريدك الإلكتروني";return;}
  if(input!==email){if(logoutErrEl)logoutErrEl.textContent="❌ البريد الإلكتروني غير مطابق";return;}
  const sid=localStorage.getItem("kashmirSessionId");if(sid&&email)await destroySess(email,sid);
  clearLocal();localStorage.removeItem("kashmirProfileImg");logoutModal.classList.remove("open");
  toast("👋 تم تسجيل الخروج بنجاح","success");setTimeout(()=>location.href="../index.html",1400);
});

// delete account
document.getElementById("deleteAccountBtn")?.addEventListener("click",()=>toast("⚠️ ميزة حذف الحساب قيد التطوير","info"));

// profile pic
const fileInput=document.getElementById("fileInput"),pi=document.getElementById("profileImage"),ico=document.getElementById("icon_person");

// عرض الصورة الموجودة
function showSavedPhoto(url){if(!url||!pi||!ico)return;pi.src=url;pi.style.display="block";ico.style.display="none";}

// جيب الصورة من Database أولاً، وإلا من localStorage
(async function loadSavedPhoto(){
  const email=localStorage.getItem("kashmirSessionEmail");
  if(email){
    try{
      const snap=await get(ref(db,`userPhotos/${eKey(email)}`));
      if(snap.exists()){
        const url=snap.val();
        localStorage.setItem("kashmirProfileImg",url);
        showSavedPhoto(url);
        return;
      }
    }catch(e){}
  }
  // fallback: localStorage
  const saved=localStorage.getItem("kashmirProfileImg");
  if(saved) showSavedPhoto(saved);
})();

// لما يختار صورة → مفيش حد أقصى لحجمها: بنصغّرها وبنضغطها تلقائياً وبعدين نحفظها في Database كـ base64
// (بنصغّر لأقصى ضلع ٦٠٠px عشان الصورة تفضل خفيفة ومتبطّأش الموقع، وده مش بيأثر على وضوحها كصورة بروفايل)
const AVATAR_MAX_SIDE = 600;
function resizeImageToDataUrl(file){
  return new Promise((resolve,reject)=>{
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = ()=>{
      let w = img.naturalWidth, h = img.naturalHeight;
      const ratio = Math.min(1, AVATAR_MAX_SIDE / Math.max(w,h));
      w = Math.round(w*ratio); h = Math.round(h*ratio);
      const c = document.createElement("canvas"); c.width = w; c.height = h;
      const ctx = c.getContext("2d");
      ctx.fillStyle = "#ffffff"; ctx.fillRect(0,0,w,h);   // خلفية بيضا للصور الشفافة (PNG)
      ctx.drawImage(img,0,0,w,h);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg",0.85));
    };
    img.onerror = ()=>{ URL.revokeObjectURL(url); reject(new Error("bad image")); };
    img.src = url;
  });
}

fileInput?.addEventListener("change",async(e)=>{
  const file=e.target.files[0];
  if(!file)return;
  if(!file.type.startsWith("image/")){toast("❌ اختر ملف صورة","error");return;}
  let base64;
  try{ base64 = await resizeImageToDataUrl(file); }
  catch(err){ toast("❌ تعذّر قراءة الصورة، جرّب صورة تانية","error"); return; }
  // عرض فوري
  if(pi){pi.src=base64;pi.style.display="block";}
  if(ico){ico.style.display="none";}
  localStorage.setItem("kashmirProfileImg",base64);
  // حفظ في Database
  const email=localStorage.getItem("kashmirSessionEmail");
  if(email){
    try{
      await set(ref(db,`userPhotos/${eKey(email)}`),base64);
      toast("✅ تم حفظ الصورة","success");
    }catch(err){
      toast("❌ خطأ في حفظ الصورة","error");
      console.error(err);
    }
  }
  fileInput.value="";   // عشان يقدر يختار نفس الصورة تاني
});

// init
// (async function(){
//   const session=await validateSession();
//   if(!session){toast("❌ يجب تسجيل الدخول أولاً","error");setTimeout(()=>location.href="../index.html",2000);return;}
//   const email=localStorage.getItem("kashmirSessionEmail");
//   watchSession(email,session.sessionId);
//   await fillPage(email);
// })();

// ===== دعم الوصول لتبويب "العناوين" من صفحات تانية (زي صفحة الكارت) =====
// مثال رابط: user/accoun.html?tab=location&return=../cart.html&autoAdd=1
// - tab=location: يفتح تبويب العناوين تلقائياً
// - return: الصفحة اللي هنرجع لها المستخدم تلقائياً بعد ما يحفظ عنوان
// - autoAdd=1: لو مفيش عناوين محفوظة أصلاً، يفتح فورم إضافة عنوان على طول بدل ما يستنى دوسة زيادة
(function initFromQueryParams(){
  const params=new URLSearchParams(location.search);
  const returnUrl=params.get("return");
  if(returnUrl)sessionStorage.setItem("kashmirAddrReturnUrl",returnUrl);

  if(params.get("tab")==="location"){
    const locBtn=Array.from(document.querySelectorAll(".nav-btn")).find(b=>(b.getAttribute("onclick")||"").includes("switchTab('location'"));
    if(locBtn)window.switchTab("location",locBtn);

    if(params.get("autoAdd")==="1"){
      const email=localStorage.getItem("kashmirSessionEmail");
      if(email){
        get(ref(db,`userAddresses/${eKey(email)}`)).then(sn=>{
          if(!sn.exists())window.addNewAddress();
        }).catch(()=>{});
      }
    }
  }

  if(params.get("tab")==="discount"){
    const dBtn=Array.from(document.querySelectorAll(".nav-btn")).find(b=>(b.getAttribute("onclick")||"").includes("switchTab('discount'"));
    if(dBtn)window.switchTab("discount",dBtn);
  }
})();


// ============================================================
//  💬 قسم "تعليقاتي" — كل تعليقات المستخدم على المنتجات
// ============================================================

const _productNameCache = {};

// بنفصل الـ ITEM_ID (اللي شكله col-docId) لـ col و docId عشان نجيب اسم المنتج من Firestore
function parseItemId(itemId){
  const idx = String(itemId).indexOf("-");
  if(idx === -1) return { col:null, docId:String(itemId) };
  return { col:String(itemId).slice(0,idx), docId:String(itemId).slice(idx+1) };
}

// بنجيب اسم المنتج من Firestore (مع كاش عشان ما نكررش الطلبات)
async function fetchProductName(col, docId){
  if(!col || !docId) return null;
  const key = col + "/" + docId;
  if(_productNameCache[key] !== undefined) return _productNameCache[key];
  try{
    const snap = await getDoc(doc(fsdb, col, docId));
    const name = snap.exists() ? (snap.data().name || null) : null;
    _productNameCache[key] = name;
    return name;
  }catch(e){
    _productNameCache[key] = null;
    return null;
  }
}

function escHtml(str){
  if(str === undefined || str === null) return "";
  return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
                    .replace(/"/g,"&quot;").replace(/'/g,"&#039;");
}

const _avatarColors = ["#e74c3c","#8e44ad","#3498db","#f39c12","#27ae60","#e67e22","#1abc9c"];
function colorForName(name){
  let hash = 0;
  const s = name || "م";
  for(let i=0;i<s.length;i++) hash = s.charCodeAt(i) + ((hash<<5)-hash);
  return _avatarColors[Math.abs(hash) % _avatarColors.length];
}

function formatCommentDate(ts){
  if(!ts) return "";
  try{
    return new Date(ts).toLocaleDateString("ar-EG",{year:"numeric",month:"long",day:"numeric",hour:"2-digit",minute:"2-digit"});
  }catch(e){ return ""; }
}

function starsHtml(rating){
  const r = Math.max(0, Math.min(5, parseInt(rating)||0));
  let h = "";
  for(let i=1;i<=5;i++) h += `<i class="fa-${i<=r?"solid":"regular"} fa-star"></i>`;
  return h;
}

function emptyCommentsHtml(){
  return `<div class="my-comments-empty">
    <i class="fa-regular fa-comment-dots"></i>
    <p>لسه معملتش أي تعليق على أي منتج</p>
    <p><a href="../index.html">تصفح المنتجات وشاركنا رأيك ⭐</a></p>
  </div>`;
}

async function renderMyComments(email){
  const list = document.getElementById("myCommentsList");
  const statsEl = document.getElementById("myCommentsStats");
  if(!list) return;

  list.innerHTML = `<p class="my-comments-loading">جاري تحميل تعليقاتك...</p>`;
  if(statsEl) statsEl.innerHTML = "";

  if(!email){
    list.innerHTML = emptyCommentsHtml();
    return;
  }

  let all = {};
  try{
    const sn = await get(ref(db,"comments"));
    if(sn.exists()) all = sn.val();
  }catch(e){ console.error("خطأ في تحميل التعليقات:", e); }

  // بنجمع كل التعليقات اللي إيميلها يطابق المستخدم الحالي
  const mine = [];
  Object.entries(all).forEach(([itemId, comments])=>{
    Object.entries(comments || {}).forEach(([cid, c])=>{
      if(c && c.userEmail && String(c.userEmail).toLowerCase() === email.toLowerCase()){
        mine.push({ itemId, id:cid, ...c });
      }
    });
  });

  mine.sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));

  if(mine.length === 0){
    list.innerHTML = emptyCommentsHtml();
    return;
  }

  // إحصائيات
  const total = mine.length;
  const sumRating = mine.reduce((acc,c)=>acc+(parseInt(c.rating)||0),0);
  const avg = total ? (sumRating/total).toFixed(1) : "0.0";
  const totalLikes = mine.reduce((acc,c)=>acc+(c.likes||0),0);
  const totalDislikes = mine.reduce((acc,c)=>acc+(c.dislikes||0),0);

  if(statsEl){
    statsEl.innerHTML = `
      <div class="my-stat-card"><div class="my-stat-icon gold"><i class="fa-solid fa-comments"></i></div><div class="my-stat-text"><div class="num">${total}</div><div class="lbl">إجمالي التعليقات</div></div></div>
      <div class="my-stat-card"><div class="my-stat-icon blue"><i class="fa-solid fa-star"></i></div><div class="my-stat-text"><div class="num">${avg}</div><div class="lbl">متوسط تقييمك</div></div></div>
      <div class="my-stat-card"><div class="my-stat-icon green"><i class="fa-solid fa-thumbs-up"></i></div><div class="my-stat-text"><div class="num">${totalLikes}</div><div class="lbl">إعجابات استلمتها</div></div></div>
      <div class="my-stat-card"><div class="my-stat-icon red"><i class="fa-solid fa-thumbs-down"></i></div><div class="my-stat-text"><div class="num">${totalDislikes}</div><div class="lbl">عدم إعجاب</div></div></div>
    `;
  }

  // بنجيب أسماء المنتجات كلها مرة واحدة
  const namePromises = mine.map(c=>{
    const { col, docId } = parseItemId(c.itemId);
    return fetchProductName(col, docId);
  });
  const names = await Promise.all(namePromises);

  let html = "";
  mine.forEach((c, i)=>{
    const { col, docId } = parseItemId(c.itemId);
    const productName = names[i] || "منتج";
    const productLink = (col && docId) ? `../Furniture/item.html?col=${encodeURIComponent(col)}&docId=${encodeURIComponent(docId)}` : null;
    const avatarBg = c.userPhoto ? `background-image:url('${escHtml(c.userPhoto)}')` : `background-color:${colorForName(c.userName)}`;
    const avatarTxt = c.userPhoto ? "" : escHtml((c.userName||"م").charAt(0));
    const nameHtml = productLink
      ? `<a href="${productLink}">${escHtml(productName)}</a>`
      : escHtml(productName);

    html += `
      <div class="my-comment-card" data-item-id="${escHtml(c.itemId)}" data-comment-id="${escHtml(c.id)}">
        <div class="my-comment-head">
          <div class="my-comment-avatar" style="${avatarBg}">${avatarTxt}</div>
          <div class="my-comment-meta">
            <div class="my-comment-product"><i class="fa-solid fa-bag-shopping"></i> ${nameHtml}</div>
            <div class="my-comment-date"><i class="fa-regular fa-clock"></i> ${formatCommentDate(c.createdAt)}</div>
            <div class="my-comment-stars">${starsHtml(c.rating)}</div>
          </div>
        </div>
        <div class="my-comment-body">${escHtml(c.text)}</div>
        <div class="my-comment-foot">
          <div class="my-comment-reactions">
            <span><i class="fa-solid fa-thumbs-up"></i> ${c.likes||0}</span>
            <span><i class="fa-solid fa-thumbs-down"></i> ${c.dislikes||0}</span>
          </div>
          <div class="my-comment-actions">
            ${productLink ? `<a class="my-comment-btn view" href="${productLink}"><i class="fa-solid fa-eye"></i> عرض المنتج</a>` : ""}
            <button class="my-comment-btn del" onclick="deleteMyComment('${escHtml(c.itemId)}','${escHtml(c.id)}')"><i class="fa-solid fa-trash"></i> حذف</button>
          </div>
        </div>
      </div>
    `;
  });

  list.innerHTML = html;
}

// حذف تعليق المستخدم من قاعدة البيانات
window.deleteMyComment = async function(itemId, commentId){
  if(!confirm("هل أنت متأكد من حذف هذا التعليق؟")) return;
  try{
    await remove(ref(db, `comments/${itemId}/${commentId}`));
    toast("✅ تم حذف التعليق بنجاح","success");
    const email = localStorage.getItem("kashmirSessionEmail");
    renderMyComments(email);
  }catch(e){
    console.error("خطأ في حذف التعليق:", e);
    toast("❌ تعذّر حذف التعليق، حاول لاحقاً","error");
  }
};

// ============================================================
//  📦 قسم "الطلبات" — تتبّع الطلب + كود الطلب + أقصى موعد للاستلام + الفاتورة
// ============================================================

// مراحل الطلب (٤ خطوات)
const ORDER_STAGES = [
  { label:"استلمنا الطلب", icon:"fa-check" },
  { label:"قيد التنفيذ",   icon:"fa-truck" },
  { label:"تم الإرسال",    icon:"fa-clipboard-check" },
  { label:"التسليم",       icon:"fa-box-open" }
];
// 🎨 لون بانر الحالة (اللي فيه "تم تنفيذ طلبك" + زر الفاتورة)
// أصفر = الطلب لسه ما اتسلّمش | أخضر = العميل استلم الطلب (تم التسليم)
(function injectBannerColors(){
  if(document.getElementById("ob-colors")) return;
  const st=document.createElement("style"); st.id="ob-colors";
  st.textContent=`
    .order-card:not([data-c="4"]) .order-banner{background:#fff8db!important;border-color:#f5d76e!important}
    .order-card:not([data-c="4"]) .order-banner .g{color:#d19a00!important}
    .order-card[data-c="4"] .order-banner{background:#e4f4e4!important;border-color:#bfe9d3!important}
  `;
  document.head.appendChild(st);
})();
const STEP1_MS = 10*1000;   // بعد ١٠ ثواني → "استلمنا الطلب" يكتمل

// index = عدد الخطوات المكتملة (0..4)
const ORDER_BANNERS = [
  { t:'جاري <span class="g">استلام</span> طلبك',   s:"لحظات ونأكد استلام طلبك..." },
  { t:'<span class="g">قيد</span> التنفيذ',          s:"استلمنا طلبك وبنجهزه حالياً." },
  { t:'<span class="g">تم</span> تنفيذ طلبك',        s:"جاري تجهيز وتغليف طلبيتك. هنبعتلك لما تخرج من المخازن." },
  { t:'<span class="g">تم</span> إرسال طلبك',        s:"طلبك خرج من المخازن وفي الطريق ليك." },
  { t:'<span class="g">تم</span> تسليم طلبك',        s:"اتسلّم طلبك. شكراً إنك اخترت كشمير هوم 💚" }
];

const _fmtShort = ts => new Date(ts).toLocaleDateString("ar-EG",{month:"long",day:"numeric"});
const _fmtFull  = ts => new Date(ts).toLocaleDateString("ar-EG",{weekday:"long",month:"long",day:"numeric"});
const _fmtDT    = ts => new Date(ts).toLocaleDateString("ar-EG",{year:"numeric",month:"long",day:"numeric",hour:"2-digit",minute:"2-digit"});

const _fmtDayY  = ts => new Date(ts).toLocaleDateString("ar-EG",{weekday:"long",year:"numeric",month:"long",day:"numeric"});

// بيانات التسليم (اللي المشرف بيدخلها من لوحة التحكم): كاملة ولا على مراحل + تواريخ كل دفعة
function deliveryParts(o){
  const d = o && o.delivery;
  return (d && Array.isArray(d.parts) && d.parts.length && completedSteps(o) >= 4) ? d : null;
}
function deliveryHtml(o){
  const d = deliveryParts(o); if(!d) return "";
  const staged = d.mode === "stages";
  const rows = d.parts.map((p,i)=>`<div style="margin-top:6px">${staged?`<b>الدفعة ${(i+1).toLocaleString("ar-EG")}:</b> `:""}${escHtml(_fmtDayY(p.date))}${p.note?` <span style="opacity:.75">— ${escHtml(p.note)}</span>`:""}</div>`).join("");
  return `<div class="order-deadline" style="background:#e9f9f1;border-color:#bfe9d3">
    <i class="fa-solid fa-truck-fast" style="color:#00a15c"></i>
    <div style="text-align: end;"><b>${staged?`تم تسليم طلبك على مراحل (${d.parts.length.toLocaleString("ar-EG")} دفعات)`:"تم تسليم طلبك كاملاً"}</b>${rows}</div>
  </div>`;
}

let _ordersMap = {}, _ordersTicker = null, _ordersUnsub = null;

// عدد الخطوات المكتملة = الأكبر بين (الوقت المنقضي) و (الحقل stage اللي بتعدله من Firebase)
function completedSteps(o){
  const el = Date.now() - (o.createdAt||0);
  const auto = el >= STEP1_MS ? 1 : 0;   // بس "استلمنا الطلب" بيكتمل تلقائي — باقي الخطوات من لوحة التحكم
  return Math.max(auto, Math.min(4, parseInt(o.stage)||0));
}

// لو فيه طلب لسه ما اتحفظش (العميل جاي من صفحة الدفع) نكمل حفظه
async function flushPendingOrder(email){
  const raw = localStorage.getItem("kashmirPendingOrder");
  if(!raw || !email) return;
  try{
    const o = JSON.parse(raw);
    if(!o || !o.id) { localStorage.removeItem("kashmirPendingOrder"); return; }
    if(o.email && String(o.email).toLowerCase() !== email.toLowerCase()) return;
    await set(ref(db, `userOrders/${eKey(email)}/${o.id}`), o);
    try{ await set(ref(db, `orders/${o.id}`), o); }catch(e){ console.error("orders/ write:", e); }
    localStorage.removeItem("kashmirPendingOrder");
    localStorage.setItem("cart","[]");   // العميل اشترى خلاص → السلة تتفضى
  }catch(e){ console.error("flushPendingOrder:", e); }
}

function orderTimelineHtml(o){
  const c = completedSteps(o);
  let html = '<div class="ot-steps">';
  ORDER_STAGES.forEach((st,i)=>{
    const done = i < c, active = i === c, last = i === ORDER_STAGES.length-1;
    let lineCls = "ot-line";
    if(i+1 < c) lineCls += " done";              // الخطوتين اللي حواليه مكتملين
    else if(i === c-1) lineCls += " half";       // آخر خطوة مكتملة → الخطوة الجاية
    else if(active) lineCls += " work";          // الخطوة الشغالة دلوقتي
    let date = "", dateAttr = "";
    if(i === 0 || i === 1) date = _fmtShort(o.createdAt);
    if(last){
      if(done){   // اتسلّم الطلب
        const dl = deliveryParts(o);
        date = dl ? (dl.mode === "stages" ? "تم التسليم على مراحل" : _fmtDayY(dl.parts[0].date)) : "تم تسليم المنتجات";
        dateAttr = ' style="color:#00a15c;font-weight:800"';
      }else{      // لسه ما اتسلّمش → أقصى مدة تسليم
        date = "أقصى مدة تسليم: " + _fmtFull(o.deadline || ((o.createdAt||0) + 7*24*60*60*1000));
      }
    }
    html += `<div class="ot-step${done?" done":""}${active?" active current":""}${last?" last":""}">
      <div class="ot-row"><div class="ot-icon"><i class="fa-solid ${st.icon}"></i></div>${last?"":`<div class="${lineCls}"></div>`}</div>
      <div class="ot-label">${st.label}${date?`<span class="ot-date"${dateAttr}>${escHtml(date)}</span>`:""}</div>
    </div>`;
  });
  return html + '</div>';
}

function orderBannerHtml(o){
  const b = ORDER_BANNERS[completedSteps(o)];
  return `<h3>${b.t}</h3><p>${b.s}</p>`;
}

// طلب اتحذف من لوحة التحكم → بنعرض للعميل رسالة الحذف بدل التتبّع
function cancelledOrderHtml(o){
  const items = Array.isArray(o.items) ? o.items : [];
  const itemsHtml = items.map(it=>`
    <div class="order-item">
      ${it.img?`<img src="${escHtml(it.img)}" alt="">`:`<div class="noimg"><i class="fa-solid fa-bag-shopping"></i></div>`}
      <div class="nm">${escHtml(it.name)}</div>
      <div class="qty">× ${parseInt(it.qty)||1}</div>
      ${it.price?`<div class="pr">${Number(it.price).toLocaleString("ar-EG")} ج.م.</div>`:""}
    </div>`).join("");
  return `<div class="order-card" data-oid="${escHtml(o.id)}" data-cancelled="1">
    <div style="background:#fdeef1;border:1px solid #f5c2cb;border-radius:12px;padding:18px 20px;margin-bottom:4px;text-align:end">
      <h3 style="margin:0 0 6px;font-size:19px;font-weight:800;color:#c62828"><i class="fa-solid fa-trash-can"></i> تم حذف طلبيتك</h3>
      <p style="margin:0;font-size:14px;line-height:1.9;color:#7a3a44">سوف يتواصل معك أحد من خدمة العملاء.</p>
    </div>
    <div class="order-details">
      <div class="order-code-row">
        <div><div class="order-code-lbl">كود الطلب</div><div class="order-code-val">${escHtml(o.code)}</div></div>
        <div class="order-btns"><button type="button" class="order-copy-btn" onclick="copyOrderCode('${escHtml(o.code)}')"><i class="fa-regular fa-copy"></i> نسخ الكود</button></div>
      </div>
      ${itemsHtml?`<div class="order-items">${itemsHtml}</div>`:""}
      <div class="order-meta"><div><div class="lbl">إجمالي الطلب</div><div class="val total">${escHtml(o.total)||"—"}</div></div></div>
    </div>
  </div>`;
}

function orderCardHtml(o){
  if(o.cancelled) return cancelledOrderHtml(o);
  const items = Array.isArray(o.items) ? o.items : [];
  const itemsHtml = items.map(it=>`
    <div class="order-item">
      ${it.img?`<img src="${escHtml(it.img)}" alt="">`:`<div class="noimg"><i class="fa-solid fa-bag-shopping"></i></div>`}
      <div class="nm">${escHtml(it.name)}${_itemColor(it)?`<div style="display:flex;align-items:center;margin-top:2px;font-size:.85em;font-weight:700;opacity:.85; flex-direction: row-reverse;font-family: 'Almarai', sans-serif;">${_colorDot(_itemColor(it),it.colorHex)}اللون: ${escHtml(_itemColor(it))}</div>`:""}</div>
      <div class="qty">× ${parseInt(it.qty)||1}</div>
      ${it.price?`<div class="pr">${Number(it.price).toLocaleString("ar-EG")} ج.م.</div>`:""}
    </div>`).join("");

  return `<div class="order-card" data-oid="${escHtml(o.id)}" data-c="${completedSteps(o)}">
    <div class="order-banner"><div class="ob-text" style="text-align:end;">${orderBannerHtml(o)}</div><button type="button" class="order-copy-btn invoice ob-btn" onclick="downloadInvoice('${escHtml(o.id)}',this)"><i class="fa-solid fa-file-arrow-down"></i> تحميل الفاتورة</button></div>
    <div class="order-track">${orderTimelineHtml(o)}</div>
    <div class="order-details">
      <div class="order-code-row">
        <div><div class="order-code-lbl">كود الطلب</div><div class="order-code-val">${escHtml(o.code)}</div></div>
        <div class="order-btns">
          <button type="button" class="order-copy-btn" onclick="copyOrderCode('${escHtml(o.code)}')"><i class="fa-regular fa-copy"></i> نسخ الكود</button>
          <button type="button" class="order-copy-btn invoice" onclick="downloadInvoice('${escHtml(o.id)}',this)"><i class="fa-solid fa-file-arrow-down"></i> تحميل الفاتورة</button>
        </div>
      </div>
      ${deliveryParts(o)?deliveryHtml(o):`      <div class="order-deadline">
        <i class="fa-solid fa-hourglass-half"></i>
        <div style="text-align: end;"><b>أقصى مدة لاستلام الطلب: ${escHtml(_fmtFull(o.deadline))}</b>
        <span>لازم تستلم طلبك في خلال ٧ أيام من تاريخ الطلب (${escHtml(_fmtFull(o.createdAt))}) وإلا هيتم إلغاؤه. .</span></div>
      </div>`}
      ${itemsHtml?`<div class="order-items">${itemsHtml}</div>`:""}
      <div class="order-meta">
        <div><div class="lbl">طريقة الدفع</div><div class="val">${escHtml(o.payment)||"—"}</div></div>
        <div><div class="lbl">المستلم</div><div class="val">${escHtml(o.recipient)||"—"}${o.phone?" — "+escHtml(o.phone):""}</div></div>
        <div><div class="lbl">عنوان التوصيل ${o.addressType?"("+escHtml(o.addressType)+")":""}</div><div class="val">${escHtml(o.address)||"—"}</div></div>
        ${Number(o.walletUsed)>0?`<div><div class="lbl">اتدفع من رصيدك</div><div class="val total" style="color:#1a7f4b">${_money(Number(o.walletUsed))}</div></div>`:""}
        <div><div class="lbl">${Number(o.walletUsed)>0?"المطلوب دفعه":"إجمالي الطلب"}</div><div class="val total">${escHtml(o.total)||"—"}</div></div>
        <div><div class="lbl">عدد القطع</div><div class="val total" style="font-weight:800">${items.reduce((n,it)=>n+(parseInt(it.qty)||1),0).toLocaleString("ar-EG")} قطعة</div></div>
      </div>
    </div>
  </div>`;
}

// بيحفظ في Firebase المراحل اللي اكتملت تلقائياً (stage + وقت اكتمال كل مرحلة) عشان الحالة تفضل ثابتة حتى لو العميل فتح من جهاز تاني
const _persisting = new Set();
async function persistAutoStage(o){
  if(!o || !o.id || o.cancelled || _persisting.has(o.id)) return;
  const email = o.email || localStorage.getItem("kashmirSessionEmail"); if(!email) return;
  const el = Date.now() - (o.createdAt||0);
  const auto = el >= STEP1_MS ? 1 : 0;   // بس "استلمنا الطلب" بيكتمل تلقائي — باقي الخطوات من لوحة التحكم
  const cur = parseInt(o.stage)||0;
  if(auto <= cur) return;
  _persisting.add(o.id);
  try{
    const ek = eKey(email), upd = {};
    // نقرا الحالة الحالية من Firebase الأول — عشان منكتبش فوق حالة الأدمن لو غيّرها
    try{
      const fresh = parseInt((await get(ref(db, `userOrders/${ek}/${o.id}/stage`))).val())||0;
      if(fresh > cur){ o.stage = fresh; return; }
    }catch(e){}
    o.stageTimes = o.stageTimes || {};
    for(let n=cur+1; n<=auto; n++){
      const t = (o.createdAt||0) + STEP1_MS;
      o.stageTimes[n] = t;
      upd[`userOrders/${ek}/${o.id}/stageTimes/${n}`] = t;
      upd[`orders/${o.id}/stageTimes/${n}`] = t;
    }
    upd[`userOrders/${ek}/${o.id}/stage`] = auto;
    upd[`orders/${o.id}/stage`] = auto;
    await update(ref(db), upd);
    o.stage = auto;
  }catch(e){ console.error("persistAutoStage:", e); }
  finally{ _persisting.delete(o.id); }
}

// تحديث التايم لاين لحظياً (كل ثانية) لحد ما الخطوات التلقائية تخلص
function tickOrders(){
  let pending = false;
  document.querySelectorAll(".order-card[data-oid]").forEach(card=>{
    if(card.dataset.cancelled) return;   // طلب محذوف: مفيش تتبّع
    const o = _ordersMap[card.dataset.oid]; if(!o) return;
    const c = completedSteps(o);
    if(String(c) !== card.dataset.c){
      card.dataset.c = c;
      card.querySelector(".order-track").innerHTML = orderTimelineHtml(o);
      card.querySelector(".ob-text").innerHTML = orderBannerHtml(o);
      persistAutoStage(o);
    }
    if(Date.now() - (o.createdAt||0) < STEP1_MS + 1500) pending = true;
  });
  if(!pending && _ordersTicker){ clearInterval(_ordersTicker); _ordersTicker = null; }
}

async function renderOrders(email){
  const list = document.getElementById("ordersList");
  if(!list) return;
  list.innerHTML = `<p class="my-comments-loading">جاري تحميل طلباتك...</p>`;
  const emptyHtml = `<div class="orders-empty"><i class="fa-solid fa-box-open"></i><p>لسه معملتش أي طلب</p><p><a href="../index.html">ابدأ التسوق 🛍️</a></p></div>`;
  if(!email){ list.innerHTML = emptyHtml; return; }

  await flushPendingOrder(email);

  let orders = [];
  try{
    const sn = await get(ref(db, `userOrders/${eKey(email)}`));
    if(sn.exists()) orders = Object.values(sn.val());
  }catch(e){ console.error("renderOrders:", e); }

  orders = orders.filter(o=>o && o.code).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
  _ordersMap = {}; orders.forEach(o=>{ _ordersMap[o.id] = o; });
  list.innerHTML = orders.length ? orders.map(orderCardHtml).join("") : emptyHtml;
  orders.forEach(persistAutoStage);

  if(_ordersTicker) clearInterval(_ordersTicker);
  _ordersTicker = setInterval(tickOrders, 1000);
  tickOrders();

  // 🔴 تحديث لحظي: أي تغيير في حالة الطلب من لوحة الأدمن بيظهر عند العميل فوراً من غير ريفريش
  if(_ordersUnsub){ try{ _ordersUnsub(); }catch(e){} _ordersUnsub = null; }
  let _sig = JSON.stringify(orders.map(o=>[o.id,o.stage||0,o.cancelled?1:0,o.delivery||null,o.total||"",o.items||null]));
  _ordersUnsub = onValue(ref(db, `userOrders/${eKey(email)}`), sn=>{
    if(!sn.exists()) return;
    const fresh = Object.values(sn.val()).filter(o=>o && o.code).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
    const sig = JSON.stringify(fresh.map(o=>[o.id,o.stage||0,o.cancelled?1:0,o.delivery||null,o.total||"",o.items||null]));
    if(sig === _sig) return;
    _sig = sig;
    _ordersMap = {}; fresh.forEach(o=>{ _ordersMap[o.id] = o; });
    list.innerHTML = fresh.length ? fresh.map(orderCardHtml).join("") : emptyHtml;
    if(!_ordersTicker) _ordersTicker = setInterval(tickOrders, 1000);
  });
}

window.copyOrderCode = function(code){
  navigator.clipboard.writeText(code).then(()=>toast("✅ تم نسخ كود الطلب","success")).catch(()=>toast("❌ تعذّر النسخ","error"));
};

// ============================================================
//  🧾 الفاتورة (صورة PNG) — بتتنزل على جهاز العميل
// ============================================================
const _money = n => Number(n||0).toLocaleString("ar-EG") + " ج.م.";

// ---------- لون المنتج جوه الفاتورة ----------
const _COLOR_MAP={"أبيض":"#ffffff","ابيض":"#ffffff","أسود":"#111111","اسود":"#111111","رمادي":"#8a8f98","رصاصي":"#6b7280","بيج":"#d8c3a5","بني":"#7b4a2d","أحمر":"#d62828","احمر":"#d62828","أزرق":"#2563eb","ازرق":"#2563eb","كحلي":"#1e2a5a","سماوي":"#38bdf8","أخضر":"#16a34a","اخضر":"#16a34a","زيتي":"#6b7d2a","أصفر":"#facc15","اصفر":"#facc15","ذهبي":"#c8a96e","دهبي":"#c8a96e","فضي":"#c0c4cc","وردي":"#f472b6","برتقالي":"#f97316","بنفسجي":"#7c3aed","موف":"#9b5de5","عنابي":"#7f1d3a","تركواز":"#14b8a6","كريمي":"#f5ecd7","سكري":"#e8d5b0","جملي":"#c19a6b","خشبي":"#a47148","خشب":"#a47148","جوزي":"#5c3d2e"};
function _itemColor(it){
  if(!it) return "";
  const k=Object.keys(it).find(k=>/colou?r|لون/i.test(k)&&!/hex|variant|img|image/i.test(k)&&it[k]!==undefined&&it[k]!==null&&it[k]!=="");
  if(!k) return "";
  const v=it[k];
  return (v&&typeof v==="object")?String(v.name||v.label||v.title||v.hex||""):String(v);
}
function _colorDot(name,hex){
  const t=String(name||"").trim().toLowerCase();
  let c=hex||_COLOR_MAP[t]||_COLOR_MAP[t.replace(/^ال/,"")]||"";
  if(!c&&/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(t)) c=t;
  if(!c&&t&&window.CSS&&CSS.supports&&CSS.supports("color",t)) c=t;
  return c?`<span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${escHtml(c)};border:1px solid #cfd4dc;margin-inline-end:5px;flex-shrink:0"></span>`:"";
}

function invoiceHtml(o){
  const items = Array.isArray(o.items) ? o.items : [];
  const rows = items.map((it,i)=>{
    const q = parseInt(it.qty)||1, pr = Number(it.price)||0;
    return `<tr>
      <td style="padding:10px 8px;border-bottom:1px solid #eee;text-align:center;color:#888">${(i+1).toLocaleString("ar-EG")}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #eee">${escHtml(it.name)}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #eee;text-align:center">${_itemColor(it)?`<span style="display:inline-flex;align-items:center;justify-content:center;font-weight:700;color: #1a56db;">${_colorDot(_itemColor(it),it.colorHex)}${escHtml(_itemColor(it))}</span>`:"—"}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #eee;text-align:center">${q.toLocaleString("ar-EG")}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #eee;text-align:center">${pr?_money(pr):"—"}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #eee;text-align:center;font-weight:800">${pr?_money(pr*q):"—"}</td>
    </tr>`;
  }).join("");

  const totRow = (l,v,big)=>`<div style="display:flex;justify-content:space-between;padding:${big?"12px 0 0":"6px 0"};${big?"border-top:2px solid #111;margin-top:6px;font-size:18px;font-weight:800":"font-size:14px;color:#555"}"><span>${l}</span><span>${escHtml(v)}</span></div>`;

  return `<div dir="rtl" style="font-family:'Almarai','Cairo',sans-serif;color:#222;padding:44px 42px;background:#fff;box-sizing:border-box;width:794px">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #c8a96e;padding-bottom:20px">
      <div>
        <div style="font-size:30px;font-weight:800;color:#111">كشمير <span style="color:#c8a96e">هوم</span></div>
        <div style="font-size:12px;color:#777;margin-top:6px;line-height:1.8">القاهرة - 53 شارع الغورية<br>هاتف / واتساب: 01028604523<br>kashmirhome.00@gmail.com</div>
      </div>
      <div style="text-align:left">
        <div style="font-size:26px;font-weight:800;color:#111;font-family: 'Almarai', sans-serif;">فاتورة</div>
        <div style="font-size:13px;color:#555;margin-top:8px;line-height:1.9">رقم الفاتورة: <b style="font-family:monospace;letter-spacing:1px">${escHtml(o.code)}</b><br>تاريخ الطلب: ${escHtml(_fmtDT(o.createdAt))}</div>
      </div>
    </div>

    <div style="display:flex;gap:20px;margin:26px 0">
      <div style="flex:1;background:#f7f8fa;border-radius:12px;padding:16px 18px">
        <div style="font-size:12px;color:#888;font-weight:700;margin-bottom:6px">بيانات المستلم</div>
        <div style="font-size:14px;font-weight:800">${escHtml(o.recipient)||"—"}</div>
        <div style="font-size:13px;color:#555;margin-top:4px;direction:ltr;text-align:right">${escHtml(o.phone)}</div>
        <div style="font-size:13px;color:#555;margin-top:4px">${escHtml(o.email)}</div>
      </div>
      <div style="flex:1;background:#f7f8fa;border-radius:12px;padding:16px 18px">
        <div style="font-size:12px;color:#888;font-weight:700;margin-bottom:6px">عنوان التوصيل ${o.addressType?"("+escHtml(o.addressType)+")":""}</div>
        <div style="font-size:13px;line-height:1.8">${escHtml(o.address)||"—"}</div>
        <div style="font-size:12px;color:#888;margin-top:8px">طريقة الدفع: <b style="color:#222">${escHtml(o.payment)||"—"}</b></div>
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
      ${Number(o.walletUsed)>0?totRow("مدفوع من رصيدك","−"+_money(Number(o.walletUsed))):""}
      ${totRow(Number(o.walletUsed)>0?"المطلوب دفعه":"الإجمالي المطلوب",o.total||"—",true)}
    </div>

    <div style="margin-top:30px;background:#fff8e1;border:1px solid #ffe082;border-radius:12px;padding:14px 18px;font-size:13px;line-height:1.9;color:#7c5e00">
      <b>أقصى مدة لاستلام الطلب: ${escHtml(_fmtFull(o.deadline))}</b><br>
      يُرجى استلام الطلب خلال ٧ أيام من تاريخ الطلب،  <b style="font-family:monospace">${escHtml(o.code)}</b> .
    </div>

    <div style="text-align:center;margin-top:34px;padding-top:16px;border-top:1px dashed #ddd;font-size:12px;color:#999">شكراً لتسوقك من كشمير هوم 💚 — kashmair.vercel.app</div>
  </div>`;
}

let _invOrderId = null;

function ensureInvoiceModal(){
  let m = document.getElementById("invoiceModal");
  if(m) return m;
  m = document.createElement("div");
  m.id = "invoiceModal";
  m.innerHTML = `<div class="inv-box">
    <div class="inv-head"><h4><i class="fa-solid fa-file-invoice"></i> معاينة الفاتورة</h4><button type="button" class="inv-x" id="invClose" aria-label="إغلاق">✕</button></div>
    <div class="inv-body" id="invBody"></div>
    <div class="inv-foot">
      <p>راجع الفاتورة، ولو تمام اضغط "تأكيد التنزيل" عشان تتحفظ على جهازك كصورة</p>
      <div class="inv-actions">
        <button type="button" class="inv-confirm" id="invConfirm"><i class="fa-solid fa-download"></i> تأكيد التنزيل</button>
        <button type="button" class="inv-cancel" id="invCancel">إلغاء</button>
      </div>
    </div>
  </div>`;
  document.body.appendChild(m);
  const close = ()=>m.classList.remove("open");
  m.addEventListener("click",e=>{ if(e.target===m) close(); });
  m.querySelector("#invClose").addEventListener("click",close);
  m.querySelector("#invCancel").addEventListener("click",close);
  m.querySelector("#invConfirm").addEventListener("click",()=>confirmInvoiceDownload(m));
  document.addEventListener("keydown",e=>{ if(e.key==="Escape") close(); });
  return m;
}

// الضغط على "تحميل الفاتورة" → تظهر الفاتورة وتحتها "تأكيد التنزيل"
window.downloadInvoice = function(orderId){
  const o = _ordersMap[orderId]; if(!o) return;
  _invOrderId = orderId;
  const m = ensureInvoiceModal();
  const body = m.querySelector("#invBody");
  body.innerHTML = `<div class="inv-scale"><div class="inv-paper">${invoiceHtml(o)}</div></div>`;
  m.classList.add("open");
  // نصغّر الورقة (٧٩٤px) عشان تناسب عرض الشاشة
  requestAnimationFrame(()=>{
    const wrapEl = body.querySelector(".inv-scale"), paper = body.querySelector(".inv-paper");
    const scale = Math.min(1, (body.clientWidth - 24) / 794);
    paper.style.transform = `scale(${scale})`;
    wrapEl.style.width = (794*scale) + "px";
    wrapEl.style.height = (paper.offsetHeight*scale) + "px";
  });
};

async function confirmInvoiceDownload(modal){
  const o = _ordersMap[_invOrderId]; if(!o) return;
  if(!window.html2canvas){ toast("❌ تعذّر تحميل أداة الفاتورة، تأكد من الإنترنت وحدّث الصفحة","error"); return; }
  const btn = modal.querySelector("#invConfirm"), old = btn.innerHTML;
  btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري التنزيل...';
  const wrap = document.createElement("div");
  wrap.style.cssText = "position:fixed;top:0;left:-10000px;width:794px;background:#fff;pointer-events:none";
  wrap.innerHTML = invoiceHtml(o);
  document.body.appendChild(wrap);
  try{
    if(document.fonts && document.fonts.ready) await document.fonts.ready;
    const canvas = await window.html2canvas(wrap.firstElementChild, { scale:2, backgroundColor:"#ffffff", useCORS:true });
    const blob = await new Promise(res=>canvas.toBlob(res,"image/png"));
    if(!blob) throw new Error("toBlob failed");
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `kashmir-invoice-${o.code}.png`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 4000);
    toast("✅ تم تنزيل الفاتورة على جهازك","success");
    modal.classList.remove("open");
    // نسجّل في Firebase إن العميل نزّل الفاتورة
    try{
      const email = o.email || localStorage.getItem("kashmirSessionEmail");
      const ts = Date.now(), upd = {};
      upd[`orders/${o.id}/invoiceDownloadedAt`] = ts;
      if(email) upd[`userOrders/${eKey(email)}/${o.id}/invoiceDownloadedAt`] = ts;
      await update(ref(db), upd);
      o.invoiceDownloadedAt = ts;
    }catch(e){ console.error("invoice log:", e); }
  }catch(e){
    console.error("invoice error:", e);
    toast("❌ حصل خطأ أثناء تنزيل الفاتورة","error");
  }finally{
    wrap.remove();
    btn.disabled = false; btn.innerHTML = old;
  }
}

// فتح تبويب الرصيد مباشرة: user/accoun.html?tab=wallet
(function openWalletFromQuery(){
  if(new URLSearchParams(location.search).get("tab") !== "wallet") return;
  const btn = Array.from(document.querySelectorAll(".nav-btn")).find(b=>(b.getAttribute("onclick")||"").includes("switchTab('wallet'"));
  if(btn) window.switchTab("wallet", btn);
})();

// فتح تبويب الطلبات مباشرة من الرابط: user/accoun.html?tab=orders
(function openOrdersFromQuery(){
  if(new URLSearchParams(location.search).get("tab") !== "orders") return;
  const btn = Array.from(document.querySelectorAll(".nav-btn")).find(b=>(b.getAttribute("onclick")||"").includes("switchTab('orders'"));
  if(btn) window.switchTab("orders", btn);
})();

import "./payment-return.js";
