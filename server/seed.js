import mongoose from "mongoose";
import dotenv from "dotenv";
import video from "./Modals/video.js";

dotenv.config();

const DBURL = process.env.DB_URL;

const sampleVideos = [
  {
    _id: "69d50598c897812107b0e67d",
    videotitle: "Christmas gift",
    filename: "vdo.mp4",
    filepath: "uploads/2025-06-25T06-09-29.296Z-vdo.mp4",
    filetype: "video/mp4",
    filesize: "5242880",
    videochanel: "Nature Lover",
    uploader: "nature_lover",
    Like: 3,
    views: 69,
  },
];

async function seedDatabase() {
  try {
    await mongoose.connect(DBURL);
    console.log("MongoDB connected");

    // Clear existing videos (optional)
    await video.deleteMany({});
    console.log("Cleared existing videos");

    // Insert sample videos
    const result = await video.insertMany(sampleVideos);
    console.log(`✅ Successfully inserted ${result.length} video(s)`);
    
    process.exit(0);
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  }
}

seedDatabase();
