import { t as globalT, type TranslateFn } from "@/i18n";

export type ViewId = "all" | "schema";

export type QuestionKind = "TRAC_NGHIEM_DON" | "NHIEU_DAP_AN" | "TU_LUAN_CODE" | "TINH_HUONG_SYSTEM";

export type QuestionTypeOption = {
  value: QuestionKind;
  label: string;
  shortLabel: string;
  group: "single" | "multi" | "subjective";
};

export type DifficultyTone = "easy" | "medium" | "hard";

export type BankQuestion = {
  id: string;
  kind: QuestionKind;
  content: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  answer: string;
  score: string;
  difficulty: string;
  difficultyTone: DifficultyTone;
  skill: string;
  explanation: string;
  policy: "Partial Credit" | "Strict Match" | "";
  policyNote: string;
  snippet: string;
  language: string;
  rubric: { level: "excellent" | "pass" | "fail"; text: string }[];
  sample: string;
  timeLimit: string;
  rubricJsonText?: string;
  codingJsonText?: string;
  warning?: string;
};

export type DictionaryRow = {
  excelCol: string;
  field: string;
  status: string;
  statusTone: "optional" | "required" | "partial" | "recommended" | "default";
  dataType: string;
  validValues: string;
  rule: string;
  exampleOk: string;
  exampleBad: string;
};

export function getQuestionTypeOptions(t: TranslateFn = globalT): QuestionTypeOption[] {
  return [
    {
      value: "TRAC_NGHIEM_DON",
      label: t("recruiter.assessments.common.questionTypes.singleChoice"),
      shortLabel: t("recruiter.assessments.common.questionTypes.shortSingle"),
      group: "single",
    },
    {
      value: "NHIEU_DAP_AN",
      label: t("recruiter.assessments.common.questionTypes.multipleChoice"),
      shortLabel: t("recruiter.assessments.common.questionTypes.shortMulti"),
      group: "multi",
    },
    {
      value: "TU_LUAN_CODE",
      label: t("recruiter.assessments.common.questionTypes.codingEssay"),
      shortLabel: t("recruiter.assessments.common.questionTypes.shortCode"),
      group: "subjective",
    },
    {
      value: "TINH_HUONG_SYSTEM",
      label: t("recruiter.assessments.common.questionTypes.essayTheory"),
      shortLabel: t("recruiter.assessments.common.questionTypes.shortTheory"),
      group: "subjective",
    },
  ];
}

export function getDefaultRubric(t: TranslateFn = globalT): BankQuestion["rubric"] {
  return [
    { level: "excellent", text: t("recruiter.assessments.excel.defaultRubric.excellent") },
    { level: "pass", text: t("recruiter.assessments.excel.defaultRubric.pass") },
    { level: "fail", text: t("recruiter.assessments.excel.defaultRubric.fail") },
  ];
}

export function blankQuestion(kind: QuestionKind = "TRAC_NGHIEM_DON", t: TranslateFn = globalT): BankQuestion {
  return {
    id: "",
    kind,
    content: "",
    optionA: "",
    optionB: "",
    optionC: "",
    optionD: "",
    answer: "",
    score: kind.startsWith("TU_") || kind.startsWith("TINH_") ? "10.0" : "1.0",
    difficulty: "",
    difficultyTone: "medium",
    skill: "",
    explanation: "",
    policy: kind === "NHIEU_DAP_AN" ? "Partial Credit" : "",
    policyNote: "",
    snippet: "",
    language: kind === "TU_LUAN_CODE" ? "Java" : kind === "TINH_HUONG_SYSTEM" ? "Theory" : "",
    rubric: getDefaultRubric(t).map((item) => ({ ...item })),
    sample: "",
    timeLimit: kind.startsWith("TU_") || kind.startsWith("TINH_") ? t("recruiter.assessments.excel.defaultSubjectiveTimeLimit") : "",
  };
}

export function isChoiceKind(kind: QuestionKind) {
  return kind === "TRAC_NGHIEM_DON" || kind === "NHIEU_DAP_AN";
}

export function isSubjectiveKind(kind: QuestionKind) {
  return kind === "TU_LUAN_CODE" || kind === "TINH_HUONG_SYSTEM";
}

export function typeMeta(kind: QuestionKind, t: TranslateFn = globalT) {
  const options = getQuestionTypeOptions(t);
  return options.find((item) => item.value === kind) ?? options[0];
}

export function getDictionaryRows(t: TranslateFn = globalT): DictionaryRow[] {
  return [
    {
      excelCol: "A",
      field: "question_content",
      status: t("recruiter.assessments.excel.dictionary.statusRequired"),
      statusTone: "required",
      dataType: t("recruiter.assessments.excel.dictionary.dataTypeTextMd"),
      validValues: t("recruiter.assessments.excel.dictionary.contentValid"),
      rule: t("recruiter.assessments.excel.dictionary.contentRule"),
      exampleOk: t("recruiter.assessments.excel.dictionary.contentOk"),
      exampleBad: t("recruiter.assessments.excel.dictionary.contentBad"),
    },
    {
      excelCol: "B",
      field: "question_type",
      status: t("recruiter.assessments.excel.dictionary.statusRequired"),
      statusTone: "required",
      dataType: t("recruiter.assessments.excel.dictionary.dataTypeEnum"),
      validValues: t("recruiter.assessments.excel.dictionary.typeValid"),
      rule: t("recruiter.assessments.excel.dictionary.typeRule"),
      exampleOk: "TRAC_NGHIEM_DON",
      exampleBad: t("recruiter.assessments.excel.dictionary.typeBad"),
    },
    {
      excelCol: "—",
      field: "question_id",
      status: t("recruiter.assessments.excel.dictionary.statusAuto"),
      statusTone: "default",
      dataType: t("recruiter.assessments.excel.dictionary.dataTypeId"),
      validValues: "Q001, Q002, …",
      rule: t("recruiter.assessments.excel.dictionary.idRule"),
      exampleOk: "Q001",
      exampleBad: t("recruiter.assessments.excel.dictionary.idBad"),
    },
    {
      excelCol: "C - F",
      field: "option_a ... option_d",
      status: t("recruiter.assessments.excel.dictionary.statusPartialAb"),
      statusTone: "partial",
      dataType: t("recruiter.assessments.excel.dictionary.dataTypeString"),
      validValues: t("recruiter.assessments.excel.dictionary.optionsValid"),
      rule: t("recruiter.assessments.excel.dictionary.optionsRule"),
      exampleOk: t("recruiter.assessments.excel.dictionary.optionsOk"),
      exampleBad: t("recruiter.assessments.excel.dictionary.optionsBad"),
    },
    {
      excelCol: "G",
      field: "correct_answer / rubric",
      status: t("recruiter.assessments.excel.dictionary.statusRequired"),
      statusTone: "required",
      dataType: t("recruiter.assessments.excel.dictionary.dataTypeKeyRubric"),
      validValues: t("recruiter.assessments.excel.dictionary.answerValid"),
      rule: t("recruiter.assessments.excel.dictionary.answerRule"),
      exampleOk: "A,C",
      exampleBad: t("recruiter.assessments.excel.dictionary.answerBad"),
    },
    {
      excelCol: "H",
      field: "score_weight",
      status: t("recruiter.assessments.excel.dictionary.statusDefault1"),
      statusTone: "default",
      dataType: t("recruiter.assessments.excel.dictionary.dataTypeFloat"),
      validValues: t("recruiter.assessments.excel.dictionary.scoreValid"),
      rule: t("recruiter.assessments.excel.dictionary.scoreRule"),
      exampleOk: "1.5",
      exampleBad: t("recruiter.assessments.excel.dictionary.scoreBad"),
    },
    {
      excelCol: "K",
      field: "explanation_rubric",
      status: t("recruiter.assessments.excel.dictionary.statusRecommended"),
      statusTone: "recommended",
      dataType: t("recruiter.assessments.excel.dictionary.dataTypeTextRubric"),
      validValues: t("recruiter.assessments.excel.dictionary.explanationValid"),
      rule: t("recruiter.assessments.excel.dictionary.explanationRule"),
      exampleOk: t("recruiter.assessments.excel.dictionary.explanationOk"),
      exampleBad: t("recruiter.assessments.excel.dictionary.explanationBad"),
    },
  ];
}
