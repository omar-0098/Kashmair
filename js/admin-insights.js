// ============================================================
//  🧠 التحليل والتوصيات (كشمير هوم) — ملف: js/admin-insights.js
//  بيقرا نفس بيانات الإحصائيات (طلبات + زيارات + ضغطات + تعليقات) ويطلّع:
//   • منتجات مبيعاتها/زياراتها بتقل — مع الدليل بالأرقام والسبب المحتمل والحل
//   • أسرع طرق لزيادة البيع (باقات، توقيت، فرص مخفية، شحن)
//  كل استنتاج معاه الأرقام اللي اتبنى عليها + درجة الثقة حسب حجم العيّنة.
//  الحدود (TH) تحت تقدر تعدّلها لو متجرك صغير/كبير.
// ============================================================
export const TH={
  minViews:30,       // أقل عدد زيارات نحكم بيه على معدل الشراء
  minCatViews:30,    // أقل زيارات لصفحة القسم نحكم بيها على الضغطات
  lowConv:0.5,       // معدل الشراء أقل من نص متوسط القسم = ضعيف
  lowVisibility:0.5, // زياراته أقل من نص متوسط القسم = ظهوره ضعيف
  dropPct:0.30,      // نزول ٣٠٪ فأكتر = تراجع
  catDropPct:0.20,   // نزول القسم/الموقع ٢٠٪ = تراجع عام
  minPrev:2,         // أقل مبيعات في الفترة اللي قبل عشان نقارن
  minPrevViews:10,   // أقل زيارات في الفترة اللي قبل عشان نقارن
  staleDays:45,      // من غير بيع = راكد
  priceHigh:1.25,    // سعره أعلى من وسيط القسم بـ ٢٥٪
  shipHigh:0.15,     // الشحن ١٥٪ من قيمة الطلب أو أكتر
  negRating:3.5,     // متوسط تقييم واطي
  cancelRate:0.25    // نسبة إلغاء عالية
};

const DAY=864e5;
const sod=t=>{const d=new Date(t);d.setHours(0,0,0,0);return d.getTime();};
const median=a=>{if(a.length<3)return 0;const s=[...a].sort((x,y)=>x-y),m=s.length>>1;return s.length%2?s[m]:(s[m-1]+s[m])/2;};
const SEV={high:{l:"أولوية عالية",c:"#e63757",bg:"#fde8ec",w:3},med:{l:"أولوية متوسطة",c:"#d9670f",bg:"#fff1e6",w:2},low:{l:"للمتابعة",c:"#2c7be5",bg:"#eaf1ff",w:1},good:{l:"نقطة قوة",c:"#00a15c",bg:"#e6f8ef",w:0}};

function injectCss(){
  if(typeof document==="undefined"||document.getElementById("adminInsCss"))return;
  const s=document.createElement("style");s.id="adminInsCss";
  s.textContent=`
  .ins{border:1px solid var(--line,#e3ebf6);border-radius:14px;background:#fff;margin:0 0 14px;overflow:hidden}
  .ins-h{display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap;padding:14px 18px;border-bottom:1px solid var(--line,#e3ebf6);background:#fafcff}
  .ins-m{display:flex;gap:8px;flex-wrap:wrap}
  .ins-m span{background:#f1f4f9;border-radius:8px;padding:4px 10px;font-size:12px;color:#516078}
  .ins-m span b{color:#1f2937}
  .fnd{padding:14px 18px;border-top:1px dashed var(--line,#e3ebf6)}
  .fnd:first-of-type{border-top:none}
  .fnd-t{display:flex;gap:8px;align-items:center;flex-wrap:wrap;font-weight:800;margin-bottom:8px}
  .tag{border-radius:20px;padding:2px 10px;font-size:11.5px;font-weight:800}
  .ev{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px}
  .ev i{font-style:normal;background:#eef4ff;border:1px solid #d7e5fb;border-radius:8px;padding:4px 10px;font-size:12.5px}
  .ev i b{color:#1b4fa8}
  .fc{display:grid;grid-template-columns:1fr 1fr;gap:16px}
  @media(max-width:820px){.fc{grid-template-columns:1fr}}
  .fc h6{margin:0 0 6px;font-size:12.5px;color:#7c8aa0}
  .fc ul,.fc ol{margin:0;padding:0 18px 0 0;font-size:13px;line-height:1.95}
  .conf{font-size:11.5px;color:#9da9bb}
  .plan{display:flex;gap:12px;align-items:flex-start;padding:12px 18px;border-top:1px solid var(--line,#e3ebf6)}
  .plan:first-child{border-top:none}
  .plan .n{flex:0 0 28px;height:28px;border-radius:50%;background:#2c7be5;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px}
  
  .pth{position:relative;border-radius:9px;overflow:hidden;background:#eef1f6;flex-shrink:0;display:flex;align-items:center;justify-content:center;color:#9da9bb}
  .pth img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;cursor:zoom-in;transition:transform .15s}
  .pth img:hover{transform:scale(1.06)}
  .pc{display:flex;align-items:center;gap:10px;min-width:0}
  .pc a,.pc b{font-weight:800;line-height:1.5}
  .pc a{color:var(--pri,#2c7be5)}
  #insZoom{position:fixed;inset:0;z-index:100000;background:rgba(10,15,30,.86);display:none;align-items:center;justify-content:center;flex-direction:column;gap:12px;padding:20px;cursor:zoom-out}
  #insZoom.open{display:flex}
  #insZoom img{max-width:94vw;max-height:80vh;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,.5);background:#fff}
  #insZoom div{color:#fff;font-weight:700;font-size:14px;text-align:center;max-width:90vw}
  `;
  document.head.appendChild(s);
}

// ---------- تكبير الصور بضغطة واحدة (delegated — بيشتغل مع أي render جديد من غير إعادة ربط) ----------
if(typeof document!=="undefined"&&!window.__insZoom){
  window.__insZoom=true;
  const close=()=>{const z=document.getElementById("insZoom");if(z)z.classList.remove("open");};
  document.addEventListener("click",e=>{
    const t=e.target;if(!t||!t.closest)return;
    const z=t.closest("[data-zoom]");
    if(z){
      e.preventDefault();e.stopPropagation();
      let box=document.getElementById("insZoom");
      if(!box){box=document.createElement("div");box.id="insZoom";box.innerHTML="<img alt=''><div></div>";box.addEventListener("click",close);document.body.appendChild(box);}
      box.querySelector("img").src=z.dataset.zoom;box.querySelector("div").textContent=z.dataset.cap||"";box.classList.add("open");return;
    }
  },true);
  document.addEventListener("keydown",e=>{if(e.key==="Escape")close();});
}

export function createInsights(env){
  const{D,esc,fNum,money,resolveItem,sKey,catName,statChip,isNegative}=env;
  const fM=n=>fNum(Math.round((n||0)*100)/100)+" ج.م.";
  const fp=v=>fNum(Math.round(v*1000)/10)+"٪";
  const chg=x=>`${x<0?"▼":"▲"} ${fNum(Math.abs(Math.round(x*100)))}٪`;
  const dlt=(c,p)=>p>0?(c-p)/p:null;
  const conf=n=>n>=100?"ثقة عالية":n>=TH.minViews?"ثقة متوسطة":"استرشادي (عيّنة صغيرة)";
  const nm=p=>p.name||env.findProduct(p.key)?.name||p.docId||String(p.key).replace(/^n:/,"");
  const imgOf=p=>p.img||env.findProduct(p.key)?.img||(p.docId?env.findProduct(p.docId)?.img:"")||"";
  // صورة صغيرة (بضغطة واحدة بتتكبّر)
  function thumb(p,size=40){
    const src=imgOf(p);
    return `<div class="pth" style="width:${size}px;height:${size}px"><i class="fa-solid fa-box"></i>${src?`<img src="${esc(src)}" alt="" loading="lazy" data-zoom="${esc(src)}" data-cap="${esc(nm(p))}" title="اضغط لتكبير الصورة" onerror="this.remove()">`:""}</div>`;
  }
  // صورة + اسم (لينك لصفحة المنتج)
  function pchip(p,size=40){
    const link=(p.col&&p.docId)?`../Furniture/item.html?col=${encodeURIComponent(p.col)}&docId=${encodeURIComponent(p.docId)}`:null;
    const n=esc(nm(p));
    return `<div class="pc">${thumb(p,size)}<div>${link?`<a href="${esc(link)}" target="_blank" rel="noopener">${n}</a>`:`<b>${n}</b>`}</div></div>`;
  }


  // ---------------------------------------------------------------- التحليل
  function analyze(N){
    const now=Date.now(),today=sod(now),curS=today-(N-1)*DAY,curE=today+DAY,prevS=curS-N*DAY;
    const inC=t=>t>=curS&&t<curE,inP=t=>t>=prevS&&t<curS;
    const A=D.analytics||{},daily=A.daily||{};
    const dayKeys=Object.keys(daily).filter(k=>/^\d{4}-\d{2}-\d{2}$/.test(k)).sort();
    const firstDay=dayKeys.length?new Date(dayKeys[0]+"T00:00:00").getTime():null;
    const daysTracked=firstDay!=null?Math.floor((today-firstDay)/DAY)+1:0;
    const covPrev=firstDay!=null&&firstDay<=prevS+DAY;

    // زيارات يومية
    const pv={},cv={};let sV={vc:0,vp:0};
    dayKeys.forEach(dk=>{
      const t=new Date(dk+"T00:00:00").getTime(),w=inC(t)?"c":inP(t)?"p":null;if(!w)return;
      const d=daily[dk]||{};
      Object.entries(d.p||{}).forEach(([k,v])=>{const o=pv[k]||(pv[k]={vc:0,vp:0,cc:0,cp:0});o["v"+w]+=Number(v&&v.v)||0;o["c"+w]+=Number(v&&v.c)||0;});
      Object.entries(d.c||{}).forEach(([c,v])=>{const n=(Number(v&&v.v)||0)+(Number(v&&v.iv)||0),o=cv[c]||(cv[c]={vc:0,vp:0});o["v"+w]+=n;sV["v"+w]+=n;});
    });

    // المنتجات
    const P={};
    const gp=k=>P[k]||(P[k]={key:k,col:"",docId:"",name:"",img:"",listed:false,listPrice:0,unit:0,views:0,clicks:0,sold:0,orders:0,revenue:0,sc:0,sp:0,oc:0,op:0,last:0,canc:0,cm:0,rs:0,rn:0,neg:0,shipSum:0,totSum:0,F:[]});
    const seen=new Set();
    Object.values(D.products||{}).forEach(p=>{
      if(!p||seen.has(p)||p.col===undefined||p.docId===undefined)return;seen.add(p);
      const x=gp(sKey(`${p.col}-${p.docId}`));x.listed=true;x.col=String(p.col);x.docId=String(p.docId);
      x.name=p.name||p.title||"";x.img=p.img||p.image||"";x.listPrice=money(p.price);
    });
    Object.entries(A.products||{}).forEach(([k,v])=>{
      if(!v)return;const x=gp(k);x.col=x.col||v.col||"";x.docId=x.docId||v.docId||"";
      x.views=Number(v.views)||0;x.clicks=Number(v.clicks)||0;
    });
    const pairs={},hours=Array(6).fill(0),wdays=Array(7).fill(0);
    let totTotal=0,totShip=0;
    (D.orders||[]).forEach(o=>{
      const t=o.createdAt||0,f=money(o.total),sh=money(o.shipping);
      totTotal+=f;totShip+=sh;
      if(t){const d=new Date(t);wdays[d.getDay()]++;hours[Math.floor(d.getHours()/4)]++;}
      const keys=new Set();
      (Array.isArray(o.items)?o.items:[]).forEach(it=>{
        if(!it)return;
        const r=resolveItem(it),q=parseInt(it.qty)||1,rev=q*money(it.price),x=gp(r.key);
        x.col=x.col||r.col;x.docId=x.docId||r.docId;x.name=x.name||r.name;x.img=x.img||r.img;
        x.sold+=q;x.revenue+=rev;
        if(inC(t)){x.sc+=q;}else if(inP(t)){x.sp+=q;}
        if(t>x.last)x.last=t;
        if(!keys.has(r.key)){keys.add(r.key);x.orders++;x.shipSum+=sh;x.totSum+=f;if(inC(t))x.oc++;else if(inP(t))x.op++;}
      });
      const ks=[...keys].sort();
      for(let i=0;i<ks.length;i++)for(let j=i+1;j<ks.length;j++){const pk=ks[i]+"||"+ks[j];pairs[pk]=(pairs[pk]||0)+1;}
    });
    (D.cancelled||[]).forEach(o=>(Array.isArray(o.items)?o.items:[]).forEach(it=>{if(it)gp(resolveItem(it).key).canc+=parseInt(it.qty)||1;}));
    (D.comments||[]).forEach(c=>{const x=gp(sKey(c.itemId));x.cm++;if(c.rating){x.rs+=Number(c.rating)||0;x.rn++;}if(isNegative(c))x.neg++;});

    const list=Object.values(P).filter(p=>p.listed||p.views||p.clicks||p.sold);
    list.forEach(p=>{
      p.unit=p.sold?p.revenue/p.sold:p.listPrice;
      p.conv=p.views?Math.min(1,p.orders/p.views):null;
      p.avgRate=p.rn?p.rs/p.rn:null;
      p.dpu=p.sc?N/p.sc:null;
      p.daysSince=p.last?Math.floor((now-p.last)/DAY):null;
      const v=pv[p.key]||{vc:0,vp:0,cc:0,cp:0};p.v=v;
    });

    // الأقسام
    const C={};
    list.forEach(p=>{
      const c=sKey(p.col||""),y=C[c]||(C[c]={key:c,col:p.col||"",items:[],views:0,orders:0,clicks:0,sc:0,sp:0,prices:[]});
      y.items.push(p);y.views+=p.views;y.orders+=p.orders;y.clicks+=p.clicks;y.sc+=p.sc;y.sp+=p.sp;
      if(p.unit>0&&p.sold>0)y.prices.push(p.unit);
    });
    const sViews=list.reduce((s,p)=>s+p.views,0),sOrders=list.reduce((s,p)=>s+p.orders,0);
    const storeConv=sViews?Math.min(1,sOrders/sViews):null;
    Object.values(C).forEach(y=>{
      const a=(A.categories||{})[y.key]||{},v=cv[y.key]||{vc:0,vp:0};
      y.page=Number(a.views)||0;y.vc=v.vc;y.vp=v.vp;
      y.conv=y.views?Math.min(1,y.orders/y.views):storeConv;
      y.meanViews=y.items.length?y.views/y.items.length:0;
      y.meanClicks=y.items.length?y.clicks/y.items.length:0;
      y.med=median(y.prices);
      y.top=[...y.items].sort((a,b)=>b.sold-a.sold)[0];
    });

    // ------------------------------------------------------------ القواعد
    const storeVd=dlt(sV.vc,sV.vp);
    list.forEach(p=>{
      const y=C[sKey(p.col||"")],cc=y.conv,F=p.F;
      const add=f=>F.push(f);
      const shipShare=p.totSum?p.shipSum/p.totSum:null;
      const rate=p.rn>=2&&p.avgRate!=null&&p.avgRate<=TH.negRating;
      const cRate=(p.canc+p.sold)?p.canc/(p.canc+p.sold):0;

      // 0) المنتج من غير صورة (بيضعف الثقة والضغطات بصرف النظر عن أي حاجة تانية)
      if(p.listed&&!imgOf(p)&&(p.views>=5||p.sold>0)){
        add({sev:"high",title:"المنتج من غير صورة واضحة",
          ev:[["الزيارات",fNum(p.views)],["المباع",fNum(p.sold)]],
          why:["مفيش صورة مربوطة بالمنتج في ملف المنتجات أو في الطلبات — والصورة أهم عامل بيخلّي حد يضغط أو يشتري.","العملاء غالباً بيتخطوه في صفحة القسم لأنه شكله ناقص."],
          act:["ارفع صورة حقيقية واضحة للمنتج بإضاءة كويسة كأول خطوة.","صوّر المنتج من زاويتين على الأقل (عام + قريب للخامة).","اتأكد إن اسم ملف الصورة أو رابطها متسجّل صح في ملف المنتجات."],
          impact:0,note:"فحص مباشر على بيانات المنتج (مش تقدير)"});
      }

      // 1) زيارات كتير ومبيعات ضعيفة
      if(p.views>=TH.minViews&&cc!=null&&(p.conv||0)<cc*TH.lowConv){
        const gap=Math.max(0,Math.round(p.views*(cc-(p.conv||0))));
        const why=[],act=[];
        const hiPrice=p.unit>0&&y.med>0&&p.unit>=y.med*TH.priceHigh;
        if(hiPrice){why.push(`<b>السعر:</b> ${fM(p.unit)} أعلى من وسيط القسم (${fM(y.med)}) بنسبة ${fp(p.unit/y.med-1)} — سبب مرجّح.`);act.push("جرّب خصم ١٠–١٥٪ أو عرض محدود أسبوعين وقارن معدل الشراء قبل/بعد.");}
        else if(p.unit>0&&y.med>0)why.push(`<b>السعر:</b> ${fM(p.unit)} قريب من وسيط القسم (${fM(y.med)}) — غالباً مش هو السبب الأساسي.`);
        else why.push("<b>السعر:</b> مفيش مبيعات كفاية لمقارنته بالقسم — راجعه مقابل المنافسين.");
        if(shipShare!=null&&shipShare>=TH.shipHigh){why.push(`<b>الشحن:</b> بيمثّل ${fp(shipShare)} من قيمة الطلبات اللي فيها المنتج ده.`);act.push("قلّل الشحن أو حط شحن مجاني فوق حد معيّن.");}
        if(p.neg||rate){why.push(`<b>التقييمات:</b> ${p.neg?fNum(p.neg)+" تعليق سلبي":""}${p.neg&&rate?" · ":""}${rate?"متوسط "+fNum(Math.round(p.avgRate*10)/10)+" من ٥":""}.`);act.push("رد على التعليقات السلبية وعالج السبب (مقاس/خامة/توصيل) وأضف رابط الرد في الوصف.");}
        if(p.canc){why.push(`<b>الإلغاء:</b> ${fNum(p.canc)} قطعة اتلغت.`);}
        why.push("<b>صفحة المنتج:</b> لو كل اللي فوق سليم يبقى المشكلة في الصور/الوصف/توضيح المقاس والخامة أو التوفّر.");
        act.push("غيّر أول ٣ صور (صورة حقيقية في الاستخدام + قريبة للخامة) واكتب وصف واضح بالمقاس والألوان ومدة التوصيل.","ضيف فيديو قصير (١٥ ثانية) أو صورة توضّح المقاس والاستخدام.","حط أفضل ٣ تقييمات أو صور عملاء في أول الصفحة (إثبات اجتماعي).","وضّح الدفع عند الاستلام وسياسة الاستبدال/الاسترجاع تحت زرار الطلب مباشرة.","ضيف زرار واتساب «اسأل عن المنتج» — أغلب أسئلة المقاس والخامة بتتحسم هناك.","غيّر عنصر واحد كل مرة وراقب معدل الشراء أسبوع عشان تعرف إيه اللي أثّر.");
        add({sev:p.sold?"med":"high",title:p.sold?"زيارات كويسة لكن معدل الشراء ضعيف":"زيارات ومفيش ولا عملية بيع",
          ev:[["الزيارات",fNum(p.views)],["الطلبات",fNum(p.orders)],["معدل الشراء",fp(p.conv||0)],["متوسط القسم",fp(cc)]],
          why,act,impact:gap,note:`لو وصل لمتوسط القسم تقديرياً +${fNum(gap)} طلب على نفس الزيارات · ${conf(p.views)}`});
      }

      // 2) منتج مخفي (بيتحوّل كويس لكن قليل الظهور)
      if(y.items.length>=3&&y.meanViews>=10&&p.views<y.meanViews*TH.lowVisibility&&p.orders>=1&&p.conv!=null&&cc!=null&&p.conv>=cc){
        const extra=Math.round((y.meanViews-p.views)*p.conv);
        add({sev:"med",title:"منتج مخفي: بيتباع كويس لكن مش بيتشاف",
          ev:[["زياراته",fNum(p.views)],["متوسط القسم",fNum(Math.round(y.meanViews))],["معدل شرائه",fp(p.conv)],["متوسط القسم",fp(cc)]],
          why:["الناس اللي بتوصله بتشتري بنسبة أحسن من المتوسط، فالمشكلة في الظهور مش في المنتج نفسه.","غالباً ترتيبه في صفحة القسم أو صورة الغلاف مش بتلفت."],
          act:["حطه في أول القسم وفي الصفحة الرئيسية كـ«الأكثر طلباً».","انشره في بوست/ستوري بصورة قوية مع رابط مباشر.","حسّن صورة الغلاف والعنوان في صفحة القسم.","جرّب عرض محدود ٤٨ ساعة عليه في ستوري/بوست.","ابعت رابطه مباشرة للعملاء اللي اشتروا من نفس القسم."],
          impact:extra,note:`لو وصل لمتوسط زيارات القسم تقديرياً +${fNum(extra)} طلب · ${conf(p.orders*10)}`});
      }

      // 3) ضغطات ضعيفة من صفحة القسم
      if(y.page>=TH.minCatViews&&y.items.length>=3&&y.meanClicks>=3&&p.clicks<y.meanClicks*0.5){
        add({sev:"low",title:"الناس بتعدّي عليه في صفحة القسم (ضغطات قليلة)",
          ev:[["ضغطاته",fNum(p.clicks)],["متوسط القسم",fNum(Math.round(y.meanClicks*10)/10)],["زيارات صفحة القسم",fNum(y.page)]],
          why:["صورة الغلاف أو الاسم في القايمة مش مغرية مقارنة بباقي المنتجات.","ممكن مكانه في آخر الصفحة."],
          act:["استبدل صورة الغلاف بصورة أوضح وإضاءة أحسن.","اكتب اسم يوضح الفايدة (الخامة + المقاس) وقرّبه لأول الصفحة.","حط شارة مميزة على الغلاف (مثلاً «الأكثر طلباً» أو «جديد») لو ينطبق.","اعرض السعر بوضوح على الغلاف — السعر المخفي بيقلل الضغطات."],impact:0,note:conf(y.page)});
      }

      // 4) تراجع المبيعات
      if(p.sp>=TH.minPrev&&p.sc<=p.sp*(1-TH.dropPct)){
        const d=dlt(p.sc,p.sp),vd=(covPrev&&p.v.vp>=TH.minPrevViews)?dlt(p.v.vc,p.v.vp):null;
        const cd=dlt(y.sc,y.sp),why=[],act=[];
        let sev="high";
        if(vd!=null&&vd<=-0.25){why.push(`<b>مشكلة زيارات:</b> الزيارات نزلت ${chg(vd)} (من ${fNum(p.v.vp)} إلى ${fNum(p.v.vc)}) — يعني الناس قلّت اللي بتوصله.`);act.push("زوّد الظهور: الصفحة الرئيسية + بوست/إعلان بصورة قوية.");}
        else if(vd!=null){
          const cP=p.v.vp?p.op/p.v.vp:null,cC=p.v.vc?p.oc/p.v.vc:null;
          if(cP!=null&&cC!=null&&cC<cP*0.7){why.push(`<b>مشكلة تحويل:</b> الزيارات ثابتة تقريباً (${chg(vd)}) لكن معدل الشراء نزل من ${fp(cP)} إلى ${fp(cC)} — حاجة اتغيّرت في المنتج (سعر/توفّر/صور/شحن/تعليق سلبي).`);act.push("راجع آخر تعديل عملته على المنتج (سعر، صور، وصف) وارجع للنسخة اللي كانت شغالة لو لقيت تغيير.");}
          else why.push(`الزيارات (${chg(vd)}) ومعدل الشراء مش متغيرين بشكل واضح — النزول ممكن يكون عشوائي/موسمي في عيّنة صغيرة.`);
        }else{why.push(covPrev?"زيارات المنتج قليلة للفترة اللي قبل، فمينفعش نفرّق بين مشكلة زيارات ومشكلة تحويل.":`لسه مفيش تتبّع يومي كفاية (${fNum(daysTracked)} يوم) للتفريق بين مشكلة الزيارات والتحويل — هيظهر بعد ما تتغطى الفترتين.`);}
        if(cd!=null&&y.sp>=3){
          if(cd<=-TH.catDropPct){why.push(`<b>القسم كله نازل:</b> مبيعات القسم ${chg(cd)} — السبب غالباً عام (موسم، إعلانات وقفت، مصدر الزيارات).`);sev="med";}
          else why.push(`القسم مش نازل (${chg(cd)})، فالمشكلة <b>خاصة بالمنتج ده</b> مش بالسوق.`);
        }
        if(p.neg)why.push(`في ${fNum(p.neg)} تعليق سلبي على المنتج.`);
        if(p.daysSince!=null&&p.daysSince>=14)why.push(`آخر بيع من ${fNum(p.daysSince)} يوم.`);
        act.push("اعرض المنتج كباقة مع الأكثر مبيعاً في القسم.","ابعت عرض لمن اشترى منتجات القسم قبل كده (واتساب/رسالة).","اعمل عرض «لفترة محدودة» ٧ أيام بعدها ارجع للسعر الأصلي.","اطلب تقييم من آخر ٣ عملاء اشتروه وحطه في الصفحة.");
        add({sev,title:"تراجع في المبيعات",
          ev:[["قبل",fNum(p.sp)+" قطعة"],["دلوقتي",fNum(p.sc)+" قطعة"],["التغيّر",chg(d)]],
          why,act,impact:p.sp-p.sc,note:`المقارنة بين آخر ${fNum(N)} يوم والفترة اللي قبلها · ${p.sp>=5?"ثقة متوسطة":"استرشادي (مبيعات قليلة)"}`});
      }

      // 5) تراجع الزيارات (إنذار مبكر)
      if(covPrev&&p.v.vp>=TH.minPrevViews&&p.v.vc<=p.v.vp*(1-TH.dropPct)){
        const d=dlt(p.v.vc,p.v.vp),cd=y.vp>=TH.minPrevViews?dlt(y.vc,y.vp):null;
        const scope=(storeVd!=null&&storeVd<=-TH.catDropPct)?"site":(cd!=null&&cd<=-TH.catDropPct)?"cat":"prod";
        add({sev:d<=-0.5?"high":"med",title:"زيارات المنتج بتقل",
          ev:[["قبل",fNum(p.v.vp)],["دلوقتي",fNum(p.v.vc)],["التغيّر",chg(d)],["نطاق المشكلة",scope==="site"?"الموقع كله":scope==="cat"?"القسم كله":"المنتج بس"]],
          why:visitCauses(scope,p,y,cd,storeVd),act:visitActs(scope),impact:0,note:conf(p.v.vp*3)});
      }

      // 6) راكد / مش بيتشاف
      if(p.sold===0&&p.views<5&&daysTracked>=7&&p.listed){
        add({sev:"med",title:"مش بيتشاف ولا بيتباع",
          ev:[["زياراته",fNum(p.views)],["مبيعاته","٠"],["أيام التتبع",fNum(daysTracked)]],
          why:["عدد الزيارات شبه صفر — يعني الناس مش بتوصله أصلاً (مش إنه مش عاجبهم).","ممكن مكانه في آخر القسم أو مش ظاهر في أي بوست."],
          act:["حطه ضمن باقة مع أكتر منتج مبيعاً في قسمه"+(y.top&&y.top.sold?` («${esc(nm(y.top))}» اتباع ${fNum(y.top.sold)} قطعة)`:"")+".","اعمله بوست تعريفي أو عرض إطلاق، وقرّبه لأول القسم.","لو فعلاً مالوش طلب: خصّمه للتصفية وفضّي المكان.","اطلب من صاحب الصفحة/الأدمن يثبّته في أول القسم أسبوع كامل كاختبار."],impact:0,note:"عيّنة تتبّع "+fNum(daysTracked)+" يوم"});
      }else if(p.sold>0&&p.daysSince!=null&&p.daysSince>=TH.staleDays){
        add({sev:"low",title:"راكد من فترة",
          ev:[["آخر بيع",`من ${fNum(p.daysSince)} يوم`],["إجمالي المباع",fNum(p.sold)]],
          why:["اتباع قبل كده يعني في طلب عليه — غالباً قلّ ظهوره."],act:["رجّعه للواجهة بعرض أو ضمن باقة.","اسأل اللي اشتروه قبل كده عن رأيهم وحط التقييم في صفحته.","اعمل عرض تصفية محدود لو المخزون واقف."],impact:0,note:""});
      }

      // 7) جودة / إلغاء
      if(rate||cRate>=TH.cancelRate&&p.canc>=1){
        add({sev:"high",title:"إشارات جودة/التزام",
          ev:[...(rate?[["متوسط التقييم",fNum(Math.round(p.avgRate*10)/10)+" / ٥"]]:[]),...(p.canc?[["قطع ملغية",fNum(p.canc)],["نسبة الإلغاء",fp(cRate)]]:[]),...(p.neg?[["تعليقات سلبية",fNum(p.neg)]]:[])],
          why:["التقييم الواطي والإلغاء بيقلّلوا الثقة وبيوطّوا معدل الشراء لباقي الزوار.","السبب الشائع: اختلاف الصورة عن الحقيقة، مقاس غلط، تأخير توصيل."],
          act:["راجع التعليقات والطلبات الملغية للمنتج ده واعرف السبب بالظبط.","صحّح الوصف/الصور بناءً عليها، وكلّم العملاء الغاضبين.","ضيف جدول مقاسات واضح/مواصفات دقيقة، وصوّر المنتج في ضوء طبيعي.","لو المشكلة توصيل: اكتب مدة التوصيل الفعلية في الصفحة."],impact:0,note:"من التعليقات والطلبات الملغية"});
      }
    });

    // نجوم
    const sorted=[...list].sort((a,b)=>b.sold-a.sold);
    const stars=sorted.filter(p=>p.sold>=3&&p.conv!=null&&(C[sKey(p.col||"")].conv==null||p.conv>=C[sKey(p.col||"")].conv)).slice(0,5);
    const withF=list.filter(p=>p.F.length).sort((a,b)=>{
      const sa=Math.max(...a.F.map(f=>SEV[f.sev].w)),sb=Math.max(...b.F.map(f=>SEV[f.sev].w));
      const ia=a.F.reduce((s,f)=>s+f.impact,0),ib=b.F.reduce((s,f)=>s+f.impact,0);
      return sb-sa||ib-ia;
    });
    return{N,list,C,P,withF,stars,storeConv,sViews,sOrders,sV,storeVd,covPrev,daysTracked,firstDay,pairs,hours,wdays,totTotal,totShip,ordersN:(D.orders||[]).length,cancN:(D.cancelled||[]).length,curS,prevS,pv,cv};
  }

  function visitCauses(scope,p,y,cd,sd){
    const cl=(p.v.cp>=5&&p.v.cc<=p.v.cp*0.7)?`الضغطات عليه برضو قلّت (${fNum(p.v.cp)} ← ${fNum(p.v.cc)}) — يعني مكانه/صورته في القايمة بقت أضعف.`:null;
    if(scope==="site")return[`<b>الموقع كله نازل ${chg(sd)}</b> — السبب مش في المنتج ده لوحده.`,"مصدر الزيارات الأساسي قلّ (بوست/إعلان/لينك في البايو اتغيّر).","موسم أو أول/آخر الشهر أو إجازة بتقلل الشراء.","تأكد إن الموقع سريع وشغال على الموبايل، وإن tracker.js لسه موجود في الصفحات."];
    if(scope==="cat")return[`<b>القسم كله نازل ${chg(cd)}</b> — السبب على مستوى القسم.`,"القسم اتشال/نزل في الصفحة الرئيسية أو القايمة.","منتجاته الأساسية خلصت أو اتخفت.","محتوى/إعلانات القسم وقفت."];
    return["<b>النزول خاص بالمنتج ده</b> (القسم والموقع مش نازلين بنفس النسبة).",...(cl?[cl]:["ترتيبه في صفحة القسم اتغيّر أو نزل."]),"ممكن المنتج خلص أو اتخفى فترة.","ممكن منافس نزّل نفس المنتج بسعر أقل، أو لينك قديم بيوصّل لمكان غلط."];
  }
  function visitActs(scope){
    if(scope==="site")return["راجع مصدر الزيارات الرئيسي (إعلانات/سوشيال) وارجع لآخر حاجة كانت شغالة.","اعمل حملة أو عرض قصير لإرجاع الزيارات.","اختبر سرعة الموقع من الموبايل."];
    if(scope==="cat")return["رجّع القسم لمكان ظاهر في الصفحة الرئيسية.","انشر محتوى للقسم (ريلز/بوست) برابط مباشر.","تأكد من توفّر المنتجات الأساسية."];
    return["ارجع المنتج لأول القسم أو الصفحة الرئيسية.","غيّر صورة الغلاف والعنوان وراقب الضغطات أسبوع.","تأكد إنه متاح وإن لينكاته القديمة شغالة.","انشره في ستوري/ريلز برابط مباشر مرة كل ٣ أيام.","قارن سعره بالمنافسين — لو أغلى ممكن يقلل الضغطات."];
  }

  // ---------------------------------------------------------------- العرض
  const kpi=(l,ic,cl,v,sub)=>`<div class="card stat"><div class="l">${l} <i class="${cl} fa-solid ${ic}"></i></div><div class="kpi-s">${v}</div><div class="mut" style="margin-top:4px;font-size:12.5px">${sub}</div></div>`;
  const WD=["الأحد","الاتنين","التلات","الأربع","الخميس","الجمعة","السبت"];
  const SL=["٠–٤","٤–٨","٨–١٢","١٢–١٦","١٦–٢٠","٢٠–٢٤"];

  function cardHtml(p){
    const y=p.F;
    const head=`<div class="ins-h"><div style="min-width:240px">${pchip(p,56)}</div><div class="ins-m"><span>الزيارات <b>${fNum(p.views)}</b></span><span>الضغطات <b>${fNum(p.clicks)}</b></span><span>المباع <b>${fNum(p.sold)}</b></span><span>معدل الشراء <b>${p.conv!=null?fp(p.conv):"—"}</b></span><span>${p.dpu?`بيتباع قطعة كل <b>${fNum(Math.round(p.dpu*10)/10)}</b> يوم`:"مفيش بيع في الفترة"}</span>${p.daysSince!=null?`<span>آخر بيع من <b>${fNum(p.daysSince)}</b> يوم</span>`:""}${p.avgRate!=null?`<span>التقييم <b>${fNum(Math.round(p.avgRate*10)/10)}</b>/٥</span>`:""}</div></div>`;
    const fs=y.sort((a,b)=>SEV[b.sev].w-SEV[a.sev].w).map(f=>{const s=SEV[f.sev];return `<div class="fnd">
      <div class="fnd-t"><span class="tag" style="background:${s.bg};color:${s.c}">${s.l}</span>${esc(f.title)}</div>
      <div class="ev">${f.ev.map(([l,v])=>`<i>${l}: <b>${v}</b></i>`).join("")}</div>
      <div class="fc"><div><h6>الأسباب المحتملة (مبنية على الأرقام)</h6><ul>${f.why.map(w=>`<li>${w}</li>`).join("")}</ul></div>
      <div><h6>اعمل إيه</h6><ol>${f.act.map(a=>`<li>${a}</li>`).join("")}</ol></div></div>
      ${f.note?`<div class="conf" style="margin-top:8px">${f.note}</div>`:""}</div>`;}).join("");
    return `<div class="ins">${head}${fs}</div>`;
  }

  function html(N){
    injectCss();
    const R=analyze(N);
    const {list,withF,stars,storeConv,C}=R;
    const enough=R.ordersN>=10&&R.sViews>=TH.minViews;

    // تركّز الإيرادات (نموذج ABC): كام منتج بيجيب معظم الإيراد
    const revList=[...list].filter(p=>p.revenue>0).sort((a,b)=>b.revenue-a.revenue);
    const totalRev=revList.reduce((s,p)=>s+p.revenue,0);
    let cum=0,n80=0;
    revList.forEach(p=>{p.share=totalRev?p.revenue/totalRev:0;cum+=p.share;p.cum=cum;if(cum<=0.8||n80===0)n80++;});
    const noImgCount=list.filter(p=>p.listed&&!imgOf(p)).length;
    const totalImpact=withF.reduce((s,p)=>s+p.F.reduce((a,f)=>a+f.impact,0),0);
    const hiCount=withF.filter(p=>p.F.some(f=>f.sev==="high")).length;

    // ملخص
    const peakD=R.wdays.indexOf(Math.max(...R.wdays)),peakH=R.hours.indexOf(Math.max(...R.hours));
    const peak=R.ordersN?`${WD[peakD]} · ${SL[peakH]}`:"—";
    const shipShare=R.totTotal?R.totShip/R.totTotal:0,aov=R.ordersN?R.totTotal/R.ordersN:0;
    const cancRate=(R.ordersN+R.cancN)?R.cancN/(R.ordersN+R.cancN):0;
    const kpis=`<div class="grid g4" style="margin-bottom:20px">
      ${kpi("معدل الشراء العام","fa-bullseye","i-b",R.storeConv!=null?fp(R.storeConv):"—",`${fNum(R.sOrders)} طلب من ${fNum(R.sViews)} زيارة منتج`)}
      ${kpi("منتجات محتاجة تدخّل","fa-triangle-exclamation","i-o",fNum(withF.length),`${fNum(hiCount)} منهم أولوية عالية`)}
      ${kpi("الفرصة المتوقعة","fa-arrow-trend-up","i-g",totalImpact?"+"+fNum(totalImpact)+" طلب":"—","تقدير لو اتعالجت المشاكل دي (استرشادي)")}
      ${kpi("أفضل وقت للترويج","fa-clock","i-p",peak,R.ordersN>=10?`من ${fNum(R.ordersN)} طلب`:"عيّنة صغيرة — استرشادي")}
    </div>`;

    const dataNote=`<div class="note" style="${enough?"":"background:#fff8e1"}"><b>حجم البيانات:</b> ${fNum(R.ordersN)} طلب · ${fNum(R.sViews)} زيارة منتج · تتبّع يومي ${R.daysTracked?fNum(R.daysTracked)+" يوم":"<b>لسه ما بدأش</b> (حدّث tracker.js وسيبه يشتغل)"}.
      ${enough?"":"العيّنة لسه صغيرة، فالتوصيات <b>استرشادية</b> وهتبقى أدق مع زيادة الطلبات والزيارات."}
      ${R.covPrev?"":"<br>مقارنة الزيارات بالفترة اللي قبل هتشتغل لما التتبّع اليومي يغطي "+fNum(N*2)+" يوم."}</div>`;

    // خطة العمل
    const flat=[];
    withF.forEach(p=>p.F.forEach(f=>flat.push({p,f})));
    flat.sort((a,b)=>SEV[b.f.sev].w-SEV[a.f.sev].w||b.f.impact-a.f.impact);
    const plan=flat.slice(0,8).map((x,i)=>`<div class="plan"><div class="n">${fNum(i+1)}</div><div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">${pchip(x.p,40)}<span class="tag" style="background:${SEV[x.f.sev].bg};color:${SEV[x.f.sev].c}">${esc(x.f.title)}</span></div>
        <div style="font-size:13px;margin-top:6px;color:#516078">▸ ${x.f.act[0]}${x.f.act[1]?`<br>▸ ${x.f.act[1]}`:""}${x.f.impact?` <b style="color:#00a15c">(+${fNum(x.f.impact)} طلب متوقع)</b>`:""}</div></div></div>`).join("");
    const planCard=`<div class="card" style="margin-bottom:20px"><div class="card-h"><span><i class="fa-solid fa-list-check" style="color:var(--pri)"></i> خطة العمل المقترحة (بالأولوية)</span></div>${plan||`<div class="empty"><i class="fa-solid fa-circle-check"></i>مفيش مشاكل واضحة دلوقتي — استمر ✅</div>`}</div>`;

    // كروت المنتجات
    const show=window._amore?withF:withF.slice(0,8);
    const cards=show.map(cardHtml).join("");
    const more=withF.length>8?`<div style="text-align:center;margin:6px 0 20px"><button type="button" class="btn" data-amore>${window._amore?"عرض أقل":`عرض كل المنتجات (${fNum(withF.length)})`}</button></div>`:"";
    const prodSec=`<div style="margin-bottom:20px"><div style="font-weight:800;font-size:16px;margin:0 2px 12px"><i class="fa-solid fa-stethoscope" style="color:var(--pri)"></i> تشخيص المنتجات</div>${cards||`<div class="card"><div class="empty"><i class="fa-solid fa-circle-check"></i>مفيش منتجات عليها مشاكل واضحة بالبيانات الحالية.</div></div>`}${more}</div>`;

    // تراجع الزيارات
    let visSec;
    if(!R.covPrev){
      visSec=`<div class="card" style="margin-bottom:20px"><div class="card-h"><span><i class="fa-solid fa-chart-line" style="color:var(--pri)"></i> أسباب تراجع الزيارات</span></div><div class="card-b" style="font-size:13.5px;line-height:2">عشان نثبت التراجع بالأرقام لازم نقارن فترتين. التتبّع اليومي شغّال من <b>${R.daysTracked?fNum(R.daysTracked)+" يوم":"لسه ما بدأش"}</b> والمطلوب <b>${fNum(N*2)} يوم</b> للمقارنة الكاملة. تأكد إن <code>tracker.js</code> (النسخة الجديدة) متضاف في صفحات الأقسام و item.html.</div></div>`;
    }else{
      const rows=[];
      const dv=(n,c,p)=>({n,c,p,d:dlt(c,p)});
      rows.push({...dv("الموقع كله",R.sV.vc,R.sV.vp),t:"site"});
      Object.values(C).forEach(y=>{if(y.vp>=TH.minPrevViews)rows.push({...dv("قسم: "+catName(y.col),y.vc,y.vp),t:"cat"});});
      list.forEach(p=>{if(p.v.vp>=TH.minPrevViews)rows.push({...dv(nm(p),p.v.vc,p.v.vp),t:"prod",prod:p});});
      const dec=rows.filter(r=>r.d!=null&&r.d<=-TH.dropPct*0.67).sort((a,b)=>a.d-b.d).slice(0,12);
      const tr=dec.map(r=>{
        const y=r.prod?C[sKey(r.prod.col||"")]:null,cd=y&&y.vp>=TH.minPrevViews?dlt(y.vc,y.vp):null;
        const dg=r.t==="site"?"تراجع عام":r.t==="cat"?"تراجع على مستوى القسم":(R.storeVd!=null&&R.storeVd<=-TH.catDropPct)?"تابع لتراجع الموقع كله":(cd!=null&&cd<=-TH.catDropPct)?"تابع لتراجع القسم":"خاص بالمنتج";
        return `<tr><td>${r.prod?pchip(r.prod,32):`<b>${esc(r.n)}</b>`}</td><td>${fNum(r.p)}</td><td>${fNum(r.c)}</td><td style="color:var(--err);font-weight:800">${chg(r.d)}</td><td>${dg}</td></tr>`;}).join("");
      visSec=`<div class="card" style="margin-bottom:20px"><div class="card-h"><span><i class="fa-solid fa-chart-line" style="color:var(--pri)"></i> أسباب تراجع الزيارات — مثبتة بالأرقام</span></div>
        ${tr?`<div class="tw"><table><thead><tr><th>العنصر</th><th>الفترة اللي قبل</th><th>آخر ${fNum(N)} يوم</th><th>التغيّر</th><th>نطاق المشكلة</th></tr></thead><tbody>${tr}</tbody></table></div>
        <div class="hint">لو الموقع كله نازل → السبب غالباً خارجي (مصدر زيارات/موسم). لو القسم بس → ظهور القسم. لو المنتج بس → ترتيبه/صورته/توفّره. الأسباب التفصيلية لكل منتج موجودة في كارت التشخيص فوق.</div>`:`<div class="empty"><i class="fa-solid fa-circle-check"></i>مفيش تراجع واضح في الزيارات بين الفترتين.</div>`}</div>`;
    }

    // فرص البيع السريع
    const pr=Object.entries(R.pairs).filter(([,n])=>n>=2).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([k,n])=>{
      const [a,b]=k.split("||"),pa=R.P[a],pb=R.P[b],base=Math.min(pa.orders,pb.orders)||1;
      return `<tr><td><div style="display:flex;flex-direction:column;gap:6px">${pchip(pa,30)}${pchip(pb,30)}</div></td><td>${fNum(n)}</td><td>${fp(Math.min(1,n/base))}</td></tr>`;}).join("");
    const bundles=`<div class="card"><div class="card-h">باقات مقترحة (منتجات بتتشترى مع بعض)</div>${pr?`<div class="tw"><table><thead><tr><th>الباقة</th><th>طلبات مشتركة</th><th>% من طلبات الأقل مبيعاً</th></tr></thead><tbody>${pr}</tbody></table></div><div class="hint">اعمل عليها عرض «اشتري الاتنين بسعر مخفّض» — الناس أصلاً بتجمعهم.</div>`:`<div class="empty"><i class="fa-solid fa-boxes-stacked"></i>مفيش منتجات اتشترت مع بعض مرتين أو أكتر لسه</div>`}</div>`;

    const mxW=Math.max(1,...R.wdays),mxH=Math.max(1,...R.hours);
    const order=[6,0,1,2,3,4,5];
    const wb=order.map(i=>`<div class="bar"><b>${fNum(R.wdays[i])}</b><div style="height:${Math.max(3,R.wdays[i]/mxW*100)}%"></div><span>${WD[i]}</span></div>`).join("");
    const hb=R.hours.map((n,i)=>`<div class="bar"><b>${fNum(n)}</b><div style="height:${Math.max(3,n/mxH*100)}%"></div><span>${SL[i]}</span></div>`).join("");
    const timing=`<div class="card"><div class="card-h">توقيت الطلبات (اعمل الترويج قبل الذروة)</div><div class="card-b"><div style="font-size:12.5px;color:#7c8aa0;margin-bottom:6px">حسب اليوم</div><div class="bars">${wb}</div><div style="font-size:12.5px;color:#7c8aa0;margin:14px 0 6px">حسب الساعة</div><div class="bars">${hb}</div></div><div class="hint">${R.ordersN>=10?`الذروة: <b>${peak}</b> — انزل البوست/الإعلان قبلها بساعة أو ساعتين.`:"عيّنة الطلبات صغيرة — التوقيت استرشادي."}</div></div>`;

    const starRows=stars.map(p=>`<tr><td>${pchip(p,40)}</td><td>${fNum(p.sold)}</td><td>${p.conv!=null?fp(p.conv):"—"}</td></tr>`).join("");
    const starCard=`<div class="card"><div class="card-h">المنتجات القوية (استغلها)</div>${starRows?`<div class="tw"><table><thead><tr><th>المنتج</th><th>المباع</th><th>معدل الشراء</th></tr></thead><tbody>${starRows}</tbody></table></div><div class="hint">خلّي مخزونها دايماً متاح، اطلب تقييمات من مشتريها، واستخدمها كـ«طُعم» في الباقات مع المنتجات البطيئة.</div>`:`<div class="empty"><i class="fa-solid fa-trophy"></i>لسه مفيش منتج عليه مبيعات كفاية</div>`}</div>`;

    const ship=`<div class="card"><div class="card-h">الشحن وقيمة الطلب</div><div class="card-b" style="font-size:13.5px;line-height:2">متوسط قيمة الطلب: <b>${aov?fM(aov):"—"}</b><br>الشحن يمثّل: <b>${R.totTotal?fp(shipShare):"—"}</b> من إجمالي الطلبات<br>نسبة الطلبات الملغية: <b>${fp(cancRate)}</b>
      ${shipShare>=TH.shipHigh?`<div class="hint" style="padding:8px 0 0">الشحن نسبته عالية — جرّب شحن مجاني فوق حد قريب من متوسط الطلب (${fM(Math.ceil(aov*1.2/50)*50)}) وشوف أثره على قيمة الطلب.</div>`:""}
      ${cancRate>=0.1?`<div class="hint" style="padding:8px 0 0">نسبة الإلغاء مرتفعة — راجع سبب الإلغاء في صفحة الطلبات الملغية.</div>`:""}</div></div>`;

    // تركّز الإيرادات
    const revRows=revList.slice(0,5).map(p=>`<tr><td>${pchip(p,32)}</td><td>${fM(p.revenue)}</td><td style="min-width:90px"><b>${fp(p.share)}</b><div class="pbar"><i style="width:${Math.max(3,p.share*100)}%"></i></div></td></tr>`).join("");
    const concRisk=revList.length&&revList[0].share>=0.4;
    const conc=`<div class="card"><div class="card-h">تركّز الإيرادات (أهم المنتجات لمتجرك)</div>${revRows?`<div class="tw"><table><thead><tr><th>المنتج</th><th>الإيراد</th><th>% من الإجمالي</th></tr></thead><tbody>${revRows}</tbody></table></div>
      <div class="hint">${fNum(n80)} منتج${n80>1?"ات":""} بس بيجيبوا حوالي ٨٠٪ من الإيراد${concRisk?` — <b>و${esc(nm(revList[0]))} لوحده بياخد ${fp(revList[0].share)}</b>، يعني أي مشكلة فيه (مخزون/سعر) هتأثر على المتجر كله. نوّع: روّج لمنتجات تانية بنفس الفئة السعرية واعمل باقات بيه.`:" — توزيع الإيراد معقول، استمر في دعم المنتجات دي بمخزون كافي."}</div>`:`<div class="empty"><i class="fa-solid fa-chart-pie"></i>مفيش مبيعات كفاية لحساب التركّز</div>`}</div>`;

    const imgCard=`<div class="card"><div class="card-h">اكتمال بيانات المنتجات</div><div class="card-b" style="font-size:13.5px;line-height:2">منتجات من غير صورة: <b style="color:${noImgCount?'var(--err)':'inherit'}">${fNum(noImgCount)}</b> من ${fNum(list.filter(p=>p.listed).length)} منتج مُدرَج
      ${noImgCount?`<div class="hint" style="padding:8px 0 0">دول ظاهرين في التشخيص فوق بعلامة «المنتج من غير صورة واضحة» — ارفع صورهم الأول، الصورة بتأثر على الضغط والشراء أكتر من أي حاجة تانية.</div>`:`<div class="hint" style="padding:8px 0 0">كل المنتجات ليها صور ✅</div>`}</div></div>`;

    const opp=`<div style="font-weight:800;font-size:16px;margin:8px 2px 12px"><i class="fa-solid fa-rocket" style="color:var(--pri)"></i> فرص البيع الأسرع</div>
      <div class="grid g2" style="margin-bottom:20px">${bundles}${timing}</div>
      <div class="grid g2" style="margin-bottom:20px">${starCard}${ship}</div>
      <div class="grid g2" style="margin-bottom:20px">${conc}${imgCard}</div>`;

    const method=`<div class="hint" style="margin-bottom:8px"><b>إزاي التحليل بيشتغل:</b> بنقارن آخر ${fNum(N)} يوم بالـ${fNum(N)} يوم اللي قبلهم. معدل الشراء = الطلبات ÷ زيارات المنتج. الأسباب المذكورة احتمالات مدعومة بالأرقام المعروضة (مش جزم) — اختبر تغيير واحد كل مرة وقارن النتيجة. الحدود قابلة للتعديل من <code>TH</code> في أول admin-insights.js. اضغط على أي صورة لتكبيرها.</div>`;

    return dataNote+kpis+planCard+prodSec+visSec+opp+method;
  }
  return{html};
}