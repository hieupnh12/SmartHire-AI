import java.io.Reader;
import java.nio.file.*;
import java.sql.*;
import java.util.*;
import org.flywaydb.core.Flyway;

/** Targeted V21 rollout for tenants whose earlier migration history differs from this checkout. */
public class LegacyCleanupCheck {
    public static void main(String[] args) throws Exception {
        if (args.length != 2 || !Set.of("inspect", "migrate").contains(args[0])
                || !(args[1].equals("all") || args[1].matches("smarthire_tenant_[a-z0-9_]+"))) {
            throw new IllegalArgumentException("Usage: LegacyCleanupCheck inspect|migrate all|smarthire_tenant_<name>");
        }
        Properties env = new Properties();
        try (Reader r = Files.newBufferedReader(Path.of(".env"))) { env.load(r); }
        var uri = java.net.URI.create(env.getProperty("TENANT_PROVISIONING_URL", "jdbc:mysql://127.0.0.1:3306/").substring(5));
        String url = "jdbc:mysql://" + uri.getHost() + ":" + (uri.getPort() < 0 ? 3306 : uri.getPort())
                + "/" + args[1] + "?allowPublicKeyRetrieval=true&sslMode=PREFERRED";
        String user = env.getProperty("TENANT_PROVISIONING_USERNAME", "smarthire_provisioner");
        String password = env.getProperty("TENANT_PROVISIONING_PASSWORD", "");
        if (args[1].equals("all")) {
            String server = url.replace("/all?", "/?");
            List<String> databases = new ArrayList<>();
            try (Connection c = DriverManager.getConnection(server, user, password);
                    Statement s = c.createStatement(); ResultSet r = s.executeQuery("SELECT schema_name FROM information_schema.schemata ORDER BY schema_name")) {
                while (r.next()) {
                    String name = r.getString(1);
                    if (name.matches("smarthire_tenant_[a-z0-9_]+")) databases.add(name);
                }
            }
            List<String> failures = new ArrayList<>();
            for (String database : databases) {
                System.out.println("TENANT " + database);
                String tenantUrl = url.replace("/all?", "/" + database + "?");
                try (Connection c = DriverManager.getConnection(tenantUrl, user, password)) {
                    var tables = rows(c, false);
                    boolean initialized = false;
                    try (Statement s = c.createStatement(); ResultSet r = s.executeQuery(
                            "SELECT COUNT(*) FROM flyway_schema_history WHERE version='12' AND success=1")) {
                        r.next(); initialized = r.getInt(1) == 1;
                    } catch (SQLException ex) {
                        if (ex.getErrorCode() != 1146) throw ex;
                    }
                    if (!initialized) {
                        if (!rows(c, true).isEmpty() || tables.containsKey("assessments") || tables.containsKey("attempts")) {
                            throw new IllegalStateException("Old model requires prerequisite migrations before V21");
                        }
                        System.out.println("NOT_PROVISIONED: no old assessment model or legacy; V21 will run during provisioning.");
                        continue;
                    }
                    main(new String[] {args[0], database});
                } catch (Exception ex) {
                    failures.add(database);
                    System.out.println("FAILED " + database + " (" + ex.getClass().getSimpleName() + "); inspect this tenant separately.");
                }
            }
            if (!failures.isEmpty()) throw new IllegalStateException("Unfinished tenants: " + failures);
            System.out.println("PASS: checked all " + databases.size() + " tenant databases visible on the provisioning server.");
            return;
        }
        try (Connection c = DriverManager.getConnection(url, user, password)) {
            var before = rows(c, false);
            var keys = foreignKeys(c);
            var legacy = rows(c, true);
            System.out.println("Legacy row counts: " + legacy);
            System.out.println("Current tables=" + before.size() + ", current FKs=" + keys.size());
            try (Statement s = c.createStatement(); ResultSet r = s.executeQuery(
                    "SELECT table_schema,table_name,constraint_name FROM information_schema.key_column_usage "
                    + "WHERE referenced_table_schema=DATABASE() AND LEFT(referenced_table_name,11)='legacy_v12_' "
                    + "AND (table_schema<>DATABASE() OR LEFT(table_name,11)<>'legacy_v12_')")) {
                if (r.next()) throw new IllegalStateException("Unexpected incoming FK: " + r.getString(1) + "." + r.getString(2) + ":" + r.getString(3));
            }
            try (Statement s = c.createStatement(); ResultSet r = s.executeQuery(
                    "SELECT COUNT(*) FROM flyway_schema_history WHERE version='12' AND success=1")) {
                r.next();
                if (r.getInt(1) != 1) throw new IllegalStateException("V12 must already be applied");
            }
            if (args[0].equals("inspect")) return;
            Path location = Files.createTempDirectory(Path.of("target"), "legacy-v21-");
            Path migration = location.resolve("V21__drop_legacy_assessment_interview_tables.sql");
            try {
                Files.copy(Path.of("src/main/resources/db/migration/tenant").resolve(migration.getFileName()), migration);
                // Resolve only V21. Earlier applied migrations are intentionally missing here;
                // validate V21 normally and never repair or rewrite prior history.
                var flyway = Flyway.configure().dataSource(url, user, password)
                        .locations("filesystem:" + location.toAbsolutePath().toString().replace('\\', '/'))
                        .ignoreMigrationPatterns("*:missing").validateOnMigrate(true)
                        .cleanDisabled(true).baselineOnMigrate(false).target("21").load();
                flyway.migrate();
                if (flyway.migrate().migrationsExecuted != 0) throw new IllegalStateException("Second migration was not a no-op");
            } finally {
                Files.deleteIfExists(migration);
                Files.deleteIfExists(location);
            }
            if (!rows(c, true).isEmpty()) throw new IllegalStateException("Legacy tables remain");
            if (!before.equals(rows(c, false))) throw new IllegalStateException("Current table row counts changed; check concurrent writes");
            if (!keys.equals(foreignKeys(c))) throw new IllegalStateException("Current FKs changed");
            try (Statement s = c.createStatement(); ResultSet r = s.executeQuery(
                    "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() "
                    + "AND table_name='ranking_sources' AND column_name IN ('legacy_attempt_id','legacy_interview_id')")) {
                r.next();
                if (r.getInt(1) != 0) throw new IllegalStateException("Legacy ranking columns remain");
            }
            System.out.println("PASS: no legacy tables/columns; current row counts and FK definitions unchanged; second migrate is a no-op.");
        }
    }

    static Map<String, Long> rows(Connection c, boolean legacy) throws SQLException {
        List<String> tables = new ArrayList<>();
        try (Statement s = c.createStatement(); ResultSet r = s.executeQuery(
                "SELECT table_name FROM information_schema.tables WHERE table_schema=DATABASE() "
                + "AND table_type='BASE TABLE' AND table_name<>'flyway_schema_history' ORDER BY table_name")) {
            while (r.next()) {
                String name = r.getString(1);
                if (name.startsWith("legacy_v12_") == legacy) tables.add(name);
            }
        }
        Map<String, Long> counts = new TreeMap<>();
        if (tables.isEmpty()) return counts;
        String sql = String.join(" UNION ALL ", tables.stream()
                .map(t -> "SELECT '" + t.replace("'", "''") + "',COUNT(*) FROM `" + t.replace("`", "``") + "`").toList());
        try (Statement s = c.createStatement(); ResultSet r = s.executeQuery(sql)) {
            while (r.next()) counts.put(r.getString(1), r.getLong(2));
        }
        return counts;
    }

    static Set<String> foreignKeys(Connection c) throws SQLException {
        Set<String> keys = new TreeSet<>();
        try (Statement s = c.createStatement(); ResultSet r = s.executeQuery(
                "SELECT k.table_name,k.column_name,k.constraint_name,k.referenced_table_schema,k.referenced_table_name,"
                + "k.referenced_column_name,k.ordinal_position,r.update_rule,r.delete_rule "
                + "FROM information_schema.key_column_usage k JOIN information_schema.referential_constraints r "
                + "ON r.constraint_schema=k.constraint_schema AND r.table_name=k.table_name AND r.constraint_name=k.constraint_name "
                + "WHERE k.table_schema=DATABASE() AND LEFT(k.table_name,11)<>'legacy_v12_'")) {
            while (r.next()) {
                List<String> fields = new ArrayList<>();
                for (int i = 1; i <= 9; i++) fields.add(r.getString(i));
                keys.add(String.join(":", fields));
            }
        }
        return keys;
    }
}
