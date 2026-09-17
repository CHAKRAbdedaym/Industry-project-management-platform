package com.industrypm.notificationservice.dto;

import com.industrypm.notificationservice.entity.Notification;
import java.time.Instant;
import java.util.UUID;

public record NotificationResponse(
        UUID id, String recipientEmail, String message, boolean read, Instant createdAt) {

    public static NotificationResponse fromEntity(Notification notification) {
        return new NotificationResponse(
                notification.getId(),
                notification.getRecipientEmail(),
                notification.getMessage(),
                notification.isRead(),
                notification.getCreatedAt());
    }
}
