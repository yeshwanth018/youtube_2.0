import Comments from "@/components/Comments";
import RelatedVideos from "@/components/RelatedVideos";
import VideoInfo from "@/components/VideoInfo";
import Videopplayer from "@/components/Videopplayer";
import axiosInstance from "@/lib/axiosinstance";
import { notFound } from "next/navigation";
import { useRouter } from "next/router";
import React, { useCallback, useEffect, useMemo, useState } from "react";

const index = () => {
  const router = useRouter();
  const { id } = router.query;
  const [allVideos, setAllVideos] = useState<any>(null);
  const [selectedVideo, setSelectedVideo] = useState<any>(null);
  const [loading, setloading] = useState(true);
  useEffect(() => {
    const fetchvideo = async () => {
      if (!id || typeof id !== "string") return;
      try {
        const res = await axiosInstance.get("/video/getall");
        const video = res.data?.find((vid: any) => vid._id === id);
        setSelectedVideo(video);
        setAllVideos(res.data);
      } catch (error) {
        console.log(error);
      } finally {
        setloading(false);
      }
    };
    fetchvideo();
  }, [id]);
  // const relatedVideos = [
  //   {
  //     _id: "1",
  //     videotitle: "Amazing Nature Documentary",
  //     filename: "nature-doc.mp4",
  //     filetype: "video/mp4",
  //     filepath: "/videos/nature-doc.mp4",
  //     filesize: "500MB",
  //     videochanel: "Nature Channel",
  //     Like: 1250,
  //     Dislike: 50,
  //     views: 45000,
  //     uploader: "nature_lover",
  //     createdAt: new Date().toISOString(),
  //   },
  //   {
  //     _id: "2",
  //     videotitle: "Cooking Tutorial: Perfect Pasta",
  //     filename: "pasta-tutorial.mp4",
  //     filetype: "video/mp4",
  //     filepath: "/videos/pasta-tutorial.mp4",
  //     filesize: "300MB",
  //     videochanel: "Chef's Kitchen",
  //     Like: 890,
  //     Dislike: 20,
  //     views: 23000,
  //     uploader: "chef_master",
  //     createdAt: new Date(Date.now() - 86400000).toISOString(),
  //   },
  // ];
  const handlePlayNext = useCallback(() => {
    if (!allVideos || !selectedVideo) return;
    const currentIndex = allVideos.findIndex(
      (v: any) => v._id === selectedVideo._id
    );
    // Pick the next video, or wrap around to the first
    const nextIndex = (currentIndex + 1) % allVideos.length;
    const nextVideo = allVideos[nextIndex];
    if (nextVideo && nextVideo._id !== selectedVideo._id) {
      router.push(`/watch/${nextVideo._id}`);
    }
  }, [allVideos, selectedVideo, router]);

  if (loading) {
    return <div>Loading..</div>;
  }
  
  if (!allVideos || !selectedVideo) {
    return <div>Video not found</div>;
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <div className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Videopplayer video={selectedVideo} onPlayNext={handlePlayNext} />
            <VideoInfo video={selectedVideo} />
            <div id="comments-section">
              <Comments videoId={id} />
            </div>
          </div>
          <div className="space-y-4">
            <RelatedVideos videos={allVideos} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default index;
