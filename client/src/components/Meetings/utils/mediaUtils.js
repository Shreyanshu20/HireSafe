import { toast } from "react-toastify";
import { connections } from "./socketUtils";

export const getPermissions = async ({
  setVideoAvailable,
  setAudioAvailable,
  setScreenAvailable,
  setCameraStream,
  localVideoRef
}) => {
  try {
    const videoPermission = await navigator.mediaDevices.getUserMedia({
      video: true,
    });

    if (videoPermission) {
      setVideoAvailable(true);
      videoPermission.getTracks().forEach((track) => track.stop());
    } else {
      setVideoAvailable(false);
    }

    const audioPermission = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });

    if (audioPermission) {
      setAudioAvailable(true);
      audioPermission.getTracks().forEach((track) => track.stop());
    } else {
      setAudioAvailable(false);
    }

    if (navigator.mediaDevices.getDisplayMedia) {
      setScreenAvailable(true);
    } else {
      setScreenAvailable(false);
    }

    // Get camera stream for preview - ONLY ONCE
    const userMediaStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });

    if (userMediaStream) {
      setCameraStream(userMediaStream);
      window.localStream = userMediaStream;
      window.cameraStreamBackup = userMediaStream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = userMediaStream;
      }
      
      console.log("📹 Initial camera stream created:", userMediaStream);
    }
  } catch (error) {
    console.error("Permission error:", error);
    toast.error("Failed to get permissions");
  }
};

const updatePeerConnections = (streamToSend, socketRef, socketIdRef) => {
  for (let id in connections) {
    if (id === socketIdRef.current) continue;

    const senders = connections[id].getSenders();
    senders.forEach(sender => {
      if (sender.track) {
        connections[id].removeTrack(sender);
      }
    });

    if (streamToSend && streamToSend.getTracks) {
      streamToSend.getTracks().forEach(track => {
        connections[id].addTrack(track, streamToSend);
      });

      connections[id].createOffer().then((description) => {
        connections[id].setLocalDescription(description).then(() => {
          socketRef.current.emit(
            "signal",
            id,
            JSON.stringify({ sdp: connections[id].localDescription })
          );
        });
      });
    }
  }
};

export const initializeAudioContext = () => {
  // Audio context initialization
};

// SIMPLIFIED: Just toggle track enabled, NEVER KILL STREAMS
export const getUserMedia = ({
  video,
  audio,
  videoAvailable,
  audioAvailable,
  cameraStream,
  setCameraStream,
  screen,
  screenStream,
  socketRef,
  socketIdRef,
  localVideoRef
}) => {
  console.log("🎬 getUserMedia called:", { video, audio });
  
  // If we have a camera stream, just toggle the tracks - DON'T CREATE NEW STREAMS
  if (cameraStream && cameraStream.getTracks().length > 0) {
    console.log("📹 Toggling existing stream tracks");
    
    // Toggle video tracks
    cameraStream.getVideoTracks().forEach(track => {
      track.enabled = video;
      console.log(`Video track enabled: ${track.enabled}`);
    });
    
    // Toggle audio tracks
    cameraStream.getAudioTracks().forEach(track => {
      track.enabled = audio;
      console.log(`Audio track enabled: ${track.enabled}`);
    });

    // ALWAYS maintain backups
    window.cameraStreamBackup = cameraStream;
    
    // Update what's sent to peers (camera or screen)
    const streamToSend = (screen && screenStream) ? screenStream : cameraStream;
    window.localStream = streamToSend;
    updatePeerConnections(streamToSend, socketRef, socketIdRef);
    
    return; // EXIT EARLY - DON'T CREATE NEW STREAMS
  }

  // Only create new stream if we don't have one
  if ((video && videoAvailable) || (audio && audioAvailable)) {
    navigator.mediaDevices
      .getUserMedia({ video: video && videoAvailable, audio: audio && audioAvailable })
      .then((stream) => {
        console.log("📹 Created NEW camera stream:", stream);
        setCameraStream(stream);
        window.localStream = stream;
        window.cameraStreamBackup = stream;

        // Set to local video
        if (localVideoRef && localVideoRef.current && !screen) {
          localVideoRef.current.srcObject = stream;
        }

        // Send to peers
        const streamToSend = (screen && screenStream) ? screenStream : stream;
        updatePeerConnections(streamToSend, socketRef, socketIdRef);
      })
      .catch((error) => {
        console.error("Media error:", error);
        toast.error("Failed to access media");
      });
  }
};

export const handleEndCall = ({ cameraStream, screenStream, socketRef }) => {
  try {
    console.log("🔚 Ending call and cleaning up...");
    
    if (cameraStream && cameraStream.getTracks) {
      cameraStream.getTracks().forEach((track) => {
        track.stop();
      });
    }
    
    if (screenStream && screenStream.getTracks) {
      screenStream.getTracks().forEach((track) => {
        track.stop();
      });
    }
    
    if (window.cameraStreamBackup && window.cameraStreamBackup.getTracks) {
      window.cameraStreamBackup.getTracks().forEach((track) => {
        track.stop();
      });
      window.cameraStreamBackup = null;
    }
    
    for (let id in connections) {
      if (connections[id]) {
        connections[id].close();
        delete connections[id];
      }
    }
    
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    
    window.localStream = null;
    
    sessionStorage.removeItem('currentMeetingCode');
    sessionStorage.removeItem('currentMeetingState');
    sessionStorage.removeItem('inMeeting');
    
  } catch (error) {
    console.error("❌ Error ending call:", error);
  }
  
  window.location.href = "/";
};