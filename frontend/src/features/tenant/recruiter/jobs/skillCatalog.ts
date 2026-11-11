export const SKILL_CATALOG = [
  { category: "backend", label: "Backend", labelKey: "recruiter.ops.jobs.skillCategories.backend", skills: ["Java", "Spring Boot", "C", "C++", "C#", "Go", "Python", "Node.js", "REST API"] },
  { category: "frontend", label: "Frontend", labelKey: "recruiter.ops.jobs.skillCategories.frontend", skills: ["JavaScript", "TypeScript", "React", "Vue", "Angular", "HTML", "CSS"] },
  { category: "database", label: "Database", labelKey: "recruiter.ops.jobs.skillCategories.database", skills: ["SQL", "MySQL", "PostgreSQL", "MongoDB", "Redis"] },
  { category: "devops", label: "DevOps", labelKey: "recruiter.ops.jobs.skillCategories.devops", skills: ["Docker", "Kubernetes", "Jenkins", "Terraform"] },
] as const;

export type CatalogCategory = (typeof SKILL_CATALOG)[number]["category"];
