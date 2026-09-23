import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { ResourceFile } from '../../core/models';
import { DepartmentScopeService } from '../../core/services/department-scope.service';
import { createListStore } from '../../core/utils/mock-persistence';

const store = createListStore<ResourceFile>('demo_resource_bank', [
  { id: 1, title: 'ملخص الوحدة الأولى', fileType: 'PDF', subject: 'رياضيات', stageName: 'العاشر', teacherName: 'أ. سالم', description: 'ملخص شامل للوحدة', uploadedAt: '2026-06-10' },
  { id: 2, title: 'عرض تقديمي - الخلية', fileType: 'PPTX', subject: 'أحياء', stageName: 'الحادي عشر', teacherName: 'أ. مريم', description: 'شرح الخلية النباتية', uploadedAt: '2026-06-12' }
], 5);

@Injectable({ providedIn: 'root' })
export class ResourceBankMockService {
  private readonly departmentScope = inject(DepartmentScopeService);

  getAll(): Observable<ResourceFile[]> {
    return of(this.visibleToDepartment([...store.getItems()])).pipe(delay(200));
  }

  create(f: ResourceFile): Observable<ResourceFile> {
    const created: ResourceFile = {
      ...f,
      id: store.nextId(),
      uploadedAt: new Date().toISOString().slice(0, 10),
      departmentId: f.departmentId ?? this.departmentScope.departmentId() ?? undefined,
      departmentName: f.departmentName || this.departmentScope.departmentName() || undefined
    };
    store.setItems([created, ...store.getItems()]);
    return of(created).pipe(delay(200));
  }

  delete(id: number): Observable<void> {
    store.setItems(store.getItems().filter(x => x.id !== id));
    return of(void 0).pipe(delay(200));
  }

  download(file: ResourceFile): void {
    const extension = this.extensionFor(file);
    const name = file.fileName || `${file.title}.${extension}`;
    const blob = new Blob([this.placeholderContent(file)], { type: this.mimeFor(file.fileType) });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
    URL.revokeObjectURL(url);
  }

  /** Department heads and their teachers share the same files. Accounts without a department see every file. */
  private visibleToDepartment(items: ResourceFile[]): ResourceFile[] {
    const departmentId = this.departmentScope.departmentId();
    const departmentName = this.departmentScope.departmentName();
    if (departmentId == null && !departmentName) return items;

    const subjects = this.departmentScope.subjects();
    return items.filter(item =>
      (item.departmentId != null && item.departmentId === departmentId) ||
      (!!departmentName && item.departmentName === departmentName) ||
      (!item.departmentId && !item.departmentName && !!item.subject && subjects.includes(item.subject))
    );
  }

  private extensionFor(file: ResourceFile): string {
    const fromName = file.fileName?.split('.').pop()?.toLowerCase();
    if (fromName) return fromName;
    switch ((file.fileType || '').toUpperCase()) {
      case 'PPTX': return 'pptx';
      case 'DOCX': return 'docx';
      case 'VIDEO': return 'mp4';
      default: return 'pdf';
    }
  }

  private mimeFor(fileType: string): string {
    switch ((fileType || '').toUpperCase()) {
      case 'PPTX': return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
      case 'DOCX': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case 'VIDEO': return 'video/mp4';
      default: return 'application/pdf';
    }
  }

  private placeholderContent(file: ResourceFile): string {
    return [
      file.title,
      `المادة: ${file.subject}`,
      `المرحلة: ${file.stageName}`,
      file.departmentName ? `الشعبة: ${file.departmentName}` : '',
      file.description || ''
    ].filter(Boolean).join('\n');
  }
}
