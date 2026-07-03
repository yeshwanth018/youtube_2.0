"use clinet";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback } from "./ui/avatar";

const videos = "/video/vdo.mp4";
export default function VideoCard({ video }: any) {
  return (
    <Link href={`/watch/${video?._id}`} className="group">
      <div className="space-y-3">
        <div className="relative aspect-video rounded-lg overflow-hidden bg-slate-900 border border-slate-800">
          <img
            src={video?.thumbnail || "/placeholder.svg?height=180&width=320"}
            alt={video?.videotitle}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ease-out"
          />
          <div className="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow">
            {video?.videotitle.includes("Tears") ? "12:14" : "9:56"}
          </div>
        </div>
        <div className="flex gap-3">
          <Avatar className="w-9 h-9 flex-shrink-0">
            <AvatarFallback>{video?.videochanel[0]}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm line-clamp-2 text-foreground group-hover:text-red-600">
              {video?.videotitle}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">{video?.videochanel}</p>
            <p className="text-sm text-muted-foreground">
              {video?.views.toLocaleString()} views •{" "}
              {formatDistanceToNow(new Date(video?.createdAt))} ago
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}
