import React, { useMemo } from "react";

/**
 * props:
 * - localVideoRef: React.RefObject<HTMLVideoElement>
 * - videos: [{ socketId, stream, isMuted?, isCameraOff? }]
 * - screen: boolean
 * - screenStream: MediaStream | null
 */
export default function VideoGrid({ localVideoRef, videos = [], screen, screenStream }) {
  const remoteVideos = videos;

  const screenTile = useMemo(() => {
    if (!screen) return null;

    // While stream is being acquired, show a friendly initializing tile
    if (!screenStream) {
      return (
        <InitTile title="Starting screen share…" />
      );
    }

    return (
      <VideoTile
        key="__screen__"
        title="Your screen"
        stream={screenStream}
        highlight
      />
    );
  }, [screen, screenStream]);

  // --- Screen share layout: big screen + thumbnail strip
  if (screenTile) {
    return (
      <div className="w-full space-y-4">
        {/* Big presenter tile */}
        <div className="rounded-2xl overflow-hidden border border-white/10 bg-slate-900/60">
          {screenTile}
        </div>

        {/* Thumbnails strip (you + others) */}
        <div className="w-full">
          <div
            className="
              flex items-stretch justify-center gap-3
              overflow-x-auto px-1 py-1
              [scrollbar-width:none] [-ms-overflow-style:none]
            "
            style={{ scrollbarWidth: "none" }}
          >
            {/* Local */}
            <StripItem>
              <VideoTile title="You" attachRef={localVideoRef} muted />
            </StripItem>

            {/* Remotes */}
            {remoteVideos.map((v) => (
              <StripItem key={v.socketId}>
                <VideoTile
                  title={shortId(v.socketId)}
                  stream={v.stream}
                  isMuted={v.isMuted}
                  isCameraOff={v.isCameraOff}
                />
              </StripItem>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // --- Normal layout: centered, balanced tiles
  return (
    <div className="flex flex-wrap justify-center gap-4">
      {/* Local */}
      <TileColumn>
        <VideoTile key="__local__" title="You" attachRef={localVideoRef} muted />
      </TileColumn>

      {/* Remotes */}
      {remoteVideos.map((v) => (
        <TileColumn key={v.socketId}>
          <VideoTile
            title={shortId(v.socketId)}
            stream={v.stream}
            isMuted={v.isMuted}
            isCameraOff={v.isCameraOff}
          />
        </TileColumn>
      ))}
    </div>
  );
}

/* ---------- helpers ---------- */

function shortId(id) {
  if (!id) return "Guest";
  return `User ${id.slice(0, 4).toUpperCase()}`;
}

/** Column wrapper that keeps tiles equal sized & centered */
function TileColumn({ children }) {
  return (
    <div className="flex-1 min-w-[280px] max-w-[520px]">
      {children}
    </div>
  );
}

/** Thumbnail wrapper for the strip under screen share */
function StripItem({ children }) {
  return (
    <div className="min-w-[220px] max-w-[320px] w-full">
      {children}
    </div>
  );
}

/** “Initializing share” tile */
function InitTile({ title }) {
  return (
    <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-slate-900/60 shadow-xl">
      <div className="w-full aspect-video flex items-center justify-center text-slate-200">
        <i className="fa-solid fa-spinner animate-spin mr-2"></i>
        {title}
      </div>
    </div>
  );
}

/** Single video tile with name badge & status badges */
function VideoTile({ title, stream, attachRef, muted, isMuted, isCameraOff, highlight }) {
  return (
    <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-slate-900/60 shadow-xl">
      <video
        ref={(ref) => {
          if (attachRef && ref) attachRef.current = ref;
          if (ref && stream) ref.srcObject = stream;
        }}
        autoPlay
        playsInline
        muted={muted}
        className={`w-full aspect-video object-cover ${isCameraOff ? "opacity-40" : ""}`}
      />
      {/* soft glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_40%_at_60%_-10%,rgba(124,77,255,0.18),transparent_60%)]" />
      {/* name label */}
      <div className="absolute left-3 bottom-3 px-3 py-1 rounded-lg bg-black/50 backdrop-blur text-white text-xs sm:text-sm">
        {title}
        {highlight && (
          <span className="ml-2 inline-flex items-center gap-1 text-amber-300">
            <i className="fa-solid fa-star text-[10px]"></i> presenting
          </span>
        )}
      </div>
      {/* status badges */}
      <div className="absolute right-3 bottom-3 flex items-center gap-2">
        {isMuted && (
          <span className="h-7 w-7 rounded-full bg-black/55 flex items-center justify-center text-white">
            <i className="fa-solid fa-microphone-slash text-xs"></i>
          </span>
        )}
        {isCameraOff && (
          <span className="h-7 w-7 rounded-full bg-black/55 flex items-center justify-center text-white">
          <i className="fa-solid fa-video-slash text-xs"></i>
          </span>
        )}
      </div>
    </div>
  );
}
