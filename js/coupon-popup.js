// ============================================================
//  🎁 نافذة "عندك كوبون!" — كشمير هوم — ملف: js/coupon-popup.js
//  بتظهر أول ما العميل يفتح أي صفحة فيها الملف ده، لو في كود خصم جديد
//  متاح له (عام لكل العملاء، أو مخصص له بالإيميل/الاسم) ولسه ما شافهوش.
//  الملف مستقل تماماً وبيحقن الـ HTML/CSS بتاعه لوحده — يكفي تضيف:
//    <script type="module" src="/js/coupon-popup.js"></script>
//  قبل </body> في أي صفحة عايز الإشعار ده يظهر فيها (زي index.html مثلاً).
// ============================================================
import{initializeApp,getApps,getApp}from"https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import{getDatabase,ref,get}from"https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const cfg={apiKey:"AIzaSyCCk0w_KHVCswjp16TSkNToRSSOjlPC5kE",authDomain:"data-customer-d722f.firebaseapp.com",databaseURL:"https://data-customer-d722f-default-rtdb.firebaseio.com/",projectId:"data-customer-d722f",storageBucket:"data-customer-d722f.firebasestorage.app",messagingSenderId:"398522341614",appId:"1:398522341614:web:99e0f897c61ec960cffbff"};
const app=getApps().length?getApp():initializeApp(cfg);
const db=getDatabase(app);

// رابط تبويب "أكواد الخصم" في صفحة الحساب (مسار مطلق من جذر الموقع — عدّله لو موقعك في مجلد فرعي)
const DISCOUNT_URL="/user/accoun.html?tab=discount";
const SEEN_KEY="kashmirSeenCoupons";

const normName=s=>String(s||"").replace(/[\u064B-\u065F\u0640]/g,"").replace(/[أإآ]/g,"ا").replace(/ى/g,"ي").replace(/ة/g,"ه").replace(/\s+/g," ").trim().toLowerCase();

function currentUser(){
  const email=localStorage.getItem("kashmirSessionEmail")||"";
  let name="";
  try{const u=JSON.parse(localStorage.getItem("kashmirUser")||"null");if(u)name=[u.firstName,u.lastName].filter(Boolean).join(" ")||u.name||"";}catch(e){}
  return{email,name};
}
function getSeen(){try{return JSON.parse(localStorage.getItem(SEEN_KEY))||[];}catch(e){return[];}}
function markSeen(id){const s=getSeen();if(!s.includes(id)){s.push(id);try{localStorage.setItem(SEEN_KEY,JSON.stringify(s));}catch(e){}}}

function eligible(c,email,name){
  const now=Date.now();
  if(c.active===false)return false;
  if(c.startAt&&now<c.startAt)return false;
  if(c.expiresAt&&now>c.expiresAt)return false;
  if(c.maxUses&&(c.usedCount||0)>=c.maxUses)return false;
  if(!c.targetType||c.targetType==="all")return true;
  if(c.targetType==="email")return!!email&&String(c.targetValue||"").toLowerCase()===email.toLowerCase();
  if(c.targetType==="name")return!!name&&normName(c.targetValue)===normName(name);
  return false;
}

// ---------- الشكل ----------
function injectStyles(){
  if(document.getElementById("khCpStyles"))return;
  const st=document.createElement("style");
  st.id="khCpStyles";
  st.textContent=`
#khCpOverlay{position:fixed;inset:0;background:rgba(20,8,10,.6);display:flex;align-items:center;justify-content:center;z-index:99999;padding:18px;opacity:0;transition:opacity .3s ease}
#khCpOverlay.show{opacity:1}
.khCpCard{position:relative;width:100%;max-width:380px;border-radius:22px;overflow:visible;box-shadow:0 25px 60px rgba(0,0,0,.45);transform:scale(.8);opacity:0;transition:transform .45s cubic-bezier(.34,1.56,.64,1),opacity .35s ease;text-align:center;font-family:'Almarai','Rubik',sans-serif;direction:rtl}
#khCpOverlay.show .khCpCard{transform:scale(1);opacity:1}
.khCpInner{border-radius:22px;overflow:hidden;background:linear-gradient(160deg,#e0263f,#a80f24)}
.khCpRibbon{position:absolute;top:16px;right:-38px;background:#ffd23f;color:#7a3b00;font-weight:800;font-size:11px;padding:4px 42px;transform:rotate(35deg);box-shadow:0 3px 10px rgba(0,0,0,.3);z-index:4;letter-spacing:.5px}
.khCpClose{position:absolute;top:12px;left:12px;width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,.18);color:#fff;border:none;font-size:15px;cursor:pointer;z-index:3;line-height:1;transition:background .2s,transform .2s}
.khCpClose:hover{background:rgba(255,255,255,.32);transform:rotate(90deg)}
.khCpTop{position:relative;padding:36px 20px 8px;overflow:hidden}
.khCpGift{font-size:52px;filter:drop-shadow(0 8px 14px rgba(0,0,0,.35));display:inline-block;animation:khCpFloat 2.6s ease-in-out infinite}
@keyframes khCpFloat{0%,100%{transform:translateY(0) rotate(-4deg)}50%{transform:translateY(-8px) rotate(4deg)}}
.khCpDot{position:absolute;border-radius:50%;opacity:.5;pointer-events:none;animation:khCpTwinkle 1.8s ease-in-out infinite}
@keyframes khCpTwinkle{0%,100%{opacity:.25;transform:scale(.85)}50%{opacity:.65;transform:scale(1.1)}}
.khCpTitle{color:#fff;font-weight:800;font-size:20px;margin:8px 0 2px;position:relative}
.khCpSub{color:rgba(255,255,255,.85);font-size:13px;margin-bottom:18px;position:relative}
.khCpTicket{position:relative;background:#fff;margin:0 22px 20px;border-radius:14px;display:flex;align-items:stretch;box-shadow:0 10px 24px rgba(0,0,0,.25);overflow:hidden}
.khCpNotch{position:absolute;top:50%;width:18px;height:18px;background:#a80f24;border-radius:50%;transform:translateY(-50%);z-index:2}
.khCpNotch.l{right:-9px}.khCpNotch.r{left:-9px}
.khCpTicket:after{content:"";position:absolute;top:0;bottom:0;width:35%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.6),transparent);transform:translateX(-160%) skewX(-12deg);animation:khCpShimmer 2.8s ease-in-out infinite;pointer-events:none}
@keyframes khCpShimmer{0%{transform:translateX(-160%) skewX(-12deg)}55%{transform:translateX(260%) skewX(-12deg)}100%{transform:translateX(260%) skewX(-12deg)}}
.khCpBadge{background:#f4b400;color:#7a3b00;font-weight:800;font-size:11.5px;writing-mode:vertical-rl;padding:14px 8px;border-radius:14px 0 0 14px;display:flex;align-items:center;justify-content:center;letter-spacing:2px}
.khCpVal{flex:1;padding:14px 10px;color:#c81e37;font-weight:800;font-size:17px;display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1.4}
.khCpCode{font-size:11.5px;color:#a80f24;font-weight:700;margin-top:2px;direction:ltr}
.khCpExp{color:rgba(255,255,255,.75);font-size:11.5px;margin:-8px 22px 14px;position:relative}
.khCpBtn{display:block;width:calc(100% - 44px);margin:0 22px 26px;background:#ffd23f;color:#7a3b00;font-weight:800;font-size:15px;padding:13px;border:none;border-radius:12px;cursor:pointer;box-shadow:0 8px 18px rgba(0,0,0,.25);font-family:inherit;transition:transform .15s,box-shadow .15s}
.khCpBtn:hover{background:#ffdc66;transform:translateY(-2px);box-shadow:0 12px 22px rgba(0,0,0,.32)}
.khCpBtn:active{transform:translateY(0)}
@keyframes khCpFall{0%{transform:translateY(0) translateX(0) rotate(0deg);opacity:0}8%{opacity:1}100%{transform:translateY(112vh) translateX(var(--drift,0px)) rotate(340deg);opacity:.85}}
.khCpRainItem{position:fixed;top:-40px;pointer-events:none;user-select:none;will-change:transform,opacity}

/* الدائرة الصغيرة (لما يقفل الكوبون بدل ما يختفي خالص) */
.khCpBubble{position:fixed;bottom:24px;right:24px;width:60px;height:60px;border-radius:50%;background:linear-gradient(160deg,#e0263f,#a80f24);box-shadow:0 10px 26px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:99997;transform:scale(0);opacity:0;transition:transform .35s cubic-bezier(.34,1.56,.64,1),opacity .25s ease}
.khCpBubble.show{transform:scale(1);opacity:1}
.khCpBubble:hover{transform:scale(1.08)}
.khCpBubbleIcon{font-size:26px;filter:drop-shadow(0 3px 5px rgba(0,0,0,.3));position:relative;z-index:2}
.khCpBubblePulse{position:absolute;inset:0;border-radius:50%;border:3px solid #ffd23f;animation:khCpPulseRing 1.8s ease-out infinite;pointer-events:none}
@keyframes khCpPulseRing{0%{transform:scale(1);opacity:.8}100%{transform:scale(1.7);opacity:0}}

/* على الكمبيوتر: تظهر كإشعار في أسفل يمين الشاشة بدل نافذة في النص */
@media(min-width:769px){
  #khCpOverlay{background:transparent;pointer-events:none;padding:0;align-items:stretch;justify-content:stretch}
  .khCpCard{position:fixed;bottom:26px;right:26px;left:auto;top:auto;max-width:320px;pointer-events:auto;transform:translate(30px,50px) scale(.85);transition:transform .6s cubic-bezier(.22,1.55,.36,1),opacity .4s ease}
  #khCpOverlay.show .khCpCard{transform:translate(0,0) scale(1)}
}
@media(max-width:420px){.khCpTitle{font-size:18px}.khCpGift{font-size:44px}}

/* تجميع الكوبون — شخصيات بتوصّل قطع الكود، من غير ما يبان أي جزء من الكود الحقيقي قبل ما يتجمع */
.khCpPuzzleHint{color:rgba(255,255,255,.9);font-size:12px;font-weight:700;margin:-10px 22px 14px;position:relative}
.khCpPiece{position:absolute;box-sizing:border-box;padding:2px;animation:khCpPieceLand .3s ease}
@keyframes khCpPieceLand{0%{opacity:0;transform:scale(.5)}100%{opacity:1;transform:scale(1)}}
.khCpPieceInner{position:relative;width:100%;height:100%;border-radius:8px;background:linear-gradient(135deg,#ffe07a,#f4b400);box-shadow:0 3px 8px rgba(0,0,0,.3),inset 0 0 0 2px rgba(255,255,255,.55);display:flex;align-items:center;justify-content:center;overflow:hidden}
.khCpPieceInner:before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(45deg,rgba(168,15,36,.16) 0 7px,transparent 7px 14px)}
.khCpPieceGlyph{font-size:20px;line-height:1;position:relative;z-index:1;filter:drop-shadow(0 2px 3px rgba(0,0,0,.25))}
.khCpAssembleStage.khCpPuzzleSolved .khCpPiece{transition:opacity .35s ease,transform .35s ease;opacity:0;transform:scale(1.12) rotate(6deg)}
.khCpCarrier{will-change:transform}
.khCpCarrierSvg{width:100%;height:100%;display:block;filter:drop-shadow(0 4px 6px rgba(0,0,0,.35))}
.khCpCarrierCard{position:absolute;top:-14px;left:3px;width:40px;height:26px;border-radius:6px;background:linear-gradient(135deg,#ffe07a,#f4b400);box-shadow:0 3px 6px rgba(0,0,0,.35),inset 0 0 0 2px rgba(255,255,255,.55);display:flex;align-items:center;justify-content:center;font-size:15px;transform:rotate(-6deg);z-index:2}
.khCpBtnLocked{opacity:.5;cursor:not-allowed;box-shadow:none!important;transform:none!important}
.khCpBtnLocked:hover{background:#ffd23f!important;transform:none!important;box-shadow:none!important}
`;
  document.head.appendChild(st);
}

function scatterDots(container){
  [[8,14,9,0],[88,10,6,.3],[14,82,7,.6],[84,78,5,.15],[50,6,5,.45],[6,50,4,.7]].forEach(([l,t,s,dl])=>{
    const d=document.createElement("div");
    d.className="khCpDot";
    d.style.cssText=`left:${l}%;top:${t}%;width:${s*3}px;height:${s*3}px;background:#ffd23f;animation-delay:${dl}s`;
    container.appendChild(d);
  });
}

// مطر فلوس وعلامات % لما الكوبون يظهر — مستمر طول مدة الصوت (٨ ثواني) مش دفعة واحدة بس
function spawnMoneyRain(){
  const wrap=document.createElement("div");
  wrap.id="khCpRain";
  wrap.style.cssText="position:fixed;inset:0;pointer-events:none;z-index:99998;overflow:hidden";
  document.body.appendChild(wrap);
  const glyphs=["💵","💰","🪙","%","💴"];
  const TOTAL=8000; // ٨ ثواني، بنفس مدة ملف الصوت

  function spawnOne(){
    const el=document.createElement("span");
    el.className="khCpRainItem";
    el.textContent=glyphs[Math.floor(Math.random()*glyphs.length)];
    const left=Math.random()*100;
    const size=16+Math.random()*20;
    const dur=2.6+Math.random()*2.2;
    const drift=Math.round(Math.random()*80-40)+"px";
    el.style.cssText=`left:${left}vw;font-size:${size}px;--drift:${drift};animation:khCpFall ${dur.toFixed(2)}s linear forwards`;
    wrap.appendChild(el);
    setTimeout(()=>el.remove(),dur*1000+200);
  }

  for(let i=0;i<6;i++)spawnOne(); // دفعة أولى فورية عشان الأثر يبان من أول لحظة
  let elapsed=0;
  const iv=setInterval(()=>{
    spawnOne();spawnOne();
    elapsed+=220;
    if(elapsed>=TOTAL-1000)clearInterval(iv);
  },220);
  setTimeout(()=>wrap.remove(),TOTAL+800);
}

function daysLeftLabel(expiresAt){
  if(!expiresAt)return"";
  const days=Math.ceil((expiresAt-Date.now())/86400000);
  if(days<=0)return"";
  if(days===1)return"⏳ باقي يوم واحد بس على انتهاء الكود";
  if(days<=7)return`⏳ باقي ${days} أيام على انتهاء الكود`;
  return"";
}

// ---------- صوت تنبيه لطيف لما الكوبون يظهر (متولّد بالكود، من غير ملف صوت خارجي) ----------
let _audioCtx=null;
function getAudioCtx(){
  if(!_audioCtx){
    try{_audioCtx=new(window.AudioContext||window.webkitAudioContext)();}catch(e){return null;}
  }
  return _audioCtx;
}
function playChime(){
  const ctx=getAudioCtx();
  if(!ctx)return;
  const now=ctx.currentTime;
  // نغمات صاعدة قصيرة زي "تِنج تِنج" بتلفت الانتباه من غير ما تكون مزعجة
  [[880,0,.16],[1175,.11,.18],[1568,.24,.26]].forEach(([freq,offset,dur])=>{
    const start=now+offset;
    const osc=ctx.createOscillator();
    const gain=ctx.createGain();
    osc.type="sine";
    osc.frequency.value=freq;
    gain.gain.setValueAtTime(0,start);
    gain.gain.linearRampToValueAtTime(.22,start+.02);
    gain.gain.exponentialRampToValueAtTime(.0001,start+dur);
    osc.connect(gain);gain.connect(ctx.destination);
    osc.start(start);osc.stop(start+dur+.03);
  });
}
function tryPlayChime(){
  const ctx=getAudioCtx();
  if(!ctx)return;
  if(ctx.state==="suspended"){
    // المتصفحات بتمنع الصوت التلقائي لحد ما المستخدم يتفاعل مع الصفحة — نحاول نفكّه فوراً،
    // ولو رفض، نشغّله أول ما يدوس/يلمس أي حاجة في الصفحة
    ctx.resume().then(playChime).catch(()=>{
      const unlock=()=>{ctx.resume().then(playChime).catch(()=>{});};
      document.addEventListener("click",unlock,{once:true});
      document.addEventListener("touchstart",unlock,{once:true});
    });
  }else{
    playChime();
  }
}

// ---------- صوت الكوبون (ملف صوت حقيقي، مدته ٨ ثواني) — مع نغمة احتياطية لو الملف مش موجود ----------
const SOUND_URL="../coupon-effect.mp3"; // الملف حاطه في جذر المشروع مباشرة
function playCouponSound(){
  try{
    const audio=new Audio(SOUND_URL);
    audio.volume=.85;
    let usedFallback=false;
    audio.addEventListener("error",()=>{if(!usedFallback){usedFallback=true;tryPlayChime();}});
    const p=audio.play();
    if(p&&p.catch){
      p.catch(()=>{
        // المتصفح مانع تشغيل الصوت تلقائي — نشغّله أول ما المستخدم يدوس/يلمس أي حاجة في الصفحة
        const unlock=()=>{audio.play().catch(()=>{if(!usedFallback){usedFallback=true;tryPlayChime();}});};
        document.addEventListener("click",unlock,{once:true});
        document.addEventListener("touchstart",unlock,{once:true});
      });
    }
  }catch(e){tryPlayChime();}
}

// ---------- تجميع الكوبون: شخصيات كرتونية بسيطة (تصميم أصلي بألوان الموقع) بتطلع من حواف الشاشة،
// كل واحدة شايلة قطعة، بتوصلها لمكانها في الكوبون وتمشي، لحد ما كل القطع تتجمع ويبان الكود الحقيقي ----------

// شخصية فلات بسيطة رافعة إيديها فوق شايلة القطعة (SVG أصلي، مش منسوخ من أي تصميم)
function personSVG(bodyColor,legColor){
  return`<svg class="khCpCarrierSvg" viewBox="0 0 60 92" xmlns="http://www.w3.org/2000/svg">
    <rect x="17" y="55" width="10" height="30" rx="5" fill="${legColor}"/>
    <rect x="33" y="55" width="10" height="30" rx="5" fill="${legColor}"/>
    <line x1="18" y1="30" x2="9" y2="4" stroke="${bodyColor}" stroke-width="7" stroke-linecap="round"/>
    <line x1="42" y1="30" x2="51" y2="4" stroke="${bodyColor}" stroke-width="7" stroke-linecap="round"/>
    <rect x="14" y="26" width="32" height="34" rx="11" fill="${bodyColor}"/>
    <circle cx="30" cy="14" r="13" fill="#ffd9a0"/>
    <circle cx="25" cy="13" r="1.6" fill="#5a3b1f"/>
    <circle cx="35" cy="13" r="1.6" fill="#5a3b1f"/>
    <path d="M25 19 Q30 22 35 19" stroke="#5a3b1f" stroke-width="1.6" fill="none" stroke-linecap="round"/>
  </svg>`;
}

function runCouponAssembly(ticketEl,onDone){
  const rows=2,cols=3,N=rows*cols;
  const rect=ticketEl.getBoundingClientRect();
  const w=rect.width,h=rect.height;
  if(!w||!h){onDone&&onDone();return;}
  const pieceW=w/cols,pieceH=h/rows;

  ticketEl.style.visibility="hidden"; // الكود الحقيقي فضل مخفي تمامًا لحد ما كل القطع توصل — الشخصيات مش شايلة أي جزء من الكود نفسه

  const stage=document.createElement("div");
  stage.className="khCpAssembleStage";
  stage.style.cssText=`position:fixed;left:${rect.left}px;top:${rect.top}px;width:${w}px;height:${h}px;z-index:99999;pointer-events:none`;
  document.body.appendChild(stage);

  const GLYPHS=["🎁","🎉","✨","🧧","🎊","💝"];
  const PALETTE=[["#ffd23f","#a80f24"],["#ff8fa3","#7a1b2e"],["#8fd3ff","#12405c"],["#c6ff8f","#2f5c12"],["#ffb6e6","#6a1b52"],["#ffbf7a","#7a3b00"]];
  const EDGES=["top","bottom","left","right"];
  const vw=window.innerWidth,vh=window.innerHeight,M=130;

  let arrivedCount=0;
  for(let slotIndex=0;slotIndex<N;slotIndex++){
    const col=slotIndex%cols,row=Math.floor(slotIndex/cols);
    const targetX=rect.left+col*pieceW,targetY=rect.top+row*pieceH;
    const[bodyColor,legColor]=PALETTE[slotIndex%PALETTE.length];
    const glyph=GLYPHS[slotIndex%GLYPHS.length];
    const edge=EDGES[Math.floor(Math.random()*4)];

    let startX,startY;
    if(edge==="top"){startX=targetX+(Math.random()*120-60);startY=-M;}
    else if(edge==="bottom"){startX=targetX+(Math.random()*120-60);startY=vh+M;}
    else if(edge==="left"){startX=-M;startY=targetY+(Math.random()*80-40);}
    else{startX=vw+M;startY=targetY+(Math.random()*80-40);}

    const carrier=document.createElement("div");
    carrier.className="khCpCarrier";
    carrier.style.cssText=`position:fixed;left:0;top:0;width:46px;height:70px;transform:translate(${startX}px,${startY}px);transition:none;z-index:99999`;
    carrier.innerHTML=`<div class="khCpCarrierCard">${glyph}</div>${personSVG(bodyColor,legColor)}`;
    document.body.appendChild(carrier);

    const enterDelay=250+slotIndex*260+Math.random()*100;
    setTimeout(()=>{
      carrier.style.transition="transform .85s cubic-bezier(.3,.7,.3,1)";
      carrier.style.transform=`translate(${targetX-2}px,${targetY-38}px)`;
    },enterDelay);

    setTimeout(()=>{
      // القطعة توصل مكانها في الكوبون
      const tile=document.createElement("div");
      tile.className="khCpPiece";
      tile.style.cssText=`position:absolute;left:${col*pieceW}px;top:${row*pieceH}px;width:${pieceW}px;height:${pieceH}px`;
      tile.innerHTML=`<div class="khCpPieceInner"><span class="khCpPieceGlyph">${glyph}</span></div>`;
      stage.appendChild(tile);

      // والشخصية بترجع تمشي بره الشاشة من نفس الحافة اللي طلعت منها
      carrier.style.transition="transform .55s ease-in";
      if(edge==="top")carrier.style.transform=`translate(${startX}px,${-M}px)`;
      else if(edge==="bottom")carrier.style.transform=`translate(${startX}px,${vh+M}px)`;
      else if(edge==="left")carrier.style.transform=`translate(${-M}px,${startY}px)`;
      else carrier.style.transform=`translate(${vw+M}px,${startY}px)`;
      setTimeout(()=>carrier.remove(),600);

      arrivedCount++;
      if(arrivedCount===N){
        setTimeout(()=>{
          stage.classList.add("khCpPuzzleSolved");
          setTimeout(()=>{
            stage.remove();
            ticketEl.style.visibility="visible";
            onDone&&onDone();
          },380);
        },250);
      }
    },enterDelay+900);
  }
}

function showPopup(coupon){
  injectStyles();
  const valTxt=coupon.type==="percent"
    ?`خصم ${coupon.value}%`
    :`خصم ${Number(coupon.value).toLocaleString("ar-EG")} ج.م.`;
  const expLabel=daysLeftLabel(coupon.expiresAt);

  const overlay=document.createElement("div");
  overlay.id="khCpOverlay";
  overlay.innerHTML=`
    <div class="khCpCard" role="dialog" aria-label="كوبون خصم جديد">
      <div class="khCpRibbon">جديد</div>
      <div class="khCpInner">
        <button type="button" class="khCpClose" aria-label="إغلاق">✕</button>
        <div class="khCpTop">
          <span class="khCpGift">🎁</span>
          <div class="khCpTitle">مفاجأة! عندك كوبون خصم</div>
          <div class="khCpSub">استخدمه دلوقتي قبل ما ينتهي</div>
        </div>
        <div class="khCpTicket">
          <div class="khCpNotch l"></div><div class="khCpNotch r"></div>
          <div class="khCpBadge">COUPON</div>
          <div class="khCpVal">${valTxt}<span class="khCpCode">${coupon.code}</span></div>
        </div>
        <div class="khCpPuzzleHint">🎁 مبعوتين لك كوبونك دلوقتي...</div>
        ${expLabel?`<div class="khCpExp">${expLabel}</div>`:""}
        <button type="button" class="khCpBtn khCpBtnLocked" disabled>🎁 بيجهزولك الكوبون...</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  scatterDots(overlay.querySelector(".khCpTop"));
  requestAnimationFrame(()=>{overlay.classList.add("show");spawnMoneyRain();playCouponSound();});

  // نستنى لحد ما حركة فتح الكارت نفسها تخلص (تقريبًا نص ثانية) عشان مكان التذكرة يثبت،
  // وبعدين نبدأ الشخصيات تطلع من حواف الشاشة وتوصّل قطع الكود
  const ticketEl=overlay.querySelector(".khCpTicket");
  const btnEl=overlay.querySelector(".khCpBtn");
  const hintEl=overlay.querySelector(".khCpPuzzleHint");
  setTimeout(()=>{
    runCouponAssembly(ticketEl,()=>{
      btnEl.disabled=false;
      btnEl.classList.remove("khCpBtnLocked");
      btnEl.textContent="🎉 شوف الكوبون";
      if(hintEl)hintEl.remove();
    });
  },650); // بعد حركة فتح الكارت (٠.٤٥ ثانية على الموبايل / ٠.٦ ثانية على الكمبيوتر) عشان مكان التذكرة يثبت

  // الدائرة الصغيرة العائمة (بتظهر لما يقفل الكوبون، ولما يدوس عليها الكوبون يرجع يفتح)
  const bubble=document.createElement("div");
  bubble.className="khCpBubble";
  bubble.setAttribute("role","button");
  bubble.setAttribute("aria-label","افتح كوبون الخصم");
  bubble.innerHTML=`<span class="khCpBubblePulse"></span><span class="khCpBubbleIcon">🎁</span>`;
  document.body.appendChild(bubble);

  function minimize(){
    markSeen(coupon.id);
    overlay.classList.remove("show");
    setTimeout(()=>{overlay.style.display="none";},450);
    bubble.classList.add("show");
  }
  function restore(){
    bubble.classList.remove("show");
    overlay.style.display="flex";
    requestAnimationFrame(()=>overlay.classList.add("show"));
  }

  overlay.querySelector(".khCpClose").addEventListener("click",minimize);
  overlay.addEventListener("click",e=>{if(e.target===overlay)minimize();});
  bubble.addEventListener("click",restore);
  overlay.querySelector(".khCpBtn").addEventListener("click",()=>{
    markSeen(coupon.id);
    window.location.href=DISCOUNT_URL;
  });
}

// ---------- البدء ----------
async function init(){
  // مفيش داعي نزعج زائر عنده نافذة تسجيل دخول مفتوحة أو حاجة تانية شغالة فوق الصفحة
  const{email,name}=currentUser();

  let coupons=[];
  try{
    const snap=await get(ref(db,"coupons"));
    if(snap.exists()){const val=snap.val();coupons=Object.entries(val).map(([id,c])=>({id,...c}));}
  }catch(e){console.error("coupon-popup: تعذّر تحميل الأكواد",e);return;}

  const seen=getSeen();
  const candidate=coupons
    .filter(c=>eligible(c,email,name))
    .filter(c=>!seen.includes(c.id))
    .sort((a,b)=>(b.createdAt||0)-(a.createdAt||0))[0];

  if(candidate){
    // المتصفحات بتمنع تشغيل أي صوت بصوت فعلي إلا لو حصل جوه استجابة مباشرة لتفاعل حقيقي
    // من المستخدم (كليك/لمسة/زرار) — عشان كده بنخلي أول تفاعل من الزائر مع الصفحة (أي حتة فيها،
    // مش شرط الكوبون نفسه) هو اللي يفتح الكوبون؛ وساعتها الصوت والإيفكت بيبدأوا سوا في نفس اللحظة بالظبط.
    // ولو محدش اتفاعل خالص خلال أول ثانيتين، يظهر برضو كحل احتياطي (ساعتها ممكن الصوت يتأجل لحد أول تفاعل).
    let shown=false;
    const trigger=()=>{
      if(shown)return;
      shown=true;
      showPopup(candidate);
    };
    document.addEventListener("click",trigger,{once:true});
    document.addEventListener("touchstart",trigger,{once:true});
    document.addEventListener("keydown",trigger,{once:true});
    setTimeout(trigger,2000);
  }
}

if(document.readyState==="loading"){
  document.addEventListener("DOMContentLoaded",init);
}else{
  init();
}