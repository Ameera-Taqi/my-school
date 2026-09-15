import { AfterViewInit, Component, OnInit, ViewChild, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { TableSkeletonComponent } from '../../../shared/components/table-skeleton/table-skeleton.component';
import { ToastService } from '../../../shared/services/toast.service';
import { TeacherPortalMockService } from '../../services/teacher-portal-mock.service';
import { MyClassFormDialogComponent } from '../../dialogs/my-class-form-dialog.component';
import { TeacherMyClass, TeacherMyStudent } from '../../../core/models';
import { UiIconComponent } from '../../../shared/icons/ui-icon.component';

@Component({
  selector: 'app-my-classes-page',
  standalone: true,
  imports: [UiIconComponent, MatButtonModule, MatTooltipModule, MatDialogModule, MatTableModule, MatPaginatorModule, MatSortModule, PageHeaderComponent, EmptyStateComponent, TableSkeletonComponent],
  templateUrl: './my-classes-page.component.html',
  styleUrl: './my-classes-page.component.scss'
})
export class MyClassesPageComponent implements OnInit, AfterViewInit {
  private readonly service = inject(TeacherPortalMockService);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);

  // Setter form: the table lives inside @if blocks, so attach the moment Angular creates the paginator.
  @ViewChild(MatPaginator) set paginatorRef(p: MatPaginator | undefined) { this.paginator = p; this.attachTableControls(); }
  paginator?: MatPaginator;
  @ViewChild(MatSort) set sortRef(s: MatSort | undefined) { this.sort = s; this.attachTableControls(); }
  sort?: MatSort;

  classes: TeacherMyClass[] = [];
  selectedClass: TeacherMyClass | null = null;
  readonly roster = new MatTableDataSource<TeacherMyStudent>([]);
  loading = true;
  studentsLoading = false;
  studentCols = ['fullName', 'guardianPhone', 'status'];
  readonly skeletonCards = [0, 1, 2, 3];

  get rosterTotal(): number { return this.roster.data.length; }

  ngOnInit(): void {
    this.load();
  }

  ngAfterViewInit(): void { this.attachTableControls(); }

  load(): void {
    this.loading = true;
    this.service.getMyClasses().subscribe({
      next: (data) => {
        this.classes = data;
        this.loading = false;
        if (this.selectedClass) {
          const stillExists = data.find(c => c.id === this.selectedClass!.id);
          if (stillExists) {
            this.selectClass(stillExists);
          } else {
            this.selectedClass = null;
            this.roster.data = [];
          }
        }
      },
      error: (e) => { this.loading = false; this.toast.fromError(e); }
    });
  }

  selectClass(classItem: TeacherMyClass): void {
    if (this.selectedClass?.id === classItem.id) return;
    this.selectedClass = classItem;
    this.studentsLoading = true;
    this.roster.data = [];
    this.service.getMyStudentsByClassId(classItem.id).subscribe({
      next: (students) => {
        this.roster.data = students;
        this.studentsLoading = false;
        setTimeout(() => this.attachTableControls());
      },
      error: (e) => { this.studentsLoading = false; this.toast.fromError(e); }
    });
  }

  openDialog(item?: TeacherMyClass): void {
    const ref = this.dialog.open(MyClassFormDialogComponent, {
      width: '480px',
      maxWidth: '95vw',

      data: item ?? null
    });
    ref.afterClosed().subscribe((result: TeacherMyClass | undefined) => {
      if (!result) return;
      this.service.saveMyClass(result).subscribe({
        next: () => { this.toast.success('تم حفظ الفصل'); this.load(); },
        error: (e) => this.toast.fromError(e)
      });
    });
  }

  isActive(student: TeacherMyStudent): boolean {
    return student.status === 'ACTIVE' || !student.status;
  }

  private attachTableControls(): void {
    if (this.paginator && this.roster.paginator !== this.paginator) this.roster.paginator = this.paginator;
    if (this.sort && this.roster.sort !== this.sort) this.roster.sort = this.sort;
  }
}
