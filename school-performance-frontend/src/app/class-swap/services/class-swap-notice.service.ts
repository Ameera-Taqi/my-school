import { Injectable, computed, inject, signal } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../shared/services/toast.service';
import { ClassSwapApiService, ClassSwapNotice } from './class-swap-api.service';

/** Unread class-swap notices for the signed-in user. */
@Injectable({ providedIn: 'root' })
export class ClassSwapNoticeService {
  private readonly api = inject(ClassSwapApiService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private timer = 0;
  private primed = false;
  private readonly seen = new Set<number>();

  readonly items = signal<ClassSwapNotice[]>([]);
  readonly unread = computed(() => this.items().length);
  readonly open = signal(false);

  start(): void {
    if (!this.auth.hasPermission('class_swap.view') || this.timer) return;
    this.refresh();
    this.timer = window.setInterval(() => this.refresh(), 20000);
  }

  toggle(): void { this.open.update(value => !value); }
  close(): void { this.open.set(false); }

  refresh(): void {
    if (!this.auth.hasPermission('class_swap.view')) return;
    this.api.notices().subscribe({
      next: rows => {
        if (this.primed) {
          const fresh = rows.find(row => !this.seen.has(row.id));
          if (fresh) this.toast.warning(fresh.message, 'تبديل حصة');
        }
        this.seen.clear();
        for (const row of rows) this.seen.add(row.id);
        this.primed = true;
        this.items.set(rows);
      },
      error: () => undefined
    });
  }

  dismiss(item: ClassSwapNotice): void {
    this.items.update(rows => rows.filter(row => row.id !== item.id));
    this.api.markRead(item.id).subscribe({ error: () => this.refresh() });
  }
}
