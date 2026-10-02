import java.io.Reader;
import java.nio.file.*;
import java.sql.*;
import java.util.*;
import org.flywaydb.core.Flyway;

/** Apply only V22 across provisioned tenants without rewriting older migration history. */
public class QuestionSkillsCheck {
    public static void main(String[] args) throws Exception {
        if (args.length != 1 || !(args[0].equals("all") || args[0].matches("smarthire_tenant_assessment_verify_[a-z0-9_]+"))) {
            throw new IllegalArgumentException("Usage: QuestionSkillsCheck all|smarthire_tenant_assessment_verify_<name>");
        }
        Properties env = new Properties();
        try (Reader r = Files.newBufferedReader(Path.of(".env"))) { env.load(r); }
        var uri = java.net.URI.create(env.getProperty("TENANT_PROVISIONING_URL").substring(5));
        String base = "jdbc:mysql://" + uri.getHost() + ":" + (uri.getPort() < 0 ? 3306 : uri.getPort()) + "/";
        String options = "?allowPublicKeyRetrieval=true&sslMode=PREFERRED";
        String user = env.getProperty("TENANT_PROVISIONING_USERNAME");
        String password = env.getProperty("TENANT_PROVISIONING_PASSWORD");
        List<String> databases = new ArrayList<>();
        try (Connection c = DriverManager.getConnection(base + options, user, password);
                Statement s = c.createStatement(); ResultSet r = s.executeQuery("SELECT schema_name FROM information_schema.schemata ORDER BY schema_name")) {
            while (r.next()) {
                String db = r.getString(1);
                if (db.matches("smarthire_tenant_[a-z0-9_]+") && (args[0].equals("all") || args[0].equals(db))) databases.add(db);
            }
        }
        if (databases.isEmpty()) throw new IllegalStateException("No matching database");
        Path location = Files.createTempDirectory(Path.of("target"), "question-skills-v22-");
        Path migration = location.resolve("V22__question_skills.sql");
        List<String> failures = new ArrayList<>();
        try {
            Files.copy(Path.of("src/main/resources/db/migration/tenant").resolve(migration.getFileName()), migration);
            for (String db : databases) {
                String url = base + db + options;
                try (Connection c = DriverManager.getConnection(url, user, password); Statement s = c.createStatement()) {
                    int ready;
                    try (ResultSet r = s.executeQuery("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name IN ('questions','skills','flyway_schema_history')")) {
                        r.next(); ready = r.getInt(1);
                    }
                    if (ready != 3) { System.out.println("NOT_PROVISIONED " + db); continue; }
                    try (ResultSet r = s.executeQuery("SELECT COUNT(*) FROM flyway_schema_history WHERE version='21' AND success=1")) {
                        r.next(); if (r.getInt(1) != 1) throw new IllegalStateException("V21 required");
                    }
                    var flyway = Flyway.configure().dataSource(url, user, password)
                            .locations("filesystem:" + location.toAbsolutePath().toString().replace('\\', '/'))
                            .ignoreMigrationPatterns("*:missing").validateOnMigrate(true)
                            .cleanDisabled(true).baselineOnMigrate(false).target("22").load();
                    flyway.migrate();
                    if (flyway.migrate().migrationsExecuted != 0) throw new IllegalStateException("Unexpected second migration");
                    try (ResultSet r = s.executeQuery("SELECT COUNT(*) FROM information_schema.referential_constraints WHERE constraint_schema=DATABASE() AND table_name='questionskills' AND delete_rule='CASCADE'")) {
                        r.next(); if (r.getInt(1) != 2) throw new IllegalStateException("Expected two cascading FKs");
                    }
                    if (!args[0].equals("all")) verifyConstraints(c);
                    System.out.println("PASS " + db);
                } catch (Exception ex) {
                    failures.add(db);
                    System.out.println("FAILED " + db + " (" + ex.getClass().getSimpleName() + ")");
                }
            }
        } finally {
            Files.deleteIfExists(migration);
            Files.deleteIfExists(location);
        }
        if (!failures.isEmpty()) throw new IllegalStateException("Unfinished databases: " + failures);
    }

    static void verifyConstraints(Connection c) throws SQLException {
        c.setAutoCommit(false);
        try (Statement s = c.createStatement()) {
            long user = insert(s, "INSERT INTO users(email,full_name,role) VALUES ('qs-" + UUID.randomUUID() + "@example.test','Fixture','RECRUITER')");
            long job = insert(s, "INSERT INTO jobs(title,description,created_by) VALUES ('Fixture','Fixture'," + user + ")");
            long test = insert(s, "INSERT INTO tests(job_id,title,duration_minutes) VALUES (" + job + ",'Fixture',30)");
            long q1 = insert(s, "INSERT INTO questions(test_id,question_text,question_type) VALUES (" + test + ",'Q1','MCQ')");
            long q2 = insert(s, "INSERT INTO questions(test_id,question_text,question_type) VALUES (" + test + ",'Q2','MCQ')");
            long skill1 = insert(s, "INSERT INTO skills(name) VALUES ('qs-" + UUID.randomUUID() + "')");
            long skill2 = insert(s, "INSERT INTO skills(name) VALUES ('qs-" + UUID.randomUUID() + "')");
            s.executeUpdate("INSERT INTO questionskills VALUES (" + q1 + "," + skill1 + "),(" + q1 + "," + skill2 + "),(" + q2 + "," + skill1 + ")");
            expectError(s, "INSERT INTO questionskills VALUES (" + q1 + "," + skill1 + ")", 1062);
            expectError(s, "INSERT INTO questionskills VALUES (-1," + skill1 + ")", 1452);
            expectError(s, "INSERT INTO questionskills VALUES (" + q1 + ",-1)", 1452);
            s.executeUpdate("DELETE FROM questions WHERE id=" + q1);
            s.executeUpdate("DELETE FROM skills WHERE id=" + skill1);
            try (ResultSet r = s.executeQuery("SELECT COUNT(*) FROM questionskills WHERE question_id IN (" + q1 + "," + q2 + ")")) {
                r.next(); if (r.getInt(1) != 0) throw new IllegalStateException("Cascade cleanup failed");
            }
            System.out.println("PASS many-to-many, duplicate PK rejection, both FK rejections, both delete cascades");
        } finally { c.rollback(); c.setAutoCommit(true); }
    }

    static long insert(Statement s, String sql) throws SQLException {
        s.executeUpdate(sql, Statement.RETURN_GENERATED_KEYS);
        try (ResultSet r = s.getGeneratedKeys()) { r.next(); return r.getLong(1); }
    }

    static void expectError(Statement s, String sql, int code) throws SQLException {
        try { s.executeUpdate(sql); }
        catch (SQLException ex) { if (ex.getErrorCode() == code) return; throw ex; }
        throw new IllegalStateException("Expected constraint violation " + code);
    }
}
