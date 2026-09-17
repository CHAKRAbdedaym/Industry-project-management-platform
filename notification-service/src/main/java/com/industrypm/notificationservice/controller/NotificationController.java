package com.industrypm.notificationservice.controller;

import com.industrypm.notificationservice.dto.CreateNotificationRequest;
import com.industrypm.notificationservice.dto.NotificationResponse;
import com.industrypm.notificationservice.service.NotificationService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public NotificationResponse create(@Valid @RequestBody CreateNotificationRequest request) {
        return notificationService.create(request);
    }

    @GetMapping("/me")
    public List<NotificationResponse> listMine(Authentication authentication) {
        return notificationService.listMine(authentication.getName());
    }

    @PatchMapping("/{id}/read")
    public NotificationResponse markRead(Authentication authentication, @PathVariable UUID id) {
        return notificationService.markRead(authentication.getName(), id);
    }
}
