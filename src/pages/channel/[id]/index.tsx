import ChannelHeader from "@/components/ChannelHeader";
import Channeltabs from "@/components/Channeltabs";
import ChannelVideos from "@/components/ChannelVideos";
import VideoUploader from "@/components/VideoUploader";
import { useUser } from "@/lib/AuthContext";
import { useTheme } from "@/lib/ThemeContext";
import axiosInstance from "@/lib/axiosinstance";
import { notFound } from "next/navigation";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";

const index = () => {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useUser();
  const { theme } = useTheme();
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  // Fetch videos from the database
  useEffect(() => {
    const fetchVideos = async () => {
      try {
        setLoading(true);
        const res = await axiosInstance.get("/video/getall");
        // Filter videos by the current channel/user if needed
        const channelVideos = res.data?.filter((video: any) => video.uploader === id) || [];
        setVideos(channelVideos);
      } catch (error) {
        console.error("Error fetching videos:", error);
        setVideos([]);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchVideos();
    }
  }, [id]);

  try {
    let channel = user;
    return (
      <div className={`flex-1 min-h-screen ${theme === "light" ? "bg-white text-black" : "bg-gray-900 text-white"}`}>
        <div className="max-w-full mx-auto">
          <ChannelHeader channel={channel} user={user} />
          <Channeltabs />
          <div className="px-4 pb-8">
            <VideoUploader channelId={id} channelName={channel?.channelname} />
          </div>
          <div className="px-4 pb-8">
            {loading ? (
              <div className={`text-center py-8 ${theme === "light" ? "text-black" : "text-white"}`}>
                Loading videos...
              </div>
            ) : (
              <ChannelVideos videos={videos} />
            )}
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error("Error fetching channel data:", error);
   
  }
};

export default index;
