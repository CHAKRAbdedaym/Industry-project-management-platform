package com.industrypm.notificationservice.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateNotificationRequest(
        @NotBlank @Email String recipientEmail, @NotBlank @Size(max = 1000) String message) {}
