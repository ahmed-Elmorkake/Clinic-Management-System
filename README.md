# شفاء — Clinic Management System

واجهة React + Firebase عربية (RTL) لإدارة العيادات، مع أساس آمن قابل للتوسع لتعدد العيادات.

## التشغيل

```bash
npm install
npm run dev
npm run lint
npm run build
```

انسخ `.env.example` إلى `.env.local` وأدخل إعدادات Firebase الخاصة بك. فعّل Email/Password في Firebase Authentication وأنشئ ملف `users/{uid}` لكل مستخدم من بيئة إدارية موثوقة.

## البنية

- `features/auth`: جلسة Firebase وملف المستخدم وتسجيل الدخول واستعادة كلمة المرور.
- `features/patients`: قائمة المرضى وإنشاء ملف مرتبط بالعيادة.
- `features/appointments`: واجهة متابعة المواعيد.
- `layouts`: لوحة RTL والتنقل وفق الصلاحيات.
- `lib/permissions.js`: صلاحيات الواجهة فقط؛ ليست مصدر الحماية.

## نموذج البيانات والأمن

كل مستند سريري يحمل `clinicId` و`branchId` عند الحاجة. المجموعات الأساسية: `users`, `clinics`, `branches`, `patients`, `appointments`, `medicalRecords`, `prescriptions`, `labRequests`, `invoices`, `payments`, `notifications`, و`auditLogs`.

القواعد في `firestore.rules` تفرض المصادقة وعزل العيادة وصلاحيات العمليات، وتمنع كتابة سجل التدقيق من العميل. `storage.rules` تقيد الملفات ضمن `clinics/{clinicId}/...`. أنشئ المستخدمين وعيّن الأدوار واكتب سجلات التدقيق بواسطة Cloud Functions/Admin SDK فقط.

```bash
firebase deploy --only firestore:rules,storage
```

لا تحفظ بيانات صحية حقيقية في التطوير ولا تضع بيانات خدمة Firebase Admin في هذا المشروع.

## إنشاء الأدوار بأمان

- التسجيل العام في `/register` ينشئ مريضًا فقط، والقواعد تمنع إرسال أي دور أو صلاحيات أو عيادة مخصصة.
- حساب الطبيب ينشئه مدير النظام من لوحة الإدارة عبر Firebase Web SDK باستخدام تطبيق Auth ثانوي، ثم تُكتب ملفات `users` و`doctors` بصلاحية مدير النظام فقط. لا تُرسل كلمة المرور إلى قاعدة Firestore ولا تُستخدم Cloud Functions لهذا المسار.
- مدير العيادة يجب أن ينشئه `super_admin` بواسطة وظيفة موثوقة فقط.
- أنشئ أول `super_admin` من بيئة خادم محمية أو سكربت Firebase Admin محلي مع بيانات اعتماد غير موجودة في هذا المستودع. لا توجد واجهة عامة لهذا الإجراء.

بعد تغيير القواعد، راجعها في Emulator Suite ثم انشرها يدويًا؛ لم يتم نشر أي قواعد من هذا المشروع تلقائيًا.

## إعداد أول مدير نظام

أنشئ ملفًا محليًا خاصًا مثل `.env.admin` (لا تضعه في `src` ولا تستخدم أسماء `VITE_`) بالقيم الموجودة في `.env.example`. ثم شغّل، باستخدام Node 20 أو أحدث:

```bash
node --env-file=.env.admin scripts/create-super-admin.mjs
```

أو صدّر القيم كمتغيرات بيئة ثم نفذ:

```bash
npm run create:super-admin
```

السكربت آمن لإعادة التشغيل: يجد المستخدم بالبريد، يثبت custom claim وملف `users/{uid}` المطلوبين، ولا ينشئ حسابًا مكررًا. لا تشغّله على مشروع إنتاج إلا بعد التحقق من `FIREBASE_PROJECT_ID` والبريد المستهدف.

## الوظائف الموثوقة وإدارة الحسابات

يمكن نشر Cloud Functions اختيارياً للعمليات الأخرى بعد تثبيت Firebase CLI وتسجيل الدخول:

```bash
firebase deploy --only functions,firestore:rules,storage
```

- `createClinic` و`createClinicAdmin`: متاحتان لمدير النظام فقط.
- `inviteClinicStaff`: متاحة لمدير العيادة فقط وتقبل `doctor` أو `receptionist` فقط؛ تستمد العيادة من حساب المدير.
- `setUserActive`: تحدث حالة الحساب في Firebase Auth وFirestore وتكتب سجل تدقيق.

تعيد الدعوات رابط تعيين كلمة المرور إلى المدير المخول فقط. في الإنتاج، استبدل عرض الرابط على الشاشة بتوصيل بريد موثوق داخل Cloud Function أو امتداد Firebase مناسب.
