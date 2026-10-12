import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/features/tenant/auth/stores/authStore";
import { getTenantIdFromWindow } from "@/lib/tenant";
import { ExcelQuestionEditor } from "./ExcelQuestionTemplatePage";
import { questionBankLocalKeys, loadBankDraft } from "../utils/generalQuestionDraft";
import type { BankQuestion } from "../constants/excelTemplateMock";
import { questionBankApi } from "@/api/tenant/questionBankApi";
import { queryKeys } from "@/lib/query-keys";
import { AssessmentError } from "@/components/ux/assessmentUi";
import { bankQuestionAuthoring } from "../utils/bankQuestionAuthoring";
import { toQuestionRequest } from "../utils/assessmentQuestionRequest";
import { validateExcelQuestions } from "../utils/excelImportValidation";

export function GeneralQuestionEditorPage() {
  const userId = useAuthStore(state => state.user?.id);
  const keys = questionBankLocalKeys(getTenantIdFromWindow() ?? "acme", userId);
  const { questionId } = useParams();
  const navigate = useNavigate();
  const client = useQueryClient();
  const editingQuery = useQuery({ queryKey: [...queryKeys.assessments.all(), "bank-question", questionId],
    queryFn: () => questionBankApi.get(Number(questionId)), enabled: !!questionId });
  const editing = editingQuery.data;
  const draftKey = questionId ? `${keys.draft}:${questionId}` : keys.draft;
  const save = useMutation({
    mutationFn: async (questions: BankQuestion[]) => {
      const rows = validateExcelQuestions(questions);
      const body = rows.filter(row => !row.skipped).map((row, index) => ({
        question: toQuestionRequest(row, index, 5), authoringMetadata: { ...row.row },
      }));
      if (editing) {
        if (body.length !== 1) throw new Error("Chỉ sửa một câu hỏi tại đây. Dùng Thêm câu hỏi để tạo câu mới.");
        await questionBankApi.update(editing.question.id, body[0]);
      } else await questionBankApi.create(body);
    },
    onSuccess: async (_, questions) => {
      try { sessionStorage.removeItem(draftKey); } catch { /* The server has already saved the questions. */ }
      await client.invalidateQueries({ queryKey: queryKeys.assessments.all() });
      navigate("/recruiter/question-bank", { state: { savedQuestions: questions.length } });
    },
  });
  if (questionId && editingQuery.isPending) return <p role="status">Đang tải câu hỏi…</p>;
  if (questionId && editingQuery.isError) return <AssessmentError error={editingQuery.error} retry={() => void editingQuery.refetch()} />;
  if (editing?.testId) return <section className="space-y-4"><h1 className="text-xl font-semibold">Câu hỏi thuộc bài đánh giá</h1><p>Mở bài đánh giá gốc để sửa câu hỏi trong bản nháp.</p><Link to={`/recruiter/jobs/${editing.jobId}/assessments/${editing.testId}`} className="text-brand-primary">Mở bài đánh giá</Link></section>;
  return <ExcelQuestionEditor key={draftKey} generalBank={{
    initialQuestions: loadBankDraft<BankQuestion[] | null>(draftKey, editing ? [bankQuestionAuthoring(editing)] : null),
    onSaveDraft: questions => sessionStorage.setItem(draftKey, JSON.stringify(questions)),
    onSave: questions => save.mutateAsync(questions).then(() => {}),
    busy: save.isPending,
    error: save.error,
  }} />;
}
