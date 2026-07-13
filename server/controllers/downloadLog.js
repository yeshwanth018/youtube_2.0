import mongoose from "mongoose";
import DownloadLog from "../Modals/DownloadLog.js";
import downloadModel from "../Modals/download.js";
import users from "../Modals/Auth.js";
import video from "../Modals/video.js";
import path from "path";
import fs from "fs";

export const checkAndLogDownload = async (req, res) => {
  const { id: videoId } = req.params;
  const userId = req.query.userId;

  if (!userId) {
    return res.status(401).json({ message: "Please sign in to download videos." });
  }

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid user ID." });
  }
  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    return res.status(400).json({ message: "Invalid video ID." });
  }

  try {
    // Find video if it exists locally
    const targetVideo = await video.findById(videoId);
    const filepath = targetVideo ? targetVideo.filepath : "";
    const videotitle = targetVideo ? targetVideo.videotitle : "";

    // Check user and their plan
    const currentUser = await users.findById(userId);
    if (!currentUser) {
      return res.status(404).json({ message: "User not found." });
    }

    const userPlan = currentUser.plan || (currentUser.isPremium ? "premium" : "free");

    // If free user, enforce 1 download/day limit
    if (userPlan === "free") {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const todayDownloads = await DownloadLog.countDocuments({
        userId: userId,
        downloadedAt: { $gte: todayStart, $lte: todayEnd },
      });

      if (todayDownloads >= 1) {
        return res.status(403).json({
          message: "Free users can only download 1 video per day. Upgrade to Premium!",
          limitReached: true,
          plan: "free",
          downloadsToday: todayDownloads,
        });
      }
    }

    // Log the download in both collections
    await DownloadLog.create({ userId, videoId });
    await downloadModel.findOneAndUpdate(
      { viewer: userId, videoid: videoId },
      { viewer: userId, videoid: videoId },
      { upsert: true, new: true }
    );

    return res.status(200).json({
      download: true,
      message: "Download authorized.",
      plan: userPlan,
      filepath: filepath,
      videotitle: videotitle,
    });
  } catch (error) {
    console.error("checkAndLogDownload error:", error);
    return res.status(500).json({ message: "Something went wrong." });
  }
};

export const downloadFile = async (req, res) => {
  const { id: videoId } = req.params;
  const userId = req.query.userId;

  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid user ID." });
  }
  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    return res.status(400).json({ message: "Invalid video ID." });
  }

  try {
    const targetVideo = await video.findById(videoId);
    if (!targetVideo) {
      return res.status(404).json({ message: "Video not found." });
    }

    const currentUser = await users.findById(userId);
    if (!currentUser) {
      return res.status(404).json({ message: "User not found." });
    }

    const filepath = targetVideo.filepath || "";

    // 1. If the filepath is already a remote URL, redirect directly to it
    if (filepath.startsWith("http://") || filepath.startsWith("https://")) {
      return res.redirect(filepath);
    }

    // 2. Serve the file directly for download if it exists locally
    const absolutePath = path.resolve(filepath);
    if (fs.existsSync(absolutePath)) {
      return res.download(absolutePath, targetVideo.filename);
    } else {
      // Fallback: Redirect to the seed backend where permanent uploads are stored
      const filename = path.basename(filepath);
      return res.redirect(`https://you-tube2-0-six-backend.onrender.com/uploads/${filename}`);
    }
  } catch (error) {
    console.error("downloadFile error:", error);
    return res.status(500).json({ message: "Something went wrong." });
  }
};

