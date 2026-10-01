import { ChangeDetectionStrategy, Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ConfirmService } from '../../core/confirm.service';
import { errorMessage } from '../../core/http-error';
import { PROJECT_STATUSES, PROJECT_STATUS_LABELS, Project, ProjectStatus } from '../../core/models/project.models';
import { Task } from '../../core/models/task.models';
import { ProjectService } from '../../core/project.service';
import { TaskService } from '../../core/task.service';
import { ToastService } from '../../core/toast.service';
import { IconComponent } from '../../shared/icon.component';
import { ProjectFormComponent } from '../../shared/project-form.component';
import { TimeAgoPipe } from '../../shared/time-ago.pipe';

type SortKey = 'updated' | 'name' | 'progress';

interface ProjectCard {
  project: Project;
  total: number;
  done: number;
  inProgress: number;
  percent: number;
}

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [FormsModule, RouterLink, IconComponent, TimeAgoPipe, ProjectFormComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './projects.component.html',
  styleUrl: './projects.component.css',
})
export class ProjectsComponent implements OnInit {
  private projectService = inject(ProjectService);
  private taskService = inject(TaskService);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmService);
  private router = inject(Router);

  readonly statuses = PROJECT_STATUSES;
  readonly labels = PROJECT_STATUS_LABELS;

  loading = signal(true);
  error = signal<string | null>(null);
  projects = signal<Project[]>([]);
  tasks = signal<Task[]>([]);

  search = signal('');
  statusFilter = signal<ProjectStatus | 'ALL'>('ALL');
  sort = signal<SortKey>('updated');
  openMenu = signal<string | null>(null);

  creating = signal(false);
  editing = signal<Project | null>(null);

  counts = computed(() => {
    const projects = this.projects();
    const counts: Record<string, number> = { ALL: projects.length };
    for (const status of PROJECT_STATUSES) {
      counts[status] = projects.filter((p) => p.status === status).length;
    }
    return counts;
  });

  cards = computed<ProjectCard[]>(() => {
    const term = this.search().trim().toLowerCase();
    const filter = this.statusFilter();
    const tasksByProject = new Map<string, Task[]>();
    for (const task of this.tasks()) {
      tasksByProject.set(task.projectId, [...(tasksByProject.get(task.projectId) ?? []), task]);
    }

    const cards = this.projects()
      .filter((p) => filter === 'ALL' || p.status === filter)
      .filter((p) => !term || p.name.toLowerCase().includes(term) || p.description?.toLowerCase().includes(term))
      .map((project) => {
        const tasks = tasksByProject.get(project.id) ?? [];
        const done = tasks.filter((t) => t.status === 'DONE').length;
        return {
          project,
          total: tasks.length,
          done,
          inProgress: tasks.filter((t) => t.status === 'IN_PROGRESS').length,
          percent: tasks.length ? Math.round((done / tasks.length) * 100) : 0,
        };
      });

    const sort = this.sort();
    return cards.sort((a, b) => {
      if (sort === 'name') return a.project.name.localeCompare(b.project.name);
      if (sort === 'progress') return b.percent - a.percent;
      return +new Date(b.project.updatedAt) - +new Date(a.project.updatedAt);
    });
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    forkJoin({ projects: this.projectService.list(), tasks: this.taskService.listVisible() }).subscribe({
      next: ({ projects, tasks }) => {
        this.projects.set(projects);
        this.tasks.set(tasks);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(errorMessage(err, 'Could not load your projects.'));
        this.loading.set(false);
      },
    });
  }

  toggleMenu(id: string, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.openMenu.set(this.openMenu() === id ? null : id);
  }

  @HostListener('document:click')
  closeMenu(): void {
    this.openMenu.set(null);
  }

  onCreated(project: Project): void {
    this.creating.set(false);
    this.router.navigate(['/projects', project.id]);
  }

  onEdited(project: Project): void {
    this.editing.set(null);
    this.replace(project);
  }

  setStatus(project: Project, status: ProjectStatus): void {
    this.projectService
      .update(project.id, { name: project.name, description: project.description ?? undefined, status })
      .subscribe({
        next: (updated) => {
          this.replace(updated);
          this.toast.success(`“${updated.name}” marked as ${PROJECT_STATUS_LABELS[status].toLowerCase()}`);
        },
        error: (err) => this.toast.error(errorMessage(err, 'Could not update the project.')),
      });
  }

  async remove(project: Project): Promise<void> {
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
        this.projects.update((list) => list.filter((p) => p.id !== project.id));
        this.toast.success('Project deleted');
      },
      error: (err) => this.toast.error(errorMessage(err, 'Could not delete the project.')),
    });
  }

  private replace(project: Project): void {
    this.projects.update((list) => list.map((p) => (p.id === project.id ? project : p)));
  }
}
