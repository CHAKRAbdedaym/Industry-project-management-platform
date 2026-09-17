package com.industrypm.projectservice.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.industrypm.projectservice.dto.CreateProjectRequest;
import com.industrypm.projectservice.dto.ProjectResponse;
import com.industrypm.projectservice.dto.UpdateProjectRequest;
import com.industrypm.projectservice.entity.Project;
import com.industrypm.projectservice.entity.ProjectStatus;
import com.industrypm.projectservice.exception.ProjectNotFoundException;
import com.industrypm.projectservice.repository.ProjectRepository;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ProjectServiceTest {

    private static final String OWNER_EMAIL = "jane@example.com";

    @Mock
    private ProjectRepository projectRepository;

    private ProjectService projectService;

    @BeforeEach
    void setUp() {
        projectService = new ProjectService(projectRepository);
    }

    private Project sampleProject(UUID id, String ownerEmail) {
        Instant now = Instant.now();
        return Project.builder()
                .id(id)
                .name("Apollo")
                .description("Launch project")
                .status(ProjectStatus.ACTIVE)
                .ownerEmail(ownerEmail)
                .createdAt(now)
                .updatedAt(now)
                .build();
    }

    @Test
    void create_savesProject_ownedByCaller() {
        CreateProjectRequest request = new CreateProjectRequest("Apollo", "Launch project");
        when(projectRepository.save(any(Project.class))).thenAnswer(invocation -> {
            Project project = invocation.getArgument(0);
            project.setId(UUID.randomUUID());
            project.setCreatedAt(Instant.now());
            project.setUpdatedAt(Instant.now());
            return project;
        });

        ProjectResponse response = projectService.create(OWNER_EMAIL, request);

        assertThat(response.name()).isEqualTo("Apollo");
        assertThat(response.description()).isEqualTo("Launch project");
        assertThat(response.ownerEmail()).isEqualTo(OWNER_EMAIL);
        assertThat(response.status()).isEqualTo(ProjectStatus.ACTIVE.name());
    }

    @Test
    void listMine_returnsOnlyCallerProjects() {
        Project project = sampleProject(UUID.randomUUID(), OWNER_EMAIL);
        when(projectRepository.findByOwnerEmail(OWNER_EMAIL)).thenReturn(List.of(project));

        List<ProjectResponse> responses = projectService.listMine(OWNER_EMAIL);

        assertThat(responses).hasSize(1);
        assertThat(responses.get(0).ownerEmail()).isEqualTo(OWNER_EMAIL);
    }

    @Test
    void getMine_returnsProject_whenFoundAndOwned() {
        UUID id = UUID.randomUUID();
        Project project = sampleProject(id, OWNER_EMAIL);
        when(projectRepository.findByIdAndOwnerEmail(id, OWNER_EMAIL)).thenReturn(Optional.of(project));

        ProjectResponse response = projectService.getMine(OWNER_EMAIL, id);

        assertThat(response.id()).isEqualTo(id);
    }

    @Test
    void getMine_throws_whenNotFoundOrNotOwned() {
        UUID id = UUID.randomUUID();
        when(projectRepository.findByIdAndOwnerEmail(id, OWNER_EMAIL)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> projectService.getMine(OWNER_EMAIL, id))
                .isInstanceOf(ProjectNotFoundException.class)
                .hasMessage("Project not found");
    }

    @Test
    void update_updatesFields_whenFoundAndOwned() {
        UUID id = UUID.randomUUID();
        Project project = sampleProject(id, OWNER_EMAIL);
        UpdateProjectRequest request = new UpdateProjectRequest("Apollo v2", "Updated description", "COMPLETED");
        when(projectRepository.findByIdAndOwnerEmail(id, OWNER_EMAIL)).thenReturn(Optional.of(project));
        when(projectRepository.save(any(Project.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ProjectResponse response = projectService.update(OWNER_EMAIL, id, request);

        assertThat(response.name()).isEqualTo("Apollo v2");
        assertThat(response.description()).isEqualTo("Updated description");
        assertThat(response.status()).isEqualTo(ProjectStatus.COMPLETED.name());
    }

    @Test
    void update_throws_whenNotFoundOrNotOwned() {
        UUID id = UUID.randomUUID();
        UpdateProjectRequest request = new UpdateProjectRequest("Apollo v2", "Updated description", "COMPLETED");
        when(projectRepository.findByIdAndOwnerEmail(id, OWNER_EMAIL)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> projectService.update(OWNER_EMAIL, id, request))
                .isInstanceOf(ProjectNotFoundException.class);
    }

    @Test
    void update_throwsIllegalArgument_whenStatusInvalid() {
        UUID id = UUID.randomUUID();
        Project project = sampleProject(id, OWNER_EMAIL);
        UpdateProjectRequest request = new UpdateProjectRequest("Apollo v2", "Updated description", "NOT_A_STATUS");
        when(projectRepository.findByIdAndOwnerEmail(id, OWNER_EMAIL)).thenReturn(Optional.of(project));

        assertThatThrownBy(() -> projectService.update(OWNER_EMAIL, id, request))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void delete_removesProject_whenFoundAndOwned() {
        UUID id = UUID.randomUUID();
        Project project = sampleProject(id, OWNER_EMAIL);
        when(projectRepository.findByIdAndOwnerEmail(id, OWNER_EMAIL)).thenReturn(Optional.of(project));

        projectService.delete(OWNER_EMAIL, id);

        verify(projectRepository).delete(project);
    }

    @Test
    void delete_throws_whenNotFoundOrNotOwned() {
        UUID id = UUID.randomUUID();
        when(projectRepository.findByIdAndOwnerEmail(id, OWNER_EMAIL)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> projectService.delete(OWNER_EMAIL, id))
                .isInstanceOf(ProjectNotFoundException.class);
    }
}
