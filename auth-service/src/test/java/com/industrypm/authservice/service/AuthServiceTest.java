package com.industrypm.authservice.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.industrypm.authservice.dto.AuthResponse;
import com.industrypm.authservice.dto.LoginRequest;
import com.industrypm.authservice.dto.RegisterRequest;
import com.industrypm.authservice.dto.UserResponse;
import com.industrypm.authservice.entity.Role;
import com.industrypm.authservice.entity.User;
import com.industrypm.authservice.exception.EmailAlreadyExistsException;
import com.industrypm.authservice.repository.UserRepository;
import com.industrypm.authservice.security.JwtService;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private AuthenticationManager authenticationManager;

    @Mock
    private JwtService jwtService;

    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService = new AuthService(userRepository, passwordEncoder, authenticationManager, jwtService);
    }

    @Test
    void register_createsUser_whenEmailNotTaken() {
        RegisterRequest request = new RegisterRequest("jane@example.com", "password123", "Jane Doe");
        when(userRepository.existsByEmail(request.email())).thenReturn(false);
        when(passwordEncoder.encode(request.password())).thenReturn("hashed-password");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User user = invocation.getArgument(0);
            user.setId(UUID.randomUUID());
            return user;
        });

        UserResponse response = authService.register(request);

        assertThat(response.email()).isEqualTo(request.email());
        assertThat(response.fullName()).isEqualTo(request.fullName());
        assertThat(response.role()).isEqualTo(Role.USER.name());
    }

    @Test
    void register_throws_whenEmailAlreadyExists() {
        RegisterRequest request = new RegisterRequest("jane@example.com", "password123", "Jane Doe");
        when(userRepository.existsByEmail(request.email())).thenReturn(true);

        assertThatThrownBy(() -> authService.register(request)).isInstanceOf(EmailAlreadyExistsException.class);
    }

    @Test
    void login_returnsToken_whenCredentialsValid() {
        LoginRequest request = new LoginRequest("jane@example.com", "password123");
        when(jwtService.generateToken(request.email())).thenReturn("signed-jwt");
        when(jwtService.getExpirationSeconds()).thenReturn(3600L);

        AuthResponse response = authService.login(request);

        assertThat(response.accessToken()).isEqualTo("signed-jwt");
        assertThat(response.expiresIn()).isEqualTo(3600L);
    }

    @Test
    void login_throwsBadCredentials_whenAuthenticationFails() {
        LoginRequest request = new LoginRequest("jane@example.com", "wrong-password");
        when(authenticationManager.authenticate(any())).thenThrow(new AuthenticationException("bad creds") {});

        assertThatThrownBy(() -> authService.login(request)).isInstanceOf(BadCredentialsException.class);
    }
}
