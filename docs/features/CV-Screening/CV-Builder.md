# CV Builder

**Epic:** AI-Powered CV Screening & Analysis  
**Trạng thái:** `Done`  
**Code ID:** `CV-06`

## Mục đích chức năng

Ứng viên tạo CV trực tiếp trên web theo 15 mẫu trong thư viện `/cv-templates`: sửa nội dung ngay trên trang CV, sắp xếp/ẩn/thêm/xóa mục, xuất PDF tại máy và lưu CV vào **Quản lý CV** để dùng khi ứng tuyển như CV tải lên.

## Actor

- Candidate (đã đăng nhập)

## Luồng hoạt động

1. Candidate bấm **Dùng mẫu này** ở `/cv-templates` (`/cv/builder?template=<id>`) hoặc **Tạo CV mới** ở `/cv`. Khách chưa đăng nhập thấy nút **Đăng nhập để dùng mẫu**; bấm vào sẽ chuyển sang `/login`, đăng nhập Google xong quay lại đúng `/cv/builder?template=<id>`.
2. Trang builder nạp: bản nháp trên trình duyệt (nếu có) → dữ liệu đã lưu (khi sửa `/cv/builder/:cvId`) → CV mẫu điền sẵn họ tên/email/điện thoại từ tài khoản.
3. Candidate sửa trực tiếp (inline). Mỗi mục có thanh công cụ nổi: tay nắm kéo thả, lên/xuống, ẩn/hiện khi xuất, thêm nội dung, xóa (có `ConfirmDialog`). Mỗi nội dung có: kéo thả (chỉ trong cùng mục), lên/xuống, nhân bản, xóa. Mô tả hỗ trợ in đậm, in nghiêng, danh sách.
   - 11 loại mục: Kinh nghiệm, Học vấn, Dự án, Kỹ năng, Ngoại ngữ, Chứng chỉ, Giải thưởng, Hoạt động, Sở thích, Người tham chiếu, Tùy chỉnh. Ngoại ngữ có thang mức độ 1–5 chấm (bấm lại chấm hiện tại để bỏ). Kỹ năng dùng nhãn chữ thay cho chấm/%: bấm để đổi Chưa chọn → Biết → Khá → Thành thạo (EN: Familiar/Intermediate/Proficient).
   - **Giao diện**: màu chủ đạo (mặc định màu doanh nghiệp, 8 màu gợi ý hoặc tự chọn), font (Theo mẫu/Hiện đại/Cổ điển/Gọn gàng/Tahoma), cỡ chữ (12/13/14px), giãn dòng (1.4/1.6/1.8). Lưu trong `theme`.
   - **Hoàn tác/làm lại**: nút trên thanh công cụ hoặc Ctrl+Z / Ctrl+Y (Ctrl+Shift+Z); tối đa 100 bước, gõ liên tục cùng một ô trong 1 giây gộp thành một bước.
4. Bản nháp tự lưu `localStorage` sau 500 ms không gõ, khoá `smarthire:cv-builder:{tenant}:{userId}:{cvId|new}` — chỉ nằm trên trình duyệt hiện tại.
5. **Xuất PDF** (nút **Tải xuống PDF**, tải file trực tiếp, không mở hộp thoại in): FE dựng bản CV chỉ đọc ẩn ngoài màn hình (bỏ placeholder, nút sửa, mục ẩn/ô trống), chia trang lại cho đúng nội dung in, chờ font/ảnh tải xong rồi gửi HTML + CSS của tờ A4 lên `POST /cvs/builder/pdf`. Backend chuyển sang container **Gotenberg** (Chromium headless) → PDF vector A4, chữ chọn được, giữ màu và footer. Ảnh cùng origin (logo `/cv-assets/*`) được nhúng dạng data URL; ảnh Cloudinary tải trực tiếp. File tải về tên `CV {Họ tên}.pdf`.
6. **Lưu vào Quản lý CV**: `POST /cvs/builder` (hoặc `PUT /cvs/{id}/builder` khi sửa). Backend render PDF dạng text (OpenPDF, font Arial nhúng hỗ trợ tiếng Việt), lưu Cloudinary và chạy pipeline parse → extract → analyze như CV tải lên. Xong thì xoá bản nháp và chuyển về `/cv?selected={id}`.
7. Ở `/cv`, CV tạo bằng builder có nút **Chỉnh sửa** mở lại `/cv/builder/{id}`.
8. **Ảnh đại diện (theo config, kiểu F8)**:
   - **Khung ảnh theo mẫu** (`constants/cvAvatar.ts`): mỗi bố cục có hình dạng và kích thước mặc định. Bố cục thường là tròn 25,4mm; sidebar là tròn 29,6mm (bằng kích thước cũ). **Enterprise khóa cố định khung 128×151px** (chữ nhật đứng, viền đen, theo file Word mẫu), không đổi được hình dạng/kích thước.
   - **Tùy chỉnh** trong popover **Ảnh hồ sơ**:
     - Hình dạng: Tròn · Vuông bo góc · Vuông · Chữ nhật đứng 3:4 · Chữ nhật ngang 4:3.
     - Kích thước: slider 20–45mm (chiều rộng).
     - Nút **Về mặc định của mẫu**.
     - Lựa chọn lưu ở `theme.avatar` và áp dụng cho mọi mẫu, trừ Enterprise.
   - **Upload + căn chỉnh**:
     - Chọn ảnh → FE thu nhỏ về JPEG ≤ 1000px nhưng **không cắt** → mở hộp thoại crop (`react-easy-crop`): kéo ảnh, thu phóng 1–3×, khung đúng tỉ lệ và hình dạng hiện tại → **Lưu ảnh** mới gọi `POST /cvs/builder/avatar`.
     - Lưu `avatarUrl` (ảnh gốc) và `avatarCrop` `{x, y, zoom, aspect}`: tâm điểm, độ phóng so với vừa khung, tỉ lệ ảnh. Bấm **Căn chỉnh** (trên ảnh hoặc trong popover) để căn lại mà không phải tải lại ảnh.
     - Ảnh được hiển thị bằng CSS (vị trí/kích thước theo mm), nên đổi mẫu hay đổi hình dạng khung vẫn giữ đúng khuôn mặt, và PDF xuất ra giống hệt.
     - Ảnh cũ chưa có `avatarCrop` hiển thị kiểu `object-cover` như trước.
   - Bố cục sidebar/cards hiện chữ viết tắt khi chưa có ảnh; các bố cục khác chỉ hiện ô ảnh khi đang sửa.
9. **Chia trang A4 kiểu MyCV & footer**: canvas hiển thị các tờ A4 297mm riêng biệt, cách nhau một khe xám (khe không in). Các khối nội dung (`data-cv-block`: mỗi nội dung, tiêu đề mục, Giới thiệu, Personal Details) được đo lại mỗi lần sửa (`useLayoutEffect` + `ResizeObserver`, gồm cả khi đổi font/ảnh tải xong). Khối nào cắt ngang ranh giới trang thì được đẩy (`margin-top`) sang đầu trang sau (`utils/paginateCv.ts`). Tiêu đề mục luôn đi cùng nội dung đầu tiên của mục. Trang 2 trở đi chừa lề trên 12mm; mỗi trang chừa 16mm cuối cho footer. Khối cao hơn một trang thì được phép tràn qua trang. Footer là phần tử thật ở cuối mỗi trang: trái "{Họ tên} – CV", phải "Trang i / N" (EN: "Page"). Khi in và xuất PDF dùng `@page { margin: 0 }` nên ngắt trang trùng với màn hình. PDF lưu trên hệ thống (OpenPDF) có footer tương tự.
   - **Mẫu Enterprise** (bố cục `table`, đối chiếu file Word mẫu CV dự án FPT Software; xuất hiện ở menu **Mẫu CV theo vị trí IT → CV dự án công ty Outsourcing**, `?position=outsource`):
     - Font mặc định Tahoma (~10pt), chữ đen; lề trái/phải 23mm, lề trên 20mm.
     - Đầu trang: **logo công ty** góc trái (`personalInfo.logoUrl`, mẫu sẵn `/cv-assets/fpt-software-logo.jpg`; bấm để đổi/xóa, ảnh chỉ thu nhỏ không cắt), họ tên in hoa đậm 16pt bên phải.
     - **Personal Details**: tiêu đề đậm in hoa căn trái; danh sách gạch đầu dòng "Nhãn — Giá trị" (Name in đậm, các dòng tự do `personalInfo.details` như Nationality/Date of Birth/Sex/Marital status, Phone No., Email, link); khung ảnh chữ nhật viền đen 128×151px bên phải ("(Paste your photo here)" khi chưa có ảnh, không in khi trống).
     - Học vấn, chứng chỉ, sở thích…: gạch đầu dòng "tiêu đề – phụ đề (thời gian)"; Kỹ năng: "**Nhóm**: danh sách".
     - Dự án/Kinh nghiệm: thanh tiêu đề nền xám #CCCCCC căn giữa, in nghiêng đậm (cả mục Sở thích). Mỗi nội dung là một bảng viền xám gồm:
       - 2 dòng đầu: "Project name | tên dự án | Duration" và "Position(s) | vị trí | thời gian".
       - Tiếp theo là các dòng **2 cột Nhãn | Nội dung** (`item.rows`, tối đa 8). Mặc định với Dự án: General information · Description · Project Scope · Technology used (VI: Thông tin chung · Mô tả · Phạm vi công việc · Công nghệ sử dụng). Mặc định với Kinh nghiệm: Mô tả công việc · Thành tựu nổi bật (EN: Job description · Key achievements).
       - Nhãn sửa được; nội dung là rich text, bullet vuông (VD Technology used có tiêu đề nghiêng *Run-time environment* / *Development environment* kèm danh sách).
       - Mỗi dòng có nút AI gợi ý và nút xóa, dưới bảng có nút **Thêm dòng**. Dòng có nội dung trống thì không in.
       - `description` luôn được đồng bộ từ các dòng dạng `<p><b>Nhãn</b></p>nội dung`, để mẫu khác, Đánh giá CV và PDF backend vẫn đọc được. CV cũ chưa có `rows` được tách theo các tiêu đề `<p><b>…</b></p>`; không có tiêu đề thì cả mô tả vào dòng đầu.
     - Footer: căn giữa "{Họ tên}'s CV - Confidential" (VI: "CV của {Họ tên} - Bảo mật") + số trang bên phải.
     - Tạo CV mới từ mẫu nạp sẵn dữ liệu y như file Word (tiếng Anh); họ tên/email/SĐT lấy từ tài khoản. PDF backend in `details` dạng "Nhãn: Giá trị" (không in ảnh/logo).
10. **Ngôn ngữ CV VI/EN**: nút chuyển trên thanh công cụ; đổi tiêu đề cố định (Giới thiệu/Liên hệ) và tiêu đề mục còn giữ tên mặc định, tiêu đề đã tự đặt giữ nguyên. Lưu trong `language`.
11. **Quản lý ở `/cv`**: đổi tên mọi CV của mình (giữ đuôi file); CV builder có thêm **Nhân bản** (tạo bản "Bản sao - …", parse lại) và **Chia sẻ** (bật/tắt link công khai, sao chép link).
12. **Link chia sẻ** `/cv/share/{token}`: trang công khai, không cần đăng nhập, hiển thị CV chỉ đọc theo đúng mẫu và nút **Tải PDF**.
13. **Nhập CV đã tải lên**: CV tải lên từ file đã có kết quả AI trích xuất hiện nút **Mở bằng trình tạo CV** ở `/cv` → `/cv/builder?import={id}`. FE chuyển `extraction` + `skills` thành các mục Kinh nghiệm/Dự án/Học vấn/Kỹ năng/Ngoại ngữ/Chứng chỉ (bỏ mục rỗng), điền họ tên/email/điện thoại từ CV (thiếu thì lấy tài khoản). Lưu tạo CV builder mới; file gốc giữ nguyên. Sau khi nạp, URL bỏ `?import` để tải lại trang không ghi đè bản nháp.
14. **AI gợi ý viết**: nút **AI gợi ý** ở phần Giới thiệu và nút ✨ trên thanh công cụ của nội dung (Kinh nghiệm, Dự án, Học vấn, Hoạt động, Giải thưởng, Tùy chỉnh) → `POST /cvs/builder/suggestions` trả 3 phương án; **Dùng gợi ý này** thay nội dung (giới thiệu là đoạn văn, mô tả là danh sách gạch đầu dòng), có thể hoàn tác.
15. **Chấm theo tin**: nút trên thanh công cụ → chọn tin tuyển dụng đang mở → `POST /cvs/builder/job-match?jobId=` → % kỹ năng khớp, danh sách kỹ năng đã có/chưa thấy, yêu cầu kinh nghiệm/trình độ của tin.
16. **Đánh giá CV** (chỉ FE, tính lại mỗi lần sửa): nút "Đánh giá CV · điểm" mở panel bên phải với điểm 0–100, số chỉ số định lượng, số trang/giới hạn, số năm kinh nghiệm ước tính, danh sách lỗi/nhắc nhở. Bấm một mục để cuộn và đặt con trỏ vào đúng ô (viền vàng nhấp nháy). Không chặn lưu.
17. **Mẹo viết CV IT**: hộp thoại từ thanh công cụ (cấu trúc, 1/2 trang, mới nhất lên đầu, công thức XYZ kèm ví dụ, Tech Stack theo nhóm, tránh thanh %/sao). Placeholder các ô Kinh nghiệm/Dự án/Kỹ năng gợi ý theo cùng quy tắc; AI gợi ý mô tả theo công thức XYZ và tránh động từ yếu.
18. **Trang Hướng dẫn viết CV** `/cv-guide` (công khai, menu header "Tạo CV → Hướng dẫn viết CV"): mục lục dính, 9 phần (cách nhà tuyển dụng đọc CV, cấu trúc chuẩn, công thức X-Y-Z kèm ví dụ trước/sau, trình bày dự án IT, động từ hành động, định dạng & ATS, lỗi thường gặp, checklist tương tác trước khi gửi, nguồn tham khảo). Nội dung trích dẫn có số nguồn: Ladders Eye-Tracking Study 2018, Laszlo Bock (Google), Harvard Mignone Center / Harvard Extension School, ITviec Blog. Code: `pages/CvGuidePage.tsx`, `constants/cvGuide.ts`.

## Business Rules

- `/cv`, `/cv/builder`, `/cv/builder/:cvId` luôn bắt đăng nhập (`RoleRoute authRequired`), kể cả khi `VITE_REQUIRE_AUTH=false`. Menu header (Quản lý CV, Tải CV lên, Cover Letter) hiện nhãn "Cần đăng nhập" khi chưa đăng nhập. `/cv-templates`, `/cv-guide`, `/cv/share/:token` vẫn công khai.
- Chỉ candidate tạo/sửa; staff gọi → `403 CV_UPLOAD_CANDIDATE_ONLY`. Sửa CV người khác → `403 CV_FORBIDDEN`.
- Chỉ CV có `builder_data` và không phải bản sao đơn ứng tuyển mới sửa được bằng builder → `409 CV_NOT_BUILDER`.
- Xuất PDF: chỉ người dùng đăng nhập; `html` bắt buộc, `html`/`css` mỗi trường ≤ 5.000.000 ký tự.
  - Gotenberg chạy với JavaScript tắt và allow-list URL: chỉ `file:///tmp/`, `data:`, Cloudinary, Google Fonts. Mọi URL khác (kể cả dịch vụ nội bộ) bị chặn để HTML do người dùng gửi không gọi được tới hệ thống nội bộ.
  - Gotenberg lỗi hoặc không kết nối được → `503 CV_PDF_UNAVAILABLE`.
  - Backend nhúng sẵn font Arial / Times New Roman. Tahoma / Georgia dùng bản cài trong container nếu có, không có thì thay bằng Arial / Times; muốn PDF mẫu Enterprise đúng Tahoma thì chép `tahoma.ttf` vào `deploy/gotenberg/fonts/` (không commit).
- `personalInfo.fullName` bắt buộc; tối đa 20 mục, 50 nội dung/mục; mô tả tối đa 20000 ký tự; `rows` tối đa 8 dòng (nhãn ≤ 80, nội dung ≤ 5000 ký tự); `type` ∈ `experience|education|projects|skills|languages|certifications|awards|activities|interests|references|custom`; `level` 0–5 (0 = không đánh giá); `accentColor` dạng `#RRGGBB` (màu đang hiển thị: `theme.color` hoặc màu tenant).
- `theme` (tùy chọn): `color` `#RRGGBB|null`, `font` `modern|classic|compact|null`, `fontSize` `sm|md|lg`, `lineHeight` `tight|normal|relaxed`, `avatar` `{ shape: circle|rounded|square|portrait|landscape, sizeMm: 20–45 }` (bỏ qua với mẫu Enterprise).
- `personalInfo.avatarCrop` (tùy chọn): `x`, `y` ∈ [0, 1], `zoom` ∈ [1, 3], `aspect` ∈ [0.1, 10]. PDF backend chỉ dùng màu; font/cỡ chữ áp dụng khi xuất PDF tại máy.
- PDF backend in mức độ ngoại ngữ dạng `●●●○○`; kỹ năng in nhãn chữ theo `language`. Quy đổi `level` của kỹ năng: 1–2 = Biết, 3–4 = Khá, 5 = Thành thạo (FE lưu 2/4/5); dữ liệu chấm cũ tự hiển thị theo khoảng này.
- `personalInfo.github`, `personalInfo.linkedin` (tùy chọn, ≤ 200 ký tự); `website` là Portfolio/Website. Backend không kiểm tra định dạng link, bảng Đánh giá CV nhắc ở FE. PDF backend in link trong dòng liên hệ.
- Rich text chỉ giữ thẻ `b/strong/i/em/u/ul/ol/li/br/p/div`, bỏ mọi thuộc tính (sanitize ở FE); PDF backend chuyển thành văn bản thuần, `li` thành dấu `•`.
- Cập nhật CV: xoá document/extraction/analysis/skills/match score cũ, ghi đè file cùng public id trên Cloudinary, đặt lại `UPLOADED` và parse lại. Đơn ứng tuyển đã nộp dùng bản sao riêng nên không bị ảnh hưởng.
- Tạo/cập nhật đều tính quota `CV_PARSE`.
- PDF backend là bản chuẩn ATS (một cột, màu nhấn tenant) để AI đọc; giao diện từng mẫu chỉ áp dụng khi xuất PDF tại máy.
- Ảnh đại diện: chỉ candidate, tối đa 2 MB, `image/jpeg|png|webp`; `avatarUrl` phải rỗng hoặc bắt đầu bằng `https://res.cloudinary.com/` (chặn URL ngoài). PDF backend không in ảnh.
- `language` ∈ `vi|en` (mặc định `vi`).
- Đổi tên: tên 1–200 ký tự, chỉ chủ sở hữu, không áp dụng cho bản sao đơn ứng tuyển; tự giữ đuôi file cũ.
- Nhân bản: chỉ CV builder của chính mình; tính quota `CV_PARSE`.
- Chia sẻ: token ngẫu nhiên 24 byte (base64url, không đoán được), gọi lại trả cùng token; tắt chia sẻ xoá token → link cũ trả `404 CV_SHARE_NOT_FOUND`. API công khai chỉ trả `builderData` (không trả file, email tài khoản hay dữ liệu AI); nội dung liên hệ trong CV hiển thị đúng như candidate nhập.
- Đánh giá CV — điểm = 100 − 10 × lỗi − 4 × nhắc nhở (tối thiểu 0). Quy tắc (`utils/reviewCv.ts`):
  - Lỗi: thiếu họ tên; thiếu/sai định dạng email; thiếu cả Kinh nghiệm lẫn Dự án; còn chỗ trống `[…]` (≤ 15 ký tự, VD `[X%]` từ AI); còn nội dung mẫu ("Tên công ty", "Mô tả công việc, thành tựu nổi bật"…).
  - Nhắc nhở: email thiếu chuyên nghiệp (≥ 3 chữ số liền hoặc từ như cool/boy/baby…); thiếu số điện thoại; link GitHub phải dạng `github.com/…`, LinkedIn dạng `linkedin.com/in/…`, Portfolio phải là URL; không có link nào; Giới thiệu trống, > 4 câu hoặc xưng "tôi"/"I"; thiếu Kỹ năng/Học vấn; mỗi nội dung Kinh nghiệm/Dự án: chưa mô tả, chỉ 1 dòng, > 7 dòng, không có con số, mở đầu bằng động từ yếu (Tham gia, Làm, Hỗ trợ, Phụ trách…); Kinh nghiệm/Dự án/Học vấn không xếp mới nhất lên đầu (so mốc bắt đầu); định dạng ngày lẫn lộn (MM/YYYY, YYYY-MM, MM-YYYY); số trang vượt giới hạn (≤ 2 năm kinh nghiệm → 1 trang, còn lại 2 trang; năm kinh nghiệm = từ mốc sớm nhất đến mốc muộn nhất/"Hiện tại" trong mục Kinh nghiệm); tổng nội dung < 500 ký tự.
  - Chỉ số định lượng: mọi con số trong mô tả Kinh nghiệm/Dự án trừ năm 19xx/20xx (số phiên bản như "Java 17" cũng được đếm). Mục ẩn không tính.
- Nhập CV: chỉ CV có `extraction` (đã phân tích); chưa có → thông báo, không tạo CV rỗng. Không gọi AI lại.
- AI gợi ý: chỉ candidate; dùng cấu hình AI `CV_PARSING` (Gemini/OpenAI/DeepSeek). Chưa cấu hình key hoặc nhà cung cấp lỗi → `503 CV_AI_UNAVAILABLE`; JSON sai → `502 CV_AI_INVALID`. Tối đa 30 lượt/giờ/người (Redis `ratelimit:cv-writing:{tenant}:{userId}`) → `429 CV_AI_RATE_LIMITED`; Redis lỗi thì không chặn. Prompt cấm bịa công ty/ngày/số liệu, dùng chỗ trống như `[X%]`; nội dung người dùng đặt trong `<input>` và được coi là dữ liệu. Mỗi gợi ý ≤ 1500 ký tự; FE escape HTML khi chèn.
- Chấm theo tin: chỉ candidate, tin `PUBLISHED` chưa xoá (khác → `404 JOB_NOT_FOUND`). Tính tất định, không gọi AI, không lưu DB: kỹ năng khớp nếu tên chuẩn hoá (`SkillScoringService.normalize`, gồm alias như ReactJS→react) trùng một nội dung trong mục Kỹ năng, hoặc xuất hiện nguyên từ trong văn bản CV; mục ẩn không tính. Điểm = Σ trọng số kỹ năng khớp / Σ trọng số × 100. Khác điểm sàng lọc hybrid (`CvMatchingService`) mà recruiter thấy.

## API liên quan

| Method | Path | Ghi chú |
|---|---|---|
| POST | `/api/v1/cvs/builder` | Body `CvBuilderData`; trả `CvDetail`, `202 Queued` |
| PUT | `/api/v1/cvs/{id}/builder` | Body `CvBuilderData`; render lại + parse lại |
| GET | `/api/v1/cvs/{id}` | `CvDetail.builderData` (JSON hoặc null) |
| GET | `/api/v1/cvs/me` | `CvSummary.fromBuilder` |
| POST | `/api/v1/cvs/builder/avatar` | Multipart `file`; trả `{ url }` |
| POST | `/api/v1/cvs/{id}/duplicate` | Nhân bản CV builder; trả `CvDetail` |
| PATCH | `/api/v1/cvs/{id}/name` | Body `{ name }`; trả `CvDetail` |
| POST | `/api/v1/cvs/{id}/share` | Bật chia sẻ; trả `{ token }` |
| DELETE | `/api/v1/cvs/{id}/share` | Tắt chia sẻ |
| GET | `/api/v1/public/cvs/{token}` | Công khai (cần `X-Tenant-ID`/subdomain); trả `{ builderData }` |
| POST | `/api/v1/cvs/builder/suggestions` | Body `{ kind: summary\|description, language, headline, sectionType, itemTitle, itemSubtitle, text }`; trả `{ suggestions: string[3] }` |
| POST | `/api/v1/cvs/builder/job-match?jobId=` | Body `CvBuilderData`; trả `{ jobId, jobTitle, score, matched[], missing[], minYearsExperience, educationLevel }` |
| POST | `/api/v1/cvs/builder/pdf` | Body `{ html, css }` (tờ A4 đã render ở FE); trả `application/pdf` (attachment) |

## Database liên quan

- `cvs.builder_data` JSON nullable (tenant V46). NULL = CV tải lên từ file.
- `cvs.share_token` VARCHAR(64) nullable, UNIQUE `uk_cvs_share_token` (tenant V47).

## UI mockup

- Tham khảo F8 MyCV (cv.f8.edu.vn); màu theo tenant (`--color-primary`), 7 bố cục: single, split, sidebar, cards, banner, corporate, table.
- Code: `frontend/src/features/tenant/candidate/cv/pages/CvBuilderPage.tsx`, `components/builder/*` (gồm `ThemePanel`, `LevelDots`, `useDropTarget`, `AvatarSlot`, `AvatarCropDialog`, `CvPdfSnapshot`, `AiSuggestDialog`, `JobMatchDialog`, `SkillLevel`, `CvReviewPanel`, `CvTipsDialog`), `utils/reviewCv.ts`, `components/CvManageBar.tsx`, `pages/SharedCvPage.tsx`, `utils/cvFromExtraction.ts`, `stores/useCvBuilderStore.ts` (lịch sử undo/redo), `constants/{cvTheme,cvAvatar}.ts`, `hooks/{useCvDraftAutosave,useAvatarUpload}.ts`, `utils/{createDefaultCv,sanitizeHtml,paginateCv,itemRows,exportCvPdf}.ts`.
- Bố cục kiểu MyCV.vn: thanh công cụ dạng viên thuốc nổi ở trên (dính khi cuộn, tự xuống dòng trên màn hình hẹp) gồm Quay lại (về `/cv-templates`; lưu CV mới chuyển sang Quản lý CV) · **Phông chữ** (popover: font, cỡ chữ, giãn dòng) · **Màu sắc** (popover bảng màu) · **Mẫu CV** (hộp thoại lưới mẫu có xem trước, đổi mẫu giữ nguyên nội dung) · **Ảnh hồ sơ** (popover tải/đổi/xóa ảnh) · Thêm mục · VI/EN · Hoàn tác/Làm lại · Thu phóng 50–150% (bấm % để về 100%) · Mẹo · Đánh giá (kèm điểm) · Chấm theo tin · Lưu · nút CTA **Tải xuống PDF**. Dưới thanh là tiêu đề CV (họ tên – vị trí) và trạng thái lưu nháp; vùng làm việc nền xám nhạt với tờ A4 210mm căn giữa có đổ bóng.
- Thu phóng dùng `transform: scale` (chỉ hiển thị, không đổi cách đếm trang; khi in tự bỏ thu phóng). Rê chuột lên mục hoặc nội dung hiện viền nét đứt. Bấm vào một nội dung thì nội dung đó được tô dải nền xám tràn ra lề trang: bên trái có nút lên/xuống, tay nắm kéo thả và nút "+" chèn nội dung mới phía trên/dưới; bên phải có nút xóa, AI gợi ý, nhân bản. Mỗi trang có footer "Trang i / N" ở góc dưới (in ra cùng CV).
- Kéo thả dùng HTML5 Drag and Drop thuần (không thêm thư viện); nút lên/xuống vẫn giữ cho bàn phím/trình đọc màn hình.

## Lộ trình tiếp theo

- Đã hoàn thành 3 đợt. Có thể cân nhắc: AI gợi ý theo đúng tin tuyển dụng đã chọn, ước tính số năm kinh nghiệm từ mốc thời gian khi chấm theo tin.
- Backend: `CvBuilderPdfRenderer`, `CvPdfExportService` (Gotenberg, `app.cv.gotenberg-url` / `GOTENBERG_URL`, mặc định `http://localhost:3000`; service `gotenberg` trong các file docker-compose), `CvService.createFromBuilder/updateFromBuilder/duplicate/rename/share/unshare/shared/uploadAvatar`, `CvBuilderAssistService.suggest/jobMatch`, `GeminiCvAiClient.completeJson`.

## Phụ thuộc

CV-01 (lưu file), CV-02..CV-05 (pipeline), Tenant Landing Page (`/cv-templates`).
