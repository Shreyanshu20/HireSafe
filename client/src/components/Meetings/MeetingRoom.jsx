import React, { useState, useEffect, useMemo } from "react";
import { toast } from "react-toastify";
import VideoControls from "./VideoControls";
import VideoGrid from "./VideoGrid";
import ChatModal from "./ChatModal";
import { handleEndCall } from "./utils/mediaUtils";

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
  const [showModal, setShowModal] = useState(false);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [newMessage, setNewMessage] = useState(0);

  const participants = useMemo(() => 1 + (videos?.length || 0), [videos]); // you + others

  useEffect(() => {
    if (!socketRef.current) return;
    const addMessage = (data, sender, socketIdSender) => {
      setMessages((prev) => [...prev, { sender, data }]);
      if (socketIdSender !== socketIdRef.current) setNewMessage((n) => n + 1);
    };
    socketRef.current.on("chat-message", addMessage);
    return () => socketRef.current?.off("chat-message", addMessage);
  }, [socketRef, socketIdRef]);

  const sendMessage = () => {
    if (!message.trim()) return;
    socketRef.current?.emit("chat-message", message, "You");
    setMessage("");
  };

  const openChat = () => { setShowModal(true); setNewMessage(0); };
  const closeChat = () => setShowModal(false);
  const handleMessage = (e) => setMessage(e.target.value);

  const onEndCall = () => {
    handleEndCall({ cameraStream, screenStream, socketRef });
    onLeaveMeeting();
    toast.info("You left the meeting");
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(meetingCode);
      toast.success("Meeting code copied");
    } catch {
      toast.info("Could not copy. Long-press to copy.");
    }
  };

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="
        sticky/* keeps under your sticky navbar */
        bg-slate-900/70 backdrop-blur border border-white/10
        rounded-xl px-4 py-3 flex items-center justify-between
      ">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-800 text-slate-200">
            <i className="fa-solid fa-hashtag text-sky-400"></i>
            <span className="font-mono tracking-wider">{meetingCode}</span>
          </span>
          <button
            onClick={copyCode}
            className="px-3 py-1 rounded-lg border border-white/15 text-slate-200 hover:bg-slate-800"
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

      {/* Video area */}
      <VideoGrid
        localVideoRef={localVideoRef}
        videos={videos}
        screen={screen}
        screenStream={screenStream}
      />

      {/* Floating controls */}
      <VideoControls
        video={video} setVideo={setVideo}
        audio={audio} setAudio={setAudio}
        screen={screen} setScreen={setScreen}
        newMessage={newMessage} onOpenChat={openChat}
        onEndCall={onEndCall}
        videoAvailable={videoAvailable} audioAvailable={audioAvailable}
        screenStream={screenStream} setScreenStream={setScreenStream}
        cameraStream={cameraStream} setCameraStream={setCameraStream}
        socketRef={socketRef} socketIdRef={socketIdRef}
        localVideoRef={localVideoRef}
      />

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
