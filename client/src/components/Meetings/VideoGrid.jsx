import React, { memo, useMemo } from "react";

// Helper function
function shortId(id) {
  if (!id) return '';
  return id.substring(0, 4);
}

// ✅ MEMOIZE THE ENTIRE COMPONENT to prevent unnecessary re-renders
const VideoGrid = memo(function VideoGrid({
  localVideoRef,
  videos = [],
  screen,
  screenStream,
  video,
  audio,
  userName = 'You',
}) {
  // Find who's screen sharing
  const screenShareVideo = videos.find((v) => v.isScreenShare === true);
  const isAnyoneScreenSharing = screen || screenShareVideo;

  // Main presenter
  const mainPresenter = useMemo(() => {
    if (screenShareVideo) {
      // ✅ GET USERNAME FROM THE VIDEO OBJECT (already has it from socket)
      const presenterName = screenShareVideo.username || window.meetingUserNames?.[screenShareVideo.socketId] || 'Someone';
      return {
        title: `${presenterName} is presenting`,
        stream: screenShareVideo.stream,
        socketId: screenShareVideo.socketId,
      };
    } else if (screen && screenStream) {
      return {
        title: `${userName} is presenting`,
        stream: screenStream,
        socketId: null,
      };
    }
    return null;
  }, [screen, screenStream, screenShareVideo, userName]);

  // ✅ FIXED: Camera feeds with proper state separation
  const cameraFeeds = useMemo(() => {
    const feeds = [];

    // YOUR CAMERA - use the actual video/audio props
    feeds.push({
      title: userName,
      attachRef: localVideoRef,
      muted: true,
      socketId: "local",
      isCameraOff: !video,
      isMuted: !audio,
      forceStream: screen ? window.cameraStreamBackup : null,
    });

    // OTHER USERS - DON'T mix camera and audio states
    videos.forEach((v) => {
      if (!v.isScreenShare) {
        feeds.push({
          title: v.username || shortId(v.socketId),
          stream: v.stream,
          isMuted: v.isMuted,
          isCameraOff: v.isCameraOff,
          socketId: v.socketId,
        });
      } else {
        feeds.push({
          title: v.username || shortId(v.socketId),
          stream: null,
          isMuted: v.isMuted,
          isCameraOff: true,
          socketId: v.socketId,
          isScreenShareUser: true,
          customMessage: "Presenting screen",
        });
      }
    });

    return feeds;
  }, [localVideoRef, videos, video, audio, screen, userName]);

  // ✅ DYNAMIC GRID LAYOUT
  const getGridLayout = useMemo(() => {
    const count = cameraFeeds.length;

    if (count === 1) {
      return {
        containerClass: "flex items-center justify-center",
        gridClass: "grid grid-cols-1 place-items-center",
        itemClass: "w-[min(80vw,600px)] h-[min(60vh,450px)]",
      };
    }

    if (count === 2) {
      return {
        containerClass: "flex items-center justify-center",
        gridClass: "grid grid-cols-1 lg:grid-cols-2 gap-6",
        itemClass: "w-full max-w-[500px] h-[350px]",
      };
    }

    if (count <= 4) {
      return {
        containerClass: "flex items-center justify-center",
        gridClass: "grid grid-cols-1 sm:grid-cols-2 gap-4",
        itemClass: "w-full aspect-video",
      };
    }

    if (count <= 6) {
      return {
        containerClass: "flex items-start justify-center",
        gridClass: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3",
        itemClass: "w-full aspect-video",
      };
    }

    if (count <= 9) {
      return {
        containerClass: "flex items-start justify-center",
        gridClass: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3",
        itemClass: "w-full aspect-video",
      };
    }

    return {
      containerClass: "overflow-y-auto",
      gridClass: "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2",
      itemClass: "w-full aspect-video",
    };
  }, [cameraFeeds.length]);

  // ✅ Status Indicator Component
  const StatusIndicators = memo(function StatusIndicators({
    isMuted,
    isCameraOff,
    position = "thumbnail",
  }) {
    const iconSize = position === "main" ? "w-7 h-7" : "w-6 h-6";
    const iconTextSize = position === "main" ? "text-sm" : "text-xs";

    return (
      <div
        className={`absolute ${
          position === "main" ? "bottom-3 right-3" : "bottom-2 right-2"
        } flex gap-1`}
      >
        {isMuted && (
          <span className={`${iconSize} rounded-full bg-red-600/90 flex items-center justify-center shadow-lg`}>
            <i className={`fa-solid fa-microphone-slash ${iconTextSize} text-white`}></i>
          </span>
        )}
        {isCameraOff && (
          <span className={`${iconSize} rounded-full bg-red-600/90 flex items-center justify-center shadow-lg`}>
            <i className={`fa-solid fa-video-slash ${iconTextSize} text-white`}></i>
          </span>
        )}
      </div>
    );
  });

  // SCREEN SHARE LAYOUT
  if (isAnyoneScreenSharing && mainPresenter) {
    return (
      <div className="w-full h-full flex flex-col gap-4 p-4">
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

        <div className="h-36 flex gap-3 overflow-x-auto">
          {cameraFeeds.map((feed, index) => (
            <div key={feed.socketId || index} className="flex-shrink-0">
              <div className="relative w-64 h-full rounded-xl overflow-hidden border border-white/10 bg-slate-900/60">
                {feed.isCameraOff ? (
                  <div className="w-full h-full bg-slate-800 flex flex-col items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-slate-700/80 flex items-center justify-center mb-2">
                      <i className={`fa-solid ${feed.isScreenShareUser ? "fa-display" : "fa-user"} text-slate-400 text-2xl`}></i>
                    </div>
                    <div className="text-slate-400 text-xs text-center">
                      <div className="font-medium">{feed.title}</div>
                      <div>{feed.customMessage || "Camera off"}</div>
                    </div>
                  </div>
                ) : (
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
                <StatusIndicators isMuted={feed.isMuted} isCameraOff={feed.isCameraOff} position="thumbnail" />
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
      <div className={getGridLayout.containerClass}>
        <div className={`${getGridLayout.gridClass} w-full max-w-7xl`}>
          {cameraFeeds.map((feed, index) => (
            <div
              key={feed.socketId || index}
              className={`${getGridLayout.itemClass} relative rounded-2xl overflow-hidden border border-white/10 bg-slate-900/60`}
            >
              {feed.isCameraOff ? (
                <div className="w-full h-full bg-slate-800 flex flex-col items-center justify-center">
                  <div className={`${cameraFeeds.length === 1 ? "w-24 h-24" : "w-16 h-16"} rounded-full bg-slate-700/80 flex items-center justify-center mb-2`}>
                    <i className={`fa-solid fa-user text-slate-400 ${cameraFeeds.length === 1 ? "text-4xl" : "text-2xl"}`}></i>
                  </div>
                  <div className="text-slate-400 text-center">
                    <div className={`${cameraFeeds.length === 1 ? "text-lg" : "text-sm"} font-medium mb-1`}>
                      {feed.title}
                    </div>
                    <div className={`${cameraFeeds.length === 1 ? "text-sm" : "text-xs"}`}>
                      Camera is turned off
                    </div>
                  </div>
                </div>
              ) : (
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
                    if (ref && feed.stream) {
                      ref.srcObject = feed.stream;
                    }
                  }}
                  className="w-full h-full object-cover"
                />
              )}
              <div className="absolute bottom-3 left-3 px-2 py-1 rounded bg-black/70 text-white text-sm">
                {feed.title}
              </div>
              <StatusIndicators isMuted={feed.isMuted} isCameraOff={feed.isCameraOff} position="main" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

export default VideoGrid;
