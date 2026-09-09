package com.smarthire.config;

import com.smarthire.multitenancy.datasource.DynamicMultiTenantConnectionProvider;
import com.smarthire.multitenancy.resolver.CurrentTenantIdentifierResolverImpl;
import jakarta.persistence.EntityManagerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.*;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.orm.jpa.*;
import org.springframework.orm.jpa.vendor.HibernateJpaVendorAdapter;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.EnableTransactionManagement;
import java.util.Map;

@Configuration
@EnableTransactionManagement
@EnableJpaRepositories(basePackages = "com.smarthire.domain.tenant",
        entityManagerFactoryRef = "tenantEntityManagerFactory", transactionManagerRef = "tenantTransactionManager")
public class MultiTenantJpaConfig {
    @Bean(name = {"tenantEntityManagerFactory", "entityManagerFactory"})
    @Primary
    public LocalContainerEntityManagerFactoryBean tenantEntityManagerFactory(
            DynamicMultiTenantConnectionProvider provider, CurrentTenantIdentifierResolverImpl resolver) {
        var factory = new LocalContainerEntityManagerFactoryBean();
        factory.setPersistenceUnitName("tenant");
        factory.setPackagesToScan("com.smarthire.domain.tenant");
        factory.setJpaVendorAdapter(new HibernateJpaVendorAdapter());
        factory.setJpaPropertyMap(Map.of(
                "hibernate.dialect", "org.hibernate.dialect.MySQLDialect",
                "hibernate.boot.allow_jdbc_metadata_access", false,
                "hibernate.temp.use_jdbc_metadata_defaults", false,
                "hibernate.hbm2ddl.auto", "none",
                "hibernate.multi_tenant_connection_provider", provider,
                "hibernate.tenant_identifier_resolver", resolver));
        return factory;
    }

    @Bean(name = {"tenantTransactionManager", "transactionManager"})
    @Primary
    public PlatformTransactionManager tenantTransactionManager(
            @Qualifier("tenantEntityManagerFactory") EntityManagerFactory factory) {
        return new JpaTransactionManager(factory);
    }
}
