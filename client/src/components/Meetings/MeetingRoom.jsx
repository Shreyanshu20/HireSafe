import React, { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "react-toastify";
import VideoControls from "./VideoControls";
import VideoGrid from "./VideoGrid";
import ChatModal from "./ChatModal";
import { handleEndCall } from "./utils/mediaUtils";
import { useAuth } from "../../context/AuthContext"; // ✅ ADD THIS

export default function MeetingRoom({
  meetingCode,
  localVideoRef,
  videos,
  video, setVideo,
  audio, setAudio,
  screen, setScreen,
  screenStream, setScreenStream,
  cameraStream, setCameraStream,
  videoAvailable, audioAvailable,
  socketRef, socketIdRef,
  onLeaveMeeting,
}) {
  const { userData } = useAuth(); // ✅ CHANGE: user -> userData
  const [showModal, setShowModal] = useState(false);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [newMessage, setNewMessage] = useState(0);

  const participants = useMemo(() => 1 + (videos?.length || 0), [videos]);

  // ✅ CHANGE: user?.username -> userData?.username
  const userName = userData?.username || userData?.email?.split('@')[0] || 'Anonymous';

  const sendMessage = useCallback(() => {
    if (!message.trim()) return;
    console.log("🚀 SENDING MESSAGE:", { message, userName, socketId: socketIdRef.current });
    // ✅ SEND ACTUAL USER NAME (not "You")
    socketRef.current?.emit("chat-message", message, userName);
    setMessage("");
  }, [message, socketRef, userName, socketIdRef]);

  useEffect(() => {
    if (!socketRef.current) return;
    
    // ✅ RECEIVE MESSAGE: Show "You" only for your own messages
    const addMessage = (data, sender, socketIdSender) => {
      console.log("📥 RECEIVED MESSAGE:", { data, sender, socketIdSender, mySocketId: socketIdRef.current });
      setMessages((prev) => [
        ...prev, 
        { 
          sender: socketIdSender === socketIdRef.current ? "You" : sender,
          data 
        }
      ]);
      if (socketIdSender !== socketIdRef.current) setNewMessage((n) => n + 1);
    };
    
    socketRef.current.on("chat-message", addMessage);
    return () => socketRef.current?.off("chat-message", addMessage);
  }, [socketRef, socketIdRef]);

  const openChat = useCallback(() => { 
    setShowModal(true); 
    setNewMessage(0); 
  }, []);

  const closeChat = useCallback(() => setShowModal(false), []);

  const handleMessage = useCallback((e) => {
    setMessage(e.target.value);
  }, []);

  const onEndCall = useCallback(() => {
    handleEndCall({ cameraStream, screenStream, socketRef });
    onLeaveMeeting();
    toast.info("You left the meeting");
  }, [cameraStream, screenStream, socketRef, onLeaveMeeting]);

  const copyCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(meetingCode);
      toast.success("Meeting code copied");
    } catch {
      toast.info("Could not copy. Long-press to copy.");
    }
  }, [meetingCode]);

  const videoGridProps = useMemo(() => ({
    localVideoRef,
    videos,
    screen,
    screenStream,
    video,
    audio,
    userName // ✅ ADD THIS
  }), [localVideoRef, videos, screen, screenStream, video, audio, userName]);

  const videoControlsProps = useMemo(() => ({
    video, setVideo,
    audio, setAudio,
    screen, setScreen,
    newMessage, 
    onOpenChat: openChat,
    onEndCall,
    videoAvailable, 
    audioAvailable,
    screenStream, 
    setScreenStream,
    cameraStream, 
    setCameraStream,
    socketRef, 
    socketIdRef,
    localVideoRef
  }), [
    video, setVideo, audio, setAudio, screen, setScreen,
    newMessage, openChat, onEndCall, videoAvailable, audioAvailable,
    screenStream, setScreenStream, cameraStream, setCameraStream,
    socketRef, socketIdRef, localVideoRef
  ]);

  return (
    <div className="h-screen flex flex-col">
      {/* Top bar - fixed height */}
      <div className="flex-shrink-0 bg-slate-900/70 backdrop-blur border border-white/10 rounded-xl mx-4 mt-4 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-800 text-slate-200">
            <i className="fa-solid fa-hashtag text-sky-400"></i>
            <span className="font-mono tracking-wider">{meetingCode}</span>
          </span>
          <button
            onClick={copyCode}
            className="px-3 py-1 rounded-lg border border-white/15 text-slate-200 hover:bg-slate-800 transition"
            title="Copy code"
          >
            <i className="fa-solid fa-copy"></i>
          </button>
        </div>

        <div className="text-slate-300 text-sm">
          <i className="fa-solid fa-user-group mr-2"></i>
          {participants} {participants === 1 ? "participant" : "participants"}
        </div>
      </div>

      {/* Video area - takes remaining space */}
      <div className="flex-1 min-h-0 px-4 pb-20">
        {/* ✅ Use memoized props to prevent re-renders */}
        <VideoGrid {...videoGridProps} />
      </div>

      {/* Floating controls - positioned absolutely */}
      <VideoControls {...videoControlsProps} />

      {/* ✅ ISOLATE CHAT MODAL - only render when needed */}
      {showModal && (
        <ChatModal
          messages={messages}
          message={message}
          onMessageChange={handleMessage}
          onSendMessage={sendMessage}
          onClose={closeChat}
        />
      )}
    </div>
  );
}
