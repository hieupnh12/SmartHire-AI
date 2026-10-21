import { FaceDetector, FilesetResolver, type Detection } from "@mediapipe/tasks-vision";

export type FacePresenceStatus = "loading" | "ready" | "present" | "absent" | "multi" | "unavailable";

export type FacePresenceHandle = {
  stop: () => void;
};

export type FacePresenceViolation = "absent" | "multi";

type Options = {
  stream: MediaStream;
  onViolation: (reason: FacePresenceViolation) => void;
  onStatus?: (status: FacePresenceStatus) => void;
  /** Continuous absence before a violation (default 0.9s). */
  absentMs?: number;
  /** Continuous multi-face before a violation (default 1s). */
  multiMs?: number;
  /** Minimum gap between face violations (default 5s). */
  cooldownMs?: number;
  /** How often to sample the camera (default 250ms). */
  sampleMs?: number;
  /** Ignore issues right after the model becomes ready (default 0.8s). */
  warmUpMs?: number;
};

const WASM_ROOT = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.1/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite";
const SCORE_MIN = 0.5;

let detectorPromise: Promise<FaceDetector | null> | null = null;

async function loadDetector(): Promise<FaceDetector | null> {
  if (!detectorPromise) {
    detectorPromise = (async () => {
      const create = (delegate: "GPU" | "CPU") =>
        FilesetResolver.forVisionTasks(WASM_ROOT).then((fileset) =>
          FaceDetector.createFromOptions(fileset, {
            baseOptions: { modelAssetPath: MODEL_URL, delegate },
            runningMode: "VIDEO",
            minDetectionConfidence: SCORE_MIN,
            minSuppressionThreshold: 0.3,
          }),
        );
      try {
        return await create("GPU");
      } catch {
        try {
          return await create("CPU");
        } catch {
          return null;
        }
      }
    })();
  }
  return detectorPromise;
}

function countFaces(detections: Detection[]) {
  return detections.filter((item) => (item.categories?.[0]?.score ?? 0) >= SCORE_MIN).length;
}

/**
 * Watch a camera MediaStream for missing face or multiple faces in frame.
 * Runs entirely in the browser; does not upload video.
 */
export async function watchFacePresence(options: Options): Promise<FacePresenceHandle> {
  const {
    stream,
    onViolation,
    onStatus,
    absentMs = 900,
    multiMs = 1000,
    cooldownMs = 5000,
    sampleMs = 250,
    warmUpMs = 800,
  } = options;

  let stopped = false;
  let timer: number | null = null;
  let absentSince: number | null = null;
  let multiSince: number | null = null;
  let lastViolationAt = 0;
  let lastTs = 0;
  let readyAt = 0;
  let status: FacePresenceStatus = "loading";

  const setStatus = (next: FacePresenceStatus) => {
    if (status === next) return;
    status = next;
    onStatus?.(next);
  };

  const emit = (reason: FacePresenceViolation) => {
    const now = Date.now();
    if (now - lastViolationAt < cooldownMs) return;
    lastViolationAt = now;
    if (reason === "absent") absentSince = now;
    if (reason === "multi") multiSince = now;
    onViolation(reason);
  };

  setStatus("loading");

  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.autoplay = true;
  video.width = 640;
  video.height = 480;
  video.setAttribute("playsinline", "true");
  // Keep a real frame buffer for the model; hide it from the layout.
  video.style.cssText =
    "position:fixed;width:640px;height:480px;opacity:0;pointer-events:none;left:-9999px;top:0";
  video.srcObject = stream;
  document.body.appendChild(video);

  const cleanupVideo = () => {
    video.pause();
    video.srcObject = null;
    video.remove();
  };

  try {
    await video.play();
  } catch {
    cleanupVideo();
    setStatus("unavailable");
    return { stop: () => undefined };
  }

  const detector = await loadDetector();
  if (stopped) {
    cleanupVideo();
    return { stop: () => undefined };
  }
  if (!detector) {
    cleanupVideo();
    setStatus("unavailable");
    return { stop: () => undefined };
  }

  readyAt = Date.now();
  setStatus("ready");

  const tick = () => {
    if (stopped) return;
    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || video.videoWidth === 0) return;

    const now = performance.now();
    if (now - lastTs < 30) return;
    lastTs = now;

    let faces = 0;
    try {
      const result = detector.detectForVideo(video, now);
      faces = countFaces(result.detections ?? []);
    } catch {
      return;
    }

    const warmed = Date.now() - readyAt >= warmUpMs;

    if (faces >= 2) {
      absentSince = null;
      setStatus("multi");
      if (!warmed) return;
      if (multiSince === null) multiSince = Date.now();
      if (Date.now() - multiSince >= multiMs) emit("multi");
      return;
    }

    multiSince = null;

    if (faces === 1) {
      absentSince = null;
      setStatus("present");
      return;
    }

    setStatus("absent");
    if (!warmed) return;
    if (absentSince === null) absentSince = Date.now();
    if (Date.now() - absentSince >= absentMs) emit("absent");
  };

  timer = window.setInterval(tick, sampleMs);

  return {
    stop: () => {
      stopped = true;
      if (timer !== null) window.clearInterval(timer);
      timer = null;
      cleanupVideo();
    },
  };
}
