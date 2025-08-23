import React, { useEffect, useRef, useState } from "react";
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
  isInterviewer,
  onAnomalyDetected,
}) {
  const canvasRef = useRef();
  const remoteCanvasRefs = useRef({});
  const remoteVideoRefs = useRef({});
  const [detectionActive, setDetectionActive] = useState(false);

  // Initialize face detection immediately
  useEffect(() => {
    const initDetection = async () => {
      console.log("🚀 Initializing face detection system...");
      const initialized = await initializeFaceDetection();
      
      if (initialized) {
        setDetectionActive(true);
        console.log("✅ Face detection system ready");
      } else {
        console.error("❌ Failed to initialize face detection");
      }
    };

    initDetection();

    return () => {
      stopInterviewFaceDetection();
      setDetectionActive(false);
    };
  }, []);

  // Auto-start detection on local video (interviewee) - NO BUTTON NEEDED
  useEffect(() => {
    if (!detectionActive || isInterviewer) return;
    
    console.log("👤 Interviewee: Auto-starting face detection on own video");
    
    const startLocalDetection = () => {
      if (localVideoRef.current && localVideoRef.current.readyState >= 2) {
        console.log("📹 Starting face detection on interviewee's own video");
        
        startInterviewFaceDetection({
          videoElement: localVideoRef.current,
          canvasElement: null, // No overlay for interviewee's own video
          socketRef,
          interviewCode,
          isInterviewer: false,
          onAnomalyDetected: (anomaly) => {
            console.log("🚨 Anomaly detected on interviewee side:", anomaly);
            // This will be sent to the interviewer via socket
          },
        });
      } else {
        console.log("⏳ Waiting for local video to be ready...");
        setTimeout(startLocalDetection, 1000);
      }
    };

    startLocalDetection();

    return () => {
      console.log("🛑 Stopping local face detection");
      stopInterviewFaceDetection();
    };
  }, [detectionActive, isInterviewer, localVideoRef, socketRef, interviewCode]);

  // Start detection on remote videos (for interviewer to see overlays)
  useEffect(() => {
    if (!isInterviewer || !detectionActive || videos.length === 0) return;

    console.log("🔍 Interviewer: Setting up detection overlays on remote videos");

    videos.forEach((video) => {
      const videoElement = remoteVideoRefs.current[video.socketId];
      const canvasElement = remoteCanvasRefs.current[video.socketId];
      
      if (videoElement && canvasElement) {
        console.log("🎯 Setting up detection overlay for:", video.socketId);
        
        const startRemoteDetection = () => {
          if (videoElement.readyState >= 2 && videoElement.videoWidth > 0) {
            console.log("📹 Starting detection overlay for remote video:", video.socketId);
            
            setupFaceDetectionCanvas(videoElement, canvasElement);
            
            // Start detection for overlay purposes (interviewer view)
            startInterviewFaceDetection({
              videoElement,
              canvasElement,
              socketRef,
              interviewCode,
              isInterviewer: true,
              onAnomalyDetected: (anomaly) => {
                console.log("🔍 Overlay detection (interviewer view):", anomaly);
                // This is just for visual feedback, actual detection happens on interviewee side
              },
            });
          } else {
            console.log("⏳ Waiting for remote video to be ready...");
            setTimeout(startRemoteDetection, 1000);
          }
        };

        startRemoteDetection();
      }
    });

    return () => {
      console.log("🛑 Stopping remote detection overlays");
      stopInterviewFaceDetection();
    };
  }, [videos, isInterviewer, detectionActive, socketRef, interviewCode]);

  const handleVideoError = (e, videoId) => {
    console.error(`Video error for ${videoId}:`, e);
  };

  const handleVideoLoadedData = (e, videoId) => {
    console.log(`✅ Video loaded for ${videoId}:`, e.target.videoWidth, 'x', e.target.videoHeight);
  };

  return (
    <div className="h-full bg-gray-900 rounded-lg overflow-hidden">
      {/* Detection Status Info */}
      <div className="mb-2 p-2 bg-gray-800 rounded text-xs text-gray-300">
        <div>🔍 Detection: {detectionActive ? "✅ Active" : "❌ Inactive"}</div>
        <div>📹 Remote Videos: {videos.length}</div>
        <div>👁️ Role: {isInterviewer ? "👨‍💼 Interviewer (Monitoring)" : "👤 Interviewee (Being Monitored)"}</div>
        {!isInterviewer && detectionActive && (
          <div className="text-yellow-400">⚠️ Your behavior is being monitored</div>
        )}
      </div>

      {/* Local Video */}
      <div className="relative mb-4">
        <div className="relative bg-gray-800 rounded-lg overflow-hidden aspect-video">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
            onError={(e) => handleVideoError(e, 'local')}
            onLoadedData={(e) => handleVideoLoadedData(e, 'local')}
          />

          <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
            You {isInterviewer ? "(Interviewer)" : "(Interviewee)"}
          </div>

          {/* Detection status indicator */}
          {!isInterviewer && detectionActive && (
            <div className="absolute top-2 left-2 bg-red-600 bg-opacity-75 text-white px-2 py-1 rounded text-xs animate-pulse">
              🔴 LIVE MONITORING
            </div>
          )}
        </div>
      </div>

      {/* Remote Videos */}
      <div className="space-y-2">
        {videos.length === 0 ? (
          <div className="bg-gray-800 rounded-lg aspect-video flex items-center justify-center">
            <div className="text-center text-gray-400">
              <div className="text-4xl mb-2">👤</div>
              <p>Waiting for {isInterviewer ? "interviewee" : "interviewer"} to join...</p>
            </div>
          </div>
        ) : (
          videos.map((video) => (
            <div key={video.socketId} className="relative">
              <div className="relative bg-gray-800 rounded-lg overflow-hidden aspect-video">
                <video
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                  data-socket-id={video.socketId}
                  ref={(videoElement) => {
                    if (videoElement) {
                      remoteVideoRefs.current[video.socketId] = videoElement;
                      
                      if (video.stream) {
                        console.log("📺 Setting stream for remote video:", video.socketId);
                        videoElement.srcObject = video.stream;

                        videoElement.play().catch(err => {
                          console.error("Error playing remote video:", err);
                        });
                      }
                    }
                  }}
                  onError={(e) => handleVideoError(e, video.socketId)}
                  onLoadedData={(e) => handleVideoLoadedData(e, video.socketId)}
                />

                {/* Face detection overlay canvas - ONLY for interviewer */}
                {isInterviewer && (
                  <canvas
                    ref={(canvas) => {
                      if (canvas) {
                        remoteCanvasRefs.current[video.socketId] = canvas;
                        console.log("🎨 Canvas overlay ready for:", video.socketId);
                      }
                    }}
                    className="absolute top-0 left-0 w-full h-full pointer-events-none"
                    style={{ zIndex: 10 }}
                  />
                )}

                <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
                  {isInterviewer ? "Interviewee" : "Interviewer"}
                </div>

                {/* Detection status for interviewer */}
                {isInterviewer && detectionActive && (
                  <div className="absolute top-2 left-2 bg-blue-600 bg-opacity-75 text-white px-2 py-1 rounded text-xs">
                    🔍 AI Analysis: ON
                  </div>
                )}

                {/* Connection indicator */}
                <div className="absolute top-2 right-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Screen sharing indicator */}
      {screen && screenStream && (
        <div className="mt-4 text-center text-yellow-400 text-sm">
          📺 Screen sharing active
        </div>
      )}
    </div>
  );
}