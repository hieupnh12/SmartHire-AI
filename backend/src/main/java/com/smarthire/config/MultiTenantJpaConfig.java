package com.smarthire.config;

import com.smarthire.multitenancy.datasource.DynamicMultiTenantConnectionProvider;
import com.smarthire.multitenancy.resolver.CurrentTenantIdentifierResolverImpl;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.autoconfigure.orm.jpa.JpaProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.orm.jpa.JpaTransactionManager;
import org.springframework.orm.jpa.LocalContainerEntityManagerFactoryBean;
import org.springframework.orm.jpa.vendor.HibernateJpaVendorAdapter;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.EnableTransactionManagement;

import javax.sql.DataSource;
import java.util.HashMap;
import java.util.Map;

@Configuration
@EnableTransactionManagement
@EnableJpaRepositories(
        basePackages = "com.smarthire.domain",
        entityManagerFactoryRef = "entityManagerFactory",
        transactionManagerRef = "transactionManager"
)
public class MultiTenantJpaConfig {

    private final JpaProperties jpaProperties;
    private final DynamicMultiTenantConnectionProvider connectionProvider;
    private final CurrentTenantIdentifierResolverImpl tenantResolver;

    public MultiTenantJpaConfig(JpaProperties jpaProperties,
                                DynamicMultiTenantConnectionProvider connectionProvider,
                                CurrentTenantIdentifierResolverImpl tenantResolver) {
        this.jpaProperties = jpaProperties;
        this.connectionProvider = connectionProvider;
        this.tenantResolver = tenantResolver;
    }

    @Bean
    @Primary
    public LocalContainerEntityManagerFactoryBean entityManagerFactory(@Qualifier("dataSource") DataSource masterDataSource) {
        LocalContainerEntityManagerFactoryBean em = new LocalContainerEntityManagerFactoryBean();
        em.setDataSource(masterDataSource);
        em.setPackagesToScan("com.smarthire.domain.master", "com.smarthire.domain.tenant");

        HibernateJpaVendorAdapter vendorAdapter = new HibernateJpaVendorAdapter();
        em.setJpaVendorAdapter(vendorAdapter);

        Map<String, Object> properties = new HashMap<>(jpaProperties.getProperties());
        properties.put("hibernate.multi_tenant_connection_provider", connectionProvider);
        properties.put("hibernate.tenant_identifier_resolver", tenantResolver);
        properties.put("hibernate.multiTenancy", "DATABASE");
        properties.put("hibernate.hbm2ddl.auto", "none");
        properties.put("hibernate.format_sql", true);

        em.setJpaPropertyMap(properties);
        return em;
    }

    @Bean
    @Primary
    public PlatformTransactionManager transactionManager(LocalContainerEntityManagerFactoryBean entityManagerFactory) {
        JpaTransactionManager transactionManager = new JpaTransactionManager();
        transactionManager.setEntityManagerFactory(entityManagerFactory.getObject());
        return transactionManager;
    }
}
