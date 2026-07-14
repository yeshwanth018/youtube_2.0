import comment from "../Modals/comment.js";
import mongoose from "mongoose";

export const postcomment = async (req, res) => {
  let { videoid, userid, commentbody, usercommented, city } = req.body;
  if (videoid === "6a4754beea9658203b1147aa") {
    videoid = "69d50598c897812107b0e67d";
  }
  
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
  let { videoid } = req.params;
  if (videoid === "6a4754beea9658203b1147aa") {
    videoid = "69d50598c897812107b0e67d";
  }
  try {
    const commentvideo = await comment.find({ videoid: videoid, isDeleted: { $ne: true } });
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
    await comment.findByIdAndUpdate(_id, { $set: { isDeleted: true } });
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
  let { videoid } = req.params;
  if (videoid === "6a4754beea9658203b1147aa") {
    videoid = "69d50598c897812107b0e67d";
  }
  try {
    const remoteUrl = `https://you-tube2-0-six-backend.onrender.com/comment/${videoid}`;
    const response = await fetch(remoteUrl);
    if (!response.ok) {
      return res.status(response.status).json({ message: "Remote fetch failed" });
    }
    const remoteComments = await response.json();
    
    const processedComments = [];
    
    for (const rc of remoteComments) {
      let localComment = await comment.findById(rc._id);
      
      if (!localComment) {
        // Import remote comment locally
        localComment = new comment({
          _id: rc._id,
          userid: rc.userid,
          videoid: rc.videoid,
          commentbody: rc.commentbody,
          usercommented: rc.usercommented,
          commentedon: rc.commentedon || rc.createdAt,
          likes: rc.likes || [],
          dislikes: rc.dislikes || [],
          city: rc.city || "Unknown City",
          isDeleted: false
        });
        await localComment.save();
      }
      
      if (localComment && !localComment.isDeleted) {
        processedComments.push(localComment);
      }
    }
    
    return res.status(200).json(processedComments);
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
    
    // Check if total dislikes is >= 2
    if (dislikes.length >= 2) {
      targetComment.isDeleted = true;
      await targetComment.save();
      return res.status(200).json({ deleted: true });
    }
    
    await targetComment.save();
    return res.status(200).json(targetComment);
  } catch (error) {
    console.error("dislikecomment error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

