"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { io, Socket } from "socket.io-client";
import Peer from "simple-peer";
import { useUser } from "@/lib/AuthContext";
import { useTheme } from "@/lib/ThemeContext";
import { Button } from "@/components/ui/button";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  MonitorUp,
  MonitorOff,
  Copy,
  Download,
  Circle,
  Square,
} from "lucide-react";
import { toast } from "sonner";

// Dynamic import for RecordRTC (browser-only)
let RecordRTC: any;

export default function VideoCall() {
  const router = useRouter();
  const { roomId } = router.query;
  const { user } = useUser();
  const { theme } = useTheme();

  // Refs
  const socketRef = useRef<Socket | undefined>(undefined);
  const myVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerRef = useRef<Peer.Instance | undefined>(undefined);
  const localStreamRef = useRef<MediaStream | undefined>(undefined);
  const recorderRef = useRef<any>(undefined);
  const hasInitializedRef = useRef(false); // Use ref instead of state to persist across React Strict Mode remounts

  // States
  const [myStream, setMyStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);

  // Load RecordRTC on client side only
  useEffect(() => {
    if (typeof window !== "undefined") {
      import("recordrtc").then((module) => {
        RecordRTC = module.default;
      });
    }
  }, []);

  // Update remote video element when remote stream changes
  useEffect(() => {
    console.log("📺 Remote stream changed:", remoteStream?.id, "Video ref exists:", !!remoteVideoRef.current);

    if (remoteStream && remoteVideoRef.current) {
      console.log("🎬 Setting remote stream to video element");
      remoteVideoRef.current.srcObject = remoteStream;

      // Force play the video
      remoteVideoRef.current.play().catch((err) => {
        console.error("❌ Error playing remote video:", err);
      });
    }
  }, [remoteStream]);

  // Initialize media and socket
  useEffect(() => {
    console.log("🔍 useEffect triggered - roomId:", roomId, "user:", user?._id, "hasInitialized:", hasInitializedRef.current);

    if (!roomId || !user) {
      console.log("⏸️ Skipping initialization - missing roomId or user");
      return;
    }

    if (hasInitializedRef.current) {
      console.log("⏸️ Already initialized, skipping");
      return;
    }

    console.log("✅ Starting initialization...");
    hasInitializedRef.current = true;

    const initializeCall = async () => {
      try {
        // Get user media
        console.log("📹 Requesting user media (video + audio)...");
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        console.log("✅ Got user media stream:", {
          id: stream.id,
          active: stream.active,
          videoTracks: stream.getVideoTracks().length,
          audioTracks: stream.getAudioTracks().length,
        });

        setMyStream(stream);
        localStreamRef.current = stream;

        if (myVideoRef.current) {
          myVideoRef.current.srcObject = stream;
          console.log("✅ Local stream set to video element");
        } else {
          console.error("❌ Local video ref is null!");
        }

        // Connect to Socket.io
        const socket = io(process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000");
        socketRef.current = socket;

        socket.on("connect", () => {
          console.log("Connected to signaling server");
          socket.emit("join-room", roomId, user._id);
        });

        // Handle existing users (someone is already in the room)
        socket.on("existing-users", (users: string[]) => {
          console.log("✅ Existing users received:", users);
          console.log("Number of existing users:", users.length);
          if (users.length > 0) {
            console.log("🚀 Creating peer as INITIATOR to connect with:", users[0]);
            // Create peer as initiator
            createPeer(users[0], socket, stream);
          } else {
            console.log("⏳ No existing users, waiting for someone to join...");
          }
          setIsConnecting(false);
        });

        // Handle new user joining (we're already in the room)
        socket.on("user-joined", ({ socketId }: { socketId: string }) => {
          console.log("👋 New user joined:", socketId);
          console.log("We are the first user, waiting for them to initiate connection");
          setIsConnecting(false);
        });

        // Handle WebRTC signaling
        socket.on("offer", ({ sdp, caller }: { sdp: any; caller: string }) => {
          console.log("Received offer from:", caller);
          handleReceiveOffer(sdp, caller, socket, stream);
        });

        socket.on("answer", ({ sdp }: { sdp: any }) => {
          console.log("Received answer");
          if (peerRef.current && !peerRef.current.destroyed) {
            try {
              peerRef.current.signal(sdp);
            } catch (error) {
              console.error("Error signaling answer:", error);
            }
          }
        });

        socket.on("ice-candidate", ({ candidate }: { candidate: any }) => {
          if (peerRef.current && !peerRef.current.destroyed) {
            try {
              peerRef.current.signal(candidate);
            } catch (error) {
              console.error("Error signaling ICE candidate:", error);
            }
          }
        });

        // Handle user leaving
        socket.on("user-left", () => {
          console.log("User left the call");
          setRemoteStream(null);
          setIsConnected(false);
          toast.info("Other user left the call");
        });

        socket.on("user-started-screen-share", () => {
          toast.info("Other user started screen sharing");
        });

        socket.on("user-stopped-screen-share", () => {
          toast.info("Other user stopped screen sharing");
        });
      } catch (error) {
        console.error("Error initializing call:", error);
        toast.error("Failed to access camera/microphone");
        setIsConnecting(false);
      }
    };

    initializeCall();

    return () => {
      // Cleanup
      console.log("🧹 Cleaning up video call...");
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
        localStreamRef.current = undefined;
      }
      if (peerRef.current) {
        peerRef.current.destroy();
        peerRef.current = undefined;
      }
      if (socketRef.current) {
        socketRef.current.emit("leave-room", roomId);
        socketRef.current.disconnect();
        socketRef.current = undefined;
      }
      if (recorderRef.current) {
        recorderRef.current.stopRecording();
        recorderRef.current = undefined;
      }
      // Don't reset hasInitialized - it should stay true to prevent duplicate connections from React Strict Mode
    };
  }, [roomId, user]);

  // Create peer as initiator
  const createPeer = (targetSocketId: string, socket: Socket, stream: MediaStream) => {
    console.log("📞 Creating peer connection (INITIATOR)");
    console.log("Target socket ID:", targetSocketId);

    const peer = new Peer({
      initiator: true,
      trickle: true,
      stream: stream,
    });

    peer.on("signal", (signal) => {
      // Check if this is an offer or an ICE candidate
      if (signal.type === "offer") {
        console.log("📤 Sending OFFER (SDP) to", targetSocketId);
        socket.emit("offer", {
          target: targetSocketId,
          sdp: signal,
        });
      } else if ('candidate' in signal) {
        console.log("📤 Sending ICE candidate to", targetSocketId);
        socket.emit("ice-candidate", {
          target: targetSocketId,
          candidate: signal,
        });
      }
    });

    peer.on("stream", (remoteStream) => {
      console.log("🎥 Received remote stream from peer!");
      console.log("📊 Stream details:", {
        id: remoteStream.id,
        active: remoteStream.active,
        videoTracks: remoteStream.getVideoTracks().length,
        audioTracks: remoteStream.getAudioTracks().length,
      });

      setRemoteStream(remoteStream);
      setIsConnected(true);

      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
        console.log("✅ Remote stream set to video element");

        // Force play
        remoteVideoRef.current.play().catch((err) => {
          console.error("Error playing remote video:", err);
        });
      } else {
        console.error("❌ Remote video ref is null!");
      }

      toast.success("Connected to remote user!");
    });

    peer.on("error", (err) => {
      console.error("❌ Peer error:", err);
      toast.error("Connection error");
    });

    peer.on("connect", () => {
      console.log("✅ Peer connection established!");
    });

    peerRef.current = peer;
    console.log("Peer stored in peerRef");
  };

  // Handle receiving offer (non-initiator)
  const handleReceiveOffer = (
    offer: any,
    callerSocketId: string,
    socket: Socket,
    stream: MediaStream
  ) => {
    console.log("📥 Received OFFER, creating peer as NON-INITIATOR");
    console.log("Caller socket ID:", callerSocketId);

    // If peer already exists, destroy it first
    if (peerRef.current) {
      console.log("⚠️ Destroying existing peer before creating new one");
      peerRef.current.destroy();
    }

    const peer = new Peer({
      initiator: false,
      trickle: true,
      stream: stream,
    });

    peer.on("signal", (signal) => {
      // Check if this is an answer or an ICE candidate
      if (signal.type === "answer") {
        console.log("📤 Sending ANSWER (SDP) to", callerSocketId);
        socket.emit("answer", {
          target: callerSocketId,
          sdp: signal,
        });
      } else if ('candidate' in signal) {
        console.log("📤 Sending ICE candidate to", callerSocketId);
        socket.emit("ice-candidate", {
          target: callerSocketId,
          candidate: signal,
        });
      }
    });

    peer.on("stream", (remoteStream) => {
      console.log("🎥 Received remote stream from peer!");
      console.log("📊 Stream details:", {
        id: remoteStream.id,
        active: remoteStream.active,
        videoTracks: remoteStream.getVideoTracks().length,
        audioTracks: remoteStream.getAudioTracks().length,
      });

      setRemoteStream(remoteStream);
      setIsConnected(true);

      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
        console.log("✅ Remote stream set to video element");

        // Force play
        remoteVideoRef.current.play().catch((err) => {
          console.error("Error playing remote video:", err);
        });
      } else {
        console.error("❌ Remote video ref is null!");
      }

      toast.success("Connected to remote user!");
    });

    peer.on("error", (err) => {
      console.error("❌ Peer error:", err);
      toast.error("Connection error");
    });

    peer.on("connect", () => {
      console.log("✅ Peer connection established!");
    });

    try {
      console.log("Signaling offer to peer...");
      peer.signal(offer);
    } catch (error) {
      console.error("❌ Error signaling offer:", error);
    }

    peerRef.current = peer;
    console.log("Peer stored in peerRef");
  };

  // Toggle audio
  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioMuted(!audioTrack.enabled);
        toast.info(audioTrack.enabled ? "Microphone on" : "Microphone muted");
      }
    }
  };

  // Toggle video
  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
        toast.info(videoTrack.enabled ? "Camera on" : "Camera off");
      }
    }
  };

  // Toggle screen sharing
  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      // Stop screen sharing
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        const videoTrack = stream.getVideoTracks()[0];

        if (peerRef.current) {
          console.log("🔄 Replacing screen track back to camera");
          const sender = (peerRef.current as any)._pc
            .getSenders()
            .find((s: any) => s.track && s.track.kind === "video");

          if (sender) {
            await sender.replaceTrack(videoTrack);
            console.log("✅ Camera track restored successfully");
          } else {
            console.error("❌ No video sender found");
          }
        } else {
          console.error("❌ No peer connection found");
        }

        if (myVideoRef.current) {
          myVideoRef.current.srcObject = stream;
        }

        localStreamRef.current = stream;
        setMyStream(stream);
        setIsScreenSharing(false);

        if (socketRef.current && roomId) {
          socketRef.current.emit("stop-screen-share", roomId);
        }

        toast.success("Stopped screen sharing");
      } catch (error) {
        console.error("Error stopping screen share:", error);
        toast.error("Failed to stop screen sharing");
      }
    } else {
      // Start screen sharing
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        });

        const screenTrack = screenStream.getVideoTracks()[0];

        // Replace video track with screen track
        if (peerRef.current) {
          console.log("🔄 Replacing video track with screen track");
          const sender = (peerRef.current as any)._pc
            .getSenders()
            .find((s: any) => s.track && s.track.kind === "video");

          if (sender) {
            await sender.replaceTrack(screenTrack);
            console.log("✅ Screen track replaced successfully");
          } else {
            console.error("❌ No video sender found");
          }
        } else {
          console.error("❌ No peer connection found");
        }

        if (myVideoRef.current) {
          myVideoRef.current.srcObject = screenStream;
        }

        // Handle screen share stop from system
        screenTrack.onended = () => {
          toggleScreenShare();
        };

        setIsScreenSharing(true);

        if (socketRef.current && roomId) {
          socketRef.current.emit("start-screen-share", roomId);
        }

        toast.success("Screen sharing started");
      } catch (error) {
        console.error("Error starting screen share:", error);
        toast.error("Failed to start screen sharing");
      }
    }
  };

  // Start recording
  const startRecording = () => {
    if (!myStream) {
      toast.error("No stream to record");
      return;
    }

    if (!RecordRTC) {
      toast.error("Recording library is still loading...");
      return;
    }

    try {
      const recorder = new RecordRTC(myStream, {
        type: "video",
        mimeType: "video/webm",
      });

      recorder.startRecording();
      recorderRef.current = recorder;
      setIsRecording(true);
      toast.success("Recording started");
    } catch (error) {
      console.error("Error starting recording:", error);
      toast.error("Failed to start recording");
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (!recorderRef.current) return;

    recorderRef.current.stopRecording(() => {
      const blob = recorderRef.current!.getBlob();
      const url = URL.createObjectURL(blob);

      // Create download link
      const a = document.createElement("a");
      a.href = url;
      a.download = `call-recording-${Date.now()}.webm`;
      a.click();

      URL.revokeObjectURL(url);
      setIsRecording(false);
      toast.success("Recording saved");
    });
  };

  // End call
  const endCall = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (peerRef.current) {
      peerRef.current.destroy();
    }
    if (socketRef.current && roomId) {
      socketRef.current.emit("leave-room", roomId);
    }
    router.push("/");
  };

  // Copy room link
  const copyRoomLink = () => {
    const link = `${window.location.origin}/call/${roomId}`;
    navigator.clipboard.writeText(link);
    toast.success("Room link copied to clipboard!");
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className={theme === "dark" ? "text-white" : "text-black"}>
          Please sign in to join video calls
        </p>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen ${
        theme === "dark" ? "bg-gray-900 text-white" : "bg-white text-black"
      }`}
    >
      <div className="max-w-7xl mx-auto p-4">
        <div className="mb-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Video Call - Room: {roomId}</h1>
          <Button
            onClick={copyRoomLink}
            className={`${
              theme === "dark"
                ? "bg-gray-700 text-white border-gray-600 hover:bg-gray-600"
                : "bg-white text-black border-gray-300 hover:bg-gray-100"
            }`}
            size="sm"
          >
            <Copy size={16} className="mr-2" />
            Copy Room Link
          </Button>
        </div>

        {isConnecting && (
          <div className="mb-4 p-4 bg-blue-100 dark:bg-blue-900 rounded-lg">
            <p className="text-center">Waiting for other participant to join...</p>
          </div>
        )}

        {/* Video Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {/* Local Video */}
          <div className="relative bg-gray-800 rounded-lg overflow-hidden aspect-video">
            <video
              ref={myVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-4 left-4 bg-black/70 px-3 py-1 rounded-full text-white text-sm">
              You {isScreenSharing && "(Screen)"}
            </div>
          </div>

          {/* Remote Video */}
          <div className="relative bg-gray-800 rounded-lg overflow-hidden aspect-video">
            {remoteStream ? (
              <>
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                  onLoadedMetadata={() => {
                    console.log("🎬 Remote video metadata loaded");
                    if (remoteVideoRef.current) {
                      remoteVideoRef.current.play().catch(e => console.error("Play error:", e));
                    }
                  }}
                  onError={(e) => {
                    console.error("❌ Remote video error:", e);
                  }}
                  onPlay={() => {
                    console.log("▶️ Remote video started playing");
                  }}
                />
                <div className="absolute bottom-4 left-4 bg-black/70 px-3 py-1 rounded-full text-white text-sm">
                  Remote User {remoteStream && `(${remoteStream.getVideoTracks().length}V/${remoteStream.getAudioTracks().length}A)`}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-400">Waiting for remote user...</p>
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex justify-center items-center gap-4 flex-wrap">
          {/* Audio Toggle */}
          <Button
            onClick={toggleAudio}
            className={`rounded-full w-14 h-14 ${
              isAudioMuted
                ? "bg-red-600 hover:bg-red-700 text-white"
                : "bg-gray-700 hover:bg-gray-600 text-white"
            }`}
            size="lg"
          >
            {isAudioMuted ? <MicOff size={24} /> : <Mic size={24} />}
          </Button>

          {/* Video Toggle */}
          <Button
            onClick={toggleVideo}
            className={`rounded-full w-14 h-14 ${
              isVideoOff
                ? "bg-red-600 hover:bg-red-700 text-white"
                : "bg-gray-700 hover:bg-gray-600 text-white"
            }`}
            size="lg"
          >
            {isVideoOff ? <VideoOff size={24} /> : <Video size={24} />}
          </Button>

          {/* Screen Share Toggle */}
          <Button
            onClick={toggleScreenShare}
            className={`rounded-full w-14 h-14 ${
              isScreenSharing
                ? "bg-blue-600 hover:bg-blue-700 text-white"
                : "bg-gray-700 hover:bg-gray-600 text-white"
            }`}
            size="lg"
          >
            {isScreenSharing ? <MonitorOff size={24} /> : <MonitorUp size={24} />}
          </Button>

          {/* Recording Toggle */}
          <Button
            onClick={isRecording ? stopRecording : startRecording}
            className={`rounded-full w-14 h-14 ${
              isRecording
                ? "bg-red-600 hover:bg-red-700 text-white"
                : "bg-gray-700 hover:bg-gray-600 text-white"
            }`}
            size="lg"
          >
            {isRecording ? <Square size={24} /> : <Circle size={24} />}
          </Button>

          {/* End Call */}
          <Button
            onClick={endCall}
            className="rounded-full w-14 h-14 bg-red-600 hover:bg-red-700 text-white"
            size="lg"
          >
            <PhoneOff size={24} />
          </Button>
        </div>

        {/* Recording Status */}
        {isRecording && (
          <div className="mt-4 p-4 bg-red-100 dark:bg-red-900 rounded-lg text-center">
            <p className="flex items-center justify-center gap-2">
              <Circle size={16} className="animate-pulse fill-red-600" />
              Recording in progress...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
