// ============================================================
//  🔐 بوابة الأدمن — بتتحمّل في user/accoun.html
//  - بتضيف زرار "المستخدمون" في القايمة للحساب بتاع الأدمن بس
//  - لما تدوس عليه بتطلب كلمة سر، ولو صح بتحوّلك على user/admin.html
// ============================================================
import { ADMIN_PASS_HASH, sha256, isAdminAccount, setAdminAuth } from "./admin-config.js";

const css = `
#adminPassModal{position:fixed;inset:0;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;z-index:10001;opacity:0;pointer-events:none;transition:opacity .2s;padding:16px}
#adminPassModal.open{opacity:1;pointer-events:auto}
#adminPassModal .ap-box{background:#fff;border-radius:18px;padding:28px 26px;width:100%;max-width:370px;font-family:'Almarai',sans-serif;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.35)}
#adminPassModal .ap-ico{width:58px;height:58px;border-radius:16px;background:#eaf1ff;color:#2c7be5;display:flex;align-items:center;justify-content:center;font-size:24px;margin:0 auto 14px}
#adminPassModal h4{margin:0 0 4px;font-size:18px;font-weight:800;color:#111}
#adminPassModal p{margin:0 0 16px;font-size:13px;color:#777}
#adminPassModal input{width:100%;box-sizing:border-box;border:1.5px solid #dde1e8;border-radius:10px;padding:12px 14px;font-size:15px;font-family:inherit;text-align:center;outline:none}
#adminPassModal input:focus{border-color:#2c7be5}
#adminPassModal .ap-err{min-height:20px;margin:8px 0 4px;font-size:12.5px;color:#d93025;font-weight:700}
#adminPassModal .ap-btns{display:flex;gap:10px}
#adminPassModal button{flex:1;border:none;border-radius:10px;padding:12px;font-family:inherit;font-size:14px;font-weight:800;cursor:pointer}
#adminPassModal .ap-ok{background:#2c7be5;color:#fff}
#adminPassModal .ap-cancel{background:#f1f2f5;color:#333}
`;

function buildModal(){
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
  const m = document.createElement("div"); m.id = "adminPassModal";
  m.innerHTML = `<div class="ap-box">
    <div class="ap-ico"><i class="fa-solid fa-lock"></i></div>
    <h4>منطقة المشرف</h4><p>اكتب كلمة السر عشان تدخل لوحة التحكم</p>
    <input type="password" id="adminPassInput" placeholder="كلمة السر" autocomplete="off">
    <div class="ap-err" id="adminPassErr"></div>
    <div class="ap-btns"><button type="button" class="ap-ok" id="adminPassOk">دخول</button><button type="button" class="ap-cancel" id="adminPassCancel">إلغاء</button></div>
  </div>`;
  document.body.appendChild(m);

  const input = m.querySelector("#adminPassInput"), err = m.querySelector("#adminPassErr"), ok = m.querySelector("#adminPassOk");
  let fails = 0, lockedUntil = 0;
  const close = ()=>{ m.classList.remove("open"); input.value = ""; err.textContent = ""; };

  async function submit(){
    const left = Math.ceil((lockedUntil - Date.now())/1000);
    if(left > 0){ err.textContent = `استنى ${left} ثانية وجرّب تاني`; return; }
    ok.disabled = true;
    try{
      if(await sha256(input.value) === ADMIN_PASS_HASH){
        await setAdminAuth();
        location.href = "admin.html";
        return;
      }
      fails++;
      if(fails >= 3){ lockedUntil = Date.now() + 30000; fails = 0; err.textContent = "❌ محاولات كتير — استنى ٣٠ ثانية"; }
      else err.textContent = "❌ كلمة السر غلط";
      input.select();
    }catch(e){
      err.textContent = "❌ المتصفح مش داعم التشفير (لازم الموقع يفتح على https)";
    }finally{ ok.disabled = false; }
  }
  ok.addEventListener("click", submit);
  input.addEventListener("keydown", e=>{ if(e.key === "Enter") submit(); });
  m.querySelector("#adminPassCancel").addEventListener("click", close);
  m.addEventListener("click", e=>{ if(e.target === m) close(); });
  return { open(){ m.classList.add("open"); setTimeout(()=>input.focus(), 50); } };
}

function init(){
  if(!isAdminAccount()) return;                       // مش الأدمن → مفيش أي حاجة تظهر
  const logoutBtn = document.getElementById("logoutBtn");
  if(!logoutBtn || document.getElementById("adminNavBtn")) return;
  const btn = document.createElement("button");
  btn.className = "nav-btn"; btn.id = "adminNavBtn"; btn.type = "button";
  btn.innerHTML = 'المستخدمون <i class="fa-solid fa-users-gear"></i>';
  logoutBtn.parentNode.insertBefore(btn, logoutBtn);
  const modal = buildModal();
  btn.addEventListener("click", ()=>modal.open());
}
if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
