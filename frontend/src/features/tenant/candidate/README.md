# Candidate Actor Module

`candidate/` là boundary theo actor Ứng viên. Bên trong actor này có nhiều feature riêng như dashboard, jobs, applications, CV, assessments, interviews, practice, schedules và notifications.

Vì vậy không chia root theo kỹ thuật kiểu `candidate/pages`, `candidate/components`, `candidate/api` cho mọi thứ. Cách đó làm module phình nhanh và reviewer khó biết file thuộc tính năng nào.

## Cấu trúc chuẩn

```text
candidate/
├── dashboard/
│   ├── components/
│   ├── constants/
│   ├── pages/
│   └── types/
├── jobs/
│   └── pages/
├── applications/
│   └── pages/
├── cv/
│   └── pages/
├── assessments/
│   └── pages/
├── interviews/
│   └── pages/
├── practice/
│   └── pages/
├── schedules/
│   └── pages/
├── notifications/
│   └── pages/
├── nav.ts
├── README.md
└── AGENTS.md
```

## Quy tắc chia feature

Mỗi tính năng lớn của ứng viên là một folder cấp 1 dưới `candidate/`:

- `dashboard/`: trang tổng quan sau đăng nhập.
- `jobs/`: tìm việc, xem job, ứng tuyển.
- `applications/`: quản lý đơn ứng tuyển và pipeline trạng thái.
- `cv/`: quản lý CV, upload, AI parsing, CV score.
- `assessments/`: bài test kỹ thuật.
- `interviews/`: AI interview hoặc interview được mời.
- `practice/`: luyện phỏng vấn AI chủ động.
- `schedules/`: lịch phỏng vấn/lịch hẹn.
- `notifications/`: thông báo dành cho ứng viên.

Trong từng feature, chỉ tạo folder kỹ thuật khi cần:

```text
feature-name/
├── pages/        # route-level pages
├── components/   # UI riêng của feature
├── api/          # API wrapper riêng của feature nếu cần
├── hooks/        # hooks riêng của feature
├── services/     # mapping/orchestration/derived state
├── constants/    # labels, mock data, readonly config
├── types/        # type contract của feature
└── utils/        # pure helper functions
```

Không tạo đủ 8 folder cho mọi feature nếu chưa có nội dung. Folder rỗng làm nhiễu review.

## Quy tắc dependency

- Feature con được dùng shared UI global từ `@/components/ux`.
- Feature con không import component nội bộ của feature khác, trừ khi đã chuyển component đó lên shared scope có chủ đích.
- Nếu một component được dùng bởi từ 2 candidate features trở lên, cân nhắc tạo `candidate/shared/components/`.
- `nav.ts` chỉ chứa navigation cấp actor, không chứa UI component hoặc business logic.
- `app/router.tsx` import page từ đúng feature folder, ví dụ `candidate/dashboard/pages/HomePage`.

## Quy tắc review

- Nhìn vào đường dẫn phải biết ngay file thuộc feature nào.
- `pages/*Page.tsx` chỉ compose layout và wire data; không giữ mảng mock lớn, icon map hoặc markup lặp nhiều.
- Data demo/label/stage đặt trong `constants/` của feature.
- Type dùng chung trong feature đặt trong `types/` của feature.
- Icon dùng `lucide-react`; icon trang trí phải có `aria-hidden="true"`.
- Text tiếng Việt dài phải không tràn trên mobile.
- Nếu đổi hành vi thật, cập nhật docs feature tương ứng.

## Ví dụ

Đúng:

```text
candidate/applications/pages/MyApplicationsPage.tsx
candidate/applications/components/ApplicationPipeline.tsx
candidate/applications/hooks/useCandidateApplications.ts
candidate/applications/types/application.ts
```

Không nên:

```text
candidate/pages/MyApplicationsPage.tsx
candidate/components/ApplicationPipeline.tsx
candidate/types/application.ts
```

Cách thứ hai chỉ ổn khi module rất nhỏ. Với actor `candidate`, nó sẽ rối khi số feature tăng.