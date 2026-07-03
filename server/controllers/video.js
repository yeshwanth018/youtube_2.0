import video from "../Modals/video.js";

export const uploadvideo = async (req, res) => {
  if (req.file === undefined) {
    return res
      .status(404)
      .json({ message: "plz upload a mp4 video file only" });
  } else {
    try {
      const file = new video({
        videotitle: req.body.videotitle,
        filename: req.file.originalname,
        filepath: req.file.path,
        filetype: req.file.mimetype,
        filesize: req.file.size,
        videochanel: req.body.videochanel,
        uploader: req.body.uploader,
      });
      await file.save();
      return res.status(201).json("file uploaded successfully");
    } catch (error) {
      console.error(" error:", error);
      return res.status(500).json({ message: "Something went wrong" });
    }
  }
};
export const getallvideo = async (req, res) => {
  try {
    const files = await video.find();
    return res.status(200).send(files);
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getRemoteVideos = async (req, res) => {
  try {
    const remoteUrl = "https://you-tube2-0-six-backend.onrender.com/video/getall";
    const response = await fetch(remoteUrl);
    if (!response.ok) {
      return res.status(response.status).json({ message: "Remote fetch failed" });
    }
    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error(" getRemoteVideos error:", error);
    return res.status(500).json({ message: "Something went wrong fetching remote videos" });
  }
};
