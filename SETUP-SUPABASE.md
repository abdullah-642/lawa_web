# ربط الموقع و CRM بـ Supabase

اتبع هذه الخطوات الثلاث **مرة واحدة فقط** لتفعيل قاعدة البيانات السحابية.

---

## الخطوة 1 — إنشاء الجداول

1. افتح **Supabase Dashboard** → SQL Editor:
   https://supabase.com/dashboard/project/wbkfuiwyqsccdkhkogur/sql/new

2. افتح ملف **`supabase-schema.sql`** الموجود في مشروعك
3. انسخ كامل محتواه
4. الصقه في الـ SQL Editor واضغط **Run**

سيتم إنشاء:
- 7 جداول (`app_users`, `requests`, `customers`, `projects`, `quotes`, `tasks`, `settings`)
- مستخدم افتراضي: `admin` / `Liwa@2026`
- صف الإعدادات الأولي
- دالتان: `verify_login` و`change_password`
- سياسات الأمان (Row Level Security)

---

## الخطوة 2 — نسخ مفتاح الـ API

المتصفح لا يستطيع الاتصال بـ PostgreSQL مباشرة. يستخدم **anon public key** بدلاً من ذلك.

1. افتح:
   https://supabase.com/dashboard/project/wbkfuiwyqsccdkhkogur/settings/api

2. ابحث عن قسم **Project API keys**
3. انسخ القيمة المسماة **`anon` `public`** (سلسلة طويلة تبدأ بـ `eyJ...`)
4. افتح ملف **`supabase-config.js`** في مشروعك
5. استبدل `PASTE_YOUR_ANON_KEY_HERE` بالمفتاح المنسوخ
6. احفظ الملف

مثال:
```js
window.SUPABASE_CONFIG = {
  url: "https://wbkfuiwyqsccdkhkogur.supabase.co",
  anonKey: "eyJhbGciOiJIUzI1NiIs..." // ← المفتاح هنا
};
```

---

## الخطوة 3 — تحقّق أن كل شيء يعمل

1. شغّل الخادم المحلي: `python -m http.server 8000`
2. افتح: http://localhost:8000
3. اذهب لقسم "تواصل" واملأ النموذج وأرسل
4. افتح: http://localhost:8000/crm-login.html
5. ادخل بـ `admin` / `Liwa@2026`
6. اذهب لقسم **استقبال الطلبات** — يجب أن ترى الطلب الذي أرسلته للتو

تأكيد إضافي عبر Supabase:
- افتح: https://supabase.com/dashboard/project/wbkfuiwyqsccdkhkogur/editor
- اختر جدول `requests` — يجب أن تظهر فيه السطور

---

## ⚠️ ملاحظات أمنية مهمة

### 1. غيّر كلمة مرور قاعدة البيانات

كلمة مرور الـ DB (`UIMQr1Nv6yTaa4wV`) شاركتها معي في الشات.
**لا تستخدم هذه الكلمة في الإنتاج** — غيّرها من:
https://supabase.com/dashboard/project/wbkfuiwyqsccdkhkogur/settings/database

### 2. مفتاح الـ Anon آمن للنشر

على عكس كلمة مرور الـ DB، مفتاح **anon public** مصمم ليُنشر في كود الواجهة.
يحميه نظام Row Level Security (RLS) في Supabase.

### 3. غيّر كلمة مرور المسؤول

كلمة المرور الافتراضية `Liwa@2026` معروفة — غيّرها فوراً من:
- داخل النظام: الإعدادات → الحساب → تغيير كلمة المرور

### 4. تشديد الـ RLS للإنتاج

السياسات الحالية تسمح للـ anon role بكل العمليات (للتسهيل أثناء التطوير).
في الإنتاج، يُفضّل:
- استخدام Supabase Auth بدلاً من الجدول المخصص `app_users`
- تشديد السياسات: المستخدمون العامون يستطيعون فقط INSERT في `requests`
  والمستخدمون المصادَق عليهم يقرؤون ويعدّلون باقي الجداول

---

## كيف يعمل النظام تقنياً

```
[نموذج التواصل في الموقع]
         ↓
   CRM.intake.submit()
         ↓
   DB.upsert("requests", item)
         ↓
   ┌─────────────────┐
   │ 1. حفظ محلي     │ (localStorage — UI سريع)
   │ 2. حفظ سحابي    │ (Supabase — مزامنة)
   └─────────────────┘
         ↓
   [يظهر في CRM → استقبال الطلبات]
```

### المزايا
- **مزامنة عبر الأجهزة:** افتح النظام من أي جهاز يرى نفس البيانات
- **نسخ احتياطية تلقائية:** Supabase ينسخ DB يومياً
- **العمل بلا إنترنت:** يستمر النظام من localStorage إذا فشل الاتصال
- **مزامنة عند العودة:** عند رجوع الإنترنت تتم المزامنة

### الجداول
| الجدول | الوصف |
|---|---|
| `app_users` | حسابات الدخول للنظام |
| `requests` | طلبات نموذج التواصل |
| `customers` | قاعدة العملاء |
| `projects` | المشاريع الجارية |
| `quotes` | عروض الأسعار |
| `tasks` | المهام |
| `settings` | إعدادات الشركة (صف واحد فقط) |
