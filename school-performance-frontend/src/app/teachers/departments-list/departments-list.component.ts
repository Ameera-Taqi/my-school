import { Component, OnInit, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { HasPermissionPipe } from '../../shared/pipes/has-permission.pipe';
import { ToastService } from '../../shared/services/toast.service';
import { DepartmentApiService } from '../../departments/services/department-api.service';
import { DepartmentFormDialogComponent } from '../../departments/department-form-dialog/department-form-dialog.component';
import { Department } from '../../core/models';

@Component({
  selector: 'app-departments-list',
  standalone: true,
  imports: [
    RouterModule, MatCardModule, MatButtonModule, MatIconModule, MatTooltipModule, MatDialogModule,
    PageHeaderComponent, EmptyStateComponent, HasPermissionPipe
  ],
  templateUrl: './departments-list.component.html',
  styleUrl: './departments-list.component.scss'
})
export class DepartmentsListComponent implements OnInit {
  private readonly departmentService = inject(DepartmentApiService);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);

  readonly skeletonCards = [1, 2, 3];
  departments: Department[] = [];
  loading = true;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.departmentService.getAll().subscribe({
      next: (data) => { this.departments = data; this.loading = false; },
      error: (e) => { this.loading = false; this.toast.fromError(e); }
    });
  }

  openDepartmentDialog(department?: Department): void {
    const dialogRef = this.dialog.open(DepartmentFormDialogComponent, {
      width: '480px',
      maxWidth: '95vw',
      direction: 'rtl',
      data: department ?? null
    });

    dialogRef.afterClosed().subscribe((result: Department | undefined) => {
      if (!result) return;
      const request$ = department?.id
        ? this.departmentService.update(department.id, result)
        : this.departmentService.create(result);

      request$.subscribe({
        next: () => {
          this.toast.success(department?.id ? 'تم تحديث القسم' : 'تمت إضافة القسم');
          this.load();
        },
        error: (e) => this.toast.fromError(e)
      });
    });
  }
}
