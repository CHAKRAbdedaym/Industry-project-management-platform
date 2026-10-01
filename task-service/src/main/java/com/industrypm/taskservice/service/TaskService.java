package com.industrypm.taskservice.service;

import com.industrypm.taskservice.dto.CreateTaskRequest;
import com.industrypm.taskservice.dto.TaskResponse;
import com.industrypm.taskservice.dto.UpdateTaskRequest;
import com.industrypm.taskservice.entity.Task;
import com.industrypm.taskservice.entity.TaskStatus;
import com.industrypm.taskservice.exception.TaskNotFoundException;
import com.industrypm.taskservice.notification.TaskNotificationEvent;
import com.industrypm.taskservice.repository.TaskRepository;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TaskService {

    private final TaskRepository taskRepository;
    private final ApplicationEventPublisher eventPublisher;

    public TaskService(TaskRepository taskRepository, ApplicationEventPublisher eventPublisher) {
        this.taskRepository = taskRepository;
        this.eventPublisher = eventPublisher;
    }

    @Transactional
    public TaskResponse create(String creatorEmail, CreateTaskRequest request) {
        Task task = Task.builder()
                .projectId(request.projectId())
                .title(request.title())
                .description(request.description())
                .assigneeEmail(blankToNull(request.assigneeEmail()))
                .creatorEmail(creatorEmail)
                .build();

        Task saved = taskRepository.save(task);
        notifyAssignee(saved, creatorEmail);
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

    /**
     * The creator may edit every field. The assignee may only move the task between statuses; any
     * other change from them is rejected so they cannot rewrite or reassign someone else's task.
     */
    @Transactional
    public TaskResponse update(String callerEmail, UUID id, UpdateTaskRequest request) {
        Task task = taskRepository.findVisibleById(id, callerEmail).orElseThrow(TaskNotFoundException::new);

        TaskStatus status = parseStatus(request.status());
        String assigneeEmail = blankToNull(request.assigneeEmail());
        boolean isCreator = task.getCreatorEmail().equals(callerEmail);

        if (!isCreator && detailsChanged(task, request, assigneeEmail)) {
            throw new IllegalArgumentException("Only the task creator can edit task details");
        }

        String previousAssignee = task.getAssigneeEmail();
        TaskStatus previousStatus = task.getStatus();

        task.setTitle(request.title());
        task.setDescription(request.description());
        task.setStatus(status);
        task.setAssigneeEmail(assigneeEmail);

        Task saved = taskRepository.save(task);

        if (!Objects.equals(previousAssignee, assigneeEmail)) {
            notifyAssignee(saved, callerEmail);
        }
        if (previousStatus != status && !isCreator) {
            eventPublisher.publishEvent(new TaskNotificationEvent(
                    saved.getCreatorEmail(),
                    "%s moved \"%s\" to %s".formatted(callerEmail, saved.getTitle(), describe(status))));
        }

        return TaskResponse.fromEntity(saved);
    }

    @Transactional
    public void delete(String creatorEmail, UUID id) {
        Task task = taskRepository
                .findByIdAndCreatorEmail(id, creatorEmail)
                .orElseThrow(TaskNotFoundException::new);
        taskRepository.delete(task);
    }

    private void notifyAssignee(Task task, String actorEmail) {
        String assignee = task.getAssigneeEmail();
        if (assignee != null && !assignee.equals(actorEmail)) {
            eventPublisher.publishEvent(new TaskNotificationEvent(
                    assignee, "%s assigned you the task \"%s\"".formatted(actorEmail, task.getTitle())));
        }
    }

    private static boolean detailsChanged(Task task, UpdateTaskRequest request, String assigneeEmail) {
        return !Objects.equals(task.getTitle(), request.title())
                || !Objects.equals(blankToNull(task.getDescription()), blankToNull(request.description()))
                || !Objects.equals(task.getAssigneeEmail(), assigneeEmail);
    }

    private static String describe(TaskStatus status) {
        return switch (status) {
            case TODO -> "To do";
            case IN_PROGRESS -> "In progress";
            case DONE -> "Done";
        };
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }

    private TaskStatus parseStatus(String status) {
        try {
            return TaskStatus.valueOf(status);
        } catch (IllegalArgumentException | NullPointerException e) {
            throw new IllegalArgumentException("Invalid status: " + status);
        }
    }
}
