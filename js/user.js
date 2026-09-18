// ============================================================
//  Firebase Imports
// ============================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
    getDatabase, ref, set, get, onValue, off, remove,
    query, orderByChild, equalTo
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const firebaseConfig = {
    apiKey:            "AIzaSyCCk0w_KHVCswjp16TSkNToRSSOjlPC5kE",
    authDomain:        "data-customer-d722f.firebaseapp.com",
    databaseURL:       "https://data-customer-d722f-default-rtdb.firebaseio.com/",
    projectId:         "data-customer-d722f",
    storageBucket:     "data-customer-d722f.firebasestorage.app",
    messagingSenderId: "398522341614",
    appId:             "1:398522341614:web:99e0f897c61ec960cffbff"
};
const app = initializeApp(firebaseConfig);
const db  = getDatabase(app);

function emailKey(e)   { return e.replace(/\./g,"_").replace(/@/g,"__"); }
function generateSID() { return Date.now().toString(36)+Math.random().toString(36).substring(2,10); }

function getDeviceInfo(){
    const ua=navigator.userAgent; let device="جهاز غير معروف",icon="💻";
    if(/iPhone/.test(ua)){device="iPhone";icon="📱";}
    else if(/iPad/.test(ua)){device="iPad";icon="📱";}
    else if(/Android/.test(ua)&&/Mobile/.test(ua)){device="Android موبايل";icon="📱";}
    else if(/Android/.test(ua)){device="Android تابلت";icon="📱";}
    else if(/Mac/.test(ua)){device="Mac";icon="💻";}
    else if(/Windows/.test(ua)){device="Windows PC";icon="🖥️";}
    else if(/Linux/.test(ua)){device="Linux";icon="🖥️";}
    let browser="متصفح";
    if(/Chrome/.test(ua)&&!/Edg/.test(ua))browser="Chrome";
    else if(/Firefox/.test(ua))browser="Firefox";
    else if(/Safari/.test(ua))browser="Safari";
    else if(/Edg/.test(ua))browser="Edge";
    else if(/Opera|OPR/.test(ua))browser="Opera";
    return{device,browser,icon};
}

// ─── Toast ────────────────────────────────────────────────
function showToastAccount(msg,type="info"){
    let t=document.getElementById("toast-account");
    if(!t){
        t=document.createElement("div"); t.id="toast-account";
        t.style.cssText="position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(70px);background:#1a2d52;color:#fff;padding:13px 26px;border-radius:30px;font-family:'Almarai',sans-serif;font-size:14px;font-weight:600;z-index:99999;opacity:0;transition:all .35s cubic-bezier(.34,1.56,.64,1);box-shadow:0 8px 28px rgba(0,0,0,.22);direction:rtl;white-space:nowrap;border:1.5px solid transparent;";
        document.body.appendChild(t);
    }
    const colors={success:"#2e7d32",error:"#e53935",info:"#c8a96e"};
    t.style.borderColor=colors[type]||colors.info; t.textContent=msg;
    requestAnimationFrame(()=>{t.style.opacity="1";t.style.transform="translateX(-50%) translateY(0)";});
    clearTimeout(t._timer);
    t._timer=setTimeout(()=>{t.style.opacity="0";t.style.transform="translateX(-50%) translateY(70px)";},3200);
}

// ============================================================
//  VISIT & TIME TRACKING
// ============================================================
let _sessionStart=Date.now(), _timeInterval=null;

async function trackVisit(email){
    const eKey=emailKey(email);
    try{
        const snap=await get(ref(db,`userStats/${eKey}/totalVisits`));
        await set(ref(db,`userStats/${eKey}/totalVisits`),(snap.exists()?snap.val():0)+1);
        await set(ref(db,`userStats/${eKey}/lastVisit`),new Date().toISOString());
    }catch(e){console.warn(e);}
}
async function saveTime(email,mins){
    if(mins<=0)return;
    const eKey=emailKey(email);
    try{
        const snap=await get(ref(db,`userStats/${eKey}/totalMinutes`));
        await set(ref(db,`userStats/${eKey}/totalMinutes`),(snap.exists()?snap.val():0)+mins);
    }catch(e){}
}
function startTimeTracker(email){
    _sessionStart=Date.now(); clearInterval(_timeInterval);
    _timeInterval=setInterval(async()=>{
        const m=Math.round((Date.now()-_sessionStart)/60000);
        if(m>=1){await saveTime(email,m); _sessionStart=Date.now();}
    },2*60*1000);
    window.addEventListener("beforeunload",()=>{
        const m=Math.round((Date.now()-_sessionStart)/60000);
        if(m>=1) saveTime(email,m);
    });
}
async function loadStats(email){
    const eKey=emailKey(email);
    try{
        const snap=await get(ref(db,`userStats/${eKey}`));
        const s=snap.exists()?snap.val():{};
        const visits=s.totalVisits||1;
        const hours=((s.totalMinutes||0)/60).toFixed(1);
        const vEl=document.getElementById("stat-visits");
        const hEl=document.getElementById("stat-hours");
        if(vEl) animNum(vEl,visits,0);
        if(hEl) animNum(hEl,parseFloat(hours),1);
    }catch(e){}
}
function animNum(el,target,dec){
    const dur=900,start=Date.now();
    const t=setInterval(()=>{
        const p=Math.min((Date.now()-start)/dur,1),e=1-Math.pow(1-p,3);
        el.textContent=(e*target).toFixed(dec);
        if(p>=1){clearInterval(t);el.textContent=target.toFixed(dec);}
    },16);
}

// ============================================================
//  SESSION
// ============================================================
let _listenerPath=null;

async function createSession(email,userData){
    const sessionId=generateSID(),eKey=emailKey(email);
    const{device,browser,icon}=getDeviceInfo();
    await set(ref(db,`sessions/${eKey}/${sessionId}`),{
        sessionId,email,device,browser,icon,
        loginAt:new Date().toISOString(),lastSeen:Date.now(),isActive:true,
        userAgent:navigator.userAgent.substring(0,150)
    });
    localStorage.setItem("kashmirSessionId",sessionId);
    localStorage.setItem("kashmirSessionEmail",email);
    localStorage.setItem("kashmirUser",JSON.stringify(userData));
    return sessionId;
}
async function validateSession(){
    const sid=localStorage.getItem("kashmirSessionId"),email=localStorage.getItem("kashmirSessionEmail");
    if(!sid||!email)return null;
    try{
        const snap=await get(ref(db,`sessions/${emailKey(email)}/${sid}`));
        if(!snap.exists()||!snap.val().isActive){clearLocalSession();return null;}
        await set(ref(db,`sessions/${emailKey(email)}/${sid}/lastSeen`),Date.now());
        return snap.val();
    }catch(e){return null;}
}
function clearLocalSession(){
    ["kashmirSessionId","kashmirSessionEmail","kashmirUser"].forEach(k=>localStorage.removeItem(k));
}
async function destroySession(email,sid){
    try{await remove(ref(db,`sessions/${emailKey(email)}/${sid}`));}catch(e){}
}
function watchSession(email,sid){
    const path=`sessions/${emailKey(email)}/${sid}`;
    if(_listenerPath){try{off(ref(db,_listenerPath));}catch(e){}} _listenerPath=path;
    onValue(ref(db,path),(snap)=>{
        if(!snap.exists()||!snap.val().isActive){clearLocalSession();showForcedLogout();}
    });
}
function showForcedLogout(){
    const o=document.createElement("div");
    o.style.cssText="position:fixed;inset:0;background:rgba(15,27,53,.88);z-index:99999;display:flex;align-items:center;justify-content:center;direction:rtl;backdrop-filter:blur(6px);";
    o.innerHTML=`<div style="background:#fff;border-radius:20px;padding:44px 36px;text-align:center;max-width:380px;width:92%;box-shadow:0 20px 60px rgba(0,0,0,.3);font-family:'Almarai',sans-serif;">
        <div style="font-size:56px;margin-bottom:16px;">🔒</div>
        <h3 style="color:#0f1b35;font-size:20px;font-weight:700;margin-bottom:10px;">تم تسجيل الخروج</h3>
        <p style="color:#64748b;font-size:14px;line-height:1.8;margin-bottom:28px;">تم تسجيل دخول من جهاز آخر، لذلك تم تسجيل خروجك تلقائياً.</p>
        <button onclick="location.reload()" style="background:linear-gradient(135deg,#1d6fc4,#1a5fad);color:#fff;border:none;border-radius:10px;padding:13px 36px;font-size:15px;cursor:pointer;font-family:'Almarai',sans-serif;font-weight:700;">تسجيل الدخول مجدداً</button>
    </div>`;
    document.body.appendChild(o);
}

// ============================================================
//  DEVICES
// ============================================================
async function renderDevices(email){
    const c=document.getElementById("devices-list"); if(!c)return;
    c.innerHTML=`<p style="color:#94a3b8;text-align:center;padding:16px;font-family:'Almarai',sans-serif;font-size:13px;">جاري التحميل...</p>`;
    const snap=await get(ref(db,`sessions/${emailKey(email)}`));
    if(!snap.exists()){c.innerHTML=`<p style="color:#94a3b8;text-align:center;padding:16px;font-family:'Almarai',sans-serif;font-size:13px;">لا توجد أجهزة متصلة</p>`;return;}
    const sessions=snap.val(),mySid=localStorage.getItem("kashmirSessionId");
    let html="";
    Object.entries(sessions).sort(([,a],[,b])=>new Date(b.loginAt)-new Date(a.loginAt))
    .forEach(([sid,d])=>{
        const isMine=sid===mySid;
        const date=new Date(d.loginAt).toLocaleDateString("ar-EG",{year:"numeric",month:"long",day:"numeric",hour:"2-digit",minute:"2-digit"});
        html+=`<div class="device-card ${isMine?"device-current":""}">
            <div class="device-icon">${d.icon||"💻"}</div>
            <div class="device-info">
                <h4>${d.device||"جهاز"} — ${d.browser||"متصفح"} ${isMine?'<span class="device-badge">هذا الجهاز</span>':""}</h4>
                <p>آخر دخول: ${date}</p>
            </div>
            ${!isMine?`<button class="device-logout-btn" onclick="logoutDevice('${email}','${sid}')"><i class="fa-solid fa-right-from-bracket"></i> إنهاء</button>`:""}
        </div>`;
    });
    c.innerHTML=html;
}
window.logoutDevice=async function(email,sid){
    try{await remove(ref(db,`sessions/${emailKey(email)}/${sid}`));showToastAccount("✅ تم إنهاء الجلسة","success");setTimeout(()=>renderDevices(email),700);}
    catch(e){showToastAccount("❌ حدث خطأ","error");}
};
window.logoutAllDevices=async function(){
    const email=localStorage.getItem("kashmirSessionEmail"); if(!email)return;
    try{await remove(ref(db,`sessions/${emailKey(email)}`));clearLocalSession();showToastAccount("✅ تم تسجيل الخروج من كل الأجهزة","success");setTimeout(()=>location.href="../index.html",1500);}
    catch(e){showToastAccount("❌ حدث خطأ","error");}
};

// ============================================================
//  FILL PAGE DATA
// ============================================================
async function fillAccountPage(email){
    try{
        const snap=await get(query(ref(db,"users"),orderByChild("email"),equalTo(email)));
        if(!snap.exists())return;
        let ud=null; snap.forEach(c=>{ud=c.val();});
        if(!ud)return;
        const sv=(id,v)=>{const e=document.getElementById(id);if(e)e.value=v||"";};
        const st=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v||"";};
        sv("userEmail",ud.email); sv("userPhone",ud.phone);
        sv("userName",ud.firstName); sv("userFamily",ud.lastName);
        st("welcomeName","مرحباً، "+(ud.firstName||""));
        st("userEmailDisplay",ud.email);
        if(ud.gender) document.querySelectorAll('input[name="gender"]').forEach(r=>{r.checked=r.value===ud.gender;});
        injectStatsCard(email);
        renderDevices(email);
    }catch(e){console.error(e);}
}
function fillSidebarProfile(){
    const saved=localStorage.getItem("kashmirUser"); if(!saved)return;
    try{
        const u=JSON.parse(saved);
        const n=document.getElementById("welcomeName"); if(n)n.textContent="مرحباً، "+(u.firstName||"");
        const em=document.getElementById("userEmailDisplay"); if(em)em.textContent=u.email||"";
        const img=document.getElementById("profileImage"),ico=document.getElementById("icon_person");
        const si=localStorage.getItem("kashmirProfileImg");
        if(si&&img&&ico){img.src=si;img.style.display="block";ico.style.display="none";}
    }catch(e){}
}
function injectStatsCard(email){
    const formation=document.querySelector(".formation");
    if(!formation||document.getElementById("user-stats-card"))return;
    const d=document.createElement("div");
    d.id="user-stats-card"; d.className="stats-card";
    d.innerHTML=`
        <div class="stat-item">
            <div class="stat-icon"><i class="fa-solid fa-arrow-right-to-bracket"></i></div>
            <div class="stat-value" id="stat-visits">—</div>
            <div class="stat-label">عدد الزيارات</div>
        </div>
        <div class="stat-item">
            <div class="stat-icon"><i class="fa-regular fa-clock"></i></div>
            <div class="stat-value" id="stat-hours">—</div>
            <div class="stat-label">ساعات على الموقع</div>
        </div>`;
    const first=formation.querySelector(".section");
    if(first&&first.nextSibling) formation.insertBefore(d,first.nextSibling);
    else formation.appendChild(d);
    loadStats(email);
}

// ============================================================
//  DOMContentLoaded
// ============================================================
document.addEventListener("DOMContentLoaded",async()=>{
    fillSidebarProfile();

    // صورة البروفايل
    const ico=document.getElementById("icon_person"),fi=document.getElementById("fileInput"),pi=document.getElementById("profileImage");
    if(ico&&fi&&pi){
        const si=localStorage.getItem("kashmirProfileImg");
        if(si){pi.src=si;pi.style.display="block";ico.style.display="none";}
        ico.addEventListener("click",()=>fi.click());
        fi.addEventListener("change",(e)=>{
            const f=e.target.files[0]; if(!f)return;
            const r=new FileReader();
            r.onload=(ev)=>{pi.src=ev.target.result;pi.style.display="block";ico.style.display="none";localStorage.setItem("kashmirProfileImg",ev.target.result);};
            r.readAsDataURL(f);
        });
    }

    // زر تحديث الحساب
    const ni=document.getElementById("userName"),fi2=document.getElementById("userFamily"),ub=document.getElementById("updateNamesBtn");
    if(ub){
        const en=()=>{ub.disabled=false;};
        ni?.addEventListener("input",en); fi2?.addEventListener("input",en);
        document.querySelectorAll('input[name="gender"]').forEach(r=>r.addEventListener("change",en));
        ub.addEventListener("click",async()=>{
            const email=localStorage.getItem("kashmirSessionEmail"); if(!email)return;
            const fn=ni?.value.trim(),ln=fi2?.value.trim(),g=document.querySelector('input[name="gender"]:checked')?.value||"";
            if(!fn||!ln){showToastAccount("❌ أدخل الاسم الأول والأخير","error");return;}
            ub.disabled=true; ub.textContent="جاري التحديث...";
            try{
                const snap=await get(query(ref(db,"users"),orderByChild("email"),equalTo(email)));
                if(snap.exists()){
                    let key=null; snap.forEach(c=>{key=c.key;});
                    if(key){
                        await set(ref(db,`users/${key}/firstName`),fn);
                        await set(ref(db,`users/${key}/lastName`),ln);
                        if(g) await set(ref(db,`users/${key}/gender`),g);
                        const s=JSON.parse(localStorage.getItem("kashmirUser")||"{}");
                        Object.assign(s,{firstName:fn,lastName:ln,...(g&&{gender:g})});
                        localStorage.setItem("kashmirUser",JSON.stringify(s));
                        showToastAccount("✅ تم تحديث البيانات بنجاح","success");
                    }
                }
            }catch(e){showToastAccount("❌ "+e.message,"error");}
            finally{ub.textContent="تحديث الحساب"; ub.disabled=true;}
        });
    }

    // تسجيل الخروج
    const modal=document.getElementById("accountDeletionModal");
    const errEl=document.getElementById("deletionErrorMsg");
    document.getElementById("logoutLink")?.addEventListener("click",(e)=>{e.preventDefault();modal?.classList.add("active");});
    document.getElementById("cancelAccountDeletion")?.addEventListener("click",()=>{modal?.classList.remove("active");if(errEl)errEl.textContent="";});
    modal?.addEventListener("click",(e)=>{if(e.target===modal){modal.classList.remove("active");if(errEl)errEl.textContent="";}});
    document.getElementById("confirmAccountDeletion")?.addEventListener("click",async()=>{
        const input=document.getElementById("accountDeletionEmailInput")?.value.trim();
        const email=localStorage.getItem("kashmirSessionEmail");
        if(!input){if(errEl)errEl.textContent="أدخل بريدك الإلكتروني";return;}
        if(input!==email){if(errEl)errEl.textContent="❌ البريد الإلكتروني غير مطابق";return;}
        const m=Math.round((Date.now()-_sessionStart)/60000);
        if(m>=1)await saveTime(email,m); clearInterval(_timeInterval);
        const sid=localStorage.getItem("kashmirSessionId");
        if(sid&&email)await destroySession(email,sid);
        clearLocalSession(); localStorage.removeItem("kashmirProfileImg");
        modal?.classList.remove("active");
        showToastAccount("👋 تم تسجيل الخروج بنجاح","success");
        setTimeout(()=>location.href="../index.html",1400);
    });

    // التحقق من الجلسة
    const session=await validateSession();
    if(session){
        const email=localStorage.getItem("kashmirSessionEmail");
        watchSession(email,session.sessionId);
        await trackVisit(email);
        startTimeTracker(email);
        if(document.getElementById("userEmail")) fillAccountPage(email);
        else injectStatsCard(email);
    }
});

export{createSession,validateSession,watchSession,clearLocalSession,emailKey};
