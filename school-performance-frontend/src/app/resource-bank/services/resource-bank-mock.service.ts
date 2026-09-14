import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { ResourceFile } from '../../core/models';
import { DepartmentScopeService } from '../../core/services/department-scope.service';

let nextId = 5;
let MOCK: ResourceFile[] = [
  { id: 1, title: 'ملخص الوحدة الأولى', fileType: 'PDF', subject: 'رياضيات', stageName: 'العاشر', teacherName: 'أ. سالم', description: 'ملخص شامل للوحدة', uploadedAt: '2026-06-10' },
  { id: 2, title: 'عرض تقديمي - الخلية', fileType: 'PPTX', subject: 'أحياء', stageName: 'الحادي عشر', teacherName: 'أ. مريم', description: 'شرح الخلية النباتية', uploadedAt: '2026-06-12' }
];

@Injectable({ providedIn: 'root' })
export class ResourceBankMockService {
  private readonly departmentScope = inject(DepartmentScopeService);

  getAll(): Observable<ResourceFile[]> {
    return of(this.departmentScope.filterByDepartmentScope([...MOCK])).pipe(delay(200));
  }

  create(f: ResourceFile): Observable<ResourceFile> {
    const created = { ...f, id: ++nextId, uploadedAt: new Date().toISOString().slice(0, 10) };
    MOCK = [created, ...MOCK];
    return of(created).pipe(delay(200));
  }

  delete(id: number): Observable<void> {
    MOCK = MOCK.filter(x => x.id !== id);
    return of(void 0).pipe(delay(200));
  }
}
