import { t as globalT, type TranslateFn } from "@/i18n";

export type GuideSource = { id: string; publisher: string; title: string; url: string };

export const guideSourceIds = [
  "ladders",
  "bock",
  "harvard",
  "harvard-hes",
  "itviec-structure",
  "itviec-project",
  "itviec-checklist",
] as const;

export function getGuideSources(t: TranslateFn = globalT): GuideSource[] {
  return [
    { id: "ladders", publisher: t("candidate.cv.guide.sources.laddersPublisher"), title: t("candidate.cv.guide.sources.laddersTitle"), url: "https://www.theladders.com/static/images/basicSite/pdfs/TheLadders-EyeTracking-StudyC2.pdf" },
    { id: "bock", publisher: t("candidate.cv.guide.sources.bockPublisher"), title: t("candidate.cv.guide.sources.bockTitle"), url: "https://www.linkedin.com/pulse/20140929001534-24454816-my-personal-formula-for-a-better-resume" },
    { id: "harvard", publisher: t("candidate.cv.guide.sources.harvardPublisher"), title: t("candidate.cv.guide.sources.harvardTitle"), url: "https://careerservices.fas.harvard.edu/resources/create-a-strong-resume/" },
    { id: "harvard-hes", publisher: t("candidate.cv.guide.sources.harvardHesPublisher"), title: t("candidate.cv.guide.sources.harvardHesTitle"), url: "https://cdn-careerservices.fas.harvard.edu/wp-content/uploads/sites/161/2024/08/2024-HES_resume-and-letter.pdf" },
    { id: "itviec-structure", publisher: t("candidate.cv.guide.sources.itviecStructurePublisher"), title: t("candidate.cv.guide.sources.itviecStructureTitle"), url: "https://itviec.com/blog/cv-gom-nhung-gi/" },
    { id: "itviec-project", publisher: t("candidate.cv.guide.sources.itviecProjectPublisher"), title: t("candidate.cv.guide.sources.itviecProjectTitle"), url: "https://itviec.com/blog/mau-cv-chuan-trinh-bay-du-an-it/" },
    { id: "itviec-checklist", publisher: t("candidate.cv.guide.sources.itviecChecklistPublisher"), title: t("candidate.cv.guide.sources.itviecChecklistTitle"), url: "https://itviec.com/blog/checklist-mau-cv-chuyen-nghiep-cho-ung-vien-it/" },
  ];
}

export function getGuideSections(t: TranslateFn = globalT) {
  return [
    { id: "doc-cv", label: t("candidate.cv.guide.sections.recruiterReads") },
    { id: "cau-truc", label: t("candidate.cv.guide.sections.structure") },
    { id: "cong-thuc-xyz", label: t("candidate.cv.guide.sections.xyzFormula") },
    { id: "du-an", label: t("candidate.cv.guide.sections.projects") },
    { id: "dong-tu", label: t("candidate.cv.guide.sections.actionVerbs") },
    { id: "trinh-bay", label: t("candidate.cv.guide.sections.formattingAts") },
    { id: "loi-thuong-gap", label: t("candidate.cv.guide.sections.commonMistakes") },
    { id: "checklist", label: t("candidate.cv.guide.sections.checklist") },
    { id: "nguon", label: t("candidate.cv.guide.sections.sources") },
  ] as const;
}

export function getRecruiterFocus(t: TranslateFn = globalT): string[] {
  return [
    t("candidate.cv.guide.recruiterFocus.item1"),
    t("candidate.cv.guide.recruiterFocus.item2"),
    t("candidate.cv.guide.recruiterFocus.item3"),
    t("candidate.cv.guide.recruiterFocus.item4"),
  ];
}

export function getCvSections(t: TranslateFn = globalT) {
  return [
    { title: t("candidate.cv.guide.cvSections.contactTitle"), detail: t("candidate.cv.guide.cvSections.contactDetail") },
    { title: t("candidate.cv.guide.cvSections.summaryTitle"), detail: t("candidate.cv.guide.cvSections.summaryDetail") },
    { title: t("candidate.cv.guide.cvSections.expTitle"), detail: t("candidate.cv.guide.cvSections.expDetail") },
    { title: t("candidate.cv.guide.cvSections.skillsTitle"), detail: t("candidate.cv.guide.cvSections.skillsDetail") },
    { title: t("candidate.cv.guide.cvSections.eduTitle"), detail: t("candidate.cv.guide.cvSections.eduDetail") },
  ];
}

export function getStructureVariants(t: TranslateFn = globalT) {
  return [
    { profile: t("candidate.cv.guide.structureVariants.fresherProfile"), lead: t("candidate.cv.guide.structureVariants.fresherLead"), detail: t("candidate.cv.guide.structureVariants.fresherDetail") },
    { profile: t("candidate.cv.guide.structureVariants.switcherProfile"), lead: t("candidate.cv.guide.structureVariants.switcherLead"), detail: t("candidate.cv.guide.structureVariants.switcherDetail") },
    { profile: t("candidate.cv.guide.structureVariants.seniorProfile"), lead: t("candidate.cv.guide.structureVariants.seniorLead"), detail: t("candidate.cv.guide.structureVariants.seniorDetail") },
  ];
}

export function getXyzExamples(t: TranslateFn = globalT) {
  return [
    { before: t("candidate.cv.guide.xyzExamples.ex1Before"), after: t("candidate.cv.guide.xyzExamples.ex1After") },
    { before: t("candidate.cv.guide.xyzExamples.ex2Before"), after: t("candidate.cv.guide.xyzExamples.ex2After") },
    { before: t("candidate.cv.guide.xyzExamples.ex3Before"), after: t("candidate.cv.guide.xyzExamples.ex3After") },
  ];
}

export function getProjectAnatomy(t: TranslateFn = globalT) {
  return [
    { label: t("candidate.cv.guide.projectAnatomy.nameLabel"), example: t("candidate.cv.guide.projectAnatomy.nameExample") },
    { label: t("candidate.cv.guide.projectAnatomy.roleLabel"), example: t("candidate.cv.guide.projectAnatomy.roleExample") },
    { label: t("candidate.cv.guide.projectAnatomy.contribLabel"), example: t("candidate.cv.guide.projectAnatomy.contribExample") },
    { label: t("candidate.cv.guide.projectAnatomy.techLabel"), example: t("candidate.cv.guide.projectAnatomy.techExample") },
    { label: t("candidate.cv.guide.projectAnatomy.linkLabel"), example: t("candidate.cv.guide.projectAnatomy.linkExample") },
  ];
}

export function getActionVerbGroups(t: TranslateFn = globalT) {
  return [
    { group: t("candidate.cv.guide.verbGroups.leadershipGroup"), verbs: ["Led", "Coordinated", "Spearheaded", "Supervised", "Prioritized"], meaning: t("candidate.cv.guide.verbGroups.leadershipMeaning") },
    { group: t("candidate.cv.guide.verbGroups.techGroup"), verbs: ["Built", "Engineered", "Optimized", "Programmed", "Streamlined"], meaning: t("candidate.cv.guide.verbGroups.techMeaning") },
    { group: t("candidate.cv.guide.verbGroups.analysisGroup"), verbs: ["Analyzed", "Diagnosed", "Evaluated", "Investigated", "Resolved"], meaning: t("candidate.cv.guide.verbGroups.analysisMeaning") },
    { group: t("candidate.cv.guide.verbGroups.commGroup"), verbs: ["Presented", "Documented", "Collaborated", "Negotiated", "Authored"], meaning: t("candidate.cv.guide.verbGroups.commMeaning") },
  ];
}

export function getFormatRules(t: TranslateFn = globalT) {
  return [
    { title: t("candidate.cv.guide.formatRules.rule1Title"), detail: t("candidate.cv.guide.formatRules.rule1Detail") },
    { title: t("candidate.cv.guide.formatRules.rule2Title"), detail: t("candidate.cv.guide.formatRules.rule2Detail") },
    { title: t("candidate.cv.guide.formatRules.rule3Title"), detail: t("candidate.cv.guide.formatRules.rule3Detail") },
    { title: t("candidate.cv.guide.formatRules.rule4Title"), detail: t("candidate.cv.guide.formatRules.rule4Detail") },
    { title: t("candidate.cv.guide.formatRules.rule5Title"), detail: t("candidate.cv.guide.formatRules.rule5Detail") },
  ];
}

export function getCommonMistakes(t: TranslateFn = globalT): string[] {
  return [
    t("candidate.cv.guide.commonMistakes.m1"),
    t("candidate.cv.guide.commonMistakes.m2"),
    t("candidate.cv.guide.commonMistakes.m3"),
    t("candidate.cv.guide.commonMistakes.m4"),
    t("candidate.cv.guide.commonMistakes.m5"),
  ];
}

export function getSendChecklist(t: TranslateFn = globalT): string[] {
  return [
    t("candidate.cv.guide.sendChecklist.c1"),
    t("candidate.cv.guide.sendChecklist.c2"),
    t("candidate.cv.guide.sendChecklist.c3"),
    t("candidate.cv.guide.sendChecklist.c4"),
    t("candidate.cv.guide.sendChecklist.c5"),
    t("candidate.cv.guide.sendChecklist.c6"),
    t("candidate.cv.guide.sendChecklist.c7"),
    t("candidate.cv.guide.sendChecklist.c8"),
  ];
}
