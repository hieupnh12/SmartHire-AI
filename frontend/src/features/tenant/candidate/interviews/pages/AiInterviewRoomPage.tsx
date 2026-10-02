import { AiInterviewRoom } from "../components/AiInterviewRoom";
import { DemoInterviewRoom } from "../components/DemoInterviewRoom";
import { Link, useParams } from "react-router-dom";

export function AiInterviewRoomPage() {
  const { id } = useParams();
  if (id === "demo") return <DemoInterviewRoom />;
  const interviewId = Number(id);
  if (!Number.isSafeInteger(interviewId) || interviewId <= 0) {
    return <p>Lời mời không hợp lệ. <Link to="/interviews">Về AI Interview</Link></p>;
  }
  return <AiInterviewRoom key={interviewId} id={interviewId} />;
}
