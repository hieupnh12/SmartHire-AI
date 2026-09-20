package com.smarthire.multitenancy.datasource;

import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.master.entity.TenantInfo;
import com.smarthire.multitenancy.service.TenantRegistryService;
import com.zaxxer.hikari.HikariDataSource;
import jakarta.annotation.PreDestroy;
import org.hibernate.engine.jdbc.connections.spi.MultiTenantConnectionProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import java.sql.Connection;
import java.sql.SQLException;
import java.util.LinkedHashMap;
import java.util.Map;

@Component
public class DynamicMultiTenantConnectionProvider implements MultiTenantConnectionProvider<String> {
    private static final Logger log = LoggerFactory.getLogger(DynamicMultiTenantConnectionProvider.class);
    private final ObjectProvider<TenantRegistryService> registry;
    private final TenantDataSourceFactory factory;
    private final int maxPools;
    private final Map<String, HikariDataSource> pools = new LinkedHashMap<>(16, 0.75f, true);

    public DynamicMultiTenantConnectionProvider(ObjectProvider<TenantRegistryService> registry,
            TenantDataSourceFactory factory, @Value("${app.tenant.max-pools:20}") int maxPools) {
        if (maxPools < 1) throw new IllegalArgumentException("Tenant pool limit must be positive");
        this.registry = registry;
        this.factory = factory;
        this.maxPools = maxPools;
    }

    @Override
    public Connection getAnyConnection() throws SQLException {
        throw new SQLException("Tenant metadata access is disabled; no default tenant connection exists");
    }

    @Override
    public void releaseAnyConnection(Connection connection) throws SQLException { connection.close(); }

    @Override
    public synchronized Connection getConnection(String identifier) throws SQLException {
        // Recheck status on every acquisition, including cached pools and worker requests.
        TenantInfo tenant = registry.getObject().requireActive(identifier);
        HikariDataSource pool = pools.get(tenant.getCode());
        if (pool == null) {
            evictIdlePoolIfFull();
            HikariDataSource created = null;
            try {
                created = factory.create(tenant);
                factory.migrate(created);
                pools.put(tenant.getCode(), created);
                pool = created;
            } catch (Exception ex) {
                if (created != null) created.close();
                log.error("Failed to open tenant database [{}]", tenant.getCode(), ex);
                throw new BusinessException(
                        "Tenant database is unavailable: " + brief(ex),
                        HttpStatus.SERVICE_UNAVAILABLE,
                        "TENANT_DATABASE_UNAVAILABLE",
                        ex);
            }
        }
        try {
            return pool.getConnection();
        } catch (SQLException ex) {
            log.error("Failed to borrow tenant connection [{}]", tenant.getCode(), ex);
            throw new BusinessException(
                    "Tenant database is unavailable: " + brief(ex),
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "TENANT_DATABASE_UNAVAILABLE",
                    ex);
        }
    }

    private static String brief(Throwable ex) {
        Throwable current = ex;
        while (current.getCause() != null && current.getCause() != current) {
            current = current.getCause();
        }
        String message = current.getMessage() == null ? current.getClass().getSimpleName() : current.getMessage();
        return message.length() > 180 ? message.substring(0, 180) : message;
    }

    private void evictIdlePoolIfFull() {
        if (pools.size() < maxPools) return;
        var iterator = pools.entrySet().iterator();
        while (iterator.hasNext()) {
            var entry = iterator.next();
            if (entry.getValue().getHikariPoolMXBean().getActiveConnections() == 0) {
                entry.getValue().close();
                iterator.remove();
                return;
            }
        }
        throw new BusinessException("Tenant connection capacity reached", HttpStatus.SERVICE_UNAVAILABLE,
                "TENANT_POOL_CAPACITY");
    }

    public synchronized void evict(String code) {
        HikariDataSource pool = pools.remove(code);
        if (pool != null) pool.close();
    }

    @PreDestroy
    public synchronized void close() {
        pools.values().forEach(HikariDataSource::close);
        pools.clear();
    }

    @Override
    public void releaseConnection(String tenant, Connection connection) throws SQLException { connection.close(); }
    @Override
    public boolean supportsAggressiveRelease() { return false; }
    @Override
    public boolean isUnwrappableAs(Class<?> type) { return type.isInstance(this); }
    @Override
    public <T> T unwrap(Class<T> type) {
        if (!type.isInstance(this)) throw new IllegalArgumentException("Unsupported unwrap type");
        return type.cast(this);
    }
}
