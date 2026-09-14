import { Component, OnInit, inject } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { HasPermissionPipe } from '../../shared/pipes/has-permission.pipe';
import { AppDatePipe } from '../../shared/pipes/app-date.pipe';
import { ToastService } from '../../shared/services/toast.service';
import { DetailDialogService } from '../../shared/services/detail-dialog.service';
import { OrgDepartment, OrgPerson, OrgStructure, OrgStructureApiService } from '../services/org-structure-api.service';

@Component({
  selector: 'app-org-structure-page',
  standalone: true,
  imports: [NgTemplateOutlet, RouterLink, MatButtonModule, MatIconModule, MatTooltipModule, MatButtonToggleModule, PageHeaderComponent, EmptyStateComponent, HasPermissionPipe, AppDatePipe],
  templateUrl: './org-structure-page.component.html',
  styleUrl: './org-structure-page.component.scss'
})
export class OrgStructurePageComponent implements OnInit {
  private readonly api = inject(OrgStructureApiService);
  private readonly toast = inject(ToastService);
  private readonly details = inject(DetailDialogService);

  loading = true;
  data: OrgStructure | null = null;
  /** 'chart' = tree with connectors, 'list' = stacked levels (better on phones). */
  view: 'chart' | 'list' = 'chart';
  collapsed = new Set<number>();

  readonly levels = [
    { key: 'manager', label: 'مدير المدرسة', color: 'var(--org-manager)' },
    { key: 'assistant', label: 'مدير مساعد', color: 'var(--org-assistant)' },
    { key: 'head', label: 'رئيس قسم', color: 'var(--org-head)' },
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

  get headsCount(): number {
    if (!this.data) return 0;
    return this.data.departments.filter(d => d.head).length + this.data.unassignedHeads.length;
  }

  get teachersCount(): number {
    if (!this.data) return 0;
    return this.data.departments.reduce((n, d) => n + d.teachers.length, 0) + this.data.unassignedTeachers.length;
  }

  get isEmpty(): boolean {
    return !!this.data && this.data.totalPeople === 0;
  }

  initials(name: string): string {
    const parts = name.replace(/^أ\.\s*/, '').trim().split(/\s+/).filter(Boolean);
    return parts.length > 1 ? parts[0].charAt(0) + parts[1].charAt(0) : (parts[0]?.charAt(0) ?? '?');
  }

  toggleDepartment(dept: OrgDepartment): void {
    if (this.collapsed.has(dept.id)) this.collapsed.delete(dept.id);
    else this.collapsed.add(dept.id);
  }

  isCollapsed(dept: OrgDepartment): boolean {
    return this.collapsed.has(dept.id);
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

  private roleChip(roleKey: string): string {
    switch (roleKey) {
      case 'SCHOOL_MANAGER': return 'info';
      case 'ASSISTANT_MANAGER': return 'neutral';
      case 'DEPARTMENT_HEAD': return 'warning';
      default: return 'success';
    }
  }
}
