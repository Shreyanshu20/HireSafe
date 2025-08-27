import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import InterviewControls from "./InterviewControls";
import VideoGrid from "./VideoGrid";
import ChatModal from "./ChatModal";
import CodeEditor from "./CodeEditor";
import InterviewDashboard from "./InterviewDashboard"; // Add this import
import { handleEndCall } from "./utils/mediaUtils";
import { sendCodeChange, sendInterviewMessage, sendOutputChange } from "./utils/socketUtils";

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
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [newMessage, setNewMessage] = useState(0);
  const [codeContent, setCodeContent] = useState(`console.log("Hello World!");`);
  const [selectedLanguage, setSelectedLanguage] = useState("javascript");
  const [userRole, setUserRole] = useState("candidate");
  
  // Refs to prevent unnecessary re-renders
  const codeChangeTimeoutRef = useRef(null);
  const lastCodeChangeRef = useRef("");
  const isUpdatingFromSocketRef = useRef(false);

  // Memoized handlers to prevent re-renders
  const handleCodeChange = useCallback((data) => {
    if (data.code !== undefined && !isUpdatingFromSocketRef.current) {
      isUpdatingFromSocketRef.current = true;
      setCodeContent(data.code);
      lastCodeChangeRef.current = data.code;
      
      // Reset flag after a short delay
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

  const handleInterviewMessage = useCallback((message, sender, socketIdSender) => {
    setMessages((prevMessages) => [
      ...prevMessages,
      { sender: sender, data: message },
    ]);
    if (socketIdSender !== socketIdRef.current) {
      setNewMessage((prevNewMessage) => prevNewMessage + 1);
    }
  }, [socketIdRef]);

  useEffect(() => {
    if (socketRef.current) {
      // Remove existing listeners
      socketRef.current.off("interview-chat-message");
      socketRef.current.off("malpractice-detected");
      socketRef.current.off("code-change");
      socketRef.current.off("language-change");

      // Add new listeners
      socketRef.current.on("interview-chat-message", handleInterviewMessage);
      socketRef.current.on("code-change", handleCodeChange);
      socketRef.current.on("language-change", handleLanguageChange);

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
        socketRef.current.off("malpractice-detected");
      }
    };
  }, [socketRef, userRole, handleInterviewMessage, handleCodeChange, handleLanguageChange, socketIdRef]);

  useEffect(() => {
    if (interviewState === "create") {
      setUserRole("interviewer");
    } else {
      setUserRole("candidate");
    }
  }, [interviewState]);

  const onCodeEdit = useCallback((newCode) => {
    // Prevent loop if this update came from socket
    if (isUpdatingFromSocketRef.current || newCode === lastCodeChangeRef.current) {
      return;
    }

    setCodeContent(newCode);
    lastCodeChangeRef.current = newCode;

    // Debounce code changes to prevent too many socket emissions
    if (codeChangeTimeoutRef.current) {
      clearTimeout(codeChangeTimeoutRef.current);
    }

    codeChangeTimeoutRef.current = setTimeout(() => {
      sendCodeChange(socketRef, newCode, selectedLanguage, interviewCode);
    }, 500); // 500ms debounce
  }, [socketRef, selectedLanguage, interviewCode]);

  const onLanguageChange = useCallback((newLanguage) => {
    setSelectedLanguage(newLanguage);
    if (socketRef.current) {
      socketRef.current.emit("language-change", {
        language: newLanguage,
      });
    }
  }, [socketRef]);

  const sendMessage = useCallback(() => {
    if (message.trim()) {
      sendInterviewMessage(socketRef, message, "You");
      setMessage("");
    }
  }, [message, socketRef]);

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

  const onEndCall = useCallback(() => {
    if (codeChangeTimeoutRef.current) {
      clearTimeout(codeChangeTimeoutRef.current);
    }
    
    // Use the same handleEndCall as meetings
    handleEndCall({ cameraStream, screenStream: null, socketRef });
    onLeaveInterview();
  }, [cameraStream, socketRef, onLeaveInterview]); // Add navigate to dependencies

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (codeChangeTimeoutRef.current) {
        clearTimeout(codeChangeTimeoutRef.current);
      }
    };
  }, []);

  const onOutputChange = useCallback((newOutput) => {
    sendOutputChange(socketRef, newOutput, interviewCode);
  }, [socketRef, interviewCode]);

  return (
    <div className="h-screen flex flex-col p-4">
      {/* Header */}
      <div className="mb-4 flex justify-between items-center">
        <div>
          <strong className="text-white">Interview Code: {interviewCode}</strong>
          <span className="ml-4 text-sm text-gray-400">
            Role: {userRole === "interviewer" ? "Interviewer" : "Candidate"}
          </span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex gap-4">
        {/* Left Column - Code Editor */}
        <div className="w-1/2">
          <CodeEditor
            value={codeContent}
            onChange={onCodeEdit}
            language={selectedLanguage}
            onLanguageChange={onLanguageChange}
            onOutputChange={onOutputChange}
            height="400px"
            theme="vs-dark"
          />
        </div>

        {/* Right Column */}
        <div className="w-1/2 flex flex-col gap-4">
          {/* Video Grid */}
          <div>
            <VideoGrid
              localVideoRef={localVideoRef}
              videos={videos}
              socketRef={socketRef}
              interviewCode={interviewCode}
              isInterviewer={userRole === "interviewer"}
              onAnomalyDetected={(anomaly) => {}}
            />
          </div>

          {/* Anomaly Dashboard - Only for interviewers */}
          {userRole === "interviewer" && (
            <div className="flex-1">
              <InterviewDashboard
                anomalies={anomalies}
                userRole={userRole}
              />
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="mt-4">
        <InterviewControls
          video={video}
          setVideo={setVideo}
          audio={audio}
          setAudio={setAudio}
          newMessage={newMessage}
          onOpenChat={openChat}
          onEndCall={onEndCall}
          videoAvailable={videoAvailable}
          audioAvailable={audioAvailable}
          cameraStream={cameraStream}
          setCameraStream={setCameraStream}
          socketRef={socketRef}
          socketIdRef={socketIdRef}
          localVideoRef={localVideoRef}
        />
      </div>

      {/* Chat Modal */}
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
