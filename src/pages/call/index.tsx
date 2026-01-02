"use client";

import { useState } from "react";
import { useRouter } from "next/router";
import { useUser } from "@/lib/AuthContext";
import { useTheme } from "@/lib/ThemeContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Video, Plus, LogIn } from "lucide-react";
import { toast } from "sonner";

export default function CallLanding() {
  const router = useRouter();
  const { user } = useUser();
  const { theme } = useTheme();

  const [roomId, setRoomId] = useState("");

  // Generate random room ID
  const generateRoomId = () => {
    return Math.random().toString(36).substring(2, 10);
  };

  // Create new room
  const createRoom = () => {
    if (!user) {
      toast.error("Please sign in to create a video call");
      return;
    }

    const newRoomId = generateRoomId();
    router.push(`/call/${newRoomId}`);
  };

  // Join existing room
  const joinRoom = () => {
    if (!user) {
      toast.error("Please sign in to join a video call");
      return;
    }

    if (!roomId.trim()) {
      toast.error("Please enter a room ID");
      return;
    }

    router.push(`/call/${roomId.trim()}`);
  };

  return (
    <div
      className={`min-h-screen flex items-center justify-center ${
        theme === "dark" ? "bg-gray-900" : "bg-gray-50"
      }`}
    >
      <div
        className={`max-w-md w-full mx-4 p-8 rounded-2xl shadow-xl ${
          theme === "dark" ? "bg-gray-800 text-white" : "bg-white text-black"
        }`}
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-red-600 rounded-full mb-4">
            <Video size={40} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Video Calling</h1>
          <p className={theme === "dark" ? "text-gray-400" : "text-gray-600"}>
            Start a video call or join an existing one
          </p>
        </div>

        {!user ? (
          <div className="text-center p-6 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <p className="mb-4">Please sign in to use video calling</p>
            <Button onClick={() => router.push("/")} className="bg-red-600 hover:bg-red-700">
              Go to Home
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Create New Room */}
            <div>
              <Button
                onClick={createRoom}
                className="w-full bg-red-600 hover:bg-red-700 text-white py-6 text-lg font-semibold"
              >
                <Plus size={24} className="mr-2" />
                Create New Room
              </Button>
              <p
                className={`text-sm text-center mt-2 ${
                  theme === "dark" ? "text-gray-400" : "text-gray-600"
                }`}
              >
                Start a new video call session
              </p>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div
                  className={`w-full border-t ${
                    theme === "dark" ? "border-gray-700" : "border-gray-300"
                  }`}
                />
              </div>
              <div className="relative flex justify-center text-sm">
                <span
                  className={`px-4 ${
                    theme === "dark" ? "bg-gray-800 text-gray-400" : "bg-white text-gray-500"
                  }`}
                >
                  OR
                </span>
              </div>
            </div>

            {/* Join Existing Room */}
            <div>
              <label className="block text-sm font-medium mb-2">Join Existing Room</label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Enter Room ID"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      joinRoom();
                    }
                  }}
                  className={theme === "dark" ? "bg-gray-700 border-gray-600" : ""}
                />
                <Button
                  onClick={joinRoom}
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={!roomId.trim()}
                >
                  <LogIn size={20} />
                </Button>
              </div>
              <p
                className={`text-sm mt-2 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}
              >
                Enter the room ID shared with you
              </p>
            </div>
          </div>
        )}

        {/* Features */}
        <div className="mt-8 pt-8 border-t border-gray-700">
          <h3 className="font-semibold mb-3">Features:</h3>
          <ul className="space-y-2 text-sm text-gray-400">
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-red-600 rounded-full" />
              1-on-1 video calls
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-red-600 rounded-full" />
              Screen sharing
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-red-600 rounded-full" />
              Session recording
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-red-600 rounded-full" />
              Audio/Video controls
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
