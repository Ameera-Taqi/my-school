import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { StudentImportError } from '../core/models';
import { UiIconComponent } from '../shared/icons/ui-icon.component';

export interface StudentImportResultDialogData {
  created: number;
  errors: StudentImportError[];
}

@Component({
  selector: 'app-student-import-result-dialog',
  standalone: true,
  imports: [UiIconComponent, MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>نتيجة استيراد الطلاب</h2>
    <mat-dialog-content class="max-h-[70vh]">
      <p class="m-0 mb-3 leading-relaxed text-muted">
        @if (data.created > 0) {
          تم إضافة {{ data.created }} طالب.
        }
        @if (data.errors.length) {
          تعذر استيراد {{ data.errors.length }} صف.
        }
      </p>
      @if (data.errors.length) {
        <div class="max-h-[42vh] overflow-auto rounded-sp border border-border">
          <table class="w-full border-collapse text-sm">
            <thead class="sticky top-0 bg-app-bg">
              <tr>
                <th class="px-3 py-2 text-start font-semibold">الصف</th>
                <th class="px-3 py-2 text-start font-semibold">الرقم المدني</th>
                <th class="px-3 py-2 text-start font-semibold">السبب</th>
              </tr>
            </thead>
            <tbody>
              @for (error of data.errors; track error.row + error.message) {
                <tr class="border-t border-border">
                  <td class="px-3 py-2 [font-variant-numeric:tabular-nums]">{{ error.row }}</td>
                  <td class="px-3 py-2" dir="ltr">{{ error.civilId || '—' }}</td>
                  <td class="px-3 py-2 text-danger">{{ error.message }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-flat-button color="primary" type="button" (click)="ref.close()">
        <app-ui-icon name="check"></app-ui-icon>
        حسناً
      </button>
    </mat-dialog-actions>
  `
})
export class StudentImportResultDialogComponent {
  readonly data: StudentImportResultDialogData = inject(MAT_DIALOG_DATA);
  readonly ref = inject(MatDialogRef<StudentImportResultDialogComponent>);
}
