let pc = [];
let localStream = null;
let remoteStream = null;
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
  // Only proceed if we want video or audio AND they're available
  if ((video && videoAvailable) || (audio && audioAvailable)) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: video && videoAvailable,
        audio: audio && audioAvailable,
      });

      // Stop previous stream
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }

      setCameraStream(stream);

      // Only set video if not showing screen
      if (localVideoRef.current && !screen) {
        localVideoRef.current.srcObject = stream;
      }

      localStream = stream;
    } catch (error) {
      console.error("Error accessing user media:", error);
    }
  } else {
    // If turning off video/audio, stop the stream
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }

    if (localVideoRef.current && !screen) {
      localVideoRef.current.srcObject = null;
    }
  }
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

      // Handle screen share ending
      stream.getVideoTracks()[0].onended = () => {
        setScreen(false);
        setScreenStream(null);
        if (cameraStream && localVideoRef.current) {
          localVideoRef.current.srcObject = cameraStream;
          localStream = cameraStream;
        }
      };
    } catch (error) {
      console.error("Error accessing display media:", error);
      setScreen(false);
    }
  } else {
    // Stop screen sharing
    if (screenStream) {
      screenStream.getTracks().forEach((track) => track.stop());
      setScreenStream(null);
    }

    // Return to camera
    if (cameraStream && localVideoRef.current) {
      localVideoRef.current.srcObject = cameraStream;
      localStream = cameraStream;
    }
  }
};

export const handleEndCall = ({ cameraStream, screenStream, socketRef }) => {
  // Stop all streams
  if (cameraStream) {
    cameraStream.getTracks().forEach((track) => track.stop());
  }

  if (screenStream) {
    screenStream.getTracks().forEach((track) => track.stop());
  }

  // Close peer connections
  pc.forEach((connection) => {
    connection.close();
  });
  pc = [];

  // Disconnect socket
  if (socketRef.current) {
    socketRef.current.emit("end-interview");
    socketRef.current.disconnect();
  }
};

export const initializeAudioContext = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioContext.state === "suspended") {
    audioContext.resume();
  }
};
