import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { TableSkeletonComponent } from '../../shared/components/table-skeleton/table-skeleton.component';
import { AppDatePipe } from '../../shared/pipes/app-date.pipe';
import { ToastService } from '../../shared/services/toast.service';
import { UiIconComponent } from '../../shared/icons/ui-icon.component';
import {
  KpiCategory,
  KpiIndicator,
  KpiMockService,
  KpiOverview,
  KpiStatus,
  KpiTrend
} from '../services/kpi-mock.service';

@Component({
  selector: 'app-kpi-page',
  standalone: true,
  imports: [UiIconComponent, ReactiveFormsModule, MatCardModule, MatButtonModule, MatFormFieldModule, MatSelectModule, MatTableModule, MatProgressSpinnerModule, MatProgressBarModule, MatTooltipModule, PageHeaderComponent, EmptyStateComponent, TableSkeletonComponent, AppDatePipe],
  templateUrl: './kpi-page.component.html',
  styleUrl: './kpi-page.component.scss'
})
export class KpiPageComponent implements OnInit {
  private readonly kpiService = inject(KpiMockService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);

  loading = true;
  overview: KpiOverview | null = null;
  selectedCategory: KpiCategory | null = null;
  tableRows: KpiIndicator[] = [];
  tableCols = ['name', 'value', 'target', 'progress', 'trend', 'status'];

  filters = this.fb.group({
    period: ['term'],
    stage: ['']
  });

  readonly statusLabels: Record<KpiStatus, string> = {
    EXCELLENT: 'ممتاز',
    GOOD: 'جيد',
    WARNING: 'يحتاج متابعة',
    CRITICAL: 'حرج'
  };

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    const v = this.filters.getRawValue();
    this.kpiService.getOverview({
      period: v.period || undefined,
      stage: v.stage || undefined
    }).subscribe({
      next: (data) => {
        this.overview = data;
        this.selectedCategory = data.categories[0] ?? null;
        this.tableRows = data.categories.flatMap(c => c.indicators);
        this.loading = false;
      },
      error: (e) => { this.loading = false; this.toast.fromError(e); }
    });
  }

  resetFilters(): void {
    this.filters.reset({ period: 'term', stage: '' });
    this.load();
  }

  selectCategory(category: KpiCategory): void {
    this.selectedCategory = category;
  }

  progressPercent(indicator: KpiIndicator): number {
    if (indicator.target <= 0) return 0;
    const lowerIsBetter = indicator.id === 'remedial' || indicator.id === 'late-rate'
      || indicator.id === 'incidents' || indicator.id === 'warnings' || indicator.id === 'absence-days';
    if (lowerIsBetter) {
      return Math.min(100, Math.round((indicator.target / Math.max(indicator.value, 0.1)) * 100));
    }
    return Math.min(100, Math.round((indicator.value / indicator.target) * 100));
  }

  formatValue(indicator: KpiIndicator): string {
    return `${indicator.value}${indicator.unit === '%' ? '%' : ` ${indicator.unit}`}`;
  }

  trendIcon(trend: KpiTrend): string {
    if (trend === 'UP') return 'trending_up';
    if (trend === 'DOWN') return 'trending_down';
    return 'trending_flat';
  }

  trendLabel(indicator: KpiIndicator): string {
    if (indicator.trend === 'STABLE' || indicator.trendValue === 0) return 'ثابت';
    const sign = indicator.trend === 'UP' ? '+' : '-';
    return `${sign}${indicator.trendValue}${indicator.unit === '%' ? '%' : ''}`;
  }

  statusLabel(status: KpiStatus): string {
    return this.statusLabels[status];
  }

  statusChip(status: KpiStatus): 'success' | 'info' | 'warning' | 'danger' {
    switch (status) {
      case 'EXCELLENT': return 'success';
      case 'GOOD': return 'info';
      case 'WARNING': return 'warning';
      default: return 'danger';
    }
  }

  statusIcon(status: KpiStatus): string {
    switch (status) {
      case 'EXCELLENT': return 'verified';
      case 'GOOD': return 'thumb_up';
      case 'WARNING': return 'flag';
      default: return 'error';
    }
  }

  scoreColor(score: number): 'primary' | 'accent' | 'warn' {
    if (score >= 85) return 'primary';
    if (score >= 70) return 'accent';
    return 'warn';
  }
}
