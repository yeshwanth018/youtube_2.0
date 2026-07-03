import express from "express";
import { handledownload, getalldownloads } from "../controllers/download.js";

const routes = express.Router();
routes.post("/:videoId", handledownload);
routes.get("/:userId", getalldownloads);
export default routes;
