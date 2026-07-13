"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Download, Play, AlertCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import axiosInstance, { getFileUrl } from "@/lib/axiosinstance";
import { useUser } from "@/lib/AuthContext";
import { toast } from "sonner";

export default function DownloadsContent() {
  const [downloads, setDownloads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const { user } = useUser();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (user) {
      loadDownloads();
    } else if (mounted) {
      setLoading(false);
    }
  }, [user, mounted]);

  const loadDownloads = async () => {
    if (!user) return;
    try {
      const res = await axiosInstance.get(`/download/${user._id}`);
      setDownloads(res.data || []);
    } catch (error) {
      console.error("Error loading downloads:", error);
      toast.error("Failed to load downloads.");
    } finally {
      setLoading(false);
    }
  };

  const handleRedownload = async (video: any) => {
    if (!video || !video._id) return;
    toast.success(`Redownloading "${video.videotitle || "video"}"...`);
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
    const downloadUrl = `${backendUrl}/api/videos/${video._id}/download-file?userId=${user?._id}`;
    const link = document.createElement("iframe");
    link.style.display = "none";
    link.src = downloadUrl;
    document.body.appendChild(link);
    setTimeout(() => {
      document.body.removeChild(link);
    }, 10000);
  };


  if (!mounted) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
        <span className="ml-3 text-gray-600">Loading downloads...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12 bg-slate-900/40 rounded-xl border border-dashed border-slate-800">
        <Download className="w-16 h-16 mx-auto text-slate-500 mb-4 animate-bounce" />
        <h2 className="text-xl font-semibold mb-2 text-white">Save videos offline</h2>
        <p className="text-slate-400 mb-4 text-sm">
          Sign in to access and manage your downloaded videos.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
        <span className="ml-3 text-slate-400">Loading downloads...</span>
      </div>
    );
  }

  if (downloads.length === 0) {
    return (
      <div className="text-center py-12 bg-slate-900/40 rounded-xl border border-dashed border-slate-800">
        <Download className="w-16 h-16 mx-auto text-slate-500 mb-4" />
        <h2 className="text-xl font-semibold mb-2 text-white">No videos downloaded</h2>
        <p className="text-slate-400 text-sm">
          Videos you download will appear here. Go to the watch page of any video to download it!
        </p>
      </div>
    );
  }

  const validDownloads = downloads.filter((d) => d.videoid);
  const firstVideoId = validDownloads[0]?.videoid?._id;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-slate-900/60 p-4 rounded-xl border border-slate-800/40">
        <div>
          <p className="font-semibold text-lg text-white">{downloads.length} videos downloaded</p>
          {user?.isPremium ? (
            <p className="text-xs text-amber-500 font-medium">Premium Member: Unlimited Downloads Active ✨</p>
          ) : (
            <p className="text-xs text-slate-400">Free Account: Daily Limit of 1 Download (Upgrade for unlimited!)</p>
          )}
        </div>
        {firstVideoId && (
          <Link href={`/watch/${firstVideoId}`}>
            <Button className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white rounded-full px-5 font-semibold">
              <Play className="w-4 h-4 fill-white" />
              Play all
            </Button>
          </Link>
        )}
      </div>

      <div className="space-y-4">
        {downloads.map((item) => {
          if (!item.videoid) {
            return (
              <div key={item._id} className="flex gap-4 p-3 bg-red-950/20 text-red-400 rounded-lg items-center text-sm border border-red-900/30">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>This video is no longer available or was deleted from the platform.</span>
              </div>
            );
          }
          return (
            <div key={item._id} className="flex flex-col sm:flex-row gap-4 p-3 hover:bg-slate-800/40 rounded-xl border border-transparent hover:border-slate-800/50 transition-all duration-200 group relative">
              <Link href={`/watch/${item.videoid._id}`} className="flex-shrink-0">
                <div className="relative w-full sm:w-48 aspect-video bg-slate-950 rounded-lg overflow-hidden border border-slate-800">
                  <img
                    src={item.videoid.thumbnail || "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=500&auto=format&fit=crop&q=60"}
                    alt={item.videoid.videotitle}
                    className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-200"
                  />
                  <div className="absolute inset-0 bg-black/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play className="w-8 h-8 text-white fill-white drop-shadow-md" />
                  </div>
                </div>
              </Link>

              <div className="flex-1 min-w-0 flex flex-col justify-between">
                <div>
                  <Link href={`/watch/${item.videoid._id}`}>
                    <h3 className="font-semibold text-base line-clamp-2 text-white group-hover:text-red-500 mb-1 transition-colors leading-snug">
                      {item.videoid.videotitle}
                    </h3>
                  </Link>
                  <p className="text-sm text-slate-400 font-medium">
                    {item.videoid.videochanel}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {item.videoid.views.toLocaleString()} views •{" "}
                    {formatDistanceToNow(new Date(item.videoid.createdAt))} ago
                  </p>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium">
                    Downloaded {formatDistanceToNow(new Date(item.downloadedon || item.createdAt))} ago
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRedownload(item.videoid)}
                      className="flex items-center gap-1.5 rounded-full border-slate-700 hover:bg-slate-800 text-xs px-3 text-slate-300 hover:text-white"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Redownload
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
