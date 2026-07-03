import Link from "next/link";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";

interface RelatedVideosProps {
  videos: Array<{
    _id: string;
    videotitle: string;
    videochanel: string;
    views: number;
    createdAt: string;
    thumbnail?: string;
  }>;
}
const vid = "/video/vdo.mp4";
export default function RelatedVideos({ videos }: RelatedVideosProps) {
  return (
    <div className="space-y-3">
      {videos?.map((video) => (
        <Link
          key={video._id}
          href={`/watch/${video._id}`}
          className="flex gap-3 items-start"
        >
          <div className="w-28 aspect-video bg-slate-900 border border-slate-800 rounded overflow-hidden flex-shrink-0 relative">
            <img
              src={video.thumbnail || "/placeholder.svg?height=90&width=160"}
              alt={video.videotitle}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
            />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm line-clamp-2 group-hover:text-blue-600">
              {video.videotitle}
            </h3>
            <p className="text-xs text-gray-600 mt-1">{video.videochanel}</p>
            <p className="text-xs text-gray-600">
              {video.views?.toLocaleString()} views • {formatDistanceToNow(new Date(video.createdAt))} ago
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
