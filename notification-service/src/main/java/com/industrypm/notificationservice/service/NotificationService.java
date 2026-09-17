package com.industrypm.notificationservice.service;

import com.industrypm.notificationservice.dto.CreateNotificationRequest;
import com.industrypm.notificationservice.dto.NotificationResponse;
import com.industrypm.notificationservice.entity.Notification;
import com.industrypm.notificationservice.exception.NotificationNotFoundException;
import com.industrypm.notificationservice.repository.NotificationRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;

    public NotificationService(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    @Transactional
    public NotificationResponse create(CreateNotificationRequest request) {
        Notification notification = Notification.builder()
                .recipientEmail(request.recipientEmail())
                .message(request.message())
                .build();

        Notification saved = notificationRepository.save(notification);
        return NotificationResponse.fromEntity(saved);
    }

    public List<NotificationResponse> listMine(String recipientEmail) {
        return notificationRepository.findByRecipientEmailOrderByCreatedAtDesc(recipientEmail).stream()
                .map(NotificationResponse::fromEntity)
                .toList();
    }

    @Transactional
    public NotificationResponse markRead(String recipientEmail, UUID id) {
        Notification notification = notificationRepository
                .findByIdAndRecipientEmail(id, recipientEmail)
                .orElseThrow(NotificationNotFoundException::new);

        notification.setRead(true);
        return NotificationResponse.fromEntity(notification);
    }
}
