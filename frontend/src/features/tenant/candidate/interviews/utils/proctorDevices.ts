import { t as globalT } from "@/i18n";

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
  const screenLabel = capture === "monitor"
    ? globalT("candidate.assess.proctorDevices.screenMonitorLabel")
    : globalT("candidate.assess.proctorDevices.screenTabLabel");
  const device = {
    camera: globalT("candidate.assess.proctorDevices.deviceCamera"),
    microphone: globalT("candidate.assess.proctorDevices.deviceMicrophone"),
    screen: screenLabel,
  }[step];
  const name = cause instanceof Error ? cause.name : "";
  if (name === "NotReadableError" || name === "AbortError") {
    return globalT("candidate.assess.proctorDevices.notReadable", { device, name });
  }
  if (name === "NotAllowedError" || name === "SecurityError") {
    return globalT("candidate.assess.proctorDevices.notAllowed", { device, name });
  }
  if (name === "NotFoundError") return globalT("candidate.assess.proctorDevices.notFound", { device, name });
  if (name === "InvalidStateError") {
    return capture === "monitor"
      ? globalT("candidate.assess.proctorDevices.invalidStateMonitor")
      : globalT("candidate.assess.proctorDevices.invalidStateTab");
  }
  return cause instanceof Error ? cause.message : globalT("candidate.assess.proctorDevices.checkFailed", { device });
}

export async function prepareProctorDevices(enableCamera = false, capture: CaptureKind = "none"): Promise<ProctorSession> {
  if (!window.isSecureContext) throw new Error(globalT("candidate.assess.proctorDevices.secureContextRequired"));
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error(globalT("candidate.assess.proctorDevices.mediaUnsupported"));
  }
  if (capture !== "none" && !navigator.mediaDevices?.getDisplayMedia) {
    throw new Error(globalT("candidate.assess.proctorDevices.displayUnsupported"));
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
        throw new Error(globalT("candidate.assess.proctorDevices.wrongTabSurface"));
      }
      if (capture === "monitor" && (surface === "browser" || surface === "window")) {
        throw new Error(globalT("candidate.assess.proctorDevices.wrongMonitorSurface"));
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
        if (capture === "monitor" && camera.getVideoTracks().length === 0) {
          throw new Error(globalT("candidate.assess.proctorDevices.cameraRequiredDuringExam"));
        }
      } catch (cause) {
        if (capture === "monitor") throw cause;
        // Interview camera is optional; microphone remains required.
      }
    }
    return { camera: microphone, screen };
  } catch (cause) {
    streams.forEach(stream => stream.getTracks().forEach(track => track.stop()));
    throw new Error(deviceError(cause, step, capture));
  }
}
