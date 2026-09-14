import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { AlertItem } from '../../core/models';

let MOCK: AlertItem[] = [
  { id: 1, title: 'طلاب كثيرو الغياب - فصل 10-أ', alertType: 'ABSENCE', alertDate: '2026-06-18', severity: 'HIGH', status: 'NEW' },
  { id: 2, title: 'طلب صيانة متأخر', alertType: 'LATE_REQUEST', alertDate: '2026-06-17', severity: 'MEDIUM', status: 'NEW' },
  { id: 3, title: 'مهمة متأخرة: متابعة الصيانة', alertType: 'OVERDUE_TASK', alertDate: '2026-06-16', severity: 'HIGH', status: 'REVIEWED' },
  { id: 4, title: 'انخفاض مستوى - نورة حسن', alertType: 'LOW_PERFORMANCE', alertDate: '2026-06-15', severity: 'MEDIUM', status: 'NEW' },
  { id: 5, title: 'ملاحظات سلوكية متكررة - خالد سعيد', alertType: 'BEHAVIOR', alertDate: '2026-06-14', severity: 'LOW', status: 'NEW' }
];

@Injectable({ providedIn: 'root' })
export class AlertMockService {
  getAll(): Observable<AlertItem[]> {
    return of([...MOCK]).pipe(delay(200));
  }

  markReviewed(id: number): Observable<AlertItem> {
    MOCK = MOCK.map(a => a.id === id ? { ...a, status: 'REVIEWED' as const } : a);
    const item = MOCK.find(a => a.id === id)!;
    return of(item).pipe(delay(200));
  }
}
