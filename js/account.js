import{initializeApp}from"https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import{getDatabase,ref,set,get,onValue,off,remove,query,orderByChild,equalTo}from"https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import{getFirestore,doc,getDoc}from"https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
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
};

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

// لما يختار صورة → احفظها في Database كـ base64 مباشرةً (بدون Storage - بدون CORS)
fileInput?.addEventListener("change",(e)=>{
  const file=e.target.files[0];
  if(!file)return;
  // حجم الصورة أقل من 500KB عشان تتحفظ في Database
  if(file.size > 500*1024){toast("❌ الصورة كبيرة جداً — اختر صورة أقل من 500KB","error");return;}
  const r=new FileReader();
  r.onload=async(ev)=>{
    const base64=ev.target.result;
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
  };
  r.readAsDataURL(file);
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
