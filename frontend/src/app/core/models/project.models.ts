export type ProjectStatus = 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';

export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  ownerEmail: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
}

export interface UpdateProjectRequest {
  name: string;
  description?: string;
  status: ProjectStatus;
}
