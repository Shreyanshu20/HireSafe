import React, { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { useAuth } from "../../context/AuthContext";
import { connectToSocketServer } from "../Meetings/utils/socketUtils";
import { getInterviewPermissions, getInterviewUserMedia } from "./utils/interviewUtils"; // ✅ Use interview utils
import InterviewSetup from "./InterviewSetup";
import InterviewRoom from "./InterviewRoom";

export default function Interview() {
  const { isAuthenticated, isLoading } = useAuth();
  
  const socketRef = useRef();
  const socketIdRef = useRef();
  const localVideoRef = useRef();
  const videoRef = useRef();

  const [videoAvailable, setVideoAvailable] = useState(true);
  const [audioAvailable, setAudioAvailable] = useState(true);
  const [video, setVideo] = useState(false);
  const [audio, setAudio] = useState(false);
  const [meetingCode, setMeetingCode] = useState();
  const [meetingState, setMeetingState] = useState("join");
  const [askForMeetingCode, setAskForMeetingCode] = useState(true);
  const [isValidatingCode, setIsValidatingCode] = useState(false);
  const [isCreatingMeeting, setIsCreatingMeeting] = useState(false);
  const [videos, setVideos] = useState([]);
  const [cameraStream, setCameraStream] = useState(null);
  const [meetingData, setMeetingData] = useState(null);

  // Check authentication
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast.error("Please log in to access interviews");
      return;
    }
  }, [isAuthenticated, isLoading]);

  // Restore interview state on component mount
  useEffect(() => {
    if (isAuthenticated) {
      const savedInterviewCode = sessionStorage.getItem('currentInterviewCode');
      const savedInterviewState = sessionStorage.getItem('currentInterviewState');
      const inInterview = sessionStorage.getItem('inInterview') === 'true';
      
      if (savedInterviewCode && inInterview) {
        setMeetingCode(savedInterviewCode);
        setMeetingState(savedInterviewState || 'join');
        setVideo(true);
        setAudio(true);
        setAskForMeetingCode(false);
        
        // Reconnect to socket
        connectToSocketServer({
          socketRef,
          socketIdRef,
          meetingCode: savedInterviewCode,
          setVideos,
          videoRef
        });
      }
      
      // ✅ Use interview permissions (includes face detection initialization)
      getInterviewPermissions({
        setVideoAvailable,
        setAudioAvailable,
        setScreenAvailable: () => {}, // Not needed for interviews
        setCameraStream,
        localVideoRef
      });
    }
  }, [isAuthenticated]);

  // ✅ Use interview getUserMedia
  useEffect(() => {
    if (video !== undefined && audio !== undefined && !askForMeetingCode) {
      getInterviewUserMedia({
        video,
        audio,
        videoAvailable,
        audioAvailable,
        cameraStream,
        setCameraStream,
        screen: false, // No screen sharing in interviews
        screenStream: null,
        socketRef,
        socketIdRef,
        localVideoRef
      });
    }
  }, [audio, video, askForMeetingCode]);

  const handleJoinInterview = (meetingInfo) => {
    setVideo(true);
    setAudio(true);
    setAskForMeetingCode(false);
    setMeetingData(meetingInfo);
    
    // Save to sessionStorage
    sessionStorage.setItem('currentInterviewCode', meetingCode);
    sessionStorage.setItem('currentInterviewState', meetingState);
    sessionStorage.setItem('inInterview', 'true');
    
    connectToSocketServer({
      socketRef,
      socketIdRef,
      meetingCode,
      setVideos,
      videoRef
    });
  };

  const handleLeaveInterview = () => {
    sessionStorage.removeItem('currentInterviewCode');
    sessionStorage.removeItem('currentInterviewState');
    sessionStorage.removeItem('inInterview');
    setAskForMeetingCode(true);
    setMeetingData(null);
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
      {askForMeetingCode ? (
        <div className="min-h-screen">
          <InterviewSetup
            meetingCode={meetingCode}
            setMeetingCode={setMeetingCode}
            meetingState={meetingState}
            setMeetingState={setMeetingState}
            isValidatingCode={isValidatingCode}
            setIsValidatingCode={setIsValidatingCode}
            isCreatingMeeting={isCreatingMeeting}
            setIsCreatingMeeting={setIsCreatingMeeting}
            localVideoRef={localVideoRef}
            onJoinInterview={handleJoinInterview}
          />
        </div>
      ) : (
        <InterviewRoom
          meetingCode={meetingCode}
          meetingData={meetingData}
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
          onLeaveInterview={handleLeaveInterview}
        />
      )}
    </>
  );
}
