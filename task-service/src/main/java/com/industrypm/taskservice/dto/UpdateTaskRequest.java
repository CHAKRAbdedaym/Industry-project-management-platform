package com.industrypm.taskservice.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateTaskRequest(
        @NotBlank @Size(max = 255) String title,
        @Size(max = 2000) String description,
        String status,
        @Email String assigneeEmail) {}
