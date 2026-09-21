package com.smarthire.domain.tenant.repository;

import com.smarthire.domain.enums.InvitationStatus;
import com.smarthire.domain.tenant.entity.MemberInvitation;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MemberInvitationRepository extends JpaRepository<MemberInvitation, Long> {
    Optional<MemberInvitation> findByTokenHashAndStatus(String tokenHash, InvitationStatus status);

    boolean existsByEmailIgnoreCaseAndStatus(String email, InvitationStatus status);

    boolean existsByRoleAndStatus(String role, InvitationStatus status);
}
