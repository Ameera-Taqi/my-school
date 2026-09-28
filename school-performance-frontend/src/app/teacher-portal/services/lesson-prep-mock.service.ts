import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { LessonPrep } from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { createListStore, createMockStore } from '../../core/utils/mock-persistence';

export type LessonDeliveryStatus = 'DELIVERED' | 'POSTPONED';

interface LessonCourse {
  subject: string;
  stageName: string;
  plannedCount: number;
}

interface ClassLessonProgress {
  className: string;
  subject: string;
  stageName: string;
  nextLesson: number;
}

interface LessonSequenceState {
  courses: LessonCourse[];
  progress: ClassLessonProgress[];
}

const NUMBERED_PREPS: LessonPrep[] = [
  { teacherName: 'مريم الزهراني', stageName: 'العاشر', className: '', subject: 'رياضيات', lessonNumber: 1, title: 'المعادلات الخطية', lessonDate: '2026-09-01', fileName: 'prep-01.pdf', description: 'حل معادلات من الدرجة الأولى' },
  { teacherName: 'مريم الزهراني', stageName: 'العاشر', className: '', subject: 'رياضيات', lessonNumber: 2, title: 'المتباينات', lessonDate: '2026-09-03', fileName: 'prep-02.pdf', description: 'تمثيل المتباينات على خط الأعداد' },
  { teacherName: 'مريم الزهراني', stageName: 'العاشر', className: '', subject: 'رياضيات', lessonNumber: 3, title: 'الدوال التربيعية', lessonDate: '2026-09-08', fileName: 'prep-03.pdf', description: 'رسم القطع المكافئ' },
  { teacherName: 'مريم الزهراني', stageName: 'العاشر', className: '', subject: 'رياضيات', lessonNumber: 4, title: 'هندسة المثلث', lessonDate: '2026-09-10', fileName: 'prep-04.pdf', description: 'مجموع زوايا المثلث' },
  { teacherName: 'مريم الزهراني', stageName: 'العاشر', className: '', subject: 'رياضيات', lessonNumber: 5, title: 'الإحصاء الوصفي', lessonDate: '2026-09-15', fileName: 'prep-05.pdf', description: 'المتوسط والوسيط' },
  { teacherName: 'مريم الزهراني', stageName: 'الحادي عشر', className: '', subject: 'رياضيات', lessonNumber: 1, title: 'الدوال', lessonDate: '2026-09-02', fileName: 'prep-functions.docx', description: 'مفهوم الدالة' },
  { teacherName: 'مريم الزهراني', stageName: 'الحادي عشر', className: '', subject: 'رياضيات', lessonNumber: 2, title: 'النهايات', lessonDate: '2026-09-09', fileName: 'prep-limits.pdf', description: 'نهاية الدالة عند نقطة' }
];

const sequenceStore = createMockStore<LessonSequenceState>('demo_lesson_sequence', {
  courses: [
    { subject: 'رياضيات', stageName: 'العاشر', plannedCount: 24 },
    { subject: 'رياضيات', stageName: 'الحادي عشر', plannedCount: 24 },
    { subject: 'رياضيات', stageName: 'الثاني عشر', plannedCount: 24 }
  ],
  progress: [
    { className: '10-أ', subject: 'رياضيات', stageName: 'العاشر', nextLesson: 5 },
    { className: '10-ب', subject: 'رياضيات', stageName: 'العاشر', nextLesson: 4 },
    { className: '11-أ', subject: 'رياضيات', stageName: 'الحادي عشر', nextLesson: 2 },
    { className: '12-أ', subject: 'رياضيات', stageName: 'الثاني عشر', nextLesson: 1 }
  ]
});

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

  constructor() {
    this.ensureNumberedPreps();
  }

  plannedCount(subject: string, stageName: string): number {
    return sequenceStore.get().courses.find(course => course.subject === subject && course.stageName === stageName)?.plannedCount ?? 24;
  }

  setPlannedCount(subject: string, stageName: string, plannedCount: number): number {
    const count = Math.min(200, Math.max(1, Math.round(plannedCount) || 1));
    const state = sequenceStore.get();
    const course = state.courses.find(item => item.subject === subject && item.stageName === stageName);
    if (course) course.plannedCount = count;
    else state.courses.push({ subject, stageName, plannedCount: count });
    sequenceStore.set(state);
    return count;
  }

  /** The lesson this class/section should open next. Sections of the same subject advance separately. */
  nextLesson(className: string, subject: string, stageName: string): number {
    const row = sequenceStore.get().progress.find(item =>
      item.className === className && item.subject === subject && item.stageName === stageName);
    const planned = this.plannedCount(subject, stageName);
    const next = row?.nextLesson ?? 1;
    return Math.min(Math.max(next, 1), planned + 1);
  }

  prepAt(subject: string, stageName: string, lessonNumber: number): LessonPrep | undefined {
    return store.getItems().find(item =>
      this.ownedByCurrentTeacher(item)
      && item.subject === subject
      && item.stageName === stageName
      && item.lessonNumber === lessonNumber);
  }

  /**
   * Delivered lessons advance only this class. A postponed lesson stays current
   * and is loaded again at the next session.
   */
  markLesson(input: {
    className: string;
    subject: string;
    stageName: string;
    lessonNumber: number;
    status: LessonDeliveryStatus;
  }): number {
    const state = sequenceStore.get();
    let row = state.progress.find(item =>
      item.className === input.className && item.subject === input.subject && item.stageName === input.stageName);
    if (!row) {
      row = { className: input.className, subject: input.subject, stageName: input.stageName, nextLesson: 1 };
      state.progress.push(row);
    }
    const planned = this.plannedCount(input.subject, input.stageName);
    if (input.status === 'DELIVERED' && input.lessonNumber === row.nextLesson && row.nextLesson <= planned) {
      row.nextLesson += 1;
    }
    sequenceStore.set(state);
    return row.nextLesson;
  }

  getMine(): Observable<LessonPrep[]> {
    return of(store.getItems().filter(item => this.ownedByCurrentTeacher(item))).pipe(delay(200));
  }

  create(prep: LessonPrep): Observable<LessonPrep> {
    const user = this.auth.user();
    const stamped: LessonPrep = {
      ...prep,
      teacherId: user?.teacherId ?? prep.teacherId,
      teacherName: user?.fullName || prep.teacherName
    };
    if (stamped.lessonNumber) {
      const existing = store.getItems().find(item =>
        this.ownedByCurrentTeacher(item)
        && item.subject === stamped.subject
        && item.stageName === stamped.stageName
        && item.lessonNumber === stamped.lessonNumber);
      if (existing?.id) {
        const updated = { ...existing, ...stamped, id: existing.id };
        store.setItems(store.getItems().map(item => item.id === existing.id ? updated : item));
        return of(updated).pipe(delay(200));
      }
    }
    const created = { ...stamped, id: store.nextId() };
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
      prep.lessonDate ? `التاريخ: ${prep.lessonDate}` : '',
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

  private ensureNumberedPreps(): void {
    const items = store.getItems();
    const missing = NUMBERED_PREPS.filter(seed => !items.some(item =>
      item.subject === seed.subject && item.stageName === seed.stageName && item.lessonNumber === seed.lessonNumber));
    if (!missing.length) return;
    const stamped = missing.map(seed => ({ ...seed, id: store.nextId(), teacherName: seed.teacherName }));
    store.setItems([...stamped, ...store.getItems()]);
  }

  private sameName(stored: string, current: string): boolean {
    const normalize = (value: string) => value.replace(/^أ\.\s*/, '').replace(/\s+/g, ' ').trim();
    const left = normalize(stored);
    const right = normalize(current);
    return left.length > 0 && left === right;
  }
}
