package com.industrypm.taskservice.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.UUID;

public record CreateTaskRequest(
        @NotNull UUID projectId,
        @NotBlank @Size(max = 255) String title,
        @Size(max = 2000) String description,
        @Email String assigneeEmail) {}
