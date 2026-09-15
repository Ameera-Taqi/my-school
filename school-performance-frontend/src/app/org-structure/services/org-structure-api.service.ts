import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface OrgPerson {
  id: number;
  fullName: string;
  username?: string;
  roleKey: string;
  roleName: string;
  email?: string;
  phone?: string;
  specialization?: string;
  employeeNumber?: string;
  active: boolean;
}

export interface OrgSubject {
  id: number;
  name: string;
  code?: string;
  color?: string;
  teachers: OrgPerson[];
}

export interface OrgDepartment {
  id: number;
  code: string;
  name: string;
  active: boolean;
  head?: OrgPerson | null;
  subjects: OrgSubject[];
  teachers: OrgPerson[];
}

export interface OrgAssistantBranch {
  person: OrgPerson;
  departments: OrgDepartment[];
}

export interface OrgStructure {
  managers: OrgPerson[];
  assistantBranches: OrgAssistantBranch[];
  assistantManagers: OrgPerson[];
  departments: OrgDepartment[];
  unassignedHeads: OrgPerson[];
  unassignedTeachers: OrgPerson[];
  totalPeople: number;
  generatedAt: string;
}

/** Live school hierarchy: principal → VPs → departments → subjects → teachers. */
@Injectable({ providedIn: 'root' })
export class OrgStructureApiService {
  private readonly http = inject(HttpClient);

  get(): Observable<OrgStructure> {
    return this.http.get<OrgStructure>(`${environment.apiUrl}/org-structure`);
  }
}
