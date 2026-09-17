package com.industrypm.taskservice.service;

import com.industrypm.taskservice.dto.CreateTaskRequest;
import com.industrypm.taskservice.dto.TaskResponse;
import com.industrypm.taskservice.dto.UpdateTaskRequest;
import com.industrypm.taskservice.entity.Task;
import com.industrypm.taskservice.entity.TaskStatus;
import com.industrypm.taskservice.exception.TaskNotFoundException;
import com.industrypm.taskservice.repository.TaskRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TaskService {

    private final TaskRepository taskRepository;

    public TaskService(TaskRepository taskRepository) {
        this.taskRepository = taskRepository;
    }

    @Transactional
    public TaskResponse create(String creatorEmail, CreateTaskRequest request) {
        Task task = Task.builder()
                .projectId(request.projectId())
                .title(request.title())
                .description(request.description())
                .assigneeEmail(request.assigneeEmail())
                .creatorEmail(creatorEmail)
                .build();

        Task saved = taskRepository.save(task);
        return TaskResponse.fromEntity(saved);
    }

    public List<TaskResponse> list(String email, UUID projectIdFilter) {
        List<Task> tasks =
                projectIdFilter != null
                        ? taskRepository.findVisibleByProject(projectIdFilter, email)
                        : taskRepository.findVisible(email);
        return tasks.stream().map(TaskResponse::fromEntity).toList();
    }

    public TaskResponse getVisible(String email, UUID id) {
        Task task = taskRepository.findVisibleById(id, email).orElseThrow(TaskNotFoundException::new);
        return TaskResponse.fromEntity(task);
    }

    @Transactional
    public TaskResponse update(String creatorEmail, UUID id, UpdateTaskRequest request) {
        Task task = taskRepository
                .findByIdAndCreatorEmail(id, creatorEmail)
                .orElseThrow(TaskNotFoundException::new);

        TaskStatus status = parseStatus(request.status());

        task.setTitle(request.title());
        task.setDescription(request.description());
        task.setStatus(status);
        task.setAssigneeEmail(request.assigneeEmail());

        Task saved = taskRepository.save(task);
        return TaskResponse.fromEntity(saved);
    }

    @Transactional
    public void delete(String creatorEmail, UUID id) {
        Task task = taskRepository
                .findByIdAndCreatorEmail(id, creatorEmail)
                .orElseThrow(TaskNotFoundException::new);
        taskRepository.delete(task);
    }

    private TaskStatus parseStatus(String status) {
        try {
            return TaskStatus.valueOf(status);
        } catch (IllegalArgumentException | NullPointerException e) {
            throw new IllegalArgumentException("Invalid status: " + status);
        }
    }
}
