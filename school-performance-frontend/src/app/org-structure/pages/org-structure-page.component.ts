import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { switchMap } from 'rxjs';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { HasPermissionPipe } from '../../shared/pipes/has-permission.pipe';
import { AppDatePipe } from '../../shared/pipes/app-date.pipe';
import { ToastService } from '../../shared/services/toast.service';
import { DetailDialogService } from '../../shared/services/detail-dialog.service';
import { ConfirmService } from '../../shared/services/confirm.service';
import { AuthService } from '../../core/services/auth.service';
import { AcademicLookupService } from '../../core/services/academic-lookup.service';
import { Teacher } from '../../core/models';
import { DepartmentApiService } from '../../departments/services/department-api.service';
import { DepartmentFormDialogComponent } from '../../departments/department-form-dialog/department-form-dialog.component';
import { TeacherApiService } from '../../teachers/services/teacher-api.service';
import { TeacherFormDialogComponent } from '../../teachers/teacher-form-dialog/teacher-form-dialog.component';
import { CredentialsDialogComponent } from '../../shared/components/credentials-dialog/credentials-dialog.component';
import { OrgDepartment, OrgPerson, OrgStructure, OrgStructureApiService } from '../services/org-structure-api.service';
import { UiIconComponent } from '../../shared/icons/ui-icon.component';

export type OrgViewMode = 'tree' | 'grid' | 'analytics';

@Component({
  selector: 'app-org-structure-page',
  standalone: true,
  imports: [
    UiIconComponent, RouterLink, MatButtonModule, MatTooltipModule, MatDialogModule, MatMenuModule,
    EmptyStateComponent, HasPermissionPipe, AppDatePipe
  ],
  templateUrl: './org-structure-page.component.html',
  styleUrl: './org-structure-page.component.scss'
})
export class OrgStructurePageComponent implements OnInit {
  private readonly api = inject(OrgStructureApiService);
  private readonly toast = inject(ToastService);
  private readonly details = inject(DetailDialogService);
  private readonly confirm = inject(ConfirmService);
  private readonly dialog = inject(MatDialog);
  private readonly auth = inject(AuthService);
  private readonly lookup = inject(AcademicLookupService);
  private readonly departmentsApi = inject(DepartmentApiService);
  private readonly teachersApi = inject(TeacherApiService);

  loading = true;
  data: OrgStructure | null = null;
  viewMode: OrgViewMode = 'grid';
  searchQuery = '';

  readonly levels = [
    { key: 'manager', label: 'مدير المدرسة', color: 'var(--org-manager)' },
    { key: 'assistant', label: 'مدير مساعد', color: 'var(--org-assistant)' },
    { key: 'head', label: 'رئيس شعبة', color: 'var(--org-head)' },
    { key: 'teacher', label: 'معلم', color: 'var(--org-teacher)' }
  ];

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.api.get().subscribe({
      next: (data) => { this.data = data; this.loading = false; },
      error: (e) => { this.loading = false; this.toast.fromError(e); }
    });
  }

  get canManageDepartments(): boolean {
    return this.auth.hasPermission('departments.manage');
  }

  get canManageTeachers(): boolean {
    return this.auth.hasPermission('teachers.manage');
  }

  get headsCount(): number {
    if (!this.data) return 0;
    return this.data.departments.filter(d => d.head).length;
  }

  get teachersCount(): number {
    if (!this.data) return 0;
    return this.data.departments.reduce((n, d) => n + d.teachers.length, 0) + this.data.unassignedTeachers.length;
  }

  get leadershipCount(): number {
    if (!this.data) return 0;
    return this.data.managers.length + this.data.assistantManagers.length;
  }

  get isEmpty(): boolean {
    return !!this.data && this.data.totalPeople === 0 && this.data.departments.length === 0;
  }

  get filteredDepartments(): OrgDepartment[] {
    if (!this.data) return [];
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) return this.data.departments;
    return this.data.departments.filter(dept => this.matchesQuery(dept, q));
  }

  get showUnassigned(): boolean {
    if (!this.data) return false;
    const people = [...this.data.unassignedHeads, ...this.data.unassignedTeachers];
    if (!people.length) return false;
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) return true;
    return people.some(p => this.personMatches(p, q));
  }

  get leadershipShare(): number {
    return this.share(this.leadershipCount);
  }

  get headsShare(): number {
    return this.share(this.headsCount + (this.data?.unassignedHeads.length ?? 0));
  }

  get teachersShare(): number {
    return this.share(this.teachersCount);
  }

  get headsCoverage(): number {
    const total = this.data?.departments.length ?? 0;
    if (!total) return 0;
    return Math.round((this.headsCount / total) * 100);
  }

  onSearch(event: Event): void {
    this.searchQuery = (event.target as HTMLInputElement).value;
  }

  setView(mode: OrgViewMode): void {
    this.viewMode = mode;
  }

  initials(name: string): string {
    const parts = name.replace(/^أ\.\s*/, '').trim().split(/\s+/).filter(Boolean);
    return parts.length > 1 ? parts[0].charAt(0) + parts[1].charAt(0) : (parts[0]?.charAt(0) ?? '?');
  }

  showPerson(person: OrgPerson): void {
    this.details.open({
      title: person.fullName,
      subtitle: person.roleName,
      icon: person.roleKey === 'TEACHER' ? 'person' : 'badge',
      fields: [
        { label: 'الدور', value: person.roleName, chip: this.roleChip(person.roleKey) },
        { label: 'اسم المستخدم', value: person.username, mono: true },
        { label: 'رقم الموظف', value: person.employeeNumber, mono: true },
        { label: 'التخصص', value: person.specialization },
        { label: 'البريد', value: person.email },
        { label: 'الجوال', value: person.phone, mono: true },
        { label: 'الحالة', value: person.active ? 'نشط' : 'غير نشط', chip: person.active ? 'success' : 'danger' }
      ]
    });
  }

  openAddSection(): void {
    const ref = this.dialog.open(DepartmentFormDialogComponent, {
      width: '480px',
      maxWidth: '95vw',
      data: null
    });
    ref.afterClosed().subscribe((result) => {
      if (!result) return;
      this.departmentsApi.create(result).subscribe({
        next: () => {
          this.lookup.invalidate();
          this.toast.success('تمت إضافة الشعبة الجديدة بنجاح');
          this.load();
        },
        error: (e) => this.toast.fromError(e)
      });
    });
  }

  openAddTeacher(dept: OrgDepartment, asHead = false): void {
    const ref = this.dialog.open(TeacherFormDialogComponent, {
      width: '640px',
      maxWidth: '95vw',
      data: { departmentName: dept.name, asHead }
    });
    ref.afterClosed().subscribe((result: Teacher | undefined) => {
      if (!result) return;
      this.teachersApi.create(dept.id, result).subscribe({
        next: (saved) => {
          this.lookup.invalidate();
          this.toast.success(asHead ? `تم تعيين رئيس شعبة لـ ${dept.name}` : 'تمت إضافة المعلم بنجاح');
          this.load();
          if (saved.username) {
            this.dialog.open(CredentialsDialogComponent, {
              width: '460px', maxWidth: '95vw', disableClose: true,
              data: { personName: saved.fullName, username: saved.username, password: `${saved.username}123` }
            });
          }
        },
        error: (e) => this.toast.fromError(e)
      });
    });
  }

  assignHead(dept: OrgDepartment, teacher: OrgPerson): void {
    if (dept.head?.id === teacher.id) return;
    this.teachersApi.getById(teacher.id).pipe(
      switchMap((full) => {
        const promote$ = this.teachersApi.update(teacher.id, { ...full, departmentHead: true });
        if (!dept.head || dept.head.id === teacher.id) return promote$;
        return this.teachersApi.getById(dept.head.id).pipe(
          switchMap((current) => this.teachersApi.update(current.id!, { ...current, departmentHead: false })),
          switchMap(() => promote$)
        );
      })
    ).subscribe({
      next: () => {
        this.lookup.invalidate();
        this.toast.success(`تم تعيين رئيس شعبة لـ ${dept.name}`);
        this.load();
      },
      error: (e) => this.toast.fromError(e)
    });
  }

  removeTeacher(dept: OrgDepartment, teacher: OrgPerson): void {
    this.confirm.deleteConfirmed(teacher.fullName, 'المعلم').subscribe(() => {
      this.teachersApi.delete(teacher.id).subscribe({
        next: () => {
          this.lookup.invalidate();
          this.toast.success('تم إزالة المعلم من الشعبة بنجاح');
          this.load();
        },
        error: (e) => this.toast.fromError(e)
      });
    });
  }

  private matchesQuery(dept: OrgDepartment, q: string): boolean {
    if (dept.name.toLowerCase().includes(q) || dept.code?.toLowerCase().includes(q)) return true;
    if (dept.head && this.personMatches(dept.head, q)) return true;
    return dept.teachers.some(t => this.personMatches(t, q));
  }

  private personMatches(person: OrgPerson, q: string): boolean {
    return person.fullName.toLowerCase().includes(q)
      || (person.specialization ?? '').toLowerCase().includes(q)
      || (person.roleName ?? '').toLowerCase().includes(q);
  }

  private share(count: number): number {
    const total = this.data?.totalPeople ?? 0;
    if (!total) return 0;
    return Math.max(0, Math.round((count / total) * 100));
  }

  private roleChip(roleKey: string): string {
    switch (roleKey) {
      case 'SCHOOL_MANAGER': return 'info';
      case 'ASSISTANT_MANAGER': return 'neutral';
      case 'DEPARTMENT_HEAD': return 'warning';
      default: return 'success';
    }
  }
}
