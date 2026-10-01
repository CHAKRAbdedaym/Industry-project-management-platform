import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { errorMessage } from '../../core/http-error';
import { TASK_STATUSES, TASK_STATUS_LABELS, Task, TaskStatus } from '../../core/models/task.models';
import { ProjectService } from '../../core/project.service';
import { TaskService } from '../../core/task.service';
import { ToastService } from '../../core/toast.service';
import { AvatarComponent } from '../../shared/avatar.component';
import { IconComponent } from '../../shared/icon.component';
import { TaskFormComponent } from '../../shared/task-form.component';
import { TimeAgoPipe } from '../../shared/time-ago.pipe';

type Tab = 'assigned' | 'created';

@Component({
  selector: 'app-my-tasks',
  standalone: true,
  imports: [FormsModule, RouterLink, IconComponent, AvatarComponent, TimeAgoPipe, TaskFormComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './my-tasks.component.html',
  styleUrl: './my-tasks.component.css',
})
export class MyTasksComponent implements OnInit {
  private taskService = inject(TaskService);
  private projectService = inject(ProjectService);
  private toast = inject(ToastService);
  private auth = inject(AuthService);

  readonly statuses = TASK_STATUSES;
  readonly labels = TASK_STATUS_LABELS;

  loading = signal(true);
  error = signal<string | null>(null);
  tasks = signal<Task[]>([]);
  projectNames = signal(new Map<string, string>());

  tab = signal<Tab>('assigned');
  search = signal('');
  hideDone = signal(false);
  selected = signal<Task | null>(null);

  private me = computed(() => this.auth.email());

  counts = computed(() => {
    const me = this.me();
    const tasks = this.tasks();
    return {
      assigned: tasks.filter((t) => t.assigneeEmail === me && t.status !== 'DONE').length,
      created: tasks.filter((t) => t.creatorEmail === me && t.status !== 'DONE').length,
    };
  });

  groups = computed(() => {
    const me = this.me();
    const term = this.search().trim().toLowerCase();
    const tasks = this.tasks().filter(
      (t) =>
        (this.tab() === 'assigned' ? t.assigneeEmail === me : t.creatorEmail === me) &&
        (!term || t.title.toLowerCase().includes(term) || this.projectName(t).toLowerCase().includes(term)),
    );
    return TASK_STATUSES.filter((s) => !(this.hideDone() && s === 'DONE')).map((status) => ({
      status,
      label: TASK_STATUS_LABELS[status],
      tasks: tasks.filter((t) => t.status === status).sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)),
    }));
  });

  isEmpty = computed(() => this.groups().every((g) => g.tasks.length === 0));

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    forkJoin({ tasks: this.taskService.listVisible(), projects: this.projectService.list() }).subscribe({
      next: ({ tasks, projects }) => {
        this.tasks.set(tasks);
        this.projectNames.set(new Map(projects.map((p) => [p.id, p.name])));
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(errorMessage(err, 'Could not load your tasks.'));
        this.loading.set(false);
      },
    });
  }

  projectName(task: Task): string {
    return this.projectNames().get(task.projectId) ?? 'Shared project';
  }

  ownsProject(task: Task): boolean {
    return this.projectNames().has(task.projectId);
  }

  changeStatus(task: Task, status: TaskStatus): void {
    const previous = task;
    this.replace({ ...task, status });
    this.taskService
      .update(task.id, {
        title: task.title,
        description: task.description ?? undefined,
        assigneeEmail: task.assigneeEmail ?? undefined,
        status,
      })
      .subscribe({
        next: (updated) => {
          this.replace(updated);
          this.toast.success(`Moved to ${TASK_STATUS_LABELS[status]}`);
        },
        error: (err) => {
          this.replace(previous);
          this.toast.error(errorMessage(err, 'Could not update the task.'));
        },
      });
  }

  onSaved(task: Task): void {
    this.selected.set(null);
    this.replace(task);
  }

  onDeleted(id: string): void {
    this.selected.set(null);
    this.tasks.update((list) => list.filter((t) => t.id !== id));
  }

  private replace(task: Task): void {
    this.tasks.update((list) => list.map((t) => (t.id === task.id ? task : t)));
  }
}
