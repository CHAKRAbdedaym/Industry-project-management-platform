package com.industrypm.taskservice.dto;

import com.industrypm.taskservice.entity.Task;
import java.time.Instant;
import java.util.UUID;

public record TaskResponse(
        UUID id,
        UUID projectId,
        String title,
        String description,
        String status,
        String assigneeEmail,
        String creatorEmail,
        Instant createdAt,
        Instant updatedAt) {

    public static TaskResponse fromEntity(Task task) {
        return new TaskResponse(
                task.getId(),
                task.getProjectId(),
                task.getTitle(),
                task.getDescription(),
                task.getStatus().name(),
                task.getAssigneeEmail(),
                task.getCreatorEmail(),
                task.getCreatedAt(),
                task.getUpdatedAt());
    }
}
