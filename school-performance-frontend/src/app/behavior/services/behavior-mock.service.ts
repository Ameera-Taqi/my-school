import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { BehaviorNote } from '../../core/models';

let nextId = 10;
let MOCK: BehaviorNote[] = [
  { id: 1, studentId: 1, studentName: 'أحمد محمد', type: 'POSITIVE', description: 'مشاركة متميزة في الحصة', noteDate: '2026-06-15', recordedBy: 'أ. سالم' },
  { id: 2, studentId: 3, studentName: 'خالد سعيد', type: 'WARNING', description: 'تأخر متكرر عن الحصة', noteDate: '2026-06-14', recordedBy: 'أ. مريم' }
];

@Injectable({ providedIn: 'root' })
export class BehaviorMockService {
  getAll(): Observable<BehaviorNote[]> {
    return of([...MOCK]).pipe(delay(200));
  }

  create(note: BehaviorNote): Observable<BehaviorNote> {
    const created = { ...note, id: ++nextId };
    MOCK = [created, ...MOCK];
    return of(created).pipe(delay(200));
  }

  update(id: number, note: BehaviorNote): Observable<BehaviorNote> {
    MOCK = MOCK.map(n => n.id === id ? { ...note, id } : n);
    return of({ ...note, id }).pipe(delay(200));
  }

  delete(id: number): Observable<void> {
    MOCK = MOCK.filter(n => n.id !== id);
    return of(void 0).pipe(delay(200));
  }
}
