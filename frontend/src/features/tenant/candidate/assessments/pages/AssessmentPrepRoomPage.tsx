import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PrototypeBanner } from "@/components/ux/PrototypeBanner";
import { useAuthStore } from "@/features/tenant/auth/stores/authStore";
import { AssessmentPrepRoomView } from "../components/AssessmentPrepRoomView";
import {
  MOCK_COMPANY_NAME,
  mockInvitationAssessments,
  mockInvitationUser,
} from "../constants/mockInvitation";

export function AssessmentPrepRoomPage() {
  const navigate = useNavigate();
  const authUser = useAuthStore((s) => s.user);
  const [starting, setStarting] = useState(false);
  const test = mockInvitationAssessments[0];

  const demoUser = authUser
    ? {
        ...mockInvitationUser,
        fullName: authUser.fullName || mockInvitationUser.fullName,
        email: authUser.email || mockInvitationUser.email,
        phone: authUser.phone ?? mockInvitationUser.phone,
        avatarUrl: authUser.avatarUrl ?? mockInvitationUser.avatarUrl,
        id: authUser.id || mockInvitationUser.id,
      }
    : mockInvitationUser;

  const candidateCode = `CAN-${String(demoUser.id).padStart(4, "0")}`;

  return (
    <section className="space-y-6 text-[var(--color-on-surface)]">
      <PrototypeBanner note="bước kiểm tra kỹ thuật · mock TechViet · chưa nối API phòng thi" />
      <AssessmentPrepRoomView
        user={demoUser}
        companyName={MOCK_COMPANY_NAME}
        durationMinutes={test.durationMinutes}
        candidateCode={candidateCode}
        backTo="/candidate/assessments"
        starting={starting}
        onStart={() => {
          setStarting(true);
          window.setTimeout(() => {
            navigate("/candidate/assessments/exam");
          }, 600);
        }}
      />
    </section>
  );
}
