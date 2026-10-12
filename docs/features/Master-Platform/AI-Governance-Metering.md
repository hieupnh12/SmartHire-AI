# MASTER-07 — Quản trị AI Engine, Định tuyến Model & Metering Chi phí (AI Governance & Cost Tracking)

**Code ID:** `MASTER-07`  
**Epic:** Master Platform — SaaS Multi-Tenant Administration  
**Trạng thái:** `Done`

## Mục đích chức năng

Cung cấp trung tâm điều khiển hạ tầng AI cấp nền tảng (**AI Governance & Metering — V14, V24, V28**), bao gồm:
1. **Kho khoá API AI tập trung (`ai_provider_keys`):** Lưu trữ mã hoá **AES-256-GCM** các API Key của Gemini, OpenAI, Anthropic, DeepSeek, HuggingFace và kiểm tra kết nối trực tiếp (Live Connection Test).
2. **Định tuyến Model theo Tác vụ (`ai_model_configs`):** Cấu hình động model chính, model dự phòng (Failover), `temperature`, `max_tokens` và `timeout_seconds` cho từng nghiệp vụ tuyển dụng (`CV_PARSING`, `INTERVIEW_GEN`, `INTERVIEW_NLP`, `CODE_GRADING`, `MATCHING`) có bộ nhớ đệm Redis.
3. **Bảng giá Token & Metering Chi phí AI thực tế (`ai_model_pricings`, `tenant_ai_usage_daily` — V28):** Tự động bóc tách lượng `prompt_tokens`, `completion_tokens`, độ trễ (`latency_ms`) sau mỗi lần gọi AI của từng doanh nghiệp, đối chiếu với bảng đơn giá USD/1M tokens để cộng dồn chi phí AI thực tế theo ngày/tenant/tác vụ/model.

## Actor

- **Workspace Admin (`WORKSPACE_ADMIN`):** Quản lý API Key các nhà cung cấp AI, cấu hình định tuyến model cho từng tác vụ, cập nhật bảng đơn giá USD/1M tokens và giám sát báo cáo tiêu thụ token & chi phí AI theo từng doanh nghiệp.
- **Hệ thống (Dynamic AI Client & Async Metering Service):** Đọc cấu hình model từ Redis/Master DB, giải mã API Key trong bộ nhớ khi gọi AI và ghi nhận bất đồng bộ (`@Async`) số liệu token/chi phí sau mỗi lệnh gọi.

## Luồng hoạt động

### 1. Quản lý Kho khoá API AI Mã hoá AES-256-GCM
1. Workspace Admin thêm hoặc cập nhật API Key tại `/admin/ai-engine` (`POST /api/v1/master/ai/keys`).
2. `MasterAiConfigurationService` mã hoá chuỗi API Key bằng thuật toán **AES-256-GCM** (`TenantCredentialService`) với Associated Data là `"AI_PROVIDER_KEY:" + provider` trước khi lưu vào cột `api_key_encrypted`.
3. Khi trả dữ liệu ra API (`GET /api/v1/master/ai/keys`), hệ thống chỉ hiển thị chuỗi che dấu (`maskedKey`, ví dụ `AIza****...abcd`), tuyệt đối không trả plaintext key.
4. Admin có thể bấm **Kiểm tra kết nối** (`POST /api/v1/master/ai/keys/{id}/test`) để hệ thống giải mã key trong RAM và gửi ping kiểm tra tính hợp lệ tới endpoint của nhà cung cấp AI.

### 2. Định tuyến Model AI & Cơ chế Dự phòng (Model Routing & Failover)
1. Mỗi tác vụ nghiệp vụ (`CV_PARSING`, `INTERVIEW_GEN`, `INTERVIEW_NLP`, `CODE_GRADING`, `MATCHING`) có một cấu hình trong `ai_model_configs`.
2. Khi Worker hoặc Service của Tenant thực thi tác vụ AI, hệ thống đọc cấu hình định tuyến từ cache Redis (`master:ai:model_config:<task_type>`, TTL 6 giờ) để chọn đúng `provider`, `model_name`, `temperature`, `max_tokens` (mặc định tối thiểu 8192 token cho `gemini-2.5-flash` ở tác vụ Interview từ V24) và `failover_model`.
3. Khi Admin cập nhật cấu hình (`PUT /api/v1/master/ai/models/{id}`), hệ thống xoá cache Redis ngay lập tức để áp dụng không cần khởi động lại Server.

### 3. Metering Token & Chi phí USD Tự động (V28)
1. Bảng `ai_model_pricings` lưu đơn giá `input_price_per_1m_tokens` và `output_price_per_1m_tokens` (USD) cho từng cặp `(provider, model_name)`.
2. Sau mỗi lần gọi LLM (`SpringAiConversationLlmPort`, `GeminiService`, v.v.), hệ thống trích xuất `promptTokens`, `completionTokens`, `latencyMs` và gọi bất đồng bộ `AiUsageMeteringService.recordAiCallAsync(...)`.
3. `AiUsageMeteringService` tra cứu đơn giá trong `ai_model_pricings`, tính chi phí ước tính:
   $$\text{Cost (USD)} = \frac{\text{promptTokens}}{10^6} \times P_{\text{input}} + \frac{\text{completionTokens}}{10^6} \times P_{\text{output}}$$
4. Hệ thống thực hiện câu lệnh `INSERT ... ON CONFLICT DO UPDATE` nguyên tử vào bảng `tenant_ai_usage_daily` và cộng dồn tổng token vào `tenant_usage_daily.ai_tokens_consumed`.

## Business Rules

- API Key của nhà cung cấp AI bắt buộc mã hoá AES-256-GCM khi lưu trữ; các bản ghi cũ chưa có tiền tố `enc:v1:` được tự động mã hoá nâng cấp ngay khi khởi động ứng dụng (`@PostConstruct`).
- Tiến trình ghi nhận Metering (`AiUsageMeteringService`) chạy bất đồng bộ và độc lập với giao dịch nghiệp vụ của Tenant: nếu việc ghi thống kê gặp lỗi, luồng phỏng vấn hoặc chấm CV của ứng viên vẫn không bị gián đoạn.

## API liên quan

| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| GET | `/api/v1/master/ai/keys` | WORKSPACE_ADMIN | Danh sách API Key AI (đã che dấu `maskedKey`) |
| POST | `/api/v1/master/ai/keys` | WORKSPACE_ADMIN | Thêm mới API Key AI (mã hoá AES-256-GCM) |
| DELETE | `/api/v1/master/ai/keys/{id}` | WORKSPACE_ADMIN | Xoá API Key AI |
| POST | `/api/v1/master/ai/keys/{id}/test` | WORKSPACE_ADMIN | Kiểm tra kết nối trực tiếp của API Key với nhà cung cấp |
| GET | `/api/v1/master/ai/models` | WORKSPACE_ADMIN | Danh sách cấu hình định tuyến Model theo tác vụ |
| PUT | `/api/v1/master/ai/models/{id}` | WORKSPACE_ADMIN | Cập nhật cấu hình Model / Temperature / Max Tokens / Failover |
| GET | `/api/v1/master/ai/pricings` | WORKSPACE_ADMIN | Danh sách bảng đơn giá USD/1M tokens theo model |
| PUT | `/api/v1/master/ai/pricings/{id}` | WORKSPACE_ADMIN | Cập nhật đơn giá Input/Output USD/1M tokens |
| GET | `/api/v1/master/ai/usage/summary` | WORKSPACE_ADMIN | Báo cáo tổng hợp tiêu thụ Token, Độ trễ & Chi phí USD theo Tenant/Model/Tác vụ |

## Database liên quan

- PostgreSQL (`smarthire_master`):
  - `ai_provider_keys` (entity `AiProviderKey`): kho khoá API mã hoá AES-256-GCM.
  - `ai_model_configs` (entity `AiModelConfig`): định tuyến model theo tác vụ.
  - `ai_model_pricings` (entity `AiModelPricing`): bảng đơn giá USD/1M tokens (V28).
  - `tenant_ai_usage_daily` (entity `TenantAiUsageDaily`): thống kê lượt gọi, lỗi, prompt/completion tokens, độ trễ và chi phí USD theo ngày (V28).

## UI mockup

- `/admin/ai-engine` (`AiConfigurationPage.tsx`): Giao diện 4 khu vực gồm:
  1. Thẻ KPI tổng quan (Tổng Request AI 30 ngày, Tổng Token, Chi phí ước tính USD, Độ trễ trung bình).
  2. Bảng phân tích chi phí AI theo từng Doanh nghiệp & Tác vụ và Bảng đơn giá Model (`ai_model_pricings`).
  3. Bảng cấu hình Định tuyến Model theo tác vụ (`ai_model_configs`).
  4. Kho khoá API Key (`ai_provider_keys`) kèm nút Kiểm tra kết nối trực tiếp.
