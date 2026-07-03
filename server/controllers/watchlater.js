import mongoose from "mongoose";
import watchlater from "../Modals/watchlater.js";
import videoModel from "../Modals/video.js";

export const handlewatchlater = async (req, res) => {
  const { userId } = req.body;
  const { videoId } = req.params;
  try {
    const exisitingwatchlater = await watchlater.findOne({
      viewer: userId,
      videoid: videoId,
    });
    if (exisitingwatchlater) {
      await watchlater.findByIdAndDelete(exisitingwatchlater._id);
      return res.status(200).json({ watchlater: false });
    } else {
      await watchlater.create({ viewer: userId, videoid: videoId });
      return res.status(200).json({ watchlater: true });
    }
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getallwatchlater = async (req, res) => {
  const { userId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid user ID" });
  }
  try {
    const rawWatchlater = await watchlater
      .find({ viewer: userId })
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
      console.error("Error fetching remote videos in getallwatchlater:", fetchErr);
    }

    // Combine local and remote videos
    const allVideos = [...localVideos, ...remoteVideos];

    // Map each watchlater record to its video details
    const watchlatervideo = rawWatchlater.map(item => {
      const matchedVideo = allVideos.find(v => v._id.toString() === item.videoid.toString());
      return {
        ...item,
        videoid: matchedVideo || null
      };
    });

    return res.status(200).json(watchlatervideo);
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
