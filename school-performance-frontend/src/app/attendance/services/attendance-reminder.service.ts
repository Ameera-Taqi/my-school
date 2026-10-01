import { Injectable, computed, inject, signal } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../shared/services/toast.service';
import { AttendanceApiService, AttendanceReminder } from './attendance-api.service';

/** Unread attendance reminders for the signed-in subject teacher. */
@Injectable({ providedIn: 'root' })
export class AttendanceReminderService {
  private readonly api = inject(AttendanceApiService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private timer = 0;
  private primed = false;
  private readonly seen = new Set<number>();

  readonly items = signal<AttendanceReminder[]>([]);
  readonly unread = computed(() => this.items().length);
  readonly open = signal(false);

  start(): void {
    if (!this.auth.user()?.teacherId || this.timer) return;
    this.refresh();
    this.timer = window.setInterval(() => this.refresh(), 20000);
  }

  toggle(): void {
    this.open.update(value => !value);
  }

  close(): void {
    this.open.set(false);
  }

  refresh(): void {
    if (!this.auth.user()?.teacherId) return;
    this.api.myReminders().subscribe({
      next: rows => {
        if (this.primed) {
          const fresh = rows.find(row => !this.seen.has(row.id));
          if (fresh) this.toast.warning(fresh.message, 'تذكير حضور');
        }
        this.seen.clear();
        for (const row of rows) this.seen.add(row.id);
        this.primed = true;
        this.items.set(rows);
      },
      error: () => undefined
    });
  }

  dismiss(row: AttendanceReminder): void {
    this.items.update(list => list.filter(item => item.id !== row.id));
    this.api.markReminderRead(row.id).subscribe({ error: () => this.refresh() });
  }
}
