import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ProjectService } from '../../core/project.service';
import { TaskService } from '../../core/task.service';
import { Project } from '../../core/models/project.models';
import { Task, TaskStatus } from '../../core/models/task.models';

@Component({
  selector: 'app-project-detail',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './project-detail.component.html',
  styleUrl: './project-detail.component.css',
})
export class ProjectDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private projectService = inject(ProjectService);
  private taskService = inject(TaskService);
  private fb = inject(FormBuilder);

  projectId = '';
  project: Project | null = null;
  tasks: Task[] = [];
  loading = true;
  errorMessage: string | null = null;
  creating = false;

  statuses: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'DONE'];

  form = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(255)]],
    description: [''],
    assigneeEmail: ['', [Validators.email]],
  });

  ngOnInit(): void {
    this.projectId = this.route.snapshot.paramMap.get('id') ?? '';
    this.load();
  }

  load(): void {
    this.loading = true;
    this.projectService.get(this.projectId).subscribe({
      next: (project) => {
        this.project = project;
        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = err.error?.message ?? 'Failed to load project.';
        this.loading = false;
      },
    });

    this.taskService.listByProject(this.projectId).subscribe({
      next: (tasks) => (this.tasks = tasks),
      error: (err) => {
        this.errorMessage = err.error?.message ?? 'Failed to load tasks.';
      },
    });
  }

  createTask(): void {
    if (this.form.invalid) {
      return;
    }

    this.creating = true;
    const raw = this.form.getRawValue();

    this.taskService
      .create({
        projectId: this.projectId,
        title: raw.title as string,
        description: raw.description || undefined,
        assigneeEmail: raw.assigneeEmail || undefined,
      })
      .subscribe({
        next: (task) => {
          this.tasks = [task, ...this.tasks];
          this.form.reset();
          this.creating = false;
        },
        error: (err) => {
          this.errorMessage = err.error?.message ?? 'Failed to create task.';
          this.creating = false;
        },
      });
  }

  updateStatus(task: Task, status: TaskStatus): void {
    this.taskService
      .update(task.id, {
        title: task.title,
        description: task.description ?? undefined,
        status,
        assigneeEmail: task.assigneeEmail ?? undefined,
      })
      .subscribe({
        next: (updated) => {
          this.tasks = this.tasks.map((t) => (t.id === updated.id ? updated : t));
        },
        error: (err) => {
          this.errorMessage = err.error?.message ?? 'Failed to update task.';
        },
      });
  }

  deleteTask(id: string): void {
    this.taskService.delete(id).subscribe({
      next: () => {
        this.tasks = this.tasks.filter((t) => t.id !== id);
      },
      error: (err) => {
        this.errorMessage = err.error?.message ?? 'Failed to delete task.';
      },
    });
  }
}
