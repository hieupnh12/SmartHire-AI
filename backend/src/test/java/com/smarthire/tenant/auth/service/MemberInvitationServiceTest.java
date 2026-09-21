package com.smarthire.tenant.auth.service;

import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.enums.InvitationStatus;
import com.smarthire.domain.enums.RoleWorkspace;
import com.smarthire.domain.enums.UserRole;
import com.smarthire.domain.tenant.entity.MemberInvitation;
import com.smarthire.domain.tenant.entity.TenantRole;
import com.smarthire.domain.tenant.entity.User;
import com.smarthire.domain.tenant.repository.MemberInvitationRepository;
import com.smarthire.domain.tenant.repository.UserRepository;
import com.smarthire.multitenancy.context.TenantContext;
import com.smarthire.tenant.auth.dto.AcceptInvitationRequest;
import com.smarthire.tenant.auth.dto.InviteMemberRequest;
import com.smarthire.tenant.auth.dto.InviteMemberResponse;
import com.smarthire.tenant.auth.dto.UserResponse;
import com.smarthire.tenant.auth.mapper.AuthMapper;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mapstruct.factory.Mappers;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MemberInvitationServiceTest {

    @Mock
    private MemberInvitationRepository invitationRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private InviteMailSender inviteMailSender;
    @Mock
    private TenantRoleService tenantRoleService;
    @Spy
    private AuthMapper authMapper = Mappers.getMapper(AuthMapper.class);

    @InjectMocks
    private MemberInvitationService memberInvitationService;

    @BeforeEach
    void setUp() {
        TenantContext.setCurrentTenant("se36");
        ReflectionTestUtils.setField(memberInvitationService, "publicOrigin", "http://localhost:5173");
        ReflectionTestUtils.setField(memberInvitationService, "expireHours", 72L);
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    @Test
    void invite_StaffRole_PersistsPendingInvitation() {
        when(tenantRoleService.requireAssignable("HR")).thenReturn(role("HR", "HR", RoleWorkspace.RECRUITER));
        when(userRepository.existsByEmailIgnoreCase("hr@se36.com")).thenReturn(false);
        when(invitationRepository.existsByEmailIgnoreCaseAndStatus("hr@se36.com", InvitationStatus.PENDING)).thenReturn(false);
        when(invitationRepository.save(any(MemberInvitation.class))).thenAnswer(call -> call.getArgument(0));
        when(inviteMailSender.send(anyString(), anyString(), anyString())).thenReturn(true);

        InviteMemberResponse response = memberInvitationService.invite(InviteMemberRequest.builder()
                .email("hr@se36.com")
                .fullName("HR User")
                .role("HR")
                .build());

        ArgumentCaptor<MemberInvitation> captor = ArgumentCaptor.forClass(MemberInvitation.class);
        verify(invitationRepository).save(captor.capture());
        assertEquals(InvitationStatus.PENDING, captor.getValue().getStatus());
        assertEquals("HR", captor.getValue().getRole());
        assertTrue(response.isEmailSent());
        assertTrue(response.getAcceptUrl().startsWith("http://se36.localhost:5173/invite/accept?token="));
    }

    @Test
    void invite_CandidateRole_Throws() {
        when(tenantRoleService.requireAssignable("CANDIDATE"))
                .thenThrow(new BusinessException("Candidates cannot be invited as staff",
                        org.springframework.http.HttpStatus.BAD_REQUEST, "INVALID_ROLE"));
        BusinessException ex = assertThrows(BusinessException.class, () -> memberInvitationService.invite(
                InviteMemberRequest.builder().email("a@b.com").fullName("A").role("CANDIDATE").build()));
        assertEquals("INVALID_ROLE", ex.getCode());
    }

    @Test
    void accept_ValidToken_CreatesActiveUser() {
        MemberInvitation invitation = new MemberInvitation();
        invitation.setEmail("recruiter@se36.com");
        invitation.setFullName("Recruiter");
        invitation.setRole(UserRole.RECRUITER.name());
        invitation.setStatus(InvitationStatus.PENDING);
        invitation.setExpiresAt(Instant.now().plus(1, ChronoUnit.HOURS));
        invitation.setTokenHash(MemberInvitationService.sha256("raw-token"));

        when(invitationRepository.findByTokenHashAndStatus(invitation.getTokenHash(), InvitationStatus.PENDING))
                .thenReturn(Optional.of(invitation));
        when(userRepository.existsByEmailIgnoreCase("recruiter@se36.com")).thenReturn(false);
        when(passwordEncoder.encode("secret1")).thenReturn("hashed");
        when(userRepository.save(any(User.class))).thenAnswer(call -> call.getArgument(0));
        when(invitationRepository.save(any(MemberInvitation.class))).thenAnswer(call -> call.getArgument(0));

        UserResponse response = memberInvitationService.accept(AcceptInvitationRequest.builder()
                .token("raw-token")
                .password("secret1")
                .build());

        assertEquals("recruiter@se36.com", response.getEmail());
        assertEquals("RECRUITER", response.getRole());
        assertEquals(InvitationStatus.ACCEPTED, invitation.getStatus());
        verify(userRepository).save(any(User.class));
    }

    @Test
    void accept_UnknownToken_Throws() {
        when(invitationRepository.findByTokenHashAndStatus(anyString(), eq(InvitationStatus.PENDING)))
                .thenReturn(Optional.empty());

        BusinessException ex = assertThrows(BusinessException.class, () -> memberInvitationService.accept(
                AcceptInvitationRequest.builder().token("nope").password("secret1").build()));
        assertEquals("INVITE_INVALID", ex.getCode());
    }

    private static TenantRole role(String code, String name, RoleWorkspace workspace) {
        TenantRole role = new TenantRole();
        role.setCode(code);
        role.setName(name);
        role.setWorkspace(workspace);
        role.setSystem(true);
        return role;
    }
}
