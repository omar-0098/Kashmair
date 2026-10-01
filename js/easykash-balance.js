// netlify/functions/easykash-balance.js
// وسيط (Proxy) بيجيب رصيد EasyKash (إجمالي / متاح / معلّق) من السيرفر عشان مفتاح الـ API ميبقاش ظاهر في المتصفح.
//
// متغيّرات البيئة (Netlify → Site settings → Environment variables):
//   EASYKASH_API_KEY      مفتاح الـ API بتاعك
//   EASYKASH_BALANCE_URL  رابط الـ API اللي بيرجّع الرصيد (من توثيق EasyKash أو من الدعم بتاعهم)
//   EASYKASH_AUTH_HEADER  (اختياري) اسم الهيدر، الافتراضي: Authorization
//
// الرد للوحة التحكم: { total, available, pending }

const json = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  body: JSON.stringify(body),
});

const norm = (s) => String(s).replace(/[^a-z]/gi, "").toLowerCase();

// بيدوّر على أول حقل رقمي باسم من الأسماء دي (حتى لو جوه كائنات متداخلة)
function pick(obj, names) {
  const want = names.map(norm);
  const stack = [obj];
  while (stack.length) {
    const cur = stack.shift();
    if (!cur || typeof cur !== "object") continue;
    for (const [k, v] of Object.entries(cur)) {
      if (want.includes(norm(k))) {
        const n = parseFloat(String(v).replace(/,/g, ""));
        if (Number.isFinite(n)) return n;
      }
      if (v && typeof v === "object") stack.push(v);
    }
  }
  return null;
}

exports.handler = async () => {
  const url = process.env.EASYKASH_BALANCE_URL;
  const key = process.env.EASYKASH_API_KEY;
  const header = process.env.EASYKASH_AUTH_HEADER || "Authorization";
  if (!url || !key) return json(500, { error: "EASYKASH_BALANCE_URL / EASYKASH_API_KEY مش متظبطين" });

  try {
    const r = await fetch(url, { headers: { [header]: key, "Content-Type": "application/json" } });
    const raw = await r.json().catch(() => null);
    if (!r.ok || !raw) return json(502, { error: "EasyKash رد بخطأ", status: r.status });

    const available = pick(raw, ["available", "availableBalance", "available_balance"]);
    const pending = pick(raw, ["pending", "pendingBalance", "pending_balance", "onHold", "hold"]);
    let total = pick(raw, ["total", "totalBalance", "total_balance", "balance"]);
    if (total === null && available !== null && pending !== null) total = available + pending;

    if (total === null || available === null || pending === null) {
      // بنرجّع أسماء الحقول بس (من غير قيم) عشان تعرف تظبط التطابق
      return json(502, { error: "شكل الرد مش متوقّع", keys: Object.keys(raw) });
    }
    return json(200, { total, available, pending });
  } catch (e) {
    return json(502, { error: "تعذّر الاتصال بـ EasyKash" });
  }
};
