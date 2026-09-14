import { Component, OnInit, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { AppDatePipe } from '../../shared/pipes/app-date.pipe';
import { Meeting } from '../../core/models';
import { RoleApiService } from '../../roles/services/role-api.service';
import { Role } from '../../core/models';

export interface MeetingDetailDialogData {
  meeting: Meeting;
  canEdit?: boolean;
}

@Component({
  selector: 'app-meeting-detail-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule, MatDividerModule, AppDatePipe],
  template: `
    <div class="dialog-header">
      <div class="header-icon"><mat-icon>groups</mat-icon></div>
      <div class="header-text">
        <h2 mat-dialog-title>{{ data.meeting.title }}</h2>
        <p class="subtitle">
          {{ data.meeting.meetingDate | appDate:'withTime' }}
          @if (isUpcoming) { <span class="chip info">قادم</span> } @else { <span class="chip neutral">منتهٍ</span> }
        </p>
      </div>
    </div>

    <mat-dialog-content class="detail-content">
      <div class="info-grid">
        <div class="info-item">
          <mat-icon>event</mat-icon>
          <div>
            <span class="label">التاريخ والوقت</span>
            <span class="value">{{ data.meeting.meetingDate | appDate:'withTime' }}</span>
          </div>
        </div>
        <div class="info-item">
          <mat-icon>badge</mat-icon>
          <div>
            <span class="label">الأدوار المستهدفة</span>
            <span class="value">{{ formatRoleLabels(data.meeting.targetRoleKeys) }}</span>
          </div>
        </div>
        <div class="info-item">
          <mat-icon>people</mat-icon>
          <div>
            <span class="label">الحضور</span>
            <span class="value">{{ data.meeting.attendees || '—' }}</span>
          </div>
        </div>
      </div>

      <mat-divider></mat-divider>

      <section class="detail-section">
        <h3><mat-icon>list_alt</mat-icon> جدول الأعمال</h3>
        <p class="section-body">{{ data.meeting.agenda || '—' }}</p>
      </section>

      <section class="detail-section highlight">
        <h3><mat-icon>description</mat-icon> محضر الاجتماع</h3>
        <p class="section-body">{{ data.meeting.minutes || 'لم يُسجَّل محضر بعد.' }}</p>
      </section>

      <section class="detail-section">
        <h3><mat-icon>task_alt</mat-icon> المهام الناتجة</h3>
        <p class="section-body">{{ data.meeting.followUpTasks || 'لا توجد مهام ناتجة.' }}</p>
      </section>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      @if (data.canEdit) {
        <button mat-stroked-button color="primary" type="button" (click)="edit()">
          <mat-icon>edit</mat-icon>
          تعديل
        </button>
      }
      <button mat-flat-button color="primary" type="button" mat-dialog-close>إغلاق</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-header {
      display: flex;
      align-items: center;
      gap: 0.9rem;
      padding: 1.25rem 1.5rem 0;
      direction: rtl;
    }
    .header-icon {
      width: 48px; height: 48px; border-radius: 12px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      background: var(--sp-primary-light); color: var(--sp-primary);
      mat-icon { font-size: 28px; width: 28px; height: 28px; }
    }
    .header-text { min-width: 0; }
    h2[mat-dialog-title] {
      margin: 0;
      padding: 0;
      font-size: 1.2rem;
      font-weight: 700;
      color: var(--sp-primary);
    }
    .subtitle {
      display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;
      margin: 0.25rem 0 0;
      color: var(--sp-text-muted);
      font-size: 0.85rem;
    }
    .detail-content {
      direction: rtl;
      min-width: 0;
      max-width: 560px;
      padding-top: 0.5rem;
    }
    .info-grid { display: grid; gap: 0.6rem; margin-bottom: 1rem; }
    .info-item {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 0.7rem 1rem;
      background: var(--sp-primary-bg);
      border: 1px solid var(--sp-border);
      border-radius: var(--sp-radius-sm);
    }
    .info-item mat-icon { color: var(--sp-primary-mid); margin-top: 2px; }
    .label { display: block; font-size: 0.75rem; color: var(--sp-text-muted); margin-bottom: 0.15rem; }
    .value { display: block; color: var(--sp-text); line-height: 1.5; }
    .detail-section { margin: 1rem 0; }
    .detail-section h3 {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin: 0 0 0.5rem;
      font-size: 0.95rem;
      color: var(--sp-primary);
    }
    .detail-section h3 mat-icon { font-size: 20px; width: 20px; height: 20px; }
    .section-body {
      margin: 0;
      padding: 0.75rem 1rem;
      background: #fafbfe;
      border-radius: var(--sp-radius-sm);
      border: 1px solid var(--sp-border);
      line-height: 1.7;
      color: var(--sp-text);
      white-space: pre-wrap;
    }
    .detail-section.highlight .section-body { background: #fff8e1; border-color: #ffe082; }
    mat-dialog-actions { padding: 0.75rem 1.5rem 1.25rem; gap: 0.5rem; }
  `]
})
export class MeetingDetailDialogComponent implements OnInit {
  readonly data: MeetingDetailDialogData = inject(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<MeetingDetailDialogComponent>);
  private readonly roleApi = inject(RoleApiService);

  roleLabels = new Map<string, string>();

  get isUpcoming(): boolean {
    const d = new Date(this.data.meeting.meetingDate);
    return !Number.isNaN(d.getTime()) && d.getTime() >= Date.now();
  }

  ngOnInit(): void {
    this.roleApi.getAll().subscribe((roles: Role[]) => {
      roles.forEach(r => this.roleLabels.set(r.roleKey, r.roleName));
    });
  }

  formatRoleLabels(keys?: string[]): string {
    if (!keys?.length) return '—';
    return keys.map(k => this.roleLabels.get(k) ?? k).join('، ');
  }

  edit(): void {
    this.dialogRef.close({ action: 'edit', meeting: this.data.meeting });
  }
}
