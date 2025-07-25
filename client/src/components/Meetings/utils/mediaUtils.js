import { toast } from "react-toastify";
import { connections } from "./socketUtils"; // Import shared connections

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
    // Fallback: create a silent track without AudioContext
    return createSilentAudioTrack();
  }
};

// Fallback function to create silent audio track without AudioContext
const createSilentAudioTrack = () => {
  // Create a canvas to generate a silent audio track
  const canvas = document.createElement('canvas');
  const stream = canvas.captureStream();
  
  // Create a fake audio track by getting audio from a silent video
  const video = document.createElement('video');
  video.muted = true;
  video.volume = 0;
  
  // Return a dummy audio track
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
  screen,
  screenStream,
  socketRef,
  socketIdRef,
  localVideoRef
}) => {
  // Initialize AudioContext on user interaction (when they toggle audio/video)
  initializeAudioContext();
  
  if ((video && videoAvailable) || (audio && audioAvailable)) {
    navigator.mediaDevices
      .getUserMedia({ video: video && videoAvailable, audio: audio && audioAvailable })
      .then((stream) => getUserMediaSuccess({
        stream,
        cameraStream,
        setCameraStream,
        screen,
        screenStream,
        socketRef,
        socketIdRef,
        localVideoRef
      }))
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

      // If screen sharing is active, keep it; otherwise use black silence
      const streamToSend = screen && screenStream ? screenStream : (() => {
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

export const getDisplayMedia = ({
  screen,
  setScreen,
  screenStream,
  setScreenStream,
  cameraStream,
  socketRef,
  socketIdRef,
  localVideoRef
}) => {
  // Initialize AudioContext on user interaction
  initializeAudioContext();
  
  if (screen) {
    if (navigator.mediaDevices.getDisplayMedia) {
      navigator.mediaDevices
        .getDisplayMedia({ video: true, audio: true })
        .then((stream) => getDisplayMediaSuccess({
          stream,
          setScreenStream,
          cameraStream,
          setScreen,
          socketRef,
          socketIdRef,
          localVideoRef
        }))
        .catch((error) => {
          console.error("Error accessing display media:", error);
          toast.error("Failed to access display media. Please try again.");
          setScreen(false);
        });
    }
  } else {
    if (screenStream && screenStream.getTracks) {
      screenStream.getTracks().forEach((track) => track.stop());
    }
    setScreenStream(null);

    // Send camera stream to peers if available
    const streamToSend = cameraStream || (() => {
      let blackSilence = (...args) => new MediaStream([black(...args), silence()]);
      return blackSilence();
    })();
    
    window.localStream = streamToSend;
    updatePeerConnections(streamToSend, socketRef, socketIdRef);
  }
};

export const handleEndCall = ({ cameraStream, screenStream, socketRef }) => {
  try {
    if (cameraStream && cameraStream.getTracks) {
      cameraStream.getTracks().forEach((track) => track.stop());
    }
    if (screenStream && screenStream.getTracks) {
      screenStream.getTracks().forEach((track) => track.stop());
    }
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    
    // Clear meeting session data
    sessionStorage.removeItem('currentMeetingCode');
    sessionStorage.removeItem('currentMeetingState');
    sessionStorage.removeItem('inMeeting');
    
  } catch (error) {
    console.error("Error stopping media tracks:", error);
    toast.error("Failed to stop media tracks. Please try again.");
  }
  window.location.href = "/";
};

const getUserMediaSuccess = ({
  stream,
  cameraStream,
  setCameraStream,
  screen,
  screenStream,
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

  // Determine which stream to send to peers
  const streamToSend = screen && screenStream ? screenStream : stream;
  window.localStream = streamToSend;

  updatePeerConnections(streamToSend, socketRef, socketIdRef);

  stream.getTracks().forEach(
    (track) =>
      (track.onended = () => {
        setCameraStream(null);

        let blackSilence = (...args) =>
          new MediaStream([black(...args), silence()]);
        
        const fallbackStream = screen && screenStream ? screenStream : blackSilence();
        window.localStream = fallbackStream;
        
        if (localVideoRef && localVideoRef.current) {
          localVideoRef.current.srcObject = blackSilence();
        }

        updatePeerConnections(fallbackStream, socketRef, socketIdRef);
      })
  );
};

const getDisplayMediaSuccess = ({
  stream,
  setScreenStream,
  cameraStream,
  setScreen,
  socketRef,
  socketIdRef,
  localVideoRef
}) => {
  setScreenStream(stream);
  
  // Send screen stream to peers
  window.localStream = stream;
  updatePeerConnections(stream, socketRef, socketIdRef);

  // Keep camera in local video ref if available
  if (localVideoRef && localVideoRef.current && cameraStream) {
    localVideoRef.current.srcObject = cameraStream;
  }

  stream.getTracks().forEach(
    (track) =>
      (track.onended = () => {
        setScreen(false);
        setScreenStream(null);

        // Switch back to camera stream
        const streamToSend = cameraStream || (() => {
          let blackSilence = (...args) => new MediaStream([black(...args), silence()]);
          return blackSilence();
        })();
        
        window.localStream = streamToSend;
        updatePeerConnections(streamToSend, socketRef, socketIdRef);
      })
  );
};