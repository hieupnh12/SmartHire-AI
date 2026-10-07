import type { CvBuilderData, CvBuilderItem, CvBuilderItemRow, CvBuilderSection, CvSectionType } from "@/api/types/cv";
import type { UserProfile } from "@/features/tenant/auth/types";
import { createSection, defaultCvTheme } from "./createDefaultCv";
import { rowsToDescription } from "./itemRows";

type Sample = Omit<CvBuilderItem, "id">;

export const ENTERPRISE_SAMPLE_LOGO = "/cv-assets/fpt-software-logo.jpg";

const section = (type: CvSectionType, title: string, items: Sample[]): CvBuilderSection => ({
  ...createSection(type, "en"),
  title,
  items: items.map((item) => ({ id: crypto.randomUUID(), ...item })),
});

const bullets = (lines: string[]) => `<ul>${lines.map((line) => `<li>${line}</li>`).join("")}</ul>`;

type ProjectInfo = {
  customer: string;
  team: string;
  description: string;
  scope: string[];
  runtime?: string[];
  development?: string[];
  tech?: string[];
};

/** Same two-column rows as the Word template: General information · Description · Project Scope · Technology used. */
const project = (title: string, subtitle: string, date: string, info: ProjectInfo): Sample => {
  const rows: CvBuilderItemRow[] = [
    { label: "General information", value: bullets([`Customer: ${info.customer}`, `Team Size: ${info.team}`]) },
    { label: "Description", value: `<p>${info.description}</p>` },
    { label: "Project Scope", value: `<p>${info.scope.map((step) => `- ${step}`).join("<br>")}</p>` },
    {
      label: "Technology used",
      value: [
        info.tech ? bullets(info.tech) : "",
        info.runtime ? `<p><i>Run-time environment</i></p>${bullets(info.runtime)}` : "",
        info.development ? `<p><i>Development environment</i></p>${bullets(info.development)}` : "",
      ].join(""),
    },
  ];
  return { title, subtitle, date, rows, description: rowsToDescription(rows) };
};

/** Prefilled English CV copied from the classic outsourcing (FPT Software) Word template; account data replaces the sample identity. */
export function createEnterpriseSampleCv(templateId: string, user: UserProfile | null): CvBuilderData {
  return {
    templateId,
    accentColor: null,
    theme: defaultCvTheme,
    language: "en",
    personalInfo: {
      fullName: user?.fullName || "NGUYEN VAN A",
      title: "",
      email: user?.email || "email@example.com",
      phone: user?.phone || "(84) 0912 345 678",
      address: "",
      website: "",
      summary: bullets([
        "Hard working, self-confidence, good communication skill.",
        "Work under pressure.",
        "High teamwork spirit and eager to learn and share.",
        "Sociable, friendly communication in team work.",
        "Good English communication.",
      ]),
      avatarUrl: "",
      github: "",
      linkedin: "",
      logoUrl: ENTERPRISE_SAMPLE_LOGO,
      details: [
        { label: "Nationality", value: "Vietnamese" },
        { label: "Date of Birth", value: "January, 22nd 1990" },
        { label: "Sex", value: "Female" },
        { label: "Marital status", value: "Single" },
      ],
    },
    sections: [
      section("education", "Educational Background", [
        { title: "Applied Informatics in Construction", subtitle: "Danang University of Science and Technology, Vietnam", date: "", description: "" },
      ]),
      section("certifications", "Certificate and Award", [
        { title: "Obtaining the identifier of head-graduated-student in the Department of Water Resources Engineering", subtitle: "University of Danang", date: "2013", description: "" },
        { title: "595 TOEIC", subtitle: "", date: "2013", description: "" },
        { title: "IELTS 5.5", subtitle: "", date: "2014", description: "" },
        { title: "PHP for web", subtitle: "", date: "2014", description: "" },
      ]),
      section("skills", "Software", [
        { title: "Databases etc", subtitle: "", date: "", description: "MS SQL Server, MySQL 2000 2005 2008" },
        { title: "Programming Languages", subtitle: "", date: "", description: "Java, JavaScript, C, C++, C#, PHP, HTML &amp; CSS." },
        { title: "Programming Tools", subtitle: "", date: "", description: "Visual Studio 2005, 2008, Eclipse." },
        { title: "App server / Middleware", subtitle: "", date: "", description: "Tomcat, Apache" },
        { title: "OOAD/OOP", subtitle: "", date: "", description: "Object Oriented Analysis (OOA), Object Oriented Design (OOD), Object Oriented Programming (OOP), Unified Modeling Language (UML)." },
      ]),
      section("custom", "Data Communication & Networks", [
        { title: "", subtitle: "", date: "", description: bullets(["TCP/IP", "LAN", "Computer Network"]) },
      ]),
      section("custom", "Operating Systems", [
        { title: "", subtitle: "", date: "", description: bullets(["Windows 7", "Windows Vista", "Windows XP/2000", "CentOS, Redhat"]) },
      ]),
      section("projects", "Project and Practice", [
        project("Design concrete dam", "Analysis and Developer", "3/2012 – 5/2012", {
          customer: "Vietnam",
          team: "1 person",
          description: "From input including water-level, hydrologic data, geologic data, etc. program a module to design structure of a concrete dam (output includes data of dam size, material, etc.).",
          scope: ["Requirement", "Design", "Coding", "Test"],
          tech: ["C++"],
        }),
        project("Calculate flat centring", "Analysis and Developer", "9/2012 – 12/2012", {
          customer: "Vietnam",
          team: "1 person",
          description: "From input including nodes’ position, force on nodes, size of beams, program a module to calculate status of a flat centring (output includes displacement diagram, nodes’ reaction).",
          scope: ["Requirement", "Design", "Coding", "Test"],
          runtime: ["Microsoft Windows XP/7", "DevC++"],
          development: ["Microsoft Windows XP/7", "DevC++", "Microsoft Word 2007"],
        }),
        project("Manage aquarium online business", "Analysis and Developer", "3/2014 – 4/2014", {
          customer: "VietNam",
          team: "3 people",
          description: "From Requirement, analyse and design a website to manage the aquarium business including modules for customer and admin.",
          scope: ["Requirement", "Design", "Coding", "Test"],
          runtime: ["Microsoft Windows XP/7", "MySQL", "Apache", "Browser: IE 6, Firefox 12, Chrome 34.0"],
          development: ["Microsoft Windows XP/7", "MySQL", "Apache", "Microsoft Word 2007, Excel 2007", "Visio 2003", "Notepad ++"],
        }),
        project("Mock Project: Ecommerce [Search/List Quotes]", "Developer", "4/2014 – 5/2014", {
          customer: "Japan",
          team: "12 people",
          description: "From input including SRS, Detailed Design, design a website system to establish Credit Master 2 system.",
          scope: ["Coding", "Test"],
          runtime: ["Microsoft Windows XP/7", "SQL Server 2008", "Tomcat 7", "JDK 1.7", "Browser: IE 6, Firefox 12, Chrome 34.0"],
          development: ["Microsoft Windows XP/7", "SQL Server 2008", "Eclipse", "Tomcat 7", "Microsoft Word 2007, Excel 2007", "Visio 2003", "Notepad ++"],
        }),
      ]),
      section("interests", "Hobbies", [
        { title: "Music, reading, travelling, film…", subtitle: "", date: "", description: "" },
      ]),
    ],
  };
}
