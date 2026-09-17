package com.industrypm.projectservice.dto;

import com.industrypm.projectservice.entity.Project;
import java.time.Instant;
import java.util.UUID;

public record ProjectResponse(
        UUID id,
        String name,
        String description,
        String status,
        String ownerEmail,
        Instant createdAt,
        Instant updatedAt) {

    public static ProjectResponse fromEntity(Project project) {
        return new ProjectResponse(
                project.getId(),
                project.getName(),
                project.getDescription(),
                project.getStatus().name(),
                project.getOwnerEmail(),
                project.getCreatedAt(),
                project.getUpdatedAt());
    }
}
