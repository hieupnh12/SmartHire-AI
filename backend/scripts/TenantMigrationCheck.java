import java.nio.file.*;
import java.io.*;
import java.sql.*;
import java.util.*;
import org.flywaydb.core.Flyway;

/** Run from backend with the Maven test classpath. Never prints credentials or user rows. */
public class TenantMigrationCheck {
    public static void main(String[] args) throws Exception {
        if (args.length != 2 || !Set.of("inspect", "verify", "migrate").contains(args[0])
                || !args[1].matches("smarthire_tenant_[a-z0-9_]+")) {
            throw new IllegalArgumentException("Usage: TenantMigrationCheck inspect|verify|migrate smarthire_tenant_<name>");
        }
        Properties env = new Properties();
        try (Reader reader = Files.newBufferedReader(Path.of(".env"))) { env.load(reader); }
        String base = env.getProperty("TENANT_PROVISIONING_URL", "jdbc:mysql://127.0.0.1:3306/");
        java.net.URI uri = java.net.URI.create(base.substring(5));
        String server = "jdbc:mysql://" + uri.getHost() + ":" + (uri.getPort() < 0 ? 3306 : uri.getPort()) + "/";
        String options = "?allowPublicKeyRetrieval=true&sslMode=PREFERRED";
        String user = env.getProperty("TENANT_PROVISIONING_USERNAME", "smarthire_provisioner");
        String password = env.getProperty("TENANT_PROVISIONING_PASSWORD", "");
        boolean verify = args[0].equals("verify");
        if (verify) {
            if (!args[1].startsWith("smarthire_tenant_assessment_verify_")) throw new IllegalArgumentException("Verification requires a dedicated test database");
            try (Connection connection = DriverManager.getConnection(server + options, user, password); Statement s = connection.createStatement()) {
                s.execute("CREATE DATABASE `" + args[1] + "`");
            }
        }
        String url = server + args[1] + options;
        var config = Flyway.configure().dataSource(url, user, password)
                .locations("filesystem:src/main/resources/db/migration/tenant")
                .cleanDisabled(true).validateOnMigrate(false).baselineOnMigrate(false);
        if (verify) {
            config.target("11").load().migrate();
            try (Connection connection = DriverManager.getConnection(url, user, password); Statement s = connection.createStatement()) {
                s.executeUpdate("INSERT INTO users (email,full_name,role) VALUES ('migration@example.test','Migration test','RECRUITER')");
                s.executeUpdate("INSERT INTO jobs (title,description,created_by) SELECT 'Migration test','Fixture',id FROM users WHERE email='migration@example.test'");
                s.executeUpdate("INSERT INTO assessments (job_id,title,duration_seconds) SELECT id,'Preserved test',1800 FROM jobs WHERE title='Migration test'");
                s.executeUpdate("INSERT INTO questions (assessment_id,question_type,prompt,points) SELECT id,'MCQ','Preserved question',1 FROM assessments");
            }
        }
        if (!args[0].equals("inspect")) {
            config.target("latest").load().migrate();
            config.load().migrate();
        }
        try (Connection connection = DriverManager.getConnection(url, user, password); Statement s = connection.createStatement()) {
            try (ResultSet rs = s.executeQuery("SELECT version,script,success FROM flyway_schema_history ORDER BY installed_rank")) {
                while (rs.next()) System.out.println(rs.getString(1) + " " + rs.getString(2) + " " + rs.getBoolean(3));
            }
            for (String table : List.of("tests", "questions", "options", "submissions", "answers", "legacy_v12_assessments", "legacy_v12_questions")) {
                try (PreparedStatement check = connection.prepareStatement("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?")) {
                    check.setString(1, table);
                    try (ResultSet rs = check.executeQuery()) {
                        rs.next();
                        if (rs.getInt(1) == 0) {
                            if (!args[0].equals("inspect")) throw new IllegalStateException("Missing expected table: " + table);
                            System.out.println(table + " MISSING");
                            continue;
                        }
                    }
                }
                try (ResultSet rs = s.executeQuery("SELECT COUNT(*) FROM `" + table + "`")) {
                    rs.next(); long count = rs.getLong(1); System.out.println(table + " rows=" + count);
                    if (verify && table.startsWith("legacy_v12_") && count != 1) throw new IllegalStateException("Archive data not preserved");
                }
            }
        }
    }
}
