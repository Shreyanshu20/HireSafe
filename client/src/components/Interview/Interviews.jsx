import React, { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { useAuth } from "../../context/AuthContext";
import InterviewSetup from "./InterviewSetup";
import InterviewRoom from "./InterviewRoom";
import { connectToInterviewSocketServer } from "./utils/socketUtils";

export default function Interviews() {
  const { isAuthenticated, isLoading } = useAuth();

  const socketRef = useRef();
  const socketIdRef = useRef();
  const localVideoRef = useRef();
  const videoRef = useRef();

  const [videoAvailable, setVideoAvailable] = useState(true);
  const [audioAvailable, setAudioAvailable] = useState(true);
  const [video, setVideo] = useState(false);
  const [audio, setAudio] = useState(false);
  const [screen, setScreen] = useState(false);
  const [screenAvailable, setScreenAvailable] = useState(false);
  const [interviewCode, setInterviewCode] = useState();
  const [interviewState, setInterviewState] = useState("join");
  const [askForInterviewCode, setAskForInterviewCode] = useState(true);
  const [isValidatingCode, setIsValidatingCode] = useState(false);
  const [isCreatingInterview, setIsCreatingInterview] = useState(false);
  const [videos, setVideos] = useState([]);
  const [cameraStream, setCameraStream] = useState(null);
  const [screenStream, setScreenStream] = useState(null);
  const [anomalies, setAnomalies] = useState([]);

  // Check authentication
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast.error("Please log in to access interviews");
      return;
    }
  }, [isAuthenticated, isLoading]);

  // Check permissions and restore state
  useEffect(() => {
    if (isAuthenticated) {
      // Check permissions
      const checkPermissions = async () => {
        try {
          await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true,
          });
          setVideoAvailable(true);
          setAudioAvailable(true);
        } catch (error) {
          console.error("Error accessing media devices:", error);
          setVideoAvailable(false);
          setAudioAvailable(false);
        }

        try {
          // Don't actually start screen share, just check if available
          setScreenAvailable(true);
        } catch (error) {
          setScreenAvailable(false);
        }
      };

      checkPermissions();

      // Restore interview state
      const savedInterviewCode = sessionStorage.getItem("currentInterviewCode");
      const savedInterviewState = sessionStorage.getItem(
        "currentInterviewState"
      );
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
    }
  }, [isAuthenticated]);

  const handleJoinInterview = () => {
    setVideo(true);
    setAudio(true);
    setAskForInterviewCode(false);

    // Save to sessionStorage
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
    sessionStorage.removeItem("currentInterviewCode");
    sessionStorage.removeItem("currentInterviewState");
    sessionStorage.removeItem("inInterview");
    setAskForInterviewCode(true);
    setAnomalies([]);
    setVideo(false);
    setAudio(false);
    setScreen(false);
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
          screen={screen}
          setScreen={setScreen}
          screenStream={screenStream}
          setScreenStream={setScreenStream}
          cameraStream={cameraStream}
          setCameraStream={setCameraStream}
          videoAvailable={videoAvailable}
          audioAvailable={audioAvailable}
          socketRef={socketRef}
          socketIdRef={socketIdRef}
          anomalies={anomalies}
          setAnomalies={setAnomalies}
          onLeaveInterview={handleLeaveInterview}
          interviewState={interviewState} // Add this prop
        />
      )}
    </>
  );
}
