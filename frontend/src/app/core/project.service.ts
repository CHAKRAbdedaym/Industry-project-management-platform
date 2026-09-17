import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { CreateProjectRequest, Project, UpdateProjectRequest } from './models/project.models';

@Injectable({ providedIn: 'root' })
export class ProjectService {
  private readonly base = `${environment.apiBaseUrl}/projects`;

  constructor(private http: HttpClient) {}

  list(): Observable<Project[]> {
    return this.http.get<Project[]>(this.base);
  }

  get(id: string): Observable<Project> {
    return this.http.get<Project>(`${this.base}/${id}`);
  }

  create(payload: CreateProjectRequest): Observable<Project> {
    return this.http.post<Project>(this.base, payload);
  }

  update(id: string, payload: UpdateProjectRequest): Observable<Project> {
    return this.http.put<Project>(`${this.base}/${id}`, payload);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
