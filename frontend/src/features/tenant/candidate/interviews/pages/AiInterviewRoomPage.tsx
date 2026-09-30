import { AiInterviewRoom } from "../components/AiInterviewRoom";
import { Link, useParams } from "react-router-dom";

export function AiInterviewRoomPage() {
  const { id } = useParams();
  const interviewId = Number(id);
  if (!Number.isSafeInteger(interviewId) || interviewId <= 0) {
    return <p>Lời mời không hợp lệ. <Link to="/candidate/interviews">Về AI Interview</Link></p>;
  }
  return <AiInterviewRoom key={interviewId} id={interviewId} />;
}
