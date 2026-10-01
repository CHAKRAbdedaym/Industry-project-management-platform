import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable, of, switchMap } from 'rxjs';
import { AuthService } from '../core/auth.service';
import { ConfirmService } from '../core/confirm.service';
import { errorMessage } from '../core/http-error';
import { TASK_STATUSES, TASK_STATUS_LABELS, Task, TaskStatus } from '../core/models/task.models';
import { TaskService } from '../core/task.service';
import { ToastService } from '../core/toast.service';
import { AvatarComponent } from './avatar.component';
import { IconComponent } from './icon.component';
import { ModalComponent } from './modal.component';
import { TimeAgoPipe } from './time-ago.pipe';

/**
 * Create a task, or open an existing one. Creators can edit everything and delete;
 * an assignee only gets the status control, mirroring task-service's rules.
 */
@Component({
  selector: 'app-task-form',
  standalone: true,
  imports: [ReactiveFormsModule, ModalComponent, IconComponent, AvatarComponent, TimeAgoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './task-form.component.html',
  styleUrl: './task-form.component.css',
})
export class TaskFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private tasks = inject(TaskService);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmService);
  private auth = inject(AuthService);

  projectId = input<string>('');
  task = input<Task | null>(null);
  initialStatus = input<TaskStatus>('TODO');

  saved = output<Task>();
  deleted = output<string>();
  closed = output<void>();

  readonly statuses = TASK_STATUSES;
  readonly labels = TASK_STATUS_LABELS;

  saving = signal(false);
  error = signal<string | null>(null);

  isCreator = computed(() => {
    const task = this.task();
    return !task || task.creatorEmail === this.auth.currentUserEmail();
  });

  form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(255)]],
    description: ['', [Validators.maxLength(2000)]],
    assigneeEmail: ['', [Validators.email]],
    status: ['TODO' as TaskStatus],
  });

  ngOnInit(): void {
    const task = this.task();
    if (task) {
      this.form.setValue({
        title: task.title,
        description: task.description ?? '',
        assigneeEmail: task.assigneeEmail ?? '',
        status: task.status,
      });
      if (!this.isCreator()) {
        this.form.controls.title.disable();
        this.form.controls.description.disable();
        this.form.controls.assigneeEmail.disable();
      }
    } else {
      this.form.controls.status.setValue(this.initialStatus());
    }
  }

  assignToMe(): void {
    this.form.controls.assigneeEmail.setValue(this.auth.currentUserEmail() ?? '');
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const payload = {
      title: value.title.trim(),
      description: value.description.trim() || undefined,
      assigneeEmail: value.assigneeEmail.trim() || undefined,
    };
    const existing = this.task();

    let request: Observable<Task>;
    if (existing) {
      request = this.tasks.update(existing.id, { ...payload, status: value.status });
    } else {
      // task-service always creates in TODO; follow up when the task was added to another column.
      request = this.tasks
        .create({ ...payload, projectId: this.projectId() })
        .pipe(
          switchMap((created) =>
            value.status === 'TODO' ? of(created) : this.tasks.update(created.id, { ...payload, status: value.status }),
          ),
        );
    }

    this.saving.set(true);
    this.error.set(null);
    request.subscribe({
      next: (task) => {
        this.toast.success(existing ? 'Task updated' : 'Task created');
        this.saved.emit(task);
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(errorMessage(err, 'Could not save the task.'));
      },
    });
  }

  async remove(): Promise<void> {
    const task = this.task();
    if (!task) {
      return;
    }
    const confirmed = await this.confirm.confirm({
      title: 'Delete task?',
      message: `“${task.title}” will be permanently removed.`,
      confirmLabel: 'Delete task',
      danger: true,
    });
    if (!confirmed) {
      return;
    }
    this.tasks.delete(task.id).subscribe({
      next: () => {
        this.toast.success('Task deleted');
        this.deleted.emit(task.id);
      },
      error: (err) => this.error.set(errorMessage(err, 'Could not delete the task.')),
    });
  }
}
