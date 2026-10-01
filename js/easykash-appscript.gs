/**
 * ============================================================
 *  EasyKash Payment Integration — Google Apps Script Web App
 * ============================================================
 * ده سكريبت منفصل تمامًا عن السكريبت اللي بيحفظ الطلبات في الشيت بتاعك.
 * وظيفته بس اتنين:
 *   1) لما موقعك يطلب منه، يكلم EasyKash ويجيب "رابط دفع" ويرجعهولك.
 *   2) لما EasyKash يبعت "كولباك" بعد ما العميل يدفع، يتحقق إن الرسالة
 *      فعلاً جايه من EasyKash (عن طريق HMAC) ويسجلها في شيت.
 *
 * ------------------------------------------------------------
 * خطوات التركيب (مرة واحدة بس):
 * ------------------------------------------------------------
 * 1. افتحي https://script.google.com  →  New project
 * 2. امسحي أي كود موجود، والصقي كل الكود ده بدل منه
 * 3. من القائمة الجانبية (⚙️ Project Settings) → Script Properties → Add property
 *      EASYKASH_API_KEY      =  المفتاح اللي شايفاه في easykash.net/seller/cash-api
 *      EASYKASH_HMAC_SECRET  =  مفتاح الـ HMAC السري (نفس الصفحة، دوسي على "باطل" عشان تظهره)
 *      SHEET_ID              =  (اختياري) الـ ID بتاع أي جوجل شيت عايزة تسجلي فيه الدفعات المؤكدة
 * 4. Deploy → New deployment → اختاري النوع "Web app"
 *      Execute as: Me
 *      Who has access: Anyone
 * 5. دوسي Deploy، وانسخي الرابط اللي بيظهر (بينتهي بـ /exec)
 * 6. حطي الرابط ده في chexkout.html بدل EASYKASH_APPSCRIPT_URL
 * 7. ارجعي لصفحة easykash.net/seller/cash-api وحطي نفس الرابط في خانة
 *    "Callback URL" ودوسي حفظ — عشان EasyKash يبلغك تلقائي بكل عملية دفع ناجحة
 * ============================================================
 */

function doPost(e) {
  var params;
  try {
    params = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonResponse({ error: "Invalid JSON" });
  }

  // كولباك جاي من EasyKash نفسه بعد إتمام الدفع (بيحتوي على signatureHash)
  if (params.signatureHash) {
    return handleEasykashCallback(params);
  }

  // طلب جاي من موقعك (checkout.html) لإنشاء رابط دفع جديد
  if (params.action === "createPayment") {
    return createEasykashPayment(params);
  }

  return jsonResponse({ error: "Unknown request" });
}

/**
 * بيكلم EasyKash Pay API ويجيب رابط دفع (Hosted Payment Page).
 * الرابط ده هيعرض للعميل كل وسائل الدفع المفعّلة عندك في الداشبورد
 * (بطاقة، محفظة، فوري، كاش من AMAN، ميزا... إلخ).
 */
function createEasykashPayment(params) {
  var props = PropertiesService.getScriptProperties();
  var apiKey = props.getProperty("EASYKASH_API_KEY");

  if (!apiKey) {
    return jsonResponse({ error: "EASYKASH_API_KEY مش متسجل في Script Properties" });
  }

  var amount = Number(params.amount);
  if (!amount || amount <= 0) {
    return jsonResponse({ error: "المبلغ غير صحيح" });
  }

  var payload = {
    amount: amount,
    currency: "EGP",
    name: params.customerName || "عميل كشمير هوم",
    email: params.customerEmail || "no-email@kashmairhome.com",
    mobile: (params.customerPhone || "").toString(),
    redirectUrl: params.redirectUrl || "https://kashmair.netlify.app/chexkout.html",
    customerReference: params.orderRef || ("order_" + new Date().getTime())
    // لو حبيتي تحددي وسائل دفع معينة بس، فكي الكومنت وحطي أرقامها هنا:
    // مثال: بطاقة (2) + محفظة (4) + فوري (5) + ميزا (6)
    // paymentOptions: [2, 4, 5, 6]
  };

  var options = {
    method: "post",
    contentType: "application/json",
    headers: { authorization: apiKey },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  var res = UrlFetchApp.fetch("https://back.easykash.net/api/directpayv1/pay", options);
  var code = res.getResponseCode();
  var body;
  try {
    body = JSON.parse(res.getContentText());
  } catch (err) {
    return jsonResponse({ error: "رد غير متوقع من EasyKash", raw: res.getContentText() });
  }

  if (code !== 200 || !body.redirectUrl) {
    return jsonResponse({ error: "EasyKash رفض الطلب", details: body });
  }

  return jsonResponse({ paymentUrl: body.redirectUrl });
}

/**
 * بيتحقق إن الكولباك فعلاً جاي من EasyKash (مش حد بيحاول يزوّر رسالة "الدفع تم")
 * عن طريق حساب HMAC-SHA512 لنفس البيانات بالسر بتاعك ومقارنته بالـ signatureHash
 * اللي بعتوه هما، بالظبط زي موثّق في التوثيق الرسمي.
 */
function handleEasykashCallback(payload) {
  var props = PropertiesService.getScriptProperties();
  var secret = props.getProperty("EASYKASH_HMAC_SECRET");

  if (!secret) {
    return jsonResponse({ error: "EASYKASH_HMAC_SECRET مش متسجل في Script Properties" });
  }

  var dataToSecure = [
    payload.ProductCode,
    payload.Amount,
    payload.ProductType,
    payload.PaymentMethod,
    payload.status,
    payload.easykashRef,
    payload.customerReference
  ].join("");

  var rawSignature = Utilities.computeHmacSha512Signature(dataToSecure, secret);
  var calculated = rawSignature.map(function (byte) {
    var v = (byte < 0 ? byte + 256 : byte).toString(16);
    return v.length === 1 ? "0" + v : v;
  }).join("");

  if (calculated !== payload.signatureHash) {
    return jsonResponse({ error: "توقيع غير صحيح — تم تجاهل الرسالة" });
  }

  // التوقيع سليم فعلاً جاي من EasyKash — سجليه في شيت (اختياري)
  var sheetId = props.getProperty("SHEET_ID");
  if (sheetId) {
    try {
      var ss = SpreadsheetApp.openById(sheetId);
      var sheet = ss.getSheetByName("EasyKash Payments") || ss.insertSheet("EasyKash Payments");
      if (sheet.getLastRow() === 0) {
        sheet.appendRow(["التاريخ", "مرجع الطلب", "المبلغ", "طريقة الدفع", "الحالة", "مرجع EasyKash", "اسم العميل", "إيميل العميل", "موبايل العميل"]);
      }
      sheet.appendRow([
        new Date(),
        payload.customerReference,
        payload.Amount,
        payload.PaymentMethod,
        payload.status,
        payload.easykashRef,
        payload.BuyerName,
        payload.BuyerEmail,
        payload.BuyerMobile
      ]);
    } catch (err) {
      // متعملش abort لو الشيت مش متظبط، المهم نرد على EasyKash بنجاح
      Logger.log("Sheet log error: " + err);
    }
  }

  return jsonResponse({ received: true });
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
