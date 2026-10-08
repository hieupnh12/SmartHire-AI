package com.smarthire.multitenancy.service;

import com.smarthire.domain.master.repository.TenantInfoRepository;
import com.smarthire.master.tenant.dto.TenantAdminRequest;
import com.smarthire.multitenancy.datasource.TenantDataSourceFactory;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class TenantProvisioningServiceTest {

    @Test
    void provisioningUrlAlwaysTargetsTheMysqlServer() {
        assertThat(TenantProvisioningService.serverJdbcUrl("jdbc:mysql://mysql:3306/smarthire_mysql/"))
                .isEqualTo("jdbc:mysql://mysql:3306/");
        assertThat(TenantProvisioningService.serverJdbcUrl(
                "jdbc:mysql://mysql:3306/registry?sslMode=PREFERRED"))
                .isEqualTo("jdbc:mysql://mysql:3306/?sslMode=PREFERRED");
    }

    @Test
    void rejectsNonMysqlProvisioningUrl() {
        assertThatThrownBy(() -> TenantProvisioningService.serverJdbcUrl("jdbc:postgresql://db/master"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void seedAdminInvitationInsertsPendingInvitationWithHashedTokenInsteadOfStaticPassword() throws Exception {
        DataSource master = mock(DataSource.class);
        TenantInfoRepository tenants = mock(TenantInfoRepository.class);
        TenantDataSourceFactory factory = mock(TenantDataSourceFactory.class);
        TenantCredentialService credentials = mock(TenantCredentialService.class);
        TenantProvisioningService service = new TenantProvisioningService(
                master, tenants, factory, credentials, "jdbc:mysql://localhost:3306/", "root", "pass", 72L);

        DataSource tenantPool = mock(DataSource.class);
        Connection conn = mock(Connection.class);
        PreparedStatement userQuery = mock(PreparedStatement.class);
        ResultSet userRs = mock(ResultSet.class);
        PreparedStatement pendingQuery = mock(PreparedStatement.class);
        ResultSet pendingRs = mock(ResultSet.class);
        PreparedStatement insertInvite = mock(PreparedStatement.class);

        when(tenantPool.getConnection()).thenReturn(conn);
        when(conn.prepareStatement(contains("SELECT role FROM users"))).thenReturn(userQuery);
        when(userQuery.executeQuery()).thenReturn(userRs);
        when(userRs.next()).thenReturn(false);

        when(conn.prepareStatement(contains("SELECT id FROM member_invitations"))).thenReturn(pendingQuery);
        when(pendingQuery.executeQuery()).thenReturn(pendingRs);
        when(pendingRs.next()).thenReturn(false);

        when(conn.prepareStatement(contains("INSERT INTO member_invitations"))).thenReturn(insertInvite);

        TenantAdminRequest admin = new TenantAdminRequest();
        admin.setAdminEmail("Admin@Acme.com");
        admin.setAdminName("Acme Admin");

        String rawToken = service.seedAdminInvitation(tenantPool, admin);

        assertThat(rawToken).isNotBlank();
        ArgumentCaptor<String> hashCaptor = ArgumentCaptor.forClass(String.class);
        verify(insertInvite).setString(eq(1), eq("admin@acme.com"));
        verify(insertInvite).setString(eq(2), eq("Acme Admin"));
        verify(insertInvite).setString(eq(3), hashCaptor.capture());
        assertThat(hashCaptor.getValue())
                .isEqualTo(TenantProvisioningService.sha256(rawToken))
                .isNotEqualTo(rawToken);
        verify(insertInvite).executeUpdate();
        verify(conn).commit();
    }
}
