import comment from "../Modals/comment.js";
import mongoose from "mongoose";

export const postcomment = async (req, res) => {
  const { videoid, userid, commentbody, usercommented, city } = req.body;
  
  // Validation for special characters
  const forbiddenRegex = /[@#$%^&*()_+={}\[\]|\\<>\/~`]/;
  if (commentbody && forbiddenRegex.test(commentbody)) {
    return res.status(400).json({ message: "Comments containing special characters are blocked to maintain a clean environment." });
  }
  
  const postcomment = new comment({
    videoid,
    userid,
    commentbody,
    usercommented,
    city: city || "Unknown City",
  });
  
  try {
    const savedComment = await postcomment.save();
    return res.status(200).json({ comment: true, ...savedComment.toObject() });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
export const getallcomment = async (req, res) => {
  const { videoid } = req.params;
  try {
    const commentvideo = await comment.find({ videoid: videoid });
    return res.status(200).json(commentvideo);
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
export const deletecomment = async (req, res) => {
  const { id: _id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(404).send("comment unavailable");
  }
  try {
    await comment.findByIdAndDelete(_id);
    return res.status(200).json({ comment: true });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const editcomment = async (req, res) => {
  const { id: _id } = req.params;
  const { commentbody } = req.body;
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(404).send("comment unavailable");
  }
  try {
    const updatecomment = await comment.findByIdAndUpdate(_id, {
      $set: { commentbody: commentbody },
    });
    res.status(200).json(updatecomment);
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getRemoteComments = async (req, res) => {
  try {
    const remoteUrl = `https://you-tube2-0-six-backend.onrender.com/comment/${req.params.videoid}`;
    const response = await fetch(remoteUrl);
    if (!response.ok) {
      return res.status(response.status).json({ message: "Remote fetch failed" });
    }
    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error(" getRemoteComments error:", error);
    return res.status(500).json({ message: "Something went wrong fetching remote comments" });
  }
};

export const likecomment = async (req, res) => {
  const { id: _id } = req.params;
  const { userId } = req.body;

  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(404).send("comment unavailable");
  }
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid or missing user ID." });
  }

  try {
    const targetComment = await comment.findById(_id);
    if (!targetComment) {
      return res.status(404).send("comment not found");
    }
    
    let likes = targetComment.likes || [];
    let dislikes = targetComment.dislikes || [];
    
    const userIdStr = userId.toString();
    
    if (likes.includes(userIdStr)) {
      likes = likes.filter(id => id !== userIdStr);
    } else {
      likes.push(userIdStr);
      dislikes = dislikes.filter(id => id !== userIdStr);
    }
    
    targetComment.likes = likes;
    targetComment.dislikes = dislikes;
    await targetComment.save();
    
    return res.status(200).json(targetComment);
  } catch (error) {
    console.error("likecomment error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const dislikecomment = async (req, res) => {
  const { id: _id } = req.params;
  const { userId } = req.body;

  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(404).send("comment unavailable");
  }
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid or missing user ID." });
  }

  try {
    const targetComment = await comment.findById(_id);
    if (!targetComment) {
      return res.status(404).send("comment not found");
    }
    
    let likes = targetComment.likes || [];
    let dislikes = targetComment.dislikes || [];
    
    const userIdStr = userId.toString();
    
    if (dislikes.includes(userIdStr)) {
      dislikes = dislikes.filter(id => id !== userIdStr);
    } else {
      dislikes.push(userIdStr);
      likes = likes.filter(id => id !== userIdStr);
    }
    
    targetComment.likes = likes;
    targetComment.dislikes = dislikes;
    
    // Check if dislikes from other users is >= 2
    const commentOwnerId = targetComment.userid ? targetComment.userid.toString() : "";
    const otherDislikes = dislikes.filter(id => id !== commentOwnerId);
    
    if (otherDislikes.length >= 2) {
      await comment.findByIdAndDelete(_id);
      return res.status(200).json({ deleted: true });
    }
    
    await targetComment.save();
    return res.status(200).json(targetComment);
  } catch (error) {
    console.error("dislikecomment error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

