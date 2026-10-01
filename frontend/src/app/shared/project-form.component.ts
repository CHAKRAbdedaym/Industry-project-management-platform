import { ChangeDetectionStrategy, Component, OnInit, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable } from 'rxjs';
import { errorMessage } from '../core/http-error';
import { PROJECT_STATUSES, PROJECT_STATUS_LABELS, Project, ProjectStatus } from '../core/models/project.models';
import { ProjectService } from '../core/project.service';
import { ToastService } from '../core/toast.service';
import { IconComponent } from './icon.component';
import { ModalComponent } from './modal.component';

/** Create a project, or edit one when {@link project} is given. */
@Component({
  selector: 'app-project-form',
  standalone: true,
  imports: [ReactiveFormsModule, ModalComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-modal
      [title]="project() ? 'Edit project' : 'New project'"
      [subtitle]="project() ? '' : 'Group related tasks and track their progress together.'"
      (closed)="closed.emit()"
    >
      <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
        @if (error()) {
          <div class="alert alert-error" role="alert"><app-icon name="alert" [size]="16" /> {{ error() }}</div>
        }
        <div class="field">
          <label for="project-name">Project name</label>
          <input id="project-name" class="input" formControlName="name" placeholder="e.g. Plant 3 conveyor retrofit" maxlength="255" />
          @if (form.controls.name.touched && form.controls.name.invalid) {
            <span class="field-error">A project needs a name.</span>
          }
        </div>
        <div class="field">
          <label for="project-description">Description</label>
          <textarea
            id="project-description"
            class="textarea"
            formControlName="description"
            rows="4"
            maxlength="2000"
            placeholder="What is this project about? What does done look like?"
          ></textarea>
          <span class="hint">{{ form.controls.description.value.length }}/2000</span>
        </div>
        @if (project()) {
          <div class="field">
            <label for="project-status">Status</label>
            <select id="project-status" class="select" formControlName="status">
              @for (status of statuses; track status) {
                <option [value]="status">{{ labels[status] }}</option>
              }
            </select>
          </div>
        }
        <div class="actions">
          <button type="button" class="btn btn-secondary" (click)="closed.emit()">Cancel</button>
          <button type="submit" class="btn btn-primary" [disabled]="saving()">
            @if (saving()) {
              <span class="spinner"></span>
            }
            {{ project() ? 'Save changes' : 'Create project' }}
          </button>
        </div>
      </form>
    </app-modal>
  `,
  styles: `
    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
      margin-top: 0.5rem;
    }
  `,
})
export class ProjectFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private projects = inject(ProjectService);
  private toast = inject(ToastService);

  project = input<Project | null>(null);
  saved = output<Project>();
  closed = output<void>();

  readonly statuses = PROJECT_STATUSES;
  readonly labels = PROJECT_STATUS_LABELS;

  saving = signal(false);
  error = signal<string | null>(null);

  form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(255)]],
    description: ['', [Validators.maxLength(2000)]],
    status: ['ACTIVE' as ProjectStatus],
  });

  ngOnInit(): void {
    const project = this.project();
    if (project) {
      this.form.setValue({ name: project.name, description: project.description ?? '', status: project.status });
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { name, description, status } = this.form.getRawValue();
    const existing = this.project();
    const request: Observable<Project> = existing
      ? this.projects.update(existing.id, { name: name.trim(), description: description.trim() || undefined, status })
      : this.projects.create({ name: name.trim(), description: description.trim() || undefined });

    this.saving.set(true);
    this.error.set(null);
    request.subscribe({
      next: (project) => {
        this.toast.success(existing ? 'Project updated' : `Project “${project.name}” created`);
        this.saved.emit(project);
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(errorMessage(err, 'Could not save the project.'));
      },
    });
  }
}
