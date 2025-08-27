import { toast } from "react-toastify";
import { connections } from "./socketUtils"; // Import shared connections

export const getPermissions = async ({
  setVideoAvailable,
  setAudioAvailable,
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

    // Get initial stream for preview
    const userMediaStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });

    if (userMediaStream) {
      setCameraStream(userMediaStream);
      window.localStream = userMediaStream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = userMediaStream;
      }
    }
  } catch (error) {
    console.error("Error getting permissions:", error);
    toast.error(
      "Failed to get permissions. Please check your browser settings."
    );
  }
};

// Function to update peer connections
const updatePeerConnections = (streamToSend, socketRef, socketIdRef) => {
  for (let id in connections) {
    if (id === socketIdRef.current) {
      continue;
    }

    // Remove old tracks
    const senders = connections[id].getSenders();
    senders.forEach(sender => {
      if (sender.track) {
        connections[id].removeTrack(sender);
      }
    });

    // Add new stream tracks
    if (streamToSend && streamToSend.getTracks) {
      streamToSend.getTracks().forEach(track => {
        connections[id].addTrack(track, streamToSend);
      });

      connections[id].createOffer().then((description) => {
        connections[id]
          .setLocalDescription(description)
          .then(() => {
            socketRef.current.emit(
              "signal",
              id,
              JSON.stringify({ sdp: connections[id].localDescription })
            );
          })
          .catch((error) => {
            console.error("Error setting local description:", error);
            toast.error("Failed to set local description. Please try again.");
          });
      });
    }
  }
};

// Helper functions for black video and silence audio
let audioContext = null;

const silence = () => {
  try {
    if (!audioContext) {
      audioContext = new AudioContext();
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }
    }
    
    let oscillator = audioContext.createOscillator();
    let dst = oscillator.connect(audioContext.createMediaStreamDestination());
    oscillator.start();
    
    return Object.assign(dst.stream.getAudioTracks()[0], { enabled: false });
  } catch (error) {
    console.warn("Could not create audio context:", error);
    return createSilentAudioTrack();
  }
};

const createSilentAudioTrack = () => {
  const canvas = document.createElement('canvas');
  const stream = canvas.captureStream();
  const audioTrack = new MediaStreamTrack();
  Object.defineProperty(audioTrack, 'kind', { value: 'audio' });
  Object.defineProperty(audioTrack, 'enabled', { value: false, writable: true });
  return audioTrack;
};

const black = ({ width = 640, height = 480 } = {}) => {
  let canvas = Object.assign(document.createElement("canvas"), {
    width,
    height,
  });
  canvas.getContext("2d").fillRect(0, 0, width, height);
  let stream = canvas.captureStream();
  return Object.assign(stream.getVideoTracks()[0], { enabled: false });
};

// Create a function that initializes AudioContext after user interaction
export const initializeAudioContext = () => {
  if (!audioContext) {
    try {
      audioContext = new AudioContext();
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }
    } catch (error) {
      console.warn("Could not initialize audio context:", error);
    }
  }
};

export const getUserMedia = ({
  video,
  audio,
  videoAvailable,
  audioAvailable,
  cameraStream,
  setCameraStream,
  socketRef,
  socketIdRef,
  localVideoRef
}) => {
  // Initialize AudioContext on user interaction
  initializeAudioContext();
  
  if ((video && videoAvailable) || (audio && audioAvailable)) {
    navigator.mediaDevices
      .getUserMedia({ video: video && videoAvailable, audio: audio && audioAvailable })
      .then((stream) => {
        getUserMediaSuccess({
          stream,
          cameraStream,
          setCameraStream,
          socketRef,
          socketIdRef,
          localVideoRef
        });
      })
      .catch((error) => {
        console.error("Error accessing media devices:", error);
        toast.error("Failed to access media devices. Please try again.");
      });
  } else {
    try {
      if (cameraStream && cameraStream.getTracks) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
      setCameraStream(null);

      // Use black silence when no media is available
      const streamToSend = (() => {
        let blackSilence = (...args) => new MediaStream([black(...args), silence()]);
        return blackSilence();
      })();
      
      window.localStream = streamToSend;
      
      if (localVideoRef && localVideoRef.current) {
        localVideoRef.current.srcObject = streamToSend;
      }

      updatePeerConnections(streamToSend, socketRef, socketIdRef);
    } catch (error) {
      console.error("Error stopping media tracks:", error);
      toast.error("Failed to stop media tracks. Please try again.");
    }
  }
};

export const handleEndCall = ({ cameraStream, screenStream, socketRef }) => {
  console.log("🔌 Ending call and stopping all media streams");
  
  try {
    if (cameraStream && cameraStream.getTracks) {
      console.log("🎥 Stopping camera stream");
      cameraStream.getTracks().forEach((track) => {
        console.log(`Stopping ${track.kind} track`);
        track.stop();
      });
    }
    if (screenStream && screenStream.getTracks) {
      console.log("🖥️ Stopping screen stream");
      screenStream.getTracks().forEach((track) => {
        console.log(`Stopping ${track.kind} track`);
        track.stop();
      });
    }
    
    // Stop global window stream
    if (window.localStream && window.localStream.getTracks) {
      console.log("🌐 Stopping global stream");
      window.localStream.getTracks().forEach((track) => {
        console.log(`Stopping global ${track.kind} track`);
        track.stop();
      });
      window.localStream = null;
    }

    if (socketRef.current) {
      console.log("🔌 Disconnecting socket");
      socketRef.current.emit("end-interview");
      socketRef.current.disconnect();
    }
    
    // Clear interview session data
    sessionStorage.removeItem('currentInterviewCode');
    sessionStorage.removeItem('currentInterviewState');
    sessionStorage.removeItem('inInterview');
    
  } catch (error) {
    console.error("Error stopping media tracks:", error);
    toast.error("Failed to stop media tracks. Please try again.");
  }
  
  // Redirect to homepage like meetings do
  window.location.href = "/";
};

const getUserMediaSuccess = ({
  stream,
  cameraStream,
  setCameraStream,
  socketRef,
  socketIdRef,
  localVideoRef
}) => {
  try {
    if (cameraStream && cameraStream.getTracks) {
      cameraStream.getTracks().forEach((track) => track.stop());
    }
  } catch (error) {
    console.error("Error stopping previous camera tracks:", error);
  }

  setCameraStream(stream);

  // Always show camera in local video ref
  if (localVideoRef && localVideoRef.current) {
    localVideoRef.current.srcObject = stream;
  }

  // Set global stream for peer connections
  window.localStream = stream;
  updatePeerConnections(stream, socketRef, socketIdRef);

  stream.getTracks().forEach(
    (track) =>
      (track.onended = () => {
        setCameraStream(null);

        let blackSilence = (...args) =>
          new MediaStream([black(...args), silence()]);
        
        const fallbackStream = blackSilence();
        window.localStream = fallbackStream;
        
        if (localVideoRef && localVideoRef.current) {
          localVideoRef.current.srcObject = blackSilence();
        }

        updatePeerConnections(fallbackStream, socketRef, socketIdRef);
      })
  );
};
