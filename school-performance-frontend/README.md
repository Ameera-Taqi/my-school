# نظام مؤشر الأداء المدرسي الذكي - Frontend

## المتطلبات
- Node.js 18+
- npm

## التشغيل

```bash
cd school-performance-frontend
npm install
npm start
```

التطبيق يعمل على: `http://localhost:4200`

## بيانات الدخول الافتراضية

| الحقل | القيمة |
|-------|--------|
| اسم المستخدم | admin |
| كلمة المرور | admin123 |

## هيكل المشروع

```
src/app/
├── core/           # Guards, Interceptors, Services, Models, Constants
├── shared/         # مكونات مشتركة
├── layout/         # Header, Sidebar, Main Layout
├── auth/           # تسجيل الدخول
├── dashboard/      # لوحة التحكم
├── roles/          # إدارة الأدوار
├── permissions/    # إدارة الصلاحيات وربطها بالأدوار
├── students/       # الطلاب
├── teachers/       # المعلمون
└── departments/    # الأقسام
```

## تخصيص القائمة الجانبية

عدّل الملف: `src/app/core/constants/sidebar.config.ts`

كل عنصر يحتوي على:
- `label`: اسم القائمة بالعربية
- `icon`: أيقونة Material
- `route`: مسار الصفحة
- `permission`: مفتاح الصلاحية المطلوبة

## إضافة صلاحية جديدة

1. أضف الصلاحية في Backend (أو عبر صفحة الصلاحيات)
2. أضف عنصراً في `sidebar.config.ts`
3. أضف Route في `app.routes.ts` مع `permissionGuard`

## UI conventions (shared building blocks)

All pages share one visual system. When adding a page, reuse these instead of writing new styles:

| Need | Use |
|------|-----|
| Success / error toast | `ToastService` (`shared/services/toast.service.ts`) — `success()`, `error()`, `fromError(err)` |
| Delete / confirm prompt | `ConfirmService` — `deleteConfirmed(name, 'الطالب').subscribe(...)` |
| Read-only details popup | `DetailDialogService.open({ title, fields: [...] })` |
| Table loading | `<app-table-skeleton>` |
| No data / no results | `<app-empty-state icon title description>` |
| Search box | `<app-search-field (search)="...">` |
| Dates | `{{ value \| appDate }}` (also `'withTime'`, `'short'`) |
| Status pills | `<span class="chip success|warning|danger|info|neutral">` |
| Row actions | `<div class="row-actions">` with `mat-icon-button` + `matTooltip` (`class="danger"` for delete) |
| Card + table wrapper | `.data-card > .list-toolbar + .table-scroll > table mat-table + mat-paginator` |

Design tokens (colors, radius, shadows) are CSS variables in `src/styles.scss` (`--sp-*`). The sidebar collapses to icons on desktop and becomes a drawer under 960px (`LayoutService`).
