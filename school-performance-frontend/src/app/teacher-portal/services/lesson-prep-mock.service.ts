import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { LessonPrep, ScheduleDay } from '../../core/models';
import { BELL_PERIODS } from '../../core/constants/bell-schedule';
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
  /** Session that must keep the current preparation instead of advancing when it ends. */
  postponedSession?: string | null;
  /** Last session already counted as delivered or postponed. */
  settledThrough?: string | null;
}

export interface ClassPeriodSlot {
  day: ScheduleDay;
  period: number;
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
  { teacherName: 'مريم الزهراني', stageName: 'العاشر', className: '', subject: 'رياضيات', lessonNumber: 5, title: 'الإحصاء الوصفي', lessonDate: '2026-09-15', fileName: 'prep-05.pdf', previewUrl: 'assets/lesson-preps/prep-05.pdf', previewImage: 'assets/lesson-preps/prep-05.png', description: 'المتوسط والوسيط' },
  { teacherName: 'مريم الزهراني', stageName: 'العاشر', className: '', subject: 'رياضيات', lessonNumber: 6, title: 'المدى والمنوال', lessonDate: '2026-09-17', fileName: 'prep-06.pdf', previewUrl: 'assets/lesson-preps/prep-06.pdf', previewImage: 'assets/lesson-preps/prep-06.png', description: 'مقاييس التشتت البسيطة' },
  { teacherName: 'مريم الزهراني', stageName: 'العاشر', className: '', subject: 'رياضيات', lessonNumber: 7, title: 'الاحتمال', lessonDate: '2026-09-22', fileName: 'prep-07.pdf', previewUrl: 'assets/lesson-preps/prep-07.pdf', previewImage: 'assets/lesson-preps/prep-07.png', description: 'احتمال حادثة بسيطة' },
  { teacherName: 'مريم الزهراني', stageName: 'العاشر', className: '', subject: 'رياضيات', lessonNumber: 8, title: 'الزوايا', lessonDate: '2026-09-24', fileName: 'prep-08.pdf', description: 'الزوايا المتقابلة والمتجاورة' },
  { teacherName: 'مريم الزهراني', stageName: 'العاشر', className: '', subject: 'رياضيات', lessonNumber: 9, title: 'المساحة', lessonDate: '2026-09-29', fileName: 'prep-09.pdf', description: 'مساحة المثلث والمستطيل' },
  { teacherName: 'مريم الزهراني', stageName: 'الحادي عشر', className: '', subject: 'رياضيات', lessonNumber: 1, title: 'الدوال', lessonDate: '2026-09-02', fileName: 'prep-functions.pdf', description: 'مفهوم الدالة' },
  { teacherName: 'مريم الزهراني', stageName: 'الحادي عشر', className: '', subject: 'رياضيات', lessonNumber: 2, title: 'النهايات', lessonDate: '2026-09-09', fileName: 'prep-limits.pdf', previewUrl: 'assets/lesson-preps/prep-limits.pdf', previewImage: 'assets/lesson-preps/prep-limits.png', description: 'نهاية الدالة عند نقطة' },
  { teacherName: 'مريم الزهراني', stageName: 'الحادي عشر', className: '', subject: 'رياضيات', lessonNumber: 3, title: 'الاشتقاق', lessonDate: '2026-09-16', fileName: 'prep-derivative.pdf', description: 'مفهوم المشتقة' },
  { teacherName: 'مريم الزهراني', stageName: 'الحادي عشر', className: '', subject: 'رياضيات', lessonNumber: 4, title: 'التكامل', lessonDate: '2026-09-23', fileName: 'prep-integral.pdf', description: 'المساحة تحت المنحنى' },
  { teacherName: 'مريم الزهراني', stageName: 'الحادي عشر', className: '', subject: 'رياضيات', lessonNumber: 5, title: 'المتتاليات', lessonDate: '2026-09-30', fileName: 'prep-sequences.pdf', description: 'المتتالية الحسابية' },
  { teacherName: 'مريم الزهراني', stageName: 'الحادي عشر', className: '', subject: 'رياضيات', lessonNumber: 6, title: 'النسب المثلثية', lessonDate: '2026-10-05', fileName: 'prep-trig.pdf', description: 'الجيب وجيب التمام' },
  { teacherName: 'مريم الزهراني', stageName: 'الثاني عشر', className: '', subject: 'رياضيات', lessonNumber: 1, title: 'الاتصال', lessonDate: '2026-09-01', fileName: 'prep-continuity.pdf', previewUrl: 'assets/lesson-preps/prep-continuity.pdf', previewImage: 'assets/lesson-preps/prep-continuity.png', description: 'اتصال الدالة عند نقطة' },
  { teacherName: 'مريم الزهراني', stageName: 'الثاني عشر', className: '', subject: 'رياضيات', lessonNumber: 2, title: 'قواعد الاشتقاق', lessonDate: '2026-09-08', fileName: 'prep-rules.pdf', description: 'مشتقة المجموع والجداء' },
  { teacherName: 'مريم الزهراني', stageName: 'الثاني عشر', className: '', subject: 'رياضيات', lessonNumber: 3, title: 'تطبيقات المشتقة', lessonDate: '2026-09-15', fileName: 'prep-applications.pdf', description: 'القيم القصوى' },
  { teacherName: 'مريم الزهراني', stageName: 'الثاني عشر', className: '', subject: 'رياضيات', lessonNumber: 4, title: 'التكامل', lessonDate: '2026-09-22', fileName: 'prep-g12-integral.pdf', description: 'التكامل غير المحدود' },
  { teacherName: 'مريم الزهراني', stageName: 'الثاني عشر', className: '', subject: 'رياضيات', lessonNumber: 5, title: 'التوزيع الطبيعي', lessonDate: '2026-09-29', fileName: 'prep-normal.pdf', description: 'المنحنى الجرسي' }
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

  /**
   * Preparation for one timetable cell. The next meeting keeps the current lesson,
   * and the other meetings of the week step forward or back from it.
   */
  lessonForSlot(
    className: string,
    subject: string,
    stageName: string,
    slots: ClassPeriodSlot[],
    day: ScheduleDay,
    period: number,
    now = new Date()
  ): number {
    const next = this.nextLesson(className, subject, stageName);
    const planned = this.plannedCount(subject, stageName);
    const ordered = [...slots].sort((a, b) =>
      SCHOOL_DAYS.indexOf(a.day) - SCHOOL_DAYS.indexOf(b.day) || a.period - b.period);
    const slotIndex = ordered.findIndex(slot => slot.day === day && slot.period === period);
    if (slotIndex < 0) return next;
    const anchorKey = openOrNextSession(slots, now);
    let anchorIndex = 0;
    if (anchorKey) {
      const anchorDate = dateFromKey(anchorKey);
      const anchorDay = SCHOOL_DAYS[anchorDate.getDay()];
      const anchorPeriod = Number(anchorKey.slice(11));
      const found = ordered.findIndex(slot => slot.day === anchorDay && slot.period === anchorPeriod);
      if (found >= 0) anchorIndex = found;
    }
    return Math.min(planned, Math.max(1, next + (slotIndex - anchorIndex)));
  }

  /** The lesson this class/section should open next. Sections of the same subject advance separately. */
  nextLesson(className: string, subject: string, stageName: string): number {
    const row = sequenceStore.get().progress.find(item =>
      item.className === className && item.subject === subject && item.stageName === stageName);
    const planned = this.plannedCount(subject, stageName);
    const next = row?.nextLesson ?? 1;
    return Math.min(Math.max(next, 1), planned + 1);
  }

  findById(id: number): LessonPrep | undefined {
    return store.getItems().find(item => item.id === id);
  }

  prepAt(subject: string, stageName: string, lessonNumber: number): LessonPrep | undefined {
    return store.getItems().find(item =>
      this.ownedByCurrentTeacher(item)
      && item.subject === subject
      && item.stageName === stageName
      && item.lessonNumber === lessonNumber);
  }

  /**
   * A class period that has ended counts as delivered and opens the next preparation.
   * A postponed session keeps the same preparation for the following period.
   * The first visit only counts periods that already ended today, so older weeks stay as stored.
   */
  resolve(className: string, subject: string, stageName: string, slots: ClassPeriodSlot[], now = new Date()): number {
    const state = sequenceStore.get();
    const row = this.progressRow(state, className, subject, stageName);
    const planned = this.plannedCount(subject, stageName);
    let cursor = row.settledThrough ?? `${isoDate(now)}#00`;
    const due = endedSessions(slots, now, cursor);
    for (const session of due) {
      const held = row.postponedSession === session || row.postponedSession === 'next';
      if (held) row.postponedSession = null;
      else if (row.nextLesson <= planned) row.nextLesson += 1;
      cursor = session;
    }
    if (due.length || !row.settledThrough) {
      row.settledThrough = cursor;
      sequenceStore.set(state);
    }
    return Math.min(Math.max(row.nextLesson, 1), planned + 1);
  }

  /** Keep the preparation on screen for the next class period. */
  postpone(input: {
    className: string;
    subject: string;
    stageName: string;
    slots: ClassPeriodSlot[];
    now?: Date;
  }): void {
    const now = input.now ?? new Date();
    const state = sequenceStore.get();
    const row = this.progressRow(state, input.className, input.subject, input.stageName);
    row.postponedSession = openOrNextSession(input.slots, now) ?? 'next';
    sequenceStore.set(state);
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
        const updated = { ...existing, ...stamped, id: existing.id, fileData: stamped.fileData || existing.fileData };
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

  private progressRow(state: LessonSequenceState, className: string, subject: string, stageName: string): ClassLessonProgress {
    let row = state.progress.find(item =>
      item.className === className && item.subject === subject && item.stageName === stageName);
    if (!row) {
      row = { className, subject, stageName, nextLesson: 1 };
      state.progress.push(row);
    }
    return row;
  }

  private ownedByCurrentTeacher(item: LessonPrep): boolean {
    const user = this.auth.user();
    const teacherId = user?.teacherId ?? null;
    if (teacherId != null && item.teacherId != null) return item.teacherId === teacherId;
    return this.sameName(item.teacherName, user?.fullName ?? '');
  }

  private ensureNumberedPreps(): void {
    let items = store.getItems();
    let changed = false;
    items = items.map(item => {
      const seed = NUMBERED_PREPS.find(seed =>
        item.subject === seed.subject && item.stageName === seed.stageName && item.lessonNumber === seed.lessonNumber);
      if (!seed?.previewUrl && !seed?.previewImage) return item;
      const previewUrl = seed.previewUrl ?? item.previewUrl;
      const previewImage = seed.previewImage ?? item.previewImage;
      const fileName = item.fileName || seed.fileName;
      if (item.previewUrl === previewUrl && item.previewImage === previewImage && item.fileName === fileName) return item;
      changed = true;
      return { ...item, previewUrl, previewImage, fileName };
    });
    const missing = NUMBERED_PREPS.filter(seed => !items.some(item =>
      item.subject === seed.subject && item.stageName === seed.stageName && item.lessonNumber === seed.lessonNumber));
    if (missing.length) {
      changed = true;
      items = [...missing.map(seed => ({ ...seed, id: store.nextId() })), ...items];
    }
    if (changed) store.setItems(items);
  }

  private sameName(stored: string, current: string): boolean {
    const normalize = (value: string) => value.replace(/^أ\.\s*/, '').replace(/\s+/g, ' ').trim();
    const left = normalize(stored);
    const right = normalize(current);
    return left.length > 0 && left === right;
  }
}

const SCHOOL_DAYS: ScheduleDay[] = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY'];

function isoDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function sessionKey(date: string, period: number): string {
  return `${date}#${pad(period)}`;
}

function clockOn(day: Date, time: string): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const stamp = new Date(day);
  stamp.setHours(hours, minutes, 0, 0);
  return stamp;
}

/** Class periods whose end time has passed and that are newer than the last settled session. */
function endedSessions(slots: ClassPeriodSlot[], now: Date, afterKey: string): string[] {
  const keys: string[] = [];
  const start = dateFromKey(afterKey);
  for (let day = startOfDay(start); day.getTime() <= startOfDay(now).getTime() && keys.length < 40; day = addDays(day, 1)) {
    const index = day.getDay();
    if (index > 4) continue;
    const weekday = SCHOOL_DAYS[index];
    const date = isoDate(day);
    for (const slot of slots.filter(item => item.day === weekday).sort((a, b) => a.period - b.period)) {
      const key = sessionKey(date, slot.period);
      const bell = BELL_PERIODS[slot.period - 1];
      if (!bell || key <= afterKey) continue;
      if (clockOn(day, bell.end).getTime() <= now.getTime()) keys.push(key);
    }
  }
  return keys;
}

/** The period in progress, or the next one this class will meet. */
function openOrNextSession(slots: ClassPeriodSlot[], now: Date): string | null {
  const index = now.getDay();
  if (index <= 4) {
    const weekday = SCHOOL_DAYS[index];
    const live = slots.find(slot => {
      const bell = BELL_PERIODS[slot.period - 1];
      return slot.day === weekday && !!bell
        && now.getTime() >= clockOn(now, bell.start).getTime()
        && now.getTime() < clockOn(now, bell.end).getTime();
    });
    if (live) return sessionKey(isoDate(now), live.period);
  }
  for (let offset = 0; offset < 14; offset++) {
    const day = addDays(startOfDay(now), offset);
    const dayIndex = day.getDay();
    if (dayIndex > 4) continue;
    const weekday = SCHOOL_DAYS[dayIndex];
    const upcoming = slots
      .filter(slot => slot.day === weekday)
      .sort((a, b) => a.period - b.period)
      .find(slot => {
        const bell = BELL_PERIODS[slot.period - 1];
        return !!bell && clockOn(day, bell.start).getTime() > now.getTime();
      });
    if (upcoming) return sessionKey(isoDate(day), upcoming.period);
  }
  return null;
}

function dateFromKey(key: string): Date {
  const [year, month, day] = key.slice(0, 10).split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

