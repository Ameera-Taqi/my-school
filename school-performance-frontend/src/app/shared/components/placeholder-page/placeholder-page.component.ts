import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { PageHeaderComponent } from '../page-header/page-header.component';
import { UiIconComponent } from '../../icons/ui-icon.component';

@Component({
  selector: 'app-placeholder-page',
  standalone: true,
  imports: [UiIconComponent, MatCardModule, PageHeaderComponent],
  template: `
    <app-page-header [title]="title" [subtitle]="subtitle"></app-page-header>
    <mat-card class="p-12 text-center text-muted">
      <app-ui-icon name="construction" class="mb-4 !size-16 !text-[64px] text-faint"></app-ui-icon>
      <h3 class="mb-2 mt-0 text-text">قيد التطوير</h3>
      <p class="m-0">هذه الصفحة جاهزة للتوسع. يمكنك إضافة المحتوى والوظائف لاحقاً.</p>
    </mat-card>
  `
})
export class PlaceholderPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);

  title = 'صفحة';
  subtitle = '';

  ngOnInit(): void {
    this.title = this.route.snapshot.data['title'] || 'صفحة';
    this.subtitle = this.route.snapshot.data['subtitle'] || '';
  }
}
