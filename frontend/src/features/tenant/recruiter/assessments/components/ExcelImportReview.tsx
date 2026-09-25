import { AssessmentPublishReview } from "./AssessmentPublishReview";
import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ArrowLeft, ArrowRight, BookOpen, Check, CheckCircle2, Download, FileCheck2, FileSpreadsheet, ListChecks, Search, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ux/Button";
import { cn } from "@/lib/utils";
import { typeMeta, type BankQuestion } from "../constants/excelTemplateMock";
import { importErrorCsv, validateExcelQuestions } from "../utils/excelImportValidation";

const panel = "rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)]";
const muted = "text-[var(--color-on-surface-variant)]";
type Filter = "all" | "valid" | "error" | "unsupported";

export function ExcelImportReview({ questions, jobId, jobTitle, onBack, onEdit }: {
  questions: BankQuestion[];
  jobId: number;
  jobTitle: string;
  onBack: () => void;
  onEdit: (index: number) => void;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [defaultScore, setDefaultScore] = useState(5);
  const [policy, setPolicy] = useState<"valid" | "all">("valid");
  const [acknowledged, setAcknowledged] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, [step, confirmed]);
  const rows = useMemo(() => validateExcelQuestions(questions, defaultScore), [questions, defaultScore]);
  const blank = rows.filter((item) => item.skipped);
  const active = rows.filter((item) => !item.skipped);
  const valid = active.filter((item) => !item.errors.length && !item.unsupported);
  const errors = active.filter((item) => item.errors.length > 0);
  const unsupported = active.filter((item) => item.unsupported);
  const excluded = active.length - valid.length;
  const totalPoints = valid.reduce((sum, item) => sum + (item.row.score.trim() ? Number(item.row.score) : defaultScore), 0);
  const canContinue = valid.length > 0 && valid.length <= 100 && (policy === "valid" || excluded === 0);
  const filtered = active.filter((item) => {
    if (step > 1 && (item.errors.length || item.unsupported)) return false;
    if (step === 1 && filter === "valid" && (item.errors.length || item.unsupported)) return false;
    if (step === 1 && filter === "error" && !item.errors.length) return false;
    if (step === 1 && filter === "unsupported" && !item.unsupported) return false;
    return (
      !search.trim() ||
      [item.row.content, item.row.id, item.row.skill, item.row.difficulty, String(item.line)].some((value) =>
        value.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()),
      )
    );
  });
  const pageCount = Math.max(1, Math.ceil(filtered.length / 10));
  const safePage = Math.min(page, pageCount - 1);
  const shown = filtered.slice(safePage * 10, safePage * 10 + 10);
  const changeStep = (next: 1 | 2 | 3) => { setStep(next); setPage(0); setSearch(""); };
  function downloadErrors() {
    const url = URL.createObjectURL(new Blob([importErrorCsv(rows)], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a");
    link.href = url; link.download = "bao-cao-kiem-tra-excel.csv"; link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return <><div hidden={step < 2}><AssessmentPublishReview active={step >= 2} rows={valid} jobId={jobId} jobTitle={jobTitle} defaultScore={defaultScore} onBack={() => changeStep(1)} onEdit={onEdit} /></div><section hidden={step >= 2} className={cn(panel, "overflow-hidden text-[var(--color-on-surface)]")}>
    <header className="space-y-6 bg-[var(--color-surface-container-low)]/70 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--color-primary)] text-[var(--color-on-primary)]"><FileSpreadsheet className="size-6" aria-hidden="true" /></span>
          <div><h1 ref={heading} tabIndex={-1} className="text-xl font-semibold tracking-tight outline-none sm:text-2xl">{confirmed ? "Đã xác nhận dữ liệu nhập" : "Kiểm tra dữ liệu import Excel"}</h1><p className={cn(muted, "mt-1 text-sm leading-6")}>Đối soát câu hỏi từ bảng Excel trước khi đưa vào cấu trúc bài đánh giá.</p><p className="mt-1 text-xs font-medium text-[var(--color-primary)]">Vị trí: {jobTitle}</p></div>
        </div>
        <div className="flex items-center gap-2"><Button variant="secondary" size="sm" aria-expanded={showGuide} aria-controls="excel-import-guide" onClick={() => setShowGuide(!showGuide)}><BookOpen className="size-4" aria-hidden="true" />Hướng dẫn</Button><Button variant="ghost" size="sm" aria-label="Đóng kiểm tra, quay lại bảng Excel" onClick={onBack}><X className="size-5" aria-hidden="true" /></Button></div>
      </div>
      <ol aria-label="Các bước nhập bài đánh giá" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {["Soạn bảng Excel", "Kiểm tra & báo lỗi", "Xem trước dữ liệu", "Xác nhận nhập đề"].map((label, index) => <li key={label} aria-current={index === step ? "step" : undefined} className={cn("flex items-center gap-3 rounded-xl p-3", index === step ? "bg-[var(--color-surface-card)] ring-2 ring-[var(--color-primary)]" : "bg-[var(--color-surface-card)]/60")}><span className={cn("grid size-8 shrink-0 place-items-center rounded-full text-sm font-semibold", index <= step ? "bg-[var(--color-primary)] text-[var(--color-on-primary)]" : "bg-[var(--color-surface-container-high)] text-[var(--color-outline)]")}>{index < step || confirmed ? <Check className="size-4" aria-hidden="true" /> : String.fromCharCode(65 + index)}</span><div><p className={cn(muted, "text-[10px] font-semibold uppercase tracking-wider")}>Bước {String.fromCharCode(65 + index)}</p><p className="text-sm font-semibold">{label}</p></div></li>)}
      </ol>
    </header>

    <div className="space-y-6 p-4 sm:p-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Tổng số dòng kiểm tra", count: active.length, hint: blank.length ? `Bỏ qua ${blank.length} hàng trống` : "Nguồn: bảng Excel đang soạn", icon: FileSpreadsheet, tone: "text-[var(--color-on-surface)]" },
          { label: "Hợp lệ, sẵn sàng nhập", count: valid.length, hint: "Đủ content, độ khó, kỹ năng", icon: CheckCircle2, tone: "text-[var(--color-primary)]" },
          { label: "Dòng có lỗi dữ liệu", count: errors.length, hint: "Thiếu trường bắt buộc hoặc đáp án", icon: AlertTriangle, tone: "text-[var(--color-error)]" },
          { label: "Loại câu chưa hỗ trợ", count: unsupported.length, hint: "Không tự chuyển đổi loại câu hỏi", icon: ShieldCheck, tone: "text-[var(--color-on-surface-variant)]" },
        ].map(({ label, count, hint, icon: Icon, tone }) => <div key={label} className="rounded-xl bg-[var(--color-surface-container-low)] p-4"><div className={cn(muted, "flex items-center justify-between gap-2 text-xs font-medium")}><span>{label}</span><Icon className={cn("size-4 shrink-0", tone)} aria-hidden="true" /></div><p className={cn("mt-3 text-3xl font-semibold", tone)}>{count}<span className={cn(muted, "ml-2 text-xs font-normal")}>dòng</span></p><p className={cn(muted, "mt-2 text-xs")}>{hint}</p></div>)}
      </div>
      {confirmed && <div role="status" className="flex items-start gap-3 rounded-xl bg-[var(--color-primary-subtle)] p-4 text-sm"><CheckCircle2 className="size-5 shrink-0 text-[var(--color-primary)]" aria-hidden="true" /><div><p className="font-semibold">Đã xác nhận {valid.length} câu hỏi · {totalPoints} điểm</p><p className={cn(muted, "mt-1")}>Tiếp tục bước xem trước để lưu bài đánh giá dưới dạng bản nháp (DRAFT).</p></div></div>}
      <div className={cn(panel, "overflow-hidden")}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border-default)] p-4">
          {step === 1 ? <div className="flex flex-wrap gap-1 rounded-xl bg-[var(--color-surface-container-low)] p-1" aria-label="Lọc kết quả kiểm tra">{([{ id: "all", label: "Tất cả", count: active.length }, { id: "valid", label: "Hợp lệ", count: valid.length }, { id: "error", label: "Có lỗi", count: errors.length }, { id: "unsupported", label: "Chưa hỗ trợ", count: unsupported.length }] as const).map(tab => <button key={tab.id} type="button" aria-pressed={filter === tab.id} onClick={() => { setFilter(tab.id); setPage(0); }} className={cn("min-h-9 rounded-lg px-3 text-xs font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]", filter === tab.id ? "bg-[var(--color-surface-card)] text-[var(--color-primary)] shadow-sm" : muted)}>{tab.label} ({tab.count})</button>)}</div> : <h2 className="font-semibold">{step === 2 ? "Xem trước câu hỏi hợp lệ" : "Cấu trúc đề sau khi nhập"}</h2>}
          <Button variant="secondary" size="sm" disabled={!excluded} onClick={downloadErrors}><Download className="size-4" aria-hidden="true" />Tải báo cáo lỗi (.csv)</Button>
        </div>
        <div className="p-4"><label className="relative block max-w-md"><Search className="absolute left-3 top-3 size-4 text-[var(--color-outline)]" aria-hidden="true" /><input aria-label="Tìm trong dữ liệu import" value={search} onChange={event => { setSearch(event.target.value); setPage(0); }} placeholder="Tìm nội dung, kỹ năng, mã hoặc số dòng…" className="h-10 w-full rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-container-low)] pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]" /></label></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[920px] text-left text-sm"><thead className="bg-[var(--color-surface-container-low)] text-xs text-[var(--color-on-surface-variant)]"><tr>{["Dòng #", "Kỹ năng", "Nội dung câu hỏi", "Loại câu", "Độ khó", "Đáp án", "Trạng thái & chi tiết"].map(label => <th key={label} scope="col" className="px-4 py-3 font-semibold">{label}</th>)}</tr></thead><tbody>
          {shown.map(item => <tr key={item.line} className={cn("border-t border-[var(--color-border-default)]", item.errors.length > 0 && "bg-[var(--color-error-container)]/20")}><td className="px-4 py-4 font-mono text-xs">#{item.line}</td><td className={cn(muted, "max-w-36 break-words px-4 py-4 text-xs")}>{item.row.skill || "—"}</td><td className="min-w-64 max-w-sm px-4 py-4"><p className={cn("whitespace-pre-wrap break-words", !item.row.content.trim() && "italic text-[var(--color-error)]")}>{item.row.content.trim() || "[Ô dữ liệu để trống]"}</p>{step > 1 && <ul className="mt-3 space-y-1 text-xs">{[item.row.optionA, item.row.optionB, item.row.optionC, item.row.optionD].map((option, i) => option.trim() && <li key={i} className={item.row.answer.trim().toUpperCase() === String.fromCharCode(65 + i) ? "font-semibold text-[var(--color-primary)]" : muted}>{String.fromCharCode(65 + i)}. {option}</li>)}</ul>}</td><td className={cn(muted, "px-4 py-4 text-xs")}>{typeMeta(item.row.kind).label}</td><td className="px-4 py-4 text-xs">{item.row.difficulty || "—"}</td><td className="px-4 py-4 font-mono text-xs">{item.row.answer || "—"}</td><td className="min-w-64 px-4 py-4 text-xs">{item.errors.length > 0 && <ul className="space-y-1 text-[var(--color-error)]">{item.errors.map(error => <li key={error} className="flex gap-1.5"><AlertTriangle className="mt-0.5 size-3 shrink-0" aria-hidden="true" />{error}</li>)}</ul>}{item.unsupported && <p className={cn(muted, "mt-1")}>Chưa hỗ trợ nhập loại câu này vào đề. Dòng sẽ được giữ lại trong bảng Excel.</p>}{!item.errors.length && !item.unsupported && <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-primary-subtle)] px-2.5 py-1 font-medium text-[var(--color-primary)]"><CheckCircle2 className="size-3.5" aria-hidden="true" />Hợp lệ · {item.row.score.trim() || defaultScore} điểm</span>}{!confirmed && <button type="button" onClick={() => onEdit(item.line - 2)} className="mt-2 block min-h-8 font-semibold text-[var(--color-primary)] underline underline-offset-4">Sửa dòng {item.line}</button>}</td></tr>)}
          {!shown.length && <tr><td colSpan={7} className={cn(muted, "p-10 text-center")}>Không có dòng dữ liệu phù hợp.</td></tr>}
        </tbody></table></div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border-default)] p-4"><p className={cn(muted, "text-xs")}>{filtered.length ? safePage * 10 + 1 : 0}–{Math.min((safePage + 1) * 10, filtered.length)} / {filtered.length} dòng</p><div className="flex items-center gap-3"><Button variant="secondary" size="sm" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>Trước</Button><span className="text-xs">{safePage + 1} / {pageCount}</span><Button variant="secondary" size="sm" disabled={safePage + 1 >= pageCount} onClick={() => setPage(safePage + 1)}>Sau</Button></div></div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <div className="space-y-4"><h2 className="flex items-center gap-2 font-semibold"><ListChecks className="size-5 text-[var(--color-primary)]" aria-hidden="true" />Quy tắc nhập dữ liệu</h2><fieldset disabled={confirmed} className="space-y-3"><legend className="sr-only">Cách xử lý dòng không hợp lệ</legend>{([{ value: "valid", title: "Chỉ nhập các dòng hợp lệ", hint: "Bỏ qua dòng lỗi và loại câu chưa hỗ trợ; giữ nguyên bảng nguồn để sửa sau." }, { value: "all", title: "Chỉ tiếp tục khi toàn bộ dữ liệu hợp lệ", hint: "Yêu cầu sửa tất cả dòng lỗi và loại bỏ các loại câu chưa hỗ trợ trước khi tiếp tục." }] as const).map(option => <label key={option.value} className={cn("flex cursor-pointer gap-3 rounded-xl border p-4", policy === option.value ? "border-[var(--color-primary)] bg-[var(--color-primary-subtle)]" : "border-[var(--color-border-default)]")}><input type="radio" name="import-policy" value={option.value} checked={policy === option.value} onChange={() => { setPolicy(option.value); setAcknowledged(false); }} className="mt-1 accent-[var(--color-primary)]" /><span><span className="block text-sm font-semibold">{option.title}</span><span className={cn(muted, "mt-1 block text-xs leading-5")}>{option.hint}</span></span></label>)}<label className="flex flex-wrap items-center gap-3 text-sm">Điểm mặc định khi ô điểm trống<input type="number" min={1} max={10000} step={1} value={defaultScore} onChange={event => { setDefaultScore(Number(event.target.value)); setAcknowledged(false); }} className="h-10 w-24 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-container-low)] px-3 outline-none focus:ring-2 focus:ring-[var(--color-primary)]" /></label></fieldset><div className="flex gap-3 rounded-xl bg-[var(--color-surface-container-low)] p-4"><ShieldCheck className="size-5 shrink-0 text-[var(--color-primary)]" aria-hidden="true" /><p className={cn(muted, "text-xs leading-6")}>Chỉ lưu câu hỏi đủ <strong className="text-[var(--color-on-surface)]">content</strong>, <strong className="text-[var(--color-on-surface)]">difficulty</strong> và <strong className="text-[var(--color-on-surface)]">skill</strong>. Hàng trống bị bỏ qua, không ghi database. Tối đa 100 câu.</p></div></div>
        <aside className="flex flex-col justify-between rounded-2xl bg-[var(--color-surface-container-low)] p-5"><div><div className="mb-5 flex items-center justify-between gap-2"><h2 className="font-semibold">Tóm tắt chuẩn bị nhập</h2><span className="rounded-full bg-[var(--color-primary-subtle)] px-2 py-1 text-[10px] font-semibold text-[var(--color-primary)]">ĐỀ MỚI</span></div><dl className="space-y-3 text-sm">{[["Vị trí tuyển dụng", jobTitle], ["Số câu hỏi sẽ lưu", valid.length + " câu"], ["Hàng trống (bỏ qua)", blank.length + " dòng"], ["Số dòng lỗi / loại trừ", excluded + " dòng"], ["Tổng điểm", totalPoints + " điểm"], ["Cấu trúc đề", valid.length + " / 100 câu"]].map(([label, value]) => <div key={label} className="flex justify-between gap-5"><dt className={muted}>{label}</dt><dd className="max-w-[55%] text-right font-semibold">{value}</dd></div>)}</dl></div><div className="mt-6 space-y-3">{!canContinue && <p role="alert" className="text-xs leading-5 text-[var(--color-error)]">{valid.length === 0 ? "Chưa có câu hỏi hợp lệ để nhập." : valid.length > 100 ? "Vượt giới hạn 100 câu. Quay lại bảng để giảm số câu." : "Cần xử lý hết các dòng không hợp lệ theo quy tắc đã chọn."}</p>}{step === 3 && !confirmed && <label className="flex items-start gap-2 text-xs leading-5"><input type="checkbox" checked={acknowledged} onChange={event => setAcknowledged(event.target.checked)} className="mt-1 accent-[var(--color-primary)]" /><span>Tôi đã kiểm tra {valid.length} câu hỏi và đồng ý bỏ qua {excluded} dòng không hợp lệ trong lượt nhập này.</span></label>}{!confirmed && <Button className="w-full" disabled={!canContinue || (step === 3 && !acknowledged)} onClick={() => step < 3 ? changeStep((step + 1) as 2 | 3) : setConfirmed(true)}>{step === 3 ? <FileCheck2 className="size-4" aria-hidden="true" /> : <ArrowRight className="size-4" aria-hidden="true" />}{step === 1 ? "Xem trước " + valid.length + " câu hỏi" : step === 2 ? "Tiếp tục xác nhận" : "Xác nhận " + valid.length + " câu hỏi hợp lệ"}</Button>}{step > 1 && !confirmed && <Button variant="secondary" className="w-full" onClick={() => changeStep((step - 1) as 1 | 2)}>Quay lại bước trước</Button>}<Button variant="ghost" className="w-full" onClick={onBack}><ArrowLeft className="size-4" aria-hidden="true" />Quay lại bảng Excel</Button></div></aside>
      </div>
      {showGuide && <section id="excel-import-guide" className="space-y-4 rounded-xl bg-[var(--color-surface-container-low)] p-5"><h2 className="flex items-center gap-2 font-semibold"><BookOpen className="size-5 text-[var(--color-primary)]" aria-hidden="true" />Hướng dẫn kiểm tra dữ liệu</h2><div className="grid gap-4 md:grid-cols-3">{[["Content · độ khó · kỹ năng", "Chỉ lưu câu hỏi đã điền đủ content, difficulty và skill. Hàng trống hoàn toàn sẽ bị bỏ qua khi gọi API."], ["Lựa chọn & đáp án", "Ít nhất hai lựa chọn có nội dung. Đáp án đúng là A, B, C hoặc D và phải trỏ đến lựa chọn không trống."], ["Loại câu & cấu trúc", "Luồng nhập đề hiện hỗ trợ trắc nghiệm một đáp án, tối đa 100 câu. Các loại câu khác được giữ ở bảng nguồn."]].map(([title, text]) => <div key={title} className="rounded-xl bg-[var(--color-surface-card)] p-4"><h3 className="text-sm font-semibold">{title}</h3><p className={cn(muted, "mt-2 text-xs leading-6")}>{text}</p></div>)}</div><p className={cn(muted, "text-xs")}>Báo cáo lỗi xuất dạng CSV có thể mở bằng Excel. Số dòng tính cả hàng tiêu đề, bắt đầu từ dòng 2.</p></section>}
    </div>
  </section></>;
}
