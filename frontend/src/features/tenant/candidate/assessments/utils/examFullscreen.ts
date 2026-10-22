import type { ProctorSession } from "@/features/tenant/candidate/interviews/utils/proctorDevices";

type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => void;
};
type FullscreenElement = HTMLElement & { webkitRequestFullscreen?: () => void };

function fullscreenElement() {
  const doc = document as FullscreenDocument;
  return document.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
}

/** True when the page covers the display (address bar gone), not only "fullscreen within tab". */
export function examIsFullscreen() {
  if (!fullscreenElement()) return false;
  // Within-tab mode leaves a large gap under the real screen. Real fullscreen fills
  // availHeight; dock, notch, or the share bubble can trim a little.
  const floor = Math.min(screen.height, screen.availHeight) - 120;
  return window.innerHeight >= floor || window.outerHeight >= floor;
}

function requestDocumentFullscreen() {
  const root = document.documentElement as FullscreenElement;
  if (root.requestFullscreen) return root.requestFullscreen();
  if (root.webkitRequestFullscreen) {
    root.webkitRequestFullscreen();
    return Promise.resolve();
  }
  return Promise.reject(new Error("Trình duyệt không hỗ trợ toàn màn hình."));
}

async function exitDocumentFullscreen() {
  if (!fullscreenElement()) return;
  const doc = document as FullscreenDocument;
  if (document.exitFullscreen) {
    await document.exitFullscreen().catch(() => undefined);
    return;
  }
  doc.webkitExitFullscreen?.();
}

function settleFullscreen(ms = 1500) {
  return new Promise<boolean>((resolve) => {
    const check = () => examIsFullscreen();
    if (check()) {
      resolve(true);
      return;
    }
    const finish = (ok: boolean) => {
      window.clearTimeout(timer);
      window.clearInterval(poll);
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange as EventListener);
      resolve(ok);
    };
    const onChange = () => {
      if (check()) finish(true);
    };
    const poll = window.setInterval(() => {
      if (check()) finish(true);
    }, 50);
    const timer = window.setTimeout(() => finish(check()), ms);
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange as EventListener);
  });
}

function liveScreenTrack(session: ProctorSession | null) {
  return session?.screen.getVideoTracks().find((item) => item.readyState === "live") ?? null;
}

/**
 * Enter real fullscreen from a user click. A live capture of this browser tab
 * forces Chrome to keep the address bar, so that track is stopped first.
 * Monitor capture and webcam stay on.
 */
export function expandExamToScreen(session: ProctorSession | null) {
  const enterFromGesture = () => {
    let request: Promise<void>;
    try {
      request = requestDocumentFullscreen();
    } catch (cause) {
      return Promise.reject(cause instanceof Error ? cause : new Error("Không mở được toàn màn hình."));
    }
    return request
      .catch((cause: unknown) => {
        const name = cause instanceof DOMException ? cause.name : "";
        if (name === "NotAllowedError" || name === "SecurityError") {
          throw new Error("Trình duyệt chặn toàn màn hình. Hãy bấm Bắt đầu lại khi cửa sổ Chrome đang được focus.");
        }
        throw cause instanceof Error ? cause : new Error("Không mở được toàn màn hình.");
      })
      .then(async () => {
        if (await settleFullscreen()) return;
        throw new Error(
          "Trình duyệt chưa ẩn thanh địa chỉ. Trong hộp thoại chia sẻ hãy chọn « Toàn bộ màn hình » (không phải Tab), rồi tải lại trang và bấm Bắt đầu.",
        );
      });
  };

  const track = liveScreenTrack(session);
  const stopTabThenEnter = () =>
    new Promise<void>((resolve, reject) => {
      if (!track) {
        void enterFromGesture().then(resolve, reject);
        return;
      }
      let started = false;
      const go = () => {
        if (started) return;
        started = true;
        void enterFromGesture().then(resolve, reject);
      };
      track.addEventListener("ended", go, { once: true });
      track.stop();
      if (track.readyState === "ended") go();
    });

  const begin = () => {
    if (track?.getSettings().displaySurface === "browser") return stopTabThenEnter();
    return enterFromGesture();
  };

  if (!fullscreenElement()) return begin();
  return exitDocumentFullscreen().then(begin);
}
