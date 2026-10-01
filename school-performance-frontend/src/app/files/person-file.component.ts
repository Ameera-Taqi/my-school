import { Component, EventEmitter, Input, Output } from '@angular/core';
import { PageHeaderComponent } from '../shared/components/page-header/page-header.component';
import { SearchFieldComponent } from '../shared/components/search-field/search-field.component';
import { EmptyStateComponent } from '../shared/components/empty-state/empty-state.component';

export interface FilePerson {
  id: number;
  name: string;
  meta: string;
  photoUrl?: string | null;
}

export function formatFileDate(value?: string): string {
  if (!value) return '—';
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  const date = match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('ar-u-nu-latn', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

export interface FileField {
  label: string;
  value: string;
  ltr?: boolean;
  wide?: boolean;
}

@Component({
  selector: 'app-person-file',
  standalone: true,
  imports: [PageHeaderComponent, SearchFieldComponent, EmptyStateComponent],
  template: `
    <app-page-header [title]="title" [subtitle]="subtitle"></app-page-header>
    <ng-content select="[fileFilters]"></ng-content>

    <div class="file-layout">
      <section class="data-card file-list">
        <div class="file-list__head">
          <h2>{{ listTitle }}</h2>
          @if (!loading) {
            <span class="file-count">{{ items.length }}</span>
          }
        </div>
        @if (!hideSearch) {
          <app-search-field [placeholder]="searchPlaceholder" (search)="search.emit($event)"></app-search-field>
        }

        @if (loading) {
          <div class="file-list__scroll" aria-busy="true">
            @for (row of skeletonRows; track row) {
              <div class="file-row file-row--skeleton">
                <span class="skeleton file-avatar"></span>
                <span class="file-row__copy">
                  <span class="skeleton file-skel-line"></span>
                  <span class="skeleton file-skel-line file-skel-line--short"></span>
                </span>
              </div>
            }
          </div>
        } @else if (!items.length) {
          <app-empty-state
            class="block"
            [icon]="emptyListIcon"
            [title]="emptyListTitle"
            [description]="emptyListDescription"
            [compact]="true"
          ></app-empty-state>
        } @else {
          <ul class="file-list__scroll">
            @for (person of items; track person.id) {
              <li>
                <button
                  type="button"
                  class="file-row"
                  [class.is-selected]="person.id === selectedId"
                  [attr.aria-pressed]="person.id === selectedId"
                  (click)="pick.emit(person.id)"
                >
                  @if (person.photoUrl) {
                    <img class="file-avatar file-avatar--photo" [src]="person.photoUrl" alt="" aria-hidden="true">
                  } @else {
                    <span class="file-avatar" aria-hidden="true">{{ initials(person.name) }}</span>
                  }
                  <span class="file-row__copy">
                    <span class="file-row__name">{{ person.name }}</span>
                    <span class="file-row__meta">{{ person.meta }}</span>
                  </span>
                </button>
              </li>
            }
          </ul>
        }
      </section>

      <section class="data-card file-sheet">
        @if (loading) {
          <div class="file-sheet__hero" aria-busy="true">
            <span class="skeleton file-avatar file-avatar--lg"></span>
            <span class="file-sheet__identity">
              <span class="skeleton file-skel-line file-skel-line--title"></span>
              <span class="skeleton file-skel-line file-skel-line--short"></span>
            </span>
          </div>
          <div class="file-fields">
            @for (cell of skeletonFields; track cell) {
              <span class="skeleton file-field-skel"></span>
            }
          </div>
        } @else if (!personName) {
          <div class="file-sheet__fill">
            <app-empty-state
              [icon]="emptyFileIcon"
              [title]="emptyFileTitle"
              [description]="emptyFileDescription"
            ></app-empty-state>
          </div>
        } @else {
          <header class="file-sheet__hero">
            @if (photoUrl) {
              <img class="file-avatar file-avatar--lg file-avatar--photo" [src]="photoUrl" alt="" aria-hidden="true">
            } @else {
              <span class="file-avatar file-avatar--lg" aria-hidden="true">{{ initials(personName) }}</span>
            }
            <div class="file-sheet__identity">
              <h2>{{ personName }}</h2>
              <p>{{ personMeta }}</p>
            </div>
            @if (statusLabel) {
              <span class="file-status" [attr.data-tone]="statusTone">{{ statusLabel }}</span>
            }
          </header>
          @if (fields.length) {
            <dl class="file-fields">
              @for (field of fields; track field.label) {
                <div class="file-field" [class.file-field--wide]="field.wide">
                  <dt>{{ field.label }}</dt>
                  <dd [attr.dir]="field.ltr ? 'ltr' : null">{{ field.value || '—' }}</dd>
                </div>
              }
            </dl>
          }
          <ng-content select="[fileNotes]"></ng-content>
        }
      </section>
    </div>
  `,
  styles: [`
    .file-layout {
      display: grid;
      gap: 1rem;
      align-items: stretch;
    }
    @media (min-width: 1024px) {
      .file-layout {
        grid-template-columns: 340px minmax(0, 1fr);
        height: min(44rem, calc(100vh - 14.5rem));
        min-height: 34rem;
      }
    }
    .file-list,
    .file-sheet {
      display: flex;
      flex-direction: column;
      min-height: 34rem;
      height: 100%;
      padding: 1rem 1rem 1.1rem;
    }
    .file-sheet { overflow: auto; }
    .file-list__head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      margin-bottom: 0.85rem;
    }
    .file-list__head h2 {
      margin: 0;
      font-size: 1rem;
      font-weight: 800;
      color: var(--sp-text);
    }
    .file-count {
      min-width: 1.7rem;
      padding: 0.1rem 0.5rem;
      border-radius: 999px;
      background: var(--sp-primary-bg);
      color: var(--sp-primary);
      font-size: 0.78rem;
      font-weight: 800;
      text-align: center;
    }
    .file-list__scroll {
      display: flex;
      flex: 1;
      flex-direction: column;
      gap: 0.25rem;
      min-height: 0;
      margin: 0.85rem 0 0;
      padding: 0;
      list-style: none;
      overflow: auto;
    }
    .file-sheet__fill {
      display: flex;
      flex: 1;
      align-items: center;
      justify-content: center;
    }
    .file-row {
      display: flex;
      align-items: center;
      gap: 0.7rem;
      width: 100%;
      padding: 0.5rem 0.55rem;
      border: 1px solid transparent;
      border-radius: 0.85rem;
      background: transparent;
      color: inherit;
      font: inherit;
      text-align: start;
      cursor: pointer;
    }
    .file-row:hover { background: #f8fafc; }
    .file-row.is-selected {
      background: var(--sp-primary-bg);
      border-color: color-mix(in srgb, var(--sp-primary-mid) 32%, transparent);
    }
    .file-avatar {
      display: grid;
      place-items: center;
      width: 2.35rem;
      height: 2.35rem;
      flex-shrink: 0;
      overflow: hidden;
      border-radius: 0.75rem;
      background: var(--sp-primary-light);
      color: var(--sp-primary);
      font-size: 0.82rem;
      font-weight: 800;
    }
    .file-avatar--photo {
      display: block;
      object-fit: cover;
      padding: 0;
      color: transparent;
      background: #e2e8f0;
    }
    .file-row.is-selected .file-avatar:not(.file-avatar--photo),
    .file-avatar--lg:not(.file-avatar--photo) {
      background: var(--sp-primary);
      color: #fff;
    }
    .skeleton.file-avatar {
      background: #e2e8f0;
      color: transparent;
    }
    .file-avatar--lg {
      width: 3.4rem;
      height: 3.4rem;
      border-radius: 1rem;
      font-size: 1.1rem;
    }
    .file-row__copy {
      display: flex;
      min-width: 0;
      flex-direction: column;
      gap: 0.1rem;
    }
    .file-row__name {
      overflow: hidden;
      font-weight: 700;
      color: var(--sp-text);
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .file-row__meta {
      overflow: hidden;
      color: var(--sp-text-muted);
      font-size: 0.75rem;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .file-sheet__hero {
      display: flex;
      align-items: center;
      gap: 0.9rem;
      margin-bottom: 1rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid #f1f5f9;
    }
    .file-sheet__identity { min-width: 0; flex: 1; }
    .file-sheet__identity h2 {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 800;
      color: var(--sp-text);
    }
    .file-sheet__identity p {
      margin: 0.2rem 0 0;
      color: var(--sp-text-muted);
      font-size: 0.88rem;
    }
    .file-status {
      flex-shrink: 0;
      padding: 0.22rem 0.7rem;
      border-radius: 999px;
      background: var(--sp-primary-bg);
      color: var(--sp-primary);
      font-size: 0.78rem;
      font-weight: 800;
    }
    .file-status[data-tone="ok"] { background: var(--sp-success-bg); color: var(--sp-success); }
    .file-status[data-tone="warn"] { background: var(--sp-warning-bg); color: var(--sp-warning); }
    .file-status[data-tone="off"] { background: var(--sp-danger-bg); color: var(--sp-danger); }
    .file-fields {
      display: grid;
      flex: 0 0 auto;
      grid-template-columns: 1fr;
      grid-auto-rows: auto;
      align-content: start;
      gap: 0.7rem;
      margin: 0;
    }
    @media (min-width: 640px) {
      .file-fields { grid-template-columns: 1fr 1fr; }
    }
    .file-field {
      margin: 0;
      padding: 0.75rem 0.9rem;
      border: 1px solid #f1f5f9;
      border-radius: 0.85rem;
      background: #f8fafc;
    }
    .file-field--wide { grid-column: 1 / -1; }
    .file-field dt {
      color: var(--sp-text-muted);
      font-size: 0.75rem;
      font-weight: 700;
    }
    .file-field dd {
      margin: 0.2rem 0 0;
      color: var(--sp-text);
      font-weight: 700;
      overflow-wrap: anywhere;
    }
    .file-row--skeleton { cursor: default; }
    .file-skel-line { display: block; height: 0.7rem; width: 9rem; }
    .file-skel-line--short { width: 5.5rem; margin-top: 0.35rem; }
    .file-skel-line--title { width: 11rem; height: 1rem; }
    .file-field-skel { display: block; height: 4.1rem; border-radius: 0.85rem; }
  `]
})
export class PersonFileComponent {
  @Input() title = '';
  @Input() subtitle = '';
  @Input() listTitle = '';
  @Input() searchPlaceholder = '';
  @Input() hideSearch = false;
  @Input() loading = false;
  @Input() items: FilePerson[] = [];
  @Input() selectedId: number | null = null;
  @Input() personName = '';
  @Input() personMeta = '';
  @Input() photoUrl = '';
  @Input() statusLabel = '';
  @Input() statusTone: 'ok' | 'warn' | 'off' | '' = '';
  @Input() fields: FileField[] = [];
  @Input() emptyListIcon = 'search';
  @Input() emptyListTitle = 'لا توجد نتائج';
  @Input() emptyListDescription = '';
  @Input() emptyFileIcon = 'folder';
  @Input() emptyFileTitle = '';
  @Input() emptyFileDescription = '';

  @Output() readonly search = new EventEmitter<string>();
  @Output() readonly pick = new EventEmitter<number>();

  readonly skeletonRows = [1, 2, 3, 4, 5];
  readonly skeletonFields = [1, 2, 3, 4, 5, 6];

  initials(name: string): string {
    const parts = name.replace(/^أ\.\s*/, '').trim().split(/\s+/).filter(Boolean);
    if (parts.length > 1) return parts[0].charAt(0) + parts[1].charAt(0);
    return parts[0]?.charAt(0) ?? '؟';
  }
}
