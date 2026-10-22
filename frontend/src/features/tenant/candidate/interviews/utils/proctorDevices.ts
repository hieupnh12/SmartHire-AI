export type ProctorSession = { camera: MediaStream; screen: MediaStream };
type DeviceStep = "camera" | "microphone";

export function stopProctorSession(session: ProctorSession) {
  session.camera?.getTracks().forEach(track => track.stop());
  session.screen?.getTracks().forEach(track => track.stop());
}

export function deviceError(cause: unknown, step: DeviceStep) {
  const device = { camera: "camera", microphone: "microphone" }[step];
  const name = cause instanceof Error ? cause.name : "";
  if (name === "NotReadableError" || name === "AbortError") {
    return `Không thể mở ${device}. Hãy đóng ứng dụng hoặc tab đang dùng thiết bị (Teams, Zoom, OBS), kiểm tra quyền thiết bị trong hệ điều hành rồi thử lại. (${name})`;
  }
  if (name === "NotAllowedError" || name === "SecurityError") {
    return `Chưa được cấp quyền ${device}. Hãy cho phép trong trình duyệt và hệ điều hành rồi thử lại. (${name})`;
  }
  if (name === "NotFoundError") return `Không tìm thấy ${device}. Hãy kết nối thiết bị rồi thử lại. (${name})`;
  return cause instanceof Error ? cause.message : `Không thể kiểm tra ${device}.`;
}

export async function prepareProctorDevices(enableCamera = true): Promise<ProctorSession> {
  if (!window.isSecureContext) throw new Error("Kiểm tra thiết bị cần HTTPS hoặc localhost.");
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Trình duyệt không hỗ trợ camera hoặc microphone. Hãy dùng Chrome hoặc Edge trên máy tính.");
  }
  let step: DeviceStep = "microphone";
  const streams: MediaStream[] = [];
  try {
    step = "microphone";
    const microphone = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    streams.push(microphone);
    if (enableCamera) {
      step = "camera";
      try {
        const camera = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
          audio: false,
        });
        streams.push(camera);
        camera.getVideoTracks().forEach(track => microphone.addTrack(track));
      } catch {
        // Camera is optional; microphone remains the primary required track for speech
      }
    }
    return { camera: microphone, screen: new MediaStream() };
  } catch (cause) {
    streams.forEach(stream => stream.getTracks().forEach(track => track.stop()));
    throw new Error(deviceError(cause, step));
  }
}

