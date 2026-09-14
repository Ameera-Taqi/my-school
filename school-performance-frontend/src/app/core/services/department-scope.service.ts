import { Injectable, computed, inject } from '@angular/core';
import { AuthService } from './auth.service';

const DEMO_SUBJECTS_BY_CODE: Record<string, string[]> = {
  MATH: ['رياضيات', 'إحصاء'],
  SCIENCE: ['أحياء', 'علوم'],
  ARABIC: ['لغة عربية'],
  ENGLISH: ['إنجليزي']
};

@Injectable({ providedIn: 'root' })
export class DepartmentScopeService {
  private readonly auth = inject(AuthService);

  readonly isScoped = computed(() => this.auth.user()?.departmentId != null);
  readonly departmentId = computed(() => this.auth.user()?.departmentId ?? null);
  readonly departmentName = computed(() => this.auth.user()?.departmentName ?? '');
  readonly departmentCode = computed(() => this.auth.user()?.departmentCode ?? null);

  readonly subjects = computed(() => {
    const fromApi = this.auth.user()?.departmentSubjects ?? [];
    const code = this.departmentCode();
    const fromDemo = code ? DEMO_SUBJECTS_BY_CODE[code] ?? [] : [];
    return [...new Set([...fromApi, ...fromDemo])];
  });

  filterByDepartmentScope<T extends { subject?: string; departmentName?: string }>(items: T[]): T[] {
    if (!this.isScoped()) {
      return items;
    }

    const subjects = this.subjects();
    const deptName = this.departmentName();

    return items.filter(item =>
      (item.departmentName != null && item.departmentName === deptName) ||
      (item.subject != null && subjects.includes(item.subject))
    );
  }
}
