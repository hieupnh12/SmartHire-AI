import { useEffect, useRef, useState } from "react";
import Peer, { type DataConnection, type MediaConnection } from "peerjs";
import { getTenantIdFromWindow } from "@/lib/tenant";

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

function hostPeerId(interviewId: number) {
  const tenant = (getTenantIdFromWindow() ?? "t").replace(/[^a-zA-Z0-9]/g, "").slice(0, 12);
  return `shi${tenant}i${interviewId}`.slice(0, 60);
}

/**
 * WebRTC room via PeerJS (no Jitsi moderator gate).
 * First successful claimant of the host peer id opens the room; others join as guests.
 * SmartHire LEAD role is unrelated — everyone with the interview link can participate.
 */
export function useSmartHireMeeting({ interviewId, displayName, enabled }: Options) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remotes, setRemotes] = useState<MeetingRemote[]>([]);
  const [status, setStatus] = useState("Đang chuẩn bị phòng…");
  const [error, setError] = useState<string | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [isHost, setIsHost] = useState(false);

  const peerRef = useRef<Peer | null>(null);
  const localRef = useRef<MediaStream | null>(null);
  const callsRef = useRef<Map<string, MediaConnection>>(new Map());
  const dataRef = useRef<Map<string, DataConnection>>(new Map());
  const namesRef = useRef<Map<string, string>>(new Map());
  const rosterRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    if (!enabled || !Number.isFinite(interviewId)) return;
    let cancelled = false;

    const upsertRemote = (peerId: string, stream: MediaStream) => {
      const name = namesRef.current.get(peerId) ?? "Thành viên";
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
        if (msg?.type === "join") {
          namesRef.current.set(msg.from, msg.name);
          rosterRef.current.set(msg.from, msg.name);
          mediaCall(peer, msg.from, stream);
          broadcastRoster(peer);
        }
        if (msg?.type === "roster") {
          for (const item of msg.peers) {
            if (item.id === peer.id) continue;
            namesRef.current.set(item.id, item.name);
            rosterRef.current.set(item.id, item.name);
            mediaCall(peer, item.id, stream);
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
        call.answer(stream);
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
        const host = new Peer(hostId, { debug: 0 });
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
        const guest = new Peer({ debug: 0 });
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
        mediaCall(guest, hostId, stream);
        return guest;
      });

    (async () => {
      try {
        setError(null);
        setStatus("Đang bật camera / micro…");
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        localRef.current = stream;
        setLocalStream(stream);

        setStatus("Đang vào phòng họp SmartHire…");
        let peer: Peer;
        try {
          peer = await startAsHost(stream);
          if (cancelled) {
            peer.destroy();
            return;
          }
          peerRef.current = peer;
          setIsHost(true);
          setStatus("Phòng đã mở — chờ HR / ứng viên khác tham gia.");
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
          setStatus("Đã vào phòng — đang kết nối video với mọi người.");
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Không mở được camera/micro. Hãy cho phép quyền trình duyệt.");
          setStatus("Lỗi thiết bị");
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
  }, [interviewId, displayName, enabled]);

  const toggleMic = () => {
    const next = !micOn;
    localRef.current?.getAudioTracks().forEach((t) => {
      t.enabled = next;
    });
    setMicOn(next);
  };

  const toggleCam = () => {
    const next = !camOn;
    localRef.current?.getVideoTracks().forEach((t) => {
      t.enabled = next;
    });
    setCamOn(next);
  };

  return { localStream, remotes, status, error, micOn, camOn, isHost, toggleMic, toggleCam };
}
