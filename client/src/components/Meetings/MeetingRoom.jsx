import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import VideoControls from "./VideoControls";
import VideoGrid from "./VideoGrid";
import ChatModal from "./ChatModal";
import { handleEndCall } from "./utils/mediaUtils";

export default function MeetingRoom({
  meetingCode,
  localVideoRef,
  videos,
  video,
  setVideo,
  audio,
  setAudio,
  screen,
  setScreen,
  screenStream,
  setScreenStream,
  cameraStream,
  setCameraStream,
  videoAvailable,
  audioAvailable,
  socketRef,
  socketIdRef,
  onLeaveMeeting, // Add this prop
}) {
  const [showModal, setShowModal] = useState(false);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [newMessage, setNewMessage] = useState(0);

  // Set up chat message listener
  useEffect(() => {
    if (socketRef.current) {
      socketRef.current.on("chat-message", addMessage);
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.off("chat-message", addMessage);
      }
    };
  }, [socketRef]);

  const addMessage = (data, sender, socketIdSender) => {
    setMessages((prevMessages) => [
      ...prevMessages,
      { sender: sender, data: data },
    ]);
    if (socketIdSender !== socketIdRef.current) {
      setNewMessage((prevNewMessage) => prevNewMessage + 1);
    }
  };

  const sendMessage = () => {
    if (message.trim()) {
      socketRef.current.emit("chat-message", message, "You");
      setMessage("");
    }
  };

  const openChat = () => {
    setShowModal(true);
    setNewMessage(0);
  };

  const closeChat = () => {
    setShowModal(false);
  };

  const handleMessage = (e) => {
    setMessage(e.target.value);
  };

  const onEndCall = () => {
    handleEndCall({ cameraStream, screenStream, socketRef });
    onLeaveMeeting(); // Clear session storage
  };

  return (
    <>
      <div className="mb-4">
        <strong>Meeting Code: {meetingCode}</strong>
      </div>

      <VideoGrid
        localVideoRef={localVideoRef}
        videos={videos}
        screen={screen}
        screenStream={screenStream}
      />

      <VideoControls
        video={video}
        setVideo={setVideo}
        audio={audio}
        setAudio={setAudio}
        screen={screen}
        setScreen={setScreen}
        newMessage={newMessage}
        onOpenChat={openChat}
        onEndCall={onEndCall}
        videoAvailable={videoAvailable}
        audioAvailable={audioAvailable}
        screenStream={screenStream}
        setScreenStream={setScreenStream}
        cameraStream={cameraStream}
        setCameraStream={setCameraStream}
        socketRef={socketRef}
        socketIdRef={socketIdRef}
        localVideoRef={localVideoRef} // Pass localVideoRef
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
    </>
  );
}