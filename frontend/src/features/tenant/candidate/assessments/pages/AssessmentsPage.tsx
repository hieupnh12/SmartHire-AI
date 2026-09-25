import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PrototypeBanner } from "@/components/ux/PrototypeBanner";
import { useAuthStore } from "@/features/tenant/auth/stores/authStore";
import { AssessmentInvitationView } from "../components/AssessmentInvitationView";
import {
  MOCK_COMPANY_NAME,
  mockInvitationApplications,
  mockInvitationAssessments,
  mockInvitationUser,
} from "../constants/mockInvitation";

export function AssessmentsPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [acceptRules, setAcceptRules] = useState(true);
  const [selectedTestId, setSelectedTestId] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const authUser = useAuthStore((s) => s.user);

  const requested = Number(params.get("applicationId"));
  const application =
    mockInvitationApplications.find((a) => a.id === requested) ?? mockInvitationApplications[0];
  const activeTest =
    mockInvitationAssessments.find((t) => t.id === selectedTestId) ?? mockInvitationAssessments[0];
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

  const flash = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2800);
  };

  return (
    <section className="space-y-6 text-[var(--color-on-surface)]">
      <PrototypeBanner note="lời mời assessment · dữ liệu ảo TechViet / Java Backend Junior" />
      {toast && (
        <p
          className="rounded-xl bg-[var(--color-primary-subtle)] px-4 py-2 text-sm text-[var(--color-primary-hover)]"
          role="status"
        >
          {toast}
        </p>
      )}

      {mockInvitationAssessments.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {mockInvitationAssessments.map((test) => (
            <button
              key={test.id}
              type="button"
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                test.id === activeTest.id
                  ? "bg-[var(--color-primary)] text-[var(--color-on-primary,#fff)]"
                  : "bg-[var(--color-surface-container-low)] text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container)]"
              }`}
              onClick={() => {
                setSelectedTestId(test.id);
                setAcceptRules(true);
              }}
            >
              {test.title}
            </button>
          ))}
        </div>
      )}

      <AssessmentInvitationView
        application={application}
        test={activeTest}
        user={demoUser}
        companyName={MOCK_COMPANY_NAME}
        acceptRules={acceptRules}
        onAcceptRulesChange={setAcceptRules}
        starting={false}
        onStart={() => {
          if (!acceptRules) {
            flash("Vui lòng xác nhận quy chế giám sát trước khi tiếp nhận.");
            return;
          }
          navigate("/candidate/assessments/prep");
        }}
        applications={mockInvitationApplications}
        onSelectApplication={(id) => {
          setParams({ applicationId: String(id) });
          setSelectedTestId(null);
          setAcceptRules(true);
        }}
      />
    </section>
  );
}
