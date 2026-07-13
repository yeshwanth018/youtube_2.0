import express from "express";
import { deletecomment, getallcomment, postcomment, editcomment, getRemoteComments, likecomment, dislikecomment } from "../controllers/comment.js";


const routes = express.Router();
routes.get("/remote/:videoid", getRemoteComments);
routes.get("/:videoid", getallcomment);
routes.post("/postcomment", postcomment);
routes.delete("/deletecomment/:id", deletecomment);
routes.post("/editcomment/:id", editcomment);
routes.put("/like/:id", likecomment);
routes.put("/dislike/:id", dislikecomment);
export default routes;
