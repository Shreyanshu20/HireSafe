import { toast } from "react-toastify";

let localStream = null;
let audioContext;

export const getUserMedia = async ({
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
  localVideoRef,
}) => {
  if ((video && videoAvailable) || (audio && audioAvailable)) {
    try {
      console.log("Requesting user media:", { video: video && videoAvailable, audio: audio && audioAvailable });
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: video && videoAvailable ? {
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 30 }
        } : false,
        audio: audio && audioAvailable,
      });

      console.log("Got user media stream:", stream);

      // Stop previous stream
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }

      setCameraStream(stream);

      // Set local video
      if (localVideoRef.current && !screen) {
        localVideoRef.current.srcObject = stream;
        console.log("Set local video source");
      }

      // Set global stream for peer connections
      localStream = stream;
      window.localStream = stream;
      console.log("Local stream set globally:", stream);

      // Update existing peer connections
      updatePeerConnections(stream);

    } catch (error) {
      console.error("Error accessing user media:", error);
      toast.error("Error accessing camera/microphone");
    }
  } else {
    // Stop camera/audio
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }

    if (localVideoRef.current && !screen) {
      localVideoRef.current.srcObject = null;
    }

    window.localStream = null;
    localStream = null;
  }
};

const updatePeerConnections = (stream) => {
  // Import connections dynamically to avoid circular dependency
  import('./socketUtils').then(({ connections }) => {
    console.log("Updating peer connections with new stream, connections:", Object.keys(connections));
    
    for (const socketId in connections) {
      const peerConnection = connections[socketId];
      if (peerConnection && peerConnection.connectionState !== 'closed') {
        console.log(`Updating connection for ${socketId}`);
        
        // Remove old tracks
        const senders = peerConnection.getSenders();
        senders.forEach(sender => {
          if (sender.track) {
            console.log("Removing old track");
            peerConnection.removeTrack(sender);
          }
        });

        // Add new tracks
        if (stream) {
          stream.getTracks().forEach(track => {
            console.log("Adding new track:", track.kind);
            peerConnection.addTrack(track, stream);
          });
        }
      }
    }
  }).catch(err => {
    console.error("Error importing connections:", err);
  });
};

export const getDisplayMedia = async ({
  screen,
  setScreen,
  screenStream,
  setScreenStream,
  cameraStream,
  socketRef,
  socketIdRef,
  localVideoRef,
}) => {
  if (screen) {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });

      setScreenStream(stream);

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      localStream = stream;
      window.localStream = stream;
      updatePeerConnections(stream);

      stream.getVideoTracks()[0].onended = () => {
        setScreen(false);
        setScreenStream(null);
        
        if (cameraStream && localVideoRef.current) {
          localVideoRef.current.srcObject = cameraStream;
          localStream = cameraStream;
          window.localStream = cameraStream;
          updatePeerConnections(cameraStream);
        }
      };
    } catch (error) {
      console.error("Error accessing display media:", error);
      setScreen(false);
    }
  } else {
    if (screenStream) {
      screenStream.getTracks().forEach((track) => track.stop());
      setScreenStream(null);
    }

    if (cameraStream && localVideoRef.current) {
      localVideoRef.current.srcObject = cameraStream;
      localStream = cameraStream;
      window.localStream = cameraStream;
      updatePeerConnections(cameraStream);
    }
  }
};

export const handleEndCall = ({ cameraStream, screenStream, socketRef }) => {
  if (cameraStream) {
    cameraStream.getTracks().forEach((track) => track.stop());
  }

  if (screenStream) {
    screenStream.getTracks().forEach((track) => track.stop());
  }

  window.localStream = null;
  localStream = null;

  if (socketRef.current) {
    socketRef.current.emit("end-interview");
    socketRef.current.disconnect();
  }
};

// Add the missing export
export const initializeAudioContext = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioContext.state === "suspended") {
    audioContext.resume();
  }
};
