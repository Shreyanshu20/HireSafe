import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { toast } from "react-toastify";
import InterviewControls from "./InterviewControls";
import VideoGrid from "./VideoGrid";
import ChatModal from "./ChatModal";
import CodeEditor from "./CodeEditor";
import InterviewDashboard from "./InterviewDashboard";
import { handleEndCall } from "./utils/mediaUtils";
import { sendCodeChange, sendInterviewMessage, sendOutputChange } from "./utils/socketUtils";
import { useAuth } from "../../context/AuthContext"; // ✅ ADD THIS

export default function InterviewRoom({
  interviewCode,
  localVideoRef,
  videos,
  video,
  setVideo,
  audio,
  setAudio,
  cameraStream,
  setCameraStream,
  videoAvailable,
  audioAvailable,
  socketRef,
  socketIdRef,
  anomalies,
  setAnomalies,
  onLeaveInterview,
  interviewState,
}) {
  const { userData } = useAuth(); // ✅ CHANGE: user -> userData
  const [showModal, setShowModal] = useState(false);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [newMessage, setNewMessage] = useState(0);
  const [codeContent, setCodeContent] = useState(`console.log("Hello World!");`);
  const [selectedLanguage, setSelectedLanguage] = useState("javascript");
  const [codeOutput, setCodeOutput] = useState("");
  const [userRole, setUserRole] = useState("candidate");
  
  const codeChangeTimeoutRef = useRef(null);
  const lastCodeChangeRef = useRef("");
  const isUpdatingFromSocketRef = useRef(false);
  const isUpdatingOutputFromSocketRef = useRef(false);

  // ✅ CHANGE: user?.username -> userData?.username
  const userName = userData?.username || userData?.email?.split('@')[0] || 'Anonymous';

  // ✅ STYLED: Add participant count like meetings
  const participants = useMemo(() => {
    const remoteParticipants = videos.filter(video => 
      video.stream && video.socketId && video.stream.getTracks().length > 0
    ).length;
    return 1 + remoteParticipants;
  }, [videos]);

  // Memoized handlers to prevent re-renders (keep existing functionality)
  const handleCodeChange = useCallback((data) => {
    if (data.code !== undefined && !isUpdatingFromSocketRef.current) {
      isUpdatingFromSocketRef.current = true;
      setCodeContent(data.code);
      lastCodeChangeRef.current = data.code;
      
      setTimeout(() => {
        isUpdatingFromSocketRef.current = false;
      }, 100);
    }
  }, []);

  const handleLanguageChange = useCallback((data) => {
    if (data.language !== undefined) {
      setSelectedLanguage(data.language);
    }
  }, []);

  const handleOutputChange = useCallback((data) => {
    if (data.output !== undefined && !isUpdatingOutputFromSocketRef.current) {
      isUpdatingOutputFromSocketRef.current = true;
      setCodeOutput(data.output);
      
      setTimeout(() => {
        isUpdatingOutputFromSocketRef.current = false;
      }, 100);
    }
  }, []);

  // ✅ RECEIVE MESSAGE: Show "You" only for your own messages
  const handleInterviewMessage = useCallback((message, sender, socketIdSender) => {
    console.log("📥 RECEIVED INTERVIEW MESSAGE:", { message, sender, socketIdSender, mySocketId: socketIdRef.current });
    setMessages((prevMessages) => [
      ...prevMessages,
      { 
        sender: socketIdSender === socketIdRef.current ? "You" : sender,
        data: message 
      },
    ]);
    if (socketIdSender !== socketIdRef.current) {
      setNewMessage((prevNewMessage) => prevNewMessage + 1);
    }
  }, [socketIdRef]);

  useEffect(() => {
    if (socketRef.current) {
      socketRef.current.off("interview-chat-message");
      socketRef.current.off("malpractice-detected");
      socketRef.current.off("code-change");
      socketRef.current.off("language-change");
      socketRef.current.off("output-change");

      socketRef.current.on("interview-chat-message", handleInterviewMessage);
      socketRef.current.on("code-change", handleCodeChange);
      socketRef.current.on("language-change", handleLanguageChange);
      socketRef.current.on("output-change", handleOutputChange);

      if (userRole === "interviewer") {
        socketRef.current.on("malpractice-detected", (data) => {
          if (data.socketId !== socketIdRef.current) {
            setAnomalies((prev) => [
              ...prev,
              {
                id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                type: data.type,
                confidence: data.confidence,
                timestamp: new Date().toLocaleTimeString(),
                description: data.message || data.description,
                rawTimestamp: Date.now(),
              },
            ]);
          }
        });
      }
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.off("interview-chat-message", handleInterviewMessage);
        socketRef.current.off("code-change", handleCodeChange);
        socketRef.current.off("language-change", handleLanguageChange);
        socketRef.current.off("output-change", handleOutputChange);
        socketRef.current.off("malpractice-detected");
      }
    };
  }, [socketRef, userRole, handleInterviewMessage, handleCodeChange, handleLanguageChange, handleOutputChange, socketIdRef]);

  useEffect(() => {
    if (interviewState === "create") {
      setUserRole("interviewer");
    } else {
      setUserRole("candidate");
    }
  }, [interviewState]);

  const onCodeEdit = useCallback((newCode) => {
    if (isUpdatingFromSocketRef.current || newCode === lastCodeChangeRef.current) {
      return;
    }

    setCodeContent(newCode);
    lastCodeChangeRef.current = newCode;

    if (codeChangeTimeoutRef.current) {
      clearTimeout(codeChangeTimeoutRef.current);
    }

    codeChangeTimeoutRef.current = setTimeout(() => {
      sendCodeChange(socketRef, newCode, selectedLanguage, interviewCode);
    }, 500);
  }, [socketRef, selectedLanguage, interviewCode]);

  const onLanguageChange = useCallback((newLanguage) => {
    setSelectedLanguage(newLanguage);
    if (socketRef.current) {
      socketRef.current.emit("language-change", {
        language: newLanguage,
      });
    }
  }, [socketRef]);

  // ✅ SEND MESSAGE: Send actual user name (not "You")
  const sendMessage = useCallback(() => {
    if (message.trim()) {
      console.log("🚀 SENDING INTERVIEW MESSAGE:", { message, userName, socketId: socketIdRef.current });
      sendInterviewMessage(socketRef, message, userName);
      setMessage("");
    }
  }, [message, socketRef, userName, socketIdRef]);

  const openChat = useCallback(() => {
    setShowModal(true);
    setNewMessage(0);
  }, []);

  const closeChat = useCallback(() => {
    setShowModal(false);
  }, []);

  const handleMessage = useCallback((e) => {
    setMessage(e.target.value);
  }, []);

  // ✅ STYLED: Add copy code functionality like meetings
  const copyCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(interviewCode);
      toast.success("Interview code copied");
    } catch {
      toast.info("Could not copy. Long-press to copy.");
    }
  }, [interviewCode]);

  const onEndCall = useCallback(() => {
    if (codeChangeTimeoutRef.current) {
      clearTimeout(codeChangeTimeoutRef.current);
    }
    
    handleEndCall({ cameraStream, screenStream: null, socketRef });
    onLeaveInterview();
    toast.info("You left the interview");
  }, [cameraStream, socketRef, onLeaveInterview]);

  useEffect(() => {
    return () => {
      if (codeChangeTimeoutRef.current) {
        clearTimeout(codeChangeTimeoutRef.current);
      }
    };
  }, []);

  const onOutputChange = useCallback((newOutput) => {
    if (isUpdatingOutputFromSocketRef.current) {
      return;
    }

    setCodeOutput(newOutput);
    sendOutputChange(socketRef, newOutput, interviewCode);
  }, [socketRef, interviewCode]);

  // ✅ STYLED: Memoize props like meetings to prevent re-renders
  const videoGridProps = useMemo(() => ({
    localVideoRef,
    videos,
    socketRef,
    interviewCode,
    isInterviewer: userRole === "interviewer",
    onAnomalyDetected: (anomaly) => {},
    video,
    audio,
    userName // ✅ ADD THIS
  }), [localVideoRef, videos, socketRef, interviewCode, userRole, video, audio, userName]);

  const interviewControlsProps = useMemo(() => ({
    video, setVideo,
    audio, setAudio,
    newMessage,
    onOpenChat: openChat,
    onEndCall,
    videoAvailable,
    audioAvailable,
    cameraStream,
    setCameraStream,
    socketRef,
    socketIdRef,
    localVideoRef
  }), [
    video, setVideo, audio, setAudio, newMessage, openChat, onEndCall,
    videoAvailable, audioAvailable, cameraStream, setCameraStream,
    socketRef, socketIdRef, localVideoRef
  ]);

  return (
    <div className="h-screen flex flex-col">
      {/* ✅ STYLED: Header like meetings */}
      <div className="flex-shrink-0 bg-slate-900/70 backdrop-blur border border-white/10 rounded-xl mx-4 mt-4 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-800 text-slate-200">
            <i className="fa-solid fa-user-tie text-purple-400"></i>
            <span className="font-mono tracking-wider">{interviewCode}</span>
          </span>
          <button
            onClick={copyCode}
            className="px-3 py-1 rounded-lg border border-white/15 text-slate-200 hover:bg-slate-800 transition"
            title="Copy code"
          >
            <i className="fa-solid fa-copy"></i>
          </button>
        </div>

        <div className="text-slate-300 text-sm">
          <i className="fa-solid fa-user-tie mr-2"></i>
          Role: {userRole === "interviewer" ? "Interviewer" : "Candidate"} • {participants} {participants === 1 ? "participant" : "participants"}
        </div>
      </div>

      {/* ✅ STYLED: Main Content Area */}
      <div className="flex-1 min-h-0 flex gap-4 px-4 pb-20">
        {/* Left Column - Code Editor */}
        <div className="w-1/2">
          <CodeEditor
            value={codeContent}
            onChange={onCodeEdit}
            language={selectedLanguage}
            onLanguageChange={onLanguageChange}
            onOutputChange={onOutputChange}
            outputValue={codeOutput}
            height="400px"
            theme="vs-dark"
          />
        </div>

        {/* Right Column */}
        <div className="w-1/2 flex flex-col gap-4 h-full">
          {/* Video Grid */}
          <div className="flex-shrink-0">
            <VideoGrid {...videoGridProps} />
          </div>

          {/* Anomaly Dashboard - Only for interviewers */}
          {userRole === "interviewer" && (
            <div className="flex-1 min-h-0 max-h-96">
              <InterviewDashboard
                anomalies={anomalies}
                userRole={userRole}
              />
            </div>
          )}
        </div>
      </div>

      {/* ✅ STYLED: Floating Controls like meetings */}
      <InterviewControls {...interviewControlsProps} />

      {/* ✅ STYLED: Chat Modal - only render when needed */}
      {showModal && (
        <ChatModal
          messages={messages}
          message={message}
          onMessageChange={handleMessage}
          onSendMessage={sendMessage}
          onClose={closeChat}
        />
      )}
    </div>
  );
}
