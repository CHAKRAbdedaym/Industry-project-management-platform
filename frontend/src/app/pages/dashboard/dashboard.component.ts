import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { errorMessage } from '../../core/http-error';
import { Notification } from '../../core/models/notification.models';
import { Project } from '../../core/models/project.models';
import { TASK_STATUSES, TASK_STATUS_LABELS, Task } from '../../core/models/task.models';
import { NotificationService } from '../../core/notification.service';
import { ProjectService } from '../../core/project.service';
import { TaskService } from '../../core/task.service';
import { IconComponent } from '../../shared/icon.component';
import { ProjectFormComponent } from '../../shared/project-form.component';
import { TimeAgoPipe } from '../../shared/time-ago.pipe';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, IconComponent, TimeAgoPipe, ProjectFormComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit {
  private auth = inject(AuthService);
  private projectService = inject(ProjectService);
  private taskService = inject(TaskService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);

  readonly labels = TASK_STATUS_LABELS;

  loading = signal(true);
  error = signal<string | null>(null);
  projects = signal<Project[]>([]);
  tasks = signal<Task[]>([]);
  notifications = signal<Notification[]>([]);
  creatingProject = signal(false);

  firstName = computed(() => this.auth.displayName().split(/[\s@]/)[0] || 'there');

  greeting = computed(() => {
    const hour = new Date().getHours();
    return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  });

  today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  private me = computed(() => this.auth.email());

  stats = computed(() => {
    const tasks = this.tasks();
    const done = tasks.filter((t) => t.status === 'DONE').length;
    return {
      activeProjects: this.projects().filter((p) => p.status === 'ACTIVE').length,
      totalProjects: this.projects().length,
      openTasks: tasks.length - done,
      inProgress: tasks.filter((t) => t.status === 'IN_PROGRESS').length,
      assignedToMe: tasks.filter((t) => t.assigneeEmail === this.me() && t.status !== 'DONE').length,
      completion: tasks.length ? Math.round((done / tasks.length) * 100) : 0,
      done,
      total: tasks.length,
    };
  });

  /** Segments for the status breakdown bar, in fixed workflow order. */
  breakdown = computed(() => {
    const tasks = this.tasks();
    return TASK_STATUSES.map((status) => {
      const count = tasks.filter((t) => t.status === status).length;
      return {
        status,
        label: TASK_STATUS_LABELS[status],
        count,
        percent: tasks.length ? Math.round((count / tasks.length) * 100) : 0,
      };
    });
  });

  projectProgress = computed(() => {
    const byProject = groupByProject(this.tasks());
    return this.projects()
      .filter((p) => p.status === 'ACTIVE')
      .map((project) => {
        const tasks = byProject.get(project.id) ?? [];
        const done = tasks.filter((t) => t.status === 'DONE').length;
        return { project, total: tasks.length, done, percent: tasks.length ? Math.round((done / tasks.length) * 100) : 0 };
      })
      .sort((a, b) => +new Date(b.project.updatedAt) - +new Date(a.project.updatedAt))
      .slice(0, 5);
  });

  myOpenTasks = computed(() =>
    this.tasks()
      .filter((t) => t.assigneeEmail === this.me() && t.status !== 'DONE')
      .sort((a, b) => (a.status === b.status ? +new Date(b.updatedAt) - +new Date(a.updatedAt) : a.status === 'IN_PROGRESS' ? -1 : 1))
      .slice(0, 6),
  );

  projectNames = computed(() => new Map(this.projects().map((p) => [p.id, p.name])));

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    forkJoin({
      projects: this.projectService.list(),
      tasks: this.taskService.listVisible(),
      notifications: this.notificationService.listMine(),
    }).subscribe({
      next: ({ projects, tasks, notifications }) => {
        this.projects.set(projects);
        this.tasks.set(tasks);
        this.notifications.set(notifications.slice(0, 5));
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(errorMessage(err, 'Could not load your dashboard.'));
        this.loading.set(false);
      },
    });
  }

  onProjectCreated(project: Project): void {
    this.creatingProject.set(false);
    this.router.navigate(['/projects', project.id]);
  }
}

function groupByProject(tasks: Task[]): Map<string, Task[]> {
  const map = new Map<string, Task[]>();
  for (const task of tasks) {
    map.set(task.projectId, [...(map.get(task.projectId) ?? []), task]);
  }
  return map;
}
