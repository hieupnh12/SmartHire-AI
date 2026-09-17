export const SKILL_CATALOG = [
  { category: "backend", label: "Backend", skills: ["Java", "Spring Boot", "C", "C++", "C#", "Go", "Python", "Node.js", "REST API"] },
  { category: "frontend", label: "Frontend", skills: ["JavaScript", "TypeScript", "React", "Vue", "Angular", "HTML", "CSS"] },
  { category: "database", label: "Database", skills: ["SQL", "MySQL", "PostgreSQL", "MongoDB", "Redis"] },
  { category: "devops", label: "DevOps", skills: ["Docker", "Kubernetes", "Jenkins", "Terraform"] },
] as const;

export type CatalogCategory = (typeof SKILL_CATALOG)[number]["category"];
