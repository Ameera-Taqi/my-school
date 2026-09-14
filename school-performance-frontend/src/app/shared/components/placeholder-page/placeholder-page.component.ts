import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { PageHeaderComponent } from '../page-header/page-header.component';

@Component({
  selector: 'app-placeholder-page',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, PageHeaderComponent],
  template: `
    <app-page-header [title]="title" [subtitle]="subtitle"></app-page-header>
    <mat-card class="placeholder-card">
      <mat-icon>construction</mat-icon>
      <h3>قيد التطوير</h3>
      <p>هذه الصفحة جاهزة للتوسع. يمكنك إضافة المحتوى والوظائف لاحقاً.</p>
    </mat-card>
  `,
  styles: [`
    .placeholder-card {
      text-align: center;
      padding: 3rem;
      color: #666;
    }
    mat-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      color: #bdbdbd;
      margin-bottom: 1rem;
    }
    h3 { margin: 0 0 0.5rem; color: #333; }
    p { margin: 0; }
  `]
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
