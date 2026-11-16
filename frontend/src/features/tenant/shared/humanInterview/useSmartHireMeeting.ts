import { useEffect, useRef, useState } from "react";
import Peer, { type DataConnection, type MediaConnection } from "peerjs";
import { t as globalT, useT } from "@/i18n";
import { getTenantIdFromWindow } from "@/lib/tenant";
import { toast } from "@/stores/toastStore";

export type MeetingRemote = {
  peerId: string;
  stream: MediaStream;
  name: string;
};

type Options = {
  interviewId: number;
  displayName: string;
  enabled: boolean;
};

type Signal =
  | { type: "join"; from: string; name: string }
  | { type: "roster"; peers: { id: string; name: string }[] };

type MeetingStatusKey =
  | "preparing"
  | "enablingDevices"
  | "joining"
  | "openedHost"
  | "connectedGuest"
  | "deviceError";

function hostPeerId(interviewId: number) {
  const tenant = (getTenantIdFromWindow() ?? "t").replace(/[^a-zA-Z0-9]/g, "").slice(0, 12);
  return `shi${tenant}i${interviewId}`.slice(0, 60);
}

/**
 * Creates a silent/blank placeholder video track so initial WebRTC SDP offer/answer
 * negotiates a video transceiver even if the physical camera is busy or failed.
 * Later, when camera access is granted, sender.replaceTrack(realTrack) upgrades seamlessly.
 */
function createPlaceholderVideoTrack(width = 320, height = 240): MediaStreamTrack | null {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, width, height);
    }
    const stream = typeof (canvas as any).captureStream === "function"
      ? (canvas as any).captureStream(1)
      : null;
    const track = stream?.getVideoTracks()[0] ?? null;
    if (track) {
      track.enabled = false;
    }
    return track;
  } catch {
    return null;
  }
}

/**
 * Creates a silent audio track so WebRTC SDP negotiates audio transceivers
 * even if the user has no microphone or microphone access is denied.
 */
function createSilentAudioTrack(): MediaStreamTrack | null {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return null;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const dst = ctx.createMediaStreamDestination();
    const gain = ctx.createGain();
    gain.gain.value = 0;
    osc.connect(gain);
    gain.connect(dst);
    osc.start();
    const track = dst.stream.getAudioTracks()[0] ?? null;
    if (track) {
      track.enabled = false;
    }
    return track;
  } catch {
    return null;
  }
}

const PEER_CONFIG = {
  debug: 0,
  config: {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:stun2.l.google.com:19302" },
      { urls: "stun:stun.cloudflare.com:3478" },
    ],
    iceCandidatePoolSize: 10,
  },
};

/**
 * Translates low-level browser DOMException / WebRTC errors into actionable Vietnamese messages.
 */
export function formatDeviceErrorMessage(err: unknown): string {
  if (!err) return globalT("candidate.assess.humanMeeting.devicePermissionError");
  const name = err instanceof DOMException ? err.name : (err as any)?.name || "";
  const msg = err instanceof Error ? err.message : String(err);

  if (
    name === "NotReadableError" ||
    msg.includes("Could not start video source") ||
    msg.includes("in use") ||
    msg.includes("busy")
  ) {
    return globalT("candidate.assess.humanMeeting.deviceBusyError");
  }
  if (
    name === "NotAllowedError" ||
    name === "PermissionDeniedError" ||
    msg.includes("Permission denied") ||
    msg.includes("denied")
  ) {
    return globalT("candidate.assess.humanMeeting.devicePermissionDenied");
  }
  if (
    name === "NotFoundError" ||
    name === "DevicesNotFoundError" ||
    msg.includes("Requested device not found")
  ) {
    return globalT("candidate.assess.humanMeeting.deviceNotFound");
  }
  if (name === "OverconstrainedError") {
    return globalT("candidate.assess.humanMeeting.deviceOverconstrained");
  }
  return msg || globalT("candidate.assess.humanMeeting.devicePermissionError");
}

/**
 * WebRTC room via PeerJS (no Jitsi moderator gate).
 * First successful claimant of the host peer id opens the room; others join as guests.
 * SmartHire LEAD role is unrelated — everyone with the interview link can participate.
 */
export function useSmartHireMeeting({ interviewId, displayName, enabled }: Options) {
  const t = useT();
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remotes, setRemotes] = useState<MeetingRemote[]>([]);
  const [statusKey, setStatusKey] = useState<MeetingStatusKey>("preparing");
  const [error, setError] = useState<string | null>(null);
  const [deviceWarning, setDeviceWarning] = useState<string | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [isHost, setIsHost] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const peerRef = useRef<Peer | null>(null);
  const localRef = useRef<MediaStream | null>(null);
  const isPlaceholderVideoRef = useRef(false);
  const isSilentAudioRef = useRef(false);
  const callsRef = useRef<Map<string, MediaConnection>>(new Map());
  const dataRef = useRef<Map<string, DataConnection>>(new Map());
  const namesRef = useRef<Map<string, string>>(new Map());
  const rosterRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    if (!enabled || !Number.isFinite(interviewId)) return;
    let cancelled = false;

    const upsertRemote = (peerId: string, stream: MediaStream) => {
      const name = namesRef.current.get(peerId) ?? globalT("candidate.assess.humanMeeting.participantFallback");
      setRemotes((prev) => {
        const rest = prev.filter((r) => r.peerId !== peerId);
        return [...rest, { peerId, stream, name }];
      });
    };

    const dropRemote = (peerId: string) => {
      callsRef.current.get(peerId)?.close();
      callsRef.current.delete(peerId);
      dataRef.current.get(peerId)?.close();
      dataRef.current.delete(peerId);
      rosterRef.current.delete(peerId);
      setRemotes((prev) => prev.filter((r) => r.peerId !== peerId));
    };

    const mediaCall = (peer: Peer, targetId: string, stream: MediaStream) => {
      if (!targetId || targetId === peer.id || callsRef.current.has(targetId)) return;
      const call = peer.call(targetId, stream, { metadata: { name: displayName } });
      callsRef.current.set(targetId, call);
      call.on("stream", (remote) => upsertRemote(targetId, remote));
      call.on("close", () => dropRemote(targetId));
      call.on("error", () => dropRemote(targetId));
    };

    const broadcastRoster = (peer: Peer) => {
      const peers = [...rosterRef.current.entries()].map(([id, name]) => ({ id, name }));
      if (peer.id) peers.push({ id: peer.id, name: displayName });
      const payload: Signal = { type: "roster", peers };
      for (const conn of dataRef.current.values()) {
        if (conn.open) conn.send(payload);
      }
    };

    const acceptData = (peer: Peer, stream: MediaStream, conn: DataConnection) => {
      dataRef.current.set(conn.peer, conn);
      conn.on("data", (raw) => {
        const msg = raw as Signal;
        const currentStream = localRef.current ?? stream;
        if (msg?.type === "join") {
          namesRef.current.set(msg.from, msg.name);
          rosterRef.current.set(msg.from, msg.name);
          mediaCall(peer, msg.from, currentStream);
          broadcastRoster(peer);
        }
        if (msg?.type === "roster") {
          for (const item of msg.peers) {
            if (item.id === peer.id) continue;
            namesRef.current.set(item.id, item.name);
            rosterRef.current.set(item.id, item.name);
            mediaCall(peer, item.id, currentStream);
          }
        }
      });
      conn.on("close", () => dropRemote(conn.peer));
    };

    const attachPeerHandlers = (peer: Peer, stream: MediaStream) => {
      peer.on("call", (call) => {
        const from = call.peer;
        const metaName = (call.metadata as { name?: string } | undefined)?.name;
        if (metaName) {
          namesRef.current.set(from, metaName);
          rosterRef.current.set(from, metaName);
        }
        const currentStream = localRef.current ?? stream;
        call.answer(currentStream);
        callsRef.current.set(from, call);
        call.on("stream", (remote) => upsertRemote(from, remote));
        call.on("close", () => dropRemote(from));
        call.on("error", () => dropRemote(from));
      });
      peer.on("connection", (conn) => acceptData(peer, stream, conn));
    };

    const startAsHost = (_stream: MediaStream) =>
      new Promise<Peer>((resolve, reject) => {
        const hostId = hostPeerId(interviewId);
        const host = new Peer(hostId, PEER_CONFIG);
        const onOpen = () => {
          cleanup();
          resolve(host);
        };
        const onError = (err: Error) => {
          cleanup();
          host.destroy();
          reject(err);
        };
        const cleanup = () => {
          host.off("open", onOpen);
          host.off("error", onError);
        };
        host.on("open", onOpen);
        host.on("error", onError);
      });

    const startAsGuest = (stream: MediaStream) =>
      new Promise<Peer>((resolve, reject) => {
        const guest = new Peer(PEER_CONFIG);
        guest.on("open", () => resolve(guest));
        guest.on("error", (err) => reject(err));
      }).then((guest) => {
        const hostId = hostPeerId(interviewId);
        attachPeerHandlers(guest, stream);
        const conn = guest.connect(hostId, { reliable: true });
        acceptData(guest, stream, conn);
        conn.on("open", () => {
          const join: Signal = { type: "join", from: guest.id!, name: displayName };
          conn.send(join);
        });
        conn.on("close", () => {
          dropRemote(hostId);
          // If host connection dropped (e.g. host reloaded), attempt to reconnect after 3 seconds
          if (!cancelled && guest && !guest.destroyed) {
            window.setTimeout(() => {
              if (cancelled || !guest || guest.destroyed) return;
              try {
                const retryConn = guest.connect(hostId, { reliable: true });
                acceptData(guest, stream, retryConn);
                retryConn.on("open", () => {
                  retryConn.send({ type: "join", from: guest.id!, name: displayName });
                  mediaCall(guest, hostId, localRef.current ?? stream);
                });
              } catch (reconnectErr) {
                console.warn("Guest reconnect to host failed:", reconnectErr);
              }
            }, 3000);
          }
        });
        mediaCall(guest, hostId, stream);
        return guest;
      });

    (async () => {
      try {
        setError(null);
        setStatusKey("enablingDevices");

        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
          isPlaceholderVideoRef.current = false;
          isSilentAudioRef.current = false;
          setCamOn(true);
          setMicOn(true);
          setDeviceWarning(null);
        } catch (videoErr) {
          console.warn("Primary audio+video getUserMedia failed, attempting audio-only fallback:", videoErr);
          try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            const placeholder = createPlaceholderVideoTrack();
            if (placeholder) {
              stream.addTrack(placeholder);
              isPlaceholderVideoRef.current = true;
            } else {
              isPlaceholderVideoRef.current = false;
            }
            isSilentAudioRef.current = false;
            setCamOn(false);
            setMicOn(true);
            setDeviceWarning(globalT("candidate.assess.humanMeeting.cameraBusyFallback"));
          } catch (audioErr) {
            console.warn("Audio-only getUserMedia also failed, fallback to listen-only dummy stream:", audioErr);
            const placeholder = createPlaceholderVideoTrack();
            const silent = createSilentAudioTrack();
            const dummy = new MediaStream();
            if (placeholder) dummy.addTrack(placeholder);
            if (silent) dummy.addTrack(silent);
            stream = dummy;
            isPlaceholderVideoRef.current = true;
            isSilentAudioRef.current = true;
            setCamOn(false);
            setMicOn(false);
            setDeviceWarning(globalT("candidate.assess.humanMeeting.listenOnlyFallback"));
          }
        }

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        localRef.current = stream;
        setLocalStream(stream);

        setStatusKey("joining");
        let peer: Peer;
        try {
          peer = await startAsHost(stream);
          if (cancelled) {
            peer.destroy();
            return;
          }
          peerRef.current = peer;
          setIsHost(true);
          setStatusKey("openedHost");
          attachPeerHandlers(peer, stream);
        } catch {
          if (cancelled) return;
          peer = await startAsGuest(stream);
          if (cancelled) {
            peer.destroy();
            return;
          }
          peerRef.current = peer;
          setIsHost(false);
          setStatusKey("connectedGuest");
        }
      } catch (e) {
        if (!cancelled) {
          const errorMsg = formatDeviceErrorMessage(e);
          setError(errorMsg);
          setStatusKey("deviceError");
        }
      }
    })();

    return () => {
      cancelled = true;
      for (const call of callsRef.current.values()) call.close();
      for (const conn of dataRef.current.values()) conn.close();
      callsRef.current.clear();
      dataRef.current.clear();
      peerRef.current?.destroy();
      peerRef.current = null;
      localRef.current?.getTracks().forEach((t) => t.stop());
      localRef.current = null;
    };
  }, [interviewId, displayName, enabled, retryCount]);

  const toggleMic = async () => {
    const currentAudioTracks = localRef.current?.getAudioTracks() ?? [];
    const needsAcquisition = isSilentAudioRef.current || currentAudioTracks.length === 0;

    if (needsAcquisition) {
      try {
        const aStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const newTrack = aStream.getAudioTracks()[0];
        if (!newTrack) return;

        if (localRef.current) {
          currentAudioTracks.forEach((t) => {
            localRef.current?.removeTrack(t);
            t.stop();
          });
          localRef.current.addTrack(newTrack);
          setLocalStream(new MediaStream(localRef.current.getTracks()));
        }

        for (const call of callsRef.current.values()) {
          const pc = (call as any).peerConnection as RTCPeerConnection | undefined;
          if (pc) {
            const sender = pc.getSenders().find((s) => s.track?.kind === "audio");
            if (sender) {
              await sender.replaceTrack(newTrack);
            } else {
              try {
                pc.addTrack(newTrack, localRef.current!);
              } catch (e) {
                console.warn("Could not add audio track to existing pc:", e);
              }
            }
          }
        }

        isSilentAudioRef.current = false;
        setMicOn(true);
        setDeviceWarning(null);
        toast.success(globalT("candidate.assess.humanMeeting.micEnabledSuccess"));
      } catch (err) {
        toast.error(formatDeviceErrorMessage(err));
      }
    } else {
      const next = !micOn;
      localRef.current?.getAudioTracks().forEach((t) => {
        t.enabled = next;
      });
      setMicOn(next);
    }
  };

  const toggleCam = async () => {
    const currentVideoTracks = localRef.current?.getVideoTracks() ?? [];
    const needsAcquisition = isPlaceholderVideoRef.current || currentVideoTracks.length === 0;

    if (needsAcquisition) {
      try {
        const vStream = await navigator.mediaDevices.getUserMedia({ video: true });
        const newTrack = vStream.getVideoTracks()[0];
        if (!newTrack) return;

        if (localRef.current) {
          currentVideoTracks.forEach((t) => {
            localRef.current?.removeTrack(t);
            t.stop();
          });
          localRef.current.addTrack(newTrack);
          setLocalStream(new MediaStream(localRef.current.getTracks()));
        }

        // Replace or add track on existing peer connections
        for (const call of callsRef.current.values()) {
          const pc = (call as any).peerConnection as RTCPeerConnection | undefined;
          if (pc) {
            const sender = pc.getSenders().find((s) => s.track?.kind === "video");
            if (sender) {
              await sender.replaceTrack(newTrack);
            } else {
              try {
                pc.addTrack(newTrack, localRef.current!);
              } catch (e) {
                console.warn("Could not add track to existing pc:", e);
              }
            }
          }
        }

        isPlaceholderVideoRef.current = false;
        setCamOn(true);
        setDeviceWarning(null);
        toast.success(globalT("candidate.assess.humanMeeting.camEnabledSuccess"));
      } catch (err) {
        const formatted = formatDeviceErrorMessage(err);
        toast.error(formatted);
      }
    } else {
      const next = !camOn;
      localRef.current?.getVideoTracks().forEach((t) => {
        t.enabled = next;
      });
      setCamOn(next);
    }
  };

  const retry = () => {
    setError(null);
    setDeviceWarning(null);
    setStatusKey("preparing");
    setRetryCount((c) => c + 1);
  };

  return {
    localStream,
    remotes,
    status: t(`candidate.assess.humanMeeting.status.${statusKey}`),
    error,
    deviceWarning,
    micOn,
    camOn,
    isHost,
    toggleMic,
    toggleCam,
    retry,
  };
}
