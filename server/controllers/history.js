import mongoose from "mongoose";
import video from "../Modals/video.js";
import history from "../Modals/history.js";

export const handlehistory = async (req, res) => {
  const { userId } = req.body;
  const { videoId } = req.params;
  
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid user ID" });
  }
  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    return res.status(400).json({ message: "Invalid video ID" });
  }
  try {
    await history.create({ viewer: userId, videoid: videoId });
    await video.findByIdAndUpdate(videoId, { $inc: { views: 1 } });
    return res.status(200).json({ history: true });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const handleview = async (req, res) => {
  const { videoId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    return res.status(400).json({ message: "Invalid video ID" });
  }
  try {
    await video.findByIdAndUpdate(videoId, { $inc: { views: 1 } });
    return res.status(200).json({ message: "View recorded" });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getallhistoryVideo = async (req, res) => {
  const { userId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid user ID" });
  }
  try {
    const rawHistory = await history
      .find({ viewer: userId })
      .lean()
      .exec();

    // Fetch local videos
    const localVideos = await video.find().lean().exec();

    // Fetch remote videos
    let remoteVideos = [];
    try {
      const remoteResponse = await fetch("https://you-tube2-0-six-backend.onrender.com/video/getall");
      if (remoteResponse.ok) {
        remoteVideos = await remoteResponse.json();
      }
    } catch (fetchErr) {
      console.error("Error fetching remote videos in getallhistoryVideo:", fetchErr);
    }

    // Combine local and remote videos
    const allVideos = [...localVideos, ...remoteVideos];

    // Map each history record to its video details
    const historyvideo = rawHistory.map(item => {
      const matchedVideo = allVideos.find(v => v._id.toString() === item.videoid.toString());
      return {
        ...item,
        videoid: matchedVideo || null
      };
    });

    return res.status(200).json(historyvideo);
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
