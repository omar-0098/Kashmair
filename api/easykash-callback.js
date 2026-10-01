// POST /api/easykash-callback   ← ده الرابط اللي بتحطه في EasyKash كـ Callback URL
// بيتحقق من توقيع HMAC، وبعدين يحوّل الطلب المعلّق لطلب مؤكد (مدفوع).
const { get, update } = require('./_lib/firebase');
const { verifySignature, normalizeBody } = require('./_lib/easykash');
const { finalizeOrder } = require('./_lib/finalize');

const ORDER_ID_RE = /^o[a-z0-9]{6,30}$/;

module.exports = async (req, res) => {
  if (req.method === 'GET') return res.status(200).send('ok');
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  let id = '';
  try {
    const secret = (process.env.EASYKASH_HMAC_SECRET || '').trim();
    if (!secret) {
      console.error('callback: missing EASYKASH_HMAC_SECRET');
      return res.status(500).json({ error: 'server_not_configured' });
    }
    const p = normalizeBody(req.body);
    console.log('callback: received', { ref: p.customerReference, status: p.status });

    if (!verifySignature(p, secret)) {
      console.error('callback: bad signature', { ref: p.customerReference, status: p.status });
      return res.status(401).json({ error: 'bad_signature' });
    }

    id = String(p.customerReference || '');
    if (!ORDER_ID_RE.test(id)) return res.status(200).json({ ok: true, note: 'ignored_reference' });

    const status = String(p.status || '').toUpperCase();
    const rec = await get(`paymentOrders/${id}`);
    if (!rec || !rec.order) {
      console.error('callback: order not found', id);
      return res.status(200).json({ ok: true, note: 'unknown_order' });
    }
    if (status !== 'PAID') {
      await update({ [`paymentOrders/${id}/lastStatus`]: status, [`paymentOrders/${id}/lastStatusAt`]: Date.now() });
      return res.status(200).json({ ok: true });
    }

    const r = await finalizeOrder(id, { amount: p.Amount, method: p.PaymentMethod, easykashRef: p.easykashRef });
    return res.status(200).json({ ok: true, note: r.reason });
  } catch (e) {
    console.error('callback failed:', id, e);
    return res.status(500).json({ error: 'server_error' });
  }
};