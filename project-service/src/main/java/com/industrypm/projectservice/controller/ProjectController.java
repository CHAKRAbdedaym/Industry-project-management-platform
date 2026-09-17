package com.industrypm.projectservice.controller;

import com.industrypm.projectservice.dto.CreateProjectRequest;
import com.industrypm.projectservice.dto.ProjectResponse;
import com.industrypm.projectservice.dto.UpdateProjectRequest;
import com.industrypm.projectservice.service.ProjectService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/projects")
public class ProjectController {

    private final ProjectService projectService;

    public ProjectController(ProjectService projectService) {
        this.projectService = projectService;
    }

    @PostMapping
    public ResponseEntity<ProjectResponse> create(
            @Valid @RequestBody CreateProjectRequest request, Authentication authentication) {
        ProjectResponse response = projectService.create(authentication.getName(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public ResponseEntity<List<ProjectResponse>> listMine(Authentication authentication) {
        return ResponseEntity.ok(projectService.listMine(authentication.getName()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProjectResponse> getMine(@PathVariable UUID id, Authentication authentication) {
        return ResponseEntity.ok(projectService.getMine(authentication.getName(), id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ProjectResponse> update(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateProjectRequest request,
            Authentication authentication) {
        return ResponseEntity.ok(projectService.update(authentication.getName(), id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id, Authentication authentication) {
        projectService.delete(authentication.getName(), id);
        return ResponseEntity.noContent().build();
    }
}
