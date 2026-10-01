import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { CreateTaskRequest, Task, UpdateTaskRequest } from './models/task.models';

@Injectable({ providedIn: 'root' })
export class TaskService {
  private http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/tasks`;

  /** Every task the caller created or is assigned to, across all projects. */
  listVisible(): Observable<Task[]> {
    return this.http.get<Task[]>(this.base);
  }

  listByProject(projectId: string): Observable<Task[]> {
    const params = new HttpParams().set('projectId', projectId);
    return this.http.get<Task[]>(this.base, { params });
  }

  create(payload: CreateTaskRequest): Observable<Task> {
    return this.http.post<Task>(this.base, payload);
  }

  update(id: string, payload: UpdateTaskRequest): Observable<Task> {
    return this.http.put<Task>(`${this.base}/${id}`, payload);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
