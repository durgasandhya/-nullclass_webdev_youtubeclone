import React, { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { formatDistanceToNow } from "date-fns";
import { useUser } from "@/lib/AuthContext";
import { useTheme } from "@/lib/ThemeContext";
import axiosInstance from "@/lib/axiosinstance";
import { ThumbsUp, ThumbsDown, Languages } from "lucide-react";
import { toast } from "sonner";

interface Comment {
  _id: string;
  videoid: string;
  userid: string;
  commentbody: string;
  usercommented: string;
  commentedon: string;
  likes?: number;
  dislikes?: number;
  city?: string;
  likedBy?: string[];
  dislikedBy?: string[];
}

const Comments = ({ videoId }: any) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [translating, setTranslating] = useState<string | null>(null);
  const [translatedTexts, setTranslatedTexts] = useState<{
    [key: string]: string;
  }>({});
  const [selectedLang, setSelectedLang] = useState("es"); // default Spanish
  const { user } = useUser();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);

  // Language options for translation
  const languages = [
    { code: "es", name: "Spanish" },
    { code: "fr", name: "French" },
    { code: "de", name: "German" },
    { code: "hi", name: "Hindi" },
    { code: "zh", name: "Chinese" },
    { code: "ar", name: "Arabic" },
    { code: "ja", name: "Japanese" },
    { code: "ko", name: "Korean" },
    { code: "pt", name: "Portuguese" },
    { code: "ru", name: "Russian" },
  ];

  useEffect(() => {
    loadComments();
  }, [videoId]);

  const loadComments = async () => {
    try {
      const res = await axiosInstance.get(`/comment/${videoId}`);
      setComments(res.data);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading comments...</div>;
  }

  const handleSubmitComment = async () => {
    if (!user || !newComment.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await axiosInstance.post("/comment/postcomment", {
        videoid: videoId,
        userid: user._id,
        commentbody: newComment,
        usercommented: user.name,
      });

      if (res.data.comment) {
        await loadComments(); // Reload to get the new comment with city
        setNewComment("");
        toast.success("Comment added successfully!");
      }
    } catch (error: any) {
      console.error("Error adding comment:", error);
      if (error.response?.status === 400) {
        toast.error(
          error.response.data.message ||
            "Special characters are not allowed in comments"
        );
      } else {
        toast.error("Failed to add comment");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLike = async (commentId: string) => {
    if (!user) {
      toast.error("Please sign in to like comments");
      return;
    }

    try {
      const res = await axiosInstance.post(`/comment/like/${commentId}`, {
        userId: user._id,
      });

      if (res.data.deleted) {
        // Comment was deleted due to dislikes
        toast.info(res.data.message);
        setComments((prev) => prev.filter((c) => c._id !== commentId));
      } else {
        // Update the comment in state
        setComments((prev) =>
          prev.map((c) => (c._id === commentId ? res.data : c))
        );
      }
    } catch (error) {
      console.error("Error liking comment:", error);
      toast.error("Failed to like comment");
    }
  };

  const handleDislike = async (commentId: string) => {
    if (!user) {
      toast.error("Please sign in to dislike comments");
      return;
    }

    try {
      const res = await axiosInstance.post(`/comment/dislike/${commentId}`, {
        userId: user._id,
      });

      if (res.data.deleted) {
        // Comment was auto-deleted
        toast.info(res.data.message);
        setComments((prev) => prev.filter((c) => c._id !== commentId));
      } else {
        // Update the comment in state
        setComments((prev) =>
          prev.map((c) => (c._id === commentId ? res.data : c))
        );
      }
    } catch (error) {
      console.error("Error disliking comment:", error);
      toast.error("Failed to dislike comment");
    }
  };

  const handleTranslate = async (commentId: string, text: string) => {
    setTranslating(commentId);
    try {
      const res = await axiosInstance.post("/comment/translate", {
        text: text,
        targetLang: selectedLang,
      });

      setTranslatedTexts({
        ...translatedTexts,
        [commentId]: res.data.translatedText,
      });
      toast.success(`Translated to ${languages.find((l) => l.code === selectedLang)?.name}`);
    } catch (error) {
      console.error("Translation error:", error);
      toast.error("Translation failed. Please try again.");
    } finally {
      setTranslating(null);
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
        toast.success("Comment updated!");
      }
    } catch (error) {
      console.log(error);
      toast.error("Failed to update comment");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await axiosInstance.delete(`/comment/deletecomment/${id}`);
      if (res.data.comment) {
        setComments((prev) => prev.filter((c) => c._id !== id));
        toast.success("Comment deleted!");
      }
    } catch (error) {
      console.log(error);
      toast.error("Failed to delete comment");
    }
  };

  return (
    <div className="space-y-6">
      <h2 className={`text-xl font-semibold ${theme === "dark" ? "text-white" : "text-black"}`}>
        {comments.length} Comments
      </h2>

      {user && (
        <div className="flex gap-4">
          <Avatar className="w-10 h-10">
            <AvatarImage src={user.image || ""} />
            <AvatarFallback>{user.name?.[0] || "U"}</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-2">
            <Textarea
              placeholder="Add a comment... (Special characters not allowed)"
              value={newComment}
              onChange={(e: any) => setNewComment(e.target.value)}
              className="min-h-[80px] resize-none border-0 border-b-2 rounded-none focus-visible:ring-0"
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
                {isSubmitting ? "Posting..." : "Comment"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {comments.length === 0 ? (
          <p className={`text-sm italic ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
            No comments yet. Be the first to comment!
          </p>
        ) : (
          comments.map((comment) => {
            const isLiked = comment.likedBy?.includes(user?._id || "");
            const isDisliked = comment.dislikedBy?.includes(user?._id || "");
            const showTranslation = translatedTexts[comment._id];

            return (
              <div key={comment._id} className="flex gap-4">
                <Avatar className="w-10 h-10">
                  <AvatarImage src="/placeholder.svg?height=40&width=40" />
                  <AvatarFallback>{comment.usercommented[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`font-medium text-sm ${theme === "dark" ? "text-white" : "text-black"}`}>
                      {comment.usercommented}
                    </span>
                    {comment.city && (
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                        {comment.city}
                      </span>
                    )}
                    <span className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
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
                      <p className={`text-sm mb-2 ${theme === "dark" ? "text-gray-300" : "text-black"}`}>
                        {showTranslation || comment.commentbody}
                      </p>

                      {/* Like/Dislike/Translate buttons */}
                      <div className="flex items-center gap-4 mt-2">
                        {/* Like Button */}
                        <button
                          onClick={() => handleLike(comment._id)}
                          className={`flex items-center gap-1 text-sm ${
                            isLiked
                              ? "text-blue-600 font-semibold"
                              : theme === "dark"
                              ? "text-gray-400 hover:text-blue-600"
                              : "text-gray-600 hover:text-blue-600"
                          }`}
                        >
                          <ThumbsUp size={16} />
                          <span>{comment.likes || 0}</span>
                        </button>

                        {/* Dislike Button */}
                        <button
                          onClick={() => handleDislike(comment._id)}
                          className={`flex items-center gap-1 text-sm ${
                            isDisliked
                              ? "text-red-600 font-semibold"
                              : theme === "dark"
                              ? "text-gray-400 hover:text-red-600"
                              : "text-gray-600 hover:text-red-600"
                          }`}
                        >
                          <ThumbsDown size={16} />
                          <span>{comment.dislikes || 0}</span>
                        </button>

                        {/* Translate Button */}
                        <div className="flex items-center gap-2">
                          <select
                            value={selectedLang}
                            onChange={(e) => setSelectedLang(e.target.value)}
                            className={`text-xs border rounded px-2 py-1 ${
                              theme === "dark"
                                ? "bg-gray-700 text-white border-gray-600"
                                : "bg-white text-black"
                            }`}
                          >
                            {languages.map((lang) => (
                              <option key={lang.code} value={lang.code}>
                                {lang.name}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() =>
                              handleTranslate(comment._id, comment.commentbody)
                            }
                            disabled={translating === comment._id}
                            className={`flex items-center gap-1 text-sm ${
                              theme === "dark"
                                ? "text-gray-400 hover:text-green-600"
                                : "text-gray-600 hover:text-green-600"
                            }`}
                          >
                            <Languages size={16} />
                            <span>
                              {translating === comment._id
                                ? "Translating..."
                                : "Translate"}
                            </span>
                          </button>
                          {showTranslation && (
                            <button
                              onClick={() => {
                                const newTranslations = { ...translatedTexts };
                                delete newTranslations[comment._id];
                                setTranslatedTexts(newTranslations);
                              }}
                              className="text-xs text-gray-500 underline"
                            >
                              Show original
                            </button>
                          )}
                        </div>

                        {/* Edit/Delete for comment owner */}
                        {comment.userid === user?._id && (
                          <div className="flex gap-2 ml-auto text-sm text-gray-500">
                            <button
                              onClick={() => handleEdit(comment)}
                              className="hover:text-blue-600"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(comment._id)}
                              className="hover:text-red-600"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Comments;
