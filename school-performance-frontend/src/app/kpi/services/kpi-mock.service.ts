import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';

export type KpiStatus = 'EXCELLENT' | 'GOOD' | 'WARNING' | 'CRITICAL';
export type KpiTrend = 'UP' | 'DOWN' | 'STABLE';

export interface KpiIndicator {
  id: string;
  name: string;
  category: string;
  value: number;
  target: number;
  unit: string;
  trend: KpiTrend;
  trendValue: number;
  status: KpiStatus;
  description?: string;
}

export interface KpiCategory {
  key: string;
  name: string;
  icon: string;
  color: string;
  score: number;
  indicators: KpiIndicator[];
}

export interface KpiOverview {
  overallScore: number;
  overallStatus: KpiStatus;
  periodLabel: string;
  lastUpdated: string;
  categories: KpiCategory[];
}

export interface KpiFilters {
  period?: string;
  stage?: string;
}

const MOCK_OVERVIEW: KpiOverview = {
  overallScore: 87.4,
  overallStatus: 'GOOD',
  periodLabel: 'الفصل الدراسي الثاني 2025/2026',
  lastUpdated: '2026-06-20',
  categories: [
    {
      key: 'ACADEMIC',
      name: 'الأداء الأكاديمي',
      icon: 'school',
      color: '#1976d2',
      score: 88.2,
      indicators: [
        { id: 'avg-grade', name: 'متوسط الدرجات العام', category: 'ACADEMIC', value: 78.5, target: 75, unit: '%', trend: 'UP', trendValue: 2.1, status: 'GOOD' },
        { id: 'pass-rate', name: 'نسبة النجاح', category: 'ACADEMIC', value: 94.2, target: 90, unit: '%', trend: 'UP', trendValue: 1.5, status: 'EXCELLENT' },
        { id: 'excellence-rate', name: 'نسبة التفوق', category: 'ACADEMIC', value: 32.8, target: 30, unit: '%', trend: 'STABLE', trendValue: 0, status: 'GOOD' },
        { id: 'remedial', name: 'طلاب يحتاجون دعم', category: 'ACADEMIC', value: 8.4, target: 10, unit: '%', trend: 'DOWN', trendValue: 1.2, status: 'GOOD', description: 'كلما انخفضت كانت أفضل' }
      ]
    },
    {
      key: 'ATTENDANCE',
      name: 'الحضور والانصراف',
      icon: 'event_available',
      color: '#388e3c',
      score: 91.5,
      indicators: [
        { id: 'student-att', name: 'حضور الطلاب', category: 'ATTENDANCE', value: 91.5, target: 90, unit: '%', trend: 'UP', trendValue: 0.8, status: 'EXCELLENT' },
        { id: 'teacher-att', name: 'حضور المعلمين', category: 'ATTENDANCE', value: 96.8, target: 95, unit: '%', trend: 'STABLE', trendValue: 0, status: 'EXCELLENT' },
        { id: 'late-rate', name: 'نسبة التأخر', category: 'ATTENDANCE', value: 4.2, target: 5, unit: '%', trend: 'DOWN', trendValue: 0.6, status: 'GOOD' },
        { id: 'absence-days', name: 'متوسط أيام الغياب', category: 'ATTENDANCE', value: 2.1, target: 3, unit: 'يوم', trend: 'DOWN', trendValue: 0.3, status: 'GOOD' }
      ]
    },
    {
      key: 'BEHAVIOR',
      name: 'السلوك والانضباط',
      icon: 'gavel',
      color: '#f57c00',
      score: 84.0,
      indicators: [
        { id: 'positive-ratio', name: 'نسبة الملاحظات الإيجابية', category: 'BEHAVIOR', value: 72, target: 65, unit: '%', trend: 'UP', trendValue: 4, status: 'GOOD' },
        { id: 'incidents', name: 'حوادث سلوكية شهرياً', category: 'BEHAVIOR', value: 6, target: 8, unit: 'حادثة', trend: 'DOWN', trendValue: 2, status: 'GOOD' },
        { id: 'warnings', name: 'إنذارات نشطة', category: 'BEHAVIOR', value: 3, target: 5, unit: 'إنذار', trend: 'STABLE', trendValue: 0, status: 'GOOD' },
        { id: 'discipline-score', name: 'مؤشر الانضباط العام', category: 'BEHAVIOR', value: 86, target: 85, unit: '%', trend: 'UP', trendValue: 1.8, status: 'GOOD' }
      ]
    },
    {
      key: 'TEACHING',
      name: 'الأداء التعليمي',
      icon: 'menu_book',
      color: '#0288d1',
      score: 85.6,
      indicators: [
        { id: 'lesson-plans', name: 'إنجاز خطط الدروس', category: 'TEACHING', value: 88, target: 85, unit: '%', trend: 'UP', trendValue: 3, status: 'GOOD' },
        { id: 'teacher-eval', name: 'تقييم المعلمين', category: 'TEACHING', value: 4.2, target: 4, unit: '/5', trend: 'UP', trendValue: 0.1, status: 'EXCELLENT' },
        { id: 'assignments', name: 'تسليم الواجبات في الوقت', category: 'TEACHING', value: 79, target: 80, unit: '%', trend: 'DOWN', trendValue: 1.5, status: 'WARNING' },
        { id: 'parent-contact', name: 'التواصل مع أولياء الأمور', category: 'TEACHING', value: 82, target: 80, unit: '%', trend: 'UP', trendValue: 2, status: 'GOOD' }
      ]
    },
    {
      key: 'MANAGEMENT',
      name: 'الإدارة والمتابعة',
      icon: 'assessment',
      color: '#7b1fa2',
      score: 86.8,
      indicators: [
        { id: 'requests', name: 'إغلاق الطلبات الداخلية', category: 'MANAGEMENT', value: 78, target: 75, unit: '%', trend: 'UP', trendValue: 5, status: 'GOOD' },
        { id: 'tasks', name: 'إنجاز المهام في الوقت', category: 'MANAGEMENT', value: 81, target: 85, unit: '%', trend: 'DOWN', trendValue: 2, status: 'WARNING' },
        { id: 'meetings', name: 'تنفيذ قرارات الاجتماعات', category: 'MANAGEMENT', value: 90, target: 88, unit: '%', trend: 'STABLE', trendValue: 0, status: 'EXCELLENT' },
        { id: 'alerts', name: 'معالجة التنبيهات', category: 'MANAGEMENT', value: 92, target: 90, unit: '%', trend: 'UP', trendValue: 3, status: 'EXCELLENT' }
      ]
    }
  ]
};

@Injectable({ providedIn: 'root' })
export class KpiMockService {
  getOverview(filters?: KpiFilters): Observable<KpiOverview> {
    const data = structuredClone(MOCK_OVERVIEW);
    if (filters?.period === 'month') {
      data.periodLabel = 'يونيو 2026';
    } else if (filters?.period === 'year') {
      data.periodLabel = 'العام الدراسي 2025/2026';
    }
    if (filters?.stage) {
      data.overallScore = Math.round((data.overallScore - 2 + Math.random() * 4) * 10) / 10;
    }
    return of(data).pipe(delay(350));
  }
}
