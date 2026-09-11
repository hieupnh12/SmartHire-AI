import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { matchingApi } from "@/api/tenant/matchingApi";
import { getApiErrorMessage } from "@/lib/axios";
import type { RankingBoard, RankingRow, RankingSources, Selection } from "../types/ranking";
import { button, input, labels, muted, primary, scoreText } from "./rankingUi";

const sourceId = z.preprocess((value) => value === "" || value === null ? null : Number(value), z.number().int().positive().nullable());
const selectionSchema = z.object({ cvId: sourceId, attemptId: sourceId, interviewId: sourceId });
function SourceForm({ sources, row, onSaved }: { sources: RankingSources; row: RankingRow; onSaved: (board: RankingBoard) => void }) {
  const form = useForm<Selection>({ resolver: zodResolver(selectionSchema), defaultValues: sources.selected });
  const mutation = useMutation({ mutationFn: (value: Selection) => matchingApi.selectSources(row.applicationId, value),
    onSuccess: (response) => onSaved(response.data) });
  return <form onSubmit={form.handleSubmit((value) => mutation.mutate(value))} className="space-y-3">
    <h3 className="font-semibold">Nguồn đánh giá chính thức</h3>
    <p className={muted}>Tự chọn khi chỉ có một nguồn. Nếu có nhiều nguồn, hãy chọn CV hoặc lần đánh giá dùng để xếp hạng.</p>
    {([{ key: "cvId", label: "CV", options: sources.cvs }, { key: "attemptId", label: "Assessment", options: sources.attempts },
      { key: "interviewId", label: "AI Interview", options: sources.interviews }] as const).map(({ key, label, options }) =>
      <label key={key} className="block space-y-1 text-sm"><span>{label}</span>
        <select className={input} {...form.register(key)} disabled={mutation.isPending}>
          <option value="">Tự chọn nếu có một nguồn</option>
          {options.map((option) => <option key={option.id} value={option.id}>{option.label} · {labels[option.status] ?? option.status}</option>)}
        </select>
        {form.formState.errors[key] && <span role="alert">Nguồn không hợp lệ.</span>}
      </label>)}
    <button type="submit" className={primary} disabled={mutation.isPending}>{mutation.isPending ? "Đang cập nhật…" : "Lưu nguồn và tính lại"}</button>
    {mutation.isError && <p role="alert">{getApiErrorMessage(mutation.error)}</p>}
  </form>;
}

export function RankingDetail({ row, tenantKey, onClose, onSaved }: {
  row: RankingRow; tenantKey: string; onClose: () => void; onSaved: (board: RankingBoard) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { const element = dialog.current; element?.showModal(); return () => element?.close(); }, []);
  const sources = useQuery({ queryKey: ["ranking-sources", tenantKey, row.applicationId], queryFn: () => matchingApi.sources(row.applicationId) });
  return <dialog ref={dialog} onCancel={(event) => { event.preventDefault(); onClose(); }} aria-labelledby="ranking-detail-title"
    className="fixed inset-y-0 left-auto right-0 m-0 h-dvh max-h-dvh w-full max-w-2xl overflow-y-auto border-l border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-6 text-[var(--color-on-surface)] backdrop:bg-[var(--color-on-surface)]/30">
    <div className="mb-6 flex items-start justify-between gap-4">
      <div><p className={muted}>Hồ sơ #{row.applicationId}</p><h2 id="ranking-detail-title" className="text-2xl font-semibold">{row.candidateName}</h2></div>
      <button className={button} onClick={onClose} autoFocus>Đóng</button>
    </div>
    <div className="space-y-6">
      <section className="rounded-2xl bg-[var(--color-surface-container-low)] p-5">
        <p className={muted}>{row.result.complete ? "Điểm rank hoàn chỉnh" : "Điểm tạm tính"}</p>
        <p className="my-2 text-4xl font-semibold">{scoreText(row.result.score)}<span className="text-base font-normal"> / 100</span></p>
        <p className={muted}>{row.result.completedComponents}/{row.result.requiredComponents} thành phần · {row.result.availableWeight}% trọng số có dữ liệu</p>
      </section>
      <section><h3 className="mb-3 font-semibold">Đóng góp vào điểm tổng</h3>
        <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th className="py-2">Thành phần</th><th>Điểm</th><th>Trọng số</th><th>Đóng góp</th></tr></thead>
          <tbody>{row.result.components.map((part) => <tr key={part.key}><th className="py-3 font-normal">{labels[part.key]}<span className={`block ${muted}`}>{labels[part.state] ?? part.state}</span></th>
            <td>{scoreText(part.score)}</td><td>{part.weight}%</td><td>{scoreText(part.contribution)}</td></tr>)}</tbody></table></div>
        {!row.result.complete && <p className={muted}>Điểm tạm tính = tổng đóng góp × 100 / trọng số đã có dữ liệu. Không so hạng với hồ sơ có thành phần khác.</p>}
      </section>
      {row.missingRequired.length > 0 && <p className="rounded-lg bg-[var(--color-surface-container-low)] p-3">Thiếu kỹ năng bắt buộc: {row.missingRequired.join(", ")}. Recruiter xem xét trước khi chuyển vòng.</p>}
      {row.groups.map((group) => <section key={group.category}>
        <h3 className="font-semibold">{labels[group.category] ?? group.category} · {scoreText(group.score)}/100</h3>
        <p className={muted}>Trọng số nhóm {group.weight}% · Bao phủ trực tiếp {scoreText(group.coverage)}%</p>
        <ul className="mt-3 space-y-3">{group.matches.map((match) => <li key={match.requiredSkill} className="rounded-lg bg-[var(--color-surface-alt)] p-3 text-sm">
          <p className="font-semibold">{match.requiredSkill}{match.required ? " · Bắt buộc" : ""}</p>
          <p>{match.similarity === 1 ? "Khớp trực tiếp" : match.similarity > 0 ? `Kỹ năng liên quan: ${match.candidateSkill} · ${scoreText(match.similarity * 100)}%` : "Chưa thấy trong CV"}</p>
          {match.evidence && <p className={muted}>Kỹ năng trích xuất: “{match.evidence}”</p>}
        </li>)}</ul>
      </section>)}
      <section><h3 className="font-semibold">Kinh nghiệm liên quan</h3><p>{row.experienceMonths === null ? "Chưa đủ dữ liệu xác minh" : `${row.experienceMonths} tháng (không cộng trùng)`}</p>
        {row.experienceEvidence.map((quote, i) => <blockquote key={i} className="my-2 border-l-2 border-[var(--color-outline-variant)] pl-3 text-sm">{quote}</blockquote>)}
      </section>
      {row.interviewFeedback && <section><h3 className="font-semibold">Nhận xét AI Interview</h3><p className="whitespace-pre-wrap text-sm">{row.interviewFeedback}</p></section>}
      {sources.isPending && <p role="status">Đang tải nguồn đánh giá…</p>}
      {sources.isError && <div role="alert">{getApiErrorMessage(sources.error)} <button className={button} onClick={() => void sources.refetch()}>Thử lại</button></div>}
      {sources.data?.data && <SourceForm key={JSON.stringify(sources.data.data.selected)} sources={sources.data.data} row={row} onSaved={(board) => { onSaved(board); void sources.refetch(); }} />}
      <nav aria-label="Các bước tuyển dụng" className="flex flex-wrap gap-2">
        <Link className={button} to={`/recruiter/assessments?applicationId=${row.applicationId}`}>Mở Assessment</Link>
        <Link className={button} to={`/recruiter/interviews?applicationId=${row.applicationId}`}>Mở phỏng vấn</Link>
        <Link className={button} to={`/recruiter/schedules?applicationId=${row.applicationId}`}>Mở lịch hẹn</Link>
      </nav>
      <p className={muted}>Các thao tác mời, đặt lịch và từ chối thực hiện tại module tương ứng. Bảng rank không tự chuyển trạng thái ứng viên.</p>
    </div>
  </dialog>;
}
