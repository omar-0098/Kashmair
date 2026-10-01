// POST /api/create-payment   body: { orderId }
// بيقرا الطلب المعلّق من Firebase، يكلّم EasyKash (الـ API Key هنا بس، مش في المتصفح)، ويرجّع لينك الدفع.
const { get, update } = require('./_lib/firebase');
const { PAYMENT_OPTIONS, CASH_EXPIRY_DAYS, parseAmount } = require('./_lib/easykash');

const EASYKASH_URL = 'https://back.easykash.net/api/directpayv1/pay';
const ORDER_ID_RE = /^o[a-z0-9]{6,30}$/;

// طريقة الدفع اللي العميل اختارها في الـ checkout ← رقمها في EasyKash (من جدول paymentOptions في الوثائق).
// المتصفح بيبعت الاسم بس، والرقم بيتحدد هنا. لإضافة طريقة: لازم تكون متفعّلة على حسابك في EasyKash.
const METHODS = {
  card: [2],     // بطاقات الائتمان والخصم المباشر
  wallet: [4],   // المحفظة الإلكترونية
  fawry: [5],    // نقدي عبر فوري
  aman: [1],     // نقدي عبر أمان
  meeza: [6],    // ميزة
  valu: [17],    // ValU (تقسيط) — لازم يتفعّل من EasyKash
  souhoola: [22] // سهولة (تقسيط) — لازم يتفعّل من EasyKash
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  try {
    const apiKey = (process.env.EASYKASH_API_KEY || '').trim();
    if (!apiKey) {
      console.error('create-payment: missing EASYKASH_API_KEY');
      return res.status(500).json({ error: 'server_not_configured' });
    }
    const siteUrl = (process.env.SITE_URL || 'https://kashmair.vercel.app').trim().replace(/\/+$/, '');

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const orderId = String(body.orderId || '');
    if (!ORDER_ID_RE.test(orderId)) return res.status(400).json({ error: 'bad_order_id' });
    const methodKey = String(body.method || '');
    if (methodKey && !METHODS[methodKey]) return res.status(400).json({ error: 'bad_method' });

    const rec = await get(`paymentOrders/${orderId}`);
    if (!rec || !rec.order) return res.status(404).json({ error: 'order_not_found' });
    if (rec.state === 'finalized') return res.status(409).json({ error: 'already_paid' });

    // لينك اتعمل قبل كده لنفس الطلب → نرجّعه بدل ما نعمل واحد جديد
    if (rec.paymentLink) return res.status(200).json({ url: rec.paymentLink });

    const o = rec.order;
    const amount = parseAmount(o.total);
    if (!(amount > 0)) {
      console.error('create-payment: bad amount', { orderId, total: o.total });
      return res.status(400).json({ error: 'bad_amount' });
    }
    const mobile = String(o.phone || '').replace(/\D/g, '');
    if (!/^01[0125]\d{8}$/.test(mobile)) return res.status(400).json({ error: 'bad_phone' });
    if (!o.email) return res.status(400).json({ error: 'missing_email' });

    const payload = {
      amount,
      currency: 'EGP',
      paymentOptions: methodKey ? METHODS[methodKey] : PAYMENT_OPTIONS,
      cashExpiry: CASH_EXPIRY_DAYS,
      name: String(o.recipient || 'Customer'),
      email: String(o.email),
      mobile,
      redirectUrl: `${siteUrl}/pay.html`,
      customerReference: orderId
    };

    console.log('create-payment: sending', { orderId, method: methodKey || '(default)', paymentOptions: payload.paymentOptions });
    const r = await fetch(EASYKASH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: apiKey },
      body: JSON.stringify(payload)
    });
    const text = await r.text();
    let data = {};
    try {
      data = JSON.parse(text);
    } catch (e) {}

    // بنسجّل الرد الخام (من غير أي مفاتيح) عشان لو حاجة اتغيّرت نعرف نصلّحها بسرعة
    if (!r.ok) {
      console.error('create-payment: EasyKash error', r.status, text.slice(0, 500));
      return res.status(502).json({ error: 'gateway_error' });
    }
    const url = data.redirectUrl || data.redirectURL || data.url || data.paymentUrl ||
      (data.productCode ? `https://www.easykash.net/DirectPayV1/${data.productCode}` : '');
    if (!url) {
      console.error('create-payment: no link in response', text.slice(0, 500));
      return res.status(502).json({ error: 'gateway_bad_response' });
    }

    await update({
      [`paymentOrders/${orderId}/paymentLink`]: url,
      [`paymentOrders/${orderId}/amountExpected`]: amount,
      [`paymentOrders/${orderId}/linkCreatedAt`]: Date.now()
    });
    return res.status(200).json({ url });
  } catch (e) {
    console.error('create-payment failed:', e);
    return res.status(500).json({ error: 'server_error' });
  }
};