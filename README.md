# نظام مؤشر الأداء المدرسي الذكي

نظام ويب لإدارة المدرسة مع نظام صلاحيات مرن.

## هيكل المشروع

```
My School/
├── school-performance-api/       # ASP.NET Core 8 (C#) + EF Core + SQL Server
├── school-performance-frontend/  # Angular 19 + Material (RTL)
└── docker-compose.yml            # API + web (SQL Server على localhost:1433)
```

## التشغيل السريع

### 1. المتطلبات

- SQL Server يعمل على `localhost,1433` (المستخدم `sa`، كلمة المرور في `.env.example`)
- قاعدة البيانات `SchoolPerformance` تُنشأ وتُعبّأ تلقائياً عند أول تشغيل للـ API

### 2. النظام كاملاً بـ Docker

```bash
docker compose up --build -d
```

- الواجهة الكاملة على `http://localhost:4300` (nginx يقدّم Angular ويمرر `/api` إلى الـ API)
- الـ API على `http://localhost:8081`
- يتصل بـ SQL Server على جهازك عبر `host.docker.internal:1433`

**تنبيه:** لا تضع المشروع داخل مجلد مزامن مع iCloud (سطح المكتب أو المستندات عند تفعيل المزامنة)، لأن مزامنة `node_modules` تبطئ الجهاز وتعطّل البناء. المكان المناسب مثل `~/Projects`.

### 3. التشغيل محلياً (API + Frontend)

**أ) الـ API** (يتطلب .NET 8 SDK و SQL Server على `1433`):

```bash
cd school-performance-api
dotnet run
```

يتصل بـ `localhost,1433` من `appsettings.json` ويعمل على `http://localhost:8081`.

**ب) Frontend للتطوير مع إعادة التحميل الفوري** (يتطلب Node.js):

```bash
cd school-performance-frontend
npm install
npm start
```

يعمل على `http://localhost:4200` ويمرر طلبات `/api` إلى المنفذ `8081`.

### 4. تسجيل الدخول

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
