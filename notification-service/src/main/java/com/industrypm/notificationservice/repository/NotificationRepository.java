package com.industrypm.notificationservice.repository;

import com.industrypm.notificationservice.entity.Notification;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {

    List<Notification> findByRecipientEmailOrderByCreatedAtDesc(String recipientEmail);

    Optional<Notification> findByIdAndRecipientEmail(UUID id, String recipientEmail);
}
