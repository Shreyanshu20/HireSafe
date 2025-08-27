import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom"; // Add this import
import InterviewControls from "./InterviewControls";
import VideoGrid from "./VideoGrid";
import ChatModal from "./ChatModal";
import CodeEditor from "./CodeEditor";
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
  const navigate = useNavigate(); // Add this hook
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

  const getAnomalyInfo = (type) => {
    const anomalyMap = {
      multiple_people: {
        icon: "👥",
        color: "text-red-500",
        severity: "critical",
        category: "Cheating",
        priority: 1,
      },
      candidate_absent: {
        icon: "❌",
        color: "text-red-500",
        severity: "critical",
        category: "Presence",
        priority: 1,
      },
      looking_away_extended: {
        icon: "👀",
        color: "text-orange-500",
        severity: "warning",
        category: "Attention",
        priority: 2,
      },
      suspicious_head_movement: {
        icon: "🔄",
        color: "text-orange-500",
        severity: "warning",
        category: "Behavior",
        priority: 2,
      },
      reading_behavior: {
        icon: "📖",
        color: "text-orange-500",
        severity: "warning",
        category: "Cheating",
        priority: 2,
      },
      eyes_closed_extended: {
        icon: "😴",
        color: "text-yellow-500",
        severity: "moderate",
        category: "Attention",
        priority: 3,
      },
      high_stress_detected: {
        icon: "😰",
        color: "text-yellow-500",
        severity: "moderate",
        category: "Behavior",
        priority: 3,
      },
      candidate_too_far: {
        icon: "📏",
        color: "text-blue-500",
        severity: "minor",
        category: "Technical",
        priority: 4,
      },
      candidate_too_close: {
        icon: "🔍",
        color: "text-blue-500",
        severity: "minor",
        category: "Technical",
        priority: 4,
      },
      poor_video_quality: {
        icon: "📹",
        color: "text-gray-500",
        severity: "minor",
        category: "Technical",
        priority: 4,
      },
      poor_lighting: {
        icon: "💡",
        color: "text-gray-500",
        severity: "minor",
        category: "Technical",
        priority: 4,
      },
      age_verification_concern: {
        icon: "🆔",
        color: "text-purple-500",
        severity: "moderate",
        category: "Identity",
        priority: 3,
      },
      no_movement_detected: {
        icon: "⏸️",
        color: "text-red-500",
        severity: "critical",
        category: "Presence",
        priority: 1,
      },
    };

    return (
      anomalyMap[type] || {
        icon: "⚠️",
        color: "text-gray-500",
        severity: "minor",
        category: "Unknown",
        priority: 5,
      }
    );
  };

  const getSeverityCounts = () => {
    const counts = {
      critical: 0,
      warning: 0,
      moderate: 0,
      minor: 0,
    };

    anomalies.forEach((anomaly) => {
      const info = getAnomalyInfo(anomaly.type);
      counts[info.severity] = (counts[info.severity] || 0) + 1;
    });

    return counts;
  };

  const sortedAnomalies = [...anomalies]
    .sort((a, b) => {
      const timeA = a.rawTimestamp || 0;
      const timeB = b.rawTimestamp || 0;

      if (timeA !== timeB) {
        return timeB - timeA;
      }

      const aInfo = getAnomalyInfo(a.type);
      const bInfo = getAnomalyInfo(b.type);
      return aInfo.priority - bInfo.priority;
    })
    .slice(0, 10);

  const severityCounts = getSeverityCounts();

  const onOutputChange = useCallback((newOutput) => {
    sendOutputChange(socketRef, newOutput, interviewCode);
  }, [socketRef, interviewCode]);

  return (
    <>
      <div className="mb-4 flex justify-between items-center">
        <div>
          <strong>Interview Code: {interviewCode}</strong>
          <span className="ml-4 text-sm text-gray-600">
            Role: {userRole === "interviewer" ? "Interviewer" : "Candidate"}
          </span>
        </div>
      </div>

      <div className="flex gap-4 mb-4">
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

        <div className="w-1/2">
          <VideoGrid
            localVideoRef={localVideoRef}
            videos={videos}
            socketRef={socketRef}
            interviewCode={interviewCode}
            isInterviewer={userRole === "interviewer"}
            onAnomalyDetected={(anomaly) => {}}
          />
        </div>
      </div>

      {userRole === "interviewer" && (
        <div className="mb-4">
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-white text-lg font-medium">
                Live Anomaly Monitoring
              </h3>
              <div className="flex items-center space-x-4 text-sm">
                <span className="text-green-400">● Live</span>
                <span className="text-gray-400">Total: {anomalies.length}</span>
              </div>
            </div>

            <div className="mb-4 grid grid-cols-4 gap-2">
              <div className="bg-red-600 bg-opacity-20 p-2 rounded text-center">
                <div className="text-red-400 text-lg font-bold">
                  {severityCounts.critical}
                </div>
                <div className="text-xs text-red-300">Critical</div>
              </div>
              <div className="bg-yellow-600 bg-opacity-20 p-2 rounded text-center">
                <div className="text-yellow-400 text-lg font-bold">
                  {severityCounts.warning}
                </div>
                <div className="text-xs text-yellow-300">Warning</div>
              </div>
              <div className="bg-orange-600 bg-opacity-20 p-2 rounded text-center">
                <div className="text-orange-400 text-lg font-bold">
                  {severityCounts.moderate}
                </div>
                <div className="text-xs text-orange-300">Moderate</div>
              </div>
              <div className="bg-blue-600 bg-opacity-20 p-2 rounded text-center">
                <div className="text-blue-400 text-lg font-bold">
                  {severityCounts.minor}
                </div>
                <div className="text-xs text-blue-300">Minor</div>
              </div>
            </div>

            <div className="max-h-48 overflow-y-auto">
              {anomalies.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">✅</div>
                  <p className="text-gray-400 text-sm">No anomalies detected</p>
                  <p className="text-gray-500 text-xs">
                    Candidate behavior appears normal
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {sortedAnomalies.map((anomaly) => {
                    const info = getAnomalyInfo(anomaly.type);
                    const bgColor =
                      {
                        critical: "bg-red-900 border-red-500",
                        warning: "bg-yellow-900 border-yellow-500",
                        moderate: "bg-orange-900 border-orange-500",
                        minor: "bg-blue-900 border-blue-500",
                      }[info.severity] || "bg-gray-900 border-gray-500";

                    return (
                      <div
                        key={anomaly.id}
                        className={`p-3 ${bgColor} rounded-lg border-l-4 transition-all duration-200 hover:bg-opacity-80`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <span className="text-2xl">{info.icon}</span>
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <span
                                  className={`font-bold ${info.color} text-sm`}
                                >
                                  {anomaly.type
                                    .replace(/[_-]/g, " ")
                                    .toUpperCase()}
                                </span>
                                <span className="text-xs bg-gray-700 px-2 py-1 rounded">
                                  {info.category}
                                </span>
                              </div>
                              <p className="text-xs text-gray-300 mt-1 leading-relaxed">
                                {anomaly.description}
                              </p>
                            </div>
                          </div>
                          <div className="text-right flex flex-col items-end space-y-1">
                            <div
                              className={`text-xs px-2 py-1 rounded font-bold ${
                                info.severity === "critical"
                                  ? "bg-red-600 text-white"
                                  : info.severity === "warning"
                                  ? "bg-yellow-600 text-black"
                                  : info.severity === "moderate"
                                  ? "bg-orange-600 text-white"
                                  : "bg-blue-600 text-white"
                              }`}
                            >
                              {(anomaly.confidence * 100).toFixed(0)}%
                            </div>
                            <div className="text-xs text-gray-400">
                              {anomaly.timestamp}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {anomalies.length > 0 && (
              <div className="mt-4 pt-3 border-t border-gray-700">
                <div className="text-center">
                  <div
                    className={`text-lg font-bold ${
                      severityCounts.critical > 0
                        ? "text-red-400"
                        : severityCounts.warning > 2
                        ? "text-yellow-400"
                        : "text-green-400"
                    }`}
                  >
                    {severityCounts.critical > 0
                      ? "HIGH RISK"
                      : severityCounts.warning > 2
                      ? "MODERATE RISK"
                      : "LOW RISK"}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    Overall Interview Assessment
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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
