# نظام مؤشر الأداء المدرسي الذكي

نظام ويب لإدارة المدرسة مع نظام صلاحيات مرن.

## هيكل المشروع

```
My School/
├── school-performance-api/       # ASP.NET Core 8 (C#) + EF Core + SQL Server
├── school-performance-frontend/  # Angular 19 + Material (RTL)
└── docker-compose.yml            # SQL Server + API
```

## التشغيل السريع

### 1. النظام كاملاً بـ Docker (الأسهل)

```bash
docker compose up --build -d
```

- الواجهة الكاملة على `http://localhost:4300` (nginx يقدّم Angular ويمرر `/api` إلى الـ API)
- الـ API على `http://localhost:8081`
- SQL Server على `localhost,1434` (المستخدم `sa`، كلمة المرور في `.env.example`)

**تنبيه:** لا تضع المشروع داخل مجلد مزامن مع iCloud (سطح المكتب أو المستندات عند تفعيل المزامنة)، لأن مزامنة `node_modules` تبطئ الجهاز وتعطّل البناء. المكان المناسب مثل `~/Projects`.

قاعدة البيانات تُنشأ وتُعبّأ بالبيانات التجريبية تلقائياً عند أول تشغيل.

### 2. Frontend للتطوير مع إعادة التحميل الفوري (يتطلب Node.js)

```bash
cd school-performance-frontend
npm install
npm start
```

يعمل على `http://localhost:4200` ويمرر طلبات `/api` إلى المنفذ `8081`.

### 3. تسجيل الدخول

- **المستخدم:** admin
- **كلمة المرور:** admin123

حسابات تجريبية أخرى: `manager/manager123`، `salem/salem123`، `mariam/mariam123`

## الميزات الرئيسية

- Layout ثابت (Header + Sidebar + Content)
- Sidebar مقسم لأقسام مع إظهار/إخفاء حسب الصلاحيات
- CRUD للأدوار والصلاحيات والطلاب والمعلمين والشعب
- ربط الصلاحيات بالأدوار مع Checkboxes مجمعة حسب Module
- Permission Guard لحماية الصفحات في الواجهة، وفرض الصلاحيات في الخادم لكل endpoint
- الاجتماعات والمهام والحضور محفوظة في قاعدة البيانات
- صفحة الهيكل التنظيمي تحت الإدارة العليا تعكس المستخدمين والأدوار والشعب مباشرة
- Seed Data: Admin + جميع الصلاحيات

## التوسع المستقبلي

- إضافة Role/Permission جديد عبر الواجهة
- تعديل Sidebar من `sidebar.config.ts`
- إضافة Module جديد: أنشئ مجلداً + Service + Route
