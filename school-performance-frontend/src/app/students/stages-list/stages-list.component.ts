import { Component, OnInit, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ToastService } from '../../shared/services/toast.service';
import { AcademicStageApiService } from '../../academic-stages/services/academic-stage-api.service';
import { AcademicStage } from '../../core/models';
import { UiIconComponent } from '../../shared/icons/ui-icon.component';

@Component({
  selector: 'app-stages-list',
  standalone: true,
  imports: [UiIconComponent, RouterModule, MatCardModule, MatButtonModule, PageHeaderComponent, EmptyStateComponent],
  templateUrl: './stages-list.component.html'
})
export class StagesListComponent implements OnInit {
  private readonly stageService = inject(AcademicStageApiService);
  private readonly toast = inject(ToastService);

  readonly skeletonCards = [1, 2, 3];
  stages: AcademicStage[] = [];
  loading = true;

  ngOnInit(): void {
    this.stageService.getAll().subscribe({
      next: (data) => { this.stages = data; this.loading = false; },
      error: (e) => { this.loading = false; this.toast.fromError(e); }
    });
  }
}
