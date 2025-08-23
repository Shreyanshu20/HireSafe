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
  interviewState,
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
  const [userRole, setUserRole] = useState("interviewee");

  // Set up chat message listener
  useEffect(() => {
    if (socketRef.current) {
      // Handle interview chat
      socketRef.current.on("interview-chat-message", addMessage);
      
      // Handle malpractice events for interviewer
      if (userRole === "interviewer") {
        socketRef.current.on("malpractice-detected", (data) => {
          console.log("🚨 Malpractice event received by interviewer:", data);
          
          // Only add if it's from the interviewee (not from interviewer's own overlay)
          if (data.socketId !== socketIdRef.current) {
            setAnomalies((prev) => [
              ...prev,
              {
                id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // Unique ID
                type: data.type,
                confidence: data.confidence,
                timestamp: new Date().toLocaleTimeString(),
                description: data.message || data.description,
                rawTimestamp: Date.now(), // For sorting
              },
            ]);
            console.log("✅ Anomaly added to interviewer dashboard");
          }
        });
      }
    }

    // Global handlers for code sync
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

    window.handleInterviewMessage = (message, sender, socketIdSender) => {
      addMessage(message, sender, socketIdSender);
    };

    return () => {
      if (socketRef.current) {
        socketRef.current.off("interview-chat-message", addMessage);
        if (userRole === "interviewer") {
          socketRef.current.off("malpractice-detected");
        }
      }
      delete window.handleCodeChange;
      delete window.handleLanguageChange;
      delete window.handleInterviewMessage;
    };
  }, [socketRef, userRole]);

  useEffect(() => {
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
    sendCodeChange(socketRef, newCode, selectedLanguage, interviewCode);
  };

  const onLanguageChange = (newLanguage) => {
    setSelectedLanguage(newLanguage);
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

  // Update the anomaly mapping in InterviewRoom.jsx
  const getAnomalyInfo = (type) => {
    const anomalyMap = {
      // Critical Interview Violations
      multiple_people: { 
        icon: "👥", 
        color: "text-red-500", 
        severity: "critical", 
        category: "Cheating",
        priority: 1
      },
      candidate_absent: { 
        icon: "❌", 
        color: "text-red-500", 
        severity: "critical", 
        category: "Presence",
        priority: 1
      },
      
      // Suspicious Behavior
      looking_away_extended: { 
        icon: "👀", 
        color: "text-orange-500", 
        severity: "warning", 
        category: "Attention",
        priority: 2
      },
      suspicious_head_movement: { 
        icon: "🔄", 
        color: "text-orange-500", 
        severity: "warning", 
        category: "Behavior",
        priority: 2
      },
      reading_behavior: { 
        icon: "📖", 
        color: "text-orange-500", 
        severity: "warning", 
        category: "Cheating",
        priority: 2
      },
      
      // Attention Issues
      eyes_closed_extended: { 
        icon: "😴", 
        color: "text-yellow-500", 
        severity: "moderate", 
        category: "Attention",
        priority: 3
      },
      high_stress_detected: { 
        icon: "😰", 
        color: "text-yellow-500", 
        severity: "moderate", 
        category: "Behavior",
        priority: 3
      },
      
      // Technical Issues
      candidate_too_far: { 
        icon: "📏", 
        color: "text-blue-500", 
        severity: "minor", 
        category: "Technical",
        priority: 4
      },
      candidate_too_close: { 
        icon: "🔍", 
        color: "text-blue-500", 
        severity: "minor", 
        category: "Technical",
        priority: 4
      },
      poor_video_quality: { 
        icon: "📹", 
        color: "text-gray-500", 
        severity: "minor", 
        category: "Technical",
        priority: 4
      },
      poor_lighting: { 
        icon: "💡", 
        color: "text-gray-500", 
        severity: "minor", 
        category: "Technical",
        priority: 4
      },
      
      // Identity Verification
      age_verification_concern: { 
        icon: "🆔", 
        color: "text-purple-500", 
        severity: "moderate", 
        category: "Identity",
        priority: 3
      },
      
      // Basic Detection Fallbacks
      no_movement_detected: { 
        icon: "⏸️", 
        color: "text-red-500", 
        severity: "critical", 
        category: "Presence",
        priority: 1
      },
    };
    
    return anomalyMap[type] || { 
      icon: "⚠️", 
      color: "text-gray-500", 
      severity: "minor", 
      category: "Unknown",
      priority: 5
    };
  };

  // Get severity counts
  const getSeverityCounts = () => {
    const counts = {
      critical: 0,
      warning: 0,
      moderate: 0,
      minor: 0
    };
    
    anomalies.forEach(anomaly => {
      const info = getAnomalyInfo(anomaly.type);
      counts[info.severity] = (counts[info.severity] || 0) + 1;
    });
    
    return counts;
  };

  // Sort anomalies by priority and timestamp
  const sortedAnomalies = [...anomalies]
    .sort((a, b) => {
      // First sort by timestamp (newest first) - PRIMARY SORT
      const timeA = a.rawTimestamp || 0;
      const timeB = b.rawTimestamp || 0;
      
      if (timeA !== timeB) {
        return timeB - timeA; // Newest first
      }
      
      // If timestamps are equal, then sort by priority (lower number = higher priority)
      const aInfo = getAnomalyInfo(a.type);
      const bInfo = getAnomalyInfo(b.type);
      return aInfo.priority - bInfo.priority;
    })
    .slice(0, 10); // Show only top 10 most recent anomalies

  const severityCounts = getSeverityCounts();

  return (
    <>
      <div className="mb-4 flex justify-between items-center">
        <div>
          <strong>Interview Code: {interviewCode}</strong>
          <span className="ml-4 text-sm text-gray-600">
            Role: {userRole === "interviewer" ? "Interviewer" : "Interviewee"}
          </span>
        </div>
        <div className="text-sm text-gray-500">
          {userRole === "interviewer" && "🔍 AI Monitoring Active"}
        </div>
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
              console.log("Anomaly detected locally:", anomaly);
            }}
          />
        </div>
      </div>

      {/* Enhanced Anomaly Reports - Only show to interviewer */}
      {userRole === "interviewer" && (
        <div className="mb-4">
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-white text-lg font-medium">
                🔍 Live Anomaly Monitoring
              </h3>
              <div className="flex items-center space-x-4 text-sm">
                <span className="text-green-400">● Live</span>
                <span className="text-gray-400">Total: {anomalies.length}</span>
              </div>
            </div>

            {/* Severity Summary Bar */}
            <div className="mb-4 grid grid-cols-4 gap-2">
              <div className="bg-red-600 bg-opacity-20 p-2 rounded text-center">
                <div className="text-red-400 text-lg font-bold">{severityCounts.critical}</div>
                <div className="text-xs text-red-300">Critical</div>
              </div>
              <div className="bg-yellow-600 bg-opacity-20 p-2 rounded text-center">
                <div className="text-yellow-400 text-lg font-bold">{severityCounts.warning}</div>
                <div className="text-xs text-yellow-300">Warning</div>
              </div>
              <div className="bg-orange-600 bg-opacity-20 p-2 rounded text-center">
                <div className="text-orange-400 text-lg font-bold">{severityCounts.moderate}</div>
                <div className="text-xs text-orange-300">Moderate</div>
              </div>
              <div className="bg-blue-600 bg-opacity-20 p-2 rounded text-center">
                <div className="text-blue-400 text-lg font-bold">{severityCounts.minor}</div>
                <div className="text-xs text-blue-300">Minor</div>
              </div>
            </div>
            
            <div className="max-h-48 overflow-y-auto">
              {anomalies.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">✅</div>
                  <p className="text-gray-400 text-sm">No anomalies detected</p>
                  <p className="text-gray-500 text-xs">Candidate behavior appears normal</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {sortedAnomalies.map((anomaly) => {
                    const info = getAnomalyInfo(anomaly.type);
                    const bgColor = {
                      critical: "bg-red-900 border-red-500",
                      warning: "bg-yellow-900 border-yellow-500",
                      moderate: "bg-orange-900 border-orange-500",
                      minor: "bg-blue-900 border-blue-500"
                    }[info.severity] || "bg-gray-900 border-gray-500";

                    return (
                      <div
                        key={anomaly.id} // Now using unique ID
                        className={`p-3 ${bgColor} rounded-lg border-l-4 transition-all duration-200 hover:bg-opacity-80`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <span className="text-2xl">{info.icon}</span>
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <span className={`font-bold ${info.color} text-sm`}>
                                  {anomaly.type.replace(/[_-]/g, " ").toUpperCase()}
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
                            <div className={`text-xs px-2 py-1 rounded font-bold ${
                              info.severity === "critical"
                                ? "bg-red-600 text-white"
                                : info.severity === "warning"
                                ? "bg-yellow-600 text-black"
                                : info.severity === "moderate"
                                ? "bg-orange-600 text-white"
                                : "bg-blue-600 text-white"
                            }`}>
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

            {/* Risk Assessment */}
            {anomalies.length > 0 && (
              <div className="mt-4 pt-3 border-t border-gray-700">
                <div className="text-center">
                  <div className={`text-lg font-bold ${
                    severityCounts.critical > 0 ? "text-red-400" :
                    severityCounts.warning > 2 ? "text-yellow-400" :
                    "text-green-400"
                  }`}>
                    {severityCounts.critical > 0 ? "HIGH RISK" :
                     severityCounts.warning > 2 ? "MODERATE RISK" :
                     "LOW RISK"}
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
