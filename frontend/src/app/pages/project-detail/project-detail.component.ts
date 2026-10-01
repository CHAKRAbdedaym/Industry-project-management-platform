import { CdkDrag, CdkDragDrop, CdkDragPlaceholder, CdkDropList, CdkDropListGroup } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { ConfirmService } from '../../core/confirm.service';
import { errorMessage } from '../../core/http-error';
import { PROJECT_STATUS_LABELS, Project } from '../../core/models/project.models';
import { TASK_STATUSES, TASK_STATUS_LABELS, Task, TaskStatus } from '../../core/models/task.models';
import { ProjectService } from '../../core/project.service';
import { TaskService } from '../../core/task.service';
import { ToastService } from '../../core/toast.service';
import { AvatarComponent } from '../../shared/avatar.component';
import { IconComponent } from '../../shared/icon.component';
import { ProjectFormComponent } from '../../shared/project-form.component';
import { TaskFormComponent } from '../../shared/task-form.component';
import { TimeAgoPipe } from '../../shared/time-ago.pipe';

type Scope = 'all' | 'assigned' | 'created';

@Component({
  selector: 'app-project-detail',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    CdkDropListGroup,
    CdkDropList,
    CdkDrag,
    CdkDragPlaceholder,
    IconComponent,
    AvatarComponent,
    TimeAgoPipe,
    TaskFormComponent,
    ProjectFormComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './project-detail.component.html',
  styleUrl: './project-detail.component.css',
})
export class ProjectDetailComponent implements OnInit {
  private projectService = inject(ProjectService);
  private taskService = inject(TaskService);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmService);
  private router = inject(Router);
  private title = inject(Title);
  private auth = inject(AuthService);

  /** Route param, bound via withComponentInputBinding. */
  id = input.required<string>();

  readonly statuses = TASK_STATUSES;
  readonly labels = TASK_STATUS_LABELS;
  readonly projectLabels = PROJECT_STATUS_LABELS;

  loading = signal(true);
  notFound = signal(false);
  error = signal<string | null>(null);
  project = signal<Project | null>(null);
  tasks = signal<Task[]>([]);

  search = signal('');
  scope = signal<Scope>('all');

  editingProject = signal(false);
  taskDialog = signal<{ task: Task | null; status: TaskStatus } | null>(null);

  private me = computed(() => this.auth.email());

  /** Set while a card is being dragged so the click fired on release doesn't open the dialog. */
  dragging = false;

  visibleTasks = computed(() => {
    const term = this.search().trim().toLowerCase();
    const scope = this.scope();
    const me = this.me();
    return this.tasks().filter(
      (t) =>
        (scope === 'all' || (scope === 'assigned' ? t.assigneeEmail === me : t.creatorEmail === me)) &&
        (!term ||
          t.title.toLowerCase().includes(term) ||
          t.description?.toLowerCase().includes(term) ||
          t.assigneeEmail?.toLowerCase().includes(term)),
    );
  });

  columns = computed(() => {
    const tasks = this.visibleTasks();
    return TASK_STATUSES.map((status) => ({
      status,
      label: TASK_STATUS_LABELS[status],
      tasks: tasks
        .filter((t) => t.status === status)
        .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)),
    }));
  });

  progress = computed(() => {
    const tasks = this.tasks();
    const done = tasks.filter((t) => t.status === 'DONE').length;
    return { total: tasks.length, done, percent: tasks.length ? Math.round((done / tasks.length) * 100) : 0 };
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    forkJoin({
      project: this.projectService.get(this.id()),
      tasks: this.taskService.listByProject(this.id()),
    }).subscribe({
      next: ({ project, tasks }) => {
        this.project.set(project);
        this.tasks.set(tasks);
        this.title.setTitle(`${project.name} · IndustryPM`);
        this.loading.set(false);
      },
      error: (err) => {
        if (err instanceof HttpErrorResponse && (err.status === 404 || err.status === 400)) {
          this.notFound.set(true);
        } else {
          this.error.set(errorMessage(err, 'Could not load this project.'));
        }
        this.loading.set(false);
      },
    });
  }

  drop(event: CdkDragDrop<TaskStatus, TaskStatus, Task>): void {
    const task = event.item.data;
    const status = event.container.data;
    if (event.previousContainer === event.container || task.status === status) {
      return;
    }

    // Optimistic move; roll back if task-service refuses.
    const previous = task;
    this.replace({ ...task, status, updatedAt: new Date().toISOString() });

    this.taskService
      .update(task.id, {
        title: task.title,
        description: task.description ?? undefined,
        assigneeEmail: task.assigneeEmail ?? undefined,
        status,
      })
      .subscribe({
        next: (updated) => this.replace(updated),
        error: (err) => {
          this.replace(previous);
          this.toast.error(errorMessage(err, 'Could not move the task.'));
        },
      });
  }

  openNewTask(status: TaskStatus = 'TODO'): void {
    this.taskDialog.set({ task: null, status });
  }

  onDragEnded(): void {
    setTimeout(() => (this.dragging = false));
  }

  openTask(task: Task): void {
    if (this.dragging) {
      return;
    }
    this.taskDialog.set({ task, status: task.status });
  }

  onTaskSaved(task: Task): void {
    this.taskDialog.set(null);
    if (this.tasks().some((t) => t.id === task.id)) {
      this.replace(task);
    } else {
      this.tasks.update((list) => [task, ...list]);
    }
  }

  onTaskDeleted(id: string): void {
    this.taskDialog.set(null);
    this.tasks.update((list) => list.filter((t) => t.id !== id));
  }

  onProjectSaved(project: Project): void {
    this.editingProject.set(false);
    this.project.set(project);
    this.title.setTitle(`${project.name} · IndustryPM`);
  }

  async deleteProject(): Promise<void> {
    const project = this.project();
    if (!project) {
      return;
    }
    const confirmed = await this.confirm.confirm({
      title: 'Delete project?',
      message: `“${project.name}” will be permanently deleted. This can't be undone.`,
      confirmLabel: 'Delete project',
      danger: true,
    });
    if (!confirmed) {
      return;
    }
    this.projectService.delete(project.id).subscribe({
      next: () => {
        this.toast.success('Project deleted');
        this.router.navigate(['/projects']);
      },
      error: (err) => this.toast.error(errorMessage(err, 'Could not delete the project.')),
    });
  }

  private replace(task: Task): void {
    this.tasks.update((list) => list.map((t) => (t.id === task.id ? task : t)));
  }
}
