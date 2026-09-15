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
  host: { class: 'block' },
  template: `
    <mat-form-field appearance="outline" class="search-field w-full min-w-[220px] max-sm:min-w-0" subscriptSizing="dynamic">
      <app-ui-icon name="search" matPrefix class="px-1.5 text-faint"></app-ui-icon>
      <input matInput [formControl]="control" [placeholder]="placeholder" type="search" autocomplete="off" [attr.aria-label]="placeholder">
      @if (control.value) {
        <button mat-icon-button matSuffix type="button" (click)="clear()" aria-label="مسح البحث">
          <app-ui-icon name="close"></app-ui-icon>
        </button>
      }
    </mat-form-field>
  `
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
