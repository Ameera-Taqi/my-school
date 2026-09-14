import { AfterViewInit, Component, ElementRef, HostListener, OnInit, ViewChild, inject } from '@angular/core';
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
export class OrgStructurePageComponent implements OnInit, AfterViewInit {
  @ViewChild('deptArea') deptArea?: ElementRef<HTMLElement>;
  private readonly api = inject(OrgStructureApiService);
  private readonly toast = inject(ToastService);
  private readonly details = inject(DetailDialogService);

  loading = true;
  data: OrgStructure | null = null;
  /** 'chart' = tree with connectors, 'list' = stacked levels (better on phones). */
  view: 'chart' | 'list' = 'chart';
  /** Departments are laid out in visual rows; each row has its own collapse toggle. */
  private static readonly CARD_MIN = 250;
  private static readonly GAP = 16;
  columns = 3;
  collapsedRows = new Set<number>();

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
      next: (data) => { this.data = data; this.loading = false; setTimeout(() => this.measureColumns()); },
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

  ngAfterViewInit(): void {
    this.measureColumns();
  }

  @HostListener('window:resize')
  measureColumns(): void {
    const width = this.deptArea?.nativeElement.clientWidth ?? 0;
    const cols = width ? Math.max(1, Math.floor((width + OrgStructurePageComponent.GAP) / (OrgStructurePageComponent.CARD_MIN + OrgStructurePageComponent.GAP))) : 3;
    if (cols !== this.columns) { this.columns = cols; this.collapsedRows.clear(); }
  }

  /** Department cards plus a pseudo-card for people without a department, chunked into visual rows. */
  get departmentRows(): (OrgDepartment | null)[][] {
    if (!this.data) return [];
    const items: (OrgDepartment | null)[] = [...this.data.departments];
    if (this.data.unassignedHeads.length || this.data.unassignedTeachers.length) items.push(null);
    const rows: (OrgDepartment | null)[][] = [];
    for (let i = 0; i < items.length; i += this.columns) rows.push(items.slice(i, i + this.columns));
    return rows;
  }

  toggleRow(index: number): void {
    if (this.collapsedRows.has(index)) this.collapsedRows.delete(index);
    else this.collapsedRows.add(index);
  }

  isRowCollapsed(index: number): boolean {
    return this.collapsedRows.has(index);
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
