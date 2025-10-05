import io from "socket.io-client";
import { toast } from "react-toastify";

const server_url = import.meta.env.VITE_BACKEND_URL || "http://localhost:9000";

const peerConfigConnections = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
  ],
  iceCandidatePoolSize: 10,
};

export const connections = {};

export const connectToInterviewSocketServer = ({
  socketRef,
  socketIdRef,
  interviewCode,
  setVideos,
  videoRef,
  setAnomalies,
}) => {
  console.log("🔗 Connecting to interview socket server...");

  const socket = io(server_url, {
    withCredentials: true,
    transports: ["websocket", "polling"],
  });

  socketRef.current = socket;

  socket.on("connect", () => {
    console.log("✅ Connected to socket server");
    socketIdRef.current = socket.id;

    socket.emit("join-interview", {
      interviewCode: interviewCode,
    });
  });

  // ✅ FIXED: Single user-joined handler
  socket.on("user-joined", (id, clients) => {
    console.log("👤 User joined:", id, "All clients:", clients);
    
    if (clients.length > 2) {
      console.warn("⚠️ Interview room full");
      return;
    }
    
    handleUserJoined(id, clients, socketRef, socketIdRef, setVideos, videoRef);
  });

  socket.on("user-left", (id) => {
    console.log("👋 User left:", id);
    setVideos((videos) => {
      const filtered = videos.filter((video) => video.socketId !== id);
      console.log("Updated videos after user left:", filtered);
      return filtered;
    });
    if (connections[id]) {
      connections[id].close();
      delete connections[id];
    }
  });

  // ✅ FIXED: Use same event names as meetings for consistency
  socket.on("user-camera-toggled", (userId, isEnabled) => {
    console.log(`📹 User ${userId} camera ${isEnabled ? 'ON' : 'OFF'}`);
    
    setVideos((videos) => 
      videos.map((video) => 
        video.socketId === userId 
          ? { ...video, isCameraOff: !isEnabled }
          : video
      )
    );
  });

  socket.on("user-microphone-toggled", (userId, isEnabled) => {
    console.log(`🎤 User ${userId} mic ${isEnabled ? 'ON' : 'OFF'}`);
    
    setVideos((videos) => 
      videos.map((video) => 
        video.socketId === userId 
          ? { ...video, isMuted: !isEnabled }
          : video
      )
    );
  });

  socket.on("interview-full", () => {
    toast.error("Interview room is full. Only 2 participants allowed.");
    socket.disconnect();
    window.location.reload();
  });

  socket.on("interview-joined", (data) => {
    console.log("✅ Successfully joined interview:", data);
    toast.success("Connected to interview session!");
  });

  socket.on("connect_error", (error) => {
    console.error("❌ Connection error:", error);
    toast.error("Failed to connect to interview server");
  });

  socket.on("signal", (fromId, message) => {
    console.log("📡 Received signal from:", fromId);
    gotMessageFromServer(fromId, message, socketRef, socketIdRef);
  });

  socket.on("malpractice-detected", (data) => {
    console.log("🚨 Malpractice detected:", data);
    if (setAnomalies) {
      setAnomalies((prev) => [
        ...prev,
        {
          id: Date.now(),
          type: data.type,
          confidence: data.confidence,
          timestamp: new Date().toLocaleTimeString(),
          description: data.message || data.description,
        },
      ]);
    }
  });

  socket.on("code-change", (data) => {
    console.log("💻 Code change received:", data);
    const event = new CustomEvent('interviewCodeChange', { detail: data });
    window.dispatchEvent(event);
  });

  socket.on("language-change", (data) => {
    console.log("🔧 Language change received:", data);
    if (window.handleLanguageChange) {
      window.handleLanguageChange(data);
    }
  });

  socket.on("output-change", (data) => {
    console.log("📤 Output change received:", data);
    const event = new CustomEvent('interviewOutputChange', { detail: data });
    window.dispatchEvent(event);
  });

  socket.on("disconnect", (reason) => {
    console.log("❌ Disconnected from interview server:", reason);
    toast.info("Disconnected from interview session");
  });

  return socketRef.current;
};

// ✅ FIXED: Simplified handleUserJoined
const handleUserJoined = async (id, clients, socketRef, socketIdRef, setVideos, videoRef) => {
  console.log("🚀 Handling user joined:", id, "Current clients:", clients);
  
  const otherParticipants = clients.filter(clientId => clientId !== socketIdRef.current);
  
  // Clean up existing connections
  for (const existingId in connections) {
    if (!otherParticipants.includes(existingId)) {
      console.log("🧹 Cleaning up connection:", existingId);
      connections[existingId].close();
      delete connections[existingId];
    }
  }
  
  for (const socketListId of otherParticipants) {
    if (connections[socketListId]) continue; // Skip if already exists
    
    console.log("🔗 Setting up connection for:", socketListId);
    
    connections[socketListId] = new RTCPeerConnection(peerConfigConnections);
    
    connections[socketListId].onicecandidate = (event) => {
      if (event.candidate) {
        console.log("🧊 Sending ICE candidate to:", socketListId);
        socketRef.current.emit(
          "signal",
          socketListId,
          JSON.stringify({ ice: event.candidate })
        );
      }
    };

    connections[socketListId].onconnectionstatechange = () => {
      const state = connections[socketListId].connectionState;
      console.log(`🔗 Connection state for ${socketListId}:`, state);
    };

    connections[socketListId].ontrack = (event) => {
      console.log("📹 Received track from:", socketListId);
      const [stream] = event.streams;
      
      if (stream && stream.getTracks().length > 0) {
        setVideos((videos) => {
          // Remove any existing video for this socketId
          const filtered = videos.filter(v => v.socketId !== socketListId);
          
          const newVideo = {
            socketId: socketListId,
            stream,
            autoPlay: true,
            playsinline: true,
            isMuted: false,
            isCameraOff: false,
          };
          
          const result = [...filtered, newVideo];
          if (videoRef) videoRef.current = result;
          return result;
        });
      }
    };
    
    // Add local stream to connection
    const localStream = window.localStream;
    if (localStream && localStream.getTracks().length > 0) {
      localStream.getTracks().forEach(track => {
        connections[socketListId].addTrack(track, localStream);
      });
    }
  }
  
  // Create offers if you're the joining user
  if (id === socketIdRef.current) {
    for (const socketListId of otherParticipants) {
      if (connections[socketListId]) {
        try {
          const offer = await connections[socketListId].createOffer();
          await connections[socketListId].setLocalDescription(offer);
          
          socketRef.current.emit(
            "signal",
            socketListId,
            JSON.stringify({ sdp: connections[socketListId].localDescription })
          );
        } catch (error) {
          console.error("❌ Error creating offer:", error);
        }
      }
    }
  }
};

const gotMessageFromServer = async (fromId, message, socketRef, socketIdRef) => {
  if (fromId === socketIdRef.current) return;
  
  try {
    const signal = JSON.parse(message);
    console.log("📡 Processing signal from:", fromId);
    
    if (!connections[fromId]) {
      console.warn("⚠️ No connection exists for:", fromId);
      return;
    }
    
    if (signal.sdp) {
      await connections[fromId].setRemoteDescription(new RTCSessionDescription(signal.sdp));
      
      if (signal.sdp.type === "offer") {
        const answer = await connections[fromId].createAnswer();
        await connections[fromId].setLocalDescription(answer);
        
        socketRef.current.emit(
          "signal",
          fromId,
          JSON.stringify({ sdp: connections[fromId].localDescription })
        );
      }
    }
    
    if (signal.ice) {
      try {
        await connections[fromId].addIceCandidate(new RTCIceCandidate(signal.ice));
      } catch (error) {
        console.warn("⚠️ Error adding ICE candidate:", error);
      }
    }
  } catch (error) {
    console.error("❌ Error processing signal:", error);
  }
};

export const disconnectFromInterviewServer = (socketRef) => {
  console.log("🔌 Disconnecting from interview server...");
  
  for (const id in connections) {
    if (connections[id]) {
      connections[id].close();
      delete connections[id];
    }
  }

  if (socketRef.current) {
    socketRef.current.emit("end-interview");
    socketRef.current.disconnect();
  }
};

export const sendInterviewMessage = (socketRef, message, sender) => {
  if (socketRef.current) {
    console.log("💬 Sending chat message:", message);
    socketRef.current.emit("interview-chat-message", message, sender);
  }
};

export const sendCodeChange = (socketRef, code, language, interviewCode) => {
  if (socketRef.current) {
    console.log("💻 Sending code change");
    socketRef.current.emit("code-change", {
      meetingCode: interviewCode,
      code,
      language,
      timestamp: Date.now()
    });
  }
};

export const sendOutputChange = (socketRef, output, interviewCode) => {
  if (socketRef.current) {
    console.log("📤 Sending output change");
    socketRef.current.emit("output-change", {
      meetingCode: interviewCode,
      output,
      timestamp: Date.now()
    });
  }
};

export const sendMalpracticeDetection = (socketRef, type, confidence, interviewCode, description) => {
  if (socketRef.current) {
    socketRef.current.emit("malpractice-detected", {
      meetingCode: interviewCode,
      type,
      confidence,
      message: description,
      timestamp: new Date().toISOString(),
    });
    console.log(`🚨 Malpractice detected and sent: ${type} (${(confidence * 100).toFixed(1)}%)`);
  }
};
