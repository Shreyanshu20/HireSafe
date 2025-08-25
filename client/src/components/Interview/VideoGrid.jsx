import React, { useEffect, useRef, useState } from "react";
import {
  initializeFaceDetection,
  startInterviewFaceDetection,
  stopInterviewFaceDetection,
  setupFaceDetectionCanvas,
} from "./utils/interviewFaceDetection.js";

export default function VideoGrid({
  localVideoRef,
  videos,
  socketRef,
  interviewCode,
  isInterviewer,
  onAnomalyDetected,
}) {
  const canvasRef = useRef();
  const remoteCanvasRefs = useRef({});
  const remoteVideoRefs = useRef({});
  const [detectionActive, setDetectionActive] = useState(false);

  useEffect(() => {
    const initDetection = async () => {
      const initialized = await initializeFaceDetection();
      if (initialized) {
        setDetectionActive(true);
      }
    };
    initDetection();
    return () => {
      stopInterviewFaceDetection();
      setDetectionActive(false);
    };
  }, []);

  useEffect(() => {
    if (!detectionActive || isInterviewer) return;

    const startLocalDetection = () => {
      if (localVideoRef.current && localVideoRef.current.readyState >= 2) {
        startInterviewFaceDetection({
          videoElement: localVideoRef.current,
          canvasElement: null,
          socketRef,
          interviewCode,
          isInterviewer: false,
          onAnomalyDetected: (anomaly) => {},
        });
      } else {
        setTimeout(startLocalDetection, 1000);
      }
    };

    startLocalDetection();
    return () => {
      stopInterviewFaceDetection();
    };
  }, [detectionActive, isInterviewer, localVideoRef, socketRef, interviewCode]);

  useEffect(() => {
    if (!isInterviewer || !detectionActive || videos.length === 0) return;

    videos.forEach((video) => {
      const videoElement = remoteVideoRefs.current[video.socketId];
      const canvasElement = remoteCanvasRefs.current[video.socketId];

      if (videoElement && canvasElement) {
        const startRemoteDetection = () => {
          if (videoElement.readyState >= 2 && videoElement.videoWidth > 0) {
            setupFaceDetectionCanvas(videoElement, canvasElement);
            startInterviewFaceDetection({
              videoElement,
              canvasElement,
              socketRef,
              interviewCode,
              isInterviewer: true,
              onAnomalyDetected: (anomaly) => {},
            });
          } else {
            setTimeout(startRemoteDetection, 1000);
          }
        };
        startRemoteDetection();
      }
    });

    return () => {
      stopInterviewFaceDetection();
    };
  }, [videos, isInterviewer, detectionActive, socketRef, interviewCode]);

  const handleVideoError = (e, videoId) => {};
  const handleVideoLoadedData = (e, videoId) => {};

  return (
    <div className="bg-gray-900 rounded-lg overflow-hidden flex gap-2">
      <div className="relative w-1/2">
        <div className="relative bg-gray-800 rounded-lg overflow-hidden aspect-video">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
            onError={(e) => handleVideoError(e, "local")}
            onLoadedData={(e) => handleVideoLoadedData(e, "local")}
          />

          <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
            You {isInterviewer ? "(Interviewer)" : "(Candidate)"}
          </div>
        </div>
      </div>

      <div className="space-y-2 w-1/2">
        {videos.length === 0 ? (
          <div className="bg-gray-800 rounded-lg aspect-video flex items-center justify-center">
            <div className="text-center text-gray-400">
              <div className="text-4xl mb-2">👤</div>
              <p>
                Waiting for {isInterviewer ? "candidate" : "interviewer"} to
                join...
              </p>
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
                        videoElement.srcObject = video.stream;
                        videoElement.play().catch((err) => {});
                      }
                    }
                  }}
                  onError={(e) => handleVideoError(e, video.socketId)}
                  onLoadedData={(e) => handleVideoLoadedData(e, video.socketId)}
                />

                {isInterviewer && (
                  <canvas
                    ref={(canvas) => {
                      if (canvas) {
                        remoteCanvasRefs.current[video.socketId] = canvas;
                      }
                    }}
                    className="absolute top-0 left-0 w-full h-full pointer-events-none"
                    style={{ zIndex: 10 }}
                  />
                )}

                <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
                  {isInterviewer ? "Candidate" : "Interviewer"}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
