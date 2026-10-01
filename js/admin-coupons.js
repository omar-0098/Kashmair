// ============================================================
//  🏷️ أكواد الخصم (كشمير هوم) — ملف: js/admin-coupons.js
//  اتنقل من admin.js لملف لوحده، بنفس أسلوب admin-stats.js.
//  admin.js بيستدعي initCoupons() مرة واحدة وباخد منه: vCoupons (شكل القسم) و bind (ربط الأزرار).
// ============================================================
export function initCoupons(ctx){
const{D,$,esc,fNum,toast,match,emptyBox,render,openModal,fb}=ctx;

// ---------- أدوات ----------
const fD=t=>t?new Date(t).toLocaleDateString("ar-EG",{year:"numeric",month:"short",day:"numeric"}):"—";
const toDateInput=t=>{const d=new Date(t);return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");};
const normCode=s=>String(s||"").trim().toUpperCase();
const genId=()=>"c"+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
function randomCode(){
  const chars="ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let s="";for(let i=0;i<8;i++)s+=chars[Math.floor(Math.random()*chars.length)];
  return s;
}
const field=(label,html,full)=>`<div style="${full?"grid-column:1/-1;":""}">${label?`<label style="display:block;font-size:12px;font-weight:800;color:var(--mut);margin-bottom:5px">${label}</label>`:""}${html}</div>`;
function refreshBadge(){const el=$("cntCoupons");if(el)el.textContent=fNum(D.coupons.length);}

// ---------- حالة الكود ----------
function statusOf(c){
  const now=Date.now();
  if(c.active===false) return{t:"متوقف",cls:"b0"};
  if(c.expiresAt&&now>c.expiresAt) return{t:"منتهي",cls:"b3"};
  if(c.startAt&&now<c.startAt) return{t:"لسه مبدأش",cls:"b1"};
  if(c.maxUses&&(c.usedCount||0)>=c.maxUses) return{t:"خلص الاستخدام",cls:"b2"};
  return{t:"نشط",cls:"b4"};
}
const targetLabel=c=>!c.targetType||c.targetType==="all"?`<span class="mut">كل العملاء</span>`:`<span title="${esc(c.targetValue)}">${c.targetType==="email"?"📧":"👤"} ${esc(c.targetValue)}</span>`;
const modeLabel=c=>{
  const parts=[];
  if(c.autoApply)parts.push(`<span class="badge b4" title="بيتطبق لوحده من غير ما العميل يكتب كود">🔁 تلقائي</span>`);
  else if(c.unlisted)parts.push(`<span class="badge b1" title="شغال بالكود، بس مش ظاهر في صفحة أكواد الخصم عند العميل">🙈 سبونسر</span>`);
  else parts.push(`<span class="mut">بكود</span>`);
  return parts.join(" ");
};
function validityLabel(c){
  if(!c.startAt&&!c.expiresAt) return `<span class="mut">بلا تاريخ انتهاء</span>`;
  if(c.startAt&&c.expiresAt) return `${esc(fD(c.startAt))} → ${esc(fD(c.expiresAt))}`;
  if(c.expiresAt) return `حتى ${esc(fD(c.expiresAt))}`;
  return `من ${esc(fD(c.startAt))}`;
}
const valueLabel=c=>c.type==="percent"?`${fNum(c.value)}%${c.maxDiscount?`<br><small class="mut">حد أقصى ${fNum(c.maxDiscount)} ج.م.</small>`:""}`:`${fNum(c.value)} ج.م.`;

// ---------- عرض القسم ----------
function vCoupons(){
  const rows=D.coupons.filter(c=>match([c.code,c.targetValue,c.note].join(" "))).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
  const tr=rows.map(c=>{
    const st=statusOf(c);
    return `<tr>
      <td><span class="code">${esc(c.code)}</span><br><small class="mut">${modeLabel(c)}</small>${c.note?`<br><small class="mut">${esc(c.note)}</small>`:""}</td>
      <td>${valueLabel(c)}${c.minOrder?`<br><small class="mut">لطلبات فوق ${fNum(c.minOrder)} ج.م.</small>`:""}</td>
      <td>${targetLabel(c)}</td>
      <td>${fNum(c.usedCount||0)}${c.maxUses?` / ${fNum(c.maxUses)}`:` <span class="mut">(بلا حد)</span>`}${c.maxUsesPerCustomer?`<br><small class="mut">${fNum(c.maxUsesPerCustomer)} لكل عميل</small>`:""}</td>
      <td>${validityLabel(c)}</td>
      <td><span class="badge ${st.cls}">${st.t}</span></td>
      <td style="white-space:nowrap">
        <button type="button" class="btn" data-cpedit="${esc(c.key)}">تعديل</button>
        <button type="button" class="btn" data-cptoggle="${esc(c.key)}">${c.active===false?"تفعيل":"إيقاف"}</button>
        <button type="button" class="btn red" data-cpdel="${esc(c.key)}">حذف</button>
      </td></tr>`;
  }).join("");
  return `<div class="card"><div class="card-h"><span><i class="fa-solid fa-tag"></i> أكواد الخصم (${fNum(rows.length)})</span><button type="button" class="btn solid" data-cpnew><i class="fa-solid fa-plus"></i> كود جديد</button></div>
    ${rows.length?`<div class="tw"><table><thead><tr><th>الكود</th><th>الخصم</th><th>مخصص لـ</th><th>الاستخدام</th><th>الصلاحية</th><th>الحالة</th><th></th></tr></thead><tbody>${tr}</tbody></table></div>`:emptyBox("fa-tag","مفيش أكواد خصم لسه — دوس «كود جديد» عشان تضيف أول كود")}
    <div class="hint">الكود العادي بيتطبق لما العميل يكتبه في السلة. الكود اللي عليه "🔁 تلقائي" بيتطبق لوحده لما إجمالي السلة يوصل لـ«أقل قيمة للطلب» اللي انت حددها، من غير ما العميل يكتب حاجة. الكود اللي عليه "🙈 سبونسر" شغال بالكود زي العادي، بس متعمّد إنه ميظهرش في صفحة «أكواد الخصم» بحساب العميل — يعلن عنه سبونسر أو انفلونسر بره الموقع.</div></div>`;
}

// ---------- فورم إنشاء/تعديل كود ----------
function openCouponForm(c){
  const html=`
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px">
      ${field("",`<label style="display:flex;align-items:center;gap:8px;cursor:pointer;background:var(--bg2,#f3f3f6);padding:10px 12px;border-radius:10px"><input type="checkbox" id="cpAuto"${c?.autoApply?" checked":""}> <b>تطبيق تلقائي</b> — يتطبق لوحده على السلة لما «أقل قيمة للطلب» تتحقق، من غير ما العميل يكتب أي كود</label>`,true)}
      ${field("",`<label style="display:flex;align-items:center;gap:8px;cursor:pointer;background:var(--bg2,#f3f3f6);padding:10px 12px;border-radius:10px"><input type="checkbox" id="cpUnlisted"${c?.unlisted?" checked":""}> <b>كود سبونسر / غير معلن</b> — الكود بيشتغل عادي لو العميل كتبه في السلة، بس مش هيظهر في صفحة «أكواد الخصم» بحسابه (استخدمه للأكواد اللي بتتعلن من انفلونسر أو سبونسر بره الموقع)</label>`,true)}
      ${field("كود الخصم",`<div style="display:flex;gap:8px"><input id="cpCode" class="inp" style="flex:1;text-transform:uppercase" dir="ltr" autocomplete="off" spellcheck="false" value="${esc(c?.code||"")}" placeholder="SAVE20"><button type="button" id="cpGen" class="btn" title="توليد كود عشوائي">عشوائي</button></div><small class="mut" id="cpCodeHint" style="display:${c?.autoApply?"block":"none"}">مش هيظهر للعميل ولا هيتطلب منه — مستخدم داخلياً بس للتعرف على الكود في اللوحة</small>`,true)}
      ${field("نوع الخصم",`<select id="cpType" class="sel" style="width:100%"><option value="percent"${c?.type!=="fixed"?" selected":""}>نسبة %</option><option value="fixed"${c?.type==="fixed"?" selected":""}>مبلغ ثابت (ج.م.)</option></select>`)}
      ${field("القيمة",`<input id="cpValue" type="number" min="0" step="0.01" class="inp" style="width:100%" value="${esc(c?.value??"")}" placeholder="مثلاً 20">`)}
      ${field("أقصى قيمة خصم (اختياري، للنسبة %)",`<input id="cpMaxDiscount" type="number" min="0" class="inp" style="width:100%" value="${esc(c?.maxDiscount??"")}" placeholder="بدون حد أقصى">`)}
      ${field("أقل قيمة للطلب (اختياري)",`<input id="cpMinOrder" type="number" min="0" class="inp" style="width:100%" value="${esc(c?.minOrder??"")}" placeholder="بدون حد أدنى">`)}
      ${field("مخصص لـ",`<select id="cpTarget" class="sel" style="width:100%"><option value="all"${!c||c.targetType==="all"?" selected":""}>كل العملاء</option><option value="email"${c?.targetType==="email"?" selected":""}>إيميل معين</option><option value="name"${c?.targetType==="name"?" selected":""}>اسم معين</option></select>`)}
      ${field("قيمة التخصيص",`<input id="cpTargetValue" class="inp" style="width:100%" value="${esc(c?.targetValue||"")}" placeholder="${c?.targetType==="name"?"اسم العميل بالكامل":"example@email.com"}"${!c||c.targetType==="all"?" disabled":""}>`,true)}
      ${field("تاريخ البداية (اختياري)",`<input id="cpStart" type="date" class="inp" style="width:100%" value="${c?.startAt?esc(toDateInput(c.startAt)):""}">`)}
      ${field("تاريخ الانتهاء (اختياري)",`<input id="cpExpires" type="date" class="inp" style="width:100%" value="${c?.expiresAt?esc(toDateInput(c.expiresAt)):""}">`)}
      ${field("أقصى عدد مرات استخدام (اختياري)",`<input id="cpMaxUses" type="number" min="1" class="inp" style="width:100%" value="${esc(c?.maxUses??"")}" placeholder="بدون حد">`)}
      ${field("أقصى عدد مرات لكل عميل (اختياري)",`<input id="cpMaxPerCustomer" type="number" min="1" class="inp" style="width:100%" value="${esc(c?.maxUsesPerCustomer??"")}" placeholder="بدون حد — سيبه فاضي">`)}
      ${field("",`<label style="display:flex;align-items:center;gap:8px;margin-top:23px;font-weight:800;cursor:pointer"><input type="checkbox" id="cpActive"${!c||c.active!==false?" checked":""}> الكود نشط</label>`)}
      ${field("ملاحظة داخلية (اختياري، مش هتظهر للعميل)",`<input id="cpNote" class="inp" style="width:100%" value="${esc(c?.note||"")}" placeholder="مثلاً: عرض العيد">`,true)}
    </div>
    <div class="del-err" id="cpErr" style="margin-top:10px"></div>
    <div style="display:flex;gap:10px;margin-top:16px">
      <button type="button" class="btn solid" id="cpSave" style="flex:1">${c?"حفظ التعديلات":"إنشاء الكود"}</button>
      <button type="button" class="btn" id="cpCancel">إلغاء</button>
    </div>`;
  openModal(c?`تعديل الكود ${c.code}`:"كود خصم جديد",html);

  $("cpTarget").onchange=()=>{
    const tv=$("cpTargetValue"),v=$("cpTarget").value;
    tv.disabled=v==="all";
    tv.placeholder=v==="email"?"example@email.com":v==="name"?"اسم العميل بالكامل":"";
    if(tv.disabled)tv.value="";
  };
  $("cpGen").onclick=()=>{$("cpCode").value=randomCode();};
  $("cpAuto").onchange=()=>{$("cpCodeHint").style.display=$("cpAuto").checked?"block":"none";};
  $("cpCancel").onclick=()=>$("modal").classList.remove("open");

  $("cpSave").onclick=async()=>{
    const err=$("cpErr");err.textContent="";
    const autoApply=$("cpAuto").checked;
    const unlisted=$("cpUnlisted").checked;
    let code=normCode($("cpCode").value);
    if(!code&&autoApply)code=normCode("AUTO-"+randomCode().slice(0,6));
    const type=$("cpType").value==="fixed"?"fixed":"percent";
    const value=parseFloat($("cpValue").value);
    const maxDiscount=$("cpMaxDiscount").value?parseFloat($("cpMaxDiscount").value):null;
    const minOrder=$("cpMinOrder").value?parseFloat($("cpMinOrder").value):null;
    const targetType=$("cpTarget").value;
    const targetValueRaw=$("cpTargetValue").value.trim();
    const startAt=$("cpStart").value?new Date($("cpStart").value+"T00:00:00").getTime():null;
    const expiresAt=$("cpExpires").value?new Date($("cpExpires").value+"T23:59:59").getTime():null;
    const maxUses=$("cpMaxUses").value?parseInt($("cpMaxUses").value):null;
    const maxUsesPerCustomer=$("cpMaxPerCustomer").value?parseInt($("cpMaxPerCustomer").value):null;
    const active=$("cpActive").checked;
    const note=$("cpNote").value.trim();

    if(!code){err.textContent="اكتب كود الخصم";return;}
    if(!/^[A-Za-z0-9_-]{3,20}$/.test(code)){err.textContent="الكود لازم يكون حروف/أرقام إنجليزي بس (٣-٢٠ خانة)";return;}
    const dup=D.coupons.find(x=>x.code.toUpperCase()===code&&x.key!==(c&&c.key));
    if(dup){err.textContent="فيه كود تاني بنفس الاسم ده";return;}
    if(!value||value<=0){err.textContent="اكتب قيمة الخصم";return;}
    if(type==="percent"&&value>100){err.textContent="نسبة الخصم متقدرش تزيد عن ١٠٠٪";return;}
    if(targetType!=="all"&&!targetValueRaw){err.textContent=`اكتب ${targetType==="email"?"الإيميل":"الاسم"} المخصص له الكود`;return;}
    if(startAt&&expiresAt&&startAt>expiresAt){err.textContent="تاريخ البداية لازم يكون قبل تاريخ الانتهاء";return;}
    if(autoApply&&!minOrder){err.textContent="الخصم التلقائي لازم يكون له «أقل قيمة للطلب» — دي القيمة اللي لما السلة توصلها الخصم يتطبق لوحده";return;}

    const data={
      code,type,value,
      maxDiscount:type==="percent"?maxDiscount:null,
      minOrder,targetType,
      targetValue:targetType==="all"?"":(targetType==="email"?targetValueRaw.toLowerCase():targetValueRaw),
      startAt,expiresAt,maxUses,maxUsesPerCustomer,
      usedCount:c?.usedCount||0,
      usedBy:c?.usedBy||null,
      active,autoApply,unlisted,note,
      createdAt:c?.createdAt||Date.now(),
      updatedAt:Date.now()
    };
    const key=c?c.key:genId();
    $("cpSave").disabled=true;
    try{
      await fb.update(fb.ref(fb.db),{[`coupons/${key}`]:data});
      if(c){Object.assign(c,data);}else{D.coupons.unshift({key,...data});refreshBadge();}
      toast(c?"✅ اتحفظت التعديلات":"✅ اتضاف الكود");
      $("modal").classList.remove("open");
      render();
    }catch(e){console.error(e);err.textContent="❌ حصل خطأ، جرّب تاني";$("cpSave").disabled=false;}
  };
}

// ---------- ربط الأزرار (بيتنادى من bind() في admin.js بعد كل render) ----------
function bindCoupons(){
  const nb=document.querySelector("[data-cpnew]");
  if(nb)nb.onclick=()=>openCouponForm(null);
  document.querySelectorAll("[data-cpedit]").forEach(b=>b.onclick=()=>{const c=D.coupons.find(x=>x.key===b.dataset.cpedit);if(c)openCouponForm(c);});
  document.querySelectorAll("[data-cpdel]").forEach(b=>b.onclick=async()=>{
    const c=D.coupons.find(x=>x.key===b.dataset.cpdel);if(!c)return;
    if(!confirm(`متأكد إنك عايز تحذف الكود "${c.code}" نهائياً؟`))return;
    b.disabled=true;
    try{
      await fb.remove(fb.ref(fb.db,`coupons/${c.key}`));
      D.coupons=D.coupons.filter(x=>x.key!==c.key);
      refreshBadge();
      toast("🗑️ اتحذف الكود");render();
    }catch(e){console.error(e);toast("❌ فشل حذف الكود");b.disabled=false;}
  });
  document.querySelectorAll("[data-cptoggle]").forEach(b=>b.onclick=async()=>{
    const c=D.coupons.find(x=>x.key===b.dataset.cptoggle);if(!c)return;
    const next=!(c.active!==false);
    b.disabled=true;
    try{
      await fb.update(fb.ref(fb.db),{[`coupons/${c.key}/active`]:next});
      c.active=next;
      toast(next?"✅ اتفعل الكود":"⏸️ اتوقف الكود");
      render();
    }catch(e){console.error(e);toast("❌ فشلت العملية");b.disabled=false;}
  });
}

return{vCoupons,bind:bindCoupons};
}