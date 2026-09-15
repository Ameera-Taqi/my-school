import { AfterViewInit, Component, OnInit, ViewChild, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { SearchFieldComponent } from '../../../shared/components/search-field/search-field.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { TableSkeletonComponent } from '../../../shared/components/table-skeleton/table-skeleton.component';
import { ToastService } from '../../../shared/services/toast.service';
import { TeacherPortalMockService } from '../../services/teacher-portal-mock.service';
import { AcademicLookupService } from '../../../core/services/academic-lookup.service';
import { TeacherMyStudent } from '../../../core/models';
import { switchMap } from 'rxjs';

function normalizeArabic(text: string): string {
  return text
    .toLowerCase()
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .trim();
}

@Component({
  selector: 'app-my-students-page',
  standalone: true,
  imports: [
    MatTableModule, MatPaginatorModule, MatSortModule, PageHeaderComponent, SearchFieldComponent,
    EmptyStateComponent, TableSkeletonComponent
  ],
  templateUrl: './my-students-page.component.html'
})
export class MyStudentsPageComponent implements OnInit, AfterViewInit {
  private readonly service = inject(TeacherPortalMockService);
  private readonly lookup = inject(AcademicLookupService);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);

  // Setter form: the table lives inside @if blocks, so attach the moment Angular creates the paginator.
  @ViewChild(MatPaginator) set paginatorRef(p: MatPaginator | undefined) { this.paginator = p; this.attachTableControls(); }
  paginator?: MatPaginator;
  @ViewChild(MatSort) set sortRef(s: MatSort | undefined) { this.sort = s; this.attachTableControls(); }
  sort?: MatSort;

  readonly dataSource = new MatTableDataSource<TeacherMyStudent>([]);
  loading = true;
  query = '';
  selectedClassName: string | null = null;
  cols = ['fullName', 'className', 'stageName', 'guardianPhone', 'status'];

  get total(): number { return this.dataSource.data.length; }
  get filteredCount(): number { return this.dataSource.filteredData.length; }

  ngOnInit(): void {
    this.dataSource.filterPredicate = (s, filter) =>
      normalizeArabic([s.fullName, s.className, s.stageName, s.guardianPhone ?? ''].join(' ')).includes(filter);

    this.selectedClassName = this.route.snapshot.queryParamMap.get('class');
    const load$ = this.selectedClassName
      ? this.lookup.findClassByName(this.selectedClassName).pipe(
          switchMap(schoolClass => schoolClass?.id
            ? this.service.getMyStudentsByClassId(schoolClass.id)
            : this.service.getMyStudents())
        )
      : this.service.getMyStudents();

    load$.subscribe({
      next: (data) => {
        this.dataSource.data = data;
        this.loading = false;
        setTimeout(() => this.attachTableControls());
      },
      error: (e) => { this.loading = false; this.toast.fromError(e); }
    });
  }

  ngAfterViewInit(): void { this.attachTableControls(); }

  onSearch(query: string): void {
    this.query = query;
    this.dataSource.filter = normalizeArabic(query);
    this.paginator?.firstPage();
  }

  private attachTableControls(): void {
    if (this.paginator && this.dataSource.paginator !== this.paginator) this.dataSource.paginator = this.paginator;
    if (this.sort && this.dataSource.sort !== this.sort) this.dataSource.sort = this.sort;
  }
}
