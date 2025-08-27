import React, { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { useAuth } from "../../context/AuthContext";
import MeetingSetup from "./MeetingSetup";
import MeetingRoom from "./MeetingRoom";
import { connectToSocketServer } from "./utils/socketUtils";
import { getPermissions } from "./utils/mediaUtils";

export default function Meetings() {
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
  const [screenAvailable, setScreenAvailable] = useState();
  const [meetingCode, setMeetingCode] = useState();
  const [meetingState, setMeetingState] = useState("join");
  const [askForMeetingCode, setAskForMeetingCode] = useState(true);
  const [isValidatingCode, setIsValidatingCode] = useState(false);
  const [isCreatingMeeting, setIsCreatingMeeting] = useState(false);
  const [videos, setVideos] = useState([]);
  const [cameraStream, setCameraStream] = useState(null);
  const [screenStream, setScreenStream] = useState(null);

  // Check authentication on component mount
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast.error("Please log in to access meetings");
      return;
    }
  }, [isAuthenticated, isLoading]);

  // Restore meeting state on component mount
  useEffect(() => {
    if (isAuthenticated) {
      const savedMeetingCode = sessionStorage.getItem('currentMeetingCode');
      const savedMeetingState = sessionStorage.getItem('currentMeetingState');
      const inMeeting = sessionStorage.getItem('inMeeting') === 'true';
      
      if (savedMeetingCode && inMeeting) {
        setMeetingCode(savedMeetingCode);
        setMeetingState(savedMeetingState || 'join');
        setVideo(true);
        setAudio(true);
        setAskForMeetingCode(false);
        
        // Reconnect to socket
        connectToSocketServer({
          socketRef,
          socketIdRef,
          meetingCode: savedMeetingCode,
          setVideos,
          videoRef
        });
      }
      
      getPermissions({
        setVideoAvailable,
        setAudioAvailable,
        setScreenAvailable,
        setCameraStream,
        localVideoRef
      });
    }
  }, [isAuthenticated]);

  // Save meeting state when entering a meeting
  const handleJoinMeeting = () => {
    setVideo(true); 
    setAudio(true); 
    setAskForMeetingCode(false);
    
    // Save to sessionStorage
    sessionStorage.setItem('currentMeetingCode', meetingCode);
    sessionStorage.setItem('currentMeetingState', meetingState);
    sessionStorage.setItem('inMeeting', 'true');
    
    connectToSocketServer({
      socketRef,
      socketIdRef,
      meetingCode,
      setVideos,
      videoRef
    });
  };

  // Clear meeting state when leaving
  const handleLeaveMeeting = () => {
    sessionStorage.removeItem('currentMeetingCode');
    sessionStorage.removeItem('currentMeetingState');
    sessionStorage.removeItem('inMeeting');
    setAskForMeetingCode(true);
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  // Show login message if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl mb-4">Authentication Required</h1>
          <p>Please log in to access meetings.</p>
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
        {askForMeetingCode ? (
          <MeetingSetup
            meetingCode={meetingCode}
            setMeetingCode={setMeetingCode}
            meetingState={meetingState}
            setMeetingState={setMeetingState}
            isValidatingCode={isValidatingCode}
            setIsValidatingCode={setIsValidatingCode}
            isCreatingMeeting={isCreatingMeeting}
            setIsCreatingMeeting={setIsCreatingMeeting}
            localVideoRef={localVideoRef}
            onJoinMeeting={handleJoinMeeting}
          />
        ) : (
          <MeetingRoom
            meetingCode={meetingCode}
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
            onLeaveMeeting={handleLeaveMeeting}
          />
        )}
      </div>
    </div>
  );
}