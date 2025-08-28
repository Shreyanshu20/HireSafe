import React, { useMemo } from "react";

export default function VideoGrid({ localVideoRef, videos = [], screen, screenStream }) {
  
  console.log("🔍 VideoGrid:", {
    screen,
    screenStream: !!screenStream,
    videos: videos.length,
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

  // Camera feeds - ALL non-screen-share videos + YOUR CAMERA ALWAYS
  const cameraFeeds = useMemo(() => {
    const feeds = [];
    
    // ALWAYS ADD YOUR CAMERA - even when screen sharing
    feeds.push({
      title: "You",
      attachRef: localVideoRef,
      muted: true,
      socketId: "local"
    });

    // Other cameras (NOT screen shares)
    videos.forEach(v => {
      if (!v.isScreenShare) {
        feeds.push({
          title: shortId(v.socketId),
          stream: v.stream,
          isMuted: v.isMuted,
          isCameraOff: v.isCameraOff,
          socketId: v.socketId
        });
      }
    });

    return feeds;
  }, [localVideoRef, videos]);

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

        {/* CAMERA THUMBNAILS - INCLUDING YOUR CAMERA */}
        <div className="h-36 flex gap-3 overflow-x-auto">
          {cameraFeeds.map((feed, index) => (
            <div key={feed.socketId || index} className="flex-shrink-0">
              <div className="relative w-64 h-full rounded-xl overflow-hidden border border-white/10 bg-slate-900/60">
                <video
                  autoPlay
                  playsInline
                  muted={feed.muted}
                  ref={(ref) => {
                    if (feed.attachRef && ref) {
                      feed.attachRef.current = ref;
                      // FORCE camera stream for your feed
                      if (feed.socketId === "local" && window.cameraStreamBackup) {
                        ref.srcObject = window.cameraStreamBackup;
                      }
                    }
                    if (ref && feed.stream) {
                      ref.srcObject = feed.stream;
                    }
                  }}
                  className="w-full h-full object-contain bg-black"
                />
                
                <div className="absolute bottom-2 left-2 px-2 py-1 rounded bg-black/70 text-white text-xs">
                  {feed.title}
                </div>
                
                <div className="absolute bottom-2 right-2 flex gap-1">
                  {feed.isMuted && (
                    <span className="w-6 h-6 rounded-full bg-red-600/80 flex items-center justify-center">
                      <i className="fa-solid fa-microphone-slash text-xs text-white"></i>
                    </span>
                  )}
                  {feed.isCameraOff && (
                    <span className="w-6 h-6 rounded-full bg-red-600/80 flex items-center justify-center">
                      <i className="fa-solid fa-video-slash text-xs text-white"></i>
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // NORMAL CAMERA LAYOUT
  const getGridClass = (count) => {
    if (count === 1) return "grid-cols-1 place-items-center"; // Center single video
    if (count === 2) return "grid-cols-1 lg:grid-cols-2";
    if (count <= 4) return "grid-cols-1 sm:grid-cols-2";
    if (count <= 6) return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
    return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";
  };

  return (
    <div className="w-full h-full p-4">
      <div className={`grid ${getGridClass(cameraFeeds.length)} gap-4 h-full`}>
        {cameraFeeds.map((feed, index) => (
          <div 
            key={feed.socketId || index} 
            className={`relative rounded-2xl overflow-hidden border border-white/10 bg-slate-900/60 ${
              cameraFeeds.length === 1
                ? "w-[900px] h-[600px] max-w-5xl" // Larger: 900px × 600px
                : "aspect-video" // Normal responsive for multiple videos
            }`}
          >
            <video
              autoPlay
              playsInline
              muted={feed.muted}
              ref={(ref) => {
                if (feed.attachRef && ref) {
                  feed.attachRef.current = ref;
                }
                if (ref && feed.stream) {
                  ref.srcObject = feed.stream;
                }
              }}
              className="w-full h-full object-contain"
            />
            
            <div className="absolute bottom-3 left-3 px-3 py-1 rounded-lg bg-black/70 text-white text-sm">
              {feed.title}
            </div>
            
            <div className="absolute bottom-3 right-3 flex gap-2">
              {feed.isMuted && (
                <span className="w-7 h-7 rounded-full bg-red-600/80 flex items-center justify-center">
                  <i className="fa-solid fa-microphone-slash text-xs text-white"></i>
                </span>
              )}
              {feed.isCameraOff && (
                <span className="w-7 h-7 rounded-full bg-red-600/80 flex items-center justify-center">
                  <i className="fa-solid fa-video-slash text-xs text-white"></i>
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function shortId(id) {
  if (!id) return "Guest";
  return `User ${id.slice(0, 4).toUpperCase()}`;
}
