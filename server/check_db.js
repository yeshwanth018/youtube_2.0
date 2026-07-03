import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, ".env") });

const DBURL = process.env.DB_URL || "mongodb://127.0.0.1:27017/youtube_clone";

const videochema = mongoose.Schema({
  videotitle: { type: String },
  filename: { type: String },
  filepath: { type: String },
});
const Video = mongoose.model("videofiles", videochema);

async function check() {
  await mongoose.connect(DBURL);
  const videos = await Video.find();
  console.log("=== LOCAL VIDEOS ===");
  videos.forEach(v => {
    console.log(`- Title: ${v.videotitle}, ID: ${v._id}, Filepath: ${v.filepath}`);
  });

  console.log("\n=== REMOTE VIDEOS ===");
  try {
    const res = await fetch("https://you-tube2-0-six-backend.onrender.com/video/getall");
    if (res.ok) {
      const remote = await res.json();
      remote.forEach((v) => {
        console.log(`- Title: ${v.videotitle}, ID: ${v._id}, Filepath: ${v.filepath}`);
      });
    } else {
      console.log("Remote fetch failed:", res.status);
    }
  } catch (err) {
    console.error("Remote fetch error:", err);
  }
  process.exit(0);
}
check().catch(console.error);
