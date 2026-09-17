package com.industrypm.taskservice.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.industrypm.taskservice.dto.CreateTaskRequest;
import com.industrypm.taskservice.dto.TaskResponse;
import com.industrypm.taskservice.dto.UpdateTaskRequest;
import com.industrypm.taskservice.entity.Task;
import com.industrypm.taskservice.entity.TaskStatus;
import com.industrypm.taskservice.exception.TaskNotFoundException;
import com.industrypm.taskservice.repository.TaskRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class TaskServiceTest {

    @Mock
    private TaskRepository taskRepository;

    private TaskService taskService;

    @BeforeEach
    void setUp() {
        taskService = new TaskService(taskRepository);
    }

    private Task existingTask(UUID id, String creatorEmail, String assigneeEmail) {
        return Task.builder()
                .id(id)
                .projectId(UUID.randomUUID())
                .title("Original title")
                .description("Original description")
                .status(TaskStatus.TODO)
                .creatorEmail(creatorEmail)
                .assigneeEmail(assigneeEmail)
                .build();
    }

    @Test
    void create_savesTaskWithCreatorFromCaller() {
        UUID projectId = UUID.randomUUID();
        CreateTaskRequest request = new CreateTaskRequest(projectId, "Write tests", "Cover the service", "bob@example.com");

        when(taskRepository.save(any(Task.class))).thenAnswer(invocation -> {
            Task task = invocation.getArgument(0);
            task.setId(UUID.randomUUID());
            return task;
        });

        TaskResponse response = taskService.create("alice@example.com", request);

        assertThat(response.projectId()).isEqualTo(projectId);
        assertThat(response.title()).isEqualTo("Write tests");
        assertThat(response.creatorEmail()).isEqualTo("alice@example.com");
        assertThat(response.assigneeEmail()).isEqualTo("bob@example.com");
        assertThat(response.status()).isEqualTo("TODO");
    }

    @Test
    void list_returnsAllVisibleTasks_whenNoProjectFilter() {
        Task task = existingTask(UUID.randomUUID(), "alice@example.com", null);
        when(taskRepository.findVisible("alice@example.com")).thenReturn(List.of(task));

        List<TaskResponse> responses = taskService.list("alice@example.com", null);

        assertThat(responses).hasSize(1);
        assertThat(responses.get(0).creatorEmail()).isEqualTo("alice@example.com");
    }

    @Test
    void list_filtersByProject_whenProjectIdGiven() {
        UUID projectId = UUID.randomUUID();
        Task task = existingTask(UUID.randomUUID(), "alice@example.com", null);
        when(taskRepository.findVisibleByProject(projectId, "alice@example.com")).thenReturn(List.of(task));

        List<TaskResponse> responses = taskService.list("alice@example.com", projectId);

        assertThat(responses).hasSize(1);
        verify(taskRepository, times(1)).findVisibleByProject(projectId, "alice@example.com");
        verify(taskRepository, never()).findVisible(any());
    }

    @Test
    void getVisible_returnsTask_whenCallerIsCreatorOrAssignee() {
        UUID id = UUID.randomUUID();
        Task task = existingTask(id, "alice@example.com", "bob@example.com");
        when(taskRepository.findVisibleById(id, "bob@example.com")).thenReturn(Optional.of(task));

        TaskResponse response = taskService.getVisible("bob@example.com", id);

        assertThat(response.id()).isEqualTo(id);
    }

    @Test
    void getVisible_throws_whenNotFoundOrNotVisible() {
        UUID id = UUID.randomUUID();
        when(taskRepository.findVisibleById(id, "stranger@example.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> taskService.getVisible("stranger@example.com", id))
                .isInstanceOf(TaskNotFoundException.class);
    }

    @Test
    void update_succeeds_whenCallerIsCreator() {
        UUID id = UUID.randomUUID();
        Task task = existingTask(id, "alice@example.com", "bob@example.com");
        when(taskRepository.findByIdAndCreatorEmail(id, "alice@example.com")).thenReturn(Optional.of(task));
        when(taskRepository.save(any(Task.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UpdateTaskRequest request = new UpdateTaskRequest("Updated title", "Updated description", "IN_PROGRESS", "carol@example.com");

        TaskResponse response = taskService.update("alice@example.com", id, request);

        assertThat(response.title()).isEqualTo("Updated title");
        assertThat(response.status()).isEqualTo("IN_PROGRESS");
        assertThat(response.assigneeEmail()).isEqualTo("carol@example.com");
    }

    @Test
    void update_throws_whenCallerIsNotCreator() {
        UUID id = UUID.randomUUID();
        when(taskRepository.findByIdAndCreatorEmail(id, "bob@example.com")).thenReturn(Optional.empty());

        UpdateTaskRequest request = new UpdateTaskRequest("Updated title", "Updated description", "IN_PROGRESS", null);

        assertThatThrownBy(() -> taskService.update("bob@example.com", id, request))
                .isInstanceOf(TaskNotFoundException.class);
    }

    @Test
    void update_throws_whenStatusInvalid() {
        UUID id = UUID.randomUUID();
        Task task = existingTask(id, "alice@example.com", null);
        when(taskRepository.findByIdAndCreatorEmail(id, "alice@example.com")).thenReturn(Optional.of(task));

        UpdateTaskRequest request = new UpdateTaskRequest("Updated title", "Updated description", "NOT_A_STATUS", null);

        assertThatThrownBy(() -> taskService.update("alice@example.com", id, request))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void delete_succeeds_whenCallerIsCreator() {
        UUID id = UUID.randomUUID();
        Task task = existingTask(id, "alice@example.com", null);
        when(taskRepository.findByIdAndCreatorEmail(id, "alice@example.com")).thenReturn(Optional.of(task));

        taskService.delete("alice@example.com", id);

        verify(taskRepository, times(1)).delete(task);
    }

    @Test
    void delete_throws_whenCallerIsNotCreator() {
        UUID id = UUID.randomUUID();
        when(taskRepository.findByIdAndCreatorEmail(id, "bob@example.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> taskService.delete("bob@example.com", id))
                .isInstanceOf(TaskNotFoundException.class);

        verify(taskRepository, never()).delete(any());
    }
}
