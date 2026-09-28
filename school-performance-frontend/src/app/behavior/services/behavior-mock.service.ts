import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { BehaviorNote } from '../../core/models';
import { createListStore } from '../../core/utils/mock-persistence';

/** Morning-assembly violations the wing supervisor can tap without opening a form. */
export const ASSEMBLY_VIOLATIONS: readonly { code: string; label: string; shortLabel: string; icon: string; tone: string }[] = [
  { code: 'LATE_LINE', label: 'التأخر على الطابور', shortLabel: 'التأخر', icon: 'schedule', tone: 'late' },
  { code: 'HAIR_NAILS', label: 'الشعر أو الأظافر', shortLabel: 'الشعر', icon: 'person', tone: 'hair' },
  { code: 'UNIFORM', label: 'عدم الالتزام بالزي المدرسي', shortLabel: 'الزي', icon: 'badge', tone: 'uniform' },
  { code: 'TALKING', label: 'الحديث أثناء الطابور', shortLabel: 'الحديث', icon: 'comment', tone: 'talk' },
  { code: 'FLAG', label: 'عدم المشاركة في تحية العلم', shortLabel: 'العلم', icon: 'flag', tone: 'flag' },
  { code: 'NO_ASSEMBLY', label: 'عدم المشاركة في الطابور الصباحي', shortLabel: 'الطابور', icon: 'groups', tone: 'assembly' }
];

const store = createListStore<BehaviorNote>('demo_behavior_notes', [
  { id: 1, studentId: 1, studentName: 'أحمد محمد', type: 'POSITIVE', description: 'مشاركة متميزة في الحصة', noteDate: '2026-06-15', recordedBy: 'أ. سالم' },
  { id: 2, studentId: 3, studentName: 'خالد سعيد', type: 'WARNING', description: 'تأخر متكرر عن الحصة', noteDate: '2026-06-14', recordedBy: 'أ. مريم' }
], 10);

@Injectable({ providedIn: 'root' })
export class BehaviorMockService {
  getAll(): Observable<BehaviorNote[]> {
    return of([...store.getItems()]).pipe(delay(200));
  }

  create(note: BehaviorNote): Observable<BehaviorNote> {
    const created = { ...note, id: store.nextId() };
    store.setItems([created, ...store.getItems()]);
    return of(created).pipe(delay(200));
  }

  update(id: number, note: BehaviorNote): Observable<BehaviorNote> {
    store.setItems(store.getItems().map(n => n.id === id ? { ...note, id } : n));
    return of({ ...note, id }).pipe(delay(200));
  }

  delete(id: number): Observable<void> {
    store.setItems(store.getItems().filter(n => n.id !== id));
    return of(void 0).pipe(delay(200));
  }
}
