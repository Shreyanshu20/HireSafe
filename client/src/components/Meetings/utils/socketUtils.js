import io from "socket.io-client";
import { toast } from "react-toastify";

const server_url = import.meta.env.VITE_BACKEND_URL || "http://localhost:9000";

const peerConfigConnections = {
  iceServers: [
    {
      urls: "stun:stun.l.google.com:19302",
    },
  ],
};

export const connections = {}; // Export connections

export const connectToSocketServer = ({
  socketRef,
  socketIdRef,
  meetingCode,
  setVideos,
  videoRef
}) => {
  socketRef.current = io.connect(server_url, {
    secure: false,
    withCredentials: true,
  });

  socketRef.current.on("signal", (fromId, message) => {
    gotMessageFromServer(fromId, message, socketIdRef);
  });

  socketRef.current.on("connect", () => {
    socketRef.current.emit("join-call", meetingCode);
    toast.success("Connected to the meeting successfully!");

    socketIdRef.current = socketRef.current.id;

    socketRef.current.on("user-left", (id) => {
      setVideos((videos) => videos.filter((video) => video.socketId !== id));
    });

    socketRef.current.on("user-joined", (id, clients) => {
      handleUserJoined(id, clients, socketRef, socketIdRef, setVideos, videoRef);
    });
  });
};

const gotMessageFromServer = (fromId, message, socketIdRef) => {
  const signal = JSON.parse(message);

  if (fromId !== socketIdRef.current) {
    if (signal.sdp) {
      connections[fromId]
        .setRemoteDescription(new RTCSessionDescription(signal.sdp))
        .then(() => {
          if (signal.sdp.type === "offer") {
            connections[fromId].createAnswer().then((description) => {
              connections[fromId]
                .setLocalDescription(description)
                .then(() => {
                  socketRef.current.emit(
                    "signal",
                    fromId,
                    JSON.stringify({
                      sdp: connections[fromId].localDescription,
                    })
                  );
                })
                .catch((error) => {
                  console.error("Error sending signal:", error);
                  toast.error("Failed to send signal. Please try again.");
                });
            });
          }
        })
        .catch((error) => {
          console.error("Error setting remote description:", error);
          toast.error("Failed to set remote description. Please try again.");
        });
    }
    if (signal.ice) {
      connections[fromId]
        .addIceCandidate(new RTCIceCandidate(signal.ice))
        .catch((error) => {
          console.error("Error adding ICE candidate:", error);
          toast.error("Failed to add ICE candidate. Please try again.");
        });
    }
  }
};

const handleUserJoined = (id, clients, socketRef, socketIdRef, setVideos, videoRef) => {
  clients.forEach((socketListId) => {
    connections[socketListId] = new RTCPeerConnection(peerConfigConnections);
    
    connections[socketListId].onicecandidate = (event) => {
      if (event.candidate !== null) {
        socketRef.current.emit(
          "signal",
          socketListId,
          JSON.stringify({ ice: event.candidate })
        );
      }
    };

    connections[socketListId].onaddstream = (event) => {
      let videoExists =
        videoRef.current &&
        videoRef.current.find((video) => video.socketId === socketListId);

      if (videoExists) {
        setVideos((videos) => {
          const updatedVideos = videos.map((video) =>
            video.socketId === socketListId
              ? { ...video, stream: event.stream }
              : video
          );
          videoRef.current = updatedVideos;
          return updatedVideos;
        });
      } else {
        let newVideo = {
          socketId: socketListId,
          stream: event.stream,
          autoPlay: true,
          playsinline: true,
        };

        setVideos((videos) => {
          const updatedVideos = [...videos, newVideo];
          videoRef.current = updatedVideos;
          return updatedVideos;
        });
      }
    };

    if (window.localStream !== undefined && window.localStream !== null) {
      window.localStream.getTracks().forEach(track => {
        connections[socketListId].addTrack(track, window.localStream);
      });
    }
  });

  // Handle when current user joins - create offers for existing users
  if (id === socketIdRef.current) {
    for (let id2 in connections) {
      if (id2 === socketIdRef.current) continue;

      try {
        if (window.localStream && window.localStream.getTracks) {
          window.localStream.getTracks().forEach(track => {
            connections[id2].addTrack(track, window.localStream);
          });
        }
      } catch (error) {
        console.error("Error adding stream to connection:", error);
      }

      connections[id2].createOffer().then((description) => {
        connections[id2]
          .setLocalDescription(description)
          .then(() => {
            socketRef.current.emit(
              "signal",
              id2,
              JSON.stringify({ sdp: connections[id2].localDescription })
            );
          })
          .catch((error) => {
            console.error("Error setting local description:", error);
          });
      });
    }
  }
};