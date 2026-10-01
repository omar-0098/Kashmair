// ============================================================
//  ⚙️ إعدادات لوحة التحكم (مشتركة بين البوابة والداشبورد)
// ============================================================
export const ADMIN_EMAIL = "oo9mar9988@gmail.com";

// SHA-256 لكلمة السر (مش الكلمة نفسها). الافتراضية: Kashmir@2026
// لتغييرها: افتح Console في أي صفحة من الموقع واكتب:   await hashAdminPassword("كلمتك الجديدة")
// وانسخ الناتج هنا مكان القيمة اللي تحت.
export const ADMIN_PASS_HASH = "5e20b8e4f556a7fafb68b76f5041e56226f35adb60397d04822b22d663150e98";

const KEY = "kashmirAdminAuth";
const TTL = 2 * 60 * 60 * 1000;   // الجلسة صالحة ساعتين

export async function sha256(text){
  if(!(window.crypto && crypto.subtle)) throw new Error("no-crypto");
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,"0")).join("");
}
window.hashAdminPassword = sha256;

export function isAdminAccount(){
  return (localStorage.getItem("kashmirSessionEmail")||"").trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();
}
export async function setAdminAuth(){
  const ts = Date.now();
  sessionStorage.setItem(KEY, JSON.stringify({ ts, sig: await sha256(ADMIN_EMAIL + ADMIN_PASS_HASH + ts) }));
}
export async function hasAdminAuth(){
  try{
    const a = JSON.parse(sessionStorage.getItem(KEY) || "null");
    if(!a || Date.now() - a.ts > TTL) return false;
    return a.sig === await sha256(ADMIN_EMAIL + ADMIN_PASS_HASH + a.ts);
  }catch(e){ return false; }
}
export function clearAdminAuth(){ sessionStorage.removeItem(KEY); }
