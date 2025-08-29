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
  videoRef
}) => {
  socketRef.current = io.connect(server_url, {
    withCredentials: true,
    transports: ['websocket', 'polling']
  });

  socketRef.current.on("connect", () => {
    console.log("Connected:", socketRef.current.id);
    socketRef.current.emit("join-call", meetingCode);
    toast.success("Connected to meeting!");
    socketIdRef.current = socketRef.current.id;
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

  socketRef.current.on("user-joined", (id, clients) => {
    handleUserJoined(id, clients, socketRef, socketIdRef, setVideos, videoRef);
  });

  // Handle initial user states when joining
  socketRef.current.on("user-states", (userStates) => {
    console.log("📊 Received initial user states:", userStates);
    window.meetingUserStates = userStates;
    
    // Update existing videos with initial states
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

  // ✅ FIXED: Handle camera toggle events - ONLY UPDATE CAMERA STATE
  socketRef.current.on("user-camera-toggled", (userId, isEnabled) => {
    console.log(`📹 User ${userId} ${isEnabled ? 'enabled' : 'disabled'} camera`);
    
    // Update global state - ONLY VIDEO
    if (!window.meetingUserStates) window.meetingUserStates = {};
    if (!window.meetingUserStates[userId]) window.meetingUserStates[userId] = {};
    window.meetingUserStates[userId].video = isEnabled;
    
    // ✅ ONLY update camera state, PRESERVE audio state
    setVideos((videos) => 
      videos.map(video => 
        video.socketId === userId 
          ? { ...video, isCameraOff: !isEnabled } // ONLY change camera
          : video
      )
    );
  });

  // ✅ FIXED: Handle microphone toggle events - ONLY UPDATE AUDIO STATE
  socketRef.current.on("user-microphone-toggled", (userId, isEnabled) => {
    console.log(`🎤 User ${userId} ${isEnabled ? 'enabled' : 'disabled'} microphone`);
    
    // Update global state - ONLY AUDIO
    if (!window.meetingUserStates) window.meetingUserStates = {};
    if (!window.meetingUserStates[userId]) window.meetingUserStates[userId] = {};
    window.meetingUserStates[userId].audio = isEnabled;
    
    // ✅ ONLY update audio state, PRESERVE camera state
    setVideos((videos) => 
      videos.map(video => 
        video.socketId === userId 
          ? { ...video, isMuted: !isEnabled } // ONLY change audio
          : video
      )
    );
  });

  // Screen share handling
  socketRef.current.on("screen-share-started", (fromId) => {
    console.log(`🖥️ ${fromId} started screen sharing`);
    window.screenShareUsers = window.screenShareUsers || new Set();
    window.screenShareUsers.add(fromId);
    
    // Update global state
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
    
    // Update global state
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

const handleUserJoined = async (id, clients, socketRef, socketIdRef, setVideos, videoRef) => {
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
      
      // Get user state from global state or default
      const userState = window.meetingUserStates?.[socketListId] || { video: true, audio: true, screen: false };
      const isScreenShare = window.screenShareUsers?.has(socketListId) || userState.screen || false;
      
      console.log(`📺 Stream from ${socketListId}:`, {
        isScreenShare,
        tracks: stream.getTracks().length,
        userState,
        videoEnabled: stream.getVideoTracks()[0]?.enabled,
        audioEnabled: stream.getAudioTracks()[0]?.enabled
      });
      
      setVideos((videos) => {
        // Replace any existing stream from this user
        const filtered = videos.filter(v => v.socketId !== socketListId);
        
        const newVideo = {
          socketId: socketListId,
          stream,
          isScreenShare,
          autoPlay: true,
          playsinline: true,
          // CRITICAL: Use socket state, not track state (tracks might be enabled but user turned off camera)
          isMuted: !userState.audio,
          isCameraOff: !userState.video,
        };
        
        return [...filtered, newVideo];
      });
    };

    // Add local stream
    if (window.localStream && window.localStream.getTracks) {
      for (const track of window.localStream.getTracks()) {
        connections[socketListId].addTrack(track, window.localStream);
      }
    }
  }

  // Create offers
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