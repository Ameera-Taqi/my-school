import { Component, Input } from '@angular/core';

/** Shimmering placeholder rows shown while a table loads. */
@Component({
  selector: 'app-table-skeleton',
  standalone: true,
  template: `
    <div class="skeleton-table" aria-busy="true" aria-live="polite">
      @if (header) {
        <div class="row header">
          @for (c of columnsArray; track $index) { <span class="skeleton cell" [style.width.%]="widths[$index % widths.length]"></span> }
        </div>
      }
      @for (r of rowsArray; track $index) {
        <div class="row">
          @for (c of columnsArray; track $index) { <span class="skeleton cell" [style.width.%]="widths[($index + r) % widths.length]"></span> }
        </div>
      }
    </div>
  `,
  styles: [`
    .skeleton-table { padding: 0.25rem 0; }
    .row { display: flex; gap: 1.25rem; padding: 0.9rem 1.25rem; border-bottom: 1px solid var(--sp-border); align-items: center; }
    .row:last-child { border-bottom: none; }
    .row.header { background: #f8f9fc; padding: 0.75rem 1.25rem; }
    .cell { height: 14px; flex: 1; max-width: 220px; }
    .header .cell { height: 12px; }
  `]
})
export class TableSkeletonComponent {
  @Input() rows = 5;
  @Input() columns = 5;
  @Input() header = true;
  readonly widths = [70, 45, 60, 35, 55, 40];

  get rowsArray(): number[] { return Array.from({ length: this.rows }, (_, i) => i); }
  get columnsArray(): number[] { return Array.from({ length: this.columns }, (_, i) => i); }
}
