import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { InternalRequest } from '../../core/models';
import { createListStore } from '../../core/utils/mock-persistence';

const store = createListStore<InternalRequest>('demo_internal_requests', [
  { id: 1, requestType: 'MAINTENANCE', requesterName: 'أ. سالم', description: 'إصلاح مكيف القاعة 3', priority: 'HIGH', status: 'IN_REVIEW', requestDate: '2026-06-17' },
  { id: 2, requestType: 'SUPPLIES', requesterName: 'أ. مريم', description: 'طلب أدوات مختبر', priority: 'MEDIUM', status: 'NEW', requestDate: '2026-06-18' },
  { id: 3, requestType: 'TEACHER_LEAVE', requesterName: 'أ. يوسف', description: 'إجازة يوم واحد', priority: 'LOW', status: 'APPROVED', requestDate: '2026-06-10' }
], 20);

@Injectable({ providedIn: 'root' })
export class InternalRequestMockService {
  getAll(): Observable<InternalRequest[]> {
    return of([...store.getItems()]).pipe(delay(200));
  }

  create(req: InternalRequest): Observable<InternalRequest> {
    const created = { ...req, id: store.nextId() };
    store.setItems([created, ...store.getItems()]);
    return of(created).pipe(delay(200));
  }

  update(id: number, req: InternalRequest): Observable<InternalRequest> {
    store.setItems(store.getItems().map(r => r.id === id ? { ...req, id } : r));
    return of({ ...req, id }).pipe(delay(200));
  }

  delete(id: number): Observable<void> {
    store.setItems(store.getItems().filter(r => r.id !== id));
    return of(void 0).pipe(delay(200));
  }
}
