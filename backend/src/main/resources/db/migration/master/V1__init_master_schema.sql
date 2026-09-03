-- Master DB Schema for SmartHire-AI SaaS Platform
-- Manages Tenants, Subscription Plans, Billing & Platform Admins

CREATE TABLE IF NOT EXISTS subscription_plans (
    id                      BIGINT PRIMARY KEY AUTO_INCREMENT,
    code                    VARCHAR(64) NOT NULL,
    name                    VARCHAR(128) NOT NULL,
    description             TEXT NULL,
    price_monthly           DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    price_yearly            DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    max_jobs                INT NOT NULL DEFAULT 5,
    max_cv_parses           INT NOT NULL DEFAULT 100,
    max_ai_interview_hours  INT NOT NULL DEFAULT 10,
    status                  VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    created_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_plans_code (code)
);

CREATE TABLE IF NOT EXISTS tenants (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    code            VARCHAR(64) NOT NULL,
    name            VARCHAR(255) NOT NULL,
    subdomain       VARCHAR(128) NOT NULL,
    db_name         VARCHAR(128) NOT NULL,
    db_url          VARCHAR(512) NULL,
    db_username     VARCHAR(128) NULL,
    db_password     VARCHAR(255) NULL,
    status          VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_tenants_code (code),
    UNIQUE KEY uk_tenants_subdomain (subdomain),
    UNIQUE KEY uk_tenants_dbname (db_name)
);

CREATE TABLE IF NOT EXISTS tenant_subscriptions (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    tenant_id       BIGINT NOT NULL,
    plan_id         BIGINT NOT NULL,
    status          VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    starts_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ends_at         TIMESTAMP NULL,
    auto_renew      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_ts_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id),
    CONSTRAINT fk_ts_plan FOREIGN KEY (plan_id) REFERENCES subscription_plans (id)
);

CREATE TABLE IF NOT EXISTS invoices (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    tenant_id       BIGINT NOT NULL,
    subscription_id BIGINT NULL,
    amount          DECIMAL(10,2) NOT NULL,
    currency        VARCHAR(8) NOT NULL DEFAULT 'USD',
    status          VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    payment_gateway VARCHAR(64) NULL,
    transaction_id  VARCHAR(255) NULL,
    paid_at         TIMESTAMP NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_inv_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id)
);

CREATE TABLE IF NOT EXISTS platform_users (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    email           VARCHAR(255) NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    full_name       VARCHAR(255) NOT NULL,
    role            VARCHAR(32) NOT NULL DEFAULT 'SUPER_ADMIN',
    status          VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_platform_users_email (email)
);
