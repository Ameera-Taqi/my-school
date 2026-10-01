import { Injectable, computed, inject, signal } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../shared/services/toast.service';
import { TaskApiService } from './task-api.service';
import { TaskNotice } from '../../core/models';

@Injectable({ providedIn: 'root' })
export class TaskNoticeService {
  private readonly api = inject(TaskApiService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private timer = 0;
  private primed = false;
  private readonly seen = new Set<number>();

  readonly items = signal<TaskNotice[]>([]);
  readonly unread = computed(() => this.items().length);

  start(): void {
    if ((!this.auth.hasPermission('tasks.view') && !this.auth.hasPermission('tasks.create')) || this.timer) return;
    this.refresh();
    this.timer = window.setInterval(() => this.refresh(), 20000);
  }

  refresh(): void {
    if (!this.auth.hasPermission('tasks.view') && !this.auth.hasPermission('tasks.create')) return;
    this.api.notices().subscribe({
      next: rows => {
        if (this.primed) {
          const fresh = rows.find(row => !this.seen.has(row.id));
          if (fresh) this.toast.warning(fresh.message, 'المهام');
        }
        this.seen.clear();
        for (const row of rows) this.seen.add(row.id);
        this.primed = true;
        this.items.set(rows);
      }
    });
  }

  dismiss(item: TaskNotice): void {
    this.api.readNotice(item.id).subscribe({ next: () => this.refresh() });
  }
}
