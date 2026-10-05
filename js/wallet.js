// ============================================================
//  💰 رصيدك (كشمير هوم) — ملف: js/wallet.js
//  بيتحمّل في chexkout.html (type="module").
//  - بيعرض رصيد العميل لحظياً (wallet/<email>/balance) وخيار "استخدم رصيدك".
//  - لو الرصيد يغطي الطلب كله: الدفع بيبقى "الدفع من الرصيد" ومفيش حاجة تانية مطلوبة.
//  - لو الرصيد أقل: بيتخصم من الإجمالي والباقي بيتدفع بالطريقة المختارة.
//  - الخصم الفعلي من الرصيد بيحصل في orders-save.js وقت تأكيد الطلب (بـ transaction).
//  - الملف ده مش بيكتب في .total_checkout أبداً (عشان coupons.js ما يتلخبطش).
// ============================================================
import{initializeApp,getApps,getApp}from"https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import{getDatabase,ref,onValue}from"https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const cfg={apiKey:"AIzaSyCCk0w_KHVCswjp16TSkNToRSSOjlPC5kE",authDomain:"data-customer-d722f.firebaseapp.com",databaseURL:"https://data-customer-d722f-default-rtdb.firebaseio.com/",projectId:"data-customer-d722f",storageBucket:"data-customer-d722f.firebasestorage.app",messagingSenderId:"398522341614",appId:"1:398522341614:web:99e0f897c61ec960cffbff"};
const db=getDatabase(getApps().length?getApp():initializeApp(cfg));
const eKey=e=>String(e||"").replace(/\./g,"_").replace(/@/g,"__");

export const WALLET_LABEL="الدفع من الرصيد";
window.kashmirWalletLabel=WALLET_LABEL;
window.kashmirWallet={balance:0,use:0,total:0,on:false,walletOnly:false};

const $=id=>document.getElementById(id);
const money=s=>{
  if(typeof s==="number")return s;
  const t=String(s||"").replace(/[٠-٩]/g,d=>"٠١٢٣٤٥٦٧٨٩".indexOf(d)).replace(/[٬,]/g,"").replace("٫",".");
  const m=t.match(/\d+(\.\d+)?/);return m?parseFloat(m[0]):0;
};
const fm=n=>Number(n||0).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})+" ج.م.";

let balance=0;

function setPayOptionsLocked(lock){
  document.querySelectorAll(".cn-pay-option").forEach(o=>{
    o.style.pointerEvents=lock?"none":"";
    o.style.opacity=lock?".4":"";
    if(lock)o.classList.remove("active");
  });
}

function update(){
  const box=$("cnWalletBox");if(!box)return;
  const chk=$("cnWalletUse"),rowW=$("cnWalletRow"),rowD=$("cnDueRow"),pay=$("paymentMethodInput");
  const total=money(document.querySelector(".total_checkout")?.textContent);
  const email=localStorage.getItem("kashmirSessionEmail")||"";
  const W=window.kashmirWallet;

  const canUse=!!email&&balance>0&&total>0;
  box.style.display=canUse?"":"none";
  if(!canUse&&chk)chk.checked=false;
  $("cnWalletBal").textContent=fm(balance);

  const on=canUse&&!!chk&&chk.checked;
  const use=on?Math.min(balance,total):0;
  const walletOnly=on&&use>=total-0.005;
  Object.assign(W,{balance,use,total,on,walletOnly});

  rowW.style.display=use>0?"flex":"none";
  rowD.style.display=use>0?"flex":"none";
  $("cnWalletUsed").textContent="−"+fm(use);
  $("cnDueValue").textContent=fm(Math.max(0,total-use));

  if(walletOnly){
    if(pay)pay.value=WALLET_LABEL;
    setPayOptionsLocked(true);
    const sel=$("cnSelectedPay");if(sel)sel.style.display="none";
  }else{
    setPayOptionsLocked(false);
    if(pay&&pay.value===WALLET_LABEL)pay.value="";
  }
  if(typeof window.refreshPayButtonState==="function")window.refreshPayButtonState();
}
window.kashmirWalletRefresh=update;

function start(){
  $("cnWalletUse")?.addEventListener("change",update);
  document.querySelectorAll(".total_checkout").forEach(el=>{
    new MutationObserver(update).observe(el,{childList:true,characterData:true,subtree:true});
  });
  const email=localStorage.getItem("kashmirSessionEmail");
  if(email){
    onValue(ref(db,`wallet/${eKey(email)}/balance`),s=>{balance=Math.max(0,Number(s.val())||0);update();},()=>{balance=0;update();});
  }
  update();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
