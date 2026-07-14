"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useUser } from "../lib/AuthContext";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneCall,
  PhoneOff,
  Monitor,
  MonitorUp,
  MonitorOff,
  Loader2,
  Circle,
  Download,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────
interface VideoCallProps {
  /** The room / channel ID both peers must share */
  roomId: string;
  /** The userId of the person we want to call */
  targetUserId?: string;
}

type CallStatus =
  | "idle"
  | "connecting"
  | "ringing"
  | "in-call"
  | "ended"
  | "error";

import { getBackendUrl } from "../lib/axiosinstance";

// ─── STUN / TURN servers for NAT traversal ──────────────────────────────────
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

// ─── Component ──────────────────────────────────────────────────────────────
export default function VideoCall({ roomId, targetUserId }: VideoCallProps) {
  const { user } = useUser();

  // Refs that persist across renders without causing re-render
  const socketRef = useRef<Socket | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // Video element refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Screen sharing ref — kept separate from the camera stream
  const screenStreamRef = useRef<MediaStream | null>(null);

  // Recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Active remote peer reference (maps to caller or receiver ID/socket ID)
  const remotePeerIdRef = useRef<string | null>(null);

  // ICE candidates queue to prevent race conditions before remote description is set
  const iceCandidatesQueue = useRef<RTCIceCandidateInit[]>([]);

  // UI state
  const [callStatus, setCallStatus] = useState<CallStatus>("idle");
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [roomUsers, setRoomUsers] = useState<{ userId: string; userName: string; socketId: string }[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ── 1. Acquire local media ───────────────────────────────────────────────
  const startLocalStream = useCallback(async () => {
    try {
      // Primary: Request both camera and microphone
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      localStreamRef.current = stream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      setErrorMsg(null);
      return stream;
    } catch (err: any) {
      console.warn("[VideoCall] Dual track getUserMedia failed, trying fallbacks...", err);
      
      try {
        // Fallback 1: Microphone only (no camera)
        const audioOnlyStream = await navigator.mediaDevices.getUserMedia({
          video: false,
          audio: true,
        });
        localStreamRef.current = audioOnlyStream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = audioOnlyStream;
        }
        setIsCameraOff(true);
        setErrorMsg("Running in audio-only mode (camera unavailable or blocked).");
        return audioOnlyStream;
      } catch (err2: any) {
        console.warn("[VideoCall] Audio-only capture failed, trying video-only...", err2);
        
        try {
          // Fallback 2: Camera only (no microphone)
          const videoOnlyStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
          localStreamRef.current = videoOnlyStream;
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = videoOnlyStream;
          }
          setIsMuted(true);
          setErrorMsg("Running in video-only mode (microphone unavailable or blocked).");
          return videoOnlyStream;
        } catch (err3: any) {
          console.error("[VideoCall] All media capture attempts failed:", err3);
          setErrorMsg(
            "Camera / microphone access denied. Please verify your browser permissions or hardware connections."
          );
          return null;
        }
      }
    }
  }, []);

  // ── 2. Create the RTCPeerConnection ──────────────────────────────────────
  const createPeerConnection = useCallback(
    (localStream: MediaStream | null, isInitiator = false) => {
      const pc = new RTCPeerConnection(ICE_SERVERS);

      // Add local tracks (audio + video) if they exist
      if (localStream) {
        localStream.getTracks().forEach((track) => {
          pc.addTrack(track, localStream);
        });
      }

      // If we are initiating the call and don't have a local video track,
      // add a video transceiver so we can send video (like screen share) later without renegotiation
      if (isInitiator) {
        const hasVideoTrack = localStream && localStream.getVideoTracks().length > 0;
        if (!hasVideoTrack) {
          try {
            pc.addTransceiver("video", { direction: "sendrecv" });
          } catch (e) {
            console.warn("[VideoCall] Failed to add video transceiver:", e);
          }
        }

        // If we don't have a local audio track, add an audio transceiver
        const hasAudioTrack = localStream && localStream.getAudioTracks().length > 0;
        if (!hasAudioTrack) {
          try {
            pc.addTransceiver("audio", { direction: "sendrecv" });
          } catch (e) {
            console.warn("[VideoCall] Failed to add audio transceiver:", e);
          }
        }
      }

      // When the remote peer adds tracks, attach them to the remote <video>
      pc.ontrack = (event) => {
        if (remoteVideoRef.current) {
          if (event.streams && event.streams[0]) {
            remoteVideoRef.current.srcObject = event.streams[0];
          } else {
            // Build or add track to remote stream directly
            let remoteStream = remoteVideoRef.current.srcObject as MediaStream;
            if (!remoteStream || !(remoteStream instanceof MediaStream)) {
              remoteStream = new MediaStream();
              remoteVideoRef.current.srcObject = remoteStream;
            }
            remoteStream.addTrack(event.track);
          }
        }
      };

      // When the browser discovers a new ICE candidate, relay it via Socket.io
      pc.onicecandidate = (event) => {
        if (event.candidate && socketRef.current && remotePeerIdRef.current) {
          socketRef.current.emit("ice-candidate", {
            candidate: event.candidate,
            to: remotePeerIdRef.current,
          });
        }
      };

      // Track connection state for UI feedback
      pc.onconnectionstatechange = () => {
        switch (pc.connectionState) {
          case "connected":
            setCallStatus("in-call");
            break;
          case "disconnected":
          case "failed":
          case "closed":
            setCallStatus("ended");
            break;
        }
      };

      peerRef.current = pc;
      return pc;
    },
    [targetUserId]
  );

  // ── 3. Socket.io setup & signaling listeners ─────────────────────────────
  useEffect(() => {
    if (!user?._id || !roomId) return;

    const socket = io(getBackendUrl());
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[VideoCall] Socket connected:", socket.id);
      socket.emit("join-room", {
        roomId,
        userId: user._id,
        userName: user.name || user.channelname || "Anonymous User"
      });
    });

    // Update room user list
    socket.on("room-users", (users) => {
      // Filter out ourself
      const peers = users.filter((u: any) => u.userId !== user._id);
      setRoomUsers(peers);
    });

    const processQueuedCandidates = async (pc: RTCPeerConnection) => {
      while (iceCandidatesQueue.current.length > 0) {
        const candidate = iceCandidatesQueue.current.shift();
        if (candidate) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (err) {
            console.error("[VideoCall] Error adding queued ICE candidate:", err);
          }
        }
      }
    };

    // We received an incoming WebRTC offer
    socket.on("incoming-call", async ({ offer, from, fromSocket }) => {
      console.log("[VideoCall] Incoming call from:", from);
      remotePeerIdRef.current = from || fromSocket;
      setCallStatus("ringing");

      const localStream =
        localStreamRef.current || (await startLocalStream());

      const pc = createPeerConnection(localStream, false);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));

      // Force direction of all transceivers to sendrecv so both sides can send media
      pc.getTransceivers().forEach((t) => {
        t.direction = "sendrecv";
      });

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit("answer-call", { answer, to: remotePeerIdRef.current });
      setCallStatus("connecting");
      
      // Flush queued candidates
      await processQueuedCandidates(pc);
    });

    // Our offer was answered
    socket.on("call-answered", async ({ answer, from }) => {
      console.log("[VideoCall] Call answered from:", from);
      if (from) {
        remotePeerIdRef.current = from;
      }
      const pc = peerRef.current;
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        // Flush queued candidates
        await processQueuedCandidates(pc);
      }
    });

    // Relay ICE candidates
    socket.on("ice-candidate", async ({ candidate }) => {
      if (candidate) {
        const pc = peerRef.current;
        if (pc && pc.remoteDescription && pc.remoteDescription.type) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (err) {
            console.error("[VideoCall] Error adding ICE candidate:", err);
          }
        } else {
          iceCandidatesQueue.current.push(candidate);
        }
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id, roomId]);

  // ── 4. Initiate an outgoing call ─────────────────────────────────────────
  const handleStartCall = useCallback(async (selectedPeerId?: string) => {
    const activeTarget = selectedPeerId || targetUserId;
    if (!activeTarget) {
      setErrorMsg("No target user specified.");
      return;
    }
    remotePeerIdRef.current = activeTarget;
    setCallStatus("connecting");
    setErrorMsg(null);

    const localStream =
      localStreamRef.current || (await startLocalStream());

    const pc = createPeerConnection(localStream, true);

    // Force direction of all transceivers to sendrecv so both sides can send media
    pc.getTransceivers().forEach((t) => {
      t.direction = "sendrecv";
    });

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    socketRef.current?.emit("call-user", { offer, to: activeTarget });
    setCallStatus("ringing");
  }, [targetUserId, startLocalStream, createPeerConnection]);

  // ── 3b. Auto-connect when a peer is present in the room ────────────────────
  useEffect(() => {
    if (callStatus !== "idle" || roomUsers.length === 0 || !socketRef.current?.id) return;

    // To prevent WebRTC glare (both peers calling each other at the same time),
    // we use a polite/impolite pattern: the peer with the lexicographically
    // larger socket ID initiates the call.
    const mySockId = socketRef.current.id;
    const peer = roomUsers[0]; // Auto-connect with the first active peer
    const peerSockId = peer.socketId;

    if (mySockId > peerSockId) {
      console.log(`[VideoCall] Auto-initiating call to peer: ${peer.userName} (${peer.userId})`);
      handleStartCall(peer.userId);
    } else {
      console.log(`[VideoCall] Waiting for polite peer ${peer.userName} to initiate call...`);
    }
  }, [roomUsers, callStatus, handleStartCall]);

  // ── 5. End the call ──────────────────────────────────────────────────────
  const handleEndCall = useCallback(() => {
    // Stop recording if active (triggers onstop → auto-download)
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }

    // Close peer connection
    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }

    // Stop screen share tracks if active
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }
    setIsScreenSharing(false);

    // Reset active remote peer ref
    remotePeerIdRef.current = null;

    // Stop all local tracks (turns off camera LED)
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }

    // Clear video elements
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;

    setCallStatus("ended");
  }, []);

  // ── 6. Toggle mic / camera ──────────────────────────────────────────────
  const toggleMute = useCallback(() => {
    const audioTrack = localStreamRef.current
      ?.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
    }
  }, []);

  const toggleCamera = useCallback(() => {
    const videoTrack = localStreamRef.current
      ?.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsCameraOff(!videoTrack.enabled);
    }
  }, []);

  // ── 6b. Screen sharing toggle ────────────────────────────────────────────
  const toggleScreenShare = useCallback(async () => {
    const pc = peerRef.current;
    if (!pc) return;

    // Find the video transceiver's sender
    const videoSender = pc.getSenders().find((s) => s.track && s.track.kind === "video")
      || pc.getTransceivers().find((t) => t.receiver.track?.kind === "video" || t.sender.track?.kind === "video")?.sender;

    if (!videoSender) {
      console.warn("[VideoCall] No video sender found for screen sharing.");
      return;
    }

    if (!isScreenSharing) {
      // ── Start screen share ─────────────────────────────────────────
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });
        screenStreamRef.current = screenStream;

        const screenVideoTrack = screenStream.getVideoTracks()[0];

        // Hot-swap the track live on the existing sender
        await videoSender.replaceTrack(screenVideoTrack);

        // Show the screen capture in the local preview
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }

        setIsScreenSharing(true);

        // If the user clicks the browser's native "Stop sharing" button,
        // automatically revert to the camera track
        screenVideoTrack.onended = async () => {
          await revertToCamera(videoSender);
        };
      } catch (err: any) {
        // User cancelled the screen picker — not an error
        if (err.name !== "NotAllowedError") {
          console.error("[VideoCall] getDisplayMedia error:", err);
        }
      }
    } else {
      // ── Stop screen share (revert to camera) ──────────────────────
      await revertToCamera(videoSender);
    }
  }, [isScreenSharing]);

  /** Swap the sender back to the original camera track and clean up. */
  const revertToCamera = useCallback(
    async (videoSender: RTCRtpSender) => {
      const cameraTrack = localStreamRef.current?.getVideoTracks()[0];
      if (cameraTrack) {
        await videoSender.replaceTrack(cameraTrack);
      } else {
        // If there was no camera track (webcam blocked/missing), replace with null to stop transmission
        if (videoSender) {
          try {
            await videoSender.replaceTrack(null);
          } catch (e) {
            console.warn("[VideoCall] Error clearing screen share track:", e);
          }
        }
      }

      // Stop the screen capture tracks
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
        screenStreamRef.current = null;
      }

      // Restore local preview to camera
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }

      setIsScreenSharing(false);
    },
    []
  );

  // ── 6c. Call recording toggle ─────────────────────────────────────────────
  const toggleRecording = useCallback(() => {
    if (isRecording) {
      // ── Stop recording ────────────────────────────────────────────
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        mediaRecorderRef.current.stop();
      }
      return;
    }

    // ── Start recording ───────────────────────────────────────────────
    // Build a combined MediaStream from:
    //   • Video: whichever video track is currently being sent (camera or screen)
    //   • Audio: local mic + remote audio (if available)
    const combinedStream = new MediaStream();

    // Current outgoing video track (camera or screen share)
    const activeVideoSource =
      isScreenSharing && screenStreamRef.current
        ? screenStreamRef.current
        : localStreamRef.current;

    if (activeVideoSource) {
      activeVideoSource.getVideoTracks().forEach((t) => combinedStream.addTrack(t));
    }

    // Local microphone audio
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((t) => combinedStream.addTrack(t));
    }

    // Remote peer audio (pulled from the remote <video> element)
    if (remoteVideoRef.current && remoteVideoRef.current.srcObject) {
      const remoteStream = remoteVideoRef.current.srcObject as MediaStream;
      remoteStream.getAudioTracks().forEach((t) => combinedStream.addTrack(t));
    }

    if (combinedStream.getTracks().length === 0) {
      console.warn("[VideoCall] No tracks available to record.");
      return;
    }

    // Pick a supported MIME type
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
      ? "video/webm;codecs=vp9,opus"
      : MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
      ? "video/webm;codecs=vp8,opus"
      : "video/webm";

    const recorder = new MediaRecorder(combinedStream, { mimeType });
    recordedChunksRef.current = [];

    // Push every data packet into our buffer
    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        recordedChunksRef.current.push(event.data);
      }
    };

    // When recording stops, assemble the file and auto-download
    recorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
      const url = URL.createObjectURL(blob);

      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, "-")
        .slice(0, 19);
      const filename = `call-recording-${timestamp}.webm`;

      // Create a temporary anchor and click it to trigger the download
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();

      // Cleanup
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
      recordedChunksRef.current = [];
      mediaRecorderRef.current = null;
      setIsRecording(false);
    };

    // Request data every 1 second so chunks stream in steadily
    recorder.start(1000);
    mediaRecorderRef.current = recorder;
    setIsRecording(true);
  }, [isRecording, isScreenSharing]);

  // ── 7. Cleanup on unmount ────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        mediaRecorderRef.current.stop();
      }
      peerRef.current?.close();
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // ── 8. Start local preview when component mounts ─────────────────────────
  useEffect(() => {
    startLocalStream();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────
  const isActive = callStatus === "in-call" || callStatus === "connecting" || callStatus === "ringing";

  // Format recording elapsed indicator (driven by isRecording for the dot)

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-4xl mx-auto p-4">
      {/* ── Status Badge ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <div
          className={`w-2.5 h-2.5 rounded-full ${
            callStatus === "in-call"
              ? "bg-emerald-500 animate-pulse"
              : callStatus === "connecting" || callStatus === "ringing"
              ? "bg-amber-400 animate-pulse"
              : callStatus === "error"
              ? "bg-red-500"
              : "bg-slate-500"
          }`}
        />
        <span className="text-sm font-medium text-slate-400 uppercase tracking-wider">
          {callStatus === "idle" && "Ready"}
          {callStatus === "connecting" && "Connecting…"}
          {callStatus === "ringing" && "Ringing…"}
          {callStatus === "in-call" && "In Call"}
          {callStatus === "ended" && "Call Ended"}
          {callStatus === "error" && "Error"}
        </span>
        {isRecording && (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-0.5 rounded-full ml-2">
            <Circle className="w-2 h-2 fill-red-500 text-red-500 animate-pulse" />
            REC
          </span>
        )}
      </div>

      {/* ── Error Message ────────────────────────────────────────────── */}
      {errorMsg && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-2 rounded-lg w-full text-center">
          {errorMsg}
        </div>
      )}

      {/* ── Video Grid ───────────────────────────────────────────────── */}
      <div className="relative w-full grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Local Video */}
        <div className="relative bg-slate-900 rounded-xl overflow-hidden aspect-video border border-slate-800">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${
              isCameraOff ? "opacity-0" : "opacity-100"
            } transition-opacity duration-300`}
          />
          {isCameraOff && (
            <div className="absolute inset-0 flex items-center justify-center">
              <VideoOff className="w-10 h-10 text-slate-600" />
            </div>
          )}
          <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm text-white text-xs font-semibold px-2.5 py-1 rounded-md flex items-center gap-1.5">
            {isScreenSharing && <MonitorUp className="w-3 h-3 text-indigo-400" />}
            {isScreenSharing ? "Screen" : "You"}
            {isMuted && " · Muted"}
          </div>
        </div>

        {/* Remote Video */}
        <div className="relative bg-slate-900 rounded-xl overflow-hidden aspect-video border border-slate-800">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
          {callStatus !== "in-call" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-500">
              {callStatus === "connecting" || callStatus === "ringing" ? (
                <Loader2 className="w-8 h-8 animate-spin" />
              ) : (
                <Monitor className="w-10 h-10" />
              )}
              <span className="text-xs font-medium">
                {callStatus === "ringing"
                  ? "Waiting for answer…"
                  : callStatus === "connecting"
                  ? "Establishing connection…"
                  : "Remote peer"}
              </span>
            </div>
          )}
          {callStatus === "in-call" && (
            <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm text-white text-xs font-semibold px-2.5 py-1 rounded-md">
              Peer
            </div>
          )}
        </div>
      </div>

      {/* ── Controls Bar ─────────────────────────────────────────────── */}
      <div className="call-controls-bar flex items-center gap-3 bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-full px-6 py-3">
        {/* Mic toggle */}
        <button
          onClick={toggleMute}
          className={`p-2.5 rounded-full transition-colors ${
            isMuted
              ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
              : "bg-slate-800 text-slate-300 hover:bg-slate-700"
          }`}
          title={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        {/* Camera toggle */}
        <button
          onClick={toggleCamera}
          className={`p-2.5 rounded-full transition-colors ${
            isCameraOff
              ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
              : "bg-slate-800 text-slate-300 hover:bg-slate-700"
          }`}
          title={isCameraOff ? "Turn Camera On" : "Turn Camera Off"}
        >
          {isCameraOff ? (
            <VideoOff className="w-5 h-5" />
          ) : (
            <Video className="w-5 h-5" />
          )}
        </button>

        {/* Screen share toggle */}
        <button
          onClick={toggleScreenShare}
          disabled={callStatus !== "in-call"}
          className={`p-2.5 rounded-full transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
            isScreenSharing
              ? "bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30"
              : "bg-slate-800 text-slate-300 hover:bg-slate-700"
          }`}
          title={isScreenSharing ? "Stop Sharing" : "Share Screen"}
        >
          {isScreenSharing ? (
            <MonitorOff className="w-5 h-5" />
          ) : (
            <MonitorUp className="w-5 h-5" />
          )}
        </button>

        {/* Record toggle */}
        <button
          onClick={toggleRecording}
          disabled={callStatus !== "in-call"}
          className={`p-2.5 rounded-full transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
            isRecording
              ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
              : "bg-slate-800 text-slate-300 hover:bg-slate-700"
          }`}
          title={isRecording ? "Stop Recording" : "Record Call"}
        >
          {isRecording ? (
            <div className="relative">
              <Circle className="w-5 h-5 fill-red-500 text-red-500 animate-pulse" />
            </div>
          ) : (
            <Circle className="w-5 h-5" />
          )}
        </button>

        {/* Call / End Call */}
        {!isActive ? (
          <button
            onClick={() => handleStartCall()}
            disabled={!targetUserId || callStatus === "error"}
            className="p-2.5 rounded-full bg-emerald-600 text-white hover:bg-emerald-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="Start Call"
          >
            <PhoneCall className="w-5 h-5" />
          </button>
        ) : (
          <button
            onClick={handleEndCall}
            className="p-2.5 rounded-full bg-red-600 text-white hover:bg-red-500 transition-colors"
            title="End Call"
          >
            <PhoneOff className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* ── Peers List Panel (Shown when idle or ready) ──────────────── */}
      {!isActive && roomUsers.length > 0 && (
        <div className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 mt-2">
          <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            Active Peers in this Room ({roomUsers.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {roomUsers.map((peer) => (
              <div
                key={peer.userId}
                className="flex items-center justify-between bg-slate-950 p-3 rounded-lg border border-slate-800/80 hover:border-slate-700 transition-all"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-white">
                    {peer.userName}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    ID: {peer.userId.slice(0, 8)}...
                  </span>
                </div>
                <button
                  onClick={() => handleStartCall(peer.userId)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-1.5 px-3 rounded-md transition-all flex items-center gap-1.5"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  Call
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {!isActive && roomUsers.length === 0 && (
        <div className="w-full text-center py-4 bg-slate-900/40 border border-slate-900 rounded-xl">
          <p className="text-xs text-slate-500">
            Waiting for other peers to join this room link...
          </p>
        </div>
      )}
    </div>
  );
}
