package com.industrypm.taskservice.notification;

import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.web.client.RestClient;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

/**
 * Forwards task notification events to notification-service once the task change has committed.
 *
 * <p>Delivery is best-effort: a notification-service outage must never roll back or fail a task
 * change, so errors are logged and swallowed. The caller's bearer token is forwarded so
 * notification-service can authenticate the request with the shared JWT secret.
 */
@Component
public class NotificationPublisher {

    private static final Logger log = LoggerFactory.getLogger(NotificationPublisher.class);

    private final RestClient restClient;

    public NotificationPublisher(
            RestClient.Builder restClientBuilder,
            @Value("${app.notification-service.url}") String notificationServiceUrl) {
        this.restClient = restClientBuilder.baseUrl(notificationServiceUrl).build();
    }

    @TransactionalEventListener
    public void onTaskNotification(TaskNotificationEvent event) {
        String authorization = currentAuthorizationHeader();
        if (authorization == null) {
            log.warn("Skipping notification to {}: no caller token to forward", event.recipientEmail());
            return;
        }

        try {
            restClient.post()
                    .uri("/api/notifications")
                    .header(HttpHeaders.AUTHORIZATION, authorization)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("recipientEmail", event.recipientEmail(), "message", event.message()))
                    .retrieve()
                    .toBodilessEntity();
        } catch (Exception e) {
            log.warn("Failed to deliver notification to {}: {}", event.recipientEmail(), e.getMessage());
        }
    }

    private String currentAuthorizationHeader() {
        if (RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attributes) {
            return attributes.getRequest().getHeader(HttpHeaders.AUTHORIZATION);
        }
        return null;
    }
}
