export interface Role {
  id?: number;
  roleKey: string;
  roleName: string;
  description?: string;
  active?: boolean;
}

export interface Permission {
  id?: number;
  permissionKey: string;
  permissionName: string;
  moduleName: string;
  description?: string;
  active?: boolean;
}

export interface PermissionAssignment {
  permissionId: number;
  permissionKey: string;
  permissionName: string;
  moduleName: string;
  granted: boolean;
}

export interface RolePermission {
  roleId: number;
  roleName: string;
  permissionsByModule: Record<string, PermissionAssignment[]>;
}

export interface User {
  id?: number;
  username: string;
  fullName: string;
  email?: string;
  phone?: string;
  active?: boolean;
  roleIds?: number[];
  roleNames?: string[];
  permissions?: string[];
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token?: string;
  userId: number;
  username: string;
  fullName: string;
  roles: string[];
  roleNames?: string[];
  permissions: string[];
  departmentId?: number;
  departmentName?: string;
  departmentCode?: string;
  departmentSubjects?: string[];
  /** linked teacher profile id, when the account belongs to a teacher */
  teacherId?: number | null;
}

export interface Student {
  id?: number;
  civilId: string;
  fullName: string;
  birthDate?: string;
  gender?: string;
  guardianPhone?: string;
  status?: string;
  notes?: string;
  classId?: number;
  className?: string;
  academicStageId?: number;
  academicStageName?: string;
}

export interface StudentImportItem {
  row: number;
  civilId: string;
  fullName: string;
  birthDate?: string;
  gender?: string;
  guardianPhone?: string;
  status?: string;
  notes?: string;
}

export interface StudentImportError {
  row: number;
  civilId?: string;
  message: string;
}

export interface StudentImportResult {
  created: number;
  failed: number;
  errors: StudentImportError[];
}

export interface AcademicStage {
  id?: number;
  name: string;
  code: string;
  description?: string;
  classCount?: number;
  studentCount?: number;
}

export interface SchoolClass {
  id?: number;
  name: string;
  capacity: number;
  notes?: string;
  academicStageId?: number;
  academicStageName?: string;
  studentCount?: number;
}

export interface Teacher {
  id?: number;
  employeeNumber: string;
  fullName: string;
  email?: string;
  phone?: string;
  specialization?: string;
  hireDate?: string;
  departmentId?: number;
  departmentName?: string;
  active?: boolean;
  departmentHead?: boolean;
  /** teacher also holds the WING_SUPERVISOR role */
  wingSupervisor?: boolean;
  roleKey?: string;
  roleName?: string;
  username?: string;
}

export interface Department {
  id?: number;
  code: string;
  name: string;
  description?: string;
  active?: boolean;
  teacherCount?: number;
  /** Computed by the API from roles, same rule as the org chart. */
  headName?: string | null;
  /** Distinct subjects taught by the department's teachers. */
  subjects?: string[];
}

export interface SidebarItem {
  labelKey: string;
  icon: string;
  route: string;
  permission: string | string[];
}

export interface SidebarSection {
  titleKey: string;
  items: SidebarItem[];
}

export * from './extended.models';
