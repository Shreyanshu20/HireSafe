import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import InterviewControls from "./InterviewControls";
import VideoGrid from "./VideoGrid";
import ChatModal from "./ChatModal";
import { handleEndCall } from "./utils/mediaUtils";
import { sendCodeChange, sendInterviewMessage } from "./utils/socketUtils";

export default function InterviewRoom({
  interviewCode,
  localVideoRef,
  videos,
  video,
  setVideo,
  audio,
  setAudio,
  screen,
  setScreen,
  screenStream,
  setScreenStream,
  cameraStream,
  setCameraStream,
  videoAvailable,
  audioAvailable,
  socketRef,
  socketIdRef,
  anomalies,
  setAnomalies,
  onLeaveInterview,
  interviewState, // Add this prop
}) {
  const [showModal, setShowModal] = useState(false);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [newMessage, setNewMessage] = useState(0);
  const [codeContent, setCodeContent] = useState(`// Welcome to the interview
function solve() {
    // Write your solution here
    
}`);
  const [selectedLanguage, setSelectedLanguage] = useState("javascript");
  const [userRole, setUserRole] = useState("interviewee"); // Default to interviewee

  // Set up chat message listener
  useEffect(() => {
    if (socketRef.current) {
      // Use INTERVIEW-specific chat event
      socketRef.current.on("interview-chat-message", addMessage);
    }

    // Set up global handlers for code synchronization
    window.handleCodeChange = (data) => {
      if (data.code !== undefined) {
        setCodeContent(data.code);
      }
    };

    window.handleLanguageChange = (data) => {
      if (data.language !== undefined) {
        setSelectedLanguage(data.language);
      }
    };

    return () => {
      if (socketRef.current) {
        socketRef.current.off("interview-chat-message", addMessage);
      }
      // Clean up global handlers
      delete window.handleCodeChange;
      delete window.handleLanguageChange;
    };
  }, [socketRef]);

  // Add this useEffect to determine user role
  useEffect(() => {
    // Determine role based on interview state or session data
    if (interviewState === "create") {
      setUserRole("interviewer");
    } else {
      setUserRole("interviewee");
    }
  }, [interviewState]);

  const addMessage = (data, sender, socketIdSender) => {
    setMessages((prevMessages) => [
      ...prevMessages,
      { sender: sender, data: data },
    ]);
    if (socketIdSender !== socketIdRef.current) {
      setNewMessage((prevNewMessage) => prevNewMessage + 1);
    }
  };

  const onCodeEdit = (newCode) => {
    setCodeContent(newCode);
    // Send code change to other participants
    sendCodeChange(socketRef, newCode, selectedLanguage, interviewCode);
  };

  const onLanguageChange = (newLanguage) => {
    setSelectedLanguage(newLanguage);
    // Send language change to other participants
    if (socketRef.current) {
      socketRef.current.emit("language-change", {
        language: newLanguage,
      });
    }
  };

  const sendMessage = () => {
    if (message.trim()) {
      sendInterviewMessage(socketRef, message, "You");
      setMessage("");
    }
  };

  const openChat = () => {
    setShowModal(true);
    setNewMessage(0);
  };

  const closeChat = () => {
    setShowModal(false);
  };

  const handleMessage = (e) => {
    setMessage(e.target.value);
  };

  const onEndCall = () => {
    handleEndCall({ cameraStream, screenStream, socketRef });
    onLeaveInterview();
  };

  return (
    <>
      <div className="mb-4">
        <strong>Interview Code: {interviewCode}</strong>
      </div>

      {/* Main Layout: Code Editor on Left, Videos on Right */}
      <div className="flex gap-4 mb-4">
        {/* Code Editor - Left Side */}
        <div className="w-1/2">
          <div className="bg-gray-900 rounded-lg border border-gray-700">
            <div className="flex items-center justify-between p-3 border-b border-gray-700">
              <h3 className="text-white text-sm font-medium">Code Editor</h3>
              <div className="flex items-center space-x-2">
                <select
                  value={selectedLanguage}
                  onChange={(e) => onLanguageChange(e.target.value)}
                  className="bg-gray-800 text-white text-xs rounded px-2 py-1 border border-gray-600"
                >
                  <option value="javascript">JavaScript</option>
                  <option value="python">Python</option>
                  <option value="java">Java</option>
                  <option value="cpp">C++</option>
                </select>
                <button className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1 rounded">
                  Run
                </button>
              </div>
            </div>

            <div className="p-4">
              <textarea
                value={codeContent}
                onChange={(e) => onCodeEdit(e.target.value)}
                className="w-full h-[400px] bg-gray-800 text-white text-sm font-mono resize-none border-none outline-none"
                style={{ fontFamily: "Monaco, Consolas, monospace" }}
                placeholder="// Start coding here..."
              />
            </div>
          </div>
        </div>

        {/* Video Grid - Right Side */}
        <div className="w-1/2">
          <VideoGrid
            localVideoRef={localVideoRef}
            videos={videos}
            screen={screen}
            screenStream={screenStream}
            socketRef={socketRef}
            interviewCode={interviewCode}
            isInterviewer={userRole === "interviewer"}
            onAnomalyDetected={(anomaly) => {
              // Handle anomaly detection locally if needed
              console.log("Anomaly detected locally:", anomaly);
            }}
          />
        </div>
      </div>

      {/* Anomaly Reports - Below Videos */}
      <div className="mb-4">
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-white text-lg font-medium mb-3">
            Live Anomaly Feed
          </h3>
          <div className="max-h-32 overflow-y-auto">
            {anomalies.length === 0 ? (
              <p className="text-gray-400 text-sm">No anomalies detected</p>
            ) : (
              anomalies
                .slice(-5)
                .reverse()
                .map((anomaly) => (
                  <div
                    key={anomaly.id}
                    className="text-sm text-white mb-2 p-2 bg-gray-700 rounded"
                  >
                    <span className="text-red-400">{anomaly.timestamp}</span> -
                    <span className="text-yellow-400 ml-1">
                      {anomaly.type.replace("_", " ").toUpperCase()}
                    </span>
                    <span className="text-gray-300 ml-1">
                      (Confidence: {(anomaly.confidence * 100).toFixed(1)}%)
                    </span>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>

      <InterviewControls
        video={video}
        setVideo={setVideo}
        audio={audio}
        setAudio={setAudio}
        screen={screen}
        setScreen={setScreen}
        newMessage={newMessage}
        onOpenChat={openChat}
        onEndCall={onEndCall}
        videoAvailable={videoAvailable}
        audioAvailable={audioAvailable}
        screenStream={screenStream}
        setScreenStream={setScreenStream}
        cameraStream={cameraStream}
        setCameraStream={setCameraStream}
        socketRef={socketRef}
        socketIdRef={socketIdRef}
        localVideoRef={localVideoRef}
      />

      {showModal && (
        <ChatModal
          messages={messages}
          message={message}
          onMessageChange={handleMessage}
          onSendMessage={sendMessage}
          onClose={closeChat}
        />
      )}
    </>
  );
}
