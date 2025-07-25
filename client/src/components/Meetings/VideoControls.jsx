import React, { useEffect } from "react";
import { getUserMedia, getDisplayMedia, initializeAudioContext } from "./utils/mediaUtils";

export default function VideoControls({
  video,
  setVideo,
  audio,
  setAudio,
  screen,
  setScreen,
  newMessage,
  onOpenChat,
  onEndCall,
  videoAvailable,
  audioAvailable,
  screenStream,
  setScreenStream,
  cameraStream,
  setCameraStream,
  socketRef,
  socketIdRef,
  localVideoRef // Add this prop
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
        screen,
        screenStream,
        socketRef,
        socketIdRef,
        localVideoRef // Pass localVideoRef
      });
    }
  }, [audio, video]);

  useEffect(() => {
    if (screen !== undefined) {
      getDisplayMedia({
        screen,
        setScreen,
        screenStream,
        setScreenStream,
        cameraStream,
        socketRef,
        socketIdRef,
        localVideoRef // Pass localVideoRef
      });
    }
  }, [screen]);

  const handleVideo = () => {
    initializeAudioContext(); // Initialize on user gesture
    setVideo(!video);
  };

  const handleAudio = () => {
    initializeAudioContext(); // Initialize on user gesture
    setAudio(!audio);
  };

  const handleScreen = () => {
    initializeAudioContext(); // Initialize on user gesture
    setScreen(!screen);
  };

  return (
    <div className="mt-4">
      <button
        onClick={handleVideo}
        className={`mr-2 p-2 text-white rounded ${video ? 'bg-blue-500' : 'bg-gray-500'}`}
      >
        {video ? "Video On" : "Video Off"}
      </button>
      <button
        onClick={handleAudio}
        className={`mr-2 p-2 text-white rounded ${audio ? 'bg-green-500' : 'bg-gray-500'}`}
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
        onClick={handleScreen}
        className={`mr-2 p-2 text-white rounded ${screen ? 'bg-orange-500' : 'bg-gray-500'}`}
      >
        {screen ? "Stop Share" : "Screen Share"}
      </button>
      <button
        onClick={onEndCall}
        className="mr-2 p-2 bg-red-500 text-white rounded"
      >
        End Call
      </button>
    </div>
  );
}