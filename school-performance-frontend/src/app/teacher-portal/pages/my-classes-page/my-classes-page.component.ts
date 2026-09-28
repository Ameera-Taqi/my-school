import { AfterViewInit, Component, OnInit, ViewChild, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { AuthService } from '../../../core/services/auth.service';
import { ScheduleApiService } from '../../../class-schedule/services/schedule-api.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { TableSkeletonComponent } from '../../../shared/components/table-skeleton/table-skeleton.component';
import { KanbanBoardComponent } from '../../../shared/kanban/kanban-board.component';
import { KanbanStage } from '../../../shared/kanban/kanban.models';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { ToastService } from '../../../shared/services/toast.service';
import { TeacherPortalMockService } from '../../services/teacher-portal-mock.service';
import { MyClassFormDialogComponent } from '../../dialogs/my-class-form-dialog.component';
import { ClassScheduleEntry, TeacherMyClass, TeacherMyStudent } from '../../../core/models';
import { UiIconComponent } from '../../../shared/icons/ui-icon.component';

@Component({
  selector: 'app-my-classes-page',
  standalone: true,
  imports: [UiIconComponent, MatButtonModule, MatDialogModule, MatTableModule, MatPaginatorModule, MatSortModule, PageHeaderComponent, EmptyStateComponent, TableSkeletonComponent, KanbanBoardComponent, TranslatePipe],
  templateUrl: './my-classes-page.component.html'
})
export class MyClassesPageComponent implements OnInit, AfterViewInit {
  private readonly service = inject(TeacherPortalMockService);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);
  private readonly schedule = inject(ScheduleApiService);

  // Setter form: the table lives inside @if blocks, so attach the moment Angular creates the paginator.
  @ViewChild(MatPaginator) set paginatorRef(p: MatPaginator | undefined) { this.paginator = p; this.attachTableControls(); }
  paginator?: MatPaginator;
  @ViewChild(MatSort) set sortRef(s: MatSort | undefined) { this.sort = s; this.attachTableControls(); }
  sort?: MatSort;

  classes: TeacherMyClass[] = [];
  stages: KanbanStage[] = [];
  selectedClass: TeacherMyClass | null = null;
  readonly roster = new MatTableDataSource<TeacherMyStudent>([]);
  loading = true;
  studentsLoading = false;
  studentCols = ['fullName', 'guardianPhone', 'status'];

  get rosterTotal(): number { return this.roster.data.length; }

  ngOnInit(): void {
    this.load();
    this.loadStages();
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

  private loadStages(): void {
    const teacherId = this.auth.user()?.teacherId;
    if (!teacherId) return;
    this.schedule.getEntries({ teacherId }).subscribe({
      next: entries => { this.stages = this.groupStages(entries); }
    });
  }

  private groupStages(entries: ClassScheduleEntry[]): KanbanStage[] {
    const byStage = new Map<number, { name: string; classes: Map<number, { title: string; lessons: number }> }>();
    for (const entry of entries) {
      const stageId = entry.stageId ?? 0;
      const classId = entry.classId ?? 0;
      if (!stageId || !classId || !entry.stageName) continue;
      let stage = byStage.get(stageId);
      if (!stage) {
        stage = { name: entry.stageName, classes: new Map() };
        byStage.set(stageId, stage);
      }
      const existing = stage.classes.get(classId);
      if (existing) existing.lessons += 1;
      else stage.classes.set(classId, { title: entry.className, lessons: 1 });
    }

    const columns = [...byStage.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([id, stage]) => ({
        id: String(id),
        title: stage.name,
        tasks: [...stage.classes.entries()]
          .sort((a, b) => a[1].title.localeCompare(b[1].title, 'ar'))
          .map(([classId, cls]) => ({
            id: String(classId),
            title: cls.title,
            progress: 0,
            status: stage.name,
            link: `/my-lessons/${classId}`,
            lessons: cls.lessons
          }))
      }));

    const total = columns.reduce((sum, stage) => sum + stage.tasks.reduce((n, task) => n + task.lessons, 0), 0);
    return columns.map(stage => ({
      id: stage.id,
      title: stage.title,
      tasks: stage.tasks.map(task => ({
        id: task.id,
        title: task.title,
        progress: total > 0 ? Math.round((task.lessons / total) * 100) : 0,
        status: task.status,
        link: task.link
      }))
    }));
  }

  private attachTableControls(): void {
    if (this.paginator && this.roster.paginator !== this.paginator) this.roster.paginator = this.paginator;
    if (this.sort && this.roster.sort !== this.sort) this.roster.sort = this.sort;
  }
}
