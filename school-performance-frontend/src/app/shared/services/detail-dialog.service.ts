import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { DetailDialogComponent, DetailDialogData } from '../components/detail-dialog/detail-dialog.component';
import { LanguageService } from '../../core/services/language.service';

@Injectable({ providedIn: 'root' })
export class DetailDialogService {
  private readonly dialog = inject(MatDialog);
  private readonly lang = inject(LanguageService);

  open(data: DetailDialogData): void {
    this.dialog.open(DetailDialogComponent, {
      data,
      width: '480px',
      maxWidth: '95vw',
      direction: this.lang.direction(),
      autoFocus: false
    });
  }
}
