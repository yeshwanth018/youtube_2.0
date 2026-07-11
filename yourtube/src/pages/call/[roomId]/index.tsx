import VideoCall from "@/components/VideoCall";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { useRouter } from "next/router";
import React, { useState, useEffect } from "react";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";

const CallPage = () => {
  const router = useRouter();
  const { roomId } = router.query;
  const { user } = useUser();
  const [targetUserId, setTargetUserId] = useState("");
  const [roomName, setRoomName] = useState("");
  const [copied, setCopied] = useState(false);

  // Fetch room metadata (display name) from the server
  useEffect(() => {
    if (roomId && typeof roomId === "string") {
      axiosInstance
        .get(`/room/${roomId}`)
        .then((res) => {
          if (res.data?.roomName) {
            setRoomName(res.data.roomName);
          }
        })
        .catch(() => {
          // Room metadata not found — that's fine, it might be a direct-join room
        });
    }
  }, [roomId]);

  const handleCopyCode = () => {
    if (!roomId) return;
    const url = `${window.location.origin}/call/${roomId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Room link copied! Share it with friends.");
    setTimeout(() => setCopied(false), 2000);
  };

  if (!roomId || typeof roomId !== "string") {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <p className="text-slate-500">Invalid call room.</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <p className="text-slate-500">Please sign in to use video calling.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-screen p-2 sm:p-4">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Room info header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div>
            <h1 className="text-xl font-bold text-foreground">
              {roomName && roomName !== roomId ? roomName : "Video Call"}
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-xs text-slate-500 font-mono">
                Room: {roomId}
              </p>
              <button
                onClick={handleCopyCode}
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
                title="Copy room link"
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? "Copied" : "Share"}
              </button>
            </div>
          </div>
        </div>

        {/* VideoCall component */}
        <VideoCall
          roomId={roomId}
        />
      </div>
    </div>
  );
};

export default CallPage;
