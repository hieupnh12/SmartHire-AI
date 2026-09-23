package com.smarthire.tenant.job.service;

import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.enums.AssignmentRole;
import com.smarthire.domain.enums.UserStatus;
import com.smarthire.domain.tenant.entity.Job;
import com.smarthire.domain.tenant.entity.JobAssignment;
import com.smarthire.domain.tenant.entity.User;
import com.smarthire.domain.tenant.repository.JobAssignmentRepository;
import com.smarthire.domain.tenant.repository.JobRepository;
import com.smarthire.domain.tenant.repository.UserRepository;
import com.smarthire.tenant.cv.service.CvAccess;
import com.smarthire.tenant.job.dto.JobAssignmentModels.AssignRecruiterRequest;
import com.smarthire.tenant.job.dto.JobAssignmentModels.JobAssignmentResponse;
import com.smarthire.tenant.job.dto.JobAssignmentModels.UpdateAssignmentRequest;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class JobAssignmentServiceTest {
    @Mock JobAssignmentRepository assignments;
    @Mock JobRepository jobs;
    @Mock UserRepository users;
    @Mock CvAccess access;

    @InjectMocks JobAssignmentService service;

    User admin;
    User recruiter;
    Job job;

    @BeforeEach
    void setUp() {
        admin = staff(1L, "TENANT_ADMIN", "Admin");
        recruiter = staff(2L, "RECRUITER", "Lan");
        job = new Job();
        job.setId(9L);
        job.setTitle("Backend");
        job.setCreatedBy(admin);
    }

    @Test
    void assignCreatesPrimaryAndDemotesExisting() {
        User previous = staff(3L, "HR", "Minh");
        JobAssignment currentPrimary = assignment(11L, previous, AssignmentRole.PRIMARY_RECRUITER);
        when(access.actor()).thenReturn(admin);
        when(jobs.findById(9L)).thenReturn(Optional.of(job));
        when(users.findById(2L)).thenReturn(Optional.of(recruiter));
        when(assignments.existsByJob_IdAndUser_Id(9L, 2L)).thenReturn(false);
        when(assignments.findByJob_IdAndAssignmentRole(9L, AssignmentRole.PRIMARY_RECRUITER))
                .thenReturn(Optional.of(currentPrimary));
        when(assignments.save(any(JobAssignment.class))).thenAnswer(call -> {
            JobAssignment row = call.getArgument(0);
            if (row.getId() == null) {
                row.setId(20L);
            }
            return row;
        });

        JobAssignmentResponse response = service.assign(9L, new AssignRecruiterRequest(2L, "PRIMARY_RECRUITER"));

        assertEquals(2L, response.userId());
        assertEquals("PRIMARY_RECRUITER", response.assignmentRole());
        assertEquals(AssignmentRole.CO_RECRUITER, currentPrimary.getAssignmentRole());
    }

    @Test
    void assignRejectsDuplicate() {
        when(access.actor()).thenReturn(admin);
        when(jobs.findById(9L)).thenReturn(Optional.of(job));
        when(users.findById(2L)).thenReturn(Optional.of(recruiter));
        when(assignments.existsByJob_IdAndUser_Id(9L, 2L)).thenReturn(true);

        BusinessException ex = assertThrows(BusinessException.class,
                () -> service.assign(9L, new AssignRecruiterRequest(2L, "CO_RECRUITER")));
        assertEquals("ALREADY_ASSIGNED", ex.getCode());
        verify(assignments, never()).save(any());
    }

    @Test
    void assignRejectsCandidate() {
        User candidate = staff(8L, "CANDIDATE", "Candidate");
        when(access.actor()).thenReturn(admin);
        when(jobs.findById(9L)).thenReturn(Optional.of(job));
        when(users.findById(8L)).thenReturn(Optional.of(candidate));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> service.assign(9L, new AssignRecruiterRequest(8L, "CO_RECRUITER")));
        assertEquals("INVALID_RECRUITER", ex.getCode());
    }

    @Test
    void assignRejectsNonAdmin() {
        when(access.actor()).thenReturn(recruiter);

        BusinessException ex = assertThrows(BusinessException.class,
                () -> service.assign(9L, new AssignRecruiterRequest(2L, "CO_RECRUITER")));
        assertEquals("FORBIDDEN", ex.getCode());
    }

    @Test
    void updateRoleChangesCoToPrimary() {
        JobAssignment row = assignment(11L, recruiter, AssignmentRole.CO_RECRUITER);
        when(access.actor()).thenReturn(admin);
        when(jobs.findById(9L)).thenReturn(Optional.of(job));
        when(assignments.findByJob_IdAndUser_Id(9L, 2L)).thenReturn(Optional.of(row));
        when(assignments.findByJob_IdAndAssignmentRole(9L, AssignmentRole.PRIMARY_RECRUITER))
                .thenReturn(Optional.empty());
        when(assignments.save(row)).thenReturn(row);

        JobAssignmentResponse response = service.updateRole(9L, 2L, new UpdateAssignmentRequest("PRIMARY_RECRUITER"));

        assertEquals("PRIMARY_RECRUITER", response.assignmentRole());
        assertEquals(AssignmentRole.PRIMARY_RECRUITER, row.getAssignmentRole());
    }

    @Test
    void removeDeletesAssignment() {
        JobAssignment row = assignment(11L, recruiter, AssignmentRole.CO_RECRUITER);
        when(access.actor()).thenReturn(admin);
        when(jobs.findById(9L)).thenReturn(Optional.of(job));
        when(assignments.findByJob_IdAndUser_Id(9L, 2L)).thenReturn(Optional.of(row));

        service.remove(9L, 2L);

        verify(assignments).delete(row);
    }

    @Test
    void assignCreatorSkipsAdminOwner() {
        service.assignCreator(job);
        verify(assignments, never()).save(any());
    }

    @Test
    void assignCreatorSavesPrimaryForRecruiter() {
        job.setCreatedBy(recruiter);
        job.setId(9L);
        when(assignments.existsByJob_IdAndUser_Id(9L, 2L)).thenReturn(false);

        service.assignCreator(job);

        ArgumentCaptor<JobAssignment> captor = ArgumentCaptor.forClass(JobAssignment.class);
        verify(assignments).save(captor.capture());
        assertEquals(AssignmentRole.PRIMARY_RECRUITER, captor.getValue().getAssignmentRole());
        assertEquals(recruiter, captor.getValue().getUser());
    }

    @Test
    void listRequiresJobAccess() {
        when(jobs.findById(9L)).thenReturn(Optional.of(job));
        when(assignments.findByJob_IdOrderByIdAsc(9L)).thenReturn(List.of());

        assertEquals(0, service.list(9L).size());
        verify(access).requireJob(job);
    }

    private static User staff(Long id, String role, String name) {
        User user = new User();
        user.setId(id);
        user.setEmail(name.toLowerCase() + "@tenant.test");
        user.setFullName(name);
        user.setRole(role);
        user.setStatus(UserStatus.ACTIVE);
        return user;
    }

    private JobAssignment assignment(Long id, User user, AssignmentRole role) {
        JobAssignment row = new JobAssignment();
        row.setId(id);
        row.setJob(job);
        row.setUser(user);
        row.setAssignmentRole(role);
        row.setAssignedBy(admin);
        return row;
    }
}
