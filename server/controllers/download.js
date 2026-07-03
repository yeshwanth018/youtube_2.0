import mongoose from "mongoose";
import download from "../Modals/download.js";
import users from "../Modals/Auth.js";
import videoModel from "../Modals/video.js";

export const handledownload = async (req, res) => {
  const { userId } = req.body;
  const { videoId } = req.params;
  
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid user ID" });
  }
  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    return res.status(400).json({ message: "Invalid video ID" });
  }
  try {
    // Check if user is premium
    const currentUser = await users.findById(userId);
    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // If not premium, enforce daily limit of 1
    if (!currentUser.isPremium) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const todayDownloads = await download.countDocuments({
        viewer: userId,
        downloadedon: { $gte: todayStart, $lte: todayEnd },
      });

      if (todayDownloads >= 1) {
        return res.status(403).json({
          message:
            "Free users can only download 1 video per day. Upgrade to Premium!",
          limitReached: true,
        });
      }
    }

    // Record the download
    await download.create({ viewer: userId, videoid: videoId });
    return res.status(200).json({ download: true });
  } catch (error) {
    console.error("handledownload error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getalldownloads = async (req, res) => {
  const { userId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid user ID" });
  }
  try {
    const rawDownloads = await download
      .find({ viewer: userId })
      .sort({ downloadedon: -1 })
      .lean()
      .exec();

    // Fetch local videos
    const localVideos = await videoModel.find().lean().exec();

    // Fetch remote videos
    let remoteVideos = [];
    try {
      const remoteResponse = await fetch("https://you-tube2-0-six-backend.onrender.com/video/getall");
      if (remoteResponse.ok) {
        remoteVideos = await remoteResponse.json();
      }
    } catch (fetchErr) {
      console.error("Error fetching remote videos in getalldownloads:", fetchErr);
    }

    // Combine local and remote videos
    const allVideos = [...localVideos, ...remoteVideos];

    // Map each download record to its video details
    const downloads = rawDownloads.map(d => {
      const matchedVideo = allVideos.find(v => v._id.toString() === d.videoid.toString());
      return {
        ...d,
        videoid: matchedVideo || null
      };
    });

    return res.status(200).json(downloads);
  } catch (error) {
    console.error("getalldownloads error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
