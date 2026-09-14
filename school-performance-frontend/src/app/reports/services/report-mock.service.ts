import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { ReportType } from '../../core/models';

export interface ReportFilters {
  dateFrom?: string;
  dateTo?: string;
  stage?: string;
  className?: string;
  status?: string;
}

export interface ReportRow {
  [key: string]: string | number;
}

export interface ReportResult {
  title: string;
  generatedAt: string;
  summary: { label: string; value: string | number }[];
  columns: string[];
  columnLabels: Record<string, string>;
  rows: ReportRow[];
}

@Injectable({ providedIn: 'root' })
export class ReportMockService {
  generate(type: ReportType, filters: ReportFilters): Observable<ReportResult> {
    const result = this.buildReport(type, filters);
    return of(result).pipe(delay(400));
  }

  private buildReport(type: ReportType, filters: ReportFilters): ReportResult {
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const period = this.formatPeriod(filters);

    switch (type) {
      case 'ATTENDANCE':
        return {
          title: 'تقرير الحضور',
          generatedAt: now,
          summary: [
            { label: 'نسبة الحضور', value: '91.5%' },
            { label: 'عدد الغياب', value: 24 },
            { label: 'عدد المتأخرين', value: 12 }
          ],
          columns: ['studentName', 'className', 'stage', 'presentDays', 'absentDays', 'rate'],
          columnLabels: {
            studentName: 'الطالب', className: 'الفصل', stage: 'المرحلة',
            presentDays: 'أيام الحضور', absentDays: 'أيام الغياب', rate: 'النسبة'
          },
          rows: [
            { studentName: 'أحمد محمد', className: '10-أ', stage: 'العاشر', presentDays: 18, absentDays: 2, rate: '90%' },
            { studentName: 'فاطمة علي', className: '10-أ', stage: 'العاشر', presentDays: 20, absentDays: 0, rate: '100%' },
            { studentName: 'خالد سعيد', className: '10-ب', stage: 'العاشر', presentDays: 15, absentDays: 5, rate: '75%' }
          ]
        };
      case 'STUDENTS':
        return {
          title: 'تقرير الطلاب',
          generatedAt: now,
          summary: [
            { label: 'إجمالي الطلاب', value: 248 },
            { label: 'الطلاب النشطون', value: 240 },
            { label: 'المرحلة المحددة', value: filters.stage || 'الكل' }
          ],
          columns: ['fullName', 'className', 'stage', 'guardianPhone', 'status'],
          columnLabels: {
            fullName: 'الاسم', className: 'الفصل', stage: 'المرحلة',
            guardianPhone: 'ولي الأمر', status: 'الحالة'
          },
          rows: [
            { fullName: 'أحمد محمد', className: '10-أ', stage: 'العاشر', guardianPhone: '96890001111', status: 'نشط' },
            { fullName: 'نورة حسن', className: '11-أ', stage: 'الحادي عشر', guardianPhone: '96890004444', status: 'نشط' }
          ]
        };
      case 'TEACHERS':
        return {
          title: 'تقرير المعلمين',
          generatedAt: now,
          summary: [
            { label: 'عدد المعلمين', value: 32 },
            { label: 'الأقسام', value: 4 },
            { label: 'الفترة', value: period }
          ],
          columns: ['fullName', 'department', 'specialization', 'hireDate', 'status'],
          columnLabels: {
            fullName: 'الاسم', department: 'القسم', specialization: 'التخصص',
            hireDate: 'تاريخ التعيين', status: 'الحالة'
          },
          rows: [
            { fullName: 'د. سالم الحارثي', department: 'رياضيات', specialization: 'رياضيات', hireDate: '2020-09-01', status: 'نشط' },
            { fullName: 'أ. مريم الزهراني', department: 'علوم', specialization: 'فيزياء', hireDate: '2021-09-01', status: 'نشط' }
          ]
        };
      case 'BEHAVIOR':
        return {
          title: 'تقرير السلوك',
          generatedAt: now,
          summary: [
            { label: 'ملاحظات إيجابية', value: 18 },
            { label: 'ملاحظات سلبية', value: 7 },
            { label: 'إنذارات', value: 3 }
          ],
          columns: ['studentName', 'type', 'description', 'noteDate', 'recordedBy'],
          columnLabels: {
            studentName: 'الطالب', type: 'النوع', description: 'الوصف',
            noteDate: 'التاريخ', recordedBy: 'المسجل'
          },
          rows: [
            { studentName: 'أحمد محمد', type: 'إيجابية', description: 'مشاركة متميزة', noteDate: '2026-06-15', recordedBy: 'أ. سالم' },
            { studentName: 'خالد سعيد', type: 'إنذار', description: 'تأخر متكرر', noteDate: '2026-06-14', recordedBy: 'أ. مريم' }
          ]
        };
      case 'REQUESTS':
        return {
          title: 'تقرير الطلبات الداخلية',
          generatedAt: now,
          summary: [
            { label: 'طلبات جديدة', value: 5 },
            { label: 'قيد المراجعة', value: 3 },
            { label: 'مكتملة', value: 12 }
          ],
          columns: ['requestType', 'requester', 'priority', 'status', 'requestDate'],
          columnLabels: {
            requestType: 'النوع', requester: 'مقدم الطلب', priority: 'الأولوية',
            status: 'الحالة', requestDate: 'التاريخ'
          },
          rows: [
            { requestType: 'صيانة', requester: 'أ. سالم', priority: 'عالية', status: 'قيد المراجعة', requestDate: '2026-06-17' },
            { requestType: 'مستلزمات', requester: 'أ. مريم', priority: 'متوسطة', status: 'جديد', requestDate: '2026-06-18' }
          ]
        };
      case 'TASKS':
        return {
          title: 'تقرير المهام',
          generatedAt: now,
          summary: [
            { label: 'مهام جديدة', value: 4 },
            { label: 'قيد التنفيذ', value: 6 },
            { label: 'متأخرة', value: 2 }
          ],
          columns: ['title', 'assignee', 'dueDate', 'priority', 'status'],
          columnLabels: {
            title: 'المهمة', assignee: 'المسؤول', dueDate: 'الاستحقاق',
            priority: 'الأولوية', status: 'الحالة'
          },
          rows: [
            { title: 'تقرير الحضور الشهري', assignee: 'المدير المساعد', dueDate: '2026-06-25', priority: 'عالية', status: 'قيد التنفيذ' },
            { title: 'متابعة الصيانة', assignee: 'مسؤول الصيانة', dueDate: '2026-06-20', priority: 'عالية', status: 'متأخرة' }
          ]
        };
      default:
        return { title: 'تقرير', generatedAt: now, summary: [], columns: [], columnLabels: {}, rows: [] };
    }
  }

  private formatPeriod(filters: ReportFilters): string {
    if (filters.dateFrom && filters.dateTo) {
      return `${filters.dateFrom} — ${filters.dateTo}`;
    }
    if (filters.dateFrom) return `من ${filters.dateFrom}`;
    if (filters.dateTo) return `حتى ${filters.dateTo}`;
    return 'الكل';
  }
}
