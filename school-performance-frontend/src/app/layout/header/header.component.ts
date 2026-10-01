import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../../core/services/auth.service';
import { LanguageService } from '../../core/services/language.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { LayoutService } from '../../shared/services/layout.service';
import { UiIconComponent } from '../../shared/icons/ui-icon.component';
import { UserMenuComponent } from './user-menu/user-menu.component';
import { AttendanceReminderService } from '../../attendance/services/attendance-reminder.service';
import { ClassSwapNoticeService } from '../../class-swap/services/class-swap-notice.service';
import { RecordsNoticeService } from '../../records/services/records-notice.service';
import { TaskNoticeService } from '../../tasks/services/task-notice.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [UiIconComponent, MatButtonModule, MatTooltipModule, RouterLink, TranslatePipe, UserMenuComponent],
  templateUrl: './header.component.html'
})
export class HeaderComponent implements OnInit {
  private readonly authService = inject(AuthService);
  readonly langService = inject(LanguageService);
  readonly layout = inject(LayoutService);
  readonly reminders = inject(AttendanceReminderService);
  readonly swapNotices = inject(ClassSwapNoticeService);
  readonly recordNotices = inject(RecordsNoticeService);
  readonly taskNotices = inject(TaskNoticeService);

  readonly canViewAlerts = computed(() => this.authService.hasPermission('alerts.view'));
  readonly canViewSwaps = computed(() => this.authService.hasPermission('class_swap.view'));
  readonly canViewRecords = computed(() => this.authService.hasPermission('records.view'));
  readonly canViewTasks = computed(() => this.authService.hasPermission('tasks.view') || this.authService.hasPermission('tasks.create'));
  readonly isTeacher = computed(() => this.authService.user()?.teacherId != null);
  readonly noticesOpen = signal(false);
  readonly showNotices = computed(() => this.isTeacher() || this.canViewSwaps() || this.canViewRecords() || this.canViewTasks() || this.canViewAlerts());
  readonly noticeCount = computed(() =>
    (this.isTeacher() ? this.reminders.unread() : 0)
    + (this.canViewSwaps() ? this.swapNotices.unread() : 0)
    + (this.canViewRecords() ? this.recordNotices.unread() : 0)
    + (this.canViewTasks() ? this.taskNotices.unread() : 0));

  ngOnInit(): void {
    this.reminders.start();
    this.swapNotices.start();
    this.recordNotices.start();
    this.taskNotices.start();
  }

  onLanguageToggle(isEnglish: boolean): void {
    this.langService.setEnglish(isEnglish);
  }

  toggleNotices(): void {
    this.noticesOpen.update(open => !open);
  }

  closeNotices(): void {
    this.noticesOpen.set(false);
  }
}
