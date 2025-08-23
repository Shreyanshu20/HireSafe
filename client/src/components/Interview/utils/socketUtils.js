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
  console.log("Connecting to interview server...");
  
  socketRef.current = io.connect(server_url, {
    withCredentials: true,
    transports: ["websocket", "polling"],
    timeout: 20000,
    forceNew: true,
  });

  socketRef.current.on("connect", () => {
    console.log("✅ Connected to interview server with ID:", socketRef.current.id);
    socketIdRef.current = socketRef.current.id;
    
    // Join interview room
    socketRef.current.emit("join-interview", interviewCode);
    toast.success("Connected to interview session!");
  });

  socketRef.current.on("connect_error", (error) => {
    console.error("❌ Connection error:", error);
    toast.error("Failed to connect to interview server");
  });

  socketRef.current.on("signal", (fromId, message) => {
    console.log("📡 Received signal from:", fromId);
    gotMessageFromServer(fromId, message, socketRef, socketIdRef);
  });

  socketRef.current.on("user-left", (id) => {
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

  socketRef.current.on("user-joined", (id, clients) => {
    console.log("👤 User joined:", id, "All clients:", clients);
    handleUserJoined(id, clients, socketRef, socketIdRef, setVideos, videoRef);
  });

  socketRef.current.on("malpractice-detected", (data) => {
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

  socketRef.current.on("interview-chat-message", (message, sender, socketIdSender) => {
    console.log("💬 Chat message received:", { message, sender, socketIdSender });
    if (window.handleInterviewMessage) {
      window.handleInterviewMessage(message, sender, socketIdSender);
    }
  });

  socketRef.current.on("code-change", (data) => {
    console.log("💻 Code change received:", data);
    if (window.handleCodeChange) {
      window.handleCodeChange(data);
    }
  });

  socketRef.current.on("language-change", (data) => {
    console.log("🔧 Language change received:", data);
    if (window.handleLanguageChange) {
      window.handleLanguageChange(data);
    }
  });

  socketRef.current.on("disconnect", (reason) => {
    console.log("❌ Disconnected from interview server:", reason);
    toast.info("Disconnected from interview session");
  });

  return socketRef.current;
};

const gotMessageFromServer = async (fromId, message, socketRef, socketIdRef) => {
  if (fromId === socketIdRef.current) return;
  
  try {
    const signal = JSON.parse(message);
    console.log("📡 Processing signal:", signal.type || (signal.sdp ? signal.sdp.type : "ice"), "from:", fromId);
    
    if (!connections[fromId]) {
      console.warn("⚠️ No connection exists for:", fromId);
      return;
    }
    
    if (signal.sdp) {
      console.log("🔄 Setting remote description for:", fromId);
      await connections[fromId].setRemoteDescription(new RTCSessionDescription(signal.sdp));
      
      if (signal.sdp.type === "offer") {
        console.log("📞 Creating answer for offer from:", fromId);
        const answer = await connections[fromId].createAnswer();
        await connections[fromId].setLocalDescription(answer);
        
        socketRef.current.emit(
          "signal",
          fromId,
          JSON.stringify({ sdp: connections[fromId].localDescription })
        );
        console.log("📤 Sent answer to:", fromId);
      }
    }
    
    if (signal.ice) {
      try {
        await connections[fromId].addIceCandidate(new RTCIceCandidate(signal.ice));
        console.log("🧊 Added ICE candidate for:", fromId);
      } catch (error) {
        console.warn("⚠️ Error adding ICE candidate:", error);
      }
    }
  } catch (error) {
    console.error("❌ Error processing signal:", error);
  }
};

const handleUserJoined = async (id, clients, socketRef, socketIdRef, setVideos, videoRef) => {
  console.log("🚀 Handling user joined:", id, "Current clients:", clients);
  
  // Clean up existing connections first
  clients.forEach(socketListId => {
    if (socketListId !== socketIdRef.current && connections[socketListId]) {
      console.log("🧹 Cleaning up existing connection:", socketListId);
      connections[socketListId].close();
      delete connections[socketListId];
    }
  });
  
  for (const socketListId of clients) {
    if (socketListId === socketIdRef.current) continue;
    
    console.log("🔗 Setting up connection for:", socketListId);
    
    // Create new peer connection
    connections[socketListId] = new RTCPeerConnection(peerConfigConnections);
    
    // Set up ICE candidate handler
    connections[socketListId].onicecandidate = (event) => {
      if (event.candidate) {
        console.log("🧊 Sending ICE candidate to:", socketListId);
        socketRef.current.emit(
          "signal",
          socketListId,
          JSON.stringify({ ice: event.candidate })
        );
      } else {
        console.log("🏁 ICE gathering complete for:", socketListId);
      }
    };

    // Set up connection state change handler
    connections[socketListId].onconnectionstatechange = () => {
      const state = connections[socketListId].connectionState;
      console.log(`🔗 Connection state for ${socketListId}:`, state);
      
      if (state === 'connected') {
        console.log("✅ Peer connection established with:", socketListId);
      } else if (state === 'failed' || state === 'disconnected') {
        console.log("❌ Peer connection failed/disconnected with:", socketListId);
      }
    };

    // Set up track handler for receiving remote stream
    connections[socketListId].ontrack = (event) => {
      console.log("📹 Received track from:", socketListId, "Streams:", event.streams.length);
      const [stream] = event.streams;
      
      if (stream && stream.getTracks().length > 0) {
        console.log("✅ Valid stream received with tracks:", stream.getTracks().map(t => t.kind));
        
        setVideos((videos) => {
          const existingVideo = videos.find(video => video.socketId === socketListId);
          
          if (existingVideo) {
            console.log("🔄 Updating existing video for:", socketListId);
            const updatedVideos = videos.map(video =>
              video.socketId === socketListId ? { ...video, stream } : video
            );
            if (videoRef) videoRef.current = updatedVideos;
            return updatedVideos;
          } else {
            console.log("➕ Adding new video for:", socketListId);
            const newVideo = {
              socketId: socketListId,
              stream,
              autoPlay: true,
              playsinline: true,
            };
            const updatedVideos = [...videos, newVideo];
            if (videoRef) videoRef.current = updatedVideos;
            return updatedVideos;
          }
        });
      } else {
        console.warn("⚠️ Received empty or invalid stream from:", socketListId);
      }
    };

    // Get local stream and add tracks
    const localStream = window.localStream;
    if (localStream && localStream.getTracks().length > 0) {
      console.log("📤 Adding local stream tracks to peer connection for:", socketListId);
      localStream.getTracks().forEach(track => {
        console.log("🎵 Adding track:", track.kind, "enabled:", track.enabled);
        connections[socketListId].addTrack(track, localStream);
      });
    } else {
      console.warn("⚠️ No local stream available when setting up connection for:", socketListId);
      
      // Try to get user media if not available
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        window.localStream = stream;
        stream.getTracks().forEach(track => {
          connections[socketListId].addTrack(track, stream);
        });
        console.log("✅ Created and added new local stream for:", socketListId);
      } catch (error) {
        console.error("❌ Failed to get user media for:", socketListId, error);
      }
    }
  }

  // Create offers for connections where this user should initiate
  if (id === socketIdRef.current) {
    console.log("📞 Creating offers as the joining user");
    for (const socketListId of clients) {
      if (socketListId === socketIdRef.current) continue;
      
      if (connections[socketListId]) {
        try {
          console.log("📤 Creating offer for:", socketListId);
          const offer = await connections[socketListId].createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true
          });
          await connections[socketListId].setLocalDescription(offer);
          
          socketRef.current.emit(
            "signal",
            socketListId,
            JSON.stringify({ sdp: connections[socketListId].localDescription })
          );
          console.log("✅ Sent offer to:", socketListId);
        } catch (error) {
          console.error("❌ Error creating offer for:", socketListId, error);
        }
      }
    }
  }
};

export const disconnectFromInterviewServer = (socketRef) => {
  console.log("🔌 Disconnecting from interview server...");
  
  // Clean up connections
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
