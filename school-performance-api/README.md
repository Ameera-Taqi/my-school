# نظام مؤشر الأداء المدرسي الذكي - API

Backend مبني بـ **ASP.NET Core 8 (C#)** مع **Entity Framework Core** وقاعدة بيانات **SQL Server**.

## التشغيل (Docker)

من مجلد المشروع الرئيسي:

```bash
docker compose up --build -d
```

يشغّل حاويتين:

| الحاوية | المنفذ على جهازك | الوصف |
|---------|------------------|-------|
| `school-sqlserver` | `1434` | SQL Server 2022 Developer |
| `school-api` | `8081` | الـ API |

عند أول تشغيل يتم إنشاء قاعدة البيانات `SchoolPerformance` تلقائياً (EF Core Migrations) ثم تعبئة البيانات التجريبية.

## الاتصال من SQL Server Management Studio

| الحقل | القيمة |
|-------|--------|
| Server name | `localhost,1434` |
| Authentication | SQL Server Authentication |
| Login | `sa` |
| Password | `SchoolPerf2026Strong` (أو القيمة في `.env`) |
| Database | `SchoolPerformance` |

فعّل خيار **Trust server certificate** في نافذة الاتصال.

## الإعدادات

انسخ `.env.example` إلى `.env` في المجلد الرئيسي لتغيير كلمة مرور `sa` أو المنفذ أو مفتاح JWT.

## بيانات الدخول الافتراضية

| المستخدم | كلمة المرور | الدور |
|----------|-------------|-------|
| admin | admin123 | Admin |
| manager | manager123 | مدير المدرسة |
| salem | salem123 | رئيس قسم |
| mariam | mariam123 | معلم |

## API Endpoints

| Method | Endpoint | الوصف |
|--------|----------|-------|
| POST | /api/auth/login | تسجيل الدخول |
| GET | /api/auth/me | بيانات المستخدم الحالي |
| GET/POST/PUT/DELETE | /api/roles | إدارة الأدوار |
| GET/POST/PUT/DELETE | /api/permissions | إدارة الصلاحيات |
| GET/PUT | /api/role-permissions | ربط الصلاحيات بالأدوار |
| GET/POST/PUT/DELETE | /api/users | إدارة المستخدمين |
| GET/POST/PUT/DELETE | /api/academic-stages | المراحل الدراسية |
| GET/POST | /api/academic-stages/{id}/classes | فصول المرحلة |
| GET/PUT/DELETE | /api/classes/{id} | إدارة الفصول |
| GET/POST | /api/classes/{id}/students | طلاب الفصل |
| GET/PUT/DELETE | /api/students/{id} | إدارة الطلاب |
| GET/POST/PUT/DELETE | /api/departments | إدارة الأقسام |
| GET/POST | /api/departments/{id}/teachers | معلمو القسم |
| GET/PUT/DELETE | /api/teachers/{id} | إدارة المعلمين |
| GET/POST/PUT/DELETE | /api/calendar/events | تقويم الأحداث |
| GET | /api/teacher-monitoring | متابعة المعلمين |
| GET/POST/PUT/DELETE | /api/meetings | الاجتماعات (تُنشئ حدثاً في التقويم للأدوار المستهدفة) |
| GET/POST/PUT/DELETE | /api/tasks | المهام |
| GET/PUT | /api/attendance/students?classId=&date= | حضور طلاب فصل في يوم |
| GET/PUT | /api/attendance/teachers?date= | حضور المعلمين في يوم |
| GET | /api/attendance/summary?date= | ملخص حضور اليوم |
| GET | /api/org-structure | الهيكل التنظيمي (يُبنى من المستخدمين والأدوار والأقسام) |
| GET/POST/PUT/DELETE | /api/subjects | المواد الدراسية |
| GET/POST/PUT/DELETE | /api/schedule/assignments?classId= | تكليفات الفصل (مادة + معلم + حصص/أسبوع) |
| GET/POST/DELETE | /api/schedule/constraints?teacherId= | قيود توفر المعلمين |
| GET | /api/schedule/entries?classId= أو ?teacherId= | جدول الحصص |
| PUT | /api/schedule/entries/slot | وضع/إخلاء حصة يدوياً مع التحقق من التعارض |
| POST | /api/schedule/generate | توليد الجدول بالقيود (بحث تراجعي، الأكثر تقييداً أولاً) |
| GET | /api/schedule/overview | اكتمال الفصول وأعباء المعلمين والتعارضات |
| GET | /health | فحص الحالة |

## الصلاحيات في الخادم

كل endpoint محمي بـ `[RequirePermission(...)]` ويقبل الطلب إذا كان المستخدم يملك **أياً** من المفاتيح المذكورة. المفاتيح معرّفة في `Security/Perms.cs` وتُقرأ من قاعدة البيانات في كل طلب، فأي تعديل على صلاحيات دور يسري فوراً بدون إعادة تسجيل دخول. الاستجابة عند الرفض: `403` مع `{ "message": "ليس لديك صلاحية لتنفيذ هذا الإجراء" }`.

## بنية المشروع

```
school-performance-api/
├── Controllers/   # REST endpoints
├── Services/      # منطق العمل
├── Entities/      # نماذج قاعدة البيانات
├── Dtos/          # نماذج الطلبات والاستجابات
├── Data/          # AppDbContext + DataSeeder
├── Migrations/    # EF Core migrations
├── Security/      # JWT
└── Common/        # الاستثناءات ومعالجة الأخطاء
```

## إضافة Migration جديدة

بعد تعديل الـ Entities (لا يتطلب تثبيت .NET محلياً):

```bash
docker run --rm -v "$PWD":/src -w /src mcr.microsoft.com/dotnet/sdk:8.0 bash -c \
  "dotnet tool install -g dotnet-ef && export PATH=\$PATH:/root/.dotnet/tools && dotnet ef migrations add <Name>"
```

تُطبَّق الـ migrations تلقائياً عند تشغيل الـ API.
