export type ProctorSession = { camera: MediaStream; screen?: MediaStream };
type DeviceStep = "camera" | "microphone" | "screen";
// Chromium capture hints are not yet included in TypeScript's DOM definitions.
type CaptureKind = "none" | "tab" | "monitor";
type DisplayCaptureOptions = DisplayMediaStreamOptions & {
  preferCurrentTab: boolean;
  selfBrowserSurface: "include" | "exclude";
  monitorTypeSurfaces: "include" | "exclude";
  surfaceSwitching: "exclude";
};

const examTabCapture: DisplayCaptureOptions = {
  video: { displaySurface: "browser" }, audio: false,
  preferCurrentTab: true, selfBrowserSurface: "include",
  monitorTypeSurfaces: "exclude", surfaceSwitching: "exclude",
};

/** Whole display. A captured tab blocks Chrome from hiding the address bar. */
const examMonitorCapture: DisplayCaptureOptions = {
  video: { displaySurface: "monitor" }, audio: false,
  preferCurrentTab: false, selfBrowserSurface: "exclude",
  monitorTypeSurfaces: "include", surfaceSwitching: "exclude",
};

/** Share the current browser tab. Must be called in the same turn as a click. */
export function captureExamTab() {
  return navigator.mediaDevices.getDisplayMedia(examTabCapture);
}

export function stopProctorSession(session: ProctorSession) {
  session.camera?.getTracks().forEach(track => track.stop());
  session.screen?.getTracks().forEach(track => track.stop());
}

export function deviceError(cause: unknown, step: DeviceStep, capture: CaptureKind = "none") {
  const screenLabel = capture === "monitor" ? "chia sẻ toàn màn hình" : "chia sẻ tab phỏng vấn";
  const device = { camera: "camera", microphone: "microphone", screen: screenLabel }[step];
  const name = cause instanceof Error ? cause.name : "";
  if (name === "NotReadableError" || name === "AbortError") {
    return `Không thể mở ${device}. Hãy đóng ứng dụng hoặc tab đang dùng thiết bị (Camera, Teams, Zoom, OBS), kiểm tra quyền thiết bị trong hệ điều hành rồi thử lại. (${name})`;
  }
  if (name === "NotAllowedError" || name === "SecurityError") {
    return `Chưa được cấp quyền ${device}. Hãy cho phép trong trình duyệt và hệ điều hành rồi thử lại. (${name})`;
  }
  if (name === "NotFoundError") return `Không tìm thấy ${device}. Hãy kết nối thiết bị rồi thử lại. (${name})`;
  if (name === "InvalidStateError") {
    return capture === "monitor"
      ? "Hãy quay lại tab làm bài và bấm Kiểm tra thiết bị để chia sẻ toàn màn hình."
      : "Hãy quay lại tab phỏng vấn và bấm Kiểm tra thiết bị để tiếp tục.";
  }
  return cause instanceof Error ? cause.message : `Không thể kiểm tra ${device}.`;
}

export async function prepareProctorDevices(enableCamera = false, capture: CaptureKind = "none"): Promise<ProctorSession> {
  if (!window.isSecureContext) throw new Error("Kiểm tra thiết bị cần HTTPS hoặc localhost.");
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Trình duyệt không hỗ trợ microphone hoặc camera. Hãy dùng Chrome hoặc Edge trên máy tính.");
  }
  if (capture !== "none" && !navigator.mediaDevices?.getDisplayMedia) {
    throw new Error("Trình duyệt không hỗ trợ chia sẻ màn hình. Hãy dùng Chrome hoặc Edge trên máy tính.");
  }
  const requireCamera = enableCamera;
  let step: DeviceStep = capture !== "none" ? "screen" : "microphone";
  const streams: MediaStream[] = [];
  try {
    let screen: MediaStream | undefined;
    if (capture !== "none") {
      screen = await navigator.mediaDevices.getDisplayMedia(capture === "monitor" ? examMonitorCapture : examTabCapture);
      streams.push(screen);
      const surface = screen.getVideoTracks()[0]?.getSettings().displaySurface;
      if (capture === "tab" && surface && surface !== "browser") {
        throw new Error("Vui lòng chia sẻ tab đang mở phòng phỏng vấn, không chọn cửa sổ hoặc toàn màn hình.");
      }
      if (capture === "monitor" && (surface === "browser" || surface === "window")) {
        throw new Error("Hãy chọn « Toàn bộ màn hình » trong hộp thoại Chrome (không chọn Cửa sổ hay Tab Chrome).");
      }
    }
    step = "microphone";
    const microphone = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
    streams.push(microphone);
    if (requireCamera) {
      step = "camera";
      try {
        const camera = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        streams.push(camera);
        camera.getVideoTracks().forEach(track => microphone.addTrack(track));
      } catch {
        // Interview camera is optional; microphone remains required.
      }
    }
    return { camera: microphone, screen };
  } catch (cause) {
    streams.forEach(stream => stream.getTracks().forEach(track => track.stop()));
    throw new Error(deviceError(cause, step, capture));
  }
}
