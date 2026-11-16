-- V40: Standardize default subscription plan names (remove redundant language suffixes in parentheses)
-- Dynamic localization (EN / VI / JA) is handled seamlessly at runtime by the i18n layer.

UPDATE subscription_plans
SET name = 'Gói Khởi Đầu'
WHERE code = 'STARTER' AND (name LIKE '%Starter%' OR name LIKE '%(Starter)%');

UPDATE subscription_plans
SET name = 'Gói Chuyên Nghiệp'
WHERE code = 'PROFESSIONAL' AND (name LIKE '%Professional%' OR name LIKE '%(Professional)%');

UPDATE subscription_plans
SET name = 'Gói Doanh Nghiệp'
WHERE code = 'ENTERPRISE' AND (name LIKE '%Enterprise%' OR name LIKE '%Enterprise Scale%');

UPDATE tenant_subscriptions
SET plan_name_snapshot = 'Gói Khởi Đầu'
WHERE plan_code_snapshot = 'STARTER' AND (plan_name_snapshot LIKE '%Starter%' OR plan_name_snapshot LIKE '%(Starter)%');

UPDATE tenant_subscriptions
SET plan_name_snapshot = 'Gói Chuyên Nghiệp'
WHERE plan_code_snapshot = 'PROFESSIONAL' AND (plan_name_snapshot LIKE '%Professional%' OR plan_name_snapshot LIKE '%(Professional)%');

UPDATE tenant_subscriptions
SET plan_name_snapshot = 'Gói Doanh Nghiệp'
WHERE plan_code_snapshot = 'ENTERPRISE' AND (plan_name_snapshot LIKE '%Enterprise%' OR plan_name_snapshot LIKE '%Enterprise Scale%');
