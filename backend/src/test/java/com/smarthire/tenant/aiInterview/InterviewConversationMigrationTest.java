package com.smarthire.tenant.aiInterview;

import com.smarthire.domain.tenant.entity.InterviewMessage;
import com.smarthire.domain.tenant.entity.InterviewSession;
import jakarta.persistence.Table;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;
import static org.assertj.core.api.Assertions.*;

class InterviewConversationMigrationTest {
    @Test void migrationEnforcesTurnIdentityAndCascadesMessagesWithTheirAttempt() {
        var dataSource = new DriverManagerDataSource("jdbc:h2:mem:conversation_v44;MODE=MySQL;DB_CLOSE_DELAY=-1", "sa", "");
        var sql = new JdbcTemplate(dataSource); sql.execute("CREATE TABLE ai_interviews (id BIGINT PRIMARY KEY)");
        new ResourceDatabasePopulator(new ClassPathResource("db/migration/tenant/V44__interview_conversation.sql")).execute(dataSource);
        sql.update("INSERT INTO ai_interviews (id) VALUES (11)");
        sql.update("INSERT INTO interview_sessions (id, ai_interview_id, max_turns) VALUES (21,11,3)");
        assertThatThrownBy(() -> sql.update("INSERT INTO interview_sessions (ai_interview_id,max_turns) VALUES (11,3)"))
                .isInstanceOf(DataIntegrityViolationException.class);
        sql.update("INSERT INTO interview_messages (session_id,sequence_no,role,content,client_request_id) VALUES (21,0,'USER','REST','request')");
        assertThatThrownBy(() -> sql.update("INSERT INTO interview_messages (session_id,sequence_no,role,content,client_request_id) VALUES (21,1,'USER','duplicate','request')"))
                .isInstanceOf(DataIntegrityViolationException.class);
        assertThatThrownBy(() -> sql.update("INSERT INTO interview_messages (session_id,sequence_no,role,content) VALUES (21,0,'ASSISTANT','duplicate order')"))
                .isInstanceOf(DataIntegrityViolationException.class);
        sql.update("INSERT INTO interview_messages (session_id,sequence_no,role,content) VALUES (21,1,'ASSISTANT','Question')");
        sql.update("INSERT INTO interview_messages (session_id,sequence_no,role,content) VALUES (21,2,'ASSISTANT','Closing')");
        sql.update("DELETE FROM ai_interviews WHERE id=11");
        assertThat(sql.queryForObject("SELECT COUNT(*) FROM interview_sessions", Integer.class)).isZero();
        assertThat(sql.queryForObject("SELECT COUNT(*) FROM interview_messages", Integer.class)).isZero();
        assertThat(InterviewSession.class.getAnnotation(Table.class).name()).isEqualTo("interview_sessions");
        assertThat(InterviewMessage.class.getAnnotation(Table.class).name()).isEqualTo("interview_messages");
    }
}
