// أدوات Firebase Admin (بتشتغل على السيرفر بس). الملفات اللي اسمها بيبدأ بـ _ مش بتتحول لـ endpoint في Vercel.
const admin = require('firebase-admin');

let _db = null;
function db() {
  if (_db) return _db;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error('Missing env FIREBASE_SERVICE_ACCOUNT');
  const sa = JSON.parse(raw);
  if (sa.private_key) sa.private_key = sa.private_key.replace(/\\n/g, '\n');
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(sa),
      databaseURL: (process.env.FIREBASE_DATABASE_URL || '').trim()
    });
  }
  _db = admin.database();
  return _db;
}

// نفس دالة الموقع بالظبط (login2.js) — لازم تفضل مطابقة
const eKey = (e) => String(e).replace(/\./g, '_').replace(/@/g, '__');

async function get(path) {
  const snap = await db().ref(path).once('value');
  return snap.exists() ? snap.val() : null;
}
async function update(updates) {
  await db().ref().update(updates);
}
// fn ترجّع undefined = إلغاء العملية
async function transaction(path, fn) {
  return db().ref(path).transaction(fn);
}

module.exports = { eKey, get, update, transaction };
