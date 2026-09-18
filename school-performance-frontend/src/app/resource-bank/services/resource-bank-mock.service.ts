import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { ResourceFile } from '../../core/models';
import { DepartmentScopeService } from '../../core/services/department-scope.service';

let nextId = 5;
let MOCK: ResourceFile[] = [
  { id: 1, title: 'ملخص الوحدة الأولى', fileType: 'PDF', subject: 'رياضيات', stageName: 'العاشر', teacherName: 'أ. سالم', description: 'ملخص شامل للوحدة', uploadedAt: '2026-06-10' },
  { id: 2, title: 'عرض تقديمي - الخلية', fileType: 'PPTX', subject: 'أحياء', stageName: 'الحادي عشر', teacherName: 'أ. مريم', description: 'شرح الخلية النباتية', uploadedAt: '2026-06-12' }
];

@Injectable({ providedIn: 'root' })
export class ResourceBankMockService {
  private readonly departmentScope = inject(DepartmentScopeService);

  getAll(): Observable<ResourceFile[]> {
    return of(this.departmentScope.filterByDepartmentScope([...MOCK])).pipe(delay(200));
  }

  create(f: ResourceFile): Observable<ResourceFile> {
    const created = { ...f, id: ++nextId, uploadedAt: new Date().toISOString().slice(0, 10) };
    MOCK = [created, ...MOCK];
    return of(created).pipe(delay(200));
  }

  delete(id: number): Observable<void> {
    MOCK = MOCK.filter(x => x.id !== id);
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
      `المعلم: ${file.teacherName}`,
      file.description || ''
    ].filter(Boolean).join('\n');
  }
}
