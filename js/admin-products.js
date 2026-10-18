// ============================================================
//  🛍️ إدارة المنتجات (js/admin-products.js)
//  عرض / إضافة / تعديل / حذف منتجات الموقع (Firestore) من لوحة التحكم
//  الملف ده مستقل — admin.js بيستدعيه بس (initProducts) ويعرضه في قسم "المنتجات"
// ============================================================
import{initializeApp,getApps}from"https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import{getFirestore,collection,getDocs,doc,setDoc,updateDoc,deleteDoc,deleteField}from"https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

// ⚠️ خطوة واحدة مطلوبة منك (مرة واحدة بس):
// انسخ firebaseConfig بتاع قاعدة بيانات المنتجات (Firestore) من الملف js/firebase-config.js وحطه هنا.
// ده بروجيكت مختلف عن بروجيكت لوحة التحكم (data-customer-d722f)، عشان كده لازم يتعرّف هنا لوحده.
const PRODUCTS_FIREBASE_CONFIG={
  apiKey: "AIzaSyDebU1vOFDct-G3_GaRWvMjx69K_HlX7RI",
  authDomain: "products-15f80.firebaseapp.com",
  databaseURL: "https://products-15f80-default-rtdb.firebaseio.com",
  projectId: "products-15f80",
  storageBucket: "products-15f80.firebasestorage.app",
  messagingSenderId: "689401211129",
  appId: "1:689401211129:web:eda1a5d06b9c27c9bc9a28",
  measurementId: "G-NFC1ZGZPKM",
};
const APP_NAME="productsApp";

// أقسام الموقع (أسماء الـ collections في Firestore) + تصنيفاتها (حقل catetory).
// تقدر تغيّر الأسماء العربي براحتك — المفاتيح الإنجليزي لازم تفضل زي ما هي.
const SECTIONS={
  coferta:{label:"كوفرتة",cats:{coferta_man:"رجالي",coferta_child:"أطفال"}},
  ellehaf:{label:"لحاف",cats:{ellehaf_man:"كبير",ellehaf_child:"أطفال"}},
  feyat:{label:"فوط",cats:{feyat_three:"٣",feyat_four:"٤",feyat_six:"٦",feyat_child:"أطفال"}},
  mlayat:{label:"ملايات",cats:{mlayat_meshgar:"مشجر",mlayat_sada:"سادة",mlayat_child:"أطفال"}},
  patatin:{label:"بطاطين",cats:{patatin_man:"رجالي",patatin_child:"أطفال"}},
  paranes:{label:"براريس",cats:{}}   // من غير تصنيفات، ولون واحد بس
};

export function initProducts({$,esc,fNum,toast,match,emptyBox,render,openModal,uiConfirm}){
  const S={items:[],loaded:false,loading:false,err:"",col:"all",cat:"all",q:"",fdb:null};
  const keys=Object.keys(SECTIONS);
  const has=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
  const secLabel=c=>(SECTIONS[c]||{}).label||c;
  const hasCats=c=>Object.keys((SECTIONS[c]||{}).cats||{}).length>0;
  const catLabel=(c,k)=>((SECTIONS[c]||{}).cats||{})[k]||k||"";
  const cfgOk=()=>!!(PRODUCTS_FIREBASE_CONFIG.apiKey&&PRODUCTS_FIREBASE_CONFIG.projectId);
  const getDb=()=>{
    if(S.fdb)return S.fdb;
    const app=getApps().find(a=>a.name===APP_NAME)||initializeApp(PRODUCTS_FIREBASE_CONFIG,APP_NAME);
    return S.fdb=getFirestore(app);
  };
  const nat=(a,b)=>String(a).localeCompare(String(b),"en",{numeric:true});
  const sortItems=()=>S.items.sort((a,b)=>keys.indexOf(a.col)-keys.indexOf(b.col)||nat(b.id,a.id));
  const variantsOf=d=>Object.keys(d).filter(k=>/^color\d+$/.test(k)).sort((a,b)=>parseInt(a.slice(5))-parseInt(b.slice(5)))
    .map(k=>({color:String(d[k]||"").trim(),img:String(d[k+"_img"]||"").trim()})).filter(v=>v.color);
  const thumbSrc=d=>d.img||(variantsOf(d).find(v=>v.img)||{}).img||"";
  const setCount=()=>{const c=$("cntProducts");if(c)c.textContent=fNum(S.items.length);};
  const find=k=>{const i=k.indexOf("|"),col=k.slice(0,i),id=k.slice(i+1);return S.items.find(p=>p.col===col&&p.id===id);};

  // رقم المنتج (id) لازم يكون فريد في كل الأقسام (السلة بتعتمد عليه)
  const idIsNum=()=>S.items.length?S.items.some(p=>typeof p.d.id==="number"):true;
  const nextProductId=()=>{const n=S.items.map(p=>Number(p.d.id)).filter(x=>Number.isFinite(x));return(n.length?Math.max(...n):0)+1;};
  const nextDocId=col=>{   // "" = Firestore يولّد ID لوحده
    const l=S.items.filter(p=>p.col===col);
    if(!l.length)return"1";
    const n=l.map(p=>p.id).filter(i=>/^\d+$/.test(i)).map(Number);
    return n.length?String(Math.max(...n)+1):"";
  };

  // ---------- تحميل ----------
  async function load(){
    S.loading=true;S.err="";
    try{
      if(!cfgOk())throw new Error("NOCFG");
      const fdb=getDb();
      const res=await Promise.allSettled(keys.map(c=>getDocs(collection(fdb,c))));
      const items=[],failed=[];
      res.forEach((r,i)=>{
        if(r.status==="fulfilled")r.value.forEach(s=>items.push({col:keys[i],id:s.id,d:s.data()}));
        else{failed.push(secLabel(keys[i]));console.error("products:",keys[i],r.reason);}
      });
      S.items=items;sortItems();
      if(failed.length)S.err=`مقدرتش أحمّل: ${failed.join("، ")} — راجع Rules في Firestore`;
    }catch(e){
      console.error(e);
      S.err=e.message==="NOCFG"?"NOCFG":"فشل الاتصال بقاعدة المنتجات — راجع إعدادات Firebase في admin-products.js";
    }
    S.loading=false;S.loaded=true;setCount();
  }
  const reload=()=>{S.loaded=false;S.items=[];render();};

  // ---------- العرض ----------
  const thumb=(src,s)=>src
    ?`<img src="${esc(src)}" alt="" loading="lazy" onerror="this.outerHTML='<i class=&quot;fa-solid fa-couch&quot; style=&quot;color:#9da9bb&quot;></i>'" style="width:100%;height:100%;object-fit:cover;display:block">`
    :`<i class="fa-solid fa-couch" style="color:#9da9bb"></i>`;
  const thumbBox=(src,s=46)=>`<div style="width:${s}px;height:${s}px;border-radius:9px;overflow:hidden;background:#eef1f6;display:flex;align-items:center;justify-content:center;flex-shrink:0">${thumb(src,s)}</div>`;

  // تطبيع النص للبحث: أرقام عربي→إنجليزي، توحيد الألف والياء والتاء المربوطة
  const norm=t=>String(t??"").toLowerCase().replace(/[٠-٩]/g,d=>"٠١٢٣٤٥٦٧٨٩".indexOf(d)).replace(/[أإآ]/g,"ا").replace(/ى/g,"ي").replace(/ة/g,"ه").replace(/\s+/g," ").trim();
  const filtered=()=>{
    const nq=norm(S.q);
    return S.items.filter(p=>(S.col==="all"||p.col===S.col)&&(S.cat==="all"||p.d.catetory===S.cat)&&
      (!nq||norm(p.d.name).includes(nq)||norm(p.d.id).includes(nq)||norm(p.id).includes(nq))&&
      match([p.d.name,p.d.id,p.id,p.d.type,p.d.manufacturer,secLabel(p.col),catLabel(p.col,p.d.catetory),p.d.word,...variantsOf(p.d).map(v=>v.color),p.d.color].join(" ")));
  };
  const countTxt=rows=>`المنتجات (${fNum(rows.length)}${rows.length!==S.items.length?` من ${fNum(S.items.length)}`:""})`;
  function tableHtml(rows){
    const tr=rows.map(p=>{
      const d=p.d,vs=variantsOf(d),k=`${p.col}|${p.id}`;
      const colors=vs.length?`${fNum(vs.length)} · <span class="mut">${esc(vs.map(v=>v.color).join("، ").slice(0,40))}</span>`:(d.color?esc(d.color):`<span class="mut">—</span>`);
      return `<tr class="click" data-pr-edit="${esc(k)}">
        <td>${thumbBox(thumbSrc(d))}</td>
        <td style="min-width:180px"><b>${esc(d.name||"—")}</b><small class="mut" style="display:block">رقم ${esc(d.id??"—")} · ${esc(p.id)}</small>${d.word?`<span class="badge b2" style="margin-top:4px">${esc(d.word)}</span>`:""}</td>
        <td>${esc(secLabel(p.col))}${d.catetory?`<small class="mut" style="display:block">${esc(catLabel(p.col,d.catetory))}</small>`:""}</td>
        <td><b>${fNum(d.price)} ج.م.</b>${Number(d.old_price)>0?`<small class="mut" style="display:block;text-decoration:line-through">${fNum(d.old_price)}</small>`:""}</td>
        <td>${colors}</td>
        <td style="white-space:nowrap"><button class="btn" data-pr-edit="${esc(k)}"><i class="fa-solid fa-pen"></i> تعديل</button> <button class="btn red" data-pr-del="${esc(k)}" title="حذف المنتج"><i class="fa-solid fa-trash-can"></i></button></td></tr>`;
    }).join("");
    return rows.length?`<div class="tw"><table><thead><tr><th></th><th>المنتج</th><th>القسم</th><th>السعر</th><th>الألوان</th><th></th></tr></thead><tbody>${tr}</tbody></table></div>`
      :emptyBox("fa-couch",S.items.length?"مفيش منتجات بالبحث أو الفلتر ده":"مفيش منتجات لسه — اضغط «إضافة منتج»");
  }

  function vProducts(){
    if(!S.loaded){
      if(!S.loading)load().then(()=>render());
      return `<div class="empty"><i class="fa-solid fa-spinner fa-spin"></i>جاري تحميل المنتجات...</div>`;
    }
    if(S.err==="NOCFG")return `<div class="card"><div class="card-h"><span><i class="fa-solid fa-gear"></i> خطوة واحدة ناقصة</span></div>
      <div class="card-b" style="line-height:2.1">
        قسم المنتجات محتاج يعرف بيانات Firebase بتاعة <b>قاعدة المنتجات</b> (Firestore). لوحة التحكم نفسها شغالة على بروجيكت تاني، عشان كده لازم تحطها هنا مرة واحدة:<br>
        ١) افتح الملف <code>js/firebase-config.js</code> وانسخ الـ <code>firebaseConfig</code> بتاعك.<br>
        ٢) افتح الملف <code>js/admin-products.js</code> وحطها مكان <code>PRODUCTS_FIREBASE_CONFIG</code> في أول الملف.<br>
        ٣) حدّث الصفحة.
      </div></div>`;

    const rows=filtered();
    const colOpts=`<option value="all">كل الأقسام</option>`+keys.map(c=>`<option value="${c}"${S.col===c?" selected":""}>${esc(secLabel(c))}</option>`).join("");
    const catSel=(S.col!=="all"&&hasCats(S.col))
      ?`<select class="sel" id="prCat"><option value="all">كل التصنيفات</option>${Object.entries(SECTIONS[S.col].cats).map(([k,l])=>`<option value="${k}"${S.cat===k?" selected":""}>${esc(l)}</option>`).join("")}</select>`:"";
    return `${S.err?`<div class="note" style="background:#fde8ec;border-color:#f3b8c4;color:#c81e37"><i class="fa-solid fa-triangle-exclamation"></i> ${esc(S.err)}</div>`:""}
      <div class="card"><div class="card-h"><span id="prCnt">${countTxt(rows)}</span>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
          <div style="position:relative"><i class="fa-solid fa-magnifying-glass" style="position:absolute;right:11px;top:50%;transform:translateY(-50%);color:var(--mut);font-size:12px"></i><input class="inp" id="prQ" type="search" autocomplete="off" placeholder="ابحث بالاسم أو الرقم (id)..." value="${esc(S.q)}" style="padding-right:32px;width:240px"></div>
          <select class="sel" id="prCol">${colOpts}</select>${catSel}
          <button class="btn" id="prReload" title="تحديث"><i class="fa-solid fa-rotate"></i></button>
          <button class="btn solid" id="prAdd"><i class="fa-solid fa-plus"></i> إضافة منتج</button>
        </div></div>
        <div id="prTable">${tableHtml(rows)}</div></div>`;
  }

  // ---------- نموذج الإضافة / التعديل ----------
  const catOptions=(col,sel)=>Object.entries((SECTIONS[col]||{}).cats||{}).map(([k,l])=>`<option value="${k}"${sel===k?" selected":""}>${esc(l)} (${k})</option>`).join("");
  const varRow=(c="",i="")=>`<div class="mini pf-var" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
    <div class="pf-vp" style="width:44px;height:44px;border-radius:8px;overflow:hidden;background:#eef1f6;display:flex;align-items:center;justify-content:center;flex-shrink:0">${thumb(i,44)}</div>
    <input class="inp" data-vc placeholder="اسم اللون (مثال: بيج)" style="width:150px" value="${esc(c)}">
    <input class="inp" data-vi dir="ltr" placeholder="رابط / مسار صورة اللون" style="flex:1;min-width:190px" value="${esc(i)}">
    <button type="button" class="btn red" data-vrm title="حذف اللون"><i class="fa-solid fa-trash"></i></button></div>`;

  function openForm(p){
    const d=p?p.d:{};
    const col=p?p.col:(S.col!=="all"?S.col:keys[0]);
    const vs=variantsOf(d);
    const rowsHtml=(vs.length?vs:(d.color&&col!=="paranes"?[{color:String(d.color),img:d.img||""}]:[])).map(v=>varRow(v.color,v.img)).join("");
    const f=(id,l,v,o={})=>`<div${o.full?' style="grid-column:1/-1"':""}><div class="k">${l}</div><input class="inp" id="${id}" ${o.ltr?'dir="ltr" ':""}${o.num?'type="number" min="0" step="any" inputmode="decimal" ':""}style="width:100%" value="${esc(v??"")}"${o.ph?` placeholder="${esc(o.ph)}"`:""}></div>`;
    openModal(p?`تعديل: ${d.name||""}`:"إضافة منتج جديد",`
      <div class="kv">
        <div><div class="k">القسم</div>${p?`<div class="vv">${esc(secLabel(col))}</div>`:`<select class="sel" id="pfCol" style="width:100%">${keys.map(c=>`<option value="${c}"${c===col?" selected":""}>${esc(secLabel(c))}</option>`).join("")}</select>`}</div>
        <div id="pfCatWrap"><div class="k">التصنيف (أنهي قسم فرعي في الصفحة الرئيسية)</div><select class="sel" id="pfCat" style="width:100%">${catOptions(col,d.catetory)}</select></div>
        ${f("pfName","اسم المنتج *",d.name,{full:true})}
        ${f("pfPrice","السعر (ج.م.) *",d.price,{num:true})}
        ${f("pfOld","السعر القديم (اختياري — بيظهر خصم %)",d.old_price,{num:true})}
        ${f("pfType","النوع (مثال: قطن / مخمل)",d.type)}
        ${f("pfMan","الشركة المصنّعة",d.manufacturer)}
        ${f("pfSize","المقاس (اختياري)",d.size)}
        ${f("pfWord","شارة فوق المنتج (اختياري — مثال: جديد)",d.word)}
        ${f("pfId","رقم المنتج (id) — فريد لكل المنتجات",p?d.id:nextProductId(),{ltr:true})}
        ${p?`<div><div class="k">معرّف المستند (docId) — مش بيتغيّر</div><div class="vv code">${esc(p.id)}</div></div>`:""}
      </div>
      <div class="sub-t"><i class="fa-solid fa-image"></i> الصورة الرئيسية</div>
      <div style="display:flex;gap:10px;align-items:center">
        <div id="pfImgPrev" style="width:64px;height:64px;border-radius:10px;overflow:hidden;background:#eef1f6;display:flex;align-items:center;justify-content:center;flex-shrink:0">${thumb(d.img||"",64)}</div>
        <input class="inp" id="pfImg" dir="ltr" style="flex:1" placeholder="رابط الصورة أو مسارها (https://... أو images/...)" value="${esc(d.img||"")}">
      </div>
      <div class="mut" style="font-size:11.5px;margin-top:4px">المعاينة ممكن ما تظهرش لو المسار نسبي (بيتحسب من صفحة الموقع مش من لوحة التحكم) — ده مش بيأثّر على المنتج.</div>
      <div id="pfVarWrap"><div class="sub-t"><i class="fa-solid fa-palette"></i> الألوان (كل لون بصورته)</div>
        <div id="pfVars">${rowsHtml}</div>
        <button type="button" class="btn" id="pfAddVar" style="margin-top:8px"><i class="fa-solid fa-plus"></i> إضافة لون</button>
        <div class="mut" style="font-size:11.5px;margin-top:6px">لو سيبت صورة اللون فاضية هيستخدم الصورة الرئيسية.</div></div>
      <div id="pfColorWrap" style="display:none"><div class="sub-t"><i class="fa-solid fa-palette"></i> اللون</div>${f("pfColor","",d.color,{full:true,ph:"مثال: أبيض"})}</div>
      <div class="del-err" id="pfErr" style="margin-top:12px"></div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:8px">
        <button type="button" class="btn solid" id="pfSave"><i class="fa-solid fa-floppy-disk"></i> ${p?"حفظ التعديلات":"إضافة المنتج"}</button>
        <button type="button" class="btn" id="pfCancel">إلغاء</button>
        ${p?`<button type="button" class="btn red" id="pfDel" style="margin-inline-start:auto"><i class="fa-solid fa-trash-can"></i> حذف المنتج</button>`:""}
      </div>`);

    const mb=$("mbody");
    const curCol=()=>p?p.col:$("pfCol").value;
    const applyMode=()=>{   // تصنيفات + لون واحد/ألوان متعددة حسب القسم
      const c=curCol();
      $("pfCatWrap").style.display=hasCats(c)?"":"none";
      if(!p)$("pfCat").innerHTML=catOptions(c,"");
      $("pfVarWrap").style.display=c==="paranes"?"none":"";
      $("pfColorWrap").style.display=c==="paranes"?"":"none";
    };
    applyMode();
    if(!p)$("pfCol").onchange=applyMode;
    const setPrev=(box,src,s)=>{box.innerHTML=thumb(src,s);};
    mb.oninput=e=>{
      const t=e.target;
      if(t.id==="pfImg")setPrev($("pfImgPrev"),t.value.trim(),64);
      else if(t.matches&&t.matches("[data-vi]"))setPrev(t.closest(".pf-var").querySelector(".pf-vp"),t.value.trim(),44);
    };
    mb.onclick=e=>{
      const rm=e.target.closest("[data-vrm]");
      if(rm){rm.closest(".pf-var").remove();return;}
      if(e.target.closest("#pfAddVar"))$("pfVars").insertAdjacentHTML("beforeend",varRow());
    };
    $("pfCancel").onclick=()=>$("modal").classList.remove("open");
    if(p)$("pfDel").onclick=()=>removeProduct(p);
    $("pfSave").onclick=()=>save(p);
  }

  async function save(p){
    const mb=$("mbody"),v=id=>mb.querySelector("#"+id).value.trim(),err=m=>{$("pfErr").textContent=m;};
    err("");
    const col=p?p.col:v("pfCol");
    const name=v("pfName"),priceRaw=v("pfPrice"),price=Number(priceRaw),oldRaw=v("pfOld"),old=oldRaw===""?"":Number(oldRaw);
    if(!name)return err("اكتب اسم المنتج");
    if(priceRaw===""||!(price>=0))return err("اكتب سعر صحيح");
    if(old!==""&&!(old>price))return err("السعر القديم لازم يكون أكبر من السعر الحالي (أو سيبه فاضي)");
    const cat=hasCats(col)?v("pfCat"):"";
    if(hasCats(col)&&!cat)return err("اختار التصنيف");
    const idRaw=v("pfId");
    if(!idRaw)return err("اكتب رقم المنتج (id)");
    if(S.items.some(x=>x!==p&&String(x.d.id)===idRaw))return err("رقم المنتج ده مستخدم في منتج تاني — اختار رقم مختلف");

    const set={},del=[];
    const put=(k,val)=>{if(val===""||val==null){if(p&&has(p.d,k))del.push(k);}else set[k]=val;};
    put("name",name);put("price",price);put("old_price",old);
    put("img",v("pfImg"));put("type",v("pfType"));put("manufacturer",v("pfMan"));put("size",v("pfSize"));put("word",v("pfWord"));
    if(hasCats(col))put("catetory",cat);
    if(!p||String(p.d.id)!==idRaw)set.id=(idIsNum()&&/^\d+$/.test(idRaw))?Number(idRaw):idRaw;
    if(col==="paranes")put("color",v("pfColor"));
    else{
      const rows=[...mb.querySelectorAll(".pf-var")].map(r=>({c:r.querySelector("[data-vc]").value.trim(),i:r.querySelector("[data-vi]").value.trim()})).filter(r=>r.c);
      rows.forEach((r,i)=>{set[`color${i+1}`]=r.c;put(`color${i+1}_img`,r.i);});
      if(p)Object.keys(p.d).forEach(k=>{if(/^color\d+(_img)?$/.test(k)&&!has(set,k)&&!del.includes(k))del.push(k);});   // ألوان اتشالت
    }

    const btn=$("pfSave");btn.disabled=true;
    try{
      const fdb=getDb();
      if(p){
        const payload={...set};del.forEach(k=>{payload[k]=deleteField();});
        await updateDoc(doc(fdb,p.col,p.id),payload);
        Object.assign(p.d,set);del.forEach(k=>delete p.d[k]);
        toast("✅ تم حفظ التعديلات");
      }else{
        const dId=nextDocId(col),ref=dId?doc(fdb,col,dId):doc(collection(fdb,col));
        await setDoc(ref,set);
        S.items.push({col,id:ref.id,d:set});sortItems();
        S.col=col;S.cat="all";
        toast("✅ تمت إضافة المنتج");
      }
      setCount();$("modal").classList.remove("open");render();
    }catch(e){console.error(e);err("❌ فشل الحفظ — راجع Rules في Firestore (لازم تسمح بالكتابة)");btn.disabled=false;}
  }

  async function removeProduct(p){
    if(!p)return;
    if(!(await uiConfirm(`حذف المنتج «${p.d.name||p.id}» نهائياً من الموقع؟`)))return;
    try{
      await deleteDoc(doc(getDb(),p.col,p.id));
      S.items=S.items.filter(x=>x!==p);setCount();
      $("modal").classList.remove("open");toast("🗑️ تم حذف المنتج");render();
    }catch(e){console.error(e);toast("❌ فشل الحذف — راجع Rules في Firestore");}
  }

  // ---------- ربط الأحداث ----------
  function bind(){
    const c=$("prCol");if(c)c.onchange=()=>{S.col=c.value;S.cat="all";render();};
    const g=$("prCat");if(g)g.onchange=()=>{S.cat=g.value;render();};
    const r=$("prReload");if(r)r.onclick=reload;
    const a=$("prAdd");if(a)a.onclick=()=>openForm(null);
    const q=$("prQ");
    if(q)q.oninput=()=>{   // بحث لحظي من غير ما نعيد رسم الصفحة (عشان الكيبورد ما يقفلش)
      S.q=q.value;const rows=filtered();
      $("prTable").innerHTML=tableHtml(rows);$("prCnt").textContent=countTxt(rows);bindRows();
    };
    bindRows();
  }
  function bindRows(){
    document.querySelectorAll("#view [data-pr-edit]").forEach(el=>el.onclick=e=>{e.stopPropagation();const p=find(el.dataset.prEdit);if(p)openForm(p);});
    document.querySelectorAll("#view [data-pr-del]").forEach(el=>el.onclick=e=>{e.stopPropagation();removeProduct(find(el.dataset.prDel));});
  }

  return{vProducts,bind};
}