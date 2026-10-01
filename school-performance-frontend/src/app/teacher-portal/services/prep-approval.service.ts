import { Injectable, inject } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import {
  LessonPrep,
  PrepApprovalAuthority,
  PrepApprovalEvent,
  PrepApprovalRequest,
  PrepApprovalStatus
} from '../../core/models';
import { createListStore } from '../../core/utils/mock-persistence';

const store = createListStore<PrepApprovalRequest>('demo_prep_approvals', [], 0);

const STATUS_LABEL: Record<PrepApprovalStatus, string> = {
  PENDING: 'بانتظار الاعتماد',
  APPROVED: 'معتمد',
  REJECTED: 'مرفوض',
  RETURNED: 'معاد للتعديل'
};

const AUTHORITY_LABEL: Record<PrepApprovalAuthority, string> = {
  DEPARTMENT: 'رئيس الشعبة',
  ADMINISTRATION: 'الإدارة المدرسية'
};

@Injectable({ providedIn: 'root' })
export class PrepApprovalService {
  private readonly auth = inject(AuthService);

  statusLabel(status: PrepApprovalStatus): string {
    return STATUS_LABEL[status];
  }

  authorityLabel(authority: PrepApprovalAuthority): string {
    return AUTHORITY_LABEL[authority];
  }

  forPrep(prepId: number): PrepApprovalRequest[] {
    return store.getItems().filter(item => item.prepId === prepId);
  }

  hasPending(prepId: number, authority: PrepApprovalAuthority): boolean {
    return this.forPrep(prepId).some(item => item.authority === authority && item.status === 'PENDING');
  }

  /** Latest request for each authority, newest first within that authority. */
  summary(prepId: number): string {
    const latest = new Map<PrepApprovalAuthority, PrepApprovalRequest>();
    for (const item of this.forPrep(prepId)) {
      const current = latest.get(item.authority);
      if (!current || item.submittedAt > current.submittedAt) latest.set(item.authority, item);
    }
    return [...latest.values()]
      .map(item => `${AUTHORITY_LABEL[item.authority]}: ${STATUS_LABEL[item.status]}`)
      .join(' · ');
  }

  list(): PrepApprovalRequest[] {
    return [...store.getItems()].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  }

  submit(prep: LessonPrep, authority: PrepApprovalAuthority, note: string): Observable<PrepApprovalRequest> {
    const user = this.auth.user();
    if (!prep.id || !prep.fileName) {
      return this.fail('لا يمكن إرسال تحضير بلا ملف.');
    }
    if (this.hasPending(prep.id, authority)) {
      return this.fail('يوجد طلب اعتماد قائم لهذه الجهة على التحضير نفسه.');
    }
    if (authority === 'DEPARTMENT' && user?.departmentId == null && !user?.departmentName) {
      return this.fail('لا توجد شعبة مرتبطة بحسابك، لذا لا يمكن الإرسال إلى رئيس الشعبة.');
    }
    const now = new Date().toISOString();
    const comment = note.trim();
    const event: PrepApprovalEvent = {
      action: 'SUBMITTED',
      actionLabel: 'أُرسل للاعتماد',
      userName: user?.fullName || prep.teacherName,
      roleLabel: 'المعلم',
      at: now,
      comment: comment || undefined
    };
    const created: PrepApprovalRequest = {
      id: store.nextId(),
      prepId: prep.id,
      authority,
      status: 'PENDING',
      teacherId: user?.teacherId ?? prep.teacherId ?? null,
      teacherName: user?.fullName || prep.teacherName,
      departmentId: user?.departmentId ?? null,
      departmentName: user?.departmentName || undefined,
      subject: prep.subject,
      stageName: prep.stageName,
      lessonNumber: prep.lessonNumber,
      title: prep.title,
      fileName: prep.fileName,
      note: comment || undefined,
      submittedAt: now,
      events: [event]
    };
    store.setItems([created, ...store.getItems()]);
    return of(created).pipe(delay(150));
  }

  decide(id: number, status: Exclude<PrepApprovalStatus, 'PENDING'>, comment: string): Observable<PrepApprovalRequest> {
    const current = store.getItems().find(item => item.id === id);
    if (!current) return this.fail('طلب الاعتماد غير موجود.');
    if (current.status !== 'PENDING') return this.fail('هذا الطلب لم يعد بانتظار الاعتماد.');
    const user = this.auth.user();
    const action = status === 'APPROVED' ? 'APPROVED' : status === 'REJECTED' ? 'REJECTED' : 'RETURNED';
    const actionLabel = status === 'APPROVED' ? 'تم الاعتماد' : status === 'REJECTED' ? 'تم الرفض' : 'أُعيد للتعديل';
    const updated: PrepApprovalRequest = {
      ...current,
      status,
      events: [
        ...current.events,
        {
          action,
          actionLabel,
          userName: user?.fullName || '',
          roleLabel: this.roleLabel(),
          at: new Date().toISOString(),
          comment: comment.trim() || undefined
        }
      ]
    };
    store.setItems(store.getItems().map(item => item.id === id ? updated : item));
    return of(updated).pipe(delay(150));
  }

  private roleLabel(): string {
    const roles = this.auth.user()?.roles ?? [];
    if (roles.some(role => role.startsWith('DEPARTMENT_HEAD'))) return 'رئيس الشعبة';
    if (roles.includes('SCHOOL_MANAGER')) return 'مدير المدرسة';
    if (roles.includes('ASSISTANT_MANAGER')) return 'وكيل المدرسة';
    if (roles.includes('ADMIN')) return 'مدير النظام';
    return 'مستخدم';
  }

  private fail(message: string): Observable<never> {
    return throwError(() => ({ error: { message } }));
  }
}
