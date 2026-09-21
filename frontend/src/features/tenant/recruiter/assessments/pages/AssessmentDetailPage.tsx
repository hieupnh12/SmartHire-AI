import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Send, Trash2 } from "lucide-react";
import { PrototypeBanner } from "@/components/ux/PrototypeBanner";
import { StatusPill } from "@/components/ux/StatusPill";
import { button, input, muted, panel, primary } from "@/features/tenant/recruiter/matching/components/rankingUi";
import {
  mockTests,
  submissionStatusLabel,
  testStatusLabel,
  type MockQuestion,
  type MockTest,
} from "@/features/tenant/recruiter/assessments/constants/mockTests";

const emptyTest = (): MockTest => ({
  id: 0,
  jobId: 101,
  jobTitle: "Backend Engineer",
  title: "",
  description: "",
  durationMinutes: 45,
  passingScore: 70,
  status: "DRAFT",
  questionCount: 0,
  assignedCount: 0,
  submittedCount: 0,
  createdAt: new Date().toISOString(),
  questions: [],
  submissions: [],
});

export function AssessmentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === "new";
  const source = useMemo(
    () => (isNew ? emptyTest() : mockTests.find((t) => String(t.id) === id) ?? null),
    [id, isNew],
  );

  const [title, setTitle] = useState(source?.title ?? "");
  const [description, setDescription] = useState(source?.description ?? "");
  const [duration, setDuration] = useState(source?.durationMinutes ?? 45);
  const [passing, setPassing] = useState(source?.passingScore ?? 70);
  const [jobTitle, setJobTitle] = useState(source?.jobTitle ?? "Backend Engineer");
  const [status, setStatus] = useState(source?.status ?? "DRAFT");
  const [questions, setQuestions] = useState<MockQuestion[]>(source?.questions ?? []);
  const [assignAppId, setAssignAppId] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  if (!source) {
    return (
      <section className="space-y-4 text-[var(--color-on-surface)]">
        <p role="alert">Không tìm thấy đề kiểm tra.</p>
        <Link className={button} to="/recruiter/assessments">Quay lại danh sách</Link>
      </section>
    );
  }

  const flash = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2500);
  };

  const addQuestion = () => {
    const nextId = Math.max(0, ...questions.map((q) => q.id)) + 1;
    setQuestions((prev) => [
      ...prev,
      {
        id: nextId,
        text: "",
        points: 10,
        options: [
          { id: nextId * 10 + 1, text: "" },
          { id: nextId * 10 + 2, text: "" },
          { id: nextId * 10 + 3, text: "" },
          { id: nextId * 10 + 4, text: "" },
        ],
      },
    ]);
  };

  return (
    <section className="space-y-6 text-[var(--color-on-surface)]">
      <header className="space-y-3">
        <Link className={`${button} w-fit`} to="/recruiter/assessments">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Danh sách đề
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className={muted}>Technical test / {isNew ? "Tạo mới" : `Đề #${source.id}`}</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">
              {isNew ? "Soạn đề kiểm tra" : source.title}
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusPill status={status} label={testStatusLabel[status]} />
            <button
              type="button"
              className={button}
              onClick={() => {
                flash("Đã lưu nháp (mock).");
                setStatus("DRAFT");
              }}
            >
              Lưu nháp
            </button>
            <button
              type="button"
              className={primary}
              onClick={() => {
                setStatus("PUBLISHED");
                flash("Đã publish đề (mock). Ứng viên chỉ làm được khi được giao.");
              }}
            >
              Publish
            </button>
          </div>
        </div>
      </header>

      <PrototypeBanner note="form local state — chưa gọi assessmentApi" />
      {toast && (
        <p className="rounded-xl bg-[var(--color-primary-subtle)] px-4 py-2 text-sm text-[var(--color-primary-hover)]" role="status">
          {toast}
        </p>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.9fr)]">
        <div className="space-y-6">
          <div className={`${panel} space-y-4`}>
            <h2 className="text-lg font-semibold">Thông tin đề</h2>
            <label className="block space-y-1 text-sm">
              <span>Tiêu đề</span>
              <input className={input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Java & SQL — vòng kỹ thuật" />
            </label>
            <label className="block space-y-1 text-sm">
              <span>Job gắn đề</span>
              <select className={input} value={jobTitle} onChange={(e) => setJobTitle(e.target.value)}>
                <option>Backend Engineer</option>
                <option>Frontend Engineer</option>
                <option>Full-stack Engineer</option>
              </select>
            </label>
            <label className="block space-y-1 text-sm">
              <span>Mô tả</span>
              <textarea className={input} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1 text-sm">
                <span>Thời gian (phút)</span>
                <input
                  className={input}
                  type="number"
                  min={5}
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value) || 0)}
                />
              </label>
              <label className="block space-y-1 text-sm">
                <span>Điểm đạt (%)</span>
                <input
                  className={input}
                  type="number"
                  min={0}
                  max={100}
                  value={passing}
                  onChange={(e) => setPassing(Number(e.target.value) || 0)}
                />
              </label>
            </div>
          </div>

          <div className={`${panel} space-y-4`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Câu hỏi trắc nghiệm</h2>
              <button type="button" className={button} onClick={addQuestion}>
                Thêm câu
              </button>
            </div>
            {questions.length === 0 && <p className={muted}>Chưa có câu hỏi. Thêm ít nhất 1 câu trước khi publish.</p>}
            <ul className="space-y-5">
              {questions.map((question, index) => (
                <li key={question.id} className="space-y-3 rounded-2xl border border-[var(--color-border-default)] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="font-medium">Câu {index + 1}</p>
                    <button
                      type="button"
                      className={button}
                      aria-label={`Xóa câu ${index + 1}`}
                      onClick={() => setQuestions((prev) => prev.filter((q) => q.id !== question.id))}
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                      Xóa
                    </button>
                  </div>
                  <textarea
                    className={input}
                    rows={2}
                    value={question.text}
                    placeholder="Nội dung câu hỏi"
                    onChange={(e) => {
                      const text = e.target.value;
                      setQuestions((prev) => prev.map((q) => (q.id === question.id ? { ...q, text } : q)));
                    }}
                  />
                  <div className="grid gap-2">
                    {question.options.map((option, optIndex) => (
                      <label key={option.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="radio"
                          name={`correct-${question.id}`}
                          checked={Boolean(option.correct)}
                          onChange={() => {
                            setQuestions((prev) =>
                              prev.map((q) =>
                                q.id !== question.id
                                  ? q
                                  : {
                                      ...q,
                                      options: q.options.map((o) => ({ ...o, correct: o.id === option.id })),
                                    },
                              ),
                            );
                          }}
                        />
                        <span className="w-5 shrink-0 font-mono text-[var(--color-on-surface-variant)]">
                          {String.fromCharCode(65 + optIndex)}.
                        </span>
                        <input
                          className={input}
                          value={option.text}
                          placeholder="Đáp án"
                          onChange={(e) => {
                            const text = e.target.value;
                            setQuestions((prev) =>
                              prev.map((q) =>
                                q.id !== question.id
                                  ? q
                                  : {
                                      ...q,
                                      options: q.options.map((o) => (o.id === option.id ? { ...o, text } : o)),
                                    },
                              ),
                            );
                          }}
                        />
                      </label>
                    ))}
                  </div>
                  <p className={muted}>Chọn radio để đánh dấu đáp án đúng (chỉ recruiter thấy).</p>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <aside className="space-y-6">
          <div className={`${panel} space-y-4`}>
            <h2 className="text-lg font-semibold">Giao bài</h2>
            <p className={muted}>
              Giao theo đơn ứng tuyển. Đề chỉ hiện với candidate khi đã ASSIGNED — publish chưa đủ.
            </p>
            <label className="block space-y-1 text-sm">
              <span>Application ID</span>
              <input
                className={input}
                value={assignAppId}
                onChange={(e) => setAssignAppId(e.target.value)}
                placeholder="ví dụ 501"
              />
            </label>
            <button
              type="button"
              className={primary}
              disabled={status !== "PUBLISHED"}
              onClick={() => {
                flash(assignAppId ? `Đã giao đề cho đơn #${assignAppId} (mock).` : "Nhập Application ID.");
              }}
            >
              <Send className="size-4" aria-hidden="true" />
              Giao cho đơn
            </button>
            {status !== "PUBLISHED" && (
              <p className={muted}>Cần publish đề trước khi giao.</p>
            )}
          </div>

          <div className={`${panel} space-y-3`}>
            <h2 className="text-lg font-semibold">Bài đã nộp</h2>
            {source.submissions.length === 0 && <p className={muted}>Chưa có lượt làm.</p>}
            <ul className="space-y-3">
              {source.submissions.map((row) => (
                <li key={row.id} className="rounded-xl border border-[var(--color-border-default)] p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">{row.candidateName}</p>
                    <StatusPill status={row.status} label={submissionStatusLabel[row.status]} />
                  </div>
                  <p className={muted}>
                    Đơn #{row.applicationId} · {row.score == null ? "Chưa có điểm" : `${row.score}%`}
                  </p>
                  {row.submittedAt && (
                    <p className={muted}>Nộp {new Date(row.submittedAt).toLocaleString("vi-VN")}</p>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {isNew && (
            <button
              type="button"
              className={button}
              onClick={() => {
                flash("Prototype: sau khi có API sẽ tạo đề thật rồi chuyển trang.");
                navigate("/recruiter/assessments");
              }}
            >
              Hủy / về danh sách
            </button>
          )}
        </aside>
      </div>
    </section>
  );
}
