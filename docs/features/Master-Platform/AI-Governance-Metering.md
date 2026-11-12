# MASTER-07 — Quản trị AI Engine, Định tuyến Model, Metering Chi phí & Giới hạn Tốc độ (AI Governance, Cost Tracking & Rate Limiting)

**Code ID:** `MASTER-07`  
**Epic:** Master Platform — SaaS Multi-Tenant Administration  
**Trạng thái:** `Done`

## Mục đích chức năng

Cung cấp trung tâm điều khiển hạ tầng AI cấp nền tảng (**AI Governance, Metering & Rate Limiting — V14, V24, V28**), bao gồm:
1. **Kho khoá API AI tập trung (`ai_provider_keys`):** Lưu trữ mã hoá **AES-256-GCM** các API Key của Gemini, OpenAI, Anthropic, DeepSeek, Groq, Cursor, HuggingFace, v.v. và kiểm tra kết nối trực tiếp (`Live Connection Test`).
2. **Định tuyến Model theo Tác vụ (`ai_model_configs`):** Cấu hình động model chính, chuỗi dự phòng nhiều bước (`fallback_chain` JSON / `failover_provider` & `failover_model`), `temperature`, `max_tokens` và `timeout_seconds` cho từng nghiệp vụ (`CV_PARSING`, `INTERVIEW_GEN`, `INTERVIEW_NLP`, `CODE_GRADING`, `QUESTION_GEN`, `MATCHING`) có cache Redis và tự động chuyển hướng khi model bị HTTP 429 cooldown.
3. **Bảng giá Token & Metering Chi phí AI thực tế (`ai_model_pricings`, `tenant_ai_usage_daily` — V28):** Tự động ghi nhận bất đồng bộ (`CompletableFuture`) số liệu `prompt_tokens`, `completion_tokens`, độ trễ (`latency_ms`) và chi phí USD ước tính sau mỗi lần gọi AI.
4. **Kiểm soát Hạn ngạch AI, Kill Switch & Giới hạn RPM/TPM (`MasterAiUsageAndQuotaService`, `AiRateLimiterService`):** Theo dõi mức tiêu thụ CV/Phỏng vấn AI theo từng tenant, bật/tắt AI Kill Switch (`aiDisabled`) hoặc ghi đè hạn mức CV/Voice (`PUT /api/v1/master/ai/quotas/{tenantId}`), và giới hạn tốc độ ngắn hạn theo phút (mặc định **30 RPM** & **100.000 TPM** mỗi tenant + override riêng từng tenant).

## Actor

- **Workspace Admin (`WORKSPACE_ADMIN`):** Quản lý API Key AI, cấu hình định tuyến & chuỗi fallback theo tác vụ, cập nhật bảng đơn giá USD/1M tokens, giám sát báo cáo tiêu thụ/chi phí AI, cấu hình giới hạn RPM/TPM và ghi đè hạn ngạch hoặc bật Kill Switch cho từng doanh nghiệp.
- **Hệ thống (`DynamicAiConfigProvider`, `AiRateLimiterService`, `AiUsageMeteringService`):** Đọc cấu hình model từ Redis/Master DB, giải mã API Key trong bộ nhớ khi gọi AI, chặn quá tải 429 theo RPM/TPM và ghi nhận bất đồng bộ số liệu token/chi phí.

## Luồng hoạt động

### 1. Quản lý Kho khoá API AI Mã hoá AES-256-GCM
1. Workspace Admin quản lý API Key tại `/admin/system/ai-config` (`POST /api/v1/master/ai/keys`).
2. `MasterAiConfigService.saveProviderKey()` mã hoá chuỗi API Key bằng thuật toán **AES-256-GCM** (`TenantCredentialService`) với context **`"MASTER_AI_KEY"`** trước khi lưu vào cột `api_key_encrypted`, đồng thời xoá sạch cache cấu hình AI (`configProvider.evictAll()`) và ghi `PlatformAuditLog` (`AI_KEY_SAVED`).
3. Khi trả dữ liệu ra API (`GET /api/v1/master/ai/keys`), hệ thống chỉ hiển thị chuỗi che dấu (`maskedKey`), tuyệt đối không trả plaintext key.
4. Admin có thể bấm **Kiểm tra kết nối** (`POST /api/v1/master/ai/test-connection`, hỗ trợ kiểm tra theo `keyId` hoặc trực tiếp theo `provider`/`apiKey`/`modelName`/`endpointUrl`) để ping thực tế endpoint nhà cung cấp và đo độ trễ (`latencyMs`).

### 2. Định tuyến Model AI, Chuỗi Fallback & Cơ chế 429 Cooldown
1. Mỗi tác vụ nghiệp vụ (`CV_PARSING`, `INTERVIEW_GEN`, `INTERVIEW_NLP`, `CODE_GRADING`, `MATCHING`, `QUESTION_GEN`) có một cấu hình trong `ai_model_configs`.
2. `DynamicAiConfigProvider` đọc cấu hình từ cache Redis (`cache:ai:config:<TASK_TYPE>`, cộng hậu tố `:spring-ai-v1` đối với `INTERVIEW_GEN`/`INTERVIEW_NLP`, TTL **6 giờ**); nếu model chính đang bị đánh dấu 429 cooldown trên Redis (`ai:cooldown:<PROVIDER>:<model>`), `resolveConfig()` / `resolveExecutionChain()` tự động chuyển hướng sang bước kế tiếp trong `fallback_chain` JSON (`fallbackSteps`) hoặc `failover_provider`/`failover_model`.
3. Khi Admin cập nhật cấu hình (`PUT /api/v1/master/ai/tasks/{taskType}`), `MasterAiConfigService` xoá ngay cache Redis (`evictCache`) để áp dụng zero-downtime.

### 3. Metering Token, Giới hạn RPM/TPM & Quản trị Hạn ngạch Tenant
1. Trước khi gọi LLM, `AiRateLimiterService.checkAndAcquire()` kiểm tra cửa sổ 1 phút hiện tại của tenant trên Redis (`ratelimit:ai:rpm:<tenant>:<yyyyMMddHHmm>` và `ratelimit:ai:tpm:<tenant>:<yyyyMMddHHmm>`); nếu vượt ngưỡng từ `GET /api/v1/master/ai/rate-limit` (hoặc override RPM riêng của tenant), ném `BusinessException` HTTP `429` (`AI_RPM_LIMIT_EXCEEDED` / `AI_TPM_LIMIT_EXCEEDED`).
2. Sau mỗi lần gọi LLM, `AiUsageMeteringService.recordUsageAsync()` cập nhật ngay bộ đếm TPM theo phút vào Redis và chạy bất đồng bộ qua `CompletableFuture.runAsync` + `TransactionTemplate`:
   - Tra cứu đơn giá trong `ai_model_pricings` (nếu model chưa khai báo đơn giá, áp dụng fallback mặc định **$0.15 / 1M input tokens**, **$0.60 / 1M output tokens** hoặc heuristic theo tên model Pro / GPT-4o / Sonnet):
     $$\text{Cost (USD)} = \frac{\text{promptTokens}}{10^6} \times P_{\text{input}} + \frac{\text{completionTokens}}{10^6} \times P_{\text{output}}$$
   - Cập nhật bảng `tenant_ai_usage_daily` và cộng dồn tổng token vào `tenant_usage_daily.ai_tokens_consumed`.
3. `MasterAiUsageAndQuotaService` tổng hợp báo cáo sử dụng & chi phí đa tháng (`GET /api/v1/master/ai/usage-report?months=6`), hiển thị hạn ngạch/mức dùng từng doanh nghiệp (`GET /api/v1/master/ai/quotas`) và cho phép Admin cập nhật hạn ngạch hoặc bật AI Kill Switch (`PUT /api/v1/master/ai/quotas/{tenantId}` — tự động xoá cache `TenantQuotaRedisService`).

## Business Rules

- API Key của nhà cung cấp AI bắt buộc mã hoá **AES-256-GCM** qua `TenantCredentialService` với context `"MASTER_AI_KEY"` trước khi lưu xuống database; response API chỉ trả `maskedKey`.
- Nếu trong `tenant_ai_usage_daily` chưa có dữ liệu chi tiết theo model cho kỳ cũ, `MasterAiUsageAndQuotaService.getUsageReport()` tự nội suy chi phí ước tính từ `tenant_usage_daily` (`cvParsesCount` & `aiVoiceSeconds`).
- Tiến trình ghi nhận Metering (`AiUsageMeteringService`) chạy bất đồng bộ độc lập với giao dịch nghiệp vụ của Tenant: nếu việc ghi thống kê gặp lỗi, luồng phỏng vấn hoặc chấm CV của ứng viên vẫn không bị gián đoạn.
- Cập nhật cấu hình Rate Limit (`PUT /api/v1/master/ai/rate-limit`) lưu xuống `system_settings` (nhóm `AI_RATE_LIMIT`) và xoá cache `cache:ai:ratelimit:config` ngay lập tức.

## API liên quan

| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| GET | `/api/v1/master/ai/keys` | WORKSPACE_ADMIN | Danh sách API Key AI (đã che dấu `maskedKey`) |
| POST | `/api/v1/master/ai/keys` | WORKSPACE_ADMIN | Thêm hoặc cập nhật API Key AI (mã hoá AES-256-GCM `"MASTER_AI_KEY"`) |
| DELETE | `/api/v1/master/ai/keys/{id}` | WORKSPACE_ADMIN | Xoá API Key AI & xoá cache |
| POST | `/api/v1/master/ai/test-connection` | WORKSPACE_ADMIN | Kiểm tra kết nối trực tiếp theo `keyId` hoặc key nhập tay |
| GET | `/api/v1/master/ai/tasks` | WORKSPACE_ADMIN | Danh sách cấu hình định tuyến Model theo tác vụ |
| PUT | `/api/v1/master/ai/tasks/{taskType}` | WORKSPACE_ADMIN | Cập nhật Model / Temperature / Max Tokens / Timeout / `fallbackSteps` |
| GET | `/api/v1/master/ai/pricings` | WORKSPACE_ADMIN | Danh sách bảng đơn giá USD/1M tokens theo model |
| POST | `/api/v1/master/ai/pricings` | WORKSPACE_ADMIN | Tạo hoặc cập nhật đơn giá Input/Output USD/1M tokens |
| DELETE | `/api/v1/master/ai/pricings/{id}` | WORKSPACE_ADMIN | Xoá mục đơn giá model |
| GET | `/api/v1/master/ai/usage-report` | WORKSPACE_ADMIN | Báo cáo tiêu thụ Token, Độ trễ & Chi phí USD theo tháng/tác vụ/tenant (`?months=6`) |
| GET | `/api/v1/master/ai/quotas` | WORKSPACE_ADMIN | Danh sách hạn mức AI, mức dùng tháng hiện tại & trạng thái Kill Switch của các tenant |
| PUT | `/api/v1/master/ai/quotas/{tenantId}` | WORKSPACE_ADMIN | Ghi đè hạn mức AI (`snapshotMaxCvParses`, `snapshotMaxAiInterviewHours`) hoặc bật/tắt Kill Switch |
| GET | `/api/v1/master/ai/rate-limit` | WORKSPACE_ADMIN | Xem cấu hình giới hạn tốc độ RPM/TPM mặc định và override theo từng tenant |
| PUT | `/api/v1/master/ai/rate-limit` | WORKSPACE_ADMIN | Cập nhật giới hạn RPM/TPM toàn sàn & override từng tenant |

## Database liên quan

- PostgreSQL (`smarthire_master`):
  - `ai_provider_keys` (entity `AiProviderKey`): kho khoá API mã hoá AES-256-GCM.
  - `ai_model_configs` (entity `AiModelConfig`): định tuyến model theo tác vụ (`fallback_chain`, `failover_provider`, `failover_model`).
  - `ai_model_pricings` (entity `AiModelPricing`): bảng đơn giá USD/1M tokens (V28).
  - `tenant_ai_usage_daily` (entity `TenantAiUsageDaily`) & `tenant_usage_daily` (`TenantUsageDaily`): thống kê lượt gọi, lỗi, prompt/completion tokens, độ trễ và chi phí USD theo ngày.
  - `tenant_subscriptions` (`TenantSubscription`), `system_settings` (`SystemSetting`), `platform_audit_logs` (`PlatformAuditLog`).

## UI mockup

- `/admin/system/ai-usage`, `/admin/system/ai-quotas`, `/admin/system/ai-config` ([`AiManagementPage.tsx`](file:///d:/9-CT-PROJECT/CODE/SmartHire-AI/frontend/src/features/master/system/pages/AiManagementPage.tsx), [`SystemManagementWorkspace.tsx`](file:///d:/9-CT-PROJECT/CODE/SmartHire-AI/frontend/src/features/master/system/components/SystemManagementWorkspace.tsx), [`AiEngineConfiguration.tsx`](file:///d:/9-CT-PROJECT/CODE/SmartHire-AI/frontend/src/features/master/system/components/AiEngineConfiguration.tsx), [`AddAiKeyModal.tsx`](file:///d:/9-CT-PROJECT/CODE/SmartHire-AI/frontend/src/features/master/system/components/AddAiKeyModal.tsx)):
  1. Tab **Báo cáo sử dụng AI** (`/admin/system/ai-usage`): KPI tổng quan, xu hướng tiêu thụ 6 tháng, phân bổ chi phí theo tác vụ và bảng sử dụng theo từng doanh nghiệp.
  2. Tab **Hạn ngạch AI** (`/admin/system/ai-quotas`): Giám sát CV parses, giờ phỏng vấn AI theo tháng, ghi đè hạn mức và bật/tắt AI Kill Switch cho từng tenant.
  3. Tab **Cấu hình AI** (`/admin/system/ai-config`): Kho API Key (thêm mới qua `AddAiKeyModal`, test kết nối), định tuyến model theo tác vụ (`fallbackSteps`), bảng đơn giá USD/1M tokens và cấu hình RPM/TPM Rate Limiting.
