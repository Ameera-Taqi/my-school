import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { AcademicDepartment } from '../../core/models';

let nextId = 10;
let MOCK: AcademicDepartment[] = [
  { id: 1, name: 'قسم الرياضيات', headName: 'د. سالم الحارثي', teacherCount: 8, subjects: 'رياضيات، إحصاء' },
  { id: 2, name: 'قسم العلوم', headName: 'أ. مريم الزهراني', teacherCount: 6, subjects: 'فيزياء، كيمياء، أحياء' },
  { id: 3, name: 'قسم اللغة العربية', headName: 'أ. يوسف العتيبي', teacherCount: 5, subjects: 'لغة عربية، أدب' },
  { id: 4, name: 'قسم اللغة الإنجليزية', headName: 'أ. نورة القحطاني', teacherCount: 4, subjects: 'إنجليزي' }
];

@Injectable({ providedIn: 'root' })
export class AcademicDepartmentMockService {
  getAll(): Observable<AcademicDepartment[]> {
    return of([...MOCK]).pipe(delay(200));
  }

  create(d: AcademicDepartment): Observable<AcademicDepartment> {
    const created = { ...d, id: ++nextId };
    MOCK = [created, ...MOCK];
    return of(created).pipe(delay(200));
  }

  update(id: number, d: AcademicDepartment): Observable<AcademicDepartment> {
    MOCK = MOCK.map(x => x.id === id ? { ...d, id } : x);
    return of({ ...d, id }).pipe(delay(200));
  }

  delete(id: number): Observable<void> {
    MOCK = MOCK.filter(x => x.id !== id);
    return of(void 0).pipe(delay(200));
  }
}
