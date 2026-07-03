import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import userroutes from "./routes/auth.js";
import videoroutes from "./routes/video.js";
import likeroutes from "./routes/like.js";
import watchlaterroutes from "./routes/watchlater.js";
import historyrroutes from "./routes/history.js";
import commentroutes from "./routes/comment.js";
import downloadroutes from "./routes/download.js";
import paymentroutes from "./routes/payment.js";
import videoDownloadRoutes from "./routes/videoDownload.js";
import apiPaymentRoutes from "./routes/apiPayment.js";
import path from "path";
import fs from "fs";
import checkUserRegion from "./middleware/checkUserRegion.js";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, ".env") });
const app = express();
app.set("trust proxy", true);
app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "30mb", extended: true }));
app.use(express.urlencoded({ limit: "30mb", extended: true }));
app.use("/uploads", (req, res, next) => {
  const localPath = path.join("uploads", req.path);
  fs.access(localPath, fs.constants.F_OK, (err) => {
    if (err) {
      return res.redirect(`https://you-tube2-0-six-backend.onrender.com/uploads${req.path}`);
    }
    next();
  });
});
app.use("/uploads", express.static(path.join("uploads")));
app.get("/", (req, res) => {
  res.send("You tube backend is working");
});
app.use(bodyParser.json());
app.use(checkUserRegion);
app.use("/user", userroutes);
app.use("/video", videoroutes);
app.use("/like", likeroutes);
app.use("/watch", watchlaterroutes);
app.use("/history", historyrroutes);
app.use("/comment", commentroutes);
app.use("/download", downloadroutes);
app.use("/payment", paymentroutes);
app.use("/api/videos", videoDownloadRoutes);
app.use("/api/payments", apiPaymentRoutes);
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`server running on port ${PORT}`);
});

const dbURI = process.env.MONGODB_URI || process.env.DB_URL || 'mongodb://127.0.0.1:27017/youtube_clone';
mongoose
  .connect(dbURI)
  .then(() => {
    console.log("Mongodb connected");
  })
  .catch((error) => {
    console.log(error);
  });
