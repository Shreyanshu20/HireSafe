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
    setVideos((videos) => videos.filter((video) => video.socketId !== id));
    if (connections[id]) {
      connections[id].close();
      delete connections[id];
    }
  });

  socketRef.current.on("user-joined", (id, clients) => {
    handleUserJoined(id, clients, socketRef, socketIdRef, setVideos, videoRef);
  });

  // SIMPLE screen share handling - JUST SET FLAGS
  socketRef.current.on("screen-share-started", (fromId) => {
    console.log(`🖥️ ${fromId} started screen sharing`);
    window.screenShareUsers = window.screenShareUsers || new Set();
    window.screenShareUsers.add(fromId);
    
    // UPDATE existing videos to mark as screen share
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
    
    // UPDATE existing videos to mark as camera
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

    // SIMPLE stream handling - NO COMPLEX DETECTION
    connections[socketListId].ontrack = (event) => {
      const [stream] = event.streams;
      
      // SIMPLE detection - just check if this user is screen sharing
      const isScreenShare = window.screenShareUsers?.has(socketListId) || false;
      
      console.log(`📺 Stream from ${socketListId}:`, {
        isScreenShare,
        tracks: stream.getTracks().length
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
          isMuted: !stream.getAudioTracks().some(track => track.enabled),
          isCameraOff: !stream.getVideoTracks().some(track => track.enabled),
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