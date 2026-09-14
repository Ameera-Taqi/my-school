import { Component, HostListener, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { SearchFieldComponent } from '../../shared/components/search-field/search-field.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ToastService } from '../../shared/services/toast.service';
import { ConfirmService } from '../../shared/services/confirm.service';
import { RoleApiService } from '../../roles/services/role-api.service';
import { RolePermissionApiService } from '../services/role-permission-api.service';
import { AuthService } from '../../core/services/auth.service';
import { Role, PermissionAssignment } from '../../core/models';

const MODULE_ICONS: Record<string, string> = {
  'الإدارة العليا': 'admin_panel_settings',
  'لوحة التحكم': 'dashboard',
  'إدارة المدرسة': 'school',
  'رؤساء الشعب': 'supervisor_account',
  'المعلمين': 'person',
  'النظام والصلاحيات': 'security'
};

@Component({
  selector: 'app-role-permissions',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatFormFieldModule, MatSelectModule, MatCheckboxModule,
    MatButtonModule, MatCardModule, MatIconModule, MatTooltipModule, MatProgressSpinnerModule,
    MatProgressBarModule, PageHeaderComponent, SearchFieldComponent, EmptyStateComponent
  ],
  templateUrl: './role-permissions.component.html',
  styleUrl: './role-permissions.component.scss'
})
export class RolePermissionsComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly roleService = inject(RoleApiService);
  private readonly rolePermissionService = inject(RolePermissionApiService);
  private readonly authService = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  roles: Role[] = [];
  permissionsByModule: Record<string, PermissionAssignment[]> = {};
  selectedPermissionIds = new Set<number>();
  savedPermissionIds = new Set<number>();
  loading = false;
  saving = false;
  query = '';

  form = this.fb.group({ roleId: [null as number | null] });

  ngOnInit(): void {
    this.roleService.getAll().subscribe({
      next: roles => {
        this.roles = roles.filter(r => r.id != null);
        // Open the page with the first role selected so it never looks empty.
        if (this.roles.length && !this.form.controls.roleId.value) {
          this.form.controls.roleId.setValue(this.roles[0].id!);
        }
      },
      error: e => this.toast.fromError(e)
    });
    this.form.controls.roleId.valueChanges.subscribe(roleId => {
      if (roleId) this.loadRolePermissions(roleId);
    });
  }

  @HostListener('window:beforeunload', ['$event'])
  warnBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.isDirty) event.preventDefault();
  }

  get selectedRole(): Role | undefined {
    return this.roles.find(r => r.id === this.form.controls.roleId.value);
  }

  get moduleKeys(): string[] {
    return Object.keys(this.permissionsByModule);
  }

  get visibleModules(): string[] {
    if (!this.query) return this.moduleKeys;
    return this.moduleKeys.filter(m => this.visiblePermissions(m).length > 0);
  }

  get totalCount(): number {
    return Object.values(this.permissionsByModule).reduce((n, list) => n + list.length, 0);
  }

  get grantedCount(): number {
    return this.selectedPermissionIds.size;
  }

  get grantedPercent(): number {
    return this.totalCount ? Math.round((this.grantedCount / this.totalCount) * 100) : 0;
  }

  get isDirty(): boolean {
    if (this.selectedPermissionIds.size !== this.savedPermissionIds.size) return true;
    for (const id of this.selectedPermissionIds) if (!this.savedPermissionIds.has(id)) return true;
    return false;
  }

  get changesCount(): number {
    let n = 0;
    for (const id of this.selectedPermissionIds) if (!this.savedPermissionIds.has(id)) n++;
    for (const id of this.savedPermissionIds) if (!this.selectedPermissionIds.has(id)) n++;
    return n;
  }

  moduleIcon(module: string): string {
    return MODULE_ICONS[module] ?? 'folder';
  }

  visiblePermissions(module: string): PermissionAssignment[] {
    const list = this.permissionsByModule[module] ?? [];
    if (!this.query) return list;
    const q = this.query.toLowerCase();
    return list.filter(p => p.permissionName.toLowerCase().includes(q) || p.permissionKey.toLowerCase().includes(q));
  }

  moduleGranted(module: string): number {
    return (this.permissionsByModule[module] ?? []).filter(p => this.selectedPermissionIds.has(p.permissionId)).length;
  }

  onSearch(query: string): void {
    this.query = query;
  }

  onRoleChange(roleId: number): void {
    if (!this.isDirty) {
      this.form.controls.roleId.setValue(roleId);
      return;
    }
    this.confirm.open({
      title: 'تغييرات غير محفوظة',
      message: 'لديك تغييرات لم تُحفظ لهذا الدور. هل تريد تجاهلها والانتقال إلى دور آخر؟',
      confirmText: 'تجاهل التغييرات',
      cancelText: 'البقاء',
      danger: true,
      icon: 'warning'
    }).subscribe(ok => {
      if (ok) this.form.controls.roleId.setValue(roleId);
    });
  }

  loadRolePermissions(roleId: number): void {
    this.loading = true;
    this.rolePermissionService.getByRole(roleId).subscribe({
      next: (data) => {
        this.permissionsByModule = data.permissionsByModule;
        this.selectedPermissionIds = new Set();
        Object.values(data.permissionsByModule).flat().forEach(p => {
          if (p.granted) this.selectedPermissionIds.add(p.permissionId);
        });
        this.savedPermissionIds = new Set(this.selectedPermissionIds);
        this.loading = false;
      },
      error: (e) => { this.loading = false; this.toast.fromError(e); }
    });
  }

  isChecked(permissionId: number): boolean {
    return this.selectedPermissionIds.has(permissionId);
  }

  isChanged(permissionId: number): boolean {
    return this.selectedPermissionIds.has(permissionId) !== this.savedPermissionIds.has(permissionId);
  }

  togglePermission(permissionId: number, checked: boolean): void {
    if (checked) this.selectedPermissionIds.add(permissionId);
    else this.selectedPermissionIds.delete(permissionId);
  }

  toggleModule(modulePermissions: PermissionAssignment[], checked: boolean): void {
    modulePermissions.forEach(p => {
      if (checked) this.selectedPermissionIds.add(p.permissionId);
      else this.selectedPermissionIds.delete(p.permissionId);
    });
  }

  isModuleFullyChecked(modulePermissions: PermissionAssignment[]): boolean {
    return modulePermissions.length > 0 && modulePermissions.every(p => this.selectedPermissionIds.has(p.permissionId));
  }

  isModuleIndeterminate(modulePermissions: PermissionAssignment[]): boolean {
    const checked = modulePermissions.filter(p => this.selectedPermissionIds.has(p.permissionId)).length;
    return checked > 0 && checked < modulePermissions.length;
  }

  selectAll(): void {
    Object.values(this.permissionsByModule).flat().forEach(p => this.selectedPermissionIds.add(p.permissionId));
  }

  clearAll(): void {
    this.selectedPermissionIds.clear();
  }

  discard(): void {
    this.selectedPermissionIds = new Set(this.savedPermissionIds);
  }

  save(): void {
    const roleId = this.form.controls.roleId.value;
    if (!roleId || !this.isDirty) return;

    this.saving = true;
    this.rolePermissionService.save(roleId, Array.from(this.selectedPermissionIds)).subscribe({
      next: () => {
        this.saving = false;
        this.savedPermissionIds = new Set(this.selectedPermissionIds);
        this.toast.success(`تم حفظ صلاحيات «${this.selectedRole?.roleName ?? ''}»`);
        this.authService.refreshCurrentUser().subscribe();
      },
      error: (err) => { this.saving = false; this.toast.fromError(err); }
    });
  }
}
