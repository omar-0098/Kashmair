const crypto = require('crypto');

// ⚙️ أرقام طرق الدفع اللي هتظهر للعميل. القيمة الافتراضية هي نفس مثال وثائق EasyKash (2..6).
// لو عايز تغيّرها من غير ما تعدّل الكود: ضيف متغير EASYKASH_PAYMENT_OPTIONS في Vercel، مثال: 2,3,4
const PAYMENT_OPTIONS = String(process.env.EASYKASH_PAYMENT_OPTIONS || '2,3,4,5,6')
  .split(',')
  .map((s) => parseInt(s.trim(), 10))
  .filter(Number.isFinite);

const CASH_EXPIRY_DAYS = 3; // مدة صلاحية كود فوري/أمان (مذكورة للعميل: 3 أيام)
const MAX_DAYS = 7; // أقصى مدة لاستلام الطلب (زي orders-save.js)

const round2 = (n) => Math.round(n * 100) / 100;

// بيحوّل نص زي "1,500 ج.م." أو "١٬٥٠٠ ج.م." لرقم
function parseAmount(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? round2(v) : NaN;
  const s = String(v == null ? '' : v)
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[\u066C,]/g, '') // فواصل الآلاف
    .replace(/\u066B/g, '.'); // العلامة العشرية العربية
  const m = s.match(/\d+(?:\.\d+)?/);
  return m ? round2(parseFloat(m[0])) : NaN;
}

// ترتيب الحقول حسب وثائق EasyKash (التحقق من استجابة المكالمة)
const SIGNED_FIELDS = ['ProductCode', 'Amount', 'ProductType', 'PaymentMethod', 'status', 'easykashRef', 'customerReference'];

function signatureData(p) {
  return SIGNED_FIELDS.map((k) => (p[k] === undefined || p[k] === null ? '' : String(p[k]))).join('');
}
function computeSignature(p, secret) {
  return crypto.createHmac('sha512', String(secret).trim()).update(signatureData(p)).digest('hex');
}
function verifySignature(p, secret) {
  const given = String(p.signatureHash || '').trim().toLowerCase();
  if (!given || !secret) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(computeSignature(p, secret));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

const METHOD_LABELS = {
  'cash through fawry': 'فوري',
  'cash through aman': 'أمان',
  'credit & debit card': 'كارت',
  'mobile wallet': 'محفظة موبايل',
  meeza: 'ميزة'
};
function methodLabel(m) {
  const raw = String(m || '').trim();
  return METHOD_LABELS[raw.toLowerCase()] || raw || 'EasyKash';
}

// جسم الطلب ممكن يوصل JSON أو form أو نص
function normalizeBody(body) {
  if (Buffer.isBuffer(body)) body = body.toString('utf8');
  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch (e) {
      return Object.fromEntries(new URLSearchParams(body));
    }
  }
  return body && typeof body === 'object' ? body : {};
}

module.exports = {
  PAYMENT_OPTIONS,
  CASH_EXPIRY_DAYS,
  MAX_DAYS,
  parseAmount,
  computeSignature,
  verifySignature,
  signatureData,
  methodLabel,
  normalizeBody
};
