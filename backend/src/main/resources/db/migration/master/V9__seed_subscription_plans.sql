-- Seed Default Subscription Plans for SmartHire-AI Master DB
INSERT INTO subscription_plans (
    code, name, description, price_monthly, price_yearly, 
    max_jobs, max_cv_parses, max_ai_interview_hours, max_storage_gb, 
    max_proctoring_hours, video_retention_days, status, features_json
) VALUES 
(
    'STARTER',
    'Gói Khởi Đầu (Starter)',
    'Dành cho doanh nghiệp nhỏ và công ty khởi nghiệp có nhu cầu tự động hóa bước đầu.',
    49.00,
    490.00,
    5,
    200,
    5,
    5,
    2,
    30,
    'ACTIVE',
    '{"features":["AI CV Screening","Standard MCQ Tests","Career Site","Email Support"]}'
),
(
    'PROFESSIONAL',
    'Gói Chuyên Nghiệp (Professional)',
    'Tối ưu cho doanh nghiệp đang tăng trưởng nhanh (50 - 200 nhân sự), cần sàng lọc CV và bài test kỹ thuật tự động.',
    149.00,
    1490.00,
    25,
    2500,
    30,
    25,
    15,
    60,
    'ACTIVE',
    '{"features":["AI CV Screening","Code Sandbox Automated Grading","Voice AI Interview (30h)","Career Site","Priority Support"]}'
),
(
    'ENTERPRISE',
    'Gói Doanh Nghiệp (Enterprise Scale)',
    'Hạ tầng Dedicated Database riêng biệt, AI phỏng vấn giọng nói đàm thoại 2 chiều và tích hợp SSO.',
    399.00,
    3990.00,
    100,
    15000,
    150,
    100,
    50,
    180,
    'ACTIVE',
    '{"features":["Unlimited Jobs","Dedicated Database Engine","Voice AI Interview (150h)","SSO Integration (Google/Microsoft)","Custom Grading Weights","SLA 99.99%","24/7 Dedicated Support"]}'
)
ON CONFLICT (code) DO NOTHING;
