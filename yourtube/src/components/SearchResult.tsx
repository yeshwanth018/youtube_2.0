import React, { useEffect, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import axiosInstance, { getFileUrl } from "@/lib/axiosinstance";

const SearchResult = ({ query }: any) => {
  if (!query.trim()) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">
          Enter a search term to find videos and channels.
        </p>
      </div>
    );
  }
  const [video, setvideos] = useState<any>(null);
  const [loading, setloading] = useState(true);

  const fetchVideos = async () => {
    try {
      setloading(true);
      const res = await axiosInstance.get("/video/getall");
      const allVideos = res.data || [];
      const results = allVideos.filter(
        (vid: any) =>
          vid.videotitle?.toLowerCase().includes(query.toLowerCase()) ||
          vid.videochanel?.toLowerCase().includes(query.toLowerCase())
      );
      setvideos(results);
    } catch (error) {
      console.error("SearchResult: fetch error =>", error);
      setvideos([]);
    } finally {
      setloading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, [query]);

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Loading search results...</p>
      </div>
    );
  }

  if (!video || video.length === 0) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-2">No results found</h2>
        <p className="text-gray-600">
          Try different keywords or remove search filters
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Video Results */}
      <div className="space-y-4">
        {video.map((video: any) => (
          <div key={video._id} className="flex gap-4 group">
            <Link href={`/watch/${video._id}`} className="flex-shrink-0">
              <div className="relative w-80 aspect-video bg-gray-100 rounded-lg overflow-hidden">
                <video
                  src={getFileUrl(video.filepath)}
                  className="object-cover group-hover:scale-105 transition-transform duration-200"
                />
                <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1 rounded">
                  10:24
                </div>
              </div>
            </Link>

            <div className="flex-1 min-w-0 py-1">
              <Link href={`/watch/${video._id}`}>
                <h3 className="font-medium text-lg line-clamp-2 group-hover:text-blue-600 mb-2">
                  {video.videotitle}
                </h3>
              </Link>

              <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                <span>{video.views?.toLocaleString() || 0} views</span>
                <span>•</span>
                <span>
                  {video.createdAt ? formatDistanceToNow(new Date(video.createdAt)) + " ago" : ""}
                </span>
              </div>

              <Link
                href={`/channel/${video.uploader}`}
                className="flex items-center gap-2 mb-2 hover:text-blue-600"
              >
                <Avatar className="w-6 h-6">
                  <AvatarImage src="/placeholder.svg?height=24&width=24" />
                  <AvatarFallback className="text-xs">
                    {video.videochanel ? video.videochanel[0] : "?"}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-gray-600">
                  {video.videochanel}
                </span>
              </Link>

              <p className="text-sm text-gray-700 line-clamp-2">
                Sample video description that would show search-relevant
                content and help users understand what the video is about
                before clicking.
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Results summary */}
      <div className="text-center py-8">
        <p className="text-gray-600">
          Showing {video.length} results for "{query}"
        </p>
      </div>
    </div>
  );
};

export default SearchResult;
