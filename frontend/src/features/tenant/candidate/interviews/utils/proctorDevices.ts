export type ProctorSession = { camera: MediaStream; screen: MediaStream };
type DeviceStep = "camera" | "microphone" | "screen";

export function stopProctorSession(session: ProctorSession) {
  session.camera.getTracks().forEach(track => track.stop());
  session.screen.getTracks().forEach(track => track.stop());
}

export function deviceError(cause: unknown, step: DeviceStep) {
  const device = { camera: "camera", microphone: "microphone", screen: "chia sẻ màn hình" }[step];
  const name = cause instanceof Error ? cause.name : "";
  if (name === "NotReadableError" || name === "AbortError") {
    return `Không thể mở ${device}. Hãy đóng ứng dụng hoặc tab đang dùng thiết bị (Camera, Teams, Zoom, OBS), kiểm tra quyền thiết bị trong hệ điều hành rồi thử lại. (${name})`;
  }
  if (name === "NotAllowedError" || name === "SecurityError") {
    return `Chưa được cấp quyền ${device}. Hãy cho phép trong trình duyệt và hệ điều hành rồi thử lại. (${name})`;
  }
  if (name === "NotFoundError") return `Không tìm thấy ${device}. Hãy kết nối thiết bị rồi thử lại. (${name})`;
  if (name === "InvalidStateError") return "Hãy quay lại tab phỏng vấn và bấm Kiểm tra thiết bị để chọn toàn bộ màn hình.";
  return cause instanceof Error ? cause.message : `Không thể kiểm tra ${device}.`;
}

export async function prepareProctorDevices(enableCamera = false): Promise<ProctorSession> {
  if (!window.isSecureContext) throw new Error("Kiểm tra thiết bị cần HTTPS hoặc localhost.");
  if (!navigator.mediaDevices?.getUserMedia || !navigator.mediaDevices?.getDisplayMedia) {
    throw new Error("Trình duyệt không hỗ trợ camera hoặc chia sẻ màn hình. Hãy dùng Chrome hoặc Edge trên máy tính.");
  }
  let step: DeviceStep = "screen";
  const streams: MediaStream[] = [];
  try {
    // Screen capture must be requested directly from the user's click.
    const screen = await navigator.mediaDevices.getDisplayMedia({ video: { displaySurface: "monitor" }, audio: false });
    streams.push(screen);
    const surface = screen.getVideoTracks()[0]?.getSettings().displaySurface;
    if (surface && surface !== "monitor") throw new Error("Vui lòng chia sẻ toàn bộ màn hình, không chỉ một cửa sổ hoặc tab.");
    step = "microphone";
    const microphone = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
    streams.push(microphone);
    if (enableCamera) {
      try {
        const camera = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        streams.push(camera);
        camera.getVideoTracks().forEach(track => microphone.addTrack(track));
      } catch {
        // Camera is optional; microphone and screen capture remain required.
      }
    }
    return { camera: microphone, screen };
  } catch (cause) {
    streams.forEach(stream => stream.getTracks().forEach(track => track.stop()));
    throw new Error(deviceError(cause, step));
  }
}
