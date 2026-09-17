package com.industrypm.taskservice.controller;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.industrypm.taskservice.dto.CreateTaskRequest;
import com.industrypm.taskservice.dto.UpdateTaskRequest;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.Map;
import java.util.UUID;
import javax.crypto.SecretKey;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@Testcontainers
@SpringBootTest
@AutoConfigureMockMvc
class TaskControllerIntegrationTest {

    private static final String JWT_SECRET = "dev-only-secret-key-change-me-please-32-bytes-min";

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @DynamicPropertySource
    static void overrideProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private static String mintToken(String email) {
        SecretKey key = Keys.hmacShaKeyFor(JWT_SECRET.getBytes(StandardCharsets.UTF_8));
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(email)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(60, ChronoUnit.MINUTES)))
                .signWith(key)
                .compact();
    }

    private String createTask(String creatorEmail, UUID projectId, String assigneeEmail) throws Exception {
        CreateTaskRequest request = new CreateTaskRequest(projectId, "Do the thing", "Details", assigneeEmail);

        String responseJson = mockMvc.perform(post("/api/tasks")
                        .header("Authorization", "Bearer " + mintToken(creatorEmail))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();

        @SuppressWarnings("unchecked")
        Map<String, Object> body = objectMapper.readValue(responseJson, Map.class);
        return (String) body.get("id");
    }

    @Test
    void creatorCanCreateSeeUpdateAndDeleteTheirTask() throws Exception {
        String creator = "creator@example.com";
        UUID projectId = UUID.randomUUID();

        String taskId = createTask(creator, projectId, null);

        mockMvc.perform(get("/api/tasks/" + taskId).header("Authorization", "Bearer " + mintToken(creator)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title", is("Do the thing")));

        mockMvc.perform(get("/api/tasks").header("Authorization", "Bearer " + mintToken(creator)))
                .andExpect(status().isOk());

        UpdateTaskRequest update = new UpdateTaskRequest("Updated title", "Updated description", "DONE", null);
        mockMvc.perform(put("/api/tasks/" + taskId)
                        .header("Authorization", "Bearer " + mintToken(creator))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(update)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title", is("Updated title")))
                .andExpect(jsonPath("$.status", is("DONE")));

        mockMvc.perform(delete("/api/tasks/" + taskId).header("Authorization", "Bearer " + mintToken(creator)))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/tasks/" + taskId).header("Authorization", "Bearer " + mintToken(creator)))
                .andExpect(status().isNotFound());
    }

    @Test
    void assigneeCanViewButNotMutateTask() throws Exception {
        String creator = "creator2@example.com";
        String assignee = "assignee2@example.com";
        UUID projectId = UUID.randomUUID();

        String taskId = createTask(creator, projectId, assignee);

        mockMvc.perform(get("/api/tasks/" + taskId).header("Authorization", "Bearer " + mintToken(assignee)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.assigneeEmail", is(assignee)));

        UpdateTaskRequest update = new UpdateTaskRequest("Hacked title", null, "DONE", null);
        mockMvc.perform(put("/api/tasks/" + taskId)
                        .header("Authorization", "Bearer " + mintToken(assignee))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(update)))
                .andExpect(status().isNotFound());

        mockMvc.perform(delete("/api/tasks/" + taskId).header("Authorization", "Bearer " + mintToken(assignee)))
                .andExpect(status().isNotFound());
    }

    @Test
    void unrelatedUserGetsNotFound() throws Exception {
        String creator = "creator3@example.com";
        String stranger = "stranger3@example.com";
        UUID projectId = UUID.randomUUID();

        String taskId = createTask(creator, projectId, null);

        mockMvc.perform(get("/api/tasks/" + taskId).header("Authorization", "Bearer " + mintToken(stranger)))
                .andExpect(status().isNotFound());
    }

    @Test
    void requestsWithoutTokenAreForbidden() throws Exception {
        mockMvc.perform(get("/api/tasks")).andExpect(status().isForbidden());
    }

    @Test
    void listCanBeFilteredByProjectId() throws Exception {
        String creator = "creator4@example.com";
        UUID projectA = UUID.randomUUID();
        UUID projectB = UUID.randomUUID();

        createTask(creator, projectA, null);
        createTask(creator, projectB, null);
        createTask(creator, projectA, null);

        mockMvc.perform(get("/api/tasks")
                        .param("projectId", projectA.toString())
                        .header("Authorization", "Bearer " + mintToken(creator)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)));
    }
}
