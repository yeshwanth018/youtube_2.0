import React, { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { formatDistanceToNow } from "date-fns";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { ThumbsUp, ThumbsDown, Languages, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Comment {
  _id: string;
  videoid: string;
  userid: string;
  commentbody: string;
  usercommented: string;
  commentedon: string;
  likes?: string[];
  dislikes?: string[];
  city?: string;
}

const LANGUAGES_LIST = [
  { code: "en", name: "English" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "hi", name: "Hindi" },
  { code: "zh-CN", name: "Chinese" },
  { code: "ar", name: "Arabic" },
];

const Comments = ({ videoId }: any) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [translations, setTranslations] = useState<Record<string, { text: string; lang: string }>>({});
  const [translatingId, setTranslatingId] = useState<string | null>(null);
  const [targetLanguages, setTargetLanguages] = useState<Record<string, string>>({});
  const fetchedComments = [
    {
      _id: "1",
      videoid: videoId,
      userid: "1",
      commentbody: "Great video! Really enjoyed watching this.",
      usercommented: "John Doe",
      commentedon: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      _id: "2",
      videoid: videoId,
      userid: "2",
      commentbody: "Thanks for sharing this amazing content!",
      usercommented: "Jane Smith",
      commentedon: new Date(Date.now() - 7200000).toISOString(),
    },
  ];
  useEffect(() => {
    setLoading(true);
    setComments([]);
    loadComments();
  }, [videoId]);

  const loadComments = async () => {
    try {
      // Fetch local comments (with new features: likes, dislikes, city)
      const localRes = await axiosInstance.get(`/comment/${videoId}`);
      const localComments = localRes.data || [];

      // Fetch previous remote comments from deployed backend
      let remoteComments: Comment[] = [];
      try {
        const remoteRes = await axiosInstance.get(`/comment/remote/${videoId}`);
        remoteComments = remoteRes.data || [];
      } catch {
        console.log("Remote comments unavailable, showing local only.");
      }

      // Merge: local first, then remote (avoid duplicates by _id)
      const localIds = new Set(localComments.map((c: Comment) => c._id));
      const uniqueRemote = remoteComments.filter((c: Comment) => !localIds.has(c._id));
      setComments([...localComments, ...uniqueRemote]);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };
  if (loading) {
    return <div>Loading history...</div>;
  }
  const handleSubmitComment = async () => {
    if (!user || !newComment.trim()) return;

    // Validate special characters
    const forbiddenRegex = /[@#$%^&*()_+={}\[\]|\\<>\/~`]/;
    if (forbiddenRegex.test(newComment)) {
      toast.error("Comments containing special characters are blocked to maintain a clean environment.");
      return;
    }

    setIsSubmitting(true);
    
    // Get city name using ipapi
    let userCity = "Unknown City";
    try {
      const geoRes = await fetch("https://ipapi.co/json/");
      if (geoRes.ok) {
        const geoData = await geoRes.json();
        if (geoData && geoData.city) {
          userCity = geoData.city;
        }
      }
    } catch (err) {
      console.error("Error getting geolocation:", err);
    }

    try {
      const res = await axiosInstance.post("/comment/postcomment", {
        videoid: videoId,
        userid: user._id,
        commentbody: newComment,
        usercommented: user.name,
        city: userCity,
      });
      if (res.data.comment) {
        const newCommentObj: Comment = {
          _id: res.data._id || Date.now().toString(),
          videoid: videoId,
          userid: user._id,
          commentbody: newComment,
          usercommented: user.name || "Anonymous",
          commentedon: new Date().toISOString(),
          likes: res.data.likes || [],
          dislikes: res.data.dislikes || [],
          city: res.data.city || userCity,
        };
        setComments([newCommentObj, ...comments]);
        toast.success("Comment added successfully!");
      }
      setNewComment("");
    } catch (error: any) {
      console.error("Error adding comment:", error);
      const errMsg = error.response?.data?.message || "Error adding comment.";
      toast.error(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (comment: Comment) => {
    setEditingCommentId(comment._id);
    setEditText(comment.commentbody);
  };

  const handleUpdateComment = async () => {
    if (!editText.trim()) return;
    try {
      const res = await axiosInstance.post(
        `/comment/editcomment/${editingCommentId}`,
        { commentbody: editText }
      );
      if (res.data) {
        setComments((prev) =>
          prev.map((c) =>
            c._id === editingCommentId ? { ...c, commentbody: editText } : c
          )
        );
        setEditingCommentId(null);
        setEditText("");
        toast.success("Comment updated successfully!");
      }
    } catch (error) {
      console.log(error);
      toast.error("Failed to update comment.");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await axiosInstance.delete(`/comment/deletecomment/${id}`);
      if (res.data.comment) {
        setComments((prev) => prev.filter((c) => c._id !== id));
        toast.success("Comment deleted successfully!");
      }
    } catch (error) {
      console.log(error);
      toast.error("Failed to delete comment.");
    }
  };

  const handleLikeComment = async (id: string) => {
    if (!user) {
      toast.error("Please login to like comments");
      return;
    }
    try {
      const res = await axiosInstance.put(`/comment/like/${id}`, {
        userId: user._id,
      });
      if (res.data) {
        setComments((prev) =>
          prev.map((c) => (c._id === id ? { ...c, likes: res.data.likes, dislikes: res.data.dislikes } : c))
        );
      }
    } catch (error) {
      console.error("Error liking comment:", error);
    }
  };

  const handleDislikeComment = async (id: string) => {
    if (!user) {
      toast.error("Please login to dislike comments");
      return;
    }
    try {
      const res = await axiosInstance.put(`/comment/dislike/${id}`, {
        userId: user._id,
      });
      if (res.data.deleted) {
        setComments((prev) => prev.filter((c) => c._id !== id));
        toast.info("Comment removed automatically due to receiving 2 dislikes.");
      } else if (res.data) {
        setComments((prev) =>
          prev.map((c) => (c._id === id ? { ...c, likes: res.data.likes, dislikes: res.data.dislikes } : c))
        );
      }
    } catch (error) {
      console.error("Error disliking comment:", error);
    }
  };

  const handleTranslate = async (id: string, text: string) => {
    const lang = targetLanguages[id] || "en";
    setTranslatingId(id);
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${lang}&dt=t&q=${encodeURIComponent(text)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Translation failed");
      const data = await res.json();
      const translatedText = data[0][0][0];
      setTranslations((prev) => ({
        ...prev,
        [id]: { text: translatedText, lang },
      }));
      toast.success("Comment translated successfully!");
    } catch (error) {
      console.error("Translation error:", error);
      toast.error("Failed to translate comment.");
    } finally {
      setTranslatingId(null);
    }
  };

  const handleToggleTranslation = (id: string) => {
    setTranslations((prev) => {
      const updated = { ...prev };
      delete updated[id];
      return updated;
    });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold mb-4">{comments.length} Comments</h2>

      {user && (
        <div className="flex gap-4 flex-col sm:flex-row">
          <Avatar className="w-12 h-12">
            <AvatarImage src={user.image || ""} />
            <AvatarFallback>{user.name?.[0] || "U"}</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-2">
            <Textarea
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e: any) => setNewComment(e.target.value)}
              className="min-h-[80px] w-full resize-none border-0 border-b-2 rounded-none focus-visible:ring-0"
            />
            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                onClick={() => setNewComment("")}
                disabled={!newComment.trim()}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitComment}
                disabled={!newComment.trim() || isSubmitting}
              >
                Comment
              </Button>
            </div>
          </div>
        </div>
      )}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <p className="text-sm text-gray-500 italic">
            No comments yet. Be the first to comment!
          </p>
        ) : (
          comments.map((comment) => (
            <div key={comment._id} className="flex gap-4 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-900 transition-colors">
              <Avatar className="w-10 h-10 border">
                <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white font-medium text-sm">
                  {comment.usercommented?.[0]?.toUpperCase() || "A"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <span className="font-semibold text-sm text-gray-900 dark:text-slate-100">
                    {comment.usercommented}
                  </span>
                  {comment.city && (
                    <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold bg-indigo-50 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-indigo-100 dark:border-indigo-950/50 flex items-center gap-1 shadow-sm">
                      <span className="text-[10px]">📍</span> {comment.city}
                    </span>
                  )}
                  <span className="text-xs text-gray-500">
                    {formatDistanceToNow(new Date(comment.commentedon))} ago
                  </span>
                </div>

                {editingCommentId === comment._id ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                    />
                    <div className="flex gap-2 justify-end">
                      <Button
                        onClick={handleUpdateComment}
                        disabled={!editText.trim()}
                      >
                        Save
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setEditingCommentId(null);
                          setEditText("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2 mt-1">
                      {translations[comment._id] ? (
                        <div>
                          <p className="text-sm text-gray-400 line-through select-none">{comment.commentbody}</p>
                          <div className="mt-1.5 p-3 bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100/50 dark:border-indigo-900/30 rounded-lg">
                            <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 block mb-1">
                              Translated ({LANGUAGES_LIST.find(l => l.code === translations[comment._id].lang)?.name || "English"}):
                            </span>
                            <p className="text-sm font-medium text-gray-800 dark:text-slate-100">{translations[comment._id].text}</p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-800 dark:text-slate-200">{comment.commentbody}</p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-gray-500 select-none">
                      {/* Likes */}
                      <button
                        onClick={() => handleLikeComment(comment._id)}
                        className={`flex items-center gap-1 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors ${
                          comment.likes?.includes(user?._id || "") ? "text-indigo-600 dark:text-indigo-400 font-semibold" : ""
                        }`}
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                        <span>{comment.likes?.length || 0}</span>
                      </button>

                      {/* Dislikes */}
                      <button
                        onClick={() => handleDislikeComment(comment._id)}
                        className={`flex items-center gap-1 hover:text-red-500 transition-colors ${
                          comment.dislikes?.includes(user?._id || "") ? "text-red-500 font-semibold" : ""
                        }`}
                      >
                        <ThumbsDown className="w-3.5 h-3.5" />
                        <span>{comment.dislikes?.length || 0}</span>
                      </button>

                      {/* Translator Widget */}
                      <div className="flex items-center gap-2 border-l pl-3 dark:border-slate-800">
                        {translations[comment._id] ? (
                          <button
                            onClick={() => handleToggleTranslation(comment._id)}
                            className="text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:underline flex items-center gap-1"
                          >
                            <Languages className="w-3.5 h-3.5" />
                            Show Original
                          </button>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <select
                              value={targetLanguages[comment._id] || "en"}
                              onChange={(e) => setTargetLanguages({ ...targetLanguages, [comment._id]: e.target.value })}
                              className="text-[11px] border border-gray-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:text-slate-300"
                            >
                              {LANGUAGES_LIST.map((lang) => (
                                <option key={lang.code} value={lang.code}>
                                  {lang.name}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => handleTranslate(comment._id, comment.commentbody)}
                              disabled={translatingId === comment._id}
                              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 disabled:opacity-50"
                            >
                              {translatingId === comment._id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Languages className="w-3.5 h-3.5" />
                              )}
                              Translate
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Edit/Delete (only for author) */}
                      {comment.userid === user?._id && (
                        <div className="flex gap-3 pl-3 border-l dark:border-slate-800 font-medium">
                          <button onClick={() => handleEdit(comment)} className="hover:text-indigo-600 transition-colors">
                            Edit
                          </button>
                          <button onClick={() => handleDelete(comment._id)} className="hover:text-red-500 transition-colors">
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Comments;
