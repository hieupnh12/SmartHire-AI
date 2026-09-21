import { Link } from "react-router-dom";
import { ClipboardList, Plus } from "lucide-react";
import { PrototypeBanner } from "@/components/ux/PrototypeBanner";
import { StatusPill } from "@/components/ux/StatusPill";
import { button, muted, panel, primary } from "@/features/tenant/recruiter/matching/components/rankingUi";
import { mockTests, testStatusLabel } from "@/features/tenant/recruiter/assessments/constants/mockTests";

export function AssessmentsPage() {
  return (
    <section className="space-y-6 text-[var(--color-on-surface)]">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className={muted}>Tuyển dụng / Technical test</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Quản lý đề kiểm tra</h1>
          <p className={`mt-2 max-w-2xl ${muted}`}>
            Tạo đề trắc nghiệm gắn job, publish, giao cho đơn ứng tuyển, rồi xem điểm. Coding sẽ bổ sung sau.
          </p>
        </div>
        <Link to="new" className={primary}>
          <Plus className="size-4" aria-hidden="true" />
          Tạo đề mới
        </Link>
      </header>

      <PrototypeBanner note="mốc đầu: tạo đề → giao → candidate nộp → xem kết quả" />

      <div className={`${panel} overflow-x-auto`}>
        {mockTests.length === 0 ? (
          <div className="flex flex-col items-start gap-3 py-4">
            <ClipboardList className="size-8 text-[var(--color-on-surface-variant)]" aria-hidden="true" />
            <p className={muted}>Chưa có đề. Tạo đề nháp rồi thêm câu hỏi trắc nghiệm.</p>
            <Link to="new" className={primary}>Tạo đề mới</Link>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className={muted}>
                <th className="py-2">Đề kiểm tra</th>
                <th>Job</th>
                <th>Trạng thái</th>
                <th>Thời gian</th>
                <th>Giao / Nộp</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {mockTests.map((test) => (
                <tr key={test.id} className="border-t border-[var(--color-border-default)]">
                  <td className="py-3">
                    <Link className="font-semibold hover:underline" to={`/recruiter/assessments/${test.id}`}>
                      {test.title}
                    </Link>
                    <p className={muted}>{test.questionCount} câu · đạt từ {test.passingScore}%</p>
                  </td>
                  <td>{test.jobTitle}</td>
                  <td>
                    <StatusPill status={test.status} label={testStatusLabel[test.status]} />
                  </td>
                  <td>{test.durationMinutes} phút</td>
                  <td className="font-mono">
                    {test.assignedCount} / {test.submittedCount}
                  </td>
                  <td className="whitespace-nowrap">
                    <Link className={button} to={`/recruiter/assessments/${test.id}`}>
                      Xem / sửa
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
