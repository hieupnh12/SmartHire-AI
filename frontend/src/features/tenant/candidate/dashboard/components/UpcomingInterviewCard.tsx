import { CalendarClock } from "lucide-react";
import { Card } from "@/components/ux/Card";
import { NEXT_INTERVIEW_DATE } from "@/features/tenant/candidate/dashboard/constants/candidateDashboard";

export function UpcomingInterviewCard() {
  return (
    <Card className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-[#eff6ff] text-[#2563eb]">
          <CalendarClock className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h2 className="font-display text-base font-semibold text-[#0f172a]">Lịch sắp tới</h2>
          <p className="text-xs text-[#64748b]">{NEXT_INTERVIEW_DATE} · AI Interview</p>
        </div>
      </div>
      <p className="text-sm leading-6 text-[#475569]">
        Hệ thống sẽ mở phòng phỏng vấn trước giờ hẹn 10 phút.
      </p>
    </Card>
  );
}