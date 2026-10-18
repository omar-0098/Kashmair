// ============================================================
//  💬 chat.js — تكبير صورة صاحب التعليق + الدردشة (جوه صفحة الأكونت)
//  حطه جنب account.js في فولدر js/  وضيف في أول account.js:   import "./chat.js";
// ============================================================
import{initializeApp}from"https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import{getDatabase,ref,get,set,push,update,onValue,off,runTransaction,query,orderByChild,equalTo,remove,increment}from"https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const cfg={apiKey:"AIzaSyCCk0w_KHVCswjp16TSkNToRSSOjlPC5kE",authDomain:"data-customer-d722f.firebaseapp.com",databaseURL:"https://data-customer-d722f-default-rtdb.firebaseio.com/",projectId:"data-customer-d722f",storageBucket:"data-customer-d722f.firebasestorage.app",messagingSenderId:"398522341614",appId:"1:398522341614:web:99e0f897c61ec960cffbff"};
const db=getDatabase(initializeApp(cfg));

const eKey=e=>String(e).toLowerCase().replace(/\./g,"_").replace(/@/g,"__");
const esc=s=>String(s??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
const safeImg=u=>/^(data:image\/|https:\/\/)/.test(u||"")?u:"";
const myEmail=()=>(localStorage.getItem("kashmirSessionEmail")||"").toLowerCase();
const cidOf=(a,b)=>[eKey(a),eKey(b)].sort().join("~~");
const IS_ACCOUNT=!!document.querySelector(".main-panel")&&!!document.getElementById("tab-account");
const ACCOUNT_URL="../user/accoun.html";   // عدّل المسار لو صفحة الأكونت في مكان تاني
const COLORS=["#e74c3c","#8e44ad","#3498db","#f39c12","#27ae60","#e67e22","#1abc9c"];
const colorFor=n=>{let h=0;for(const ch of(n||"م"))h=ch.charCodeAt(0)+((h<<5)-h);return COLORS[Math.abs(h)%COLORS.length];};
const fTime=ts=>{try{return new Date(ts).toLocaleTimeString("ar-EG",{hour:"2-digit",minute:"2-digit"});}catch(e){return"";}};
const myName=()=>{try{const u=JSON.parse(localStorage.getItem("kashmirUser")||"null");if(u)return[u.firstName,u.lastName].filter(Boolean).join(" ")||u.name||"";}catch(e){}return"";};

// ---------- CSS ----------
const CHAT_CSS_URL=new URL("./chat.css",import.meta.url).href;   // chat.css لازم يكون جنب chat.js
if(!document.querySelector('link[data-chat-css]')){const l=document.createElement("link");l.rel="stylesheet";l.href=CHAT_CSS_URL;l.setAttribute("data-chat-css","1");document.head.appendChild(l);}

// ينزّل الصفحة لحد الدردشة (مهم على الموبايل عشان القايمة فوق والدردشة تحت)
function scrollToChat(){
  // ارتفاع الهيدر الثابت (اللي بيفضل فوق وقت السكرول) عشان مياكلش أول الدردشة
  const topOffset=()=>{
    let h=0;
    document.querySelectorAll("body *").forEach(el=>{
      const cs=getComputedStyle(el);
      if(cs.position!=="fixed"&&cs.position!=="sticky")return;
      const r=el.getBoundingClientRect();
      if(r.height<20||r.height>180||r.width<window.innerWidth*0.6||r.top>2||r.bottom<=0)return;   // هيدر بس، مش أوفرلاي بطول الشاشة
      if(cs.display==="none"||cs.visibility==="hidden"||Number(cs.opacity)===0||cs.pointerEvents==="none")return;
      if(el.closest("#chStoryView,.sn-ov,#ph-lightbox,#chMyProf,.ui-ov,#chUserModal"))return;
      h=Math.max(h,r.bottom);
    });
    return h;
  };
  const go=()=>{
    const t=document.getElementById("chWrap")||document.getElementById("tab-chat");
    if(!t)return;
    const off=Math.min(topOffset(),180);
    const y=t.getBoundingClientRect().top+window.scrollY-off-10;
    window.scrollTo({top:Math.max(0,y),behavior:"smooth"});
    // احتياطي لو الصفحة بتسكرول في عنصر تاني غير window
    setTimeout(()=>{if(Math.abs(t.getBoundingClientRect().top-off-10)>40){t.style.scrollMarginTop=(off+10)+"px";t.scrollIntoView({behavior:"smooth",block:"start"});}},500);
  };
  setTimeout(go,120);
}
// ---------- بناء تبويب الدردشة + زرار في القائمة ----------
function mountTab(){
  if(document.getElementById("tab-chat"))return;
  const panel=document.createElement("div");
  panel.className="tab-panel";panel.id="tab-chat";
  panel.innerHTML=`
  <div class="panel-title"><h2>الدردشة</h2><p>محادثاتك مع باقي العملاء</p></div>
  <div class="ch-wrap" id="chWrap">
    <div class="ch-side">
      <div class="ch-me"><button class="ch-gear" id="chGear" type="button" title="بياناتي في الدردشة"><i class="fa-solid fa-gear"></i></button><div class="ch-avcol"><div class="ava"><div class="ch-ava" id="chMeAva"></div><span class="dot"></span></div><span class="st">متاح</span></div>
        <div class="ch-info"><h3 id="chMeName"></h3><div class="ch-meun" id="chMeUn"></div><div class="ch-fstat" id="chFStat"></div></div><button class="ch-nudge" id="chNudge" type="button">كمّل نبذتك وروابطك ←</button></div>
      <div class="ch-search"><input id="chSearch" placeholder="بحث"><i class="fa-solid fa-magnifying-glass"></i></div>
      <div class="ch-actions"><button type="button" id="chFollowBtn"><i class="fa-solid fa-user-group"></i> المتابعات <span class="bd" id="chFollowBadge"></span></button><button type="button" id="chBc" style="display:none"><i class="fa-solid fa-bullhorn"></i> للجميع</button></div>
      <div class="ch-lbl">القصص</div><div class="ch-stories" id="chStories"></div>
      <div class="ch-lblrow"><div class="ch-lbl">آخر المحادثات</div><button class="ch-plus" id="chPlus" type="button" title="محادثة جديدة"><i class="fa-solid fa-plus"></i> </button></div>
      <div class="ch-newrow" id="chNewRow"><input id="chNewEmail" type="email" placeholder="إيميل أو @اسم_المستخدم" autocomplete="off"><button id="chNewGo" type="button">ابدأ</button></div>
      <div class="ch-list" id="chList"></div>
    </div>
    <div class="ch-main" id="chMain"></div>
  </div>`;
  document.querySelector(".main-panel")?.appendChild(panel);

  const nav=document.querySelector(".nav-card");
  const btn=document.createElement("button");
  btn.className="nav-btn";btn.id="chatNavBtn";
  btn.innerHTML=`الدردشة <span id="chatNavBadge"></span> <i class="fa-solid fa-message"></i>`;
  btn.onclick=()=>{window.switchTab("chat",btn);ensureUsername();scrollToChat();};
  const after=[...nav.querySelectorAll(".nav-btn")].find(b=>b.getAttribute("onclick")?.includes("'comments'"));
  after?after.after(btn):nav.prepend(btn);
}

// ---------- الحالة ----------
let me="",active=null,msgRef=null,typRef=null,typTimer=null,photoCache={},convs={};
let followingMap={},followersMap={},myFc=0,verifyAt=0,vfCache={},panelDraw=null;
const $=id=>document.getElementById(id);

async function photoOf(email){
  const k=eKey(email);
  if(k in photoCache)return photoCache[k];
  try{const s=await get(ref(db,`userPhotos/${k}`));photoCache[k]=s.exists()?safeImg(s.val()):"";}catch(e){photoCache[k]="";}
  return photoCache[k];
}
const avaHtml=(photo,name,cls="")=>photo?`<div class="ch-ava ${cls}" style="background-image:url('${esc(photo)}')"></div>`
  :`<div class="ch-ava ${cls}" style="background:${colorFor(name)}">${esc((name||"م").charAt(0))}</div>`;

// ---------- قايمة المحادثات ----------
function renderList(){
  const q=($("chSearch")?.value||"").trim().toLowerCase();
  const rows=Object.entries(convs).map(([k,v])=>({k,...v})).filter(v=>!q||(v.name||"").toLowerCase().includes(q)).sort((a,b)=>(b.ts||0)-(a.ts||0));
  const list=$("chList");if(!list)return;
  if(!rows.length){list.innerHTML=`<div class="ch-none">${q?"مفيش نتايج":"لسه معندكش محادثات.<br>اضغط على صورة أي صاحب تعليق وابدأ دردشة 💬"}</div>`;return;}
  list.innerHTML=rows.map(v=>`<div class="ch-item${active&&eKey(active.email)===v.k?" on":""}" data-email="${esc(v.email)}" data-name="${esc(v.name)}">
    <span data-ph="${esc(v.email)}" data-chat-email="${esc(v.email)}" data-chat-name="${esc(v.name||v.email)}" title="عرض البطاقة">${avaHtml(photoCache[v.k],v.name)}</span>
    <div class="tx"><b>${esc(v.name||v.email)}${vb(v.k)}${v.un?` <em>@${esc(v.un)}</em>`:""}</b><span>${esc(v.last||"")}</span></div>
    <div class="tm">${v.ts?fTime(v.ts):""}</div>
    ${v.unread>0?`<div class="ub">${v.unread}</div>`:""}</div>`).join("");
  list.querySelectorAll(".ch-item").forEach(el=>{
    el.onclick=()=>openChat(el.dataset.email,el.dataset.name);
    photoOf(el.dataset.email).then(p=>{if(p){const s=el.querySelector("[data-ph]");if(s)s.innerHTML=avaHtml(p,el.dataset.name);}});
  });
  warmVf(rows.map(v=>v.k)).then(ch=>{if(ch)renderList();});
}
function updateBadge(){
  const n=Object.values(convs).reduce((a,v)=>a+(v.unread||0),0)+pendingCount(),b=$("chatNavBadge");
  if(!b)return;b.textContent=n;b.style.display=n>0?"inline-block":"none";
}
function listenConvs(){
  onValue(ref(db,`userChats/${eKey(me)}`),s=>{convs=s.val()||{};renderList();updateBadge();if($("chStories"))syncStoryWatchers();});
}

// ---------- بروفايلي: يظهر لما تدوس على صورتك في الجنب ----------
async function openMyProfile(){
  let m=$("chMyProf");
  if(!m){
    m=document.createElement("div");m.id="chMyProf";
    document.body.appendChild(m);
    m.addEventListener("click",e=>{if(e.target===m||e.target.closest(".x"))m.classList.remove("open");});
    document.addEventListener("keydown",e=>{if(e.key==="Escape")m.classList.remove("open");});
  }
  const shell=inner=>`<div class="bx pcbox"><button class="x" type="button" aria-label="إغلاق">✕</button><div class="ch-pc-wrap">${inner}</div></div>`;
  m.innerHTML=shell(`<div class="pcard"><div style="padding:70px 0;color:#9aa3b2"><i class="fa-solid fa-spinner fa-spin"></i></div></div>`);
  m.classList.add("open");
  const name=myName()||me;
  const photo=await photoOf(me);
  const r=await cardFor(me,name,photo);
  myProf=r.p;refreshNudge();
  m.innerHTML=shell(r.html+(r.p.phone?`<div class="pc-calls"><div class="cc-row"><span>التليفون</span><span dir="ltr">${esc(r.p.phone)}</span></div></div>`:""));
}
// الضغط على صورتك في الجنب (delegation عشان يشتغل حتى لو الصورة اتبدّلت)
document.addEventListener("click",e=>{
  if(e.target.closest(".ch-me .ava")){e.preventDefault();openMyProfile();}
},true);

// ============================================================
//  المتابعة + التوثيق + رسالة للجميع (للمالك)
// ============================================================
const OWNER="oo9mar9988@gmail.com";
const isOwner=e=>String(e||"").trim().toLowerCase()===OWNER;
async function canSeeProf(ownerEmail,privacy){
  const o=String(ownerEmail||"").toLowerCase();
  if(o===me||isOwner(me))return true;
  if(privacy==="none")return false;
  if(privacy!=="followers")return true;
  try{const sn=await get(ref(db,`follows/${eKey(me)}/${eKey(o)}/st`));return sn.val()==="a";}catch(e){return false;}
}
const pendingCount=()=>Object.values(followersMap).filter(x=>x&&x.st==="p").length;
async function canMsg(peerEmail){
  if(isOwner(me))return true;
  const meK=eKey(me),pk=eKey(peerEmail);
  try{
    const [a,b,o]=await Promise.all([
      get(ref(db,`follows/${meK}/${pk}/st`)),
      get(ref(db,`follows/${pk}/${meK}/st`)),
      isOwner(peerEmail)?get(ref(db,`chatOpen/${cidOf(me,peerEmail)}`)):Promise.resolve(null)
    ]);
    return a.val()==="a"||b.val()==="a"||!!(o&&o.val()===true);
  }catch(e){return false;}
}
async function followReq(email,name,un){
  const meK=eKey(me),tk=eKey(email),ts=Date.now();
  try{const ex=await get(ref(db,`follows/${meK}/${tk}/st`));if(ex.val())return ex.val();}catch(e){}
  let need=false;
  try{need=(await get(ref(db,`chatProfiles/${tk}/approve`))).val()===true;}catch(e){}
  const st=need?"p":"a";                       // الافتراضي: متابعة فورية بدون موافقة
  const up={
    [`follows/${meK}/${tk}`]:{st,ts,email:String(email).toLowerCase(),name:name||"",un:un||""},
    [`followers/${tk}/${meK}`]:{st,ts,email:me,name:myName()||me,un:(myProf&&myProf.username)||""}
  };
  if(!need)up[`followerCount/${tk}`]=increment(1);
  await update(ref(db),up);
  return st;
}
async function dropFollow(followerEmail,targetEmail){
  if(isOwner(targetEmail)&&!isOwner(me)&&String(followerEmail).toLowerCase()===me)throw new Error("ownerlock");
  const fk=eKey(followerEmail),tk=eKey(targetEmail);
  const sn=await get(ref(db,`follows/${fk}/${tk}/st`));
  const up={[`follows/${fk}/${tk}`]:null,[`followers/${tk}/${fk}`]:null};
  if(sn.val()==="a")up[`followerCount/${tk}`]=increment(-1);
  await update(ref(db),up);
}
const unfollowUser=email=>dropFollow(me,email);
const LOCK_MSG="متابعة كشمير هوم إجبارية ومينفعش تتلغي";
// كل مستخدم بيتابع حساب المالك تلقائياً أول ما يفتح الدردشة
async function ensureOwnerFollow(){
  if(!me||isOwner(me))return;
  try{
    if(!myProf)await reloadMyProf();
    const meK=eKey(me),ok=eKey(OWNER);
    const myUn=(myProf&&myProf.username)||"",myNm=myName()||me;
    const cur=(await get(ref(db,`follows/${meK}/${ok}`))).val();
    if(cur&&cur.st==="a"){
      const f=(await get(ref(db,`followers/${ok}/${meK}`))).val();
      if(!f||f.st!=="a"){
        await update(ref(db),{[`followers/${ok}/${meK}`]:{st:"a",ts:cur.ts||Date.now(),email:me,name:myNm,un:myUn,auto:1}});
      }else if((f.un||"")!==myUn||(f.name||"")!==myNm){
        await update(ref(db,`followers/${ok}/${meK}`),{un:myUn,name:myNm});
      }
      return;
    }
    let ownerName="كشمير هوم",ownerUn="";
    try{
      const sn=await get(query(ref(db,"users"),orderByChild("email"),equalTo(OWNER)));
      sn.forEach(x=>{const u=x.val()||{};ownerName=[u.firstName,u.lastName].filter(Boolean).join(" ")||u.name||ownerName;});
    }catch(e){}
    try{ownerUn=(await get(ref(db,`chatProfiles/${ok}/username`))).val()||"";}catch(e){}
    const ts=Date.now();
    await update(ref(db),{
      [`follows/${meK}/${ok}`]:{st:"a",ts,email:OWNER,name:ownerName,un:ownerUn,auto:1},
      [`followers/${ok}/${meK}`]:{st:"a",ts,email:me,name:myNm,un:myUn,auto:1},
      [`followerCount/${ok}`]:increment(1)
    });
  }catch(e){console.error("auto follow:",e);}
}
const rejectFollow=email=>dropFollow(email,me);
async function acceptFollow(email){
  const rk=eKey(email),meK=eKey(me);
  const sn=await get(ref(db,`follows/${rk}/${meK}/st`));
  if(sn.val()!=="p")return;
  await update(ref(db),{[`follows/${rk}/${meK}/st`]:"a",[`followers/${meK}/${rk}/st`]:"a",[`followerCount/${meK}`]:increment(1)});
}
// علامة التوثيق: يدوي من الأدمن، أو تلقائي لما عدد المتابعين يوصل للحد اللي حاططه الأدمن، والمالك موثّق دايماً
const VF_TTL=300000;
async function warmVf(keys){
  const now=Date.now();let changed=false;
  const ownerK=eKey(OWNER);
  await Promise.all([...new Set(keys)].filter(k=>k&&(!vfCache[k]||now-vfCache[k].t>VF_TTL)).map(async k=>{
    let v=false;
    try{
      if(k===ownerK)v=true;
      else{
        const [m,c]=await Promise.all([get(ref(db,`verified/${k}`)),get(ref(db,`followerCount/${k}`))]);
        const mv=m.val();
        v=mv===true?true:(mv===false?false:(verifyAt>0&&(Number(c.val())||0)>=verifyAt));
      }
    }catch(e){}
    if(!vfCache[k]||vfCache[k].v!==v)changed=true;
    vfCache[k]={v,t:Date.now()};
  }));
  return changed;
}
const vb=k=>(vfCache[k]&&vfCache[k].v)?` <i class="fa-solid fa-circle-check vf" title="حساب موثّق"></i>`:"";
function refreshMeName(){
  const n=$("chMeName");if(!n)return;
  n.innerHTML=esc(myName()||me)+vb(eKey(me));
}
function updateFollowUI(){
  const n=pendingCount();
  const b=$("chFollowBadge");if(b)b.textContent=n||"";
  const s=$("chFStat");
  if(s){const fw=Object.values(followingMap).filter(x=>x&&x.st==="a").length;s.textContent=`👥 ${myFc} متابع · ${fw} بتابعهم`;}
  updateBadge();
}
function initFollow(){
  const meK=eKey(me);
  onValue(ref(db,`follows/${meK}`),sn=>{followingMap=sn.val()||{};updateFollowUI();syncStoryWatchers();renderStories();if(panelDraw)panelDraw();});
  onValue(ref(db,`followers/${meK}`),sn=>{followersMap=sn.val()||{};updateFollowUI();if(panelDraw)panelDraw();});
  onValue(ref(db,`followerCount/${meK}`),sn=>{myFc=Math.max(0,Number(sn.val())||0);updateFollowUI();vfCache={};warmVf([meK]).then(refreshMeName);});
  onValue(ref(db,"chatSettings/verifyAt"),sn=>{verifyAt=Number(sn.val())||0;vfCache={};warmVf([meK]).then(()=>{refreshMeName();renderList();});});
  $("chFollowBtn").onclick=()=>openFollowPanel();
  if(isOwner(me)){const b=$("chBc");if(b){b.style.display="";b.onclick=openBroadcast;}}
}
function openFollowPanel(tab){
  $("chFollowM")?.remove();
  const m=document.createElement("div");m.id="chFollowM";m.className="sn-ov";
  m.innerHTML=`<div class="bx"><button class="x" type="button" aria-label="إغلاق">✕</button><h3>المتابعات</h3><div class="fp-tabs" id="fpTabs"></div><div id="fpList"></div></div>`;
  document.body.appendChild(m);
  let cur=tab||(pendingCount()?"req":"fol");
  const close=()=>{panelDraw=null;m.remove();};
  const rowBtns=x=>{
    const d=`data-em="${esc(x.email||"")}" data-nm="${esc(x.name||"")}"`;
    if(cur==="req")return `<button ${d} data-a="acc">قبول</button><button ${d} data-a="rej" class="g">رفض</button>`;
    if(cur==="fol")return `<button ${d} data-a="msg">رسالة</button><button ${d} data-a="rm" class="r">إزالة</button>`;
    if(isOwner(x.email))return `<button ${d} data-a="msg">رسالة</button><span class="lk">🔒 إجباري</span>`;
    return x.st==="p"?`<button ${d} data-a="cancel" class="g">إلغاء الطلب</button>`:`<button ${d} data-a="msg">رسالة</button><button ${d} data-a="unf" class="g">إلغاء المتابعة</button>`;
  };
  const draw=()=>{
    if(!document.body.contains(m))return;
    const inc=Object.entries(followersMap).map(([k,x])=>({k,...x}));
    const req=inc.filter(x=>x.st==="p"),fol=inc.filter(x=>x.st==="a");
    const out=Object.entries(followingMap).map(([k,x])=>({k,...x}));
    $("fpTabs").innerHTML=`<button data-t="req" class="${cur==="req"?"on":""}">طلبات (${req.length})</button><button data-t="fol" class="${cur==="fol"?"on":""}">متابعيني (${fol.length})</button><button data-t="out" class="${cur==="out"?"on":""}">بتابعهم (${out.length})</button>`;
    const list=cur==="req"?req:cur==="fol"?fol:out;
    warmVf(list.map(x=>x.k)).then(ch=>{if(ch&&panelDraw===draw)draw();});
    $("fpList").innerHTML=list.length?list.map(x=>`<div class="fp-row"><span data-chat-email="${esc(x.email||"")}" data-chat-name="${esc(x.name||x.email||"")}" title="عرض البطاقة">${avaHtml(photoCache[x.k],x.name)}</span><div class="nm"><b>${esc(x.name||x.email)}${vb(x.k)}</b>${x.un?`<em>@${esc(x.un)}</em>`:""}</div><div class="bt">${rowBtns(x)}</div></div>`).join(""):`<div class="fp-none">${cur==="req"?"مفيش طلبات متابعة":cur==="fol"?"لسه محدش بيتابعك":"إنت مش بتتابع حد"}</div>`;
    list.forEach(x=>{if(x.email&&!photoCache[x.k])photoOf(x.email).then(ph=>{if(ph&&panelDraw===draw)draw();});});
  };
  m.addEventListener("click",async e=>{
    if(e.target===m||e.target.closest(".x")){close();return;}
    const t=e.target.closest("#fpTabs button");if(t){cur=t.dataset.t;draw();return;}
    const b=e.target.closest(".fp-row button");if(!b)return;
    const em=b.dataset.em,nm=b.dataset.nm,a=b.dataset.a;
    if((a==="unf"||a==="cancel")&&isOwner(em)){notify(LOCK_MSG);return;}
    const q={rej:"هل تريد رفض طلب المتابعة؟",rm:`هل تريد إزالة ${nm||"المتابع"} من متابعيك؟`,unf:`هل تريد إلغاء متابعة ${nm||"الشخص"}؟`,cancel:"هل تريد إلغاء طلب المتابعة؟"}[a];
    if(q&&!(await uiConfirm(q,a==="cancel"?{danger:false,ok:"إلغاء الطلب"}:undefined)))return;
    try{
      if(a==="acc")await acceptFollow(em);
      else if(a==="rej"||a==="rm")await rejectFollow(em);
      else if(a==="unf"||a==="cancel")await unfollowUser(em);
      else if(a==="msg"){close();openChat(em,nm);}
    }catch(er){console.error(er);notify("تعذّر تنفيذ العملية");}
  });
  panelDraw=draw;draw();
}
// رسالة لكل الناس (للمالك بس)
async function openBroadcast(){
  if(!isOwner(me))return;
  $("chBcM")?.remove();
  const m=document.createElement("div");m.id="chBcM";m.className="sn-ov";
  m.innerHTML=`<div class="bx"><button class="x" type="button" aria-label="إغلاق">✕</button><h3>📢 رسالة لكل الناس</h3>
    <p style="font-size:13px;color:#6b7486;margin:0 0 12px;line-height:1.8">هتتبعت لكل المستخدمين على الموقع، وتوصلهم في الدردشة منك مباشرة.</p>
    <textarea class="sn-in" id="bcText" maxlength="500" style="min-height:110px;resize:vertical" placeholder="اكتب رسالتك..."></textarea>
    <div class="sn-err" id="bcMsg"></div><button class="sn-pub" id="bcGo" type="button">إرسال للجميع</button></div>`;
  document.body.appendChild(m);
  m.addEventListener("click",e=>{if(e.target===m||e.target.closest(".x"))m.remove();});
  $("bcGo").onclick=async()=>{
    const text=$("bcText").value.trim().slice(0,500),msg=$("bcMsg"),b=$("bcGo");
    if(!text){msg.textContent="اكتب الرسالة الأول";return;}
    b.disabled=true;msg.style.color="";msg.textContent="جاري تجهيز القائمة...";
    try{
      const sn=await get(ref(db,"users"));const seen=new Set(),list=[];
      sn.forEach(c=>{
        const u=c.val()||{};const em=String(u.email||"").trim().toLowerCase();
        if(!em||em===me||seen.has(em))return;
        seen.add(em);list.push({email:em,name:[u.firstName,u.lastName].filter(Boolean).join(" ")||u.name||em});
      });
      if(!list.length){msg.textContent="مفيش مستخدمين";b.disabled=false;return;}
      if(!(await uiConfirm(`هل تريد إرسال الرسالة لـ ${list.length} مستخدم؟`))){b.disabled=false;msg.textContent="";return;}
      const meK=eKey(me),ts=Date.now(),preview=text.slice(0,60),myUn=(myProf&&myProf.username)||"",myNm=myName()||me;
      for(let i=0;i<list.length;i+=80){
        const up={};
        list.slice(i,i+80).forEach(u=>{
          const pk=eKey(u.email),cid=cidOf(me,u.email),mk=push(ref(db,`chats/${cid}/messages`)).key;
          up[`chats/${cid}/messages/${mk}`]={from:me,ts,text,bc:1};
          up[`chatOpen/${cid}`]=true;
          up[`userChats/${meK}/${pk}/email`]=u.email;up[`userChats/${meK}/${pk}/name`]=u.name;up[`userChats/${meK}/${pk}/last`]="أنت: "+preview;up[`userChats/${meK}/${pk}/ts`]=ts;
          up[`userChats/${pk}/${meK}/email`]=me;up[`userChats/${pk}/${meK}/name`]=myNm;up[`userChats/${pk}/${meK}/last`]=preview;up[`userChats/${pk}/${meK}/ts`]=ts;up[`userChats/${pk}/${meK}/un`]=myUn;
          up[`userChats/${pk}/${meK}/unread`]=increment(1);
        });
        await update(ref(db),up);
        msg.textContent=`تم الإرسال لـ ${Math.min(list.length,i+80)} من ${list.length}...`;
      }
      msg.style.color="#1b9a74";msg.textContent=`✓ اتبعتت لـ ${list.length} مستخدم`;
      b.textContent="تم";
    }catch(e){console.error(e);msg.style.color="";msg.textContent="تعذّر الإرسال — راجع قواعد Firebase";b.disabled=false;}
  };
}

// ============================================================
//  بطاقة التعريف (غلاف + حلقة ملونة + إحصائيات + سوشيال)
// ============================================================
const COVERS={
 sky:"radial-gradient(ellipse at 28% 62%,rgba(255,255,255,.95),transparent 52%),radial-gradient(ellipse at 74% 38%,rgba(255,255,255,.85),transparent 48%),linear-gradient(180deg,#9db7d3,#e1eaf3)",
 sunset:"linear-gradient(135deg,#ff9a8b,#ff6a88 55%,#ff99ac)",
 mint:"linear-gradient(135deg,#84fab0,#8fd3f4)",
 lavender:"linear-gradient(135deg,#a18cd1,#fbc2eb)",
 night:"linear-gradient(135deg,#0f2027,#2c5364)",
 gold:"linear-gradient(135deg,#f6d365,#fda085)"
};
const COVER_NAMES={sky:"سماء",sunset:"غروب",mint:"مينت",lavender:"لافندر",night:"ليل",gold:"ذهبي"};
function coverCss(v){
  v=String(v||"");
  if(v.startsWith("g:")&&COVERS[v.slice(2)])return COVERS[v.slice(2)];
  if(/^data:image\/(jpeg|png|webp);base64,/.test(v)&&v.length<500000)return "url("+JSON.stringify(v)+") center/cover no-repeat";
  return COVERS.sky;
}
const fmtK=n=>{
  n=Number(n)||0;
  if(n>=1e6)return (n/1e6).toFixed(n>=1e7?0:1).replace(/\.0$/,"")+"M";
  if(n>=1e3)return (n/1e3).toFixed(n>=1e4?0:1).replace(/\.0$/,"")+"K";
  return String(n);
};
async function loadCover(k){try{const s=await get(ref(db,`chatCovers/${k}`));return coverCss(s.val());}catch(e){return COVERS.sky;}}
async function loadStats(k){
  try{
    const [fc,fg,st]=await Promise.all([get(ref(db,`followerCount/${k}`)),get(ref(db,`follows/${k}`)),get(ref(db,`stories/${k}`))]);
    const now=Date.now();let following=0,stories=0;
    fg.forEach(x=>{if((x.val()||{}).st==="a")following++;});
    st.forEach(x=>{if((Number((x.val()||{}).ts)||0)+864e5>now)stories++;});
    return{fw:Math.max(0,Number(fc.val())||0),fg:following,st:stories};
  }catch(e){return{fw:0,fg:0,st:0};}
}
async function relState(email){
  try{const s=await get(ref(db,`follows/${eKey(me)}/${eKey(email)}/st`));return s.val()==="a"?"a":s.val()==="p"?"p":"none";}catch(e){return"none";}
}
const plusInner=rel=>rel==="a"?'✓ أتابعه  ':rel==="p"?'<i class="fa-regular fa-clock"></i>':'<i class="fa-solid fa-plus"> متابعة </i>';
const plusTitle=rel=>rel==="a"?"بتتابعه — اضغط لإلغاء المتابعة":rel==="p"?"في انتظار الموافقة — اضغط لإلغاء الطلب":"متابعة";
function profCardHtml(d){
  const photo=safeImg(d.photo);
  const ava=photo?`<div class="pc-ava" style="background-image:url('${esc(photo)}')"></div>`
    :`<div class="pc-ava" style="background:${colorFor(d.name)}">${esc((d.name||"م").charAt(0))}</div>`;
  const socDefs=[["facebook","fa-facebook-f"],["instagram","fa-instagram"],["tiktok","fa-tiktok"]];
  const soc=socDefs.map(([k,ic])=>d.p[k]?`<a href="${esc(d.p[k])}" target="_blank" rel="noopener noreferrer" title="${k}"><i class="fa-brands ${ic}"></i></a>`:`<span class="off"><i class="fa-brands ${ic}"></i></span>`).join("");
  const plus=d.noPlus?"":(d.own
    ?`<button type="button" class="pc-plus" data-act="edit" title="تعديل بياناتي">✎</button>`
    :`<button type="button" class="pc-plus${d.rel==="a"?" on":""}" data-act="${(isOwner(d.email)&&d.rel==="a")?"locked":(d.rel==="none"?"follow":"unf")}" data-st="${d.rel}" data-em="${esc(d.email)}" data-nm="${esc(d.name)}" data-un="${esc(d.p.username||"")}" title="${(isOwner(d.email)&&d.rel==="a")?"متابعة إجبارية":plusTitle(d.rel)}">${plusInner(d.rel)}</button>`);
  const bio=d.p.bio?esc(d.p.bio):(d.vis?(d.own?"اكتب نبذة عن نفسك من الإعدادات ✏️":"لسه ما كتبش نبذة"):"🔒 النبذة والروابط خاصة");
  return `<div class="pcard"><div class="pc-cover" style="background:${esc(d.cover)}">${plus}</div>
    <div class="pc-ring">${ava}</div>
    <h3 class="pc-name">${esc(d.name)}${vb(d.k)}</h3>
    ${d.p.username?`<div class="pc-un">@${esc(d.p.username)}</div>`:""}
    <p class="pc-bio${d.p.bio?"":" mut"}">${bio}</p>
    <div class="pc-stats"><div><b>${d.loading?"…":fmtK(d.stats.fw)}</b><span>المتابعين</span></div><div><b>${d.loading?"…":fmtK(d.stats.fg)}</b><span>بتابعهم</span></div><div><b>${d.loading?"…":fmtK(d.stats.st)}</b><span>القصص</span></div></div>
    <div class="pc-soc">${soc}</div></div>`;
}
async function cardFor(email,name,photo){
  email=String(email||"").toLowerCase();
  const k=eKey(email),own=email===me;
  const [p,cover,stats,rel]=await Promise.all([loadProfile(k),loadCover(k),loadStats(k),own?Promise.resolve("none"):relState(email),warmVf([k])]);
  const vis=own||await canSeeProf(email,p.privacy);
  const pp=vis?p:{...p,bio:"",phone:"",facebook:"",instagram:"",tiktok:""};
  return{p,pp,vis,html:profCardHtml({k,email,name,photo,own,rel,cover,stats,p:pp,vis})};
}
function setPlus(b,rel){
  b.dataset.st=rel;b.dataset.act=(isOwner(b.dataset.em)&&rel==="a")?"locked":(rel==="none"?"follow":"unf");
  b.innerHTML=plusInner(rel);b.title=plusTitle(rel);b.classList.toggle("on",rel==="a");
}
// زرار + على الغلاف: متابعة / إلغاء متابعة / تعديل بياناتي
document.addEventListener("click",async e=>{
  const b=e.target.closest(".pc-plus");if(!b)return;
  e.preventDefault();e.stopPropagation();
  const act=b.dataset.act;
  if(act==="locked"){notify(LOCK_MSG);return;}
  if(act==="edit"){
    $("chMyProf")?.classList.remove("open");$("ph-lightbox")?.classList.remove("open");
    if(IS_ACCOUNT)openProfEditor();else location.href=ACCOUNT_URL;
    return;
  }
  if(!me){notify("سجّل دخول الأول عشان تتابع");return;}
  const em=b.dataset.em,nm=b.dataset.nm,un=b.dataset.un;
  b.disabled=true;
  try{
    if(act==="follow"){
      const st=await followReq(em,nm,un);
      setPlus(b,st==="a"?"a":"p");
      notify(st==="a"?"تمت المتابعة ✓ تقدر تبعتله رسالة دلوقتي":"طلب المتابعة اتبعت — مستني موافقته","ok");
    }else if(act==="unf"){
      const pend=b.dataset.st==="p";
      if(await uiConfirm(pend?"هل تريد إلغاء طلب المتابعة؟":`هل تريد إلغاء متابعة ${nm||"الشخص"}؟`,{danger:!pend?true:false,ok:pend?"إلغاء الطلب":"إلغاء المتابعة"})){
        await unfollowUser(em);setPlus(b,"none");
      }
    }
  }catch(er){console.error(er);notify("تعذّر تنفيذ العملية");}
  b.disabled=false;
},true);
// تغيير الغلاف من الإعدادات
async function coverFromFile(f){
  const url=URL.createObjectURL(f);
  try{
    const img=await new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=no;i.src=url;});
    const W=900,H=360,cv=document.createElement("canvas");cv.width=W;cv.height=H;
    const r=Math.max(W/img.width,H/img.height),w=img.width*r,h=img.height*r;
    cv.getContext("2d").drawImage(img,(W-w)/2,(H-h)/2,w,h);
    return cv.toDataURL("image/jpeg",.78);
  }finally{URL.revokeObjectURL(url);}
}
async function initCoverUI(){
  const prev=$("cvPrev"),sw=$("cvSw");if(!prev||!sw)return;
  const meK=eKey(me);
  let raw="";try{raw=(await get(ref(db,`chatCovers/${meK}`))).val()||"";}catch(e){}
  const paint=()=>{prev.style.background=coverCss(raw);sw.querySelectorAll("button").forEach(b=>b.classList.toggle("on",raw==="g:"+b.dataset.cv||(!raw&&b.dataset.cv==="sky")));};
  paint();
  const save=async v=>{
    raw=v;paint();
    try{if(v)await set(ref(db,`chatCovers/${meK}`),v);else await remove(ref(db,`chatCovers/${meK}`));notify("تم تحديث الغلاف ✓","ok");}
    catch(e){console.error(e);notify("تعذّر حفظ الغلاف — راجع قواعد Firebase");}
  };
  sw.onclick=e=>{const b=e.target.closest("button[data-cv]");if(b)save("g:"+b.dataset.cv);};
  $("cvFile").onchange=async e=>{
    const f=e.target.files[0];e.target.value="";if(!f||!f.type.startsWith("image/"))return;
    try{await save(await coverFromFile(f));}catch(er){notify("تعذّر قراءة الصورة");}
  };
  $("cvClear").onclick=()=>save("");
}

// ---------- بيانات الاتصال (نبذة + سوشيال + تليفون) ----------
const linkify=t=>esc(t).replace(/(https:\/\/[^\s<]+)/g,u=>`<a href="${u}" target="_blank" rel="noopener noreferrer">${u}</a>`);
const cleanPhone=v=>String(v||"").replace(/[^\d+]/g,"").slice(0,16);
const SOC={facebook:h=>"https://facebook.com/"+h,instagram:h=>"https://instagram.com/"+h.replace(/^@/,""),tiktok:h=>"https://www.tiktok.com/@"+h.replace(/^@/,"")};
function normSocial(kind,val){
  let v=String(val||"").trim();if(!v)return"";
  if(/^http:\/\//i.test(v))v=v.replace(/^http:\/\//i,"https://");
  if(/^https:\/\//i.test(v))return v.replace(/\s/g,"").slice(0,300);
  const h=v.replace(/^[\/@]+/,"");
  return /^[\w.\-]{1,60}$/.test(h)?SOC[kind](h):"";
}
async function loadProfile(k){
  try{
    const s=await get(ref(db,`chatProfiles/${k}`));const p=s.val()||{};
    const ok=u=>/^https:\/\//.test(u||"")?String(u).slice(0,300):"";
    return{bio:String(p.bio||"").slice(0,400),phone:cleanPhone(p.phone),facebook:ok(p.facebook),instagram:ok(p.instagram),tiktok:ok(p.tiktok),username:/^[\w\u0600-\u06FF]{6,20}$/.test(p.username||"")?p.username:"",privacy:["all","followers","none"].includes(p.privacy)?p.privacy:"all",approve:p.approve===true};
  }catch(e){console.error("chat profile:",e);return{bio:"",phone:"",facebook:"",instagram:"",tiktok:"",username:"",privacy:"all",approve:false};}
}
const profIncomplete=p=>!p.bio||(!p.facebook&&!p.instagram&&!p.tiktok);
let myProf=null;
const UN_RE=/^[\w\u0600-\u06FF]{6,20}$/;
async function unStatus(raw){
  const name=String(raw||"").trim().replace(/^@+/,"");
  if(!name)return{state:"empty",msg:"اكتب اسم المستخدم اللي عايزه"};
  if(name.length<6)return{state:"bad",msg:"قصير أوي — لازم 6 حروف على الأقل"};
  if(name.length>20)return{state:"bad",msg:"طويل — الحد الأقصى 20 حرف"};
  if(!UN_RE.test(name))return{state:"bad",msg:"مسموح بس بحروف وأرقام و _ (من غير مسافات أو رموز)"};
  try{
    const sn=await get(ref(db,`chatUsernames/${name.toLowerCase()}`));const v=sn.val();
    if(!v)return{state:"free",msg:"✓ الاسم متاح، تقدر تستخدمه"};
    if(v===me)return{state:"mine",msg:"✓ ده اسمك الحالي"};
    return{state:"taken",msg:"✗ الاسم ده مستخدم قبل كده"};
  }catch(e){return{state:"err",msg:"تعذّر التحقق، راجع قواعد Firebase"};}
}
async function unSuggest(raw){
  const base=String(raw||"").trim().replace(/^@+/,"").replace(/[^\w\u0600-\u06FF]/g,"").slice(0,15)||"user";
  const c=new Set();
  while(c.size<6)c.add(base+(Math.random()<.5?"_":"")+Math.floor(10+Math.random()*990));
  const res=await Promise.all([...c].map(async n=>{
    try{const sn=await get(ref(db,`chatUsernames/${n.toLowerCase()}`));return sn.val()?null:n;}catch(e){return null;}
  }));
  return res.filter(Boolean).slice(0,3);
}
function bindUnLive(input,hint,chips,onState){
  let seq=0,t=null;
  const run=async()=>{
    const my=++seq;hint.className="un-hint";hint.textContent="جاري التحقق...";chips.innerHTML="";
    const r=await unStatus(input.value);if(my!==seq)return;
    hint.textContent=r.msg;
    hint.className="un-hint "+((r.state==="free"||r.state==="mine")?"ok":(r.state==="empty"?"":"bad"));
    if(r.state==="taken"){
      const sg=await unSuggest(input.value);if(my!==seq)return;
      chips.innerHTML=sg.map(n=>`<button type="button" data-n="${esc(n)}">@${esc(n)}</button>`).join("");
    }
    if(onState)onState(r);
  };
  input.addEventListener("input",()=>{
    clearTimeout(t);
    if(onState)onState({state:"pending"});
    if(!input.value.trim()){seq++;hint.className="un-hint";hint.textContent="اكتب اسم المستخدم اللي عايزه";chips.innerHTML="";return;}
    hint.className="un-hint";hint.textContent="جاري التحقق...";
    t=setTimeout(run,350);
  });
  chips.addEventListener("click",e=>{const b=e.target.closest("button[data-n]");if(!b)return;input.value=b.dataset.n;run();});
  return run;
}
async function claimUsername(raw){
  const name=String(raw||"").trim().replace(/^@+/,"");
  if(!/^[\w\u0600-\u06FF]{6,20}$/.test(name))return{ok:false,msg:"الاسم لازم يكون من 6 لـ 20 حرف: حروف أو أرقام أو _ بس"};
  const key=name.toLowerCase();
  try{
    const old=(myProf&&myProf.username)||"";
    const r=await runTransaction(ref(db,`chatUsernames/${key}`),cur=>(cur===null||cur===me)?me:undefined);
    if(!r.committed)return{ok:false,msg:"الاسم ده مأخوذ، جرّب اسم تاني"};
    await update(ref(db,`chatProfiles/${eKey(me)}`),{username:name});
    if(old&&old.toLowerCase()!==key){
      const o=ref(db,`chatUsernames/${old.toLowerCase()}`);
      const sn=await get(o);if(sn.val()===me)await remove(o);
    }
    myProf={...(myProf||{}),username:name};
    return{ok:true,name};
  }catch(e){console.error("username:",e);return{ok:false,msg:"تعذّر الحفظ، راجع قواعد Firebase"};}
}
let _unWaiters=[];
function ensureUsername(){
  if(myProf&&myProf.username)return Promise.resolve(true);
  return (async()=>{
    try{if(!myProf)await reloadMyProf();}catch(e){}
    if(myProf&&myProf.username)return true;
    applyGate();
    return new Promise(r=>_unWaiters.push(r));
  })();
}
// بوابة إجبارية: مفيش أي حاجة في الدردشة تشتغل غير لما يكتب اسم مستخدم
function applyGate(){
  const w=$("chWrap");if(!w)return;
  const need=!!(myProf&&!myProf.username);
  let g=$("chGate");
  if(!need){
    if(g)g.remove();
    const ws=_unWaiters;_unWaiters=[];ws.forEach(r=>r(true));
    return;
  }
  if(g)return;
  g=document.createElement("div");g.id="chGate";g.className="ch-gate";
  g.innerHTML=`<div class="bx"><i class="fa-solid fa-at gt-ic"></i><h3>اختار اسم المستخدم</h3>
    <p class="s">لازم يكون ليك اسم مستخدم عشان تقدر تستخدم الدردشة والقصص. بيظهر لأصحابك كده: <b dir="ltr">@اسمك</b></p>
    <div class="cp-un"><span>@</span><input id="gtName" class="ltr" maxlength="20" placeholder="ahmed_ali" autocomplete="off"></div>
    <div class="un-hint" id="gtHint">اكتب اسم المستخدم اللي عايزه</div>
    <div class="un-chips" id="gtChips"></div>
    <button class="gt-save" id="gtSave" type="button" disabled>حفظ ومتابعة</button></div>`;
  w.appendChild(g);
  let okState=false;
  bindUnLive($("gtName"),$("gtHint"),$("gtChips"),r=>{okState=(r.state==="free"||r.state==="mine");$("gtSave").disabled=!okState;});
  const save=async()=>{
    if(!okState)return;
    const b=$("gtSave");b.disabled=true;b.textContent="جاري الحفظ...";
    const r=await claimUsername($("gtName").value);
    if(r.ok){fillProfForm(myProf);refreshNudge();}
    else{$("gtHint").textContent=r.msg;$("gtHint").className="un-hint bad";b.disabled=false;b.textContent="حفظ ومتابعة";}
  };
  $("gtSave").onclick=save;
  $("gtName").onkeydown=e=>{if(e.key==="Enter")save();};
  $("gtName").focus();
}
function refreshNudge(){
  const u=$("chMeUn");
  if(u)u.textContent=(myProf&&myProf.username)?"@"+myProf.username:"";
  applyGate();
  const n=$("chNudge");if(!n)return;
  n.style.display=(myProf&&profIncomplete(myProf))?"block":"none";
}
function fillProfForm(p){
  if(!$("cpBio"))return;
  if($("cpUser"))$("cpUser").value=p.username||"";
  if($("cpPriv"))$("cpPriv").value=p.privacy||"all";
  if($("cpApprove"))$("cpApprove").checked=!!p.approve;
  $("cpBio").value=p.bio;$("cpPhone").value=p.phone;$("cpFb").value=p.facebook;$("cpIg").value=p.instagram;$("cpTt").value=p.tiktok;
}
async function reloadMyProf(){myProf=await loadProfile(eKey(me));fillProfForm(myProf);refreshNudge();}
function mountProfileCard(){
  const host=$("tab-settings");
  if(!host||$("chatProfCard"))return;
  const card=document.createElement("div");
  card.className="info-card";card.id="chatProfCard";
  card.innerHTML=`<div class="card-header"><div class="card-header-bar"></div><h3>بياناتي في الدردشة</h3></div>
    <p class="cp-note">اللي تكتبه هنا بيظهر لأصحابك في تبويب «اتصال» جوه الدردشة. كله اختياري.</p>
    <label for="cpUser">اسم المستخدم</label><div class="cp-un"><span>@</span><input class="ltr" id="cpUser" maxlength="20" placeholder="ahmed_ali" autocomplete="off"></div>
    <div class="cp-note">حروف أو أرقام أو _ (من 6 لـ 20) — بيظهر لأصحابك بالشكل @اسمك</div>
    <div class="un-hint" id="cpUnHint"></div><div class="un-chips" id="cpUnChips" style="justify-content:flex-start"></div>
    <label>صورة الغلاف (بتظهر في بطاقتك)</label>
    <div class="cv-prev" id="cvPrev"></div>
    <div class="cv-sw" id="cvSw">${Object.keys(COVERS).map(id=>`<button type="button" data-cv="${id}" title="${COVER_NAMES[id]}" style="background:${COVERS[id]}"></button>`).join("")}</div>
    <div class="cv-act"><label class="th-up" style="margin:0"><i class="fa-regular fa-image"></i> رفع صورة<input type="file" id="cvFile" accept="image/*" hidden></label><button type="button" id="cvClear" class="th-up" style="border:none;margin:0">إزالة</button></div>
    <label for="cpBio">نبذة عني</label><textarea id="cpBio" maxlength="400" placeholder="اكتب نبذة قصيرة عن نفسك..."></textarea>
    <label for="cpPhone">رقم التليفون (للاتصال العادي)</label><input class="ltr" id="cpPhone" type="tel" placeholder="+20 100 000 0000">
    <label for="cpFb">فيسبوك (رابط أو اسم المستخدم)</label><input class="ltr" id="cpFb" placeholder="facebook.com/yourname">
    <label for="cpIg">انستجرام (رابط أو اسم المستخدم)</label><input class="ltr" id="cpIg" placeholder="@yourname">
    <label for="cpTt">تيك توك (رابط أو اسم المستخدم)</label><input class="ltr" id="cpTt" placeholder="@yourname">
    <label for="cpPriv">مين يقدر يشوف نبذتي وروابطي؟</label>
    <select id="cpPriv"><option value="all">الجميع</option><option value="followers">المتابعين فقط</option><option value="none">محدش (خاصة)</option></select>
    <div class="cp-note">ده بيتحكم في اللي بيظهر لما حد يدوس على صورتك في التعليقات أو في الدردشة.</div>
    <label style="display:flex;align-items:center;gap:10px;cursor:pointer;margin-top:16px"><input type="checkbox" id="cpApprove" style="width:auto"> لازم أوافق على طلبات المتابعة قبل ما حد يقدر يكلمني</label>
    <div class="cp-note">الافتراضي: أي حد يدوس «متابعة» يقدر يكلمك على طول.</div>
    <button class="cp-save" id="cpSave" type="button">حفظ</button>`;
  const first=host.querySelector(".info-card");
  first?first.after(card):host.appendChild(card);
  bindUnLive($("cpUser"),$("cpUnHint"),$("cpUnChips"),null);
  initCoverUI();
  $("cpSave").onclick=async()=>{
    const btn=$("cpSave");btn.disabled=true;btn.textContent="جاري الحفظ...";
    const wantU=$("cpUser").value.trim().replace(/^@+/,"");
    if(wantU&&wantU!==((myProf&&myProf.username)||"")){
      const r=await claimUsername(wantU);
      if(!r.ok){notify(r.msg);btn.disabled=false;btn.textContent="حفظ";return;}
    }
    const data={bio:$("cpBio").value.trim().slice(0,400),phone:cleanPhone($("cpPhone").value),
      facebook:normSocial("facebook",$("cpFb").value),instagram:normSocial("instagram",$("cpIg").value),tiktok:normSocial("tiktok",$("cpTt").value),privacy:(["all","followers","none"].includes($("cpPriv").value)?$("cpPriv").value:"all"),approve:!!$("cpApprove").checked,ts:Date.now()};
    try{
      await update(ref(db,`chatProfiles/${eKey(me)}`),data);
      myProf={...(myProf||{}),...data};fillProfForm(myProf);refreshNudge();
      btn.textContent="تم الحفظ ✓";setTimeout(()=>{btn.disabled=false;btn.textContent="حفظ";},1200);
    }catch(e){console.error(e);btn.disabled=false;btn.textContent="حفظ";notify("تعذّر الحفظ، راجع قواعد Firebase");}
  };
}
function mountThemeCard(){
  const host=$("tab-settings");
  if(!host||$("chatThemeCard"))return;
  const card=document.createElement("div");
  card.className="info-card";card.id="chatThemeCard";
  card.innerHTML=`<div class="card-header"><div class="card-header-bar"></div><h3>سمة الدردشة</h3></div>
    <p class="cp-note">اختار خلفية شاشة الرسايل في الدردشة. بتتحفظ على جهازك.</p>
    <div class="th-grid">${BGS.map(b=>`<button type="button" class="th-sw${b.id==="none"?" def":""}${b.dk?" dk":""}" data-id="${b.id}" style="${b.css?`background:${b.css}`:""}">${esc(b.name)}</button>`).join("")}${BG_FILES.map(b=>`<button type="button" class="th-sw th-img dk" data-file="${b.f}">${esc(b.name)}</button>`).join("")}</div>
    <div class="th-prev" id="thPrev"><div class="pb them">أهلاً! إزيك؟ 👋</div><div class="pb me">الحمد لله، تمام 😊</div></div>
    <label class="th-up"><i class="fa-regular fa-image"></i> صورة من جهازك<input type="file" id="thFile" accept="image/*" hidden></label>`;
  const pc=$("chatProfCard");
  pc?pc.after(card):host.appendChild(card);
  const mark=()=>{const c=getBg();card.querySelectorAll(".th-sw").forEach(b=>b.classList.toggle("on",b.dataset.file?(!!c&&c.file===b.dataset.file):((!c&&b.dataset.id==="none")||(!!c&&!c.file&&c.id===b.dataset.id))));};
  card.querySelectorAll(".th-img").forEach(b=>resolveBgImg(b.dataset.file).then(u=>{if(u)b.style.background=`url("${u}") center/cover no-repeat`;else b.style.display="none";}));
  const apply=()=>{applyBg($("thPrev"));applyBg();mark();};
  card.querySelector(".th-grid").onclick=e=>{
    const sw=e.target.closest(".th-sw");if(!sw)return;
    if(sw.dataset.file)localStorage.setItem(bgKey(),JSON.stringify({file:sw.dataset.file}));
    else if(sw.dataset.id==="none")localStorage.removeItem(bgKey());
    else localStorage.setItem(bgKey(),JSON.stringify({id:sw.dataset.id}));
    apply();
  };
  $("thFile").onchange=async e=>{
    const f=e.target.files[0];e.target.value="";if(!f||!f.type.startsWith("image/"))return;
    try{
      const img=await compressImg(f,1100,.7);
      localStorage.setItem(bgKey(),JSON.stringify({img}));
      apply();
    }catch(er){notify("الصورة كبيرة على الخلفية، جرّب صورة أصغر");}
  };
  apply();
}
// يودّي المستخدم لتبويب الإعدادات عند خانة «بياناتي في الدردشة»
function openProfEditor(){
  mountProfileCard();
  const btn=[...document.querySelectorAll(".nav-card .nav-btn")].find(b=>b.getAttribute("onclick")?.includes("'settings'"));
  window.switchTab("settings",btn);
  const card=$("chatProfCard");
  if(card){
    setTimeout(()=>{card.scrollIntoView({behavior:"smooth",block:"start"});card.classList.remove("flash");void card.offsetWidth;card.classList.add("flash");},120);
  }
}
async function startByEmail(){
  let raw=($("chNewEmail").value||"").trim();
  if(!raw)return;
  if(raw.startsWith("@")){
    try{
      const un=raw.replace(/^@+/,"").toLowerCase();
      const sn=await get(ref(db,`chatUsernames/${un}`));
      if(!sn.val()){notify("مفيش مستخدم بالاسم ده");return;}
      raw=String(sn.val());
    }catch(e){notify("حصلت مشكلة، جرّب تاني");return;}
  }
  if(raw.toLowerCase()===me){notify("ده إيميلك إنت 😅");return;}
  try{
    let u=null;
    for(const e of[raw,raw.toLowerCase()]){
      const sn=await get(query(ref(db,"users"),orderByChild("email"),equalTo(e)));
      if(sn.exists()){sn.forEach(c=>{u=c.val();});break;}
    }
    if(!u){notify("مفيش حساب بالإيميل ده");return;}
    const name=[u.firstName,u.lastName].filter(Boolean).join(" ")||u.name||raw;
    $("chNewEmail").value="";$("chNewRow").classList.remove("open");
    openChat(u.email||raw,name);
  }catch(e){console.error("chat new:",e);notify("حصلت مشكلة، جرّب تاني");}
}

// ---------- ميديا (صور / فيديو / صوت) + خلفية الشات ----------
const DATA_OK=/^data:(image|audio|video)\/[\w.+-]+(;[\w=.+-]+)*;base64,/;
const MEDIA_TYPES=["image","video","audio"];
const fileToDataUrl=f=>new Promise((ok,no)=>{const r=new FileReader();r.onload=()=>ok(r.result);r.onerror=no;r.readAsDataURL(f);});
async function compressImg(f,max=1280,q=.78){
  const url=URL.createObjectURL(f);
  try{
    const img=await new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=no;i.src=url;});
    const r=Math.min(1,max/Math.max(img.width,img.height));
    const c=document.createElement("canvas");c.width=Math.max(1,Math.round(img.width*r));c.height=Math.max(1,Math.round(img.height*r));
    c.getContext("2d").drawImage(img,0,0,c.width,c.height);
    return c.toDataURL("image/jpeg",q);
  }finally{URL.revokeObjectURL(url);}
}
const BGS=[
 {id:"none",name:"افتراضي",css:""},
 {id:"mint",name:"مينت",css:"linear-gradient(135deg,#e6f7f1,#cfeee3)"},
 {id:"sky",name:"سما",css:"linear-gradient(135deg,#e3f0ff,#cbe0fa)"},
 {id:"sunset",name:"غروب",css:"linear-gradient(135deg,#ffe9d6,#ffd0da)"},
 {id:"lav",name:"لافندر",css:"linear-gradient(135deg,#ece6ff,#d6cff5)"},
 {id:"dots",name:"نقط",css:"radial-gradient(#cdd6e4 1.5px,transparent 1.5px) 0 0/18px 18px,#f4f7fb"},
 {id:"night",name:"ليل",css:"linear-gradient(135deg,#1f2a44,#2c3e66)",dk:1},
 {id:"forest",name:"غابة",css:"linear-gradient(135deg,#17352b,#24604a)",dk:1}
];
// صور الخلفيات الجاهزة (فولدر img/chat_img) — عدّل المسار لو الصفحة في مكان تاني
const CHAT_IMG_DIR="../img/chat_img/";
const CHAT_IMG_EXTS=["jpg","jpeg","png","webp"];
const BG_FILES=[
 {f:"main",name:"أزرق",dk:1},{f:"one",name:"قطة صفراء"},{f:"two",name:"سنجاب"},{f:"three",name:"كرتون"},
 {f:"four",name:"دبدوب"},{f:"five",name:"ليل",dk:1},{f:"six",name:"بنت"}
];
const bgImgCache={};
// بنجرّب الامتدادات لحد ما نلاقي الصورة الموجودة فعلاً
function resolveBgImg(f){
  if(bgImgCache[f]!==undefined)return Promise.resolve(bgImgCache[f]);
  return new Promise(res=>{
    let i=0;
    const tryNext=()=>{
      if(i>=CHAT_IMG_EXTS.length){bgImgCache[f]="";res("");return;}
      const u=CHAT_IMG_DIR+f+"."+CHAT_IMG_EXTS[i++],im=new Image();
      im.onload=()=>{bgImgCache[f]=u;res(u);};
      im.onerror=tryNext;
      im.src=u;
    };
    tryNext();
  });
}
const bgKey=()=>"kchBg_"+eKey(me);
const getBg=()=>{try{return JSON.parse(localStorage.getItem(bgKey())||"null");}catch(e){return null;}};
function applyBg(el){
  el=el||$("chMsgs");if(!el)return;
  el.classList.remove("dk");el.style.background="";
  const cfg=getBg();if(!cfg)return;
  if(cfg.img&&/^data:image\//.test(cfg.img)){el.style.background=`url("${cfg.img}") center/cover`;return;}
  if(cfg.file){
    const bf=BG_FILES.find(x=>x.f===cfg.file);if(!bf)return;
    if(bf.dk)el.classList.add("dk");
    resolveBgImg(bf.f).then(u=>{
      const c2=getBg();
      if(!u||!el.isConnected||!c2||c2.file!==bf.f)return;
      el.style.background=`url("${u}") center/cover no-repeat`;
    });
    return;
  }
  const b=BGS.find(x=>x.id===cfg.id);
  if(b&&b.css){el.style.background=b.css;if(b.dk)el.classList.add("dk");}
}
function viewImg(u){
  $("chImgView")?.remove();
  const d=document.createElement("div");d.id="chImgView";
  const im=document.createElement("img");im.src=u;d.appendChild(im);
  d.onclick=()=>d.remove();document.body.appendChild(d);
}

// ============================================================
//  القصص (زي حالات واتساب) — 24 ساعة: صورة / فيديو / نص
// ============================================================
const storiesBy={},stRefs={},blockedMe={};let myBlocks={};
const stMedia=new Map();
const STC=["#2bb58f","#5b6cd6","#e8661e","#d6336c","#2b3248","#0b8793"];
const seenKey=()=>"kchSeen_"+eKey(me);
const getSeen=()=>{try{return new Set(JSON.parse(localStorage.getItem(seenKey())||"[]"));}catch(e){return new Set();}};
const addSeen=id=>{const x=getSeen();x.add(id);try{localStorage.setItem(seenKey(),JSON.stringify([...x].slice(-300)));}catch(e){}};
const agoTxt=ts=>{const m=Math.floor((Date.now()-ts)/60000);if(m<1)return"الآن";if(m<60)return"منذ "+m+" د";const h=Math.floor(m/60);return"منذ "+h+" س";};
const okColor=c=>/^#[0-9a-fA-F]{6}$/.test(c||"")?c:"#2bb58f";

async function getStoryMedia(k,id){
  const key=k+"/"+id;
  if(stMedia.has(key))return stMedia.get(key);
  try{
    const sn=await get(ref(db,`storyMedia/${k}/${id}`));const u=sn.val();
    const ok=typeof u==="string"&&DATA_OK.test(u)?u:"";
    if(ok)stMedia.set(key,ok);
    return ok;
  }catch(e){console.error("story media:",e);return"";}
}
const ownerDir={};
function applyStories(k,v){
  const now=Date.now();
  storiesBy[k]=Object.entries(v).map(([id,x])=>({id,...x})).filter(x=>(Number(x.ts)||0)+864e5>now).sort((a,b)=>a.ts-b.ts);
  // أي حد يفتح: القصص اللي عدّى عليها 24 ساعة بتتمسح (مع الصورة/الفيديو والمشاهدات)
  Object.entries(v).filter(([,x])=>(Number(x.ts)||0)+864e5<=now).forEach(([id])=>{
    remove(ref(db,`stories/${k}/${id}`)).catch(()=>{});
    remove(ref(db,`storyMedia/${k}/${id}`)).catch(()=>{});
    remove(ref(db,`storyViews/${k}/${id}`)).catch(()=>{});
  });
}
async function loadOwnerDir(){
  try{
    const sn=await get(ref(db,"users"));
    sn.forEach(x=>{
      const u=x.val()||{};const em=String(u.email||"").trim().toLowerCase();
      if(em)ownerDir[eKey(em)]={email:em,name:[u.firstName,u.lastName].filter(Boolean).join(" ")||u.name||em};
    });
    renderStories();
  }catch(e){console.error("users dir:",e);}
}
function syncStoryWatchers(){
  const meK=eKey(me);
  if(isOwner(me)){                      // المالك: كل قصص كل الناس
    if(!stRefs.__all){
      const r=ref(db,"stories");stRefs.__all=r;
      loadOwnerDir();
      onValue(r,sn=>{
        const all=sn.val()||{};
        Object.keys(storiesBy).forEach(k=>{if(!(k in all))storiesBy[k]=[];});
        Object.entries(all).forEach(([k,v])=>applyStories(k,v||{}));
        renderStories();
      });
    }
    return;
  }
  const keys=new Set([meK,...Object.entries(followingMap).filter(([,x])=>x&&x.st==="a").map(([k])=>k)]);
  keys.forEach(k=>{
    if(stRefs[k])return;
    const r=ref(db,`stories/${k}`);stRefs[k]=r;
    onValue(r,sn=>{applyStories(k,sn.val()||{});renderStories();});
    if(k!==meK)get(ref(db,`chatBlocks/${k}/${meK}`)).then(x=>{blockedMe[k]=!!x.val();renderStories();}).catch(()=>{});
  });
  Object.keys(stRefs).forEach(k=>{
    if(!keys.has(k)){off(stRefs[k]);delete stRefs[k];delete storiesBy[k];renderStories();}
  });
}
function renderStories(){
  const box=$("chStories");if(!box||!me)return;
  const meK=eKey(me),seen=getSeen();
  const mine=storiesBy[meK]||[];
  const others=Object.entries(storiesBy)
    .filter(([k,a])=>k!==meK&&a.length&&(isOwner(me)||(!myBlocks[k]&&!blockedMe[k])))
    .map(([k,a])=>({k,items:a,c:Object.assign({},ownerDir[k]||{},convs[k]||{},followingMap[k]||{}),unseen:a.some(x=>!seen.has(x.id)),last:a[a.length-1].ts}))
    .sort((x,y)=>(Number(y.unseen)-Number(x.unseen))||(y.last-x.last));
  const bub=(k,name,photo,cls,plus)=>`<button class="st-b" type="button" data-k="${esc(k)}"><div class="st-ring ${cls}">${avaHtml(photo,name)}${plus?`<span class="st-plus" data-add="1"> <i class="fa-solid fa-plus"></i> </span>`:""}</div><span class="n">${esc(name)}</span></button>`;
  const myName0=myName()||"أنا";
  let html=bub(meK,"قصتي",photoCache[meK],mine.length?"new":"empty",true).replace(">قصتي<",">قصتي<");
  html+=others.map(o=>bub(o.k,o.c.name||o.c.email||"—",photoCache[o.k],o.unseen?"new":"",false)).join("");
  if(!others.length)html+=`<div class="st-none">مفيش قصص جديدة من أصحابك</div>`;
  box.innerHTML=html;
  others.forEach(o=>{ if(o.c.email&&!photoCache[o.k])photoOf(o.c.email).then(ph=>{if(ph)renderStories();}); });
  if(!photoCache[meK])photoOf(me).then(ph=>{if(ph)renderStories();});
}
function initStories(){
  const meK=eKey(me);
  onValue(ref(db,`chatBlocks/${meK}`),sn=>{myBlocks=sn.val()||{};renderStories();});
  syncStoryWatchers();
  $("chStories").addEventListener("click",e=>{
    const b=e.target.closest(".st-b");if(!b)return;
    const k=b.dataset.k;
    if(k===meK){
      if(e.target.closest("[data-add]")||!(storiesBy[meK]||[]).length)openStoryCreate();
      else openStoryViewer(meK,0);
    }else{
      const items=storiesBy[k]||[];const seen=getSeen();
      const idx=items.findIndex(x=>!seen.has(x.id));
      openStoryViewer(k,idx<0?0:idx);
    }
  });
  const prefetch=e=>{
    const b=e.target.closest&&e.target.closest(".st-b");if(!b)return;
    (storiesBy[b.dataset.k]||[]).slice(0,2).forEach(x=>{
      if(x.type!=="text")getStoryMedia(b.dataset.k,x.id);
      if(x.song&&x.song.id)getSongUrl(x.song.id);
    });
  };
  $("chStories").addEventListener("pointerover",prefetch);
  $("chStories").addEventListener("touchstart",prefetch,{passive:true});
  setInterval(()=>{
    const now=Date.now();
    Object.keys(storiesBy).forEach(k=>{
      storiesBy[k].filter(x=>(Number(x.ts)||0)+864e5<=now).forEach(x=>{
        remove(ref(db,`stories/${k}/${x.id}`)).catch(()=>{});
        remove(ref(db,`storyMedia/${k}/${x.id}`)).catch(()=>{});
        remove(ref(db,`storyViews/${k}/${x.id}`)).catch(()=>{});
      });
      storiesBy[k]=storiesBy[k].filter(x=>(Number(x.ts)||0)+864e5>now);
    });
    renderStories();
  },60000);
}

// ---------- أدوات مشتركة للقصص ----------
const STK=["😀","😂","🥰","😍","😎","🤩","😭","😡","🥳","🤔","🙌","👏","👍","🙏","💪","🔥","✨","💯","🎉","🎂","🎁","❤️","💔","💙","💚","💛","🧡","🌹","🌙","☀️","⭐","🌈","☕","🍕","🍔","🍰","🚗","✈️","🏠","📍","📷","🎵","💎","👑","🕌","🤲"];
const LBL=[{e:"مبروك 🎉",bg:"#e8661e"},{e:"صباح الخير ☀️",bg:"#f2a100"},{e:"مساء الخير 🌙",bg:"#3b4075"},{e:"جديد 🔥",bg:"#d6336c"},{e:"حبيبي ❤️",bg:"#c2255c"},{e:"الحمد لله 🤲",bg:"#2bb58f"},{e:"جمعة مباركة 🕌",bg:"#0b8793"},{e:"عقبالك 😍",bg:"#7048e8"}];
const TCOL=["#ffffff","#111111","#ffd43b","#ff6b6b","#4dabf7","#69db7c","#f783ac"];
const hexOk=c=>/^#[0-9a-fA-F]{6}$/.test(c||"");
function cleanOv(arr){
  if(!Array.isArray(arr))return[];
  return arr.slice(0,20).map(o=>{
    if(!o||typeof o!=="object")return null;
    const x=Math.min(97,Math.max(3,Number(o.x)||50)),y=Math.min(97,Math.max(3,Number(o.y)||50)),f=Math.min(40,Math.max(3,Number(o.f)||8));
    if(o.k==="t"){const t=String(o.t||"").slice(0,100);if(!t)return null;return{k:"t",t,x,y,f,c:hexOk(o.c)?o.c:"#ffffff",bg:o.bg?1:0};}
    if(o.k==="s"){const e=String(o.e||"").slice(0,24);if(!e)return null;return{k:"s",e,x,y,f,bg:hexOk(o.bg)?o.bg:""};}
    return null;
  }).filter(Boolean);
}
function ovEl(o,w){
  const d=document.createElement("div");d.className="ov "+(o.k==="t"?"t":"s");
  d.style.left=o.x+"%";d.style.top=o.y+"%";d.style.fontSize=(o.f*w/100)+"px";
  if(o.k==="t"){d.textContent=o.t||" ";d.style.color=o.c;if(o.bg)d.style.background=o.c==="#111111"?"rgba(255,255,255,.88)":"rgba(0,0,0,.55)";}
  else{d.textContent=o.e;if(o.bg){d.classList.add("lbl");d.style.background=o.bg;}}
  return d;
}
function paintOv(layer,ovs){
  layer.innerHTML="";
  const w=layer.getBoundingClientRect().width||300;
  ovs.forEach(o=>layer.appendChild(ovEl(o,w)));
}
// إرسال رسالة لأي شخص (من غير ما نفتح محادثته)
async function deliverTo(email,name,un,extra,preview){
  const meK=eKey(me),peerK=eKey(email),cid=cidOf(me,email);
  const [b1,b2]=await Promise.all([get(ref(db,`chatBlocks/${meK}/${peerK}`)),get(ref(db,`chatBlocks/${peerK}/${meK}`))]);
  if(b1.val()||b2.val())throw new Error("blocked");
  if(!(await canMsg(email)))throw new Error("notconnected");
  const ts=Date.now();
  await push(ref(db,`chats/${cid}/messages`),{from:me,ts,...extra});
  await update(ref(db,`userChats/${meK}/${peerK}`),{email,name,last:"أنت: "+preview,ts,un:un||""});
  await update(ref(db,`userChats/${peerK}/${meK}`),{email:me,name:myName()||me,last:preview,ts,un:(myProf&&myProf.username)||""});
  await runTransaction(ref(db,`userChats/${peerK}/${meK}/unread`),n=>(n||0)+1);
  if(isOwner(me))set(ref(db,`chatOpen/${cid}`),true).catch(()=>{});
}
async function sendStoryMsg(target,ownerK,ownerInfo,it,extra,preview){
  const msg={type:"story",sk:ownerK,sid:it.id,sn:ownerInfo.name||"",su:ownerInfo.un||"",tt:it.type,tb:it.type==="text"?okColor(it.bg):"",rx:extra.rx||"",rep:extra.rep||"",text:preview};
  await deliverTo(target.email,target.name,target.un||"",msg,preview);
}

// ---------- أغاني القصص (المكتبة اللي بتضيفها إنت من لوحة الأدمن) ----------
const songCache=new Map();
const SONG_ID=/^[\w-]+$/;
const songLoading=new Map();
function getSongUrl(id){
  if(!SONG_ID.test(id||""))return Promise.resolve("");
  if(songCache.has(id))return Promise.resolve(songCache.get(id));
  if(songLoading.has(id))return songLoading.get(id);
  const p=_loadSongUrl(id).finally(()=>songLoading.delete(id));
  songLoading.set(id,p);
  return p;
}
async function _loadSongUrl(id){
  try{
    const sn=await get(ref(db,`storySongs/${id}`));const m=sn.val();if(!m)return"";
    let u="";
    if(m.url){
      u=String(m.url);
      if(!(/^https:\/\//.test(u)||/^(\.{0,2}\/)?[\w\-.\/%]+\.(mp3|m4a|ogg|wav|aac)$/i.test(u)))u="";
    }else{
      const d=await get(ref(db,`storySongData/${id}`));const v=d.val();
      if(typeof v==="string"&&/^data:audio\/[\w.+-]+(;[\w=.+-]+)*;base64,/.test(v))u=v;
    }
    if(u)songCache.set(id,u);
    return u;
  }catch(e){console.error("song:",e);return"";}
}
async function loadSongs(){
  try{
    const sn=await get(ref(db,"storySongs"));const v=sn.val()||{};
    return Object.entries(v).map(([id,m])=>({id,title:String((m&&m.title)||"").slice(0,60),artist:String((m&&m.artist)||"").slice(0,60),ts:(m&&m.ts)||0}))
      .filter(x=>x.title&&SONG_ID.test(x.id)).sort((a,b)=>b.ts-a.ts);
  }catch(e){console.error("songs:",e);return[];}
}
let songPrev=null;
function stopSongPrev(){
  if(!songPrev)return;
  try{songPrev.a.pause();}catch(e){}
  if(songPrev.ic)songPrev.ic.className="fa-solid fa-play";
  songPrev=null;
}

// ---------- محرر القصة ----------
function openStoryCreate(){
  if(!(myProf&&myProf.username)){applyGate();return;}
  $("chStoryNew")?.remove();
  const m=document.createElement("div");m.id="chStoryNew";m.className="sn-ov";
  m.innerHTML=`<div class="bx"><button class="x" type="button" aria-label="إغلاق">✕</button><h3>قصة جديدة</h3>
    <div class="sn-pick" id="snPick"><button type="button" id="snMedia"><i class="fa-solid fa-photo-film"></i>صورة / فيديو</button><button type="button" id="snText"><i class="fa-solid fa-font"></i>نص</button></div>
    <input type="file" id="snFile" accept="image/*,video/*" hidden><div id="snBody"></div></div>`;
  document.body.appendChild(m);
  const close=()=>{stopSongPrev();m.remove();};
  m.addEventListener("click",e=>{if(e.target===m||e.target.closest(".x"))close();});
  $("snMedia").onclick=()=>$("snFile").click();
  $("snFile").onchange=async e=>{
    const f=e.target.files[0];e.target.value="";if(!f)return;
    const isVid=f.type.startsWith("video/"),isImg=f.type.startsWith("image/");
    if(!isVid&&!isImg){notify("اختار صورة أو فيديو");return;}
    if(isVid&&f.size>5*1024*1024){notify("الفيديو أكبر من 5 ميجا — اختار فيديو أصغر حجماً");return;}
    let url="";
    try{url=isImg?await compressImg(f,1600,.85):await fileToDataUrl(f);}catch(er){notify("تعذّر قراءة الملف");return;}
    startEditor({type:isImg?"image":"video",url},m,close);
  };
  $("snText").onclick=()=>startEditor({type:"text"},m,close);
}
function startEditor(opts,m,close){
  $("snPick").style.display="none";
  const isText=opts.type==="text";
  const st={ov:[],sel:-1,bg:STC[0],dur:0,song:null};
  const body=$("snBody");
  body.innerHTML=`<div class="ed-stage" id="edStage" style="${isText?`background:${st.bg}`:""}"><div class="ed-media" id="edMedia"></div><div class="ed-layer" id="edLayer"></div></div>
    <div class="ed-ctl" id="edCtl"></div>
    <div class="ed-tools"><button type="button" id="edTxt"><i class="fa-solid fa-font"></i> نص</button><button type="button" id="edStk"><i class="fa-regular fa-face-smile"></i> ملصق</button><button type="button" id="edSong"><i class="fa-solid fa-music"></i> أغنية</button>${isText?`<button type="button" id="edBg"><i class="fa-solid fa-palette"></i> خلفية</button>`:""}</div>
    <div class="ed-song" id="edSongBadge"></div>
    <div class="ed-drawer" id="edDrawer" style="display:none"></div>
    ${isText?"":`<input class="sn-in" id="snCap" maxlength="140" placeholder="أضف تعليق (اختياري)">`}
    <div class="sn-err" id="snErr"></div><button class="sn-pub" id="snPub" type="button">نشر القصة</button>`;
  const stage=$("edStage"),layer=$("edLayer"),media=$("edMedia");
  if(opts.type==="image"){const im=document.createElement("img");im.src=opts.url;media.appendChild(im);}
  else if(opts.type==="video"){
    const v=document.createElement("video");v.src=opts.url;v.controls=true;v.loop=true;v.muted=true;v.playsInline=true;media.appendChild(v);
    v.onloadedmetadata=()=>{st.dur=isFinite(v.duration)?Math.round(v.duration):0;};
  }
  const redraw=()=>{
    const w=layer.getBoundingClientRect().width||300;
    layer.innerHTML="";
    st.ov.forEach((o,i)=>{
      const d=ovEl(o,w);if(i===st.sel)d.classList.add("sel");
      d.addEventListener("pointerdown",e=>startDrag(e,i,d));
      layer.appendChild(d);
    });
    drawCtl();
  };
  function startDrag(e,i,d){
    e.preventDefault();e.stopPropagation();
    const was=st.sel===i;st.sel=i;
    const r=layer.getBoundingClientRect(),o=st.ov[i];
    const sx=e.clientX,sy=e.clientY,ox=o.x,oy=o.y;let moved=false;
    try{d.setPointerCapture(e.pointerId);}catch(er){}
    const mv=ev=>{
      if(Math.abs(ev.clientX-sx)+Math.abs(ev.clientY-sy)>4)moved=true;
      o.x=Math.min(97,Math.max(3,ox+(ev.clientX-sx)/r.width*100));
      o.y=Math.min(97,Math.max(3,oy+(ev.clientY-sy)/r.height*100));
      d.style.left=o.x+"%";d.style.top=o.y+"%";
    };
    const up=()=>{
      d.removeEventListener("pointermove",mv);d.removeEventListener("pointerup",up);d.removeEventListener("pointercancel",up);
      redraw();
      if(!moved&&was&&o.k==="t"){const ti=$("edTxtIn");if(ti){ti.focus();ti.select();}}
    };
    d.addEventListener("pointermove",mv);d.addEventListener("pointerup",up);d.addEventListener("pointercancel",up);
  }
  stage.addEventListener("pointerdown",e=>{if(e.target.closest(".ov")||e.target.closest("video"))return;if(st.sel!==-1){st.sel=-1;redraw();}});
  function drawCtl(){
    const c=$("edCtl"),o=st.ov[st.sel];
    if(!o){c.innerHTML="";c.style.display="none";return;}
    c.style.display="flex";
    if(o.k==="t"){
      c.innerHTML=`<input id="edTxtIn" class="sn-in" maxlength="100" placeholder="اكتب هنا"><div class="ed-row"><div class="ed-cols">${TCOL.map(x=>`<i data-c="${x}" class="${o.c===x?"on":""}" style="background:${x}"></i>`).join("")}</div><div class="ed-row" style="gap:6px"><button type="button" data-a="bg" class="${o.bg?"on":""}">خلفية</button><button type="button" data-a="minus">−</button><button type="button" data-a="plus">+</button><button type="button" data-a="del"><i class="fa-regular fa-trash-can"></i></button></div></div>`;
      const ti=$("edTxtIn");ti.value=o.t;
      ti.oninput=()=>{o.t=ti.value.slice(0,100);const el=layer.children[st.sel];if(el)el.textContent=o.t||" ";};
    }else{
      c.innerHTML=`<div class="ed-row" style="justify-content:center;gap:8px"><button type="button" data-a="minus">− تصغير</button><button type="button" data-a="plus">+ تكبير</button><button type="button" data-a="del"><i class="fa-regular fa-trash-can"></i> حذف</button></div>`;
    }
    c.onclick=e=>{
      const o2=st.ov[st.sel];if(!o2)return;
      const col=e.target.closest("i[data-c]");
      if(col){o2.c=col.dataset.c;redraw();return;}
      const b=e.target.closest("button[data-a]");if(!b)return;
      const a=b.dataset.a;
      if(a==="bg")o2.bg=o2.bg?0:1;
      else if(a==="minus")o2.f=Math.max(3,o2.f*0.88);
      else if(a==="plus")o2.f=Math.min(40,o2.f*1.14);
      else if(a==="del"){st.ov.splice(st.sel,1);st.sel=-1;}
      redraw();
    };
  }
  function addOv(o){
    if(st.ov.length>=20){$("snErr").textContent="وصلت للحد الأقصى من العناصر";return;}
    $("snErr").textContent="";
    st.ov.push(o);st.sel=st.ov.length-1;redraw();
    $("edDrawer").style.display="none";
  }
  function addText(){
    addOv({k:"t",t:"اكتب هنا",x:50,y:isText?45:50,f:isText?9:7,c:"#ffffff",bg:0});
    const ti=$("edTxtIn");if(ti){ti.focus();ti.select();}
  }
  $("edTxt").onclick=addText;
  const mmss=n=>{n=Math.max(0,Math.floor(n||0));return Math.floor(n/60)+":"+String(n%60).padStart(2,"0");};
  async function openTrim(sg){
    const dr=$("edDrawer");
    dr.dataset.mode="trim";
    dr.innerHTML=`<div class="un-hint">جاري تحميل الأغنية...</div>`;
    const u=await getSongUrl(sg.id);
    if(dr.dataset.mode!=="trim")return;
    if(!u){dr.innerHTML=`<div class="un-hint bad">تعذّر تحميل الأغنية</div>`;return;}
    const a=new Audio(u);a.preload="metadata";
    await new Promise(res=>{a.onloadedmetadata=res;a.onerror=res;setTimeout(res,6000);});
    if(dr.dataset.mode!=="trim")return;
    const dur=isFinite(a.duration)&&a.duration>0?Math.floor(a.duration):180;
    const lens=[10,15,20,30].filter(x=>x<=dur);if(!lens.length)lens.push(dur);
    let len=lens.includes(15)?15:lens[lens.length-1],start=0;
    st.song={id:sg.id,title:sg.title,artist:sg.artist,s:0,l:len};songBadge();
    const resetPrevBtn=()=>{const b=$("trPlay");if(b)b.innerHTML='<i class="fa-solid fa-play"></i> معاينة';};
    const draw=()=>{
      const maxS=Math.max(0,dur-len);start=Math.min(start,maxS);
      dr.style.maxHeight="none";
      dr.innerHTML=`<div class="trim"><div class="tr-h"><b>${esc(sg.title)}</b><small>${esc(sg.artist)}</small></div>
        <div class="un-hint ok" style="margin:0 0 8px">✓ الأغنية اتضافت للقصة — غيّر المقطع لو عايز</div>
        <div class="tr-row"><span>من <b id="trS">${mmss(start)}</b> إلى <b id="trE">${mmss(start+len)}</b> <small>(مدة الأغنية ${mmss(dur)})</small></span>
        <input type="range" id="trRange" min="0" max="${maxS}" step="1" value="${start}"></div>
        <div class="tr-len"><span>طول المقطع:</span>${lens.map(x=>`<button type="button" data-l="${x}" class="${x===len?"on":""}">${x} ث</button>`).join("")}</div>
        <div class="tr-btns"><button type="button" id="trPlay"><i class="fa-solid fa-play"></i> معاينة</button><button type="button" class="ok" id="trOk">تم ✓</button><button type="button" id="trBack">رجوع</button></div></div>`;
      const rng=$("trRange");
      rng.oninput=()=>{start=Number(rng.value)||0;st.song.s=start;songBadge();$("trS").textContent=mmss(start);$("trE").textContent=mmss(start+len);if(songPrev&&songPrev.a===a){try{a.currentTime=start;}catch(er){}}};
      dr.querySelectorAll("[data-l]").forEach(b=>b.onclick=()=>{stopSongPrev();len=Number(b.dataset.l);start=Math.min(start,Math.max(0,dur-len));st.song.s=start;st.song.l=len;songBadge();draw();});
      $("trPlay").onclick=()=>{
        if(songPrev&&songPrev.a===a){stopSongPrev();resetPrevBtn();return;}
        stopSongPrev();
        try{a.currentTime=start;}catch(er){}
        songPrev={id:sg.id,a,ic:null};
        a.ontimeupdate=()=>{if(a.currentTime>=start+len){stopSongPrev();resetPrevBtn();}};
        a.play().then(()=>{const b=$("trPlay");if(b)b.innerHTML='<i class="fa-solid fa-pause"></i> إيقاف';}).catch(()=>{stopSongPrev();resetPrevBtn();});
      };
      $("trOk").onclick=()=>{stopSongPrev();dr.style.display="none";dr.dataset.mode="";dr.style.maxHeight="";songBadge();};
      $("trBack").onclick=()=>{stopSongPrev();dr.dataset.mode="";dr.style.maxHeight="";$("edSong").onclick();};
    };
    draw();
  }
  const songBadge=()=>{
    const b=$("edSongBadge");
    if(!st.song){b.style.display="none";b.innerHTML="";return;}
    b.style.display="flex";
    b.innerHTML=`<span>🎵 ${esc(st.song.title)}${st.song.artist?" — "+esc(st.song.artist):""}${st.song.s!=null?` · ${mmss(st.song.s)}–${mmss(st.song.s+st.song.l)}`:""}</span><button type="button" aria-label="إزالة الأغنية">✕</button>`;
    b.querySelector("button").onclick=()=>{st.song=null;songBadge();};
  };
  $("edSong").onclick=async()=>{
    const dr=$("edDrawer");
    if(dr.dataset.mode==="song"&&dr.style.display!=="none"){dr.style.display="none";stopSongPrev();return;}
    dr.dataset.mode="song";dr.style.display="block";dr.style.maxHeight="";
    dr.innerHTML=`<div class="un-hint">جاري تحميل الأغاني...</div>`;
    const list=await loadSongs();
    if(dr.dataset.mode!=="song")return;
    if(!list.length){dr.innerHTML=`<div class="un-hint">مفيش أغاني متاحة حالياً</div>`;return;}
    dr.innerHTML=`<div class="songs">${list.map(sg=>`<div class="sg-row" data-id="${esc(sg.id)}"><button type="button" class="pv" data-pv="1"><i class="fa-solid fa-play"></i></button><div class="nm"><b>${esc(sg.title)}</b><small>${esc(sg.artist)}</small></div><button type="button" class="pick" data-pick="1">اختيار</button></div>`).join("")}</div>`;
    dr.onclick=async e=>{
      const row=e.target.closest(".sg-row");if(!row)return;
      const id=row.dataset.id,sg=list.find(x=>x.id===id);if(!sg)return;
      const pv=e.target.closest("[data-pv]");
      if(pv){
        const ic=pv.querySelector("i");
        if(songPrev&&songPrev.id===id){stopSongPrev();return;}
        stopSongPrev();
        ic.className="fa-solid fa-spinner fa-spin";
        const u=await getSongUrl(id);
        if(!u){ic.className="fa-solid fa-play";notify("تعذّر تشغيل الأغنية");return;}
        const a=new Audio(u);songPrev={id,a,ic};
        ic.className="fa-solid fa-pause";
        a.onended=stopSongPrev;
        a.play().catch(stopSongPrev);
        return;
      }
      if(e.target.closest("[data-pick]")){
        stopSongPrev();
        openTrim(sg);
      }
    };
  };
  $("edStk").onclick=()=>{
    const dr=$("edDrawer");
    if(dr.dataset.mode==="stk"&&dr.style.display!=="none"){dr.style.display="none";return;}
    dr.dataset.mode="stk";dr.style.display="block";
    const show=tab=>{
      dr.innerHTML=`<div class="tabs"><button type="button" data-t="e" class="${tab==="e"?"on":""}">ملصقات</button><button type="button" data-t="l" class="${tab==="l"?"on":""}">عبارات</button></div>`+
        (tab==="e"?`<div class="grid">${STK.map(e=>`<span data-e="${e}">${e}</span>`).join("")}</div>`:`<div class="lbls">${LBL.map((l,i)=>`<span data-l="${i}" style="background:${l.bg}">${l.e}</span>`).join("")}</div>`);
    };
    show("e");
    dr.onclick=e=>{
      const t=e.target.closest("[data-t]");if(t){show(t.dataset.t);return;}
      const em=e.target.closest("[data-e]");if(em){addOv({k:"s",e:em.dataset.e,x:50,y:50,f:16,bg:""});return;}
      const lb=e.target.closest("[data-l]");if(lb){const l=LBL[Number(lb.dataset.l)];addOv({k:"s",e:l.e,x:50,y:50,f:6.5,bg:l.bg});}
    };
  };
  if(isText){
    $("edBg").onclick=()=>{
      const dr=$("edDrawer");
      if(dr.dataset.mode==="bg"&&dr.style.display!=="none"){dr.style.display="none";return;}
      dr.dataset.mode="bg";dr.style.display="block";
      dr.innerHTML=`<div class="bgs">${STC.map(c=>`<i data-c="${c}" class="${st.bg===c?"on":""}" style="background:${c}"></i>`).join("")}</div>`;
      dr.onclick=e=>{const i=e.target.closest("i[data-c]");if(!i)return;st.bg=i.dataset.c;stage.style.background=st.bg;dr.querySelectorAll("i").forEach(x=>x.classList.toggle("on",x===i));};
    };
    addText();
  }
  $("snPub").onclick=async()=>{
    const ov=cleanOv(st.ov);
    if(isText&&!ov.length){$("snErr").textContent="اكتب نص أو ضيف ملصق الأول";return;}
    const b=$("snPub");b.disabled=true;b.textContent="جاري النشر...";
    try{
      await publishStory({type:opts.type,dataUrl:opts.url,caption:$("snCap")?$("snCap").value.trim().slice(0,140):"",dur:st.dur,bg:st.bg,ov,song:st.song});
      close();
    }catch(er){console.error(er);b.disabled=false;b.textContent="نشر القصة";$("snErr").textContent="تعذّر النشر — راجع قواعد Firebase أو قلّل الحجم";}
  };
}
async function publishStory(o){
  const meK=eKey(me);
  const id=push(ref(db,`stories/${meK}`)).key,ts=Date.now();
  if(o.dataUrl)await set(ref(db,`storyMedia/${meK}/${id}`),o.dataUrl);
  const rec={type:o.type,ts,exp:ts+86400000};
  if(o.type==="text"){rec.bg=o.bg;}
  else{rec.caption=o.caption||"";rec.dur=o.dur||0;}
  if(o.ov&&o.ov.length)rec.ov=o.ov;
  if(o.song&&SONG_ID.test(o.song.id||""))rec.song={id:String(o.song.id).slice(0,40),title:String(o.song.title||"").slice(0,60),artist:String(o.song.artist||"").slice(0,60),s:Math.max(0,Math.min(3600,Math.floor(Number(o.song.s)||0))),l:Math.max(5,Math.min(60,Math.floor(Number(o.song.l)||15)))};
  await set(ref(db,`stories/${meK}/${id}`),rec);
}

// ---------- مشاهدة القصص ----------
let sv=null;
function svSetEq(on){
  const e=sv&&sv.ov&&sv.ov.querySelector(".sv-eq");
  if(e)e.classList.toggle("paused",!on);
}
// عنصر صوت واحد بنفتحه بأول ضغطة من المستخدم، وبعدها يشتغل أي وقت من غير ما المتصفح يمنعه
const songAud=new Audio();
songAud.preload="auto";
const SILENT_WAV="data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";
function unlockSongAudio(){
  try{
    songAud._cur="";
    songAud.muted=true;
    songAud.src=SILENT_WAV;
    const pr=songAud.play();
    if(pr&&pr.then)pr.then(()=>{songAud.pause();songAud.muted=false;}).catch(()=>{songAud.muted=false;});
  }catch(e){}
}
document.addEventListener("pointerdown",()=>{if(!songAud._unlocked){songAud._unlocked=true;unlockSongAudio();}},{once:true,capture:true});
function showSoundHint(){
  if(!sv||sv.ov.querySelector(".sv-soundhint"))return;
  const h=document.createElement("div");h.className="sv-soundhint";h.innerHTML='<i class="fa-solid fa-volume-high"></i> اضغط في أي مكان عشان يشتغل الصوت';
  sv.ov.querySelector(".sv-box").appendChild(h);
}
function hideSoundHint(){sv&&sv.ov&&sv.ov.querySelector(".sv-soundhint")?.remove();}
function stopSong(){
  try{songAud.pause();}catch(e){}
  songAud.onplay=songAud.onpause=songAud.ontimeupdate=songAud.onended=songAud.onloadedmetadata=null;
  if(sv)sv.audio=null;
  svSetEq(false);
}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
// تجهيز الأغنية: نحمّلها ونروح لبداية المقطع لحد ما تبقى جاهزة للتشغيل
function prepSong(u,start){
  return new Promise(res=>{
    const a=songAud;
    let done=false;
    const fin=v=>{if(done)return;done=true;clearTimeout(t);a.removeEventListener("canplay",onOk);a.removeEventListener("error",onBad);res(v);};
    const onOk=()=>fin(true),onBad=()=>fin(false);
    const t=setTimeout(()=>fin(false),9000);
    a.addEventListener("canplay",onOk);a.addEventListener("error",onBad);
    a.muted=!!(sv&&sv.muteAll);
    a.onloadedmetadata=()=>{try{a.currentTime=start;}catch(e){}};
    if(a._cur!==u){a._cur=u;a.src=u;}
    else{try{a.currentTime=start;}catch(e){}if(a.readyState>=3)fin(true);}
  });
}
// تشغيل الأغنية الجاهزة (بيتنادى في نفس لحظة ظهور القصة)
function playPrepared(tok,start,len){
  const a=songAud;
  if(!sv||sv.tok!==tok)return;
  sv.audio=a;
  a.muted=!!sv.muteAll;
  const seek=()=>{try{a.currentTime=start;}catch(e){}};
  a.ontimeupdate=()=>{if(len&&a.currentTime>=start+len-0.05)seek();};
  a.onended=()=>{seek();if(sv&&sv.audio===a&&!sv.paused)a.play().catch(()=>{});};
  a.onplay=()=>{if(sv&&sv.audio===a){svSetEq(true);hideSoundHint();}};
  a.onpause=()=>{if(sv&&sv.audio===a)svSetEq(false);};
  if(Math.abs((a.currentTime||0)-start)>0.5)seek();
  if(!sv.paused&&!sv.sheetOpen){
    const pr=a.play();
    if(pr&&pr.catch)pr.catch(err=>{
      svSetEq(false);
      if(sv&&sv.tok===tok&&err&&err.name==="NotAllowedError"){sv.needGesture=true;showSoundHint();}
    });
  }
}
const songMs=it=>it.song?Math.max(5000,Math.min(60000,(Number(it.song.l)||15)*1000)):6000;
const curBar=()=>{const pr=$("svProg");return pr&&sv&&pr.children[sv.i]?pr.children[sv.i].firstChild:null;};
function svPause(){
  if(!sv||sv.paused||!sv.tStart)return;
  sv.paused=true;
  sv.tLeft=Math.max(0,sv.tDur-(Date.now()-sv.tStart));
  clearTimeout(sv.t);
  const bar=curBar();
  if(bar){const m=getComputedStyle(bar).transform;bar.style.transition="none";bar.style.transform=m;}
  const v=$("svBody").querySelector("video");if(v)v.pause();
  if(sv.audio)sv.audio.pause();
  svSetEq(false);
  if(!sv.ov.querySelector(".sv-pause")){
    const pi=document.createElement("div");pi.className="sv-pause";pi.innerHTML='<i class="fa-solid fa-pause"></i>';
    sv.ov.querySelector(".sv-box").appendChild(pi);
  }
}
function svResume(){
  if(!sv||!sv.paused)return;
  sv.paused=false;
  sv.ov.querySelector(".sv-pause")?.remove();
  const left=Math.max(0,sv.tLeft||0);
  const bar=curBar();
  if(bar){void bar.offsetWidth;bar.style.transition=`transform ${left}ms linear`;bar.style.transform="scaleX(1)";}
  sv.tStart=Date.now();sv.tDur=left;
  clearTimeout(sv.t);sv.t=setTimeout(next,left);
  const v=$("svBody").querySelector("video");if(v)v.play().catch(()=>{});
  if(sv.audio)sv.audio.play().catch(()=>{});
}
function svToggleZoom(){const b=$("svBody");if(b)b.classList.toggle("zoom");}
function svApplyMute(){
  if(!sv)return;
  const b=$("svMute");
  if(b)b.innerHTML='<i class="fa-solid '+(sv.muteAll?"fa-volume-xmark":"fa-volume-high")+'"></i>';
  if(sv.audio)sv.audio.muted=!!sv.muteAll;
  const v=$("svBody")&&$("svBody").querySelector("video");
  const it=sv.items[sv.i];
  if(v&&!(it&&it.song))v.muted=!!sv.muteAll;
}
function closeStoryViewer(){
  if(!sv)return;
  clearTimeout(sv.t);stopSong();
  if(sv.viewRef){off(sv.viewRef);}
  document.removeEventListener("keydown",sv.key);
  sv.ov.remove();sv=null;
}
function svToast(t){
  if(!sv)return;
  sv.ov.querySelector(".sv-toast")?.remove();
  const d=document.createElement("div");d.className="sv-toast";d.textContent=t;
  sv.ov.querySelector(".sv-box").appendChild(d);setTimeout(()=>d.remove(),1800);
}
function openStoryViewer(k,start,opts){
  opts=opts||{};
  unlockSongAudio();
  const meK=eKey(me),own=k===meK&&!opts.items;
  const items=(opts.items||storiesBy[k]||[]).slice();
  if(!items.length)return;
  closeStoryViewer();
  const c=Object.assign({},ownerDir[k]||{},convs[k]||{},followingMap[k]||{});
  const info=opts.info||(own?{name:myName()||me,un:(myProf&&myProf.username)||"",email:me}:{name:c.name||"",un:c.un||"",email:c.email||""});
  const ov=document.createElement("div");ov.id="chStoryView";
  ov.innerHTML=`<div class="sv-box">
    <div class="sv-prog" id="svProg"></div>
    <div class="sv-head"><div id="svAva"></div><div class="sv-who"><b></b><small id="svTime"></small><div class="sv-song" id="svSong"></div></div><button class="sv-mute" id="svMute" type="button" aria-label="كتم الصوت" style="display:none"><i class="fa-solid fa-volume-high"></i></button><button class="sv-x" type="button" aria-label="إغلاق">✕</button></div>
    <div class="sv-body" id="svBody"></div><div class="sv-ovl" id="svOvl"></div><div class="sv-cap" id="svCap" style="display:none"></div>
    <button class="sv-nav prev" type="button" aria-label="السابق"><i class="fa-solid fa-chevron-right"></i></button>
    <button class="sv-nav next" type="button" aria-label="التالي"><i class="fa-solid fa-chevron-left"></i></button>
    <div class="sv-foot" id="svFoot"></div></div>`;
  document.body.appendChild(ov);
  sv={ov,k,own,items,i:0,t:null,tok:0,viewRef:null,sent:new Set(),info,sheetOpen:false,paused:false,tStart:0,tDur:0,tLeft:0,muteAll:false,needGesture:false};
  sv.key=e=>{
    if(e.target&&e.target.tagName==="INPUT")return;
    if(e.key==="Escape")closeStoryViewer();else if(e.key==="ArrowLeft")next();else if(e.key==="ArrowRight")prev();else if(e.key===" "){e.preventDefault();sv.paused?svResume():svPause();}
  };
  document.addEventListener("keydown",sv.key);
  ov.querySelector(".sv-who b").textContent=info.name+(info.un?"  @"+info.un:"");
  warmVf([k]).then(()=>{const bb=ov.querySelector(".sv-who b");if(bb&&vfCache[k]&&vfCache[k].v)bb.insertAdjacentHTML("beforeend",' <i class="fa-solid fa-circle-check vf"></i>');});
  ov.querySelector("#svAva").innerHTML=avaHtml(photoCache[k],info.name);
  if(info.email)photoOf(info.email).then(ph=>{const a=ov.querySelector("#svAva");if(a&&ph)a.innerHTML=avaHtml(ph,info.name);});
  const box=ov.querySelector(".sv-box");
  const skip=t=>t.closest("button,.sv-sheet,.sv-foot,.sv-head,input");
  let px=0,py=0,pdown=false,swiped=false,clickT=null;
  box.addEventListener("pointerdown",e=>{if(skip(e.target))return;px=e.clientX;py=e.clientY;pdown=true;});
  box.addEventListener("pointerup",e=>{
    if(!pdown)return;pdown=false;
    const dx=e.clientX-px,dy=e.clientY-py;
    if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)*1.5){      // سحب = القصة اللي بعدها / اللي قبلها
      swiped=true;setTimeout(()=>{swiped=false;},120);
      dx<0?next():prev();
    }
  });
  box.addEventListener("pointercancel",()=>{pdown=false;});
  box.addEventListener("click",e=>{
    if(swiped||skip(e.target))return;
    if(sv&&sv.needGesture){sv.needGesture=false;hideSoundHint();if(sv.audio&&!sv.paused)sv.audio.play().catch(()=>{});return;}
    const r=box.getBoundingClientRect(),x=(e.clientX-r.left)/r.width;
    if(x>0.78){prev();return;}
    if(x<0.22){next();return;}
    // الوسط: ضغطة = إيقاف/تشغيل — ضغطتين = تكبير/تصغير الصورة
    if(clickT){clearTimeout(clickT);clickT=null;svToggleZoom();return;}
    clickT=setTimeout(()=>{clickT=null;if(sv)sv.paused?svResume():svPause();},260);
  });
  ov.querySelector("#svMute").onclick=e=>{e.stopPropagation();if(!sv)return;sv.muteAll=!sv.muteAll;svApplyMute();};
  ov.querySelector(".sv-x").onclick=closeStoryViewer;
  ov.querySelector(".sv-nav.prev").onclick=e=>{e.stopPropagation();prev();};
  ov.querySelector(".sv-nav.next").onclick=e=>{e.stopPropagation();next();};
  ov.addEventListener("click",e=>{if(e.target===ov)closeStoryViewer();});
  show(Math.min(Math.max(start||0,0),items.length-1));
}
function next(){if(!sv)return;if(sv.i>=sv.items.length-1)closeStoryViewer();else show(sv.i+1);}
function prev(){if(!sv)return;show(Math.max(0,sv.i-1));}
const SV_RX=["❤️","😂","😮","😢","👏","🔥"];
async function show(i){
  if(!sv)return;
  const {ov,k,own,items,info}=sv;
  clearTimeout(sv.t);stopSong();
  if(sv.viewRef){off(sv.viewRef);sv.viewRef=null;}
  ov.querySelector(".sv-sheet")?.remove();sv.sheetOpen=false;
  sv.i=i;const it=items[i];if(!it){closeStoryViewer();return;}
  const tok=++sv.tok;
  sv.paused=false;sv.tStart=0;sv.ov.querySelector(".sv-pause")?.remove();
  const meK=eKey(me);
  $("svProg").innerHTML=items.map((_,j)=>`<i><b style="transform:scaleX(${j<i?1:0})"></b></i>`).join("");
  $("svTime").textContent=agoTxt(it.ts);
  const sgEl=$("svSong");sgEl.innerHTML="";
  if(it.song&&it.song.title){
    const eq=document.createElement("span");eq.className="sv-eq paused";eq.innerHTML="<i></i><i></i><i></i><i></i>";
    const tx=document.createElement("span");tx.textContent="🎵 "+String(it.song.title).slice(0,60)+(it.song.artist?" — "+String(it.song.artist).slice(0,60):"");
    sgEl.append(eq,tx);
  }
  const mb=$("svMute");if(mb)mb.style.display=(it.song||it.type==="video")?"":"none";
  svApplyMute();
  const body=$("svBody"),cap=$("svCap"),ovl=$("svOvl");
  body.classList.remove("zoom");
  body.innerHTML=`<i class="fa-solid fa-spinner fa-spin" style="font-size:28px"></i>`;
  cap.style.display="none";ovl.innerHTML="";
  const foot=$("svFoot");
  if(own){
    foot.innerHTML=`<div class="sv-row"><button type="button" id="svViews"><i class="fa-regular fa-eye"></i> <span id="svVc">0</span></button><button type="button" id="svDel"><i class="fa-regular fa-trash-can"></i> حذف</button></div>`;
    sv.viewRef=ref(db,`storyViews/${meK}/${it.id}`);
    onValue(sv.viewRef,sn=>{sv.views=sn.val()||{};const e2=$("svVc");if(e2)e2.textContent=Object.keys(sv.views).length;});
    $("svViews").onclick=()=>openViewers();
    $("svDel").onclick=()=>delStory();
  }else{
    const canReact=!!info.email;
    foot.innerHTML=(canReact?`<div class="sv-react">${SV_RX.map(e=>`<span data-e="${e}">${e}</span>`).join("")}</div>
      <div class="sv-reply"><input id="svRepIn" maxlength="200" placeholder="رد على القصة..." autocomplete="off"><button type="button" id="svRepGo" title="إرسال"><i class="fa-solid fa-paper-plane" style="transform:scaleX(-1);color: #fff;"></i></button></div>`
      :"");
    if(canReact){
      foot.querySelector(".sv-react").onclick=async e=>{
        const sp=e.target.closest("span[data-e]");if(!sp)return;
        const em=sp.dataset.e;
        const fl=document.createElement("div");fl.className="sv-fl";fl.textContent=em;
        ov.querySelector(".sv-box").appendChild(fl);setTimeout(()=>fl.remove(),1300);
        try{
          await update(ref(db,`storyViews/${k}/${it.id}/${meK}`),{name:myName()||me,un:(myProf&&myProf.username)||"",ts:Date.now(),r:em});
          await sendStoryMsg(info,k,info,it,{rx:em},em+" تفاعل مع قصة");
        }catch(er){console.error(er);svToast(er.message==="notconnected"?"لازم تتابعه الأول":"تعذّر التفاعل");}
      };
      const ri=$("svRepIn");
      const sendReply=async()=>{
        const t=ri.value.trim().slice(0,200);if(!t)return;
        try{
          await sendStoryMsg(info,k,info,it,{rep:t},"↩️ "+t.slice(0,50));
          ri.value="";svToast("تم الإرسال ✓");
          setTimeout(()=>{if(sv&&sv.tok===tok)show(sv.i);},500);
        }catch(er){console.error(er);svToast(er.message==="notconnected"?"لازم تتابعه الأول":"تعذّر الإرسال");}
      };
      $("svRepGo").onclick=sendReply;
      ri.onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();sendReply();}};
      ri.onfocus=()=>{clearTimeout(sv.t);if(sv.audio)sv.audio.pause();const v=$("svBody").querySelector("video");if(v)v.pause();};
      ri.onblur=()=>{
        if(ri.value.trim())return;
        setTimeout(()=>{if(sv&&sv.tok===tok&&!sv.sheetOpen&&document.activeElement!==ri)show(sv.i);},700);
      };
    }
    if(!sv.sent.has(it.id)){
      sv.sent.add(it.id);
      update(ref(db,`storyViews/${k}/${it.id}/${meK}`),{name:myName()||me,un:(myProf&&myProf.username)||"",ts:Date.now()}).catch(()=>{});
    }
  }
  addSeen(it.id);renderStories();
  const startTimer=d=>{
    if(!sv||sv.tok!==tok)return;
    clearTimeout(sv.t);
    const bar=$("svProg").children[i]&&$("svProg").children[i].firstChild;
    if(bar){bar.style.transition="none";bar.style.transform="scaleX(0)";void bar.offsetWidth;bar.style.transition=`transform ${d}ms linear`;bar.style.transform="scaleX(1)";}
    sv.tStart=Date.now();sv.tDur=d;
    sv.t=setTimeout(next,d);
  };
  const ovs=cleanOv(it.ov);
  const hasSong=!!(it.song&&SONG_ID.test(it.song.id||""));
  const sStart=hasSong?Math.max(0,Number(it.song.s)||0):0,sLen=hasSong?Math.max(0,Number(it.song.l)||0):0;
  // 1) نحمّل الصورة/الفيديو والأغنية مع بعض (والشاشة فيها دايرة تحميل)
  const [u,su]=await Promise.all([
    it.type==="text"?Promise.resolve("text"):getStoryMedia(k,it.id),
    hasSong?getSongUrl(it.song.id):Promise.resolve("")
  ]);
  if(!sv||sv.tok!==tok)return;
  // 2) نجهّز العناصر لحد ما تبقى جاهزة للعرض فعلاً
  let el=null;
  if(it.type==="image"&&u){
    el=new Image();el.src=u;
    try{await Promise.race([el.decode(),sleep(8000)]);}catch(e){}
  }else if(it.type==="video"&&u){
    el=document.createElement("video");
    el.playsInline=true;el.preload="auto";el.muted=!!it.song||!!sv.muteAll;el.src=u;
    await new Promise(res=>{el.onloadeddata=res;el.onerror=res;setTimeout(res,8000);});
  }
  let songOk=false;
  if(su)songOk=await prepSong(su,sStart);
  if(!sv||sv.tok!==tok)return;
  // 3) كله جاهز: نعرض القصة ونشغّل الأغنية والشريط في نفس اللحظة
  if(it.type==="text"){
    body.innerHTML=`<div class="sv-text" style="background:${okColor(it.bg)}"></div>`;
    if(!ovs.length&&it.text)body.firstChild.textContent=String(it.text).slice(0,200);   // قصص نصية قديمة
    paintOv(ovl,ovs);
    if(su)playPrepared(tok,sStart,sLen);
    startTimer(songMs(it));
  }else{
    if(!u||!el){
      body.innerHTML=`<div style="opacity:.8"><i class="fa-regular fa-circle-xmark" style="font-size:34px"></i></div>`;
      startTimer(3000);return;
    }
    body.innerHTML="";
    paintOv(ovl,ovs);
    body.appendChild(el);
    if(it.caption){cap.textContent=it.caption;cap.style.display="block";}
    if(su)playPrepared(tok,sStart,sLen);
    if(it.type==="image"){startTimer(songMs(it));}
    else{
      const d=isFinite(el.duration)&&el.duration>0?Math.min(120000,el.duration*1000):15000;
      el.onended=()=>{if(sv&&sv.tok===tok)next();};
      el.play().catch(()=>{});
      startTimer(d);
    }
  }
  // 4) نحمّل القصة اللي بعدها من دلوقتي عشان تفتح فوراً
  const nx=items[i+1];
  if(nx){
    if(nx.type!=="text")getStoryMedia(k,nx.id);
    if(nx.song&&SONG_ID.test(nx.song.id||""))getSongUrl(nx.song.id);
  }
}

function pauseSv(){
  if(!sv)return;
  clearTimeout(sv.t);sv.sheetOpen=true;
  if(sv.audio)sv.audio.pause();
  const v=$("svBody").querySelector("video");if(v)v.pause();
}
function openViewers(){
  if(!sv)return;
  pauseSv();
  const sh=document.createElement("div");sh.className="sv-sheet";
  const arr=Object.values(sv.views||{}).sort((a,b)=>(b.ts||0)-(a.ts||0));
  sh.innerHTML=`<h4><span>المشاهدات (${arr.length})</span><button type="button" aria-label="إغلاق">✕</button></h4>`+
    (arr.length?arr.map(v=>`<div class="sv-vi"><b>${esc(v.name||"—")}</b>${v.un?`<em>@${esc(v.un)}</em>`:""}${v.r?`<span style="font-size:18px">${esc(String(v.r).slice(0,8))}</span>`:""}<small>${agoTxt(v.ts||0)}</small></div>`).join(""):`<div class="st-none" style="padding:14px 0">لسه محدش شاف القصة دي</div>`);
  sv.ov.querySelector(".sv-box").appendChild(sh);
  sh.querySelector("h4 button").onclick=()=>{const idx=sv.i;sh.remove();show(idx);};
}
async function delStory(){
  if(!sv||!sv.own)return;
  if(!(await uiConfirm("هل تريد حذف القصة؟ هتتمسح عند الكل.")))return;
  const meK=eKey(me),it=sv.items[sv.i];if(!it)return;
  try{
    await remove(ref(db,`stories/${meK}/${it.id}`));
    remove(ref(db,`storyMedia/${meK}/${it.id}`)).catch(()=>{});
    remove(ref(db,`storyViews/${meK}/${it.id}`)).catch(()=>{});
    stMedia.delete(meK+"/"+it.id);
  }catch(e){notify("تعذّر الحذف");return;}
  sv.items.splice(sv.i,1);
  if(!sv.items.length)closeStoryViewer();
  else show(Math.min(sv.i,sv.items.length-1));
}
// فتح قصة جاية في رسالة (مشاركة / رد / تفاعل)
async function openSharedStory(sk,sid,sn,su){
  const meK=eKey(me);
  if(sk===meK){
    const its=storiesBy[meK]||[];const idx=its.findIndex(x=>x.id===sid);
    if(idx>=0){openStoryViewer(meK,idx);return;}
  }
  try{
    const [s1,b1]=await Promise.all([get(ref(db,`stories/${sk}/${sid}`)),get(ref(db,`chatBlocks/${sk}/${meK}`))]);
    const v=s1.val();
    if(!v||(Number(v.ts)||0)+864e5<=Date.now()||(b1.val()&&!isOwner(me))){notify("القصة دي انتهت أو اتحذفت");return;}
    let email="";
    if(su){try{const x=await get(ref(db,`chatUsernames/${String(su).toLowerCase()}`));email=x.val()?String(x.val()):"";}catch(e){}}
    openStoryViewer(sk,0,{items:[{id:sid,...v}],info:{name:sn||su||"قصة",un:su||"",email}});
  }catch(e){console.error(e);notify("تعذّر فتح القصة");}
}

// ---------- فتح محادثة ----------
let clrRef=null,blkRef=null,rxRef=null,fRef1=null,fRef2=null,oRef=null,delRef=null;
function closeActive(){
  if(msgRef){off(msgRef);msgRef=null;}
  if(typRef){off(typRef);typRef=null;}
  if(clrRef){off(clrRef);clrRef=null;}
  if(blkRef){off(blkRef);blkRef=null;}
  if(rxRef){off(rxRef);rxRef=null;}
  if(fRef1){off(fRef1);fRef1=null;}
  if(fRef2){off(fRef2);fRef2=null;}
  if(oRef){off(oRef);oRef=null;}
  if(delRef){off(delRef);delRef=null;}
}
const EMOJIS=["😀","😂","😍","😊","👍","🙏","❤️","🔥","😎","🤝","😅","👌"];

export async function openChat(email,name){
  email=String(email||"").toLowerCase();
  if(!me||!email||email===me)return;
  if(!$("tab-chat"))mountTab();
  window.switchTab("chat",$("chatNavBtn"));
  if(!(await ensureUsername()))return;
  window.__chatCancelRec?.();
  closeActive();
  active={email,name:name||email};
  const cid=cidOf(me,email),peerK=eKey(email),meK=eKey(me);
  $("chWrap").classList.add("open");
  const peerPhoto=await photoOf(email);
  const peerProf=await loadProfile(peerK);
  await warmVf([peerK]);
  let clearedAt=0,iBlocked=false,rxMap={},drewOnce=false,connected=false,f1=null,f2=null,openFlag=false,delMap={},editing=null,editTimer=null,selId=null,selOff=null;
  const main=$("chMain");
  main.innerHTML=`
    <div class="ch-head">
      <button class="ch-back" id="chBack"><i class="fa-solid fa-arrow-right"></i></button>
      <h3><span class="ch-avbtn" data-chat-email="${esc(email)}" data-chat-name="${esc(active.name)}" title="عرض البطاقة">${avaHtml(peerPhoto,active.name)}</span> <span class="ch-avbtn" data-chat-email="${esc(email)}" data-chat-name="${esc(active.name)}"><span class="ch-nm">${esc(active.name)}${vb(peerK)}</span>${peerProf.username?`<em>@${esc(peerProf.username)}</em>`:""}</span></h3>
      <div class="ch-tabs"><button class="on" data-v="m">الرسائل</button><button data-v="c">اتصال</button></div>
      <div class="ch-selbar" id="chSelBar"></div>
      <button class="ch-kebab" id="chKebab" type="button" title="خيارات"><i class="fa-solid fa-ellipsis-vertical"></i></button>
      <div class="ch-menu" id="chMenu">
        <button type="button" data-a="clear"><i class="fa-regular fa-trash-can"></i> مسح محتوى الدردشة</button>
        <button type="button" data-a="block" class="dg"><i class="fa-solid fa-ban"></i> <span id="chBlkTxt">حظر</span></button>
        <button type="button" data-a="settings"><i class="fa-solid fa-gear"></i> الإعدادات</button>
      </div>
    </div>
    <div class="ch-msgs" id="chMsgs"></div>
    <div class="ch-typing" id="chTyping"></div>
    <div class="ch-edit" id="chEditBar"><span>✏️ تعديل الرسالة — متبقي <b id="chEditT"></b></span><button type="button" id="chEditX">إلغاء</button></div>
    <div class="ch-fol" id="chFol"></div>
    <div class="ch-blk" id="chBlk"><span>حظرت المستخدم ده — مش هتقدر تبعتله ولا تستقبل منه رسايل.</span><button type="button" id="chUnblk">إلغاء الحظر</button></div>
    <div class="ch-in" id="chIn">
      <div class="ch-emo-pop" id="chEmoPop">${EMOJIS.map(e=>`<span>${e}</span>`).join("")}</div>
      <button class="ch-emo" id="chEmoBtn" type="button"><i class="fa-regular fa-face-smile"></i></button>
      <button class="ch-emo" id="chAttach" type="button" title="صورة أو فيديو"><i class="fa-solid fa-paperclip"></i></button>
      <input type="file" id="chFile" accept="image/*,video/*" hidden>
      <input id="chInput" placeholder="اكتب رسالتك..." autocomplete="off">
      <div class="ch-rec" id="chRec"><button class="stop" id="chRecStop" type="button" title="إيقاف وإرسال"><i class="fa-solid fa-stop"></i></button><b class="tm" id="chRecT">0:00</b><div class="wv" id="chRecWv"></div><button class="cx" id="chRecX" type="button" title="إلغاء"><i class="fa-regular fa-trash-can"></i></button></div>
      <button class="ch-emo" id="chMic" type="button" title="رسالة صوتية"><i class="fa-solid fa-microphone"></i></button>
      <button class="ch-send" id="chSend" type="button"><i class="fa-solid fa-paper-plane" style="transform:scaleX(-1)"></i></button>
    </div>`;
  renderList();

  $("chBack").onclick=()=>$("chWrap").classList.remove("open");
  const msgs=$("chMsgs"),input=$("chInput");
  main.querySelectorAll(".ch-tabs button").forEach(b=>b.onclick=()=>{
    main.querySelectorAll(".ch-tabs button").forEach(x=>x.classList.toggle("on",x===b));
    const part=b.dataset.v==="c";
    $("chIn").style.display=part?"none":"flex";$("chTyping").style.display=part?"none":"flex";
    if(part)showContact();
    else drawMsgs(lastSnap);
  });

  let lastSnap={};
  const storyCard=(m,mine)=>{
    const who=m.su?"@"+m.su:(m.sn||"");
    const tt=["image","video","text"].includes(m.tt)?m.tt:"image";
    const label=m.rx?(mine?`تفاعلت بـ ${m.rx} مع قصة ${who}`:`تفاعل بـ ${m.rx} مع قصتك`):(m.rep?(mine?`رديت على قصة ${who}`:"رد على قصتك"):(mine?`شاركت قصة ${who}`:`شارك معاك قصة ${who}`));
    const icon=tt==="video"?`<i class="fa-solid fa-circle-play"></i>`:(tt==="text"?"Aa":`<i class="fa-regular fa-image"></i>`);
    return `<div class="ch-story" data-sk="${esc(m.sk||"")}" data-sid="${esc(m.sid||"")}" data-sn="${esc(m.sn||"")}" data-su="${esc(m.su||"")}">
      <div class="ch-st-th" data-sk="${esc(m.sk||"")}" data-sid="${esc(m.sid||"")}" data-tt="${tt}" style="${tt==="text"?`background:${okColor(m.tb)}`:""}">${icon}${m.rx?`<em>${esc(String(m.rx).slice(0,8))}</em>`:""}</div>
      <div class="ch-st-tx"><b>${esc(label)}</b><small>اضغط لعرض القصة</small></div></div>${m.rep?`<div class="ch-st-rep">${linkify(m.rep)}</div>`:""}`;
  };
  const sameOrigin=u=>{try{return new URL(u).origin===location.origin;}catch(e){return false;}};
  const mentionCard=(m,mine)=>{
    const ok=sameOrigin(m.url);
    const img=/^https?:\/\//.test(m.pi||"")&&String(m.pi).length<700?`<img src="${esc(m.pi)}" alt="">`:`<i class="fa-solid fa-couch"></i>`;
    const label=mine?`ذكرت ${esc(active.name)} في تعليق`:`ذكرك ${esc(active.name)} في تعليق`;
    return `<div class="ch-mention"${ok?` data-url="${esc(m.url)}"`:""}><div class="ch-mn-img">${img}</div><div class="ch-mn-tx"><b>📌 ${label}</b><span class="pt">${esc(m.pt||"منتج")}</span>${m.cm?`<small>“${esc(m.cm)}”</small>`:""}<em>${ok?"اضغط لعرض المنتج ←":"رابط غير متاح"}</em></div></div>`;
  };
  const rxHtml=id=>{
    const r=rxMap[id];if(!r)return"";
    const agg={};
    Object.entries(r).forEach(([u,e])=>{const x=agg[e]||(agg[e]={n:0,me:false});x.n++;if(u===meK)x.me=true;});
    return `<div class="ch-rx">${Object.entries(agg).map(([e,o])=>`<button type="button" class="${o.me?"mine":""}" data-rx="${esc(String(e).slice(0,8))}" data-mid="${esc(id)}">${esc(String(e).slice(0,8))}${o.n>1?" "+o.n:""}</button>`).join("")}</div>`;
  };
  function drawMsgs(v){
    if(selId!==null)exitSel();
    lastSnap=v||{};
    const arr=Object.entries(lastSnap).map(([id,m])=>({id,...m})).filter(m=>(m.ts||0)>clearedAt&&!delMap[m.id]).sort((a,b)=>a.ts-b.ts);
    if(!arr.length){msgs.innerHTML=`<div class="ch-empty"><i class="fa-regular fa-comments"></i>ابدأ المحادثة مع ${esc(active.name)} 👋</div>`;return;}
    const prevTop=msgs.scrollTop,near=msgs.scrollHeight-msgs.scrollTop-msgs.clientHeight<140;
    msgs.innerHTML=arr.map(m=>{const mine=m.from===me;
      const isMedia=MEDIA_TYPES.includes(m.type)&&m.mid;
      const isStory=m.type==="story"&&m.sid;
      const isMention=m.type==="mention"&&m.url;
      const body=m.del?`<span class="ch-delmsg">🚫 ${mine?"حذفت هذه الرسالة":"تم حذف هذه الرسالة"}</span>`:isMedia?`<div class="ch-media" data-mid="${esc(m.mid)}" data-type="${m.type}" data-wave="${esc(m.wave||"")}" data-dur="${Number(m.dur)||0}"></div>`:(isMention?mentionCard(m,mine):isStory?storyCard(m,mine):(((m.adm||m.bc)?`<div class="ch-bcl">${m.adm?"📢 رسالة من الإدارة":"📢 رسالة للجميع"}</div>`:"")+linkify(m.text)));
      return `<div class="ch-m ${mine?"me":"them"}" data-id="${esc(m.id)}"><small>${mine?"أنت":esc(active.name)}، ${fTime(m.ts)}${m.edited?" · معدّلة":""}</small><div class="b${(isMedia||isStory||isMention)?" media":""}${m.del?" del":""}">${body}</div>${m.del?"":rxHtml(m.id)}</div>`;}).join("");
    if(near||!drewOnce)msgs.scrollTop=msgs.scrollHeight;else msgs.scrollTop=prevTop;
    drewOnce=true;
    hydrateMedia();
    msgs.querySelectorAll('.ch-st-th[data-tt="image"]').forEach(async el=>{
      const u=await getStoryMedia(el.dataset.sk,el.dataset.sid);
      if(u&&el.isConnected&&/^data:image\//.test(u)){el.style.backgroundImage="url("+JSON.stringify(u)+")";el.querySelector("i")?.remove();}
    });
  }
  const mediaCache=new Map();
  async function getMedia(mid){
    if(mediaCache.has(mid))return mediaCache.get(mid);
    try{
      const sn=await get(ref(db,`chatMedia/${cid}/${mid}`));
      const u=sn.val();
      const ok=typeof u==="string"&&DATA_OK.test(u)?u:"";
      if(ok)mediaCache.set(mid,ok);
      return ok;
    }catch(e){console.error("chat media:",e);return"";}
  }
  let curAudio=null;
  const fmtDur=n=>{n=Math.max(0,Math.round(n||0));return Math.floor(n/60)+":"+String(n%60).padStart(2,"0");};
  function buildVoice(el,mid,wave,dur){
    const w=/^[0-9]{10,64}$/.test(wave||"")?wave:"5".repeat(40);
    el.innerHTML=`<div class="ch-voice"><button class="vp" type="button"><i class="fa-solid fa-play"></i></button><div class="vw">${w.split("").map(d=>`<i style="height:${15+Number(d)*8}%"></i>`).join("")}</div><span class="vt">${fmtDur(dur)}</span></div>`;
    const btn=el.querySelector(".vp"),ic=btn.querySelector("i"),bars=[...el.querySelectorAll(".vw i")],vt=el.querySelector(".vt");
    let a=null;
    const setIc=pl=>{ic.className=pl?"fa-solid fa-pause":"fa-solid fa-play";};
    btn.onclick=async()=>{
      if(!a){
        ic.className="fa-solid fa-spinner fa-spin";
        const u=await getMedia(mid);
        if(!u){ic.className="fa-regular fa-circle-xmark";return;}
        a=new Audio(u);
        a.onplay=()=>setIc(true);
        a.onpause=()=>setIc(false);
        a.onended=()=>{setIc(false);bars.forEach(b=>b.classList.remove("on"));vt.textContent=fmtDur(dur);};
        a.ontimeupdate=()=>{const d=(a.duration&&isFinite(a.duration))?a.duration:dur;const f=d?a.currentTime/d:0;bars.forEach((b,i)=>b.classList.toggle("on",i/bars.length<f));vt.textContent=fmtDur(a.currentTime);};
      }
      if(a.paused){if(curAudio&&curAudio!==a)curAudio.pause();curAudio=a;a.play().catch(()=>setIc(false));}else a.pause();
    };
  }
  function hydrateMedia(){
    msgs.querySelectorAll(".ch-media").forEach(async el=>{
      const mid=el.dataset.mid,type=el.dataset.type;
      if(type==="audio"){buildVoice(el,mid,el.dataset.wave,Number(el.dataset.dur)||0);return;}
      if(type==="video"&&!mediaCache.has(mid)){
        el.innerHTML=`<button class="ch-vid" type="button"><i class="fa-solid fa-circle-play"></i><span>تشغيل الفيديو</span></button>`;
        el.querySelector("button").onclick=async()=>{
          el.querySelector("span").textContent="جاري التحميل...";
          const u=await getMedia(mid);
          if(!u){el.querySelector("span").textContent="تعذّر تحميل الفيديو";return;}
          const v=document.createElement("video");v.controls=true;v.autoplay=true;v.playsInline=true;v.src=u;
          el.innerHTML="";el.appendChild(v);
        };
        return;
      }
      if(!el.innerHTML)el.innerHTML=`<div class="ph"><i class="fa-solid fa-spinner fa-spin"></i></div>`;
      const u=await getMedia(mid);
      if(!el.isConnected)return;
      if(!u){el.innerHTML=`<div class="ph"><i class="fa-regular fa-circle-xmark"></i></div>`;return;}
      el.innerHTML="";
      if(type==="image"){const im=document.createElement("img");im.src=u;im.onclick=()=>viewImg(u);im.onload=()=>{msgs.scrollTop=msgs.scrollHeight;};el.appendChild(im);}
      else if(type==="video"){const v=document.createElement("video");v.controls=true;v.playsInline=true;v.src=u;el.appendChild(v);}
      else{const a=document.createElement("audio");a.controls=true;a.src=u;el.appendChild(a);}
    });
  }

  msgRef=ref(db,`chats/${cid}/messages`);
  onValue(msgRef,s=>{
    if(!active||active.email!==email)return;
    if($("chMsgs")&&main.querySelector(".ch-tabs button.on")?.dataset.v==="m")drawMsgs(s.val());else lastSnap=s.val()||{};
    update(ref(db,`userChats/${meK}/${peerK}`),{unread:0}).catch(()=>{});   // اتقرت
  });

  typRef=ref(db,`chats/${cid}/typing/${peerK}`);
  onValue(typRef,s=>{
    const t=s.val(),el=$("chTyping");if(!el)return;
    el.innerHTML=(t&&Date.now()-t<5000)?`<i class="fa-solid fa-ellipsis"></i> ${esc(active.name)} بيكتب...`:"";
    if(t)setTimeout(()=>{const e=$("chTyping");if(e&&Date.now()-t>=5000)e.innerHTML="";},5200);
  });

  clrRef=ref(db,`chats/${cid}/cleared/${meK}`);
  onValue(clrRef,sn=>{clearedAt=Number(sn.val())||0;if(main.querySelector(".ch-tabs button.on")?.dataset.v==="m")drawMsgs(lastSnap);});
  const applyBlockUI=()=>{
    const lock=iBlocked||!connected;
    $("chBlk")?.classList.toggle("show",iBlocked);$("chIn")?.classList.toggle("dis",lock);
    if($("chInput"))$("chInput").disabled=lock;
    if($("chBlkTxt"))$("chBlkTxt").textContent=iBlocked?"إلغاء الحظر":"حظر";
  };
  const renderFol=()=>{
    const bar=$("chFol");if(!bar)return;
    if(connected){bar.className="ch-fol";bar.innerHTML="";return;}
    const nm=esc(active.name);
    let html;
    if(f2&&f2.st==="p")html=`<span>${nm} طلب يتابعك — اقبله عشان تقدروا تتراسلوا</span><div class="bt"><button type="button" data-a="acc">قبول</button><button type="button" class="g" data-a="rej">رفض</button></div>`;
    else if(f1&&f1.st==="p")html=`<span>طلب المتابعة اتبعت — مستني ${nm} يقبله</span><div class="bt"><button type="button" class="g" data-a="cancel">إلغاء الطلب</button></div>`;
    else html=`<span>تابع ${nm} عشان تقدر تبعتله رسالة</span><div class="bt"><button type="button" data-a="follow">متابعة</button></div>`;
    bar.className="ch-fol show";bar.innerHTML=html;
  };
  const recalc=()=>{
    connected=isOwner(me)||!!(f1&&f1.st==="a")||!!(f2&&f2.st==="a")||openFlag;
    applyBlockUI();renderFol();
  };
  $("chFol").onclick=async e=>{
    const b=e.target.closest("button[data-a]");if(!b)return;
    const a=b.dataset.a;
    if(a==="rej"&&!(await uiConfirm("هل تريد رفض طلب المتابعة؟")))return;
    b.disabled=true;
    try{
      if(a==="follow")await followReq(email,active.name,peerProf.username||"");
      else if(a==="cancel")await unfollowUser(email);
      else if(a==="acc")await acceptFollow(email);
      else if(a==="rej")await rejectFollow(email);
    }catch(er){console.error(er);b.disabled=false;notify("تعذّر تنفيذ العملية");}
  };
  fRef1=ref(db,`follows/${meK}/${peerK}`);onValue(fRef1,sn=>{f1=sn.val();recalc();});
  fRef2=ref(db,`follows/${peerK}/${meK}`);onValue(fRef2,sn=>{f2=sn.val();recalc();});
  if(isOwner(email)){oRef=ref(db,`chatOpen/${cid}`);onValue(oRef,sn=>{openFlag=!!sn.val();recalc();});}
  recalc();
  rxRef=ref(db,`chats/${cid}/reactions`);
  onValue(rxRef,sn=>{rxMap=sn.val()||{};if(main.querySelector(".ch-tabs button.on")?.dataset.v==="m")drawMsgs(lastSnap);});
  delRef=ref(db,`chats/${cid}/deleted/${meK}`);
  onValue(delRef,sn=>{delMap=sn.val()||{};if(main.querySelector(".ch-tabs button.on")?.dataset.v==="m")drawMsgs(lastSnap);});
  blkRef=ref(db,`chatBlocks/${meK}/${peerK}`);
  onValue(blkRef,sn=>{iBlocked=!!sn.val();applyBlockUI();});
  async function canSend(){
    if(iBlocked||!connected)return false;
    try{const bl=await get(ref(db,`chatBlocks/${peerK}/${meK}`));if(bl.val())return false;}catch(e){}
    return true;
  }
  async function deliver(extra,preview){
    if(!(await canSend()))throw new Error("blocked");
    await deliverTo(email,active.name,peerProf.username||"",extra,preview);
    set(ref(db,`chats/${cid}/typing/${meK}`),0);
  }
  async function sendText(text){
    text=String(text||"").trim().slice(0,1000);if(!text)return;
    try{await deliver({text},text.slice(0,60));}catch(e){console.error("chat send:",e);if(e.message==="blocked")notify("تعذّر إرسال الرسالة");else if(e.message==="notconnected")notify("لازم تتابعه ويقبل متابعتك الأول");}
  }
  async function sendMedia(type,dataUrl,dur,wave){
    if(!(await canSend())){notify(connected?"تعذّر إرسال الرسالة":"لازم تتابعه ويقبل متابعتك الأول");return;}
    const label=type==="image"?"📷 صورة":type==="video"?"🎬 فيديو":"🎤 رسالة صوتية";
    const att=$("chAttach");if(att)att.innerHTML=`<i class="fa-solid fa-spinner fa-spin"></i>`;
    try{
      const mref=push(ref(db,`chatMedia/${cid}`));
      await set(mref,dataUrl);
      await deliver({type,mid:mref.key,dur:dur||0,wave:wave||"",text:label},label);
    }catch(e){console.error("chat media:",e);notify("تعذّر إرسال الملف — راجع قواعد Firebase أو قلّل الحجم");}
    finally{const a2=$("chAttach");if(a2)a2.innerHTML=`<i class="fa-solid fa-paperclip"></i>`;}
  }
  // ----- تسجيل صوت (موجة صوت مباشرة) -----
  let rec=null,recTimer=null,recStart=0;
  const WBARS=34;
  function uiRec(on){
    if(!$("chRec"))return;
    $("chRec").style.display=on?"flex":"none";
    input.style.display=on?"none":"";
    ["chAttach","chEmoBtn","chMic","chSend"].forEach(id=>{if($(id))$(id).style.display=on?"none":"";});
    if(on){$("chRecT").textContent="0:00";$("chRecWv").innerHTML=Array.from({length:WBARS},()=>"<i></i>").join("");}
  }
  const makeWave=lv=>{
    if(!lv.length)return "5".repeat(40);
    let out="";
    for(let i=0;i<40;i++){
      const a1=Math.floor(i*lv.length/40),b1=Math.max(a1+1,Math.floor((i+1)*lv.length/40));
      const seg=lv.slice(a1,b1);const avg=seg.reduce((x,y)=>x+y,0)/seg.length;
      out+=String(Math.min(9,Math.floor(avg*10)));
    }
    return out;
  };
  async function startRec(){
    if(rec||iBlocked)return;
    if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==="undefined"){notify("المتصفح مش بيدعم تسجيل الصوت");return;}
    let stream;
    try{stream=await navigator.mediaDevices.getUserMedia({audio:true});}
    catch(e){notify("لازم تسمح للموقع بالوصول للميكروفون");return;}
    const mt=["audio/webm;codecs=opus","audio/webm","audio/mp4","audio/ogg;codecs=opus"].find(t=>MediaRecorder.isTypeSupported&&MediaRecorder.isTypeSupported(t))||"";
    const chunks=[];
    const mr=new MediaRecorder(stream,mt?{mimeType:mt,audioBitsPerSecond:24000}:{audioBitsPerSecond:24000});
    mr.ondataavailable=e=>{if(e.data&&e.data.size)chunks.push(e.data);};
    let ac=null,an=null,buf=null;
    try{const AC=window.AudioContext||window.webkitAudioContext;ac=new AC();const sn=ac.createMediaStreamSource(stream);an=ac.createAnalyser();an.fftSize=512;sn.connect(an);buf=new Uint8Array(an.fftSize);}catch(e){ac=null;an=null;}
    const levels=[];
    const r={mr,stream,chunks,mt:mr.mimeType||mt,send:false,ac,vt:null};
    rec=r;
    mr.onstop=async()=>{
      r.stream.getTracks().forEach(t=>t.stop());
      clearInterval(recTimer);clearInterval(r.vt);
      try{r.ac&&r.ac.close();}catch(e){}
      if(rec===r)rec=null;
      uiRec(false);
      if(!r.send||!r.chunks.length)return;
      const dur=Math.round((Date.now()-recStart)/1000);
      const blob=new Blob(r.chunks,{type:r.mt||"audio/webm"});
      sendMedia("audio",await fileToDataUrl(blob),dur,makeWave(levels));
    };
    mr.start();recStart=Date.now();uiRec(true);
    r.vt=setInterval(()=>{
      let lv=0.12+Math.random()*0.1;
      if(an){an.getByteTimeDomainData(buf);let sum=0;for(let i=0;i<buf.length;i++){const v=(buf[i]-128)/128;sum+=v*v;}lv=Math.min(1,Math.sqrt(sum/buf.length)*5);}
      levels.push(lv);
      const wv=$("chRecWv");if(!wv)return;
      const bars=wv.children;
      for(let i=0;i<bars.length-1;i++)bars[i].style.height=bars[i+1].style.height||"6px";
      if(bars.length)bars[bars.length-1].style.height=Math.max(6,Math.round(lv*30))+"px";
    },90);
    recTimer=setInterval(()=>{
      const sec=Math.floor((Date.now()-recStart)/1000);
      if($("chRecT"))$("chRecT").textContent=Math.floor(sec/60)+":"+String(sec%60).padStart(2,"0");
      if(sec>=60)finishRec(true);
    },500);
  }
  function finishRec(doSend){
    if(!rec)return;
    rec.send=doSend;clearInterval(recTimer);clearInterval(rec.vt);
    try{rec.mr.stop();}catch(e){rec.stream.getTracks().forEach(t=>t.stop());rec=null;uiRec(false);}
  }
  window.__chatCancelRec=()=>finishRec(false);
  function send(){
    if(editing){saveEdit();return;}
    if(rec){finishRec(true);return;}
    const t=input.value.trim();if(!t)return;input.value="";sendText(t);
  }

  function startVideo(){
    const room="KashmirHome-"+Array.from(crypto.getRandomValues(new Uint8Array(8))).map(b=>b.toString(16).padStart(2,"0")).join("");
    const url="https://meet.jit.si/"+room;
    window.open(url,"_blank","noopener");
    sendText("📹 دعوة مكالمة فيديو — ادخل من هنا: "+url);
    main.querySelector('.ch-tabs button[data-v="m"]')?.click();
  }
  async function showContact(){
    msgs.innerHTML=`<div class="ch-empty"><i class="fa-solid fa-spinner fa-spin"></i></div>`;
    const r=await cardFor(email,active.name,peerPhoto);
    if(main.querySelector(".ch-tabs button.on")?.dataset.v!=="c")return;
    const p=r.pp;
    msgs.innerHTML=`<div class="ch-pc-wrap">${r.html}
      <div class="pc-calls">${p.phone?`<div class="cc-row"><span>التليفون</span><span dir="ltr">${esc(p.phone)}</span></div>`:""}
        <div class="cc-btns">
          <a class="cc-btn cc-call${p.phone?"":" off"}" ${p.phone?`href="tel:${esc(p.phone)}"`:""}><i class="fa-solid fa-phone"></i> اتصال عادي</a>
          <button class="cc-btn cc-video" id="ccVideo" type="button"><i class="fa-solid fa-video"></i> اتصال فيديو</button>
        </div></div></div>`;
    $("ccVideo").onclick=startVideo;
    if(!myProf)await reloadMyProf();
    if(myProf&&profIncomplete(myProf)&&$("chMsgs")){
      const go=document.createElement("button");go.type="button";go.className="cc-go top";
      go.textContent=myProf.bio?"✏️ كمّل روابطك":"✏️ كمّل نبذتك";go.onclick=openProfEditor;
      msgs.querySelector(".ch-pc-wrap").prepend(go);
    }
  }
  $("chSend").onclick=send;
  input.onkeydown=e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}};
  input.oninput=()=>{
    if(typTimer)return;
    set(ref(db,`chats/${cid}/typing/${meK}`),Date.now()).catch(()=>{});
    typTimer=setTimeout(()=>{typTimer=null;},2500);
  };
  $("chEmoBtn").onclick=e=>{e.stopPropagation();$("chEmoPop").classList.toggle("open");};
  $("chEmoPop").onclick=e=>{if(e.target.tagName==="SPAN"){input.value+=e.target.textContent;input.focus();}};
  $("chMic").onclick=startRec;
  $("chRecX").onclick=()=>finishRec(false);
  // ----- ضغطة مطولة على رسالة = إيموشن -----
  const RXS=["👍","❤️","😂","😮","😢","🙏"];
  let lpT=null,lpFired=false,lpX=0,lpY=0;
  const closeRx=()=>$("chRxPop")?.remove();
  async function toggleRx(mid,e){
    const rf=ref(db,`chats/${cid}/reactions/${mid}/${meK}`);
    try{if(rxMap[mid]&&rxMap[mid][meK]===e)await remove(rf);else await set(rf,e);}catch(er){console.error(er);}
  }
  // ----- تعديل (لحد دقيقتين) / حذف لي / حذف للجميع -----
  const EDIT_MS=120000;
  const fmtLeft=ms=>{const s=Math.max(0,Math.ceil(ms/1000));return Math.floor(s/60)+":"+String(s%60).padStart(2,"0");};
  function cancelEdit(){
    editing=null;clearInterval(editTimer);editTimer=null;
    $("chEditBar")?.classList.remove("show");
    if($("chInput"))$("chInput").value="";
  }
  function startEdit(mid,m){
    if(Date.now()-(m.ts||0)>EDIT_MS){notify("انتهت مهلة التعديل (دقيقتين)");return;}
    editing={id:mid,ts:m.ts};
    $("chEditBar")?.classList.add("show");
    input.value=m.text||"";input.focus();
    const tick=()=>{
      if(!editing)return;
      const left=EDIT_MS-(Date.now()-editing.ts);
      if(left<=0){cancelEdit();notify("انتهت مهلة التعديل (دقيقتين)");return;}
      if($("chEditT"))$("chEditT").textContent=fmtLeft(left);
    };
    clearInterval(editTimer);tick();editTimer=setInterval(tick,1000);
  }
  async function saveEdit(){
    const ed=editing;if(!ed)return;
    const t=input.value.trim().slice(0,1000);if(!t)return;
    if(Date.now()-ed.ts>EDIT_MS){cancelEdit();notify("انتهت مهلة التعديل (دقيقتين)");return;}
    const cur=lastSnap[ed.id];
    if(!cur||cur.del||cur.from!==me){cancelEdit();return;}
    cancelEdit();
    try{
      await update(ref(db,`chats/${cid}/messages/${ed.id}`),{text:t,edited:1});
      if((convs[peerK]||{}).ts===cur.ts){
        await update(ref(db,`userChats/${meK}/${peerK}`),{last:"أنت: "+t.slice(0,60)});
        await update(ref(db,`userChats/${peerK}/${meK}`),{last:t.slice(0,60)});
      }
    }catch(e){console.error(e);notify("تعذّر التعديل");}
  }
  async function deleteForAll(mid,m){
    try{
      const up={[`chats/${cid}/messages/${mid}`]:{from:m.from,ts:m.ts,del:1},[`chats/${cid}/reactions/${mid}`]:null};
      if(m.mid)up[`chatMedia/${cid}/${m.mid}`]=null;
      await update(ref(db),up);
      if((convs[peerK]||{}).ts===m.ts){
        await update(ref(db,`userChats/${meK}/${peerK}`),{last:"أنت: 🚫 رسالة محذوفة"});
        await update(ref(db,`userChats/${peerK}/${meK}`),{last:"🚫 رسالة محذوفة"});
      }
    }catch(e){console.error(e);notify("تعذّر الحذف");}
  }
  const RXALL=[...new Set([...RXS,...EMOJIS,"🥰","😭","😡","🎉","💯","🤔","👏","🙌","💔","✨","🤝","💪","🌹","⭐","✅"])];
  // ----- وضع التحديد: الهيدر بيبدّل التبويبات بـ نسخ / تعديل / حذف -----
  function exitSel(){
    selId=null;
    closeRx();$("chDelMenu")?.remove();
    msgs.querySelectorAll(".ch-m.selmsg").forEach(x=>x.classList.remove("selmsg"));
    const bar=$("chSelBar"),tabs=main.querySelector(".ch-tabs");
    if(bar){bar.classList.remove("show");bar.innerHTML="";bar.onclick=null;}
    if(tabs)tabs.style.display="";
    if(selOff){selOff();selOff=null;}
  }
  function openDelMenu(btn,mid,m){
    $("chDelMenu")?.remove();
    const menu=document.createElement("div");menu.id="chDelMenu";menu.className="ch-rxpop";menu.style.minWidth="190px";
    menu.innerHTML=`<div class="acts" style="border:none;margin:0;padding:0"><button type="button" data-d="me"><i class="fa-regular fa-trash-can"></i> حذف لي</button><button type="button" class="dg" data-d="all"><i class="fa-solid fa-trash"></i> حذف للجميع</button></div>`;
    document.body.appendChild(menu);
    const r=btn.getBoundingClientRect(),pw=menu.offsetWidth;
    let left=r.left+r.width/2-pw/2;left=Math.max(8,Math.min(left,innerWidth-pw-8));
    menu.style.left=left+"px";menu.style.top=(r.bottom+8)+"px";
    menu.onclick=async e=>{
      const b=e.target.closest("[data-d]");if(!b)return;
      const d=b.dataset.d;
      if(!(await uiConfirm(d==="all"?"هل تريد حذف الرسالة للجميع؟ الطرف التاني مش هيشوفها.":"هل تريد حذف الرسالة من عندك؟ الطرف التاني هيفضل شايفها.")))return;
      exitSel();
      if(d==="me"){try{await set(ref(db,`chats/${cid}/deleted/${meK}/${mid}`),true);}catch(er){notify("تعذّر الحذف");}}
      else deleteForAll(mid,m);
    };
  }
  function enterSel(el,mid,m){
    exitSel();
    selId=mid;
    el.classList.add("selmsg");
    const mine=m.from===me,del=!!m.del;
    const isText=!del&&!m.type&&!!m.text;
    const canEdit=mine&&isText&&!m.bc&&!m.adm&&(Date.now()-(m.ts||0)<=EDIT_MS);
    const bar=$("chSelBar"),tabs=main.querySelector(".ch-tabs");
    if(tabs)tabs.style.display="none";
    bar.innerHTML=`<button type="button" class="x" data-s="x" title="إلغاء"><i class="fa-solid fa-xmark"></i></button>${isText?`<button type="button" data-s="copy"><i class="fa-regular fa-copy"></i> نسخ</button>`:""}${canEdit?`<button type="button" data-s="edit"><i class="fa-solid fa-pen"></i> تعديل</button>`:""}<button type="button" class="dg" data-s="del"><i class="fa-regular fa-trash-can"></i> حذف</button>`;
    bar.classList.add("show");
    bar.onclick=async e=>{
      const b=e.target.closest("button[data-s]");if(!b)return;
      const act=b.dataset.s;
      if(act==="x"){exitSel();return;}
      if(act==="copy"){try{await navigator.clipboard.writeText(m.text);}catch(er){}exitSel();return;}
      if(act==="edit"){exitSel();startEdit(mid,m);return;}
      if(act==="del"){
        if(!(mine&&!del)){if(!(await uiConfirm("هل تريد حذف الرسالة من عندك؟")))return;exitSel();try{await set(ref(db,`chats/${cid}/deleted/${meK}/${mid}`),true);}catch(er){notify("تعذّر الحذف");}return;}
        openDelMenu(b,mid,m);
      }
    };
    const onDown=ev=>{if(ev.target.closest("#chRxPop,#chDelMenu,#chSelBar")||el.contains(ev.target))return;exitSel();};
    const onKey=ev=>{if(ev.key==="Escape")exitSel();};
    document.addEventListener("pointerdown",onDown,true);
    document.addEventListener("keydown",onKey);
    selOff=()=>{document.removeEventListener("pointerdown",onDown,true);document.removeEventListener("keydown",onKey);};
  }
  function showRx(el){
    const mid=el.dataset.id;if(!mid)return;
    const m=lastSnap[mid];if(!m)return;
    enterSel(el,mid,m);                                  // الهيدر يتحول لنسخ/تعديل/حذف
    if(m.del)return;
    const myRx=rxMap[mid]&&rxMap[mid][meK];
    const pop=document.createElement("div");pop.id="chRxPop";pop.className="ch-rxpop";
    pop.innerHTML=`<div class="rw">${RXALL.map(e=>`<span data-e="${e}" class="${myRx===e?"on":""}">${e}</span>`).join("")}</div>`;
    document.body.appendChild(pop);
    const bub=el.querySelector(".b")||el;
    const r=bub.getBoundingClientRect();
    const pw=pop.offsetWidth,ph=pop.offsetHeight;
    let left=r.left+r.width/2-pw/2;left=Math.max(8,Math.min(left,innerWidth-pw-8));
    let top=r.bottom+8;                                   // الإيموجي تحت الرسالة
    if(top+ph>innerHeight-8){const upTop=r.top-ph-8;top=upTop>=8?upTop:Math.max(8,innerHeight-ph-8);}
    pop.style.left=left+"px";pop.style.top=top+"px";
    pop.onclick=e=>{const em=e.target.closest("[data-e]");if(!em)return;exitSel();toggleRx(mid,em.dataset.e);};
  }
  $("chEditX").onclick=cancelEdit;
  const cancelLp=()=>clearTimeout(lpT);
  msgs.addEventListener("pointerdown",e=>{
    const el=e.target.closest(".ch-m[data-id]");
    if(!el||e.target.closest("button,a,audio,video,input"))return;
    lpFired=false;lpX=e.clientX;lpY=e.clientY;
    clearTimeout(lpT);lpT=setTimeout(()=>{lpFired=true;showRx(el);},450);
  });
  msgs.addEventListener("pointerup",cancelLp);
  msgs.addEventListener("pointercancel",cancelLp);
  msgs.addEventListener("pointerleave",cancelLp);
  msgs.addEventListener("scroll",cancelLp);
  msgs.addEventListener("pointermove",e=>{if(Math.abs(e.clientX-lpX)+Math.abs(e.clientY-lpY)>10)cancelLp();});
  msgs.addEventListener("contextmenu",e=>{const el=e.target.closest(".ch-m[data-id]");if(!el)return;e.preventDefault();showRx(el);});
  msgs.addEventListener("click",e=>{
    if(lpFired){lpFired=false;e.preventDefault();e.stopPropagation();return;}
    const chip=e.target.closest(".ch-rx button");
    if(chip){toggleRx(chip.dataset.mid,chip.dataset.rx);return;}
    const mc=e.target.closest(".ch-mention[data-url]");
    if(mc){const u=mc.dataset.url;try{if(new URL(u).origin===location.origin)location.href=u;}catch(er){}return;}
    const sc=e.target.closest(".ch-story");
    if(sc)openSharedStory(sc.dataset.sk,sc.dataset.sid,sc.dataset.sn,sc.dataset.su);
  },true);
  $("chRecStop").onclick=()=>finishRec(true);
  $("chKebab").onclick=e=>{e.stopPropagation();$("chMenu").classList.toggle("open");};
  $("chMenu").onclick=async e=>{
    const b=e.target.closest("button[data-a]");if(!b)return;
    $("chMenu").classList.remove("open");
    const act=b.dataset.a;
    try{
      if(act==="clear"){
        if(!(await uiConfirm("هل تريد مسح كل رسايل المحادثة من عندك؟ الطرف التاني مش هيتأثر.")))return;
        await set(ref(db,`chats/${cid}/cleared/${meK}`),Date.now());
        await update(ref(db,`userChats/${meK}/${peerK}`),{last:"",unread:0});
      }else if(act==="block"){
        if(iBlocked){if(!(await uiConfirm("هل تريد إلغاء حظر "+active.name+"؟",{danger:false,ok:"إلغاء الحظر"})))return;await remove(ref(db,`chatBlocks/${meK}/${peerK}`));}
        else{
          if(!(await uiConfirm("هل تريد حظر "+active.name+"؟ مش هتقدر تبعتله ولا تستقبل منه رسايل.")))return;
          await set(ref(db,`chatBlocks/${meK}/${peerK}`),Date.now());
        }
      }else if(act==="settings"){openProfEditor();}
    }catch(er){console.error(er);notify("تعذّر تنفيذ العملية، راجع قواعد Firebase");}
  };
  $("chUnblk").onclick=()=>remove(ref(db,`chatBlocks/${meK}/${peerK}`)).catch(()=>{});
  $("chAttach").onclick=()=>$("chFile").click();
  $("chFile").onchange=async e=>{
    const f=e.target.files[0];e.target.value="";if(!f)return;
    try{
      if(f.type.startsWith("image/"))await sendMedia("image",await compressImg(f));
      else if(f.type.startsWith("video/")){
        if(f.size>5*1024*1024){notify("الفيديو أكبر من 5 ميجا — اختار فيديو أقصر أو أصغر حجماً");return;}
        await sendMedia("video",await fileToDataUrl(f));
      }else notify("الملف لازم يكون صورة أو فيديو");
    }catch(er){console.error(er);notify("تعذّر قراءة الملف");}
  };
  applyBg();
  main.onclick=e=>{
    if(!e.target.closest("#chEmoBtn,#chEmoPop"))$("chEmoPop")?.classList.remove("open");
    if(!e.target.closest("#chKebab,#chMenu"))$("chMenu")?.classList.remove("open");
  };
  input.focus();
}
window.openChatWith=openChat;

// ---------- Lightbox (تكبير الصورة + كلمة دردشة) ----------
function mountLightbox(){
  if($("ph-lightbox"))return;
  const d=document.createElement("div");d.id="ph-lightbox";
  d.innerHTML=`<div class="ph-box pcbox"><button class="ph-x" aria-label="إغلاق">✕</button><div id="phCard"></div>
    <div class="ph-acts"><button class="ph-chat-btn" id="phChat"><i class="fa-solid fa-comments"></i> دردشة</button></div></div>`;
  document.body.appendChild(d);
  d.addEventListener("click",e=>{if(e.target===d||e.target.closest(".ph-x"))d.classList.remove("open");});
  document.addEventListener("keydown",e=>{if(e.key==="Escape")d.classList.remove("open");});
}
let _phTok=0;
export async function showPhoto({email,name,photo}){
  mountLightbox();
  const em=String(email||"").toLowerCase(),nm=name||"";
  const hideChat=!em||em===me;
  const tok=++_phTok;
  photo=safeImg(photo);
  const card=$("phCard");
  card.innerHTML=profCardHtml({k:eKey(em||"x"),email:em,name:nm,photo,own:false,rel:"none",cover:COVERS.sky,stats:{fw:0,fg:0,st:0},p:{username:"",bio:"",facebook:"",instagram:"",tiktok:"",phone:""},vis:true,loading:true,noPlus:true});
  const btn=$("phChat");
  btn.style.display=hideChat?"none":"inline-flex";
  btn.onclick=()=>{
    $("ph-lightbox").classList.remove("open");
    if(IS_ACCOUNT)openChat(em,nm);
    else location.href=`${ACCOUNT_URL}?chat=${encodeURIComponent(em)}&name=${encodeURIComponent(nm)}`;
  };
  $("ph-lightbox").classList.add("open");
  if(!em)return;
  if(!photo){photo=safeImg(await photoOf(em));if(tok!==_phTok)return;}
  const r=await cardFor(em,em===me?(myName()||nm):nm,photo);
  if(tok===_phTok)card.innerHTML=r.html;
}
window.showUserPhoto=showPhoto;

// أي عنصر عليه data-chat-email (أو .my-comment-avatar) لما تدوس عليه يفتح التكبير
document.addEventListener("click",e=>{
  const el=e.target.closest("[data-chat-email]");
  if(!el)return;
  e.preventDefault();e.stopPropagation();   // capture: يشتغل حتى لو كود تاني في الصفحة بيوقف الكليك
  showPhoto({email:el.dataset.chatEmail,name:el.dataset.chatName,photo:el.dataset.chatPhoto});
},true);
window.__chatJsLoaded=true;

// ---- صفحة المنتج: التعليقات بتتعرض من item.js، فبنلقط الضغط على صورة أي تعليق من الـ DOM مباشرة ----
const _emailCache={};
async function emailOfComment(id){
  if(!id)return"";
  if(_emailCache[id]!==undefined)return _emailCache[id];
  let found="";
  try{
    const m=location.search.match(/[?&](?:id|item|product)=([^&]+)/);
    const all=await get(ref(db,"comments"));
    all.forEach(item=>{const c=item.child(id);if(c.exists()&&!found)found=c.val().userEmail||"";});
  }catch(e){console.error("chat: comment lookup",e);}
  return _emailCache[id]=found;
}
document.addEventListener("click",async e=>{
  const av=e.target.closest(".comment > .avatar, .comment .avatar");
  if(!av||av.hasAttribute("data-chat-email"))return;
  const box=av.closest(".comment");if(!box)return;
  e.preventDefault();e.stopPropagation();
  const name=(box.querySelector(".comment-name")?.textContent||"").trim();
  const bg=getComputedStyle(av).backgroundImage||"";
  const mm=bg.match(/url\(["']?(.*?)["']?\)/);
  const photo=mm?mm[1]:"";
  showPhoto({email:"",name,photo});                 // يظهر فوراً
  const email=await emailOfComment(box.dataset.commentId);
  const lb=$("ph-lightbox");
  if(email&&lb&&lb.classList.contains("open"))showPhoto({email,name,photo}); // يظهر زرار دردشة بعد ما نعرف الإيميل
},true);

// ---------- تشغيل ----------
me=myEmail();
if(me&&IS_ACCOUNT){
  mountTab();
  refreshMeName();
  $("chMeAva").outerHTML=`<div class="ch-ava" id="chMeAva" style="background:${colorFor(myName())}">${esc((myName()||"م").charAt(0))}</div>`;
  photoOf(me).then(p=>{if(p)$("chMeAva").outerHTML=avaHtml(p,myName()).replace('class="ch-ava','id="chMeAva" class="ch-ava');});
  document.querySelector(".ch-me .ava")?.setAttribute("title","بروفايلي");
  $("chSearch").oninput=renderList;
  $("chGear").onclick=openProfEditor;
  $("chNudge").onclick=openProfEditor;
  mountProfileCard();mountThemeCard();reloadMyProf();
  $("chPlus").onclick=()=>{const r=$("chNewRow");r.classList.toggle("open");if(r.classList.contains("open"))$("chNewEmail").focus();};
  $("chNewGo").onclick=startByEmail;
  $("chNewEmail").onkeydown=e=>{if(e.key==="Enter")startByEmail();};
  listenConvs();
  initStories();
  initFollow();
  ensureOwnerFollow();
  // فتح محادثة مباشرة من رابط:  account.html?chat=email&name=الاسم
  const p=new URLSearchParams(location.search);
  if(p.get("chat"))setTimeout(()=>openChat(p.get("chat"),p.get("name")),600);
}

// ============================================================
//  رسايل التأكيد والتنبيه داخل الصفحة (بدل نوافذ المتصفح)
// ============================================================
function _uiStyle(){
  if(document.getElementById("ui-dlg-style"))return;
  const st=document.createElement("style");st.id="ui-dlg-style";
  st.textContent="#uiToast{position:fixed;left:50%;bottom:28px;transform:translateX(-50%) translateY(20px);background:#2b3248;color:#fff;padding:12px 20px;border-radius:14px;font-family:inherit;font-size:14px;z-index:2147483600;box-shadow:0 10px 30px rgba(0,0,0,.3);opacity:0;transition:opacity .25s,transform .25s;max-width:min(92vw,460px);text-align:center;direction:rtl;pointer-events:none;display:flex;align-items:center;gap:10px;line-height:1.7}#uiToast.show{opacity:1;transform:translateX(-50%) translateY(0)}#uiToast.err{background:#c62828}#uiToast.ok{background:#1b9a74}.ui-ov{position:fixed;inset:0;background:rgba(15,20,40,.55);z-index:2147483500;display:flex;align-items:center;justify-content:center;padding:16px;font-family:inherit;direction:rtl;animation:uiFade .15s}.ui-box{background:#fff;border-radius:20px;padding:24px 22px 18px;width:min(380px,100%);box-shadow:0 20px 60px rgba(0,0,0,.3);text-align:center;animation:uiPop .18s;box-sizing:border-box}.ui-ic{width:54px;height:54px;border-radius:50%;margin:0 auto 12px;display:flex;align-items:center;justify-content:center;font-size:22px;background:#eaf8f2;color:#1b9a74}.ui-box.danger .ui-ic{background:#fdecea;color:#e53935}.ui-box h4{margin:0 0 8px;font-size:17px;color:#1d2433}.ui-box p{margin:0 0 18px;font-size:14px;color:#5b6475;line-height:1.9;white-space:pre-line}.ui-btns{display:flex;gap:10px}.ui-btns button{flex:1;border:none;border-radius:12px;padding:12px;font-family:inherit;font-weight:800;font-size:14px;cursor:pointer}.ui-btns .no{background:#eef1f6;color:#4a5468}.ui-btns .yes{background:#2bb58f;color:#fff}.ui-box.danger .yes{background:#e53935}@keyframes uiFade{from{opacity:0}to{opacity:1}}@keyframes uiPop{from{transform:scale(.92);opacity:0}to{transform:scale(1);opacity:1}}";
  document.head.appendChild(st);
}
function notify(msg,type){
  _uiStyle();
  const text=String(msg==null?"":msg);
  const t=type||(/تعذّر|مشكلة|راجع قواعد|مش بيدعم|لازم تسمح|أكبر|غير متاح|مفيش/.test(text)?"err":"info");
  let el=document.getElementById("uiToast");
  if(!el){el=document.createElement("div");el.id="uiToast";document.body.appendChild(el);}
  clearTimeout(el._t);
  el.className=t;
  el.innerHTML='<i class="fa-solid '+(t==="err"?"fa-circle-exclamation":t==="ok"?"fa-circle-check":"fa-circle-info")+'"></i><span></span>';
  el.querySelector("span").textContent=text;
  void el.offsetWidth;
  el.classList.add("show");
  el._t=setTimeout(()=>el.classList.remove("show"),3400);
}
function uiConfirm(msg,o){
  _uiStyle();
  o=o||{};
  const text=String(msg==null?"":msg);
  const danger=o.danger!==undefined?o.danger:/حذف|مسح|حظر|إلغاء|رفض|إزالة|نهائي/.test(text);
  const yesTxt=o.ok||(/حذف/.test(text)?"حذف":/مسح/.test(text)?"مسح":/حظر/.test(text)?"حظر":/إزالة/.test(text)?"إزالة":/رفض/.test(text)?"رفض":/إرسال/.test(text)?"إرسال":"تأكيد");
  return new Promise(res=>{
    document.getElementById("uiConfirm")?.remove();
    const ov=document.createElement("div");ov.id="uiConfirm";ov.className="ui-ov";
    ov.innerHTML='<div class="ui-box'+(danger?" danger":"")+'" role="dialog" aria-modal="true"><div class="ui-ic"><i class="fa-solid '+(danger?"fa-triangle-exclamation":"fa-circle-question")+'"></i></div><h4></h4><p></p><div class="ui-btns"><button type="button" class="no">إلغاء</button><button type="button" class="yes"></button></div></div>';
    ov.querySelector("h4").textContent=o.title||(danger?"تأكيد العملية":"تأكيد");
    ov.querySelector("p").textContent=text;
    ov.querySelector(".yes").textContent=yesTxt;
    document.body.appendChild(ov);
    const key=e=>{if(e.key==="Escape"){e.stopPropagation();done(false);}};
    const done=v=>{document.removeEventListener("keydown",key,true);ov.remove();res(v);};
    document.addEventListener("keydown",key,true);
    ov.querySelector(".no").onclick=()=>done(false);
    ov.querySelector(".yes").onclick=()=>done(true);
    ov.addEventListener("click",e=>{if(e.target===ov)done(false);});
    (danger?ov.querySelector(".no"):ov.querySelector(".yes")).focus();
  });
}