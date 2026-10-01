// رجوع العميل من EasyKash: بيعرض كود الدفع (فوري/أمان) أو حالة الدفع.
// EasyKash بيرجّع العميل لموقعك والرابط فيه: status و providerRefNum و voucher و customerReference.
(function(){
  const href=location.href;
  // بنقرا البارامترات بـ regex (مش URLSearchParams) عشان لو الفاصل اتلخبط بين ? و & الحالة تفضل شغّالة
  const pick=(k)=>{
    const m=href.match(new RegExp("[?&]"+k+"=([^&#]*)"));
    if(!m)return"";
    try{return decodeURIComponent(m[1].replace(/\+/g," "));}catch(e){return"";}
  };
  const orderId=pick("customerReference");
  if(!/^o[a-z0-9]{6,30}$/.test(orderId))return;          // مش راجع من دفع أونلاين عندنا

  const safe=(v)=>/^[A-Za-z0-9-]{1,40}$/.test(v)?v:"";   // القيم جاية من الرابط → بنقبل أرقام وحروف بس
  const status=pick("status").toUpperCase();
  const voucher=safe(pick("voucher"));
  const prov=safe(pick("providerRefNum"));
  const FAILED=["FAILED","EXPIRED","CANCELED","CANCELLED"];

  let icon,title,sub;
  if(status==="PAID"){
    icon="✅";title="تم الدفع بنجاح";
    sub="طلبك هيظهر في قايمة الطلبات تحت خلال لحظات. لو ماظهرش اعمل ريفريش للصفحة.";
  }else if(FAILED.includes(status)){
    icon="❌";title="لم تكتمل عملية الدفع";
    sub="تقدر ترجع للسلة وتحاول تاني، أو تختار طريقة دفع تانية.";
  }else if(voucher||prov){
    icon="🧾";title="كود الدفع بتاعك";
    sub="روح أي منفذ فوري أو أمان وادفع بالكود ده خلال 3 أيام. طلبك هيتأكد تلقائياً أول ما الدفع يتم.";
  }else{
    icon="⏳";title="بانتظار إتمام الدفع";
    sub="طلبك هيتأكد أول ما الدفع يتم.";
  }

  const el=(tag,css,text)=>{const e=document.createElement(tag);if(css)e.style.cssText=css;if(text!==undefined)e.textContent=text;return e;};

  function codeRow(label,code){
    const row=el("div","display:flex;align-items:center;justify-content:space-between;gap:10px;background:#f5f7fb;border-radius:10px;padding:10px 12px;margin-top:10px");
    const info=el("div","min-width:0");
    info.appendChild(el("div","font-size:12px;color:#667085",label));
    info.appendChild(el("div","font-size:22px;font-weight:800;letter-spacing:1.5px;direction:ltr;text-align:right",code));
    const btn=el("button","border:0;background:#0b6bff;color:#fff;border-radius:8px;padding:8px 14px;font-family:inherit;font-weight:700;cursor:pointer;flex-shrink:0","نسخ");
    btn.type="button";
    btn.addEventListener("click",function(){
      try{navigator.clipboard.writeText(code).then(function(){btn.textContent="تم النسخ ✓";});}catch(e){}
    });
    row.appendChild(info);row.appendChild(btn);
    return row;
  }

  function show(){
    // العميل بدأ الدفع أو خلصه → الطلب اتحفظ، فنفضّي السلة والكوبون
    if(status==="PAID"||(!FAILED.includes(status))){
      try{localStorage.setItem("cart","[]");localStorage.removeItem("kashmirCoupon");}catch(e){}
    }
    // افتح تبويب الطلبات
    try{
      const btn=Array.from(document.querySelectorAll(".nav-btn")).find(b=>(b.getAttribute("onclick")||"").includes("switchTab('orders'"));
      if(btn&&window.switchTab)window.switchTab("orders",btn);
    }catch(e){}

    const box=el("div","position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:99999;width:min(92vw,460px);background:#fff;border:1px solid #e3e8ef;border-radius:14px;box-shadow:0 12px 40px rgba(0,0,0,.2);padding:18px;font-family:'Cairo',sans-serif;color:#111;text-align:right");
    box.setAttribute("dir","rtl");
    box.appendChild(el("div","font-size:18px;font-weight:800",icon+" "+title));
    box.appendChild(el("p","font-size:13px;color:#475467;margin:8px 0 0;line-height:1.7",sub));
    if(!FAILED.includes(status)&&status!=="PAID"){
      if(voucher)box.appendChild(codeRow("كود الدفع (فوري / أمان)",voucher));
      if(prov)box.appendChild(codeRow(voucher?"الرقم المرجعي":"رقم الدفع المرجعي",prov));
    }
    const close=el("button","margin-top:14px;width:100%;border:1px solid #d0d5dd;background:#fff;border-radius:8px;padding:9px;font-family:inherit;font-weight:700;cursor:pointer","تمام");
    close.type="button";
    close.addEventListener("click",function(){box.remove();});
    box.appendChild(close);
    document.body.appendChild(box);
  }

  // على load عشان account.js يكون خلّص وعرّف switchTab
  window.addEventListener("load",show);
})();
