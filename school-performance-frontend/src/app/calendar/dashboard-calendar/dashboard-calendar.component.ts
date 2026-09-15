import { Component, OnInit, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { HasPermissionPipe } from '../../shared/pipes/has-permission.pipe';
import { AppDatePipe } from '../../shared/pipes/app-date.pipe';
import { ToastService } from '../../shared/services/toast.service';
import { ConfirmService } from '../../shared/services/confirm.service';
import { CalendarApiService } from '../services/calendar-api.service';
import { CalendarEventFormDialogComponent } from '../calendar-event-form-dialog/calendar-event-form-dialog.component';
import { CalendarEventDetailDialogComponent } from '../calendar-event-detail-dialog/calendar-event-detail-dialog.component';
import { CALENDAR_EVENT_TYPE_LABELS } from '../../shared/constants/labels';
import { CalendarEvent } from '../../core/models';
import { UiIconComponent } from '../../shared/icons/ui-icon.component';

interface CalendarDay {
  date: string;
  dayNumber: number;
  inMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
}

@Component({
  selector: 'app-dashboard-calendar',
  standalone: true,
  imports: [UiIconComponent, MatCardModule, MatButtonModule, MatTooltipModule, MatDialogModule, HasPermissionPipe, AppDatePipe],
  templateUrl: './dashboard-calendar.component.html',
  styleUrl: './dashboard-calendar.component.scss'
})
export class DashboardCalendarComponent implements OnInit {
  private readonly calendarService = inject(CalendarApiService);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  readonly typeLabels = CALENDAR_EVENT_TYPE_LABELS;
  readonly weekDays = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
  readonly monthNames = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];
  readonly weekDaysShort = ['س', 'ح', 'ن', 'ث', 'ر', 'خ', 'ج'];
  readonly skeletonCells = Array.from({ length: 35 }, (_, i) => i);
  /** How many event pills a cell shows before collapsing into "+N". */
  readonly maxPills = 2;

  currentYear = new Date().getFullYear();
  currentMonth = new Date().getMonth();
  calendarDays: CalendarDay[] = [];
  events: CalendarEvent[] = [];
  selectedDate: string | null = null;
  selectedDayEvents: CalendarEvent[] = [];
  loading = true;

  ngOnInit(): void {
    this.buildCalendar();
    this.loadEvents();
  }

  get monthLabel(): string {
    return `${this.monthNames[this.currentMonth]} ${this.currentYear}`;
  }

  /** Long label for the selected day: "الثلاثاء 9 سبتمبر 2026". */
  get selectedDayLabel(): string {
    if (!this.selectedDate) return '';
    const d = this.parseDate(this.selectedDate);
    return new Intl.DateTimeFormat('ar-u-nu-latn', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(d);
  }

  get isSelectedToday(): boolean {
    return !!this.selectedDate && this.selectedDate === this.formatDate(new Date());
  }

  get isCurrentMonthShown(): boolean {
    const now = new Date();
    return now.getFullYear() === this.currentYear && now.getMonth() === this.currentMonth;
  }

  /** Next events in the shown month after the selected day (used when the day is empty or as a preview). */
  get upcomingEvents(): CalendarEvent[] {
    const from = this.selectedDate ?? '';
    return [...this.events]
      .filter(e => e.startDate > from)
      .sort((a, b) => a.startDate.localeCompare(b.startDate))
      .slice(0, 4);
  }

  get monthEventCount(): number {
    return this.events.length;
  }

  goToToday(): void {
    const now = new Date();
    const changed = now.getFullYear() !== this.currentYear || now.getMonth() !== this.currentMonth;
    this.currentYear = now.getFullYear();
    this.currentMonth = now.getMonth();
    this.selectedDate = this.formatDate(now);
    this.buildCalendar();
    if (changed) this.loadEvents(); else this.selectedDayEvents = this.eventsForDay(this.selectedDate);
  }

  overflowCount(date: string): number {
    return Math.max(0, this.eventsForDay(date).length - this.maxPills);
  }

  visiblePills(date: string): CalendarEvent[] {
    return this.eventsForDay(date).slice(0, this.maxPills);
  }

  /** Pill continues from a previous day (multi-day event). */
  continuesFrom(event: CalendarEvent, date: string): boolean {
    return event.startDate < date;
  }

  dayEventsTitle(date: string): string {
    return this.eventsForDay(date).map(e => e.title).join('، ');
  }

  eventDateRange(ev: CalendarEvent): string {
    const fmt = (v: string) => new Intl.DateTimeFormat('ar-u-nu-latn', { day: 'numeric', month: 'short' }).format(this.parseDate(v));
    if (ev.endDate && ev.endDate !== ev.startDate) return `${fmt(ev.startDate)} – ${fmt(ev.endDate)}`;
    return fmt(ev.startDate);
  }

  private parseDate(value: string): Date {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  get monthParam(): string {
    const m = String(this.currentMonth + 1).padStart(2, '0');
    return `${this.currentYear}-${m}`;
  }

  prevMonth(): void {
    if (this.currentMonth === 0) {
      this.currentMonth = 11;
      this.currentYear--;
    } else {
      this.currentMonth--;
    }
    this.buildCalendar();
    this.loadEvents();
  }

  nextMonth(): void {
    if (this.currentMonth === 11) {
      this.currentMonth = 0;
      this.currentYear++;
    } else {
      this.currentMonth++;
    }
    this.buildCalendar();
    this.loadEvents();
  }

  selectDay(day: CalendarDay): void {
    if (!day.inMonth) {
      const d = this.parseDate(day.date);
      this.currentYear = d.getFullYear();
      this.currentMonth = d.getMonth();
      this.selectedDate = day.date;
      this.buildCalendar();
      this.loadEvents();
      return;
    }
    this.selectedDate = day.date;
    this.selectedDayEvents = this.eventsForDay(day.date);
  }

  eventsForDay(date: string): CalendarEvent[] {
    return this.events.filter(e => this.eventOccursOnDay(e, date));
  }

  hasEvents(date: string): boolean {
    return this.events.some(e => this.eventOccursOnDay(e, date));
  }

  eventColor(event: CalendarEvent): string {
    if (event.color) return event.color;
    if (this.isMeetingEvent(event)) return '#7b1fa2';
    return event.eventType === 'PUBLIC' ? '#1976d2' : '#388e3c';
  }

  eventTypeLabel(event: CalendarEvent): string {
    if (this.isMeetingEvent(event)) return this.typeLabels['ROLE'];
    return this.typeLabels[event.eventType];
  }

  private isMeetingEvent(event: CalendarEvent): boolean {
    return !!(event.targetRoleKeys?.length);
  }

  openAddDialog(): void {
    const ref = this.dialog.open(CalendarEventFormDialogComponent, {
      width: '520px',
      maxWidth: '95vw',

      data: { defaultDate: this.selectedDate ?? undefined }
    });
    ref.afterClosed().subscribe((result: CalendarEvent | undefined) => {
      if (!result) return;
      this.calendarService.create(result).subscribe({
        next: () => {
          this.toast.success('تمت إضافة الحدث');
          this.loadEvents();
        },
        error: (e) => this.toast.fromError(e)
      });
    });
  }

  openEventDetail(event: CalendarEvent): void {
    const ref = this.dialog.open(CalendarEventDetailDialogComponent, {
      width: '460px',
      maxWidth: '95vw',

      data: { event }
    });
    ref.afterClosed().subscribe((result: { action: string; event: CalendarEvent } | undefined) => {
      if (!result?.event?.id) return;
      if (result.action === 'edit') {
        this.openEditDialog(result.event);
      } else if (result.action === 'delete') {
        this.deleteEvent(result.event);
      }
    });
  }

  private openEditDialog(event: CalendarEvent): void {
    const ref = this.dialog.open(CalendarEventFormDialogComponent, {
      width: '520px',
      maxWidth: '95vw',

      data: { event }
    });
    ref.afterClosed().subscribe((result: CalendarEvent | undefined) => {
      if (!result?.id) return;
      this.calendarService.update(result.id, result).subscribe({
        next: () => {
          this.toast.success('تم تحديث الحدث');
          this.loadEvents();
        },
        error: (e) => this.toast.fromError(e)
      });
    });
  }

  private deleteEvent(event: CalendarEvent): void {
    if (!event.id) return;
    this.confirm.deleteConfirmed(event.title, 'الحدث').subscribe(() => {
      this.calendarService.delete(event.id!).subscribe({
        next: () => {
          this.toast.success('تم حذف الحدث');
          this.loadEvents();
        },
        error: (e) => this.toast.fromError(e)
      });
    });
  }

  private loadEvents(): void {
    this.loading = true;
    this.calendarService.getEvents(this.monthParam).subscribe({
      next: (data) => {
        this.events = data;
        this.loading = false;
        if (this.selectedDate) {
          this.selectedDayEvents = this.eventsForDay(this.selectedDate);
        }
      },
      error: (e) => { this.loading = false; this.toast.fromError(e); }
    });
  }

  private buildCalendar(): void {
    const firstOfMonth = new Date(this.currentYear, this.currentMonth, 1);
    const lastOfMonth = new Date(this.currentYear, this.currentMonth + 1, 0);
    const startOffset = (firstOfMonth.getDay() + 1) % 7;
    const daysInMonth = lastOfMonth.getDate();
    const todayStr = this.formatDate(new Date());

    const days: CalendarDay[] = [];

    const prevMonthLast = new Date(this.currentYear, this.currentMonth, 0).getDate();
    for (let i = startOffset - 1; i >= 0; i--) {
      const dayNum = prevMonthLast - i;
      const date = new Date(this.currentYear, this.currentMonth - 1, dayNum);
      days.push({ date: this.formatDate(date), dayNumber: dayNum, inMonth: false, isToday: false, isWeekend: this.isWeekend(date) });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(this.currentYear, this.currentMonth, d);
      const dateStr = this.formatDate(date);
      days.push({ date: dateStr, dayNumber: d, inMonth: true, isToday: dateStr === todayStr, isWeekend: this.isWeekend(date) });
    }

    let nextDayNum = 1;
    while (days.length % 7 !== 0) {
      const date = new Date(this.currentYear, this.currentMonth + 1, nextDayNum);
      days.push({ date: this.formatDate(date), dayNumber: nextDayNum, inMonth: false, isToday: false, isWeekend: this.isWeekend(date) });
      nextDayNum++;
    }

    this.calendarDays = days;
    if (!this.selectedDate || !days.some(d => d.date === this.selectedDate && d.inMonth)) {
      const todayInMonth = days.find(d => d.isToday && d.inMonth);
      this.selectedDate = todayInMonth?.date ?? days.find(d => d.inMonth)?.date ?? null;
    }
    if (this.selectedDate) {
      this.selectedDayEvents = this.eventsForDay(this.selectedDate);
    }
  }

  private isWeekend(date: Date): boolean {
    const day = date.getDay();
    return day === 5 || day === 6;
  }

  private eventOccursOnDay(event: CalendarEvent, date: string): boolean {
    const end = event.endDate || event.startDate;
    return event.startDate <= date && end >= date;
  }

  private formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
