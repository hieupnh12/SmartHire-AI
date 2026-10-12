export type GuideSource = { id: string; publisher: string; title: string; url: string };

export const guideSources: GuideSource[] = [
  { id: "ladders", publisher: "Ladders, Inc. (2018)", title: "Eye-Tracking Study — How recruiters read resumes", url: "https://www.theladders.com/static/images/basicSite/pdfs/TheLadders-EyeTracking-StudyC2.pdf" },
  { id: "bock", publisher: "Laszlo Bock — cựu SVP People Operations, Google", title: "My Personal Formula for a Winning Resume", url: "https://www.linkedin.com/pulse/20140929001534-24454816-my-personal-formula-for-a-better-resume" },
  { id: "harvard", publisher: "Harvard FAS Mignone Center for Career Success", title: "Harvard College Guide to Creating a Strong Resume", url: "https://careerservices.fas.harvard.edu/resources/create-a-strong-resume/" },
  { id: "harvard-hes", publisher: "Harvard Extension School Career Services", title: "Resumes & Cover Letters (Top 5 resume mistakes)", url: "https://cdn-careerservices.fas.harvard.edu/wp-content/uploads/sites/161/2024/08/2024-HES_resume-and-letter.pdf" },
  { id: "itviec-structure", publisher: "ITviec Blog", title: "CV gồm những gì? 3 cấu trúc CV chuẩn nhất cho ứng viên IT", url: "https://itviec.com/blog/cv-gom-nhung-gi/" },
  { id: "itviec-project", publisher: "ITviec Blog", title: "Mẫu CV chuẩn cách viết mô tả dự án dành cho dân IT", url: "https://itviec.com/blog/mau-cv-chuan-trinh-bay-du-an-it/" },
  { id: "itviec-checklist", publisher: "ITviec Blog", title: "Checklist 10 điều cho mẫu CV IT chuyên nghiệp", url: "https://itviec.com/blog/checklist-mau-cv-chuyen-nghiep-cho-ung-vien-it/" },
];

export const guideSections = [
  { id: "doc-cv", label: "Nhà tuyển dụng đọc CV thế nào" },
  { id: "cau-truc", label: "Cấu trúc CV chuẩn" },
  { id: "cong-thuc-xyz", label: "Viết kinh nghiệm bằng công thức X-Y-Z" },
  { id: "du-an", label: "Trình bày dự án IT" },
  { id: "dong-tu", label: "Động từ hành động" },
  { id: "trinh-bay", label: "Định dạng & tối ưu ATS" },
  { id: "loi-thuong-gap", label: "Lỗi thường gặp" },
  { id: "checklist", label: "Checklist trước khi gửi" },
  { id: "nguon", label: "Nguồn tham khảo" },
] as const;

export const recruiterFocus = [
  "Họ tên, chức danh và công ty hiện tại",
  "Thời gian bắt đầu – kết thúc của từng vị trí",
  "Chức danh và công ty trước đó",
  "Học vấn",
];

export const cvSections = [
  { title: "Thông tin liên hệ", detail: "Họ tên, chức danh mong muốn, email, số điện thoại, GitHub/LinkedIn/portfolio." },
  { title: "Giới thiệu ngắn", detail: "2–3 câu: số năm kinh nghiệm, chức danh, kỹ năng và thành tích nổi bật, mục tiêu sắp tới." },
  { title: "Kinh nghiệm / Dự án", detail: "Liên quan đến vị trí ứng tuyển, sắp xếp mới nhất lên trước, mỗi ý là một thành tựu." },
  { title: "Kỹ năng", detail: "Chia nhóm: ngôn ngữ, framework, database, DevOps/cloud, kỹ năng mềm." },
  { title: "Học vấn & chứng chỉ", detail: "Trường, chuyên ngành, khóa học và chứng chỉ liên quan (AWS, JLPT, IELTS…)." },
];

export const structureVariants = [
  { profile: "Sinh viên / Fresher", lead: "Học vấn lên đầu", detail: "Đồ án, GPA, khóa học và dự án cá nhân là tài sản lớn nhất của bạn." },
  { profile: "Ít kinh nghiệm / chuyển ngành", lead: "Kỹ năng lên đầu", detail: "Làm nổi bật kỹ năng chuyển đổi được và dự án chứng minh kỹ năng đó." },
  { profile: "Middle / Senior", lead: "Kinh nghiệm lên đầu", detail: "Tập trung vào phạm vi trách nhiệm, quy mô hệ thống và kết quả kinh doanh." },
];

export const xyzExamples = [
  {
    before: "Phụ trách tối ưu hiệu năng API.",
    after: "Giảm 45% thời gian phản hồi API (từ 800ms xuống 440ms) cho 20.000 người dùng/ngày bằng cách thêm cache Redis và tối ưu truy vấn MySQL.",
  },
  {
    before: "Tham gia viết unit test cho dự án.",
    after: "Nâng độ phủ test từ 35% lên 80% trong 3 tháng, giảm 60% lỗi hồi quy khi release bằng cách xây bộ test JUnit + Mockito và tích hợp vào CI.",
  },
  {
    before: "Làm giao diện trang quản trị.",
    after: "Rút ngắn 30% thời gian xử lý đơn của nhân viên vận hành bằng cách thiết kế lại dashboard React với bộ lọc và thao tác hàng loạt.",
  },
];

export const projectAnatomy = [
  { label: "Tên dự án & thời gian", example: "SmartShop E-commerce (01/2025 – 08/2025)" },
  { label: "Vai trò thực tế trong dự án", example: "Backend Developer — nhóm 6 người" },
  { label: "Đóng góp (gạch đầu dòng X-Y-Z)", example: "Thiết kế API thanh toán xử lý 5.000 giao dịch/ngày…" },
  { label: "Công nghệ sử dụng", example: "Java 21, Spring Boot, MySQL, Redis, Docker" },
  { label: "Link minh chứng", example: "github.com/username/smartshop · demo.smartshop.dev" },
];

export const actionVerbGroups = [
  { group: "Lãnh đạo", verbs: ["Led", "Coordinated", "Spearheaded", "Supervised", "Prioritized"], vi: "Dẫn dắt, điều phối, chủ trì" },
  { group: "Kỹ thuật", verbs: ["Built", "Engineered", "Optimized", "Programmed", "Streamlined"], vi: "Xây dựng, phát triển, tối ưu" },
  { group: "Phân tích", verbs: ["Analyzed", "Diagnosed", "Evaluated", "Investigated", "Resolved"], vi: "Phân tích, chẩn đoán, giải quyết" },
  { group: "Giao tiếp", verbs: ["Presented", "Documented", "Collaborated", "Negotiated", "Authored"], vi: "Trình bày, viết tài liệu, phối hợp" },
];

export const formatRules = [
  { title: "1–2 trang là đủ", detail: "Phần lớn nhà tuyển dụng IT ưu tiên CV tối đa 2 trang; trang 2 chỉ được đọc khi trang 1 đủ thuyết phục." },
  { title: "Bố cục đơn giản, tiêu đề rõ", detail: "Tiêu đề mục in đậm, gạch đầu dòng ngắn, đọc được theo mẫu chữ F/E." },
  { title: "Tối đa 3 màu, font dễ đọc", detail: "Tránh hiệu ứng trang trí làm phân tán sự chú ý khỏi kinh nghiệm và kỹ năng." },
  { title: "Từ khóa theo JD", detail: "Đưa kỹ năng, công nghệ trong mô tả công việc vào phần kinh nghiệm để vượt hệ thống lọc ATS." },
  { title: "Xuất file PDF", detail: "Giữ nguyên định dạng trên mọi thiết bị; đặt tên file rõ ràng: CV_HoTen_ViTri.pdf." },
];

export const commonMistakes = [
  "Sai chính tả, ngữ pháp",
  "Thiếu email hoặc số điện thoại",
  "Dùng câu bị động thay vì động từ hành động (“được giao…”, “chịu trách nhiệm…”)",
  "Bố cục rối, khó đọc lướt",
  "Không điều chỉnh theo vị trí và ngành ứng tuyển",
];

export const sendChecklist = [
  "Thông tin liên hệ chính xác, email chuyên nghiệp",
  "Đoạn giới thiệu nêu đúng vị trí đang ứng tuyển",
  "Kinh nghiệm sắp xếp mới nhất lên trước",
  "Mỗi gạch đầu dòng bắt đầu bằng động từ và có số liệu",
  "Đã đưa từ khóa quan trọng trong JD vào CV",
  "Có link GitHub / portfolio / demo dự án",
  "Không quá 2 trang, không lỗi chính tả",
  "Đã nhờ người khác đọc lại và xuất file PDF",
];
