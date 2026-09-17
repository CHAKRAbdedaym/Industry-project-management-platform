import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ProjectService } from '../../core/project.service';
import { Project } from '../../core/models/project.models';

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './projects.component.html',
  styleUrl: './projects.component.css',
})
export class ProjectsComponent implements OnInit {
  private projectService = inject(ProjectService);
  private fb = inject(FormBuilder);

  projects: Project[] = [];
  loading = true;
  errorMessage: string | null = null;
  creating = false;

  form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(255)]],
    description: [''],
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.projectService.list().subscribe({
      next: (projects) => {
        this.projects = projects;
        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = err.error?.message ?? 'Failed to load projects.';
        this.loading = false;
      },
    });
  }

  createProject(): void {
    if (this.form.invalid) {
      return;
    }

    this.creating = true;
    this.projectService
      .create(this.form.getRawValue() as { name: string; description: string })
      .subscribe({
        next: (project) => {
          this.projects = [project, ...this.projects];
          this.form.reset();
          this.creating = false;
        },
        error: (err) => {
          this.errorMessage = err.error?.message ?? 'Failed to create project.';
          this.creating = false;
        },
      });
  }

  deleteProject(id: string): void {
    this.projectService.delete(id).subscribe({
      next: () => {
        this.projects = this.projects.filter((p) => p.id !== id);
      },
      error: (err) => {
        this.errorMessage = err.error?.message ?? 'Failed to delete project.';
      },
    });
  }
}
