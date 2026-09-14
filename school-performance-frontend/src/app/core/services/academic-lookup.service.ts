import { Injectable, inject } from '@angular/core';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, map, shareReplay, switchMap, tap } from 'rxjs/operators';
import { AcademicStageApiService } from '../../academic-stages/services/academic-stage-api.service';
import { SchoolClassApiService } from '../../school-classes/services/school-class-api.service';
import { StudentApiService } from '../../students/services/student-api.service';
import { DepartmentApiService } from '../../departments/services/department-api.service';
import { TeacherApiService } from '../../teachers/services/teacher-api.service';
import { AcademicStage, SchoolClass, Student, Teacher } from '../models';

@Injectable({ providedIn: 'root' })
export class AcademicLookupService {
  private readonly stageApi = inject(AcademicStageApiService);
  private readonly classApi = inject(SchoolClassApiService);
  private readonly studentApi = inject(StudentApiService);
  private readonly departmentApi = inject(DepartmentApiService);
  private readonly teacherApi = inject(TeacherApiService);

  private stagesCache$?: Observable<AcademicStage[]>;
  private classesCache$?: Observable<SchoolClass[]>;
  private teachersCache$?: Observable<Teacher[]>;
  private studentsCache$?: Observable<Student[]>;

  invalidate(): void {
    this.stagesCache$ = undefined;
    this.classesCache$ = undefined;
    this.teachersCache$ = undefined;
    this.studentsCache$ = undefined;
  }

  getStages(): Observable<AcademicStage[]> {
    if (!this.stagesCache$) {
      this.stagesCache$ = this.stageApi.getAll().pipe(
        catchError(() => of([] as AcademicStage[])),
        shareReplay(1)
      );
    }
    return this.stagesCache$;
  }

  getStageNames(): Observable<string[]> {
    return this.getStages().pipe(map(stages => stages.map(s => s.name)));
  }

  findStageByName(stageName: string): Observable<AcademicStage | undefined> {
    return this.getStages().pipe(map(stages => stages.find(s => s.name === stageName)));
  }

  getAllClasses(): Observable<SchoolClass[]> {
    if (!this.classesCache$) {
      this.classesCache$ = this.getStages().pipe(
        switchMap(stages => {
          if (!stages.length) return of([] as SchoolClass[]);
          return forkJoin(
            stages.map(stage =>
              this.classApi.getByStage(stage.id!).pipe(
                catchError(() => of([] as SchoolClass[]))
              )
            )
          ).pipe(map(groups => groups.flat()));
        }),
        shareReplay(1)
      );
    }
    return this.classesCache$;
  }

  getClassNames(): Observable<string[]> {
    return this.getAllClasses().pipe(map(classes => classes.map(c => c.name)));
  }

  getClassNamesByStageName(stageName?: string): Observable<string[]> {
    return this.getAllClasses().pipe(
      map(classes => {
        const filtered = stageName
          ? classes.filter(c => c.academicStageName === stageName)
          : classes;
        return filtered.map(c => c.name);
      })
    );
  }

  findClassByName(className: string): Observable<SchoolClass | undefined> {
    return this.getAllClasses().pipe(map(classes => classes.find(c => c.name === className)));
  }

  getStudentsByClassId(classId: number): Observable<Student[]> {
    return this.studentApi.getByClass(classId).pipe(catchError(() => of([] as Student[])));
  }

  getAllStudents(): Observable<Student[]> {
    if (!this.studentsCache$) {
      this.studentsCache$ = this.getAllClasses().pipe(
        switchMap(classes => {
          if (!classes.length) return of([] as Student[]);
          return forkJoin(
            classes.map(c =>
              this.studentApi.getByClass(c.id!).pipe(catchError(() => of([] as Student[])))
            )
          ).pipe(map(groups => groups.flat()));
        }),
        shareReplay(1)
      );
    }
    return this.studentsCache$;
  }

  getAllTeachers(): Observable<Teacher[]> {
    if (!this.teachersCache$) {
      this.teachersCache$ = this.departmentApi.getAll().pipe(
        switchMap(departments => {
          if (!departments.length) return of([] as Teacher[]);
          return forkJoin(
            departments.map(d =>
              this.teacherApi.getByDepartment(d.id!).pipe(catchError(() => of([] as Teacher[])))
            )
          ).pipe(map(groups => groups.flat()));
        }),
        shareReplay(1)
      );
    }
    return this.teachersCache$;
  }

  getTeacherNames(): Observable<string[]> {
    return this.getAllTeachers().pipe(map(teachers => teachers.map(t => t.fullName)));
  }

  /** Refresh caches after mutating classes/students/teachers. */
  refreshAfterMutation(): Observable<void> {
    this.invalidate();
    return forkJoin([
      this.getStages(),
      this.getAllClasses(),
      this.getAllStudents(),
      this.getAllTeachers()
    ]).pipe(
      map(() => void 0),
      tap(() => void 0)
    );
  }
}
