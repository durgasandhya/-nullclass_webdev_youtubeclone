import React, { useEffect, useState } from "react";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { Download, Calendar, Crown } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";

const Downloads = () => {
  const { user } = useUser();
  const router = useRouter();
  const [downloads, setDownloads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push("/");
      return;
    }

    const fetchDownloads = async () => {
      try {
        const [downloadsRes, premiumRes] = await Promise.all([
          axiosInstance.get(`/download/user/${user._id}`),
          axiosInstance.get(`/download/premium-status/${user._id}`),
        ]);

        setDownloads(downloadsRes.data);
        setIsPremium(premiumRes.data.isPremium);
      } catch (error) {
        console.error("Error fetching downloads:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDownloads();
  }, [user, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white p-8">
        <div className="max-w-6xl mx-auto">
          <p>Loading downloads...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Your Downloads</h1>
            <p className="text-gray-600">
              {isPremium
                ? "Unlimited downloads with Premium"
                : "1 download per day for free users"}
            </p>
          </div>
          {isPremium && (
            <div className="flex items-center gap-2 bg-yellow-500 text-white px-4 py-2 rounded-full font-semibold">
              <Crown size={20} />
              Premium Member
            </div>
          )}
        </div>

        {/* Downloads List */}
        {downloads.length === 0 ? (
          <div className="text-center py-16">
            <Download size={64} className="mx-auto text-gray-300 mb-4" />
            <h2 className="text-2xl font-semibold mb-2">No downloads yet</h2>
            <p className="text-gray-600 mb-6">
              Start downloading videos to watch offline!
            </p>
            <Button onClick={() => router.push("/")}>Browse Videos</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {downloads.map((download: any) => (
              <div
                key={download._id}
                className="bg-white border rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => router.push(`/watch/${download.videoid._id}`)}
              >
                {/* Video Thumbnail */}
                <div className="relative aspect-video bg-gray-200">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Download size={48} className="text-gray-400" />
                  </div>
                </div>

                {/* Video Info */}
                <div className="p-4">
                  <h3 className="font-semibold text-lg mb-2 line-clamp-2">
                    {download.videoid.videotitle}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">
                    {download.videoid.videochanel}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar size={16} />
                    <span>
                      Downloaded {formatDistanceToNow(new Date(download.downloadedOn))} ago
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Download Stats */}
        {downloads.length > 0 && (
          <div className="mt-8 p-6 bg-gray-100 rounded-lg">
            <h3 className="font-semibold text-lg mb-4">Download Statistics</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-lg">
                <p className="text-sm text-gray-600">Total Downloads</p>
                <p className="text-2xl font-bold">{downloads.length}</p>
              </div>
              <div className="bg-white p-4 rounded-lg">
                <p className="text-sm text-gray-600">Status</p>
                <p className="text-2xl font-bold">
                  {isPremium ? "Premium" : "Free"}
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg">
                <p className="text-sm text-gray-600">Daily Limit</p>
                <p className="text-2xl font-bold">
                  {isPremium ? "Unlimited" : "1 per day"}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Downloads;
