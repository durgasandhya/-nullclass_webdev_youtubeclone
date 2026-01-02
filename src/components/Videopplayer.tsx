"use client";

import { useRef, useEffect, useState, type ReactElement } from "react";
import { useUser } from "@/lib/AuthContext";
import { useRouter } from "next/router";
import axiosInstance from "@/lib/axiosinstance";
import PlansModal from "./PlansModal";
import { toast } from "sonner";
import { Button } from "./ui/button";
import {
  Crown,
  FastForward,
  Rewind,
  Play,
  Pause,
  SkipForward,
  X,
  MessageCircle,
  Volume2,
  VolumeX,
  Maximize,
  Minimize
} from "lucide-react";

interface VideoPlayerProps {
  video: {
    _id: string;
    videotitle: string;
    filepath: string;
  };
  allVideos?: any[]; // For next video functionality
}

interface GestureFeedback {
  show: boolean;
  zone: "left" | "center" | "right";
  type: "single" | "double" | "triple";
  icon: ReactElement;
  text: string;
}

export default function VideoPlayer({ video, allVideos = [] }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { user } = useUser();

  // Existing states
  const [watchedTime, setWatchedTime] = useState(0);
  const [watchLimit, setWatchLimit] = useState(300);
  const [planType, setPlanType] = useState("free");
  const [isBlocked, setIsBlocked] = useState(false);
  const [showPlansModal, setShowPlansModal] = useState(false);

  // Gesture detection states
  const [tapCount, setTapCount] = useState(0);
  const [tapZone, setTapZone] = useState<"left" | "center" | "right" | null>(null);
  const [gestureFeedback, setGestureFeedback] = useState<GestureFeedback>({
    show: false,
    zone: "center",
    type: "single",
    icon: <Play />,
    text: "",
  });
  const tapTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Custom controls states
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const fetchPlanInfo = async () => {
      if (user) {
        try {
          const res = await axiosInstance.get(`/download/premium-status/${user._id}`);
          if (res.data.isPremium) {
            const planData = res.data;
            setPlanType(planData.planType || "gold");
            const limits: {[key: string]: number} = {
              free: 300,
              bronze: 420,
              silver: 600,
              gold: -1,
            };
            setWatchLimit(limits[planData.planType] || 300);
          } else {
            setPlanType("free");
            setWatchLimit(300);
          }
        } catch (error) {
          console.log(error);
          setPlanType("free");
          setWatchLimit(300);
        }
      } else {
        setPlanType("free");
        setWatchLimit(300);
      }
    };

    fetchPlanInfo();
  }, [user]);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const handleTimeUpdate = () => {
      const currentTime = Math.floor(videoElement.currentTime);
      setWatchedTime(currentTime);
      setCurrentTime(videoElement.currentTime);

      if (watchLimit !== -1 && currentTime >= watchLimit) {
        videoElement.pause();
        setIsBlocked(true);
        toast.error(`Watch time limit reached! Upgrade to watch more.`);
      }
    };

    const handlePlay = () => {
      setIsPlaying(true);
      if (isBlocked) {
        videoElement.pause();
        setShowPlansModal(true);
      }
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handleLoadedMetadata = () => {
      setDuration(videoElement.duration);
    };

    const handleVolumeChange = () => {
      setVolume(videoElement.volume);
      setIsMuted(videoElement.muted);
    };

    videoElement.addEventListener("timeupdate", handleTimeUpdate);
    videoElement.addEventListener("play", handlePlay);
    videoElement.addEventListener("pause", handlePause);
    videoElement.addEventListener("loadedmetadata", handleLoadedMetadata);
    videoElement.addEventListener("volumechange", handleVolumeChange);

    return () => {
      videoElement.removeEventListener("timeupdate", handleTimeUpdate);
      videoElement.removeEventListener("play", handlePlay);
      videoElement.removeEventListener("pause", handlePause);
      videoElement.removeEventListener("loadedmetadata", handleLoadedMetadata);
      videoElement.removeEventListener("volumechange", handleVolumeChange);
    };
  }, [watchLimit, isBlocked]);

  // Gesture detection handler
  const handleVideoTap = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isBlocked) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Calculate tap position
    const x = e.clientX - rect.left;
    const width = rect.width;

    // Determine zone: left 33%, center 33%, right 33%
    let zone: "left" | "center" | "right";
    if (x < width / 3) {
      zone = "left";
    } else if (x < (width * 2) / 3) {
      zone = "center";
    } else {
      zone = "right";
    }

    // Increment tap count
    const newTapCount = tapCount + 1;
    setTapCount(newTapCount);
    setTapZone(zone);

    // Clear existing timeout
    if (tapTimeoutRef.current) {
      clearTimeout(tapTimeoutRef.current);
    }

    // Set timeout to execute gesture after 300ms
    tapTimeoutRef.current = setTimeout(() => {
      executeGesture(newTapCount, zone);
      setTapCount(0);
      setTapZone(null);
    }, 300);
  };

  // Execute gesture based on tap count and zone
  const executeGesture = (count: number, zone: "left" | "center" | "right") => {
    const video = videoRef.current;
    if (!video) return;

    console.log(`Gesture: ${count} tap(s) on ${zone} zone`);

    if (count === 1) {
      // Single tap center: Pause/Play
      if (zone === "center") {
        if (video.paused) {
          video.play();
          showFeedback(zone, "single", <Play size={48} />, "Play");
        } else {
          video.pause();
          showFeedback(zone, "single", <Pause size={48} />, "Pause");
        }
      }
    } else if (count === 2) {
      // Double tap left: Rewind -10s
      if (zone === "left") {
        video.currentTime = Math.max(0, video.currentTime - 10);
        showFeedback(zone, "double", <Rewind size={48} />, "-10s");
        toast.info("Rewound 10 seconds");
      }
      // Double tap right: Forward +10s
      else if (zone === "right") {
        video.currentTime = Math.min(video.duration, video.currentTime + 10);
        showFeedback(zone, "double", <FastForward size={48} />, "+10s");
        toast.info("Skipped forward 10 seconds");
      }
    } else if (count === 3) {
      // Triple tap center: Next video
      if (zone === "center") {
        showFeedback(zone, "triple", <SkipForward size={48} />, "Next Video");
        handleNextVideo();
      }
      // Triple tap right: Close video
      else if (zone === "right") {
        showFeedback(zone, "triple", <X size={48} />, "Close");
        setTimeout(() => {
          router.push("/");
        }, 500);
      }
      // Triple tap left: Show comments
      else if (zone === "left") {
        showFeedback(zone, "triple", <MessageCircle size={48} />, "Comments");
        setTimeout(() => {
          scrollToComments();
        }, 500);
      }
    }
  };

  // Show visual feedback
  const showFeedback = (
    zone: "left" | "center" | "right",
    type: "single" | "double" | "triple",
    icon: ReactElement,
    text: string
  ) => {
    setGestureFeedback({ show: true, zone, type, icon, text });
    setTimeout(() => {
      setGestureFeedback((prev) => ({ ...prev, show: false }));
    }, 1000);
  };

  // Handle next video
  const handleNextVideo = () => {
    if (allVideos && allVideos.length > 0) {
      const currentIndex = allVideos.findIndex((v) => v._id === video._id);
      const nextIndex = (currentIndex + 1) % allVideos.length;
      const nextVideo = allVideos[nextIndex];

      if (nextVideo) {
        toast.success("Playing next video");
        router.push(`/watch/${nextVideo._id}`);
      } else {
        toast.info("No more videos");
      }
    } else {
      toast.info("No more videos available");
    }
  };

  // Scroll to comments section
  const scrollToComments = () => {
    const commentsSection = document.getElementById("comments-section");
    if (commentsSection) {
      commentsSection.scrollIntoView({ behavior: "smooth", block: "start" });
      toast.info("Scrolled to comments");
    } else {
      toast.info("Comments section not found");
    }
  };

  // Custom control handlers
  const togglePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const newTime = parseFloat(e.target.value);
    video.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const newVolume = parseFloat(e.target.value);
    video.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;

    video.muted = !video.muted;
    setIsMuted(!video.muted);
  };

  const toggleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleMouseMove = () => {
    setShowControls(true);

    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }

    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getRemainingTime = () => {
    if (watchLimit === -1) return "Unlimited";
    const remaining = watchLimit - watchedTime;
    return remaining > 0 ? formatTime(remaining) : "0:00";
  };

  const getPlanColor = () => {
    const colors: {[key: string]: string} = {
      free: "bg-gray-500",
      bronze: "bg-orange-500",
      silver: "bg-gray-400",
      gold: "bg-yellow-500",
    };
    return colors[planType] || "bg-gray-500";
  };

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="aspect-video bg-black rounded-lg overflow-hidden relative"
        onMouseMove={handleMouseMove}
      >
        <video
          ref={videoRef}
          className="w-full h-full"
          poster={`/placeholder.svg?height=480&width=854`}
        >
          <source
            src={`${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"}${video?.filepath}`}
            type="video/mp4"
          />
          Your browser does not support the video tag.
        </video>

        {/* Transparent Gesture Overlay */}
        <div
          className="absolute inset-0 cursor-pointer z-10"
          onClick={handleVideoTap}
          onDoubleClick={(e) => e.preventDefault()}
        />

        {/* Custom Video Controls */}
        {!isBlocked && (
          <div
            className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4 transition-opacity duration-300 z-20 ${
              showControls ? "opacity-100" : "opacity-0"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Progress Bar */}
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={handleProgressChange}
              className="w-full h-1 mb-2 cursor-pointer accent-red-600"
              style={{
                background: `linear-gradient(to right, #dc2626 0%, #dc2626 ${(currentTime / duration) * 100}%, #666 ${(currentTime / duration) * 100}%, #666 100%)`
              }}
            />

            {/* Control Buttons */}
            <div className="flex items-center gap-4 text-white">
              {/* Play/Pause */}
              <button
                onClick={togglePlayPause}
                className="hover:text-red-600 transition-colors"
              >
                {isPlaying ? <Pause size={24} /> : <Play size={24} />}
              </button>

              {/* Time Display */}
              <span className="text-sm">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>

              <div className="flex-1" />

              {/* Volume Control */}
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleMute}
                  className="hover:text-red-600 transition-colors"
                >
                  {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-20 h-1 cursor-pointer accent-red-600"
                />
              </div>

              {/* Fullscreen */}
              <button
                onClick={toggleFullscreen}
                className="hover:text-red-600 transition-colors"
              >
                {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
              </button>
            </div>
          </div>
        )}

        {/* Gesture Feedback Overlay */}
        {gestureFeedback.show && (
          <div
            className={`absolute inset-0 flex items-center justify-center pointer-events-none z-30`}
          >
            <div
              className={`
                animate-ping-once bg-white/20 rounded-full p-8
                ${gestureFeedback.zone === "left" ? "mr-auto ml-20" : ""}
                ${gestureFeedback.zone === "right" ? "ml-auto mr-20" : ""}
              `}
            >
              <div className="bg-black/80 rounded-full p-6 text-white">
                {gestureFeedback.icon}
                <p className="text-center mt-2 font-bold">{gestureFeedback.text}</p>
              </div>
            </div>
          </div>
        )}

        {/* Watch Time Overlay */}
        {!isBlocked && watchLimit !== -1 && (
          <div className="absolute top-4 right-4 bg-black/70 text-white px-3 py-2 rounded-lg text-sm pointer-events-none">
            <div className="flex items-center gap-2">
              <span>Time remaining:</span>
              <span className="font-bold">{getRemainingTime()}</span>
            </div>
          </div>
        )}

        {/* Plan Badge */}
        <div className={`absolute top-4 left-4 ${getPlanColor()} text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 pointer-events-none`}>
          {planType !== "free" && <Crown size={14} />}
          {planType.toUpperCase()}
        </div>

        {/* Gesture Zones Indicators (for debugging - can be removed) */}
        <div className="absolute bottom-4 left-4 text-white text-xs bg-black/50 px-2 py-1 rounded pointer-events-none">
          Gestures: Tap to control
        </div>

        {/* Blocked Overlay */}
        {isBlocked && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-40">
            <div className="text-center text-white p-6">
              <Crown className="w-16 h-16 mx-auto mb-4 text-yellow-500" />
              <h2 className="text-2xl font-bold mb-2">Watch Time Limit Reached!</h2>
              <p className="mb-6">
                {planType === "free"
                  ? "You've watched for 5 minutes. Upgrade to watch more!"
                  : `Your ${planType} plan limit has been reached. Upgrade for more time!`}
              </p>
              <Button
                onClick={() => setShowPlansModal(true)}
                className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold px-8 py-3"
              >
                Upgrade Plan
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Plans Modal */}
      <PlansModal
        open={showPlansModal}
        onClose={() => setShowPlansModal(false)}
        onSuccess={(newPlanType) => {
          setPlanType(newPlanType);
          const limits: {[key: string]: number} = {
            bronze: 420,
            silver: 600,
            gold: -1,
          };
          setWatchLimit(limits[newPlanType]);
          setIsBlocked(false);
          setWatchedTime(0);
          if (videoRef.current) {
            videoRef.current.currentTime = 0;
            videoRef.current.play();
          }
        }}
      />
    </div>
  );
}
