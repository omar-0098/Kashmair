// إشعار تليجرام فوري لما طلب يتدفع. محتاج متغيرين في Vercel:
// TELEGRAM_BOT_TOKEN  و  TELEGRAM_CHAT_ID
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

async function notifyOrder(id, o) {
  const token = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
  const chat = (process.env.TELEGRAM_CHAT_ID || '').trim();
  if (!token || !chat) return;

  let items = '';
  if (Array.isArray(o.items)) {
    items = o.items.map((i) => `• ${esc(i.name || i.title || '')} × ${esc(i.qty || i.quantity || 1)}`).join('\n');
  }
  const text = [
    '✅ <b>طلب جديد مدفوع</b>',
    `🔖 الكود: ${esc(o.code || id)}`,
    `👤 ${esc(o.recipient)}`,
    `📞 ${esc(o.phone)}`,
    `✉️ ${esc(o.email)}`,
    o.address ? `📍 ${esc(o.address)}` : '',
    items ? `\n${items}` : '',
    `\n💰 المدفوع: ${esc(o.paidAmount)} ج.م`,
    `💳 ${esc(o.payment)}`,
    `🧾 EasyKash: ${esc(o.easykashRef)}`
  ].filter(Boolean).join('\n');

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 5000);
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chat, text, parse_mode: 'HTML' }),
      signal: ctrl.signal
    });
  } finally {
    clearTimeout(t);
  }
}

module.exports = { notifyOrder };
