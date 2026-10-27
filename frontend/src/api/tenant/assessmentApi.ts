import type { SubmissionGradingDetail, GradeDecision, ResultEmailReceipt } from "@/api/types/assessment";
import { api } from "@/lib/axios";
import type { ApiResponse } from "@/types/api";
import type { SampleResult, AvailableAssessment, JobTest, Question, QuestionRequest, SavedAnswer, SendAssessmentResult, Submission, SubmissionSummary, TestPage, TestRequest } from "@/api/types/assessment";

export const assessmentApi = {
  gradingDetail: (id: number) => api.get<ApiResponse<SubmissionGradingDetail>>(`/submissions/${id}/grading_detail`).then(r => r.data.data),
  updateGradingResult: (id: number, decisions: GradeDecision[]) => api.post<ApiResponse<SubmissionGradingDetail>>(`/submissions/${id}/update_grading_result`, { decisions }).then(r => r.data.data),
  sendResultEmail: (id: number) => api.post<ApiResponse<ResultEmailReceipt>>(`/submissions/${id}/send_result_email`).then(r => r.data.data),
  list: (paramsOrPage: { jobId?: number; page?: number; size?: number } | number = 0, size = 20) => {
    const params = typeof paramsOrPage === "object" ? paramsOrPage : { page: paramsOrPage, size };
    return api.get<ApiResponse<TestPage>>("/assessments/list_tenant_tests", { params }).then(r => r.data.data);
  },
  listForJob: (jobId: number, params: { page?: number; size?: number } = {}) =>
    api.get<ApiResponse<TestPage>>("/assessments/list_tenant_tests", {
      params: { jobId, page: params.page ?? 0, size: params.size ?? 100 },
    }).then(r => r.data.data),
  get: (id: number) => api.get<ApiResponse<JobTest>>(`/assessments/get_test_metadata/${id}`).then(r => r.data.data),
  create: (body: TestRequest) => api.post<ApiResponse<JobTest>>("/assessments/create_draft_test", body).then(r => r.data.data),
  update: (id: number, body: TestRequest) => api.put<ApiResponse<JobTest>>(`/assessments/update_draft_test/${id}`, body).then(r => r.data.data),
  questions: (id: number) => api.get<ApiResponse<Question[]>>(`/assessments/${id}/list_questions`).then(r => r.data.data),
  createQuestion: (id: number, body: QuestionRequest) => api.post<ApiResponse<Question>>(`/assessments/${id}/create_question`, body).then(r => r.data.data),
  updateQuestion: (id: number, questionId: number, body: QuestionRequest) => api.put<ApiResponse<Question>>(`/assessments/${id}/update_question/${questionId}`, body).then(r => r.data.data),
  deleteQuestion: (id: number, questionId: number) => api.delete(`/assessments/${id}/delete_question/${questionId}`),
  publish: (id: number) => api.post<ApiResponse<JobTest>>(`/assessments/${id}/publish_test`).then(r => r.data.data),
  send: (id: number, applicationId: number) => api.post<ApiResponse<SendAssessmentResult>>(`/assessments/${id}/send_assessment`, { applicationId }).then(r => r.data.data),
  assignToApplication: (id: number, applicationId: number) => api.post<ApiResponse<SendAssessmentResult>>(`/assessments/${id}/assign-to-application/${applicationId}`).then(r => r.data.data),
  recordProctorEvent: (id: number, body: { event: string; detail?: string; durationSeconds?: number }) => api.post(`/submissions/${id}/proctor-events`, body),
  available: (applicationId: number) => api.get<ApiResponse<AvailableAssessment[]>>(`/applications/${applicationId}/list_available_assessments`).then(r => r.data.data),
  start: (id: number, applicationId: number) => api.post<ApiResponse<Submission>>(`/assessments/${id}/start_submission`, { applicationId }).then(r => r.data.data),
  submission: (id: number, signal?: AbortSignal) => api.get<ApiResponse<Submission>>(`/submissions/${id}/get_submission`, { signal }).then(r => r.data.data),
  saveAnswers: (id: number, answers: SavedAnswer[]) => api.post<ApiResponse<Submission>>(`/submissions/${id}/save_answers`, { answers }).then(r => r.data.data),
  completeObjective: (id: number) => api.post<ApiResponse<Submission>>(`/submissions/${id}/complete_objective`).then(r => r.data.data),
  runSamples: (id: number, questionId: number, source: string, language: string) => api.post<ApiResponse<SampleResult[]>>(`/submissions/${id}/coding/${questionId}/run_samples`, { source, language }).then(r => r.data.data),
  runCustom: (id: number, questionId: number, source: string, language: string, input: string) => api.post<ApiResponse<SampleResult>>(`/submissions/${id}/coding/${questionId}/run_custom`, { source, language, input }).then(r => r.data.data),
  proctorEvent: (id: number, event: string, detail?: string) => api.post(`/submissions/${id}/proctor-events`, { event, detail }),
  jobReport: (jobId: number) => api.get<ApiResponse<import("@/api/types/assessment").AssessmentJobReport>>(`/jobs/${jobId}/assessment_report`).then(r => r.data.data),
  approveGrade: (id: number, questionId: number, score: number | null) => api.post(`/submissions/${id}/approve_grade/${questionId}`, { score }),
  retryGrading: (id: number) => api.post(`/submissions/${id}/retry_grading`),
  submit: (id: number) => api.post<ApiResponse<Submission>>(`/submissions/${id}/submit_test`).then(r => r.data.data),
  jobSubmissions: (jobId: number) => api.get<ApiResponse<SubmissionSummary[]>>(`/jobs/${jobId}/list_assessment_submissions`).then(r => r.data.data),
};
