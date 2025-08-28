import React, { useEffect } from "react";
import { getUserMedia, initializeAudioContext } from "./utils/mediaUtils";
import { connections } from "./utils/socketUtils";

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

  const toggleVideo  = () => { initializeAudioContext(); setVideo(!video); };
  const toggleAudio  = () => { initializeAudioContext(); setAudio(!audio); };

  // FIXED: Screen share WITHOUT killing camera
  const handleScreen = async () => {
    initializeAudioContext();

    // Turning OFF screen share
    if (screen) {
      try {
        if (screenStream) {
          screenStream.getTracks().forEach(t => t.stop());
        }
        setScreenStream(null);
        setScreen(false);
        
        // Notify others
        if (socketRef.current) {
          socketRef.current.emit("screen-share-stopped");
        }
        
        // Switch back to camera - USE BACKUP STREAM
        if (window.cameraStreamBackup) {
          window.localStream = window.cameraStreamBackup;
          updatePeerConnections(window.cameraStreamBackup);
          
          // Update local preview back to camera
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = window.cameraStreamBackup;
          }
        }
      } catch (err) {
        console.error("Error stopping screen share:", err);
      }
      return;
    }

    // Turning ON screen share
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ 
        video: true, 
        audio: true 
      });
      
      console.log("🎯 Screen share started - keeping camera alive");
      
      setScreenStream(stream);
      setScreen(true);
      
      // Notify others FIRST
      if (socketRef.current) {
        socketRef.current.emit("screen-share-started");
      }
      
      // CRITICAL FIX: Send screen stream to peers but keep camera reference
      window.localStream = stream;
      updatePeerConnections(stream);

      // KEEP showing camera in local preview (don't switch to screen)
      // The screen will be shown in the main area by VideoGrid logic
      
      // Handle browser stop
      stream.getVideoTracks()[0].onended = () => {
        setScreen(false);
        setScreenStream(null);
        
        if (socketRef.current) {
          socketRef.current.emit("screen-share-stopped");
        }
        
        // Switch back to camera
        if (window.cameraStreamBackup) {
          window.localStream = window.cameraStreamBackup;
          updatePeerConnections(window.cameraStreamBackup);
        }
      };
        
    } catch (err) {
      console.error("Screen share failed:", err);
      setScreen(false);
      setScreenStream(null);
    }
  };

  // SIMPLE peer updates
  const updatePeerConnections = (streamToSend) => {
    console.log(`🔄 Updating ${Object.keys(connections).length} peers`);
    
    for (let id in connections) {
      if (id === socketIdRef.current) continue;

      try {
        // Remove old tracks
        const senders = connections[id].getSenders();
        senders.forEach(sender => {
          if (sender.track) {
            connections[id].removeTrack(sender);
          }
        });

        // Add new tracks
        if (streamToSend && streamToSend.getTracks) {
          streamToSend.getTracks().forEach(track => {
            connections[id].addTrack(track, streamToSend);
          });

          connections[id].createOffer().then((description) => {
            connections[id].setLocalDescription(description).then(() => {
              socketRef.current.emit(
                "signal",
                id,
                JSON.stringify({ sdp: connections[id].localDescription })
              );
            });
          });
        }
      } catch (error) {
        console.error(`Error updating peer ${id}:`, error);
      }
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
