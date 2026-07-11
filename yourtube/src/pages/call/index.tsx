import { useUser } from "@/lib/AuthContext";
import { useRouter } from "next/router";
import React, { useState } from "react";
import { Video, Users, UserPlus, ArrowRight, Copy, Check, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import axiosInstance from "@/lib/axiosinstance";

export default function CallLobby() {
  const router = useRouter();
  const { user } = useUser();
  const [roomCode, setRoomCode] = useState("");
  const [roomName, setRoomName] = useState("");
  const [copied, setCopied] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[70vh] bg-background text-foreground px-4">
        <div className="max-w-md w-full text-center space-y-4 bg-slate-900/40 p-8 rounded-2xl border border-slate-800">
          <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto">
            <Video className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold">Sign In Required</h2>
          <p className="text-sm text-slate-400">
            You must be signed in to create or join video call rooms and share screen sessions.
          </p>
        </div>
      </div>
    );
  }

  // ── Join an existing room by its code/ID ─────────────────────────────────
  const handleJoinRoom = (roomId: string) => {
    const cleanId = roomId.trim().toLowerCase().replace(/[^a-z0-9-_]/g, "");
    if (!cleanId) return;
    router.push(`/call/${cleanId}`);
  };

  // ── Create a new room — server generates the unique ID ───────────────────
  const handleCreateRoom = async () => {
    setIsCreating(true);
    try {
      const res = await axiosInstance.post("/room/create", {
        roomName: roomName.trim() || "Untitled Room",
        userId: user._id || user.id,
      });

      const { roomId } = res.data;
      toast.success(`Room created! Code: ${roomId}`, {
        description: "Share this code with friends to join.",
      });
      router.push(`/call/${roomId}`);
    } catch (err) {
      console.error("[CallLobby] Room creation failed:", err);
      toast.error("Failed to create room. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyLink = () => {
    const personalUrl = `${window.location.origin}/call/${user._id || user.id}`;
    navigator.clipboard.writeText(personalUrl);
    setCopied(true);
    toast.success("Personal call link copied! Send it to your friend to connect.");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex-1 min-h-screen bg-background text-foreground p-4 sm:p-6 transition-colors duration-300">
      <div className="max-w-3xl mx-auto space-y-8 mt-8">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            YourTube Video Call &amp; Co-Watch
          </h1>
          <p className="text-sm text-slate-400 max-w-lg mx-auto">
            Host high-quality video calls, share your screen, co-watch videos, and record sessions directly in your browser.
          </p>
        </div>

        {/* Dashboard Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Card 1: Create Room (server-generated unique ID) */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between space-y-6 hover:border-slate-700/80 transition-all">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                <Plus className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Create Room</h3>
              <p className="text-xs text-slate-400">
                Give your room a name (optional) and get a unique code. Share the code with friends so they can join.
              </p>
            </div>
            
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Room name (optional, e.g. Study Group)"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
              <button
                onClick={handleCreateRoom}
                disabled={isCreating}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 px-4 rounded-xl text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Video className="w-4 h-4" />
                    Create Room
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Card 2: Join Existing Room by Code */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between space-y-6 hover:border-slate-700/80 transition-all">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Join Room</h3>
              <p className="text-xs text-slate-400">
                Enter the room code shared by your friend to join an existing call session.
              </p>
            </div>
            
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Enter room code..."
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
              <button
                onClick={() => handleJoinRoom(roomCode)}
                disabled={!roomCode.trim()}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-4 rounded-xl text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Join Room
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>

        {/* Personal Room Card */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 hover:border-slate-700/80 transition-all">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Personal Room</h3>
                <p className="text-xs text-slate-400">
                  Your permanent room — share the link for instant calls.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCopyLink}
                className="bg-slate-950 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 font-semibold py-2 px-4 rounded-xl text-sm transition-all flex items-center justify-center gap-2"
              >
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copied!" : "Copy Link"}
              </button>
              <button
                onClick={() => handleJoinRoom(user._id || user.id)}
                className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 px-4 rounded-xl text-sm transition-all flex items-center justify-center gap-2"
              >
                Enter
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-2xl p-4 text-center">
          <p className="text-xs text-indigo-300/80">
            💡 <strong>Tip:</strong> Join the public room <span className="font-mono text-white underline cursor-pointer" onClick={() => handleJoinRoom("lobby")}>lobby</span> to find other active testers in the workspace.
          </p>
        </div>

      </div>
    </div>
  );
}
