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

  const toggleVideo = () => {
    initializeAudioContext();
    const newVideoState = !video;
    console.log(`🎥 Toggling camera: ${video} -> ${newVideoState}`);
    
    setVideo(newVideoState);
    
    // ✅ EMIT THE CORRECT EVENT THAT MEETINGS USE
    if (socketRef.current) {
      socketRef.current.emit("toggle-camera", newVideoState);
    }
  };

  const toggleAudio = () => {
    initializeAudioContext();
    const newAudioState = !audio;
    console.log(`🎤 Toggling audio: ${audio} -> ${newAudioState}`);
    
    setAudio(newAudioState);
    
    // ✅ EMIT THE CORRECT EVENT THAT MEETINGS USE
    if (socketRef.current) {
      socketRef.current.emit("toggle-microphone", newAudioState);
    }
  };

  const Btn = ({ active, onClick, icon, label, danger }) => (
    <button
      onClick={onClick}
      className={[
        "h-12 w-12 rounded-full flex items-center justify-center",
        "shadow-lg transition focus:outline-none",
        active ? "bg-emerald-500 text-white hover:bg-emerald-600"
               : danger ? "bg-red-600 text-white hover:bg-red-700"
               : "bg-slate-800 text-gray-200 hover:bg-slate-700"
      ].join(" ")}
      title={label}
      aria-label={label}
    >
      <i className={`fa-solid ${icon}`}></i>
    </button>
  );

  return (
    <div className="fixed left-1/2 -translate-x-1/2 bottom-2 z-40">
      <div className="rounded-full bg-slate-900/70 backdrop-blur border border-white/10 px-3 py-2 flex items-center gap-3">
        <Btn 
          active={video} 
          onClick={toggleVideo} 
          icon={video ? "fa-video" : "fa-video-slash"} 
          label="Toggle camera" 
        />
        
        <Btn 
          active={audio} 
          onClick={toggleAudio} 
          icon={audio ? "fa-microphone" : "fa-microphone-slash"} 
          label="Toggle microphone" 
        />

        <div className="relative">
          <Btn 
            active={false} 
            onClick={onOpenChat} 
            icon="fa-message" 
            label="Open chat" 
          />
          {newMessage > 0 && (
            <span className="absolute -top-1 -right-1 h-5 min-w-[1.25rem] px-1 rounded-full bg-rose-500 text-white text-xs flex items-center justify-center">
              {newMessage}
            </span>
          )}
        </div>

        <Btn 
          danger 
          onClick={onEndCall} 
          icon="fa-phone-slash" 
          label="End interview" 
        />
      </div>
    </div>
  );
}
