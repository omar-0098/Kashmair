// تحويل الطلب المعلّق (paymentOrders) لطلب مؤكد مدفوع (orders + userOrders).
// بيتنادى من الـ callback ومن payment-status (لو الـ callback اتأخر أو ماوصلش).
const { eKey, get, update, transaction } = require('./firebase');
const { parseAmount, methodLabel, MAX_DAYS } = require('./easykash');
const { notifyOrder } = require('./notify');

const SAFE_KEY_RE = /^[A-Za-z0-9_-]{1,64}$/;
const DONE = ['finalized', 'finalizing', 'amount_mismatch'];

// pay = { amount, method, easykashRef }
async function finalizeOrder(id, pay) {
  const rec = await get(`paymentOrders/${id}`);
  if (!rec || !rec.order) return { ok: false, reason: 'unknown_order' };

  // منع المعالجة المكررة
  const claim = await transaction(`paymentOrders/${id}/state`, (cur) => (DONE.includes(cur) ? undefined : 'finalizing'));
  if (!claim.committed) return { ok: true, reason: 'already_processed' };

  try {
    const o = rec.order;
    const expected = Number(rec.amountExpected) || parseAmount(o.total);
    const paid = pay.amount == null || pay.amount === '' ? expected : parseAmount(pay.amount);
    if (!(paid + 0.01 >= expected)) {
      console.error('finalize: amount mismatch', { id, expected, paid });
      await update({ [`paymentOrders/${id}/state`]: 'amount_mismatch' });
      return { ok: false, reason: 'amount_mismatch' };
    }

    const now = Date.now();
    const finalOrder = Object.assign({}, o, {
      payment: 'دفع أونلاين — ' + methodLabel(pay.method),
      paymentStatus: 'paid',
      paymentMethodDetail: String(pay.method || ''),
      easykashRef: String(pay.easykashRef || ''),
      paidAmount: paid,
      gatewayFee: Math.max(0, Math.round((paid - expected) * 100) / 100),
      paidAt: now,
      placedAt: o.createdAt || now,
      createdAt: now,
      deadline: now + MAX_DAYS * 24 * 60 * 60 * 1000,
      stage: 0
    });

    const updates = {
      [`orders/${id}`]: finalOrder,
      [`paymentOrders/${id}/state`]: 'finalized',
      [`paymentOrders/${id}/finalizedAt`]: now,
      [`paymentOrders/${id}/easykashRef`]: finalOrder.easykashRef
    };
    if (o.email) updates[`userOrders/${eKey(o.email)}/${id}`] = finalOrder;
    else console.error('finalize: order has no email, saved under orders/ only', id);
    await update(updates);

    // عدّاد كود الخصم بعد الدفع الفعلي
    if (o.couponId && SAFE_KEY_RE.test(String(o.couponId))) {
      try {
        const inc = (c) => (Number(c) || 0) + 1;
        await transaction(`coupons/${o.couponId}/usedCount`, inc);
        if (o.email) await transaction(`coupons/${o.couponId}/usedBy/${eKey(o.email)}`, inc);
      } catch (e) {
        console.error('finalize: coupon counter failed', e);
      }
    }

    // إشعار تليجرام (فشله مش بيأثر على تأكيد الطلب)
    try {
      await notifyOrder(id, finalOrder);
    } catch (e) {
      console.error('finalize: notify failed', e);
    }

    return { ok: true, reason: 'finalized' };
  } catch (e) {
    try {
      await update({ [`paymentOrders/${id}/state`]: 'pending' });
    } catch (e2) {}
    throw e;
  }
}

module.exports = { finalizeOrder };