package com.industrypm.authservice.dto;

public record AuthResponse(String accessToken, long expiresIn) {}
