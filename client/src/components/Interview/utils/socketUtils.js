import io from "socket.io-client";
import { toast } from "react-toastify";

const server_url = import.meta.env.VITE_BACKEND_URL || "http://localhost:9000";

// Enhanced peer configuration for mobile devices
const peerConfigConnections = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
  ],
  iceCandidatePoolSize: 10,
};

export const connections = {}; // Export connections for interview

export const connectToInterviewSocketServer = ({
  socketRef,
  socketIdRef,
  interviewCode,
  setVideos,
  videoRef,
  setAnomalies,
}) => {
  // Connect to the same server as meetings but handle interview events
  socketRef.current = io.connect(server_url, {
    withCredentials: true,
    transports: ["websocket", "polling"],
  });

  socketRef.current.on("connect", () => {
    console.log("Connected to interview server with ID:", socketRef.current.id);
    socketIdRef.current = socketRef.current.id;

    // Use the same join-call event but with interview code
    socketRef.current.emit("join-call", interviewCode);
    toast.success("Connected to interview session successfully!");
  });

  socketRef.current.on("signal", (fromId, message) => {
    gotMessageFromServer(fromId, message, socketRef, socketIdRef);
  });

  socketRef.current.on("user-left", (id) => {
    setVideos((videos) => videos.filter((video) => video.socketId !== id));
    if (connections[id]) {
      connections[id].close();
      delete connections[id];
    }
  });

  socketRef.current.on("user-joined", (id, clients) => {
    handleUserJoined(id, clients, socketRef, socketIdRef, setVideos, videoRef);
  });

  // Interview-specific events
  socketRef.current.on("malpractice-detected", (data) => {
    console.log("Malpractice detected:", data);
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

  // Code change events for interview
  socketRef.current.on("code-change", (data) => {
    console.log("Code changed by peer:", data);
    // Handle code synchronization
    if (window.handleCodeChange) {
      window.handleCodeChange(data);
    }
  });

  socketRef.current.on("language-change", (data) => {
    console.log("Language changed by peer:", data);
    // Handle language synchronization
    if (window.handleLanguageChange) {
      window.handleLanguageChange(data);
    }
  });

  socketRef.current.on("disconnect", () => {
    console.log("Disconnected from interview server");
  });

  return socketRef.current;
};

// Reuse the same signal handling logic from meetings
const gotMessageFromServer = async (
  fromId,
  message,
  socketRef,
  socketIdRef
) => {
  try {
    const signal = JSON.parse(message);

    if (fromId === socketIdRef.current) return;
    if (!connections[fromId]) return;

    if (signal.sdp) {
      await connections[fromId].setRemoteDescription(
        new RTCSessionDescription(signal.sdp)
      );

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
        await connections[fromId].addIceCandidate(
          new RTCIceCandidate(signal.ice)
        );
      } catch (error) {
        console.warn("ICE candidate error (normal):", error);
      }
    }
  } catch (error) {
    console.error("Error processing signal:", error);
  }
};

const handleUserJoined = async (
  id,
  clients,
  socketRef,
  socketIdRef,
  setVideos,
  videoRef
) => {
  for (const socketListId of clients) {
    if (socketListId === socketIdRef.current) continue;

    connections[socketListId] = new RTCPeerConnection(peerConfigConnections);

    connections[socketListId].onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current.emit(
          "signal",
          socketListId,
          JSON.stringify({ ice: event.candidate })
        );
      }
    };

    connections[socketListId].ontrack = (event) => {
      const [stream] = event.streams;

      setVideos((videos) => {
        const existingVideo = videos.find(
          (video) => video.socketId === socketListId
        );

        if (existingVideo) {
          const updatedVideos = videos.map((video) =>
            video.socketId === socketListId ? { ...video, stream } : video
          );
          videoRef.current = updatedVideos;
          return updatedVideos;
        } else {
          const newVideo = {
            socketId: socketListId,
            stream,
            autoPlay: true,
            playsinline: true,
          };
          const updatedVideos = [...videos, newVideo];
          videoRef.current = updatedVideos;
          return updatedVideos;
        }
      });
    };

    // Add local stream tracks
    if (window.localStream && window.localStream.getTracks) {
      for (const track of window.localStream.getTracks()) {
        connections[socketListId].addTrack(track, window.localStream);
      }
    }
  }

  // Create offers if this is the current user
  if (id === socketIdRef.current) {
    for (const id2 in connections) {
      if (id2 === socketIdRef.current) continue;

      try {
        const offer = await connections[id2].createOffer();
        await connections[id2].setLocalDescription(offer);

        socketRef.current.emit(
          "signal",
          id2,
          JSON.stringify({ sdp: connections[id2].localDescription })
        );
      } catch (error) {
        console.error("Error creating offer:", error);
      }
    }
  }
};

export const disconnectFromInterviewServer = () => {
  // Clean up connections
  for (const id in connections) {
    if (connections[id]) {
      connections[id].close();
      delete connections[id];
    }
  }
};

// Interview-specific utility functions
export const sendInterviewMessage = (socketRef, message, sender) => {
  if (socketRef.current) {
    socketRef.current.emit("chat-message", message, sender);
  }
};

export const sendCodeChange = (socketRef, code, language, interviewCode) => {
  if (socketRef.current) {
    socketRef.current.emit("code-change", {
      meetingCode: interviewCode, // Using existing event structure
      code,
      userRole: "participant", // Can be enhanced later
    });
  }
};

export const sendMalpracticeDetection = (
  socketRef,
  type,
  confidence,
  interviewCode,
  description
) => {
  if (socketRef.current) {
    socketRef.current.emit("malpractice-detected", {
      type,
      confidence,
      message: description,
      timestamp: new Date().toISOString(),
    });
    console.log(
      `Malpractice detected: ${type} (${(confidence * 100).toFixed(1)}%)`
    );
  }
};
