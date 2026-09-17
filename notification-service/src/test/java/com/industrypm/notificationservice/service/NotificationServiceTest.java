package com.industrypm.notificationservice.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.industrypm.notificationservice.dto.CreateNotificationRequest;
import com.industrypm.notificationservice.dto.NotificationResponse;
import com.industrypm.notificationservice.entity.Notification;
import com.industrypm.notificationservice.exception.NotificationNotFoundException;
import com.industrypm.notificationservice.repository.NotificationRepository;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

    @Mock
    private NotificationRepository notificationRepository;

    private NotificationService notificationService;

    @BeforeEach
    void setUp() {
        notificationService = new NotificationService(notificationRepository);
    }

    @Test
    void create_savesAndReturnsNotification() {
        CreateNotificationRequest request = new CreateNotificationRequest("bob@example.com", "You have a new task");
        when(notificationRepository.save(any(Notification.class))).thenAnswer(invocation -> {
            Notification notification = invocation.getArgument(0);
            notification.setId(UUID.randomUUID());
            notification.setCreatedAt(Instant.now());
            return notification;
        });

        NotificationResponse response = notificationService.create(request);

        assertThat(response.recipientEmail()).isEqualTo(request.recipientEmail());
        assertThat(response.message()).isEqualTo(request.message());
        assertThat(response.read()).isFalse();
    }

    @Test
    void listMine_returnsNotificationsForRecipient() {
        Notification notification = Notification.builder()
                .id(UUID.randomUUID())
                .recipientEmail("bob@example.com")
                .message("hello")
                .read(false)
                .createdAt(Instant.now())
                .build();
        when(notificationRepository.findByRecipientEmailOrderByCreatedAtDesc("bob@example.com"))
                .thenReturn(List.of(notification));

        List<NotificationResponse> responses = notificationService.listMine("bob@example.com");

        assertThat(responses).hasSize(1);
        assertThat(responses.get(0).recipientEmail()).isEqualTo("bob@example.com");
    }

    @Test
    void markRead_marksNotificationRead_whenOwnedByRecipient() {
        UUID id = UUID.randomUUID();
        Notification notification = Notification.builder()
                .id(id)
                .recipientEmail("bob@example.com")
                .message("hello")
                .read(false)
                .createdAt(Instant.now())
                .build();
        when(notificationRepository.findByIdAndRecipientEmail(id, "bob@example.com"))
                .thenReturn(Optional.of(notification));

        NotificationResponse response = notificationService.markRead("bob@example.com", id);

        assertThat(response.read()).isTrue();
    }

    @Test
    void markRead_throws_whenNotificationNotFoundOrNotOwned() {
        UUID id = UUID.randomUUID();
        when(notificationRepository.findByIdAndRecipientEmail(id, "bob@example.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> notificationService.markRead("bob@example.com", id))
                .isInstanceOf(NotificationNotFoundException.class);
    }
}
