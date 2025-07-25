import React from "react";

export default function VideoGrid({ localVideoRef, videos, screen, screenStream }) {
  return (
    <div>
      <video
        ref={localVideoRef}
        autoPlay
        muted
        playsInline
        className="w-[400px] h-[300px] bg-gray-800 rounded"
      ></video>

      {screen && screenStream && (
        <div className="mt-4">
          <h3>Your Screen Share</h3>
          <video
            ref={(ref) => {
              if (ref && screenStream) {
                ref.srcObject = screenStream;
              }
            }}
            autoPlay
            muted
            playsInline
            className="w-[400px] h-[300px] bg-gray-800 rounded"
          ></video>
        </div>
      )}

      {videos.map((video) => (
        <div key={video.socketId}>
          <h2>{video.socketId}</h2>
          <video
            data-socket={video.socketId}
            ref={(ref) => {
              if (ref && video.stream) {
                ref.srcObject = video.stream;
              }
            }}
            autoPlay
            playsInline
            className="w-[400px] h-[300px] bg-gray-800 rounded"
          ></video>
        </div>
      ))}
    </div>
  );
}