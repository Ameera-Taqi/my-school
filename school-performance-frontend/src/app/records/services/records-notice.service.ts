import { Injectable, computed, inject, signal } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../shared/services/toast.service';
import { RecordNotice, RecordsApiService } from './records-api.service';

@Injectable({ providedIn: 'root' })
export class RecordsNoticeService {
  private readonly api = inject(RecordsApiService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private timer = 0;
  private primed = false;
  private readonly seen = new Set<number>();

  readonly items = signal<RecordNotice[]>([]);
  readonly unread = computed(() => this.items().length);
  readonly open = signal(false);

  start(): void {
    if (!this.auth.hasPermission('records.view') || this.timer) return;
    this.refresh();
    this.timer = window.setInterval(() => this.refresh(), 20000);
  }

  toggle(): void { this.open.update(value => !value); }
  close(): void { this.open.set(false); }

  refresh(): void {
    if (!this.auth.hasPermission('records.view')) return;
    this.api.notices().subscribe({
      next: rows => {
        if (this.primed) {
          const fresh = rows.find(row => !this.seen.has(row.id));
          if (fresh) this.toast.warning(fresh.message, 'السجلات');
        }
        this.seen.clear();
        for (const row of rows) this.seen.add(row.id);
        this.primed = true;
        this.items.set(rows);
      }
    });
  }

  dismiss(item: RecordNotice): void {
    this.api.readNotice(item.id).subscribe({ next: () => this.refresh() });
  }
}
