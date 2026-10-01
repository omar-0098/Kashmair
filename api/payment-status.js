// GET /api/payment-status?orderId=...
// صفحة pay.html بتسأله كل كام ثانية: اتدفع؟ وإيه كود فوري/أمان؟
const { get, update } = require('./_lib/firebase');
const { methodLabel } = require('./_lib/easykash');
const { finalizeOrder } = require('./_lib/finalize');

const ORDER_ID_RE = /^o[a-z0-9]{6,30}$/;
const INQUIRE_URL = 'https://back.easykash.net/api/cash-api/inquire';

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const id = String((req.query && req.query.orderId) || '');
  if (!ORDER_ID_RE.test(id)) return res.status(400).json({ error: 'bad_order_id' });

  try {
    const rec = await get(`paymentOrders/${id}`);
    if (!rec || !rec.order) return res.status(404).json({ error: 'order_not_found' });

    const out = { code: rec.order.code || '', amount: rec.amountExpected || null, paid: false };
    if (rec.state === 'finalized') return res.status(200).json({ ...out, paid: true });

    out.voucher = rec.voucher || '';
    out.methodRaw = rec.payMethod || '';

    // بنسأل EasyKash (مرة كل 8 ثواني بحد أقصى): الكود + الحالة. ولو طلع PAID نأكد الطلب حتى لو الـ callback اتأخر.
    const apiKey = (process.env.EASYKASH_API_KEY || '').trim();
    const now = Date.now();
    if (apiKey && now - (rec.lastInquiryAt || 0) > 8000) {
      await update({ [`paymentOrders/${id}/lastInquiryAt`]: now });
      const r = await fetch(INQUIRE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: apiKey },
        body: JSON.stringify({ customerReference: id })
      });
      const text = await r.text();
      let d = {};
      try { d = JSON.parse(text); } catch (e) {}
      if (!r.ok) console.error('payment-status: inquire failed', r.status, text.slice(0, 300));
      else {
        out.voucher = String(d.voucher || d.Voucher || '').trim() || out.voucher;
        out.methodRaw = String(d.PaymentMethod || d.paymentMethod || '').trim() || out.methodRaw;
        out.status = String(d.status || d.Status || '').toUpperCase();
        if (out.status === 'PAID' || out.status === 'DELIVERED') {
          await finalizeOrder(id, { amount: d.Amount != null ? d.Amount : d.amount, method: out.methodRaw, easykashRef: d.easykashRef });
          if ((await get(`paymentOrders/${id}/state`)) === 'finalized') return res.status(200).json({ ...out, paid: true });
        }
        if (!out.voucher) console.error('payment-status: no voucher in response', text.slice(0, 300));
        else await update({ [`paymentOrders/${id}/voucher`]: out.voucher, [`paymentOrders/${id}/payMethod`]: out.methodRaw });
      }
    }
    out.method = out.methodRaw ? methodLabel(out.methodRaw) : '';
    return res.status(200).json(out);
  } catch (e) {
    console.error('payment-status failed:', e);
    return res.status(500).json({ error: 'server_error' });
  }
};