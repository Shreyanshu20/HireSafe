import React, { useEffect } from "react";
import { getUserMedia, initializeAudioContext } from "./utils/mediaUtils.js";

export default function InterviewControls({
  video,
  setVideo,
  audio,
  setAudio,
  newMessage,
  onOpenChat,
  onEndCall,
  videoAvailable,
  audioAvailable,
  cameraStream,
  setCameraStream,
  socketRef,
  socketIdRef,
  localVideoRef,
}) {
  useEffect(() => {
    if (video !== undefined && audio !== undefined) {
      getUserMedia({
        video,
        audio,
        videoAvailable,
        audioAvailable,
        cameraStream,
        setCameraStream,
        socketRef,
        socketIdRef,
        localVideoRef,
      });
    }
  }, [audio, video]);

  const handleVideo = () => {
    initializeAudioContext();
    setVideo(!video);
  };

  const handleAudio = () => {
    initializeAudioContext();
    setAudio(!audio);
  };

  return (
    <div className="mt-4">
      <button
        onClick={handleVideo}
        className={`mr-2 p-2 text-white rounded ${
          video ? "bg-blue-500" : "bg-gray-500"
        }`}
      >
        {video ? "Video On" : "Video Off"}
      </button>
      <button
        onClick={handleAudio}
        className={`mr-2 p-2 text-white rounded ${
          audio ? "bg-green-500" : "bg-gray-500"
        }`}
      >
        {audio ? "Audio On" : "Audio Off"}
      </button>
      <button
        onClick={onOpenChat}
        className="mr-2 p-2 bg-purple-500 text-white rounded"
      >
        Chat {newMessage > 0 && `(${newMessage})`}
      </button>
      <button
        onClick={onEndCall}
        className="mr-2 p-2 bg-red-500 text-white rounded"
      >
        End Interview
      </button>
    </div>
  );
}
