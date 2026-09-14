import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AcademicStage } from '../../core/models';

@Injectable({ providedIn: 'root' })
export class AcademicStageApiService {
  private readonly baseUrl = `${environment.apiUrl}/academic-stages`;

  constructor(private readonly http: HttpClient) {}

  getAll(): Observable<AcademicStage[]> {
    return this.http.get<AcademicStage[]>(this.baseUrl);
  }

  getById(id: number): Observable<AcademicStage> {
    return this.http.get<AcademicStage>(`${this.baseUrl}/${id}`);
  }
}
