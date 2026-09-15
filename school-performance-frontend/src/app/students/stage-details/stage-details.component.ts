import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { BreadcrumbComponent } from '../../shared/components/breadcrumb/breadcrumb.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { HasPermissionPipe } from '../../shared/pipes/has-permission.pipe';
import { ToastService } from '../../shared/services/toast.service';
import { ConfirmService } from '../../shared/services/confirm.service';
import { AcademicStageApiService } from '../../academic-stages/services/academic-stage-api.service';
import { SchoolClassApiService } from '../../school-classes/services/school-class-api.service';
import { ClassFormDialogComponent } from '../../school-classes/class-form-dialog/class-form-dialog.component';
import { AcademicLookupService } from '../../core/services/academic-lookup.service';
import { AcademicStage, SchoolClass } from '../../core/models';
import { UiIconComponent } from '../../shared/icons/ui-icon.component';

@Component({
  selector: 'app-stage-details',
  standalone: true,
  imports: [UiIconComponent, RouterModule, MatCardModule, MatButtonModule, MatTooltipModule, MatDialogModule, PageHeaderComponent, BreadcrumbComponent, EmptyStateComponent, HasPermissionPipe],
  templateUrl: './stage-details.component.html'
})
export class StageDetailsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly stageService = inject(AcademicStageApiService);
  private readonly classService = inject(SchoolClassApiService);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly lookup = inject(AcademicLookupService);

  readonly skeletonCards = [1, 2, 3];
  stageId = 0;
  stage: AcademicStage | null = null;
  classes: SchoolClass[] = [];
  loading = true;

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.stageId = Number(params.get('stageId'));
      this.load();
    });
  }

  load(): void {
    this.loading = true;
    this.stageService.getById(this.stageId).subscribe({
      next: (stage) => {
        this.stage = stage;
        this.classService.getByStage(this.stageId).subscribe({
          next: (classes) => { this.classes = classes; this.loading = false; },
          error: (e) => { this.loading = false; this.toast.fromError(e); }
        });
      },
      error: (e) => { this.loading = false; this.toast.fromError(e); }
    });
  }

  fillPercent(cls: SchoolClass): number {
    const cap = cls.capacity ?? 0;
    return cap > 0 ? Math.min(100, Math.round(((cls.studentCount ?? 0) / cap) * 100)) : 0;
  }

  openClassDialog(schoolClass?: SchoolClass): void {
    const dialogRef = this.dialog.open(ClassFormDialogComponent, {
      width: '480px',
      maxWidth: '95vw',

      data: { schoolClass, stageName: this.stage?.name ?? '' }
    });

    dialogRef.afterClosed().subscribe((result: SchoolClass | undefined) => {
      if (!result) return;
      const request$ = schoolClass?.id
        ? this.classService.update(schoolClass.id, result)
        : this.classService.create(this.stageId, result);

      request$.subscribe({
        next: () => {
          this.lookup.invalidate();
          this.toast.success(schoolClass?.id ? 'تم تحديث الفصل' : 'تمت إضافة الفصل');
          this.load();
        },
        error: (e) => this.toast.fromError(e)
      });
    });
  }

  deleteClass(schoolClass: SchoolClass): void {
    if (!schoolClass.id) return;
    this.confirm.deleteConfirmed(schoolClass.name, 'الفصل').subscribe(() => {
      this.classService.delete(schoolClass.id!).subscribe({
        next: () => {
          this.lookup.invalidate();
          this.toast.success('تم حذف الفصل');
          this.load();
        },
        error: (e) => this.toast.fromError(e)
      });
    });
  }
}
