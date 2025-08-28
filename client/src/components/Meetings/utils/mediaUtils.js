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

    // Get camera stream for preview
    const userMediaStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });

    if (userMediaStream) {
      setCameraStream(userMediaStream);
      window.localStream = userMediaStream;
      window.cameraStreamBackup = userMediaStream; // BACKUP REFERENCE

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = userMediaStream;
      }
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
  if ((video && videoAvailable) || (audio && audioAvailable)) {
    // If we already have a camera stream, just toggle tracks
    if (cameraStream && cameraStream.getTracks().length > 0) {
      console.log("📹 Using existing camera stream, toggling tracks");
      
      cameraStream.getVideoTracks().forEach(track => track.enabled = video);
      cameraStream.getAudioTracks().forEach(track => track.enabled = audio);

      // Update local preview
      if (localVideoRef && localVideoRef.current) {
        localVideoRef.current.srcObject = cameraStream;
      }

      // Send current stream (camera or screen)
      const streamToSend = (screen && screenStream) ? screenStream : cameraStream;
      if (streamToSend) {
        window.localStream = streamToSend;
        updatePeerConnections(streamToSend, socketRef, socketIdRef);
      }
      return;
    }

    // Create new camera stream only if we don't have one
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
        console.error("Media error:", error);
        toast.error("Failed to access media");
      });
  } else {
    // NEVER KILL CAMERA STREAM - just disable tracks
    if (cameraStream) {
      cameraStream.getVideoTracks().forEach(track => track.enabled = video);
      cameraStream.getAudioTracks().forEach(track => track.enabled = audio);
    }

    // Send current stream (camera or screen)
    const streamToSend = (screen && screenStream) ? screenStream : cameraStream;
    if (streamToSend) {
      window.localStream = streamToSend;
      updatePeerConnections(streamToSend, socketRef, socketIdRef);
    }
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
    
    sessionStorage.removeItem('currentMeetingCode');
    sessionStorage.removeItem('currentMeetingState');
    sessionStorage.removeItem('inMeeting');
    
  } catch (error) {
    console.error("End call error:", error);
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
  // DON'T KILL EXISTING CAMERA STREAM IF IT'S WORKING
  if (cameraStream && cameraStream.getTracks().length > 0 && !screen) {
    console.log("📹 Keeping existing camera stream");
    return;
  }

  // Only stop previous tracks if we're not screen sharing
  if (!screen) {
    try {
      if (cameraStream && cameraStream.getTracks) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
    } catch (error) {
      console.error("Stop previous tracks error:", error);
    }
  }

  setCameraStream(stream);
  window.cameraStreamBackup = stream; // BACKUP REFERENCE

  // ALWAYS show camera in local preview (unless screen sharing)
  if (localVideoRef && localVideoRef.current && !screen) {
    localVideoRef.current.srcObject = stream;
  }

  // Send appropriate stream to peers
  const streamToSend = (screen && screenStream) ? screenStream : stream;
  window.localStream = streamToSend;
  updatePeerConnections(streamToSend, socketRef, socketIdRef);
};