package com.industrypm.authservice.dto;

import com.industrypm.authservice.entity.User;
import java.util.UUID;

public record UserResponse(UUID id, String email, String fullName, String role) {

    public static UserResponse fromEntity(User user) {
        return new UserResponse(user.getId(), user.getEmail(), user.getFullName(), user.getRole().name());
    }
}
