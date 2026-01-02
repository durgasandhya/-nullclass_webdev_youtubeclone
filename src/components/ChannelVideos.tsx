import VideoCard from "./videocard";
import { useTheme } from "@/lib/ThemeContext";

export default function ChannelVideos({ videos }: any) {
  const { theme } = useTheme();

  if (videos.length === 0) {
    return (
      <div className="text-center py-12">
        <p className={theme === "light" ? "text-gray-600" : "text-gray-300"}>No videos uploaded yet.</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className={`text-xl font-semibold mb-4 ${theme === "light" ? "text-black" : "text-white"}`}>Videos</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {videos.map((video: any) => (
          <VideoCard key={video._id} video={video} />
        ))}
      </div>
    </div>
  );
}
