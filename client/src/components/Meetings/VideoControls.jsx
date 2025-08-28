import React, { useEffect } from "react";
import { getUserMedia, getDisplayMedia, initializeAudioContext } from "./utils/mediaUtils";

export default function VideoControls({
  video, setVideo,
  audio, setAudio,
  screen, setScreen,
  newMessage, onOpenChat, onEndCall,
  videoAvailable, audioAvailable,
  screenStream, setScreenStream,
  cameraStream, setCameraStream,
  socketRef, socketIdRef,
  localVideoRef
}) {

  // Make sure camera/mic attach to local video when toggled
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
        localVideoRef
      });
    }
  }, [audio, video]);

  // Keep screen stream in sync when 'screen' flag changes
  useEffect(() => {
    if (screen === undefined) return;

    // When screen is turned on via state (e.g. restored), acquire if missing
    if (screen && !screenStream) {
      getDisplayMedia({
        screen,
        setScreen,
        screenStream,
        setScreenStream,
        cameraStream,
        socketRef,
        socketIdRef,
        localVideoRef
      });
    }

    // When turning screen off via state, ensure tracks stop
    if (!screen && screenStream) {
      try {
        screenStream.getTracks().forEach(t => t.stop());
      } catch {}
      setScreenStream(null);
    }
  }, [screen]);

  const toggleVideo  = () => { initializeAudioContext(); setVideo(!video); };
  const toggleAudio  = () => { initializeAudioContext(); setAudio(!audio); };

  // Robust screen share toggler with proper cleanup and error fallback
  const handleScreen = async () => {
    initializeAudioContext();

    // Turning ON
    if (!screen) {
      try {
        // Optimistically set state so UI shows “initializing…”
        setScreen(true);

        // Acquire display media via your util (handles socket signaling)
        await getDisplayMedia({
          screen: true,
          setScreen,
          screenStream,
          setScreenStream,
          cameraStream,
          socketRef,
          socketIdRef,
          localVideoRef
        });

        // If util did not set a stream for some reason, revert
        // (some browsers require user gesture & prompt could be dismissed)
        setTimeout(() => {
          if (!screenStream && !localVideoRef?.current?.srcObject) {
            setScreen(false);
          }
        }, 300);
      } catch (err) {
        console.error("Screen share failed:", err);
        setScreen(false);
      }
      return;
    }

    // Turning OFF
    try {
      if (screenStream) {
        screenStream.getTracks().forEach(t => t.stop());
      }
    } catch {}
    setScreenStream(null);
    setScreen(false);
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
    <div className="fixed left-1/2 -translate-x-1/2 bottom-4 z-40">
      <div className="rounded-full bg-slate-900/70 backdrop-blur border border-white/10 px-3 py-2 flex items-center gap-3">
        <Btn active={video}  onClick={toggleVideo}  icon={video ? "fa-video" : "fa-video-slash"} label="Toggle camera" />
        <Btn active={audio}  onClick={toggleAudio}  icon={audio ? "fa-microphone" : "fa-microphone-slash"} label="Toggle mic" />
        <Btn active={screen} onClick={handleScreen} icon={screen ? "fa-display" : "fa-up-right-from-square"} label={screen ? "Stop presenting" : "Present screen"} />

        <div className="relative">
          <Btn active={false} onClick={onOpenChat} icon="fa-message" label="Open chat" />
          {newMessage > 0 && (
            <span className="absolute -top-1 -right-1 h-5 min-w-[1.25rem] px-1 rounded-full bg-rose-500 text-white text-xs flex items-center justify-center">
              {newMessage}
            </span>
          )}
        </div>

        <Btn danger onClick={onEndCall} icon="fa-phone-slash" label="End call" />
      </div>
    </div>
  );
}
