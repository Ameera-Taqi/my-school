import { Component, OnInit, inject } from '@angular/core';
import { forkJoin } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { ToastService } from '../../shared/services/toast.service';
import { AcademicLookupService } from '../../core/services/academic-lookup.service';
import { DepartmentApiService } from '../../departments/services/department-api.service';
import { Department, Teacher } from '../../core/models';
import { UiIconComponent } from '../../shared/icons/ui-icon.component';
import { FileField, FilePerson, PersonFileComponent, formatFileDate } from '../person-file.component';

@Component({
  selector: 'app-teacher-file-page',
  standalone: true,
  imports: [
    FormsModule, MatFormFieldModule, MatSelectModule, MatInputModule, MatButtonModule,
    UiIconComponent, PersonFileComponent
  ],
  template: `
    <app-person-file
      title="ملف المعلم"
      subtitle="صفِّ القائمة بالشعبة أو المادة أو الاسم، أو اجمع بينهم"
      listTitle="المعلمون"
      emptyListIcon="how_to_reg"
      emptyListTitle="لا يوجد معلمون"
      emptyListDescription="لم يطابق الفلتر أي معلم."
      emptyFileIcon="badge"
      emptyFileTitle="ملف المعلم"
      emptyFileDescription="اختر معلماً من القائمة لعرض ملفه."
      [hideSearch]="true"
      [loading]="loading"
      [items]="rows"
      [selectedId]="selected?.id ?? null"
      [personName]="selected?.fullName ?? ''"
      [personMeta]="personMeta"
      [statusLabel]="statusLabel"
      [statusTone]="statusTone"
      [fields]="fields"
      (pick)="choose($event)"
    >
    <section fileFilters class="data-card teacher-file-filters">
      <mat-form-field appearance="outline" class="filter-field" subscriptSizing="dynamic">
        <mat-label>اختر الشعبة</mat-label>
        <mat-select [value]="departmentId" (selectionChange)="onDepartment($event.value)">
          <mat-option [value]="null">الكل</mat-option>
          @for (department of departments; track department.id) {
            <mat-option [value]="department.id">{{ department.name }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
      <mat-form-field appearance="outline" class="filter-field" subscriptSizing="dynamic">
        <mat-label>اختر المادة</mat-label>
        <mat-select [value]="subject" (selectionChange)="onSubject($event.value)">
          <mat-option [value]="null">الكل</mat-option>
          @for (name of subjectChoices; track name) {
            <mat-option [value]="name">{{ name }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
      <mat-form-field appearance="outline" class="filter-field" subscriptSizing="dynamic">
        <mat-label>اسم المعلم</mat-label>
        <input matInput [ngModel]="nameQuery" (ngModelChange)="onName($event)" placeholder="اسم المعلم" autocomplete="off">
      </mat-form-field>
      <button mat-stroked-button type="button" (click)="resetFilters()" [disabled]="!hasFilters">
        <app-ui-icon name="restart_alt"></app-ui-icon>
        مسح
      </button>
    </section>
    </app-person-file>
  `,
  styles: [`
    .teacher-file-filters {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 1rem;
      padding: 0.85rem 1rem;
    }
    .filter-field {
      flex: 1 1 12rem;
      min-width: 0;
      margin: 0;
    }
  `]
})
export class TeacherFilePageComponent implements OnInit {
  private readonly lookup = inject(AcademicLookupService);
  private readonly departmentsApi = inject(DepartmentApiService);
  private readonly toast = inject(ToastService);

  loading = true;
  departments: Department[] = [];
  departmentId: number | null = null;
  subject: string | null = null;
  nameQuery = '';
  teachers: Teacher[] = [];
  selected: Teacher | null = null;

  get subjectChoices(): string[] {
    const scoped = this.departmentId == null
      ? this.departments
      : this.departments.filter(department => department.id === this.departmentId);
    const fromDepartments = scoped.flatMap(department => department.subjects ?? []);
    const fromTeachers = this.teachers
      .filter(teacher => this.departmentId == null || teacher.departmentId === this.departmentId)
      .map(teacher => teacher.specialization)
      .filter((name): name is string => !!name);
    return [...new Set([...fromDepartments, ...fromTeachers])].sort((a, b) => a.localeCompare(b, 'ar'));
  }

  get hasFilters(): boolean {
    return this.departmentId != null || this.subject != null || this.nameQuery.trim().length > 0;
  }

  get rows(): FilePerson[] {
    return this.visible.map(teacher => ({
      id: teacher.id ?? 0,
      name: teacher.fullName,
      meta: teacher.departmentName || '—'
    }));
  }

  get personMeta(): string {
    if (!this.selected) return '';
    return [this.selected.departmentName, this.selected.specialization].filter(Boolean).join(' · ');
  }

  get statusLabel(): string {
    if (!this.selected) return '';
    return this.selected.active === false ? 'غير نشط' : 'نشط';
  }

  get statusTone(): 'ok' | 'off' {
    return this.selected?.active === false ? 'off' : 'ok';
  }

  get fields(): FileField[] {
    const teacher = this.selected;
    if (!teacher) return [];
    return [
      { label: 'الرقم الوظيفي', value: teacher.employeeNumber || '—', ltr: true },
      { label: 'الدور', value: teacher.roleName || 'معلم' },
      { label: 'الهاتف', value: teacher.phone || '—', ltr: true },
      { label: 'البريد', value: teacher.email || '—', ltr: true },
      { label: 'الشعبة', value: teacher.departmentName || '—' },
      { label: 'التخصص', value: teacher.specialization || '—' },
      { label: 'تاريخ التعيين', value: this.dateLabel(teacher.hireDate) },
      { label: 'اسم المستخدم', value: teacher.username || '—', ltr: true },
      { label: 'مهام إضافية', value: this.extras(teacher), wide: true }
    ];
  }

  private get visible(): Teacher[] {
    const name = this.nameQuery.trim().toLowerCase();
    const list = this.teachers.filter(teacher => {
      if (this.departmentId != null && teacher.departmentId !== this.departmentId) return false;
      if (this.subject && teacher.specialization !== this.subject) return false;
      if (name && !teacher.fullName.toLowerCase().includes(name)) return false;
      return true;
    });
    return [...list].sort((a, b) => a.fullName.localeCompare(b.fullName, 'ar'));
  }

  ngOnInit(): void {
    forkJoin({
      departments: this.departmentsApi.getAll(),
      teachers: this.lookup.getAllTeachers()
    }).subscribe({
      next: ({ departments, teachers }) => {
        this.departments = [...departments].sort((a, b) => a.name.localeCompare(b.name, 'ar'));
        this.teachers = teachers;
        this.loading = false;
      },
      error: error => {
        this.loading = false;
        this.toast.fromError(error);
      }
    });
  }

  onDepartment(departmentId: number | null): void {
    this.departmentId = departmentId;
    if (this.subject && !this.subjectChoices.includes(this.subject)) {
      this.subject = null;
    }
    this.keepSelection();
  }

  onSubject(subject: string | null): void {
    this.subject = subject;
    this.keepSelection();
  }

  onName(value: string): void {
    this.nameQuery = value;
    this.keepSelection();
  }

  resetFilters(): void {
    this.departmentId = null;
    this.subject = null;
    this.nameQuery = '';
    this.keepSelection();
  }

  private keepSelection(): void {
    if (this.selected && !this.visible.some(teacher => teacher.id === this.selected?.id)) {
      this.selected = null;
    }
  }

  choose(id: number): void {
    this.selected = this.teachers.find(teacher => teacher.id === id) ?? null;
  }

  private extras(teacher: Teacher): string {
    const roles = [
      teacher.departmentHead ? 'رئيس شعبة' : '',
      teacher.wingSupervisor ? 'مشرف جناح' : ''
    ].filter(Boolean);
    return roles.length ? roles.join(' · ') : '—';
  }

  private dateLabel(value?: string): string {
    return formatFileDate(value);
  }
}
