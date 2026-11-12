import { Link, useParams } from "react-router-dom";
import { useT } from "@/i18n";
import { AiInterviewRoom } from "../components/AiInterviewRoom";
import { DemoInterviewRoom } from "../components/DemoInterviewRoom";

export function AiInterviewRoomPage() {
  const t = useT();
  const { id } = useParams();
  if (id === "demo") return <DemoInterviewRoom />;
  const interviewId = Number(id);
  if (!Number.isSafeInteger(interviewId) || interviewId <= 0) {
    return (
      <p>
        {t("candidate.assess.interviews.roomPage.invalidInvite")}{" "}
        <Link to="/interviews">{t("candidate.assess.interviews.roomPage.backToAiInterview")}</Link>
      </p>
    );
  }
  return <AiInterviewRoom key={interviewId} id={interviewId} />;
}
