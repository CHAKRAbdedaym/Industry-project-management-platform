package com.industrypm.projectservice.service;

import com.industrypm.projectservice.dto.CreateProjectRequest;
import com.industrypm.projectservice.dto.ProjectResponse;
import com.industrypm.projectservice.dto.UpdateProjectRequest;
import com.industrypm.projectservice.entity.Project;
import com.industrypm.projectservice.entity.ProjectStatus;
import com.industrypm.projectservice.exception.ProjectNotFoundException;
import com.industrypm.projectservice.repository.ProjectRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProjectService {

    private final ProjectRepository projectRepository;

    public ProjectService(ProjectRepository projectRepository) {
        this.projectRepository = projectRepository;
    }

    @Transactional
    public ProjectResponse create(String ownerEmail, CreateProjectRequest request) {
        Project project = Project.builder()
                .name(request.name())
                .description(request.description())
                .ownerEmail(ownerEmail)
                .build();
        return ProjectResponse.fromEntity(projectRepository.save(project));
    }

    public List<ProjectResponse> listMine(String ownerEmail) {
        return projectRepository.findByOwnerEmail(ownerEmail).stream()
                .map(ProjectResponse::fromEntity)
                .toList();
    }

    public ProjectResponse getMine(String ownerEmail, UUID id) {
        return ProjectResponse.fromEntity(findOwnedOrThrow(ownerEmail, id));
    }

    @Transactional
    public ProjectResponse update(String ownerEmail, UUID id, UpdateProjectRequest request) {
        Project project = findOwnedOrThrow(ownerEmail, id);

        ProjectStatus status = parseStatus(request.status());

        project.setName(request.name());
        project.setDescription(request.description());
        project.setStatus(status);

        return ProjectResponse.fromEntity(projectRepository.save(project));
    }

    @Transactional
    public void delete(String ownerEmail, UUID id) {
        Project project = findOwnedOrThrow(ownerEmail, id);
        projectRepository.delete(project);
    }

    private Project findOwnedOrThrow(String ownerEmail, UUID id) {
        return projectRepository
                .findByIdAndOwnerEmail(id, ownerEmail)
                .orElseThrow(ProjectNotFoundException::new);
    }

    private ProjectStatus parseStatus(String status) {
        try {
            return ProjectStatus.valueOf(status);
        } catch (IllegalArgumentException | NullPointerException e) {
            throw new IllegalArgumentException("Invalid status: " + status);
        }
    }
}
