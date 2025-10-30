import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../../context/AuthContext";
import InterviewSetup from "./InterviewSetup";
import InterviewRoom from "./InterviewRoom";
import { connectToInterviewSocketServer } from "./utils/socketUtils";
import { getPermissions } from "./utils/mediaUtils"; // Add this import

export default function Interviews() {
  const { isAuthenticated, isLoading, userData } = useAuth();
  const navigate = useNavigate();

  const socketRef = useRef();
  const socketIdRef = useRef();
  const localVideoRef = useRef();
  const videoRef = useRef();

  const [videoAvailable, setVideoAvailable] = useState(true);
  const [audioAvailable, setAudioAvailable] = useState(true);
  const [video, setVideo] = useState(false);
  const [audio, setAudio] = useState(false);
  const [interviewCode, setInterviewCode] = useState();
  const [interviewState, setInterviewState] = useState("join");
  const [askForInterviewCode, setAskForInterviewCode] = useState(true);
  const [isValidatingCode, setIsValidatingCode] = useState(false);
  const [isCreatingInterview, setIsCreatingInterview] = useState(false);
  const [videos, setVideos] = useState([]);
  const [cameraStream, setCameraStream] = useState(null);
  const [anomalies, setAnomalies] = useState([]);

  const userName = userData?.username || userData?.email?.split('@')[0] || 'Anonymous';

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast.error("Please log in to access interviews");
      return;
    }
  }, [isAuthenticated, isLoading]);

  // Add permissions check like meetings
  useEffect(() => {
    if (isAuthenticated) {
      const savedInterviewCode = sessionStorage.getItem("currentInterviewCode");
      const savedInterviewState = sessionStorage.getItem("currentInterviewState");
      const inInterview = sessionStorage.getItem("inInterview") === "true";

      if (savedInterviewCode && inInterview) {
        setInterviewCode(savedInterviewCode);
        setInterviewState(savedInterviewState || "join");
        setVideo(true);
        setAudio(true);
        setAskForInterviewCode(false);

        connectToInterviewSocketServer({
          socketRef,
          socketIdRef,
          interviewCode: savedInterviewCode,
          setVideos,
          videoRef,
          setAnomalies,
          userName, // ✅ ADD THIS
        });
      }

      getPermissions({
        setVideoAvailable,
        setAudioAvailable,
        setCameraStream,
        localVideoRef
      });
    }
  }, [isAuthenticated, userName]); // ✅ ADD userName

  const handleJoinInterview = () => {
    setVideo(true);
    setAudio(true);
    setAskForInterviewCode(false);

    sessionStorage.setItem("currentInterviewCode", interviewCode);
    sessionStorage.setItem("currentInterviewState", interviewState);
    sessionStorage.setItem("inInterview", "true");

    connectToInterviewSocketServer({
      socketRef,
      socketIdRef,
      interviewCode,
      setVideos,
      videoRef,
      setAnomalies,
      userName, // ✅ ADD THIS
    });
  };

  const handleLeaveInterview = () => {
    // Clear all session storage
    sessionStorage.removeItem('currentInterviewCode');
    sessionStorage.removeItem('currentInterviewState');
    sessionStorage.removeItem('inInterview');
    setAskForInterviewCode(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl mb-4">Authentication Required</h1>
          <p>Please log in to access interviews.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full relative bg-black">
      {/* Same background as Layout */}
      <div
        className="fixed inset-0 z-0"
        style={{
          background: `
            radial-gradient(ellipse 120% 80% at 70% 20%, rgba(255, 20, 147, 0.15), transparent 50%),
            radial-gradient(ellipse 100% 60% at 30% 10%, rgba(0, 255, 255, 0.12), transparent 60%),
            radial-gradient(ellipse 90% 70% at 50% 0%, rgba(138, 43, 226, 0.18), transparent 65%),
            radial-gradient(ellipse 110% 50% at 80% 30%, rgba(255, 215, 0, 0.08), transparent 40%),
            #000000
          `,
        }}
      />

      {/* Content Layer */}
      <div className="relative z-10 min-h-screen">
        {askForInterviewCode ? (
          <InterviewSetup
            interviewCode={interviewCode}
            setInterviewCode={setInterviewCode}
            interviewState={interviewState}
            setInterviewState={setInterviewState}
            isValidatingCode={isValidatingCode}
            setIsValidatingCode={setIsValidatingCode}
            isCreatingInterview={isCreatingInterview}
            setIsCreatingInterview={setIsCreatingInterview}
            localVideoRef={localVideoRef}
            onJoinInterview={handleJoinInterview}
          />
        ) : (
          <InterviewRoom
            interviewCode={interviewCode}
            localVideoRef={localVideoRef}
            videos={videos}
            video={video}
            setVideo={setVideo}
            audio={audio}
            setAudio={setAudio}
            cameraStream={cameraStream}
            setCameraStream={setCameraStream}
            videoAvailable={videoAvailable}
            audioAvailable={audioAvailable}
            socketRef={socketRef}
            socketIdRef={socketIdRef}
            anomalies={anomalies}
            setAnomalies={setAnomalies}
            onLeaveInterview={handleLeaveInterview}
            interviewState={interviewState}
          />
        )}
      </div>
    </div>
  );
}
