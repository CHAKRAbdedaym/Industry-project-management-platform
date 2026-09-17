package com.industrypm.taskservice.repository;

import com.industrypm.taskservice.entity.Task;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TaskRepository extends JpaRepository<Task, UUID> {

    @Query("select t from Task t where t.projectId = :projectId and (t.creatorEmail = :email or t.assigneeEmail = :email)")
    List<Task> findVisibleByProject(@Param("projectId") UUID projectId, @Param("email") String email);

    @Query("select t from Task t where t.creatorEmail = :email or t.assigneeEmail = :email")
    List<Task> findVisible(@Param("email") String email);

    @Query("select t from Task t where t.id = :id and (t.creatorEmail = :email or t.assigneeEmail = :email)")
    Optional<Task> findVisibleById(@Param("id") UUID id, @Param("email") String email);

    Optional<Task> findByIdAndCreatorEmail(UUID id, String creatorEmail);
}
