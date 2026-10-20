import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, ClipboardList, Clock3, Info, RotateCcw, Sparkles } from "lucide-react";
import type { Question } from "@/api/types/assessment";
import { Button } from "@/components/ux/Button";
import { assessmentInput, FieldError } from "@/components/ux/assessmentUi";
import { PreviewQuestionAuthoring } from "../components/PreviewQuestionAuthoring";
import { essayPreviewAnswer, essayPreviewBank, essayPreviewFeedback, codingPreviewAnswer } from "../constants/essayPreview";
import { CodingPreviewPanel } from "../components/CodingPreviewPanel";
import { rubricSchema, codingSchema, contentError } from "../utils/questionContentValidation";
import "./assessmentPreview.css";

const panel = "rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-5 space-y-4 shadow-sm sm:p-6";
const steps = ["Ngân hàng câu hỏi", "Cấu trúc đề", "Ứng viên làm bài", "Chấm & duyệt điểm"];

export function AssessmentPreviewPage() {
  const { id } = useParams();
  const [step, setStep] = useState(2);
  const [bank, setBank] = useState<Question[]>(() => structuredClone(essayPreviewBank));
  const [selected, setSelected] = useState(9102);
  const question = bank.find(item => item.id === selected) ?? bank[1];
  const [prompt, setPrompt] = useState(essayPreviewBank[1].questionText);
  const [rubric, setRubric] = useState(JSON.stringify(essayPreviewBank[1].rubricJson));
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState("");
  const [answer, setAnswer] = useState(essayPreviewAnswer);
  const [objectiveDone, setObjectiveDone] = useState(false);
  const [option, setOption] = useState<number>(1);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState("18.1");
  const [approved, setApproved] = useState<number | null>(null);
  const [source, setSource] = useState(codingPreviewAnswer);
  const [codeApproved, setCodeApproved] = useState<number | null>(null);
  const codeQuestion = bank[3];
  const reviewQuestion = bank[1];
  const totalScore = approved == null || codeApproved == null ? null : Number(((option == null || option === 1 ? 10 : 0) + 24 + approved + codeApproved).toFixed(2));
  const weights = reviewQuestion.rubricJson?.criteria ?? [];
  const suggested = Number((weights.reduce((sum, item, index) => sum + item.weight * (essayPreviewFeedback[index]?.percent ?? 0) / 100, 0) * reviewQuestion.points / 100).toFixed(2));
  const scoreValid = score.trim() !== "" && Number.isFinite(Number(score)) && Number(score) >= 0 && Number(score) <= reviewQuestion.points && /^\d+(\.\d{1,2})?$/.test(score);

  function choose(item: Question) {
    setSelected(item.id); setPrompt(item.questionText); setRubric(JSON.stringify(item.questionType === "CODING" ? item.coding : item.rubricJson)); setError(undefined); setNotice("");
  }
  function saveQuestion() {
    try {
      if (!prompt.trim()) throw new Error("Nhập nội dung câu hỏi.");
      const parsed = question.questionType === "CODING" ? { coding: codingSchema.parse(JSON.parse(rubric)) } : { rubricJson: rubricSchema.parse(JSON.parse(rubric)) };
      setBank(items => items.map(item => item.id === selected ? { ...item, questionText: prompt.trim(), ...parsed } : item));
      setApproved(null); setCodeApproved(null); setSubmitted(false); setError(undefined); setNotice("Đã lưu câu hỏi trong ngân hàng mẫu và cập nhật đề mẫu.");
    } catch (failure) { setError(failure instanceof Error && failure.message === "Nhập nội dung câu hỏi." ? failure.message : contentError(failure)); }
  }
  function approve(value: number) { setApproved(value); setNotice(`Đã duyệt ${value}/${reviewQuestion.points} điểm cho câu tự luận mẫu.`); }

  function resetDemo() {
    setBank(structuredClone(essayPreviewBank)); choose(essayPreviewBank[1]);
    setAnswer(essayPreviewAnswer); setObjectiveDone(true); setOption(1);
    setSubmitted(false); setApproved(null); setScore("18.1");
    setSource(codingPreviewAnswer); setCodeApproved(null); setStep(2);
  }
  function submitDemo() {
    setSubmitted(true); setApproved(null); setCodeApproved(null); setStep(3);
    setScore(String(suggested)); setNotice("Đã nộp bài mẫu. Nhận xét minh họa đã sẵn sàng để duyệt.");
  }
  const muted = "text-sm leading-6 text-[var(--color-on-surface-variant)]";
  const badge = "inline-flex items-center gap-2 rounded-full bg-[var(--color-primary-soft)] px-3 py-1 text-xs font-semibold text-[var(--color-primary)]";
  const codeSuggested = Number((codeQuestion.points * 0.97).toFixed(2));
  const summary = [
    ["Trắc nghiệm (1 câu)", `${option == null || option === 1 ? 10 : 0}/10`],
    ["Tự luận 1 · Spring Security", `${approved ?? suggested}/20${approved == null ? " · đề xuất" : ""}`],
    ["Tự luận 2 · RabbitMQ", "24/30 · đã duyệt mẫu"],
    ["Lập trình · JavaScript", `${codeApproved ?? codeSuggested}/40${codeApproved == null ? " · đề xuất" : ""}`],
  ];

  return <div className="assessment-preview mx-auto w-full max-w-7xl space-y-6 rounded-2xl p-4 text-[var(--color-on-surface)] sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Link to={`/recruiter/jobs/${id}/assessments`} className="inline-flex min-h-10 items-center gap-2 text-sm font-medium text-[var(--color-primary)] hover:underline"><ArrowLeft className="size-4" aria-hidden="true" />Quản lý bài đánh giá</Link>
      <span className={badge}><span className="size-2 rounded-full bg-[var(--color-primary)]" />ASSESSMENT MẪU · Java Backend Developer</span>
    </div>
    <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
      <div><h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Xem trước trải nghiệm làm bài của ứng viên</h1><p className={`${muted} mt-2 max-w-3xl`}>Thử chọn đáp án, viết tự luận và làm bài code. Chuyển các tab để xem cấu trúc đề, cách soạn câu hỏi và duyệt điểm.</p></div>
      <Button className="self-start shrink-0" variant="secondary" onClick={resetDemo}><RotateCcw className="size-4" aria-hidden="true" />Đặt lại mẫu</Button>
    </header>
    <div className="flex items-start gap-3 rounded-xl bg-[var(--color-surface-container-low)] p-4 text-sm leading-6 text-[var(--color-on-surface-variant)]"><Info className="mt-0.5 size-5 shrink-0 text-[var(--color-primary)]" aria-hidden="true" /><p><strong className="text-[var(--color-on-surface)]">Lưu ý trải nghiệm:</strong> Dữ liệu minh họa trong bộ nhớ, mất khi tải lại trang. Điểm, nhận xét AI và kết quả chạy test là ví dụ dựng sẵn, không đánh giá câu trả lời bạn nhập.</p></div>
    <nav aria-label="Các bước xem assessment mẫu" className="grid grid-cols-2 gap-1.5 rounded-xl bg-[var(--color-surface-card)] p-1.5 shadow-sm md:grid-cols-4">{steps.map((label, index) => <button key={label} type="button" aria-current={step === index ? "step" : undefined} onClick={() => { setStep(index); setNotice(""); }} className={`flex min-h-12 items-center justify-center gap-2 rounded-lg px-3 py-3 text-left text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-primary)] ${step === index ? "bg-[var(--color-primary)] text-[var(--color-on-primary)] shadow-sm" : "text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-low)]"}`}><span className={`grid size-6 shrink-0 place-items-center rounded-full text-xs ${step === index ? "bg-[var(--color-on-primary)] text-[var(--color-primary)]" : "bg-[var(--color-surface-container)]"}`}>{index + 1}</span>{label}</button>)}</nav>
    {notice && <p role="status" className="rounded-lg bg-[var(--color-primary-soft)] p-3 text-sm text-[var(--color-primary)]">{notice}</p>}

    {step === 0 && <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <div className="space-y-4"><section className={panel}><h2 className="flex items-center gap-2 font-semibold"><BookOpen className="size-5 text-[var(--color-primary)]" aria-hidden="true" />Ngân hàng mẫu ({bank.length} câu)</h2><p className={muted}>Chọn câu hỏi để nạp vào trình biên soạn</p>{bank.map(item => <button key={item.id} type="button" aria-pressed={selected === item.id} onClick={() => choose(item)} className={`relative w-full overflow-hidden rounded-xl border p-4 text-left transition-colors ${selected === item.id ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]" : "border-transparent bg-[var(--color-surface-container-low)] hover:bg-[var(--color-surface-container)]"}`}><span className="flex flex-wrap items-center justify-between gap-2 text-xs"><span className="flex items-center gap-2"><span className={badge}>{item.questionType}</span>{item.skill}</span><strong className="text-[var(--color-primary)]">{item.points} điểm</strong></span><span className="mt-3 block text-sm font-semibold leading-6">{item.questionText}</span></button>)}</section><div className={`${panel} flex flex-wrap justify-between gap-4`}><div><p className={muted}>Tổng điểm kiểm tra</p><strong className="text-lg">100 điểm</strong></div><div><p className={muted}>Thời gian làm bài</p><strong className="text-lg">45 phút</strong></div></div></div>
      <section className={`${panel} min-w-0`}>
        <div className="flex flex-wrap gap-2 border-b border-[var(--color-border-default)] pb-4">{[{ type: "ESSAY", label: "Soạn Tự luận (Essay Rubric)" }, { type: "CODING", label: "Soạn Lập trình (Coding Problem)" }].map(item => <Button key={item.type} variant={question.questionType === item.type ? "primary" : "ghost"} onClick={() => choose(bank.find(row => row.questionType === item.type)!)}>{item.label}</Button>)}</div>
        <div className="flex flex-wrap justify-between gap-3"><div><h2 className="text-lg font-semibold">{question.questionType === "CODING" ? "Biên soạn bài toán Lập trình" : question.questionType === "ESSAY" ? "Biên soạn câu hỏi Tự luận" : "Câu hỏi Trắc nghiệm"}</h2><p className={muted}>{question.difficulty} · {question.skill} · Câu #{question.id}</p></div><span className={badge}>{question.points} điểm tối đa</span></div>
        {(question.questionType === "ESSAY" || question.questionType === "CODING") ? <><label className="block space-y-2 text-sm font-medium">Đề bài & yêu cầu<textarea rows={5} className={assessmentInput} value={prompt} onChange={event => setPrompt(event.target.value)} /></label><div className="preview-authoring"><PreviewQuestionAuthoring type={question.questionType === "CODING" ? "CODING" : "ESSAY"} value={rubric} onChange={setRubric} /></div><FieldError message={error} /><div className="flex flex-wrap justify-end gap-2 border-t border-[var(--color-border-default)] pt-4"><Button variant="secondary" onClick={() => choose(question)}>Hủy thay đổi</Button><Button onClick={saveQuestion}>Lưu câu hỏi mẫu</Button></div><p className="text-xs text-[var(--color-on-surface-variant)]">Đáp án tham khảo, rubric và test ẩn chỉ dành cho người biên soạn/chấm bài.</p></> : <>{question.options.map(item => <p key={item.id} className="rounded-lg bg-[var(--color-surface-container-low)] p-3 text-sm">{item.optionText}{item.correct ? " · Đáp án đúng" : ""}</p>)}</>}
      </section>
    </div>}

    {step === 1 && <div className="space-y-6"><div><h2 className="text-xl font-semibold">Cấu trúc đề: Java Backend Developer Assessment</h2><p className={muted}>Đề thi gồm phần Quiz (trắc nghiệm &amp; tự luận) rồi phần Coding · 45 phút · Ngưỡng đạt 60/100.</p></div><div className="grid gap-6 md:grid-cols-2">{["Phần 1: Trắc nghiệm & tự luận", "Phần 2: Lập trình"].map((label, index) => <section key={label} className={panel}><div className="flex flex-wrap justify-between gap-3"><h3 className="flex items-center gap-2 text-lg font-semibold"><ClipboardList className="size-5 text-[var(--color-primary)]" aria-hidden="true" />{label}</h3><span className={badge}>{index === 0 ? "60 điểm · làm từng câu" : "40 điểm"}</span></div><p className={muted}>{index === 0 ? "Quizizz-style: MCQ và tự luận tuần tự trước khi chốt" : "HackerRank-style: editor + chạy test mẫu"}</p>{bank.filter(item => index === 0 ? item.questionType !== "CODING" : item.questionType === "CODING").map(item => <div key={item.id} className="rounded-lg bg-[var(--color-surface-container-low)] p-4 text-sm leading-6"><strong>{item.points} điểm · {item.skill}</strong><p className="mt-1">{item.questionText}</p></div>)}<p className="flex items-center gap-2 text-sm text-[var(--color-primary)]"><CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />{index === 0 ? "MCQ chấm tự động · Essay chờ duyệt · Khóa sau khi chốt phần" : "Sandbox test mẫu · Hidden tests khi chấm"}</p></section>)}</div><div className={`${panel} flex flex-wrap items-center justify-between gap-4`}><div><h3 className="font-semibold">Sẵn sàng thử nghiệm trải nghiệm ứng viên?</h3><p className={muted}>Chuyển sang Bước 3 để tương tác với giao diện làm bài mẫu.</p></div><Button onClick={() => setStep(2)}>Ứng viên làm bài<ArrowRight className="size-4" aria-hidden="true" /></Button></div></div>}

    {step === 2 && <div className="space-y-6">
      <div className={`${panel} flex flex-wrap items-center justify-between gap-4`}><div className="flex items-center gap-3"><span className="grid size-12 shrink-0 place-items-center rounded-full bg-[var(--color-primary-soft)] font-bold text-[var(--color-primary)]">NA</span><div><h2 className="font-semibold">Nguyễn Minh Anh <span className="ml-2 text-xs font-normal text-[var(--color-on-surface-variant)]">Ứng viên mẫu</span></h2><p className={muted}>{submitted ? "Đã nộp · Đang chờ chấm" : objectiveDone ? "Phần 2 · Lập trình (HackerRank)" : "Phần 1 · Quiz (trắc nghiệm & tự luận)"}</p></div></div><div className="flex flex-wrap items-center gap-4"><span className="flex items-center gap-2 text-sm"><Clock3 className="size-5 text-[var(--color-primary)]" aria-hidden="true" />45:00 <span className="text-xs text-[var(--color-on-surface-variant)]">· Đồng hồ minh họa</span></span>{objectiveDone && <Button variant="secondary" disabled={submitted} onClick={() => setObjectiveDone(false)}>Xem mẫu phần Quiz</Button>}{objectiveDone && <Button disabled={submitted || !answer.trim() || !source.trim()} onClick={submitDemo}>Nộp bài mẫu & Chấm điểm<ArrowRight className="size-4" aria-hidden="true" /></Button>}</div></div>
      {!objectiveDone ? <div className="space-y-6"><section className={`${panel} mx-auto max-w-3xl`}><span className={badge}>CÂU 1 · MCQ · 10 điểm</span><h3 className="text-lg font-semibold">{bank[0].questionText}</h3>{bank[0].options.map(item => <label key={item.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 text-sm ${option === item.id ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]" : "border-[var(--color-border-default)]"}`}><input type="radio" name="preview-objective" checked={option === item.id} onChange={() => setOption(item.id)} />{item.optionText}</label>)}</section><section className={`${panel} mx-auto max-w-3xl`}><div className="flex flex-wrap justify-between gap-3"><span className={badge}>CÂU 2 · ESSAY · {reviewQuestion.skill}</span><strong className="text-sm text-[var(--color-primary)]">{reviewQuestion.points} điểm</strong></div><h3 className="text-lg font-semibold leading-7">{reviewQuestion.questionText}</h3><label className="mt-4 block space-y-2 text-sm font-semibold">Bài làm của ứng viên<textarea rows={10} maxLength={10000} className={`${assessmentInput} font-normal leading-7`} value={answer} disabled={submitted} onChange={event => setAnswer(event.target.value)} /></label><p className={muted}>Chốt phần Quiz sẽ khóa trắc nghiệm &amp; tự luận, rồi mở phần lập trình.</p><Button disabled={!option || !answer.trim()} onClick={() => setObjectiveDone(true)}>Chốt phần Quiz &amp; chuyển lập trình<ArrowRight className="size-4" aria-hidden="true" /></Button></section></div> : <CodingPreviewPanel question={codeQuestion} source={source} onSourceChange={setSource} submitted={submitted} approved={codeApproved} onApprove={setCodeApproved} />}
    </div>}

    {step === 3 && <div className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold">Chấm & duyệt điểm · Góc nhìn Recruiter</h2><span className={badge}>{submitted ? "Bài mẫu vừa nộp" : "Bài làm dựng sẵn"}</span></div><div className="grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
      <div className="min-w-0 space-y-6"><section className={panel}><div className="flex flex-wrap justify-between gap-2"><span className={badge}>CÂU 2 · ESSAY</span><span className="text-sm">Thang điểm: {reviewQuestion.points}</span></div><h3 className="text-lg font-semibold">Bài làm của ứng viên (Nguyễn Minh Anh)</h3><p className={muted}>{reviewQuestion.questionText}</p><div className="whitespace-pre-wrap rounded-xl bg-[var(--color-surface-container-low)] p-5 text-sm leading-7">{answer}</div><details className="text-sm"><summary className="cursor-pointer font-medium text-[var(--color-primary)]">Đáp án tham khảo</summary><p className="mt-3 whitespace-pre-wrap leading-6">{reviewQuestion.rubricJson?.referenceAnswer}</p></details></section>
      <section className={panel}><h3 className="flex items-center gap-2 text-lg font-semibold"><Sparkles className="size-5 text-[var(--color-primary)]" aria-hidden="true" />Đánh giá minh họa theo tiêu chí</h3><p className={muted}>Rubric Evaluation · Nhận xét giữ cố định khi sửa bài làm</p>{weights.map((item, index) => <div key={index} className="space-y-3 rounded-xl bg-[var(--color-surface-container-low)] p-4"><div className="flex flex-wrap justify-between gap-2"><h4 className="text-sm font-semibold">{index + 1}. {item.description}</h4><span className={badge}>Mức đạt: {essayPreviewFeedback[index]?.percent ?? 0}%</span></div><p className="text-xs text-[var(--color-on-surface-variant)]">Tỉ trọng {item.weight}% · Điểm đạt {(reviewQuestion.points * item.weight * (essayPreviewFeedback[index]?.percent ?? 0) / 10000).toFixed(2)} / {(reviewQuestion.points * item.weight / 100).toFixed(2)}</p><p className={muted}><strong>Nhận xét AI minh họa:</strong> {essayPreviewFeedback[index]?.feedback ?? "Tiêu chí mới chưa có nhận xét minh họa."}</p></div>)}<div className="rounded-lg bg-[var(--color-primary-soft)] p-4 text-sm text-[var(--color-primary)]">{reviewQuestion.points} × Σ(tỉ trọng × mức đạt) = <strong>{suggested}/{reviewQuestion.points} điểm đề xuất</strong></div></section>
      <CodingPreviewPanel question={codeQuestion} source={source} onSourceChange={setSource} submitted={submitted} review approved={codeApproved} onApprove={setCodeApproved} /></div>
      <aside className="space-y-6 lg:sticky lg:top-6"><section className={panel}><h3 className="font-semibold">Duyệt điểm Tự luận Câu 2</h3><p className="text-4xl font-bold text-[var(--color-primary)]">{approved ?? suggested}<span className="ml-2 text-base font-normal text-[var(--color-on-surface-variant)]">/ {reviewQuestion.points} điểm</span></p><p className={muted}>{approved == null ? "Điểm AI minh họa đề xuất theo rubric" : "Điểm chính thức đã duyệt trong mẫu"}</p><Button className="w-full" onClick={() => approve(suggested)}><CheckCircle2 className="size-4" aria-hidden="true" />Chấp thuận điểm mẫu</Button><div className="border-t border-[var(--color-border-default)] pt-4"><label className="block space-y-2 text-sm">Điểm sau điều chỉnh thủ công<input type="number" min={0} max={reviewQuestion.points} step="0.01" className={assessmentInput} value={score} onChange={event => setScore(event.target.value)} /></label>{!scoreValid && <FieldError message={`Nhập điểm từ 0 đến ${reviewQuestion.points}, tối đa 2 chữ số thập phân.`} />}<Button variant="secondary" className="mt-3 w-full" disabled={!scoreValid} onClick={() => approve(Number(score))}>Lưu điểm điều chỉnh</Button></div></section>
      <section className={panel}><h3 className="font-semibold">Tổng kết điểm toàn bài thi</h3><div className="space-y-3">{summary.map(([label, value]) => <div key={label} className="flex flex-wrap justify-between gap-2 text-sm"><span className="text-[var(--color-on-surface-variant)]">{label}</span><strong>{value}</strong></div>)}</div><div className="border-t border-[var(--color-border-default)] pt-4"><p className="text-xs font-semibold uppercase text-[var(--color-on-surface-variant)]">Tổng điểm chính thức</p><p className="mt-2 text-3xl font-bold text-[var(--color-primary)]">{totalScore == null ? "Chờ duyệt" : totalScore}<span className="text-base font-normal"> / 100</span></p>{totalScore != null && <p role="status" className="mt-3 text-sm font-semibold text-[var(--color-primary)]">{totalScore >= 60 ? "Đạt" : "Chưa đạt"} · Ngưỡng 60 điểm</p>}</div><p className="rounded-lg bg-[var(--color-surface-container-low)] p-3 text-xs leading-5 text-[var(--color-on-surface-variant)]">Recruiter duyệt tự luận và code trước khi có điểm tổng chính thức. Đây là thao tác minh họa, không công bố kết quả thật cho ứng viên.</p></section></aside>
    </div></div>}
  </div>;
}
