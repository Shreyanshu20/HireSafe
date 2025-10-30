import io from "socket.io-client";
import { toast } from "react-toastify";

const server_url = import.meta.env.VITE_BACKEND_URL || "http://localhost:9000";

const peerConfigConnections = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" }
  ]
};

export const connections = {};

export const connectToSocketServer = ({
  socketRef,
  socketIdRef,
  meetingCode,
  setVideos,
  videoRef,
  userName // ✅ ADD THIS PARAMETER
}) => {
  socketRef.current = io.connect(server_url, {
    withCredentials: true,
    transports: ['websocket', 'polling']
  });

  socketRef.current.on("connect", () => {
    console.log("Connected:", socketRef.current.id);
    // ✅ SEND USERNAME WHEN JOINING
    socketRef.current.emit("join-call", meetingCode, userName);
    toast.success("Connected to meeting!");
    socketIdRef.current = socketRef.current.id;
  });

  // ✅ RECEIVE USERNAMES FROM SERVER
  socketRef.current.on("user-names", (userNames) => {
    console.log("📛 Received usernames:", userNames);
    window.meetingUserNames = userNames;
  });

  socketRef.current.on("signal", (fromId, message) => {
    gotMessageFromServer(fromId, message, socketRef, socketIdRef);
  });

  socketRef.current.on("user-left", (id) => {
    console.log(`User ${id} left the meeting`);
    setVideos((videos) => videos.filter((video) => video.socketId !== id));
    if (connections[id]) {
      connections[id].close();
      delete connections[id];
    }
  });

  // ✅ UPDATED: Receive username with user-joined
  socketRef.current.on("user-joined", (id, clients, userName) => {
    console.log("👤 User joined:", { id, clients, userName });
    handleUserJoined(id, clients, userName, socketRef, socketIdRef, setVideos, videoRef);
  });

  socketRef.current.on("user-states", (userStates) => {
    console.log("📊 Received initial user states:", userStates);
    window.meetingUserStates = userStates;
    
    setVideos((videos) => 
      videos.map(video => {
        const userState = userStates[video.socketId];
        if (userState) {
          return {
            ...video,
            isCameraOff: !userState.video,
            isMuted: !userState.audio,
            isScreenShare: userState.screen
          };
        }
        return video;
      })
    );
  });

  socketRef.current.on("user-camera-toggled", (userId, isEnabled) => {
    console.log(`📹 User ${userId} ${isEnabled ? 'enabled' : 'disabled'} camera`);
    
    if (!window.meetingUserStates) window.meetingUserStates = {};
    if (!window.meetingUserStates[userId]) window.meetingUserStates[userId] = {};
    window.meetingUserStates[userId].video = isEnabled;
    
    setVideos((videos) => 
      videos.map(video => 
        video.socketId === userId 
          ? { ...video, isCameraOff: !isEnabled }
          : video
      )
    );
  });

  socketRef.current.on("user-microphone-toggled", (userId, isEnabled) => {
    console.log(`🎤 User ${userId} ${isEnabled ? 'enabled' : 'disabled'} microphone`);
    
    if (!window.meetingUserStates) window.meetingUserStates = {};
    if (!window.meetingUserStates[userId]) window.meetingUserStates[userId] = {};
    window.meetingUserStates[userId].audio = isEnabled;
    
    setVideos((videos) => 
      videos.map(video => 
        video.socketId === userId 
          ? { ...video, isMuted: !isEnabled }
          : video
      )
    );
  });

  socketRef.current.on("screen-share-started", (fromId) => {
    console.log(`🖥️ ${fromId} started screen sharing`);
    window.screenShareUsers = window.screenShareUsers || new Set();
    window.screenShareUsers.add(fromId);
    
    if (!window.meetingUserStates) window.meetingUserStates = {};
    if (!window.meetingUserStates[fromId]) window.meetingUserStates[fromId] = {};
    window.meetingUserStates[fromId].screen = true;
    
    setVideos((videos) => 
      videos.map(video => 
        video.socketId === fromId 
          ? { ...video, isScreenShare: true }
          : video
      )
    );
  });

  socketRef.current.on("screen-share-stopped", (fromId) => {
    console.log(`📹 ${fromId} stopped screen sharing`);
    if (window.screenShareUsers) {
      window.screenShareUsers.delete(fromId);
    }
    
    if (window.meetingUserStates && window.meetingUserStates[fromId]) {
      window.meetingUserStates[fromId].screen = false;
    }
    
    setVideos((videos) => 
      videos.map(video => 
        video.socketId === fromId 
          ? { ...video, isScreenShare: false }
          : video
      )
    );
  });
};

const gotMessageFromServer = async (fromId, message, socketRef, socketIdRef) => {
  try {
    const signal = JSON.parse(message);
    
    if (fromId === socketIdRef.current) return;
    if (!connections[fromId]) return;

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
        console.warn("ICE error:", error);
      }
    }
  } catch (error) {
    console.error("Signal error:", error);
  }
};

// ✅ UPDATED: Accept and use userName parameter
const handleUserJoined = async (id, clients, userName, socketRef, socketIdRef, setVideos, videoRef) => {
  console.log("🚀 Handling user joined:", { id, clients, userName });
  
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
      
      // ✅ GET USERNAME FROM GLOBAL STATE
      const userState = window.meetingUserStates?.[socketListId] || { video: true, audio: true, screen: false };
      const videoUserName = window.meetingUserNames?.[socketListId] || userName || 'Anonymous';
      const isScreenShare = window.screenShareUsers?.has(socketListId) || userState.screen || false;
      
      console.log(`📺 Stream from ${socketListId}:`, {
        userName: videoUserName,
        isScreenShare,
        tracks: stream.getTracks().length,
        userState
      });
      
      setVideos((videos) => {
        const filtered = videos.filter(v => v.socketId !== socketListId);
        
        const newVideo = {
          socketId: socketListId,
          stream,
          username: videoUserName, // ✅ ADD USERNAME HERE
          isScreenShare,
          autoPlay: true,
          playsinline: true,
          isMuted: !userState.audio,
          isCameraOff: !userState.video,
        };
        
        return [...filtered, newVideo];
      });
    };

    if (window.localStream && window.localStream.getTracks) {
      for (const track of window.localStream.getTracks()) {
        connections[socketListId].addTrack(track, window.localStream);
      }
    }
  }

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
        console.error("Offer error:", error);
      }
    }
  }
};