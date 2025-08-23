import React, { useRef, useEffect } from "react";
import {
  initializeFaceDetection,
  startInterviewFaceDetection,
  stopInterviewFaceDetection,
  setupFaceDetectionCanvas,
} from "./utils/interviewFaceDetection";

export default function VideoGrid({
  localVideoRef,
  videos,
  screen,
  screenStream,
  socketRef,
  interviewCode,
  isInterviewer = false,
  onAnomalyDetected,
}) {
  const faceDetectionCanvasRef = useRef();

  useEffect(() => {
    // Initialize face detection when component mounts
    const initDetection = async () => {
      const modelsLoaded = await initializeFaceDetection();
      if (modelsLoaded && localVideoRef.current) {
        setupFaceDetectionCanvas(
          localVideoRef.current,
          faceDetectionCanvasRef.current
        );

        // Start detection on local video (interviewee's feed)
        startInterviewFaceDetection({
          videoElement: localVideoRef.current,
          canvasElement: faceDetectionCanvasRef.current,
          socketRef,
          interviewCode,
          isInterviewer,
          onAnomalyDetected,
        });
      }
    };

    initDetection();

    return () => {
      stopInterviewFaceDetection();
    };
  }, [localVideoRef, socketRef, interviewCode, isInterviewer]);

  return (
    <div className="video-grid">
      {/* Local Video */}
      <div className="relative">
        <video
          ref={localVideoRef}
          autoPlay
          muted
          playsInline
          className="w-full bg-gray-800 rounded object-cover"
        />
        {/* Face detection overlay - only visible to interviewer */}
        {isInterviewer && (
          <canvas
            ref={faceDetectionCanvasRef}
            className="absolute top-0 left-0 w-full h-full pointer-events-none"
          />
        )}
        <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
          You {isInterviewer ? "(Interviewer)" : "(Interviewee)"}
        </div>
      </div>

      {/* Remote Videos */}
      {videos.map((video) => (
        <div key={video.socketId} className="relative">
          <video
            ref={(ref) => {
              if (ref && video.stream) {
                ref.srcObject = video.stream;
              }
            }}
            autoPlay
            playsInline
            className="w-full bg-gray-800 rounded object-cover"
          />
          <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
            Remote User
          </div>
        </div>
      ))}
    </div>
  );
}