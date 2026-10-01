package com.industrypm.taskservice.notification;

/** Raised by the task domain when someone should be told about a change to a task. */
public record TaskNotificationEvent(String recipientEmail, String message) {}
