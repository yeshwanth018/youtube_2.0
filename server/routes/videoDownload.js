import express from "express";
import { checkAndLogDownload, downloadFile } from "../controllers/downloadLog.js";

const routes = express.Router();

// GET /api/videos/:id/download?userId=xxx
routes.get("/:id/download", checkAndLogDownload);

// GET /api/videos/:id/download-file?userId=xxx
routes.get("/:id/download-file", downloadFile);

export default routes;

