import { Component, Input } from '@angular/core';

/** Shimmering placeholder rows shown while a table loads. */
@Component({
  selector: 'app-table-skeleton',
  standalone: true,
  template: `
    <div class="py-1" aria-busy="true" aria-live="polite">
      @if (header) {
        <div class="flex items-center gap-5 border-b border-border bg-[#f8f9fc] px-5 py-3">
          @for (c of columnsArray; track $index) {
            <span class="skeleton h-3 max-w-[220px] flex-1" [style.width.%]="widths[$index % widths.length]"></span>
          }
        </div>
      }
      @for (r of rowsArray; track $index) {
        <div class="flex items-center gap-5 border-b border-border px-5 py-[0.9rem] last:border-b-0">
          @for (c of columnsArray; track $index) {
            <span class="skeleton h-3.5 max-w-[220px] flex-1" [style.width.%]="widths[($index + r) % widths.length]"></span>
          }
        </div>
      }
    </div>
  `
})
export class TableSkeletonComponent {
  @Input() rows = 5;
  @Input() columns = 5;
  @Input() header = true;
  readonly widths = [70, 45, 60, 35, 55, 40];

  get rowsArray(): number[] { return Array.from({ length: this.rows }, (_, i) => i); }
  get columnsArray(): number[] { return Array.from({ length: this.columns }, (_, i) => i); }
}
