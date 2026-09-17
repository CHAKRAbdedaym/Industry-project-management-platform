export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  assigneeEmail: string | null;
  creatorEmail: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskRequest {
  projectId: string;
  title: string;
  description?: string;
  assigneeEmail?: string;
}

export interface UpdateTaskRequest {
  title: string;
  description?: string;
  status: TaskStatus;
  assigneeEmail?: string;
}
