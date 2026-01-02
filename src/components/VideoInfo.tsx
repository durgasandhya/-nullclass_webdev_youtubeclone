import React, { useEffect, useState } from "react";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";
import {
  Clock,
  Download,
  MoreHorizontal,
  Share,
  ThumbsDown,
  ThumbsUp,
  Crown,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useUser } from "@/lib/AuthContext";
import { useTheme } from "@/lib/ThemeContext";
import axiosInstance from "@/lib/axiosinstance";
import PremiumModal from "./PremiumModal";
import { toast } from "sonner";

const VideoInfo = ({ video }: any) => {
  const [likes, setlikes] = useState(video.Like || 0);
  const [dislikes, setDislikes] = useState(video.Dislike || 0);
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const { user } = useUser();
  const { theme } = useTheme();
  const [isWatchLater, setIsWatchLater] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // const user: any = {
  //   id: "1",
  //   name: "John Doe",
  //   email: "john@example.com",
  //   image: "https://github.com/shadcn.png?height=32&width=32",
  // };
  useEffect(() => {
    setlikes(video.Like || 0);
    setDislikes(video.Dislike || 0);
    setIsLiked(false);
    setIsDisliked(false);
  }, [video]);

  useEffect(() => {
    const handleviews = async () => {
      if (user) {
        try {
          return await axiosInstance.post(`/history/${video._id}`, {
            userId: user?._id,
          });
        } catch (error) {
          return console.log(error);
        }
      } else {
        return await axiosInstance.post(`/history/views/${video?._id}`);
      }
    };
    handleviews();
  }, [user]);

  // Check premium status
  useEffect(() => {
    const checkPremiumStatus = async () => {
      if (user) {
        try {
          const res = await axiosInstance.get(`/download/premium-status/${user._id}`);
          setIsPremium(res.data.isPremium);
        } catch (error) {
          console.log(error);
        }
      }
    };
    checkPremiumStatus();
  }, [user]);

  const handleDownload = async () => {
    if (!user) {
      toast.error("Please sign in to download videos");
      return;
    }

    setDownloading(true);

    try {
      // Check download eligibility
      const eligibilityRes = await axiosInstance.post("/download/check-eligibility", {
        userId: user._id,
      });

      if (!eligibilityRes.data.canDownload) {
        // User reached daily limit - show premium modal
        toast.error(eligibilityRes.data.message);
        setShowPremiumModal(true);
        setDownloading(false);
        return;
      }

      // User can download - proceed
      const downloadRes = await axiosInstance.post("/download/download", {
        userId: user._id,
        videoId: video._id,
      });

      if (downloadRes.data.success) {
        // Trigger browser download
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
        const downloadUrl = `${backendUrl}${downloadRes.data.videoPath}`;

        toast.success("Download started!");

        // Create download link
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = downloadRes.data.fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        if (!isPremium) {
          toast.info("You have used your daily download. Upgrade to Premium for unlimited downloads!");
        }
      }
    } catch (error: any) {
      console.error("Download error:", error);
      if (error.response?.status === 403) {
        toast.error("Daily download limit reached. Upgrade to Premium!");
        setShowPremiumModal(true);
      } else {
        toast.error("Download failed. Please try again.");
      }
    } finally {
      setDownloading(false);
    }
  };

  const handleLike = async () => {
    if (!user) return;
    try {
      const res = await axiosInstance.post(`/like/${video._id}`, {
        userId: user?._id,
      });
      if (res.data.liked) {
        if (isLiked) {
          setlikes((prev: any) => prev - 1);
          setIsLiked(false);
        } else {
          setlikes((prev: any) => prev + 1);
          setIsLiked(true);
          if (isDisliked) {
            setDislikes((prev: any) => prev - 1);
            setIsDisliked(false);
          }
        }
      }
    } catch (error) {
      console.log(error);
    }
  };
  const handleWatchLater = async () => {
    try {
      const res = await axiosInstance.post(`/watch/${video._id}`, {
        userId: user?._id,
      });
      if (res.data.watchlater) {
        setIsWatchLater(!isWatchLater);
      } else {
        setIsWatchLater(false);
      }
    } catch (error) {
      console.log(error);
    }
  };
  const handleDislike = async () => {
    if (!user) return;
    try {
      const res = await axiosInstance.post(`/like/${video._id}`, {
        userId: user?._id,
      });
      if (!res.data.liked) {
        if (isDisliked) {
          setDislikes((prev: any) => prev - 1);
          setIsDisliked(false);
        } else {
          setDislikes((prev: any) => prev + 1);
          setIsDisliked(true);
          if (isLiked) {
            setlikes((prev: any) => prev - 1);
            setIsLiked(false);
          }
        }
      }
    } catch (error) {
      console.log(error);
    }
  };
  return (
    <div className="space-y-4">
      <h1 className={`text-xl font-semibold ${theme === "dark" ? "text-white" : "text-black"}`}>
        {video.videotitle}
      </h1>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="w-10 h-10">
            <AvatarFallback>{video.videochanel[0]}</AvatarFallback>
          </Avatar>
          <div>
            <h3 className={`font-medium ${theme === "dark" ? "text-white" : "text-black"}`}>
              {video.videochanel}
            </h3>
            <p className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
              1.2M subscribers
            </p>
          </div>
          <Button className="ml-4">Subscribe</Button>
        </div>
        <div className="flex items-center gap-2">
          <div className={`flex items-center rounded-full ${
            theme === "dark" ? "bg-gray-700" : "bg-gray-100"
          }`}>
            <Button
              variant="ghost"
              size="sm"
              className={`rounded-l-full ${theme === "dark" ? "text-white hover:bg-gray-600" : ""}`}
              onClick={handleLike}
            >
              <ThumbsUp
                className={`w-5 h-5 mr-2 ${
                  isLiked ? "fill-current" : ""
                }`}
              />
              {likes.toLocaleString()}
            </Button>
            <div className={`w-px h-6 ${theme === "dark" ? "bg-gray-600" : "bg-gray-300"}`} />
            <Button
              variant="ghost"
              size="sm"
              className={`rounded-r-full ${theme === "dark" ? "text-white hover:bg-gray-600" : ""}`}
              onClick={handleDislike}
            >
              <ThumbsDown
                className={`w-5 h-5 mr-2 ${
                  isDisliked ? "fill-current" : ""
                }`}
              />
              {dislikes.toLocaleString()}
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className={`rounded-full ${
              theme === "dark"
                ? "bg-gray-700 text-white hover:bg-gray-600"
                : "bg-gray-100"
            } ${isWatchLater ? "text-primary" : ""}`}
            onClick={handleWatchLater}
          >
            <Clock className="w-5 h-5 mr-2" />
            {isWatchLater ? "Saved" : "Watch Later"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={`rounded-full ${
              theme === "dark"
                ? "bg-gray-700 text-white hover:bg-gray-600"
                : "bg-gray-100"
            }`}
          >
            <Share className="w-5 h-5 mr-2" />
            Share
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={`rounded-full ${
              theme === "dark"
                ? "bg-gray-700 text-white hover:bg-gray-600"
                : "bg-gray-100"
            }`}
            onClick={handleDownload}
            disabled={downloading}
          >
            <Download className="w-5 h-5 mr-2" />
            {downloading ? "Downloading..." : "Download"}
          </Button>
          {isPremium && (
            <div className="flex items-center gap-1 bg-yellow-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
              <Crown size={16} />
              Premium
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className={`rounded-full ${
              theme === "dark"
                ? "bg-gray-700 text-white hover:bg-gray-600"
                : "bg-gray-100"
            }`}
          >
            <MoreHorizontal className="w-5 h-5" />
          </Button>
        </div>
      </div>
      <div className={`rounded-lg p-4 ${
        theme === "dark" ? "bg-gray-800" : "bg-gray-100"
      }`}>
        <div className={`flex gap-4 text-sm font-medium mb-2 ${
          theme === "dark" ? "text-gray-300" : "text-black"
        }`}>
          <span>{video.views.toLocaleString()} views</span>
          <span>{formatDistanceToNow(new Date(video.createdAt))} ago</span>
        </div>
        <div className={`text-sm ${showFullDescription ? "" : "line-clamp-3"} ${
          theme === "dark" ? "text-gray-400" : "text-gray-700"
        }`}>
          <p>
            Sample video description. This would contain the actual video
            description from the database.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className={`mt-2 p-0 h-auto font-medium ${
            theme === "dark" ? "text-white hover:text-gray-300" : ""
          }`}
          onClick={() => setShowFullDescription(!showFullDescription)}
        >
          {showFullDescription ? "Show less" : "Show more"}
        </Button>
      </div>

      {/* Premium Modal */}
      <PremiumModal
        open={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
        onSuccess={() => {
          setIsPremium(true);
          toast.success("Welcome to Premium!");
        }}
      />
    </div>
  );
};

export default VideoInfo;
