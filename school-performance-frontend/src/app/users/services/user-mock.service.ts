import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { AppUser } from '../../core/models';

let nextId = 10;
let MOCK: AppUser[] = [
  { id: 1, fullName: 'مدير النظام', email: 'admin@school.om', username: 'admin', roleName: 'Admin', active: true },
  { id: 2, fullName: 'محمد السعيدي', email: 'manager@school.om', username: 'manager', roleName: 'مدير المدرسة', active: true },
  { id: 3, fullName: 'سالم الحارثي', email: 'salem@school.om', username: 'salem', roleName: 'رئيس شعبة', active: true },
  { id: 4, fullName: 'مريم الزهراني', email: 'mariam@school.om', username: 'mariam', roleName: 'معلم', active: true }
];

@Injectable({ providedIn: 'root' })
export class UserMockService {
  getAll(): Observable<AppUser[]> {
    return of([...MOCK]).pipe(delay(200));
  }

  create(u: AppUser): Observable<AppUser> {
    const created = { ...u, id: ++nextId };
    MOCK = [created, ...MOCK];
    return of(created).pipe(delay(200));
  }

  update(id: number, u: AppUser): Observable<AppUser> {
    MOCK = MOCK.map(x => x.id === id ? { ...u, id } : x);
    return of({ ...u, id }).pipe(delay(200));
  }

  toggleActive(id: number): Observable<AppUser> {
    MOCK = MOCK.map(x => x.id === id ? { ...x, active: !x.active } : x);
    return of(MOCK.find(x => x.id === id)!).pipe(delay(200));
  }

  delete(id: number): Observable<void> {
    MOCK = MOCK.filter(x => x.id !== id);
    return of(void 0).pipe(delay(200));
  }
}
