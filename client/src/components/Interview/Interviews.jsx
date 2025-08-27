import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../../context/AuthContext";
import InterviewSetup from "./InterviewSetup";
import InterviewRoom from "./InterviewRoom";
import { connectToInterviewSocketServer } from "./utils/socketUtils";
import { getPermissions } from "./utils/mediaUtils"; // Add this import

export default function Interviews() {
  const { isAuthenticated, isLoading } = useAuth();
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
        });
      }

      // Get permissions like meetings do
      getPermissions({
        setVideoAvailable,
        setAudioAvailable,
        setCameraStream,
        localVideoRef
      });
    }
  }, [isAuthenticated]);

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
    <>
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
    </>
  );
}
