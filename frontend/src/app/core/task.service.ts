import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { CreateTaskRequest, Task, UpdateTaskRequest } from './models/task.models';

@Injectable({ providedIn: 'root' })
export class TaskService {
  private readonly base = `${environment.apiBaseUrl}/tasks`;

  constructor(private http: HttpClient) {}

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
