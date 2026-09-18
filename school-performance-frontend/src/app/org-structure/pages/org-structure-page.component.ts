import { Component, OnInit, inject } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
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
import { TeacherApiService } from '../../teachers/services/teacher-api.service';
import { TeacherFormDialogComponent } from '../../teachers/teacher-form-dialog/teacher-form-dialog.component';
import { CredentialsDialogComponent } from '../../shared/components/credentials-dialog/credentials-dialog.component';
import {
  OrgDepartment, OrgPerson, OrgStructure, OrgStructureApiService, OrgSubject
} from '../services/org-structure-api.service';
import { UiIconComponent } from '../../shared/icons/ui-icon.component';

export type OrgViewMode = 'tree' | 'grid' | 'analytics';
export type OrgNodeKind = 'manager' | 'assistant' | 'department' | 'subject' | 'head' | 'teacher' | 'group' | 'empty';

export interface OrgTreeNode {
  id: string;
  kind: OrgNodeKind;
  label: string;
  meta?: string;
  person?: OrgPerson;
  dept?: OrgDepartment;
  subject?: OrgSubject;
  children: OrgTreeNode[];
}

@Component({
  selector: 'app-org-structure-page',
  standalone: true,
  imports: [
    UiIconComponent, NgTemplateOutlet, RouterLink, MatButtonModule, MatTooltipModule, MatDialogModule, MatMenuModule,
    EmptyStateComponent, HasPermissionPipe, AppDatePipe
  ],
  templateUrl: './org-structure-page.component.html'
})
export class OrgStructurePageComponent implements OnInit {
  private readonly api = inject(OrgStructureApiService);
  private readonly toast = inject(ToastService);
  private readonly details = inject(DetailDialogService);
  private readonly confirm = inject(ConfirmService);
  private readonly dialog = inject(MatDialog);
  private readonly auth = inject(AuthService);
  private readonly lookup = inject(AcademicLookupService);
  private readonly teachersApi = inject(TeacherApiService);

  loading = true;
  data: OrgStructure | null = null;
  viewMode: OrgViewMode = 'tree';
  searchQuery = '';
  private readonly collapsed = new Set<string>();

  readonly levels = [
    { key: 'manager', label: 'مدير المدرسة', color: '#312e81' },
    { key: 'assistant', label: 'وكيل', color: '#0891b2' },
    { key: 'department', label: 'شعبة', color: '#d97706' },
    { key: 'subject', label: 'مادة', color: '#7c3aed' },
    { key: 'teacher', label: 'معلم', color: '#059669' }
  ];

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.api.get().subscribe({
      next: (data) => {
        this.data = {
          ...data,
          assistantBranches: data.assistantBranches ?? [],
          departments: (data.departments ?? []).map(d => ({
            ...d,
            subjects: d.subjects ?? [],
            teachers: d.teachers ?? []
          }))
        };
        this.loading = false;
      },
      error: (e) => { this.loading = false; this.toast.fromError(e); }
    });
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
    return this.data.departments.reduce(
      (n, d) => n + d.teachers.length + d.subjects.reduce((m, s) => m + s.teachers.length, 0),
      0
    ) + this.data.unassignedTeachers.length;
  }

  get subjectsCount(): number {
    if (!this.data) return 0;
    return this.data.departments.reduce((n, d) => n + d.subjects.length, 0);
  }

  get leadershipCount(): number {
    if (!this.data) return 0;
    return this.data.managers.length + (this.data.assistantBranches?.length || this.data.assistantManagers?.length || 0);
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

  /**
   * Tree: مدير المدرسة → الوكلاء → الشعب → المواد → المدرسين
   */
  get treeRoots(): OrgTreeNode[] {
    if (!this.data) return [];
    const q = this.searchQuery.trim().toLowerCase();

    const branches = this.data.assistantBranches?.length
      ? this.data.assistantBranches
      : (this.data.assistantManagers ?? []).map(p => ({ person: p, departments: [] as OrgDepartment[] }));

    const vpNodes: OrgTreeNode[] = [];
    branches.forEach((branch, index) => {
      const depts = (branch.departments?.length ? branch.departments : this.sliceDepartments(index, branches.length))
        .filter(d => !q || this.matchesQuery(d, q))
        .map(d => this.buildDepartmentNode(d, q));
      if (q && !this.personMatches(branch.person, q) && !depts.length) return;
      vpNodes.push({
        id: `assistant-${branch.person.id}`,
        kind: 'assistant',
        label: branch.person.fullName,
        meta: `${branch.person.roleName} · ${depts.length} شعبة`,
        person: branch.person,
        children: depts
      });
    });

    // No VPs yet — attach departments directly under principal
    if (!vpNodes.length) {
      const depts = this.data.departments
        .filter(d => !q || this.matchesQuery(d, q))
        .map(d => this.buildDepartmentNode(d, q));
      if (depts.length) {
        vpNodes.push({
          id: 'group-departments',
          kind: 'group',
          label: `الشعب الدراسية (${depts.length})`,
          meta: `${this.subjectsCount} مادة · ${this.teachersCount} معلم`,
          children: depts
        });
      }
    }

    if (this.showUnassigned) {
      vpNodes.push({
        id: 'group-unassigned',
        kind: 'group',
        label: 'بدون شعبة',
        meta: `${this.data.unassignedHeads.length + this.data.unassignedTeachers.length} شخص`,
        children: [
          ...this.data.unassignedHeads.map(p => this.personNode('head', p)),
          ...this.data.unassignedTeachers.map(p => this.personNode('teacher', p))
        ]
      });
    }

    const managers = this.data.managers;
    if (managers.length) {
      return managers.map(m => ({
        id: `manager-${m.id}`,
        kind: 'manager' as const,
        label: m.fullName,
        meta: m.roleName,
        person: m,
        children: vpNodes
      }));
    }

    if (vpNodes.length) return vpNodes;
    return [{
      id: 'empty-root',
      kind: 'empty',
      label: 'لم يُعيَّن مدير مدرسة بعد',
      meta: 'عيّن مدير المدرسة والوكلاء من صفحة المستخدمين',
      children: []
    }];
  }

  onSearch(event: Event): void {
    this.searchQuery = (event.target as HTMLInputElement).value;
    if (this.searchQuery.trim()) this.expandAll();
  }

  setView(mode: OrgViewMode): void {
    this.viewMode = mode;
  }

  isExpanded(node: OrgTreeNode): boolean {
    return !this.collapsed.has(node.id);
  }

  toggleNode(node: OrgTreeNode, event?: Event): void {
    event?.stopPropagation();
    if (!node.children.length) return;
    if (this.collapsed.has(node.id)) this.collapsed.delete(node.id);
    else this.collapsed.add(node.id);
  }

  expandAll(): void {
    this.collapsed.clear();
  }

  collapseBranches(): void {
    if (!this.data) return;
    this.collapsed.clear();
    for (const dept of this.data.departments) {
      this.collapsed.add(`dept-${dept.id}`);
      for (const s of dept.subjects) this.collapsed.add(`subject-${s.id}`);
    }
    for (const b of this.data.assistantBranches ?? []) {
      this.collapsed.add(`assistant-${b.person.id}`);
    }
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

  openAddTeacher(dept: OrgDepartment, asHead = false): void {
    const ref = this.dialog.open(TeacherFormDialogComponent, {
      width: '640px',
      maxWidth: '95vw',
      panelClass: 'sp-form-dialog',
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

  deptTeachers(dept: OrgDepartment): OrgPerson[] {
    const fromSubjects = dept.subjects.flatMap(s => s.teachers);
    return [...(dept.head ? [dept.head] : []), ...dept.teachers, ...fromSubjects]
      .filter((p, i, arr) => arr.findIndex(x => x.id === p.id) === i);
  }

  private sliceDepartments(index: number, total: number): OrgDepartment[] {
    if (!this.data || !total) return this.data?.departments ?? [];
    return this.data.departments.filter((_, i) => i % total === index);
  }

  private buildDepartmentNode(dept: OrgDepartment, q: string): OrgTreeNode {
    const children: OrgTreeNode[] = [];

    if (dept.head) {
      children.push(this.personNode('head', dept.head, dept));
    }

    for (const subject of dept.subjects) {
      if (q && !this.subjectMatches(subject, q) && !dept.name.toLowerCase().includes(q)) continue;
      children.push({
        id: `subject-${subject.id}`,
        kind: 'subject',
        label: subject.name,
        meta: `${subject.teachers.length} معلم`,
        subject,
        dept,
        children: subject.teachers
          .filter(t => !q || this.personMatches(t, q) || this.subjectMatches(subject, q))
          .map(t => this.personNode('teacher', t, dept))
      });
    }

    for (const t of dept.teachers) {
      if (dept.head?.id === t.id) continue;
      if (!q || this.personMatches(t, q) || dept.name.toLowerCase().includes(q)) {
        children.push(this.personNode('teacher', t, dept));
      }
    }

    return {
      id: `dept-${dept.id}`,
      kind: 'department',
      label: dept.name,
      meta: `${dept.subjects.length} مادة · ${this.deptTeachers(dept).length} معلم`,
      dept,
      children
    };
  }

  private personNode(kind: OrgNodeKind, person: OrgPerson, dept?: OrgDepartment): OrgTreeNode {
    return {
      id: `${kind}-${person.id}`,
      kind,
      label: person.fullName,
      meta: kind === 'teacher' ? (person.specialization || person.roleName) : person.roleName,
      person,
      dept,
      children: []
    };
  }

  private matchesQuery(dept: OrgDepartment, q: string): boolean {
    if (dept.name.toLowerCase().includes(q) || dept.code?.toLowerCase().includes(q)) return true;
    if (dept.head && this.personMatches(dept.head, q)) return true;
    if (dept.teachers.some(t => this.personMatches(t, q))) return true;
    return dept.subjects.some(s => this.subjectMatches(s, q));
  }

  private subjectMatches(subject: OrgSubject, q: string): boolean {
    if (subject.name.toLowerCase().includes(q) || (subject.code ?? '').toLowerCase().includes(q)) return true;
    return subject.teachers.some(t => this.personMatches(t, q));
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
