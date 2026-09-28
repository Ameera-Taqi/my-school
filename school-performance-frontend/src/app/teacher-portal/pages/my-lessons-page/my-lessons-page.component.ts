import { Component, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { AuthService } from '../../../core/services/auth.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { TeacherWeekGridComponent } from './teacher-week-grid.component';

/** The signed-in teacher's own weekly timetable. */
@Component({
  selector: 'app-my-lessons-page',
  standalone: true,
  imports: [MatCardModule, PageHeaderComponent, EmptyStateComponent, TranslatePipe, TeacherWeekGridComponent],
  template: `
    <app-page-header [title]="'nav.myLessons' | translate" [subtitle]="'myLessons.subtitle' | translate"></app-page-header>

    @if (!teacherId) {
      <div class="data-card">
        <app-empty-state icon="person_off" [title]="'myLessons.noTeacher' | translate"></app-empty-state>
      </div>
    } @else {
      <mat-card class="overflow-hidden px-0 py-0">
        <app-teacher-week-grid [teacherId]="teacherId"></app-teacher-week-grid>
      </mat-card>
    }
  `
})
export class MyLessonsPageComponent {
  private readonly auth = inject(AuthService);

  get teacherId(): number | null {
    return this.auth.user()?.teacherId ?? null;
  }
}
