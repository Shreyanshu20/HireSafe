import React, { useMemo, memo } from "react";

// ✅ MEMOIZE THE ENTIRE COMPONENT to prevent unnecessary re-renders
const VideoGrid = memo(function VideoGrid({ localVideoRef, videos = [], screen, screenStream, video, audio }) {
  
  console.log("🔍 VideoGrid RENDER:", {
    screen,
    screenStream: !!screenStream,
    videos: videos.length,
    video, 
    audio,
    screenShareVideos: videos.filter(v => v.isScreenShare).length
  });

  // Find who's screen sharing
  const screenShareVideo = videos.find(v => v.isScreenShare === true);
  const isAnyoneScreenSharing = screen || screenShareVideo;

  // Main presenter
  const mainPresenter = useMemo(() => {
    if (screenShareVideo) {
      return {
        title: `${shortId(screenShareVideo.socketId)} is presenting`,
        stream: screenShareVideo.stream,
        socketId: screenShareVideo.socketId
      };
    } else if (screen && screenStream) {
      return {
        title: "You are presenting",
        stream: screenStream,
        socketId: null
      };
    }
    return null;
  }, [screen, screenStream, screenShareVideo]);

  // ✅ MEMOIZE camera feeds to prevent recreation on every render
  const cameraFeeds = useMemo(() => {
    const feeds = [];
    
    // YOUR CAMERA - use the actual video/audio props
    feeds.push({
      title: "You",
      attachRef: localVideoRef,
      muted: true,
      socketId: "local",
      isCameraOff: !video,
      isMuted: !audio,
      forceStream: screen ? window.cameraStreamBackup : null
    });

    // OTHER USERS
    videos.forEach(v => {
      if (!v.isScreenShare) {
        // Normal user with camera
        feeds.push({
          title: shortId(v.socketId),
          stream: v.stream,
          isMuted: v.isMuted,
          isCameraOff: v.isCameraOff,
          socketId: v.socketId
        });
      } else {
        // Screen sharing user - show placeholder
        feeds.push({
          title: `${shortId(v.socketId)}`,
          stream: null,
          isMuted: v.isMuted,
          isCameraOff: true,
          socketId: v.socketId,
          isScreenShareUser: true,
          customMessage: "Presenting screen"
        });
      }
    });

    return feeds;
  }, [localVideoRef, videos, video, audio, screen]);

  // ✅ MEMOIZE Status Indicator Component
  const StatusIndicators = useMemo(() => 
    memo(function StatusIndicators({ isMuted, isCameraOff }) {
      return (
        <div className="absolute bottom-2 right-2 flex gap-1">
          {isMuted && (
            <span className="w-6 h-6 rounded-full bg-red-600/90 flex items-center justify-center shadow-lg">
              <i className="fa-solid fa-microphone-slash text-xs text-white"></i>
            </span>
          )}
          {isCameraOff && (
            <span className="w-6 h-6 rounded-full bg-red-600/90 flex items-center justify-center shadow-lg">
              <i className="fa-solid fa-video-slash text-xs text-white"></i>
            </span>
          )}
        </div>
      );
    }), []);

  // ✅ MEMOIZE grid class calculation
  const getGridClass = useMemo(() => {
    const count = cameraFeeds.length;
    if (count === 1) return "grid-cols-1 place-items-center";
    if (count === 2) return "grid-cols-1 lg:grid-cols-2";
    if (count <= 4) return "grid-cols-1 sm:grid-cols-2";
    if (count <= 6) return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
    return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";
  }, [cameraFeeds.length]);

  // SCREEN SHARE LAYOUT
  if (isAnyoneScreenSharing && mainPresenter) {
    return (
      <div className="w-full h-full flex flex-col gap-4 p-4">
        {/* MAIN SCREEN AREA */}
        <div className="flex-1 rounded-2xl overflow-hidden border border-white/10 bg-black relative">
          <video
            autoPlay
            playsInline
            muted={false}
            ref={(ref) => {
              if (ref && mainPresenter.stream) {
                ref.srcObject = mainPresenter.stream;
              }
            }}
            className="w-full h-full object-contain bg-black"
          />
          
          <div className="absolute top-4 left-4">
            <span className="px-3 py-1 rounded-lg bg-blue-600/90 text-white text-sm">
              <i className="fa-solid fa-display mr-2"></i>
              {mainPresenter.title}
            </span>
          </div>
        </div>

        {/* CAMERA THUMBNAILS */}
        <div className="h-36 flex gap-3 overflow-x-auto">
          {cameraFeeds.map((feed, index) => (
            <div key={feed.socketId || index} className="flex-shrink-0">
              <div className="relative w-64 h-full rounded-xl overflow-hidden border border-white/10 bg-slate-900/60">
                {feed.isCameraOff ? (
                  // Camera OFF placeholder
                  <div className="w-full h-full bg-slate-800 flex flex-col items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-slate-700/80 flex items-center justify-center mb-2">
                      <i className={`fa-solid ${feed.isScreenShareUser ? 'fa-display' : 'fa-user'} text-slate-400 text-2xl`}></i>
                    </div>
                    <div className="text-slate-400 text-xs text-center">
                      <div className="font-medium">{feed.title}</div>
                      <div>{feed.customMessage || "Camera off"}</div>
                    </div>
                  </div>
                ) : (
                  // Normal video
                  <video
                    autoPlay
                    playsInline
                    muted={feed.muted}
                    ref={(ref) => {
                      if (feed.attachRef && ref) {
                        feed.attachRef.current = ref;
                        if (feed.socketId === "local") {
                          const streamToUse = feed.forceStream || window.cameraStreamBackup || window.localStream;
                          if (streamToUse) {
                            ref.srcObject = streamToUse;
                          }
                        }
                      }
                      if (ref && feed.stream && !feed.forceStream) {
                        ref.srcObject = feed.stream;
                      }
                    }}
                    className="w-full h-full object-contain bg-black"
                  />
                )}
                
                <div className="absolute bottom-2 left-2 px-2 py-1 rounded bg-black/70 text-white text-xs">
                  {feed.title}
                </div>
                
                <StatusIndicators 
                  isMuted={feed.isMuted} 
                  isCameraOff={feed.isCameraOff}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // NORMAL CAMERA LAYOUT
  return (
    <div className="w-full h-full p-4">
      <div className={`grid ${getGridClass} gap-4 h-full`}>
        {cameraFeeds.map((feed, index) => (
          <div 
            key={feed.socketId || index} 
            className={`relative rounded-2xl overflow-hidden border border-white/10 bg-slate-900/60 ${
              cameraFeeds.length === 1
                ? "w-[600px] h-[450px] max-w-3xl"
                : "aspect-video"
            }`}
          >
            {feed.isCameraOff ? (
              // Camera OFF placeholder - LARGER for main grid
              <div className="w-full h-full bg-slate-800 flex flex-col items-center justify-center">
                <div className="w-24 h-24 rounded-full bg-slate-700/80 flex items-center justify-center mb-4">
                  <i className="fa-solid fa-user text-slate-400 text-4xl"></i>
                </div>
                <div className="text-slate-400 text-center">
                  <div className="text-lg font-medium mb-1">{feed.title}</div>
                  <div className="text-sm">Camera is turned off</div>
                </div>
              </div>
            ) : (
              // Normal video
              <video
                autoPlay
                playsInline
                muted={feed.muted}
                ref={(ref) => {
                  if (feed.attachRef && ref) {
                    feed.attachRef.current = ref;
                    if (feed.socketId === "local") {
                      const streamToUse = window.cameraStreamBackup || window.localStream;
                      if (streamToUse) {
                        ref.srcObject = streamToUse;
                      }
                    }
                  }
                  if (ref && feed.stream && feed.socketId !== "local") {
                    ref.srcObject = feed.stream;
                  }
                }}
                className="w-full h-full object-contain"
              />
            )}
            
            <div className="absolute bottom-3 left-3 px-3 py-1 rounded-lg bg-black/70 text-white text-sm">
              {feed.title}
            </div>
            
            {/* STATUS INDICATORS - LARGER for main grid */}
            <div className="absolute bottom-3 right-3 flex gap-2">
              {feed.isMuted && (
                <span className="w-7 h-7 rounded-full bg-red-600/90 flex items-center justify-center shadow-lg">
                  <i className="fa-solid fa-microphone-slash text-xs text-white"></i>
                </span>
              )}
              {feed.isCameraOff && (
                <span className="w-7 h-7 rounded-full bg-red-600/90 flex items-center justify-center shadow-lg">
                  <i className="fa-solid fa-video-slash text-xs text-white"></i>
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

function shortId(id) {
  if (!id) return "Guest";
  return `User ${id.slice(0, 4).toUpperCase()}`;
}

export default VideoGrid;
