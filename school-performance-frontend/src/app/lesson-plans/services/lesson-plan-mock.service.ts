import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { LessonPlan } from '../../core/models';
import { createListStore } from '../../core/utils/mock-persistence';
import { DepartmentScopeService } from '../../core/services/department-scope.service';

const store = createListStore<LessonPlan>('demo_lesson_plans', [
  { id: 1, subject: 'رياضيات', teacherName: 'أ. سالم', stageName: 'العاشر', className: '10-أ', title: 'المعادلات الخطية', weekNumber: 12, attachmentName: 'plan-week12.pdf', status: 'APPROVED' },
  { id: 2, subject: 'علوم', teacherName: 'أ. مريم', stageName: 'الحادي عشر', className: '11-ب', title: 'الطاقة الحركية', weekNumber: 12, status: 'DRAFT' }
], 5);

@Injectable({ providedIn: 'root' })
export class LessonPlanMockService {
  private readonly departmentScope = inject(DepartmentScopeService);

  getAll(): Observable<LessonPlan[]> {
    return of(this.departmentScope.filterByDepartmentScope([...store.getItems()])).pipe(delay(200));
  }

  create(p: LessonPlan): Observable<LessonPlan> {
    const created = { ...p, id: store.nextId() };
    store.setItems([created, ...store.getItems()]);
    return of(created).pipe(delay(200));
  }

  update(id: number, p: LessonPlan): Observable<LessonPlan> {
    store.setItems(store.getItems().map(x => x.id === id ? { ...p, id } : x));
    return of({ ...p, id }).pipe(delay(200));
  }

  delete(id: number): Observable<void> {
    store.setItems(store.getItems().filter(x => x.id !== id));
    return of(void 0).pipe(delay(200));
  }
}
