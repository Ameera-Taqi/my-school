import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { LessonPrep } from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { createListStore } from '../../core/utils/mock-persistence';

const store = createListStore<LessonPrep>('demo_lesson_preps', [
  {
    id: 1,
    teacherName: 'مريم الزهراني',
    stageName: 'العاشر',
    className: '10-أ',
    subject: 'رياضيات',
    title: 'تحضير حصة المعادلات الخطية',
    lessonDate: '2026-09-23',
    fileName: 'prep-equations.pdf',
    description: 'أهداف الحصة وأنشطتها'
  },
  {
    id: 2,
    teacherName: 'مريم الزهراني',
    stageName: 'الحادي عشر',
    className: '11-أ',
    subject: 'رياضيات',
    title: 'تحضير حصة الدوال',
    lessonDate: '2026-09-22',
    fileName: 'prep-functions.docx',
    description: 'تمهيد وتمارين صفية'
  }
], 5);

@Injectable({ providedIn: 'root' })
export class LessonPrepMockService {
  private readonly auth = inject(AuthService);

  getMine(): Observable<LessonPrep[]> {
    return of(store.getItems().filter(item => this.ownedByCurrentTeacher(item))).pipe(delay(200));
  }

  create(prep: LessonPrep): Observable<LessonPrep> {
    const user = this.auth.user();
    const created: LessonPrep = {
      ...prep,
      id: store.nextId(),
      teacherId: user?.teacherId ?? prep.teacherId,
      teacherName: user?.fullName || prep.teacherName
    };
    store.setItems([created, ...store.getItems()]);
    return of(created).pipe(delay(200));
  }

  delete(id: number): Observable<void> {
    store.setItems(store.getItems().filter(item => item.id !== id || !this.ownedByCurrentTeacher(item)));
    return of(void 0).pipe(delay(200));
  }

  download(prep: LessonPrep): void {
    const name = prep.fileName || `${prep.title}.txt`;
    const body = [
      prep.title,
      `التاريخ: ${prep.lessonDate}`,
      `المرحلة: ${prep.stageName}`,
      prep.className ? `الفصل: ${prep.className}` : '',
      `المادة: ${prep.subject}`,
      prep.description ? `الوصف: ${prep.description}` : ''
    ].filter(Boolean).join('\n');
    const blob = new Blob([body], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
    URL.revokeObjectURL(url);
  }

  private ownedByCurrentTeacher(item: LessonPrep): boolean {
    const user = this.auth.user();
    const teacherId = user?.teacherId ?? null;
    if (teacherId != null && item.teacherId != null) return item.teacherId === teacherId;
    return this.sameName(item.teacherName, user?.fullName ?? '');
  }

  private sameName(stored: string, current: string): boolean {
    const normalize = (value: string) => value.replace(/^أ\.\s*/, '').replace(/\s+/g, ' ').trim();
    const left = normalize(stored);
    const right = normalize(current);
    return left.length > 0 && left === right;
  }
}
