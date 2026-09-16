package com.industrypm.authservice.service;

import com.industrypm.authservice.dto.AuthResponse;
import com.industrypm.authservice.dto.LoginRequest;
import com.industrypm.authservice.dto.RegisterRequest;
import com.industrypm.authservice.dto.UserResponse;
import com.industrypm.authservice.entity.User;
import com.industrypm.authservice.exception.EmailAlreadyExistsException;
import com.industrypm.authservice.repository.UserRepository;
import com.industrypm.authservice.security.JwtService;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;

    public AuthService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            AuthenticationManager authenticationManager,
            JwtService jwtService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
    }

    @Transactional
    public UserResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new EmailAlreadyExistsException(request.email());
        }

        User user = User.builder()
                .email(request.email())
                .passwordHash(passwordEncoder.encode(request.password()))
                .fullName(request.fullName())
                .build();

        User saved = userRepository.save(user);
        return UserResponse.fromEntity(saved);
    }

    public AuthResponse login(LoginRequest request) {
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.email(), request.password()));
        } catch (org.springframework.security.core.AuthenticationException ex) {
            throw new BadCredentialsException("Invalid email or password");
        }

        String token = jwtService.generateToken(request.email());
        return new AuthResponse(token, jwtService.getExpirationSeconds());
    }

    public UserResponse getByEmail(String email) {
        User user = userRepository
                .findByEmail(email)
                .orElseThrow(() -> new BadCredentialsException("Invalid email or password"));
        return UserResponse.fromEntity(user);
    }
}
