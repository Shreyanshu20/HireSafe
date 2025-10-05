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
  video, // ✅ ADD video prop for camera state
  audio, // ✅ ADD audio prop for mic state
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
      console.log("🧹 VideoGrid cleanup - stopping face detection");
      stopInterviewFaceDetection();
      setDetectionActive(false);

      // Clear any remaining video streams
      Object.values(remoteVideoRefs.current).forEach((videoElement) => {
        if (videoElement && videoElement.srcObject) {
          const tracks = videoElement.srcObject.getTracks();
          tracks.forEach((track) => {
            console.log(`Stopping remote video ${track.kind} track`);
            track.stop();
          });
          videoElement.srcObject = null;
        }
      });
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
    <div className="bg-slate-900/30 rounded-2xl border border-white/10 p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Local Video (You) */}
        <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-800/50 border border-white/5">
          {!video ? (
            // ✅ YOUR CAMERA IS OFF - Show placeholder like meetings
            <div className="w-full h-full bg-slate-800 flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-slate-700/80 flex items-center justify-center mb-3">
                <i className="fa-solid fa-user text-slate-400 text-xl"></i>
              </div>
              <div className="text-slate-300 text-sm font-medium">
                You {isInterviewer ? "(Interviewer)" : "(Candidate)"}
              </div>
              <div className="text-slate-400 text-xs mt-1">Camera off</div>
            </div>
          ) : (
            // ✅ YOUR CAMERA IS ON - Show video
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
              onError={(e) => handleVideoError(e, "local")}
              onLoadedData={(e) => handleVideoLoadedData(e, "local")}
            />
          )}

          {/* ✅ FIXED: Your Name Badge - Perfect rectangle */}
          <div className="absolute bottom-2 left-2 bg-slate-900/80 backdrop-blur px-2 py-1 rounded">
            <span className="text-white text-xs font-medium leading-none">
              You {isInterviewer ? "(Interviewer)" : "(Candidate)"}
            </span>
          </div>

          {/* ✅ YOUR STATUS ICONS - Like meetings */}
          <div className="absolute bottom-2 right-2 flex gap-1">
            {!audio && (
              <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
                <i className="fa-solid fa-microphone-slash text-white text-xs"></i>
              </div>
            )}
            {!video && (
              <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
                <i className="fa-solid fa-video-slash text-white text-xs"></i>
              </div>
            )}
          </div>
        </div>

        {/* Remote Video (Other Person) */}
        <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-800/50 border border-white/5">
          {videos.length === 0 ? (
            // ✅ NO ONE HAS JOINED YET
            <div className="w-full h-full bg-slate-800 flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-slate-700/80 flex items-center justify-center mb-3">
                <i className="fa-solid fa-user-plus text-slate-400 text-xl"></i>
              </div>
              <div className="text-slate-300 text-sm font-medium">
                {isInterviewer ? "Candidate" : "Interviewer"}
              </div>
              <div className="text-slate-400 text-xs mt-1">Waiting to join...</div>
            </div>
          ) : (
            videos.map((videoData) => (
              <React.Fragment key={videoData.socketId}>
                {videoData.isCameraOff ? (
                  // ✅ REMOTE CAMERA IS OFF - Show placeholder like meetings
                  <div className="w-full h-full bg-slate-800 flex flex-col items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-slate-700/80 flex items-center justify-center mb-3">
                      <i className="fa-solid fa-user text-slate-400 text-xl"></i>
                    </div>
                    <div className="text-slate-300 text-sm font-medium">
                      {isInterviewer ? "Candidate" : "Interviewer"}
                    </div>
                    <div className="text-slate-400 text-xs mt-1">Camera off</div>
                  </div>
                ) : (
                  // ✅ REMOTE CAMERA IS ON - Show video
                  <video
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                    data-socket-id={videoData.socketId}
                    ref={(videoElement) => {
                      if (videoElement) {
                        remoteVideoRefs.current[videoData.socketId] = videoElement;
                        if (videoData.stream) {
                          videoElement.srcObject = videoData.stream;
                          videoElement.play().catch((err) => {});
                        }
                      }
                    }}
                    onError={(e) => handleVideoError(e, videoData.socketId)}
                    onLoadedData={(e) => handleVideoLoadedData(e, videoData.socketId)}
                  />
                )}

                {/* Face Detection Canvas - Only for interviewer watching candidate */}
                {isInterviewer && !videoData.isCameraOff && (
                  <canvas
                    ref={(canvas) => {
                      if (canvas) {
                        remoteCanvasRefs.current[videoData.socketId] = canvas;
                      }
                    }}
                    className="absolute top-0 left-0 w-full h-full pointer-events-none"
                    style={{ zIndex: 10 }}
                  />
                )}

                {/* ✅ FIXED: Remote Name Badge - Perfect rectangle */}
                <div className="absolute bottom-2 left-2 bg-slate-900/80 backdrop-blur px-2 py-1 rounded">
                  <span className="text-white text-xs font-medium leading-none">
                    {isInterviewer ? "Candidate" : "Interviewer"}
                  </span>
                </div>

                {/* ✅ REMOTE STATUS ICONS - Always show when user has joined */}
                <div className="absolute bottom-2 right-2 flex gap-1">
                  {videoData.isMuted && (
                    <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
                      <i className="fa-solid fa-microphone-slash text-white text-xs"></i>
                    </div>
                  )}
                  {videoData.isCameraOff && (
                    <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
                      <i className="fa-solid fa-video-slash text-white text-xs"></i>
                    </div>
                  )}
                </div>
              </React.Fragment>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
