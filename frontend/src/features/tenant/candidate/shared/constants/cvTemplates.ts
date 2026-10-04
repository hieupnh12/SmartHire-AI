export type CvStyleKey = "simple" | "impressive" | "professional";
export type CvRoleKey = "backend" | "frontend" | "fullstack" | "qa" | "pm" | "intern" | "outsource";
export type CvLayout = "single" | "split" | "sidebar" | "cards" | "banner" | "corporate" | "table";

export const cvStyles: Record<CvStyleKey, { label: string; description: string }> = {
  simple: { label: "Đơn giản", description: "Bố cục 1-2 cột tối giản, chuẩn ATS, tập trung vào nội dung kỹ thuật." },
  impressive: { label: "Ấn tượng", description: "Điểm nhấn màu sắc, thẻ và icon, làm nổi bật Portfolio & Projects." },
  professional: { label: "Chuyên nghiệp", description: "Bố cục trang trọng, tông trầm, tôn vinh năng lực quản lý & quy trình." },
};

export const cvRoles: Record<CvRoleKey, { label: string; filterLabel: string; title: string; name: string }> = {
  backend: { label: "Lập trình Backend / DevOps / Data", filterLabel: "Lập trình Backend", title: "Backend Developer", name: "Nguyễn Minh Anh" },
  frontend: { label: "Lập trình viên Frontend", filterLabel: "Lập trình Frontend", title: "Frontend Developer", name: "Trần Thu Hà" },
  fullstack: { label: "Lập trình viên Fullstack / Di động", filterLabel: "Fullstack / Di động", title: "Fullstack Developer", name: "Lê Hoàng Nam" },
  qa: { label: "Kiểm thử (QA/QC, Tester)", filterLabel: "Kiểm thử phần mềm", title: "QA Engineer", name: "Phạm Khánh Linh" },
  pm: { label: "Quản lý dự án (BA)", filterLabel: "Quản lý dự án / BA", title: "Project Manager", name: "Đỗ Quang Huy" },
  intern: { label: "Thực tập sinh / Mới tốt nghiệp", filterLabel: "Thực tập / Mới ra trường", title: "Junior Developer", name: "Vũ Ngọc Mai" },
  outsource: { label: "CV công ty (FPT Software…)", filterLabel: "CV dự án", title: "Software Engineer", name: "Nguyen Van A" },
};

export type CvTemplate = { id: string; name: string; style: CvStyleKey; layout: CvLayout; roles: CvRoleKey[] };

export const cvTemplates: CvTemplate[] = [
  { id: "basic", name: "Basic", style: "simple", layout: "single", roles: ["backend", "qa"] },
  { id: "simple", name: "Simple", style: "simple", layout: "split", roles: ["backend", "fullstack", "qa"] },
  { id: "crisp", name: "Crisp", style: "simple", layout: "single", roles: ["backend"] },
  { id: "chicken", name: "Chicken", style: "simple", layout: "split", roles: ["intern"] },
  { id: "cascade", name: "Cascade", style: "impressive", layout: "sidebar", roles: ["frontend"] },
  { id: "rabbit", name: "Rabbit", style: "impressive", layout: "cards", roles: ["fullstack", "intern"] },
  { id: "iconic", name: "Iconic", style: "impressive", layout: "cards", roles: ["fullstack"] },
  { id: "concept", name: "Concept", style: "impressive", layout: "sidebar", roles: ["frontend", "intern"] },
  { id: "enfold", name: "Enfold", style: "impressive", layout: "cards", roles: ["frontend"] },
  { id: "vibes", name: "Vibes", style: "professional", layout: "banner", roles: ["pm"] },
  { id: "newsweek", name: "Newsweek", style: "professional", layout: "corporate", roles: ["qa"] },
  { id: "decker", name: "Decker", style: "professional", layout: "banner", roles: ["pm"] },
  { id: "bubbles", name: "Bubbles", style: "professional", layout: "corporate", roles: [] },
  { id: "message", name: "Message", style: "professional", layout: "banner", roles: ["pm"] },
  { id: "enterprise", name: "Enterprise", style: "professional", layout: "table", roles: ["outsource", "fullstack", "backend"] },
];

export const cvStyleKeys = Object.keys(cvStyles) as CvStyleKey[];
export const cvRoleKeys = Object.keys(cvRoles) as CvRoleKey[];

export const isCvStyle = (value: string | null): value is CvStyleKey => value !== null && value in cvStyles;
export const isCvRole = (value: string | null): value is CvRoleKey => value !== null && value in cvRoles;
