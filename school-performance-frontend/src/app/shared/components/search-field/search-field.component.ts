import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { UiIconComponent } from '../../icons/ui-icon.component';

/** Debounced search box with a clear button. Emits the trimmed query. */
@Component({
  selector: 'app-search-field',
  standalone: true,
  imports: [UiIconComponent, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <mat-form-field appearance="outline" class="search-field" subscriptSizing="dynamic">
      <app-ui-icon name="search" matPrefix></app-ui-icon>
      <input matInput [formControl]="control" [placeholder]="placeholder" type="search" autocomplete="off" [attr.aria-label]="placeholder">
      @if (control.value) {
        <button mat-icon-button matSuffix type="button" (click)="clear()" aria-label="مسح البحث">
          <app-ui-icon name="close"></app-ui-icon>
        </button>
      }
    </mat-form-field>
  `,
  styles: [`
    :host { display: block; }
    .search-field { width: 100%; min-width: 220px; }
    .search-field ::ng-deep .mat-mdc-text-field-wrapper { height: 42px; }
    .search-field ::ng-deep .mat-mdc-form-field-flex { height: 42px; align-items: center; }
    .search-field ::ng-deep .mat-mdc-form-field-infix { padding-top: 8px !important; padding-bottom: 8px !important; min-height: 0; }
    .search-field ::ng-deep .mat-mdc-form-field-icon-prefix .app-ui-icon { color: var(--sp-text-faint); padding: 0 6px; }
    @media (max-width: 599px) { .search-field { min-width: 0; } }
  `]
})
export class SearchFieldComponent implements OnInit, OnDestroy {
  @Input() placeholder = 'بحث...';
  @Input() debounce = 250;
  @Output() readonly search = new EventEmitter<string>();

  readonly control = new FormControl('', { nonNullable: true });
  private readonly destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.control.valueChanges.pipe(
      debounceTime(this.debounce),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(value => this.search.emit(value.trim()));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  clear(): void {
    this.control.setValue('');
  }
}
