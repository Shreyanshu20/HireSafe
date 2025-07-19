import React, { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import io from "socket.io-client";
import axios from "axios";

const server_url = import.meta.env.VITE_BACKEND_URL || "http://localhost:9000";

const connections = {};

const peerConfigConnections = {
  iceServers: [
    {
      urls: "stun:stun.l.google.com:19302",
    },
  ],
};

const generateMeetingCode = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 9; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const client = axios.create({
  baseURL: server_url,
  withCredentials: true,
});

export default function Meetings() {
  var socketRef = useRef();
  let socketIdRef = useRef();
  let localVideoRef = useRef();

  let [videoAvailable, setVideoAvailable] = useState(true);
  let [audioAvailable, setAudioAvailable] = useState(true);
  let [video, setVideo] = useState([]);
  let [audio, setAudio] = useState();
  let [screen, setScreen] = useState();
  let [showModal, setShowModal] = useState();
  let [screenAvailable, setScreenAvailable] = useState();
  let [messages, setMessages] = useState([]);
  let [message, setMessage] = useState("");
  let [newMessage, setNewMessage] = useState(0);
  let [meetingCode, setMeetingCode] = useState();
  let [meetingState, setMeetingState] = useState("join");
  let [askForMeetingCode, setAskForMeetingCode] = useState(true);
  let [isValidatingCode, setIsValidatingCode] = useState(false);

  const videoRef = useRef();
  let [videos, setVideos] = useState([]);

  const getPermissions = async () => {
    try {
      const videoPermission = await navigator.mediaDevices.getUserMedia({
        video: true,
      });

      if (videoPermission) {
        setVideoAvailable(true);
      } else {
        setVideoAvailable(false);
      }

      const audioPermission = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      if (audioPermission) {
        setAudioAvailable(true);
      } else {
        setAudioAvailable(false);
      }

      if (navigator.mediaDevices.getDisplayMedia) {
        setScreenAvailable(true);
      } else {
        setScreenAvailable(false);
      }

      if (videoAvailable || audioAvailable) {
        const userMediaStream = await navigator.mediaDevices.getUserMedia({
          video: videoAvailable,
          audio: audioAvailable,
        });

        if (userMediaStream) {
          window.localStream = userMediaStream;

          if (localVideoRef.current) {
            localVideoRef.current.srcObject = userMediaStream;
          }
        }
      }
    } catch (error) {
      console.error("Error getting permissions:", error);
      toast.error(
        "Failed to get permissions. Please check your browser settings."
      );
    }
  };

  useEffect(() => {
    getPermissions();
  }, []);

  let getUserMediaSuccess = (stream) => {
    try {
      window.localStream.getTracks().forEach((track) => track.stop());
    } catch (error) {
      console.error("Error stopping previous tracks:", error);
      toast.error("Failed to stop previous media tracks. Please try again.");
    }

    window.localStream = stream;
    localVideoRef.current.srcObject = stream;

    for (let id in connections) {
      if (id === socketIdRef.current) {
        continue;
      }

      connections[id].addStream(window.localStream);

      connections[id].createOffer().then((description) => {
        connections[id]
          .setLocalDescription(description)
          .then(() => {
            socketIdRef.current.emit(
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

    stream.getTracks().forEach(
      (track) =>
        (track.onended = () => {
          setVideo(false);
          setAudio(false);

          try {
            let tracks = localVideoRef.current.srcObject.getTracks();
            tracks.forEach((track) => track.stop());
          } catch (error) {
            console.error("Error stopping media tracks:", error);
            toast.error("Failed to stop media tracks. Please try again.");
          }

          let blackSilence = (...args) =>
            new MediaStream([black(...args), silence()]);
          window.localStream = blackSilence();
          localVideoRef.current.srcObject = window.localStream;

          for (let id in connections) {
            connections[id].addStream(window.localStream);
            connections[id]
              .createOffer()
              .then((description) => {
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
                    console.error("Error sending signal:", error);
                    toast.error("Failed to send signal. Please try again.");
                  });
              })
              .catch((error) => {
                console.error("Error setting local description:", error);
                toast.error(
                  "Failed to set local description. Please try again."
                );
              });
          }
        })
    );
  };

  let silence = () => {
    let ctx = new AudioContext();
    let oscillator = ctx.createOscillator();

    let dst = oscillator.connect(ctx.createMediaStreamDestination());
    oscillator.start();
    ctx.resume();
    return Object.assign(dst.stream.getAudioTracks()[0], { enabled: false });
  };

  let black = ({ width = 640, height = 480 } = {}) => {
    let canvas = Object.assign(document.createElement("canvas"), {
      width,
      height,
    });

    canvas.getContext("2d").fillRect(0, 0, width, height);
    let stream = canvas.captureStream();
    return Object.assign(stream.getVideoTracks()[0], { enabled: false });
  };

  let getUserMedia = () => {
    if ((video && videoAvailable) || (audio && audioAvailable)) {
      navigator.mediaDevices
        .getUserMedia({ video: video, audio: audio })
        .then(getUserMediaSuccess)
        .then((stream) => {})
        .catch((error) => {
          console.error("Error accessing media devices:", error);
          toast.error("Failed to access media devices. Please try again.");
        });
    } else {
      try {
        let tracks = localVideoRef.current.srcObject.getTracks();
        tracks.forEach((track) => track.stop());
      } catch (error) {
        console.error("Error stopping media tracks:", error);
        toast.error("Failed to stop media tracks. Please try again.");
      }
    }
  };

  useEffect(() => {
    if (video !== undefined && audio !== undefined) {
      getUserMedia();
    }
  }, [audio, video]);

  let addMessage = () => {};

  let gotMessageFromServer = (fromId, message) => {
    var signal = JSON.parse(message);

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

  let connectToSocketServer = () => {
    socketRef.current = io.connect(server_url, { secure: false });

    socketRef.current.on("signal", gotMessageFromServer);

    socketRef.current.on("connect", () => {
      socketRef.current.emit("join-call", meetingCode);
      toast.success("Connected to the meeting successfully!");

      socketIdRef.current = socketRef.current.id;
      socketRef.current.on("chat-message", addMessage);

      socketRef.current.on("user-left", (id) => {
        setVideos((videos) => videos.filter((video) => video.socketId !== id));
      });

      socketRef.current.on("user-joined", (id, clients) => {
        clients.forEach((socketListId) => {
          connections[socketListId] = new RTCPeerConnection(
            peerConfigConnections
          );
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
            let videoExists = videoRef.current.find(
              (video) => video.socketId === socketListId
            );

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
            connections[socketListId].addStream(window.localStream);
          } else {
            let blackSilence = (...args) =>
              new MediaStream([black(...args), silence()]);
            window.localStream = blackSilence();
            connections[socketListId].addStream(window.localStream);
          }
        });

        if (id === socketIdRef.current) {
          for (let id2 in connections) {
            if (id2 === socketRef.current) {
              continue;
            }

            try {
              connections[id2].addStream(window.localStream);
            } catch (error) {
              console.error("Error adding stream to connection:", error);
              toast.error(
                "Failed to add stream to connection. Please try again."
              );
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
                  toast.error(
                    "Failed to set local description. Please try again."
                  );
                });
            });
          }
        }
      });
    });
  };

  let getMedia = () => {
    setVideo(videoAvailable);
    setAudio(audioAvailable);
    connectToSocketServer();
  };

  const handleCreateMeeting = async () => {
    const newMeetingCode = generateMeetingCode();

    try {
      const response = await client.post("/meeting/create", {
        meeting_code: newMeetingCode,
      });

      if (response.data.success) {
        setMeetingCode(newMeetingCode);
        setMeetingState("create");
        toast.success("Meeting created successfully!");
      }
    } catch (error) {
      console.error("Error creating meeting:", error);
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error("Failed to create meeting. Please try again.");
      }
    }
  };

  const connectToMeeting = async () => {
    if (!meetingCode) {
      toast.error("Please enter a meeting code");
      return;
    }

    setIsValidatingCode(true);

    try {
      if (meetingState === "create") {
        setAskForMeetingCode(false);
        getMedia();
      } else {
        const response = await client.post("/meeting/join", {
          meeting_code: meetingCode,
        });

        if (response.data.success) {
          setAskForMeetingCode(false);
          getMedia();
          toast.success("Joining meeting...");
        }
      }
    } catch (error) {
      console.error("Error validating meeting code:", error);
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error("Failed to validate meeting code. Please try again.");
      }
    } finally {
      setIsValidatingCode(false);
    }
  };

  let handleVideo = () => {
    setVideo(!video);
  };

  let handleAudio = () => {
    setAudio(!audio);
  };

  return (
    <>
      {askForMeetingCode ? (
        <>
          <h1>Meetings</h1>

          <button onClick={handleCreateMeeting}>Create a Meeting</button>

          <button onClick={() => setMeetingState("join")}>
            Join a Meeting
          </button>
          <br />

          {meetingState === "create" ? (
            <div>
              <h2>Create a meeting</h2>
              <p>Meeting Code: {meetingCode}</p>
            </div>
          ) : (
            <div>
              <h2>Join a meeting</h2>
              <input
                type="text"
                placeholder="Enter meeting code"
                value={meetingCode || ""}
                onChange={(e) => setMeetingCode(e.target.value)}
              />
            </div>
          )}

          <div>
            <video ref={localVideoRef} autoPlay muted></video>
          </div>
          <button onClick={connectToMeeting} disabled={isValidatingCode}>
            {isValidatingCode ? "Validating..." : "Connect"}
          </button>
        </>
      ) : (
        <>
          <div>
            <video ref={localVideoRef} autoPlay muted></video>
            <br />
            <button onClick={handleVideo}>Video</button>
            <button onClick={handleAudio}>Audio</button>
            <button>Chat</button>
            <button>Screen Share</button>
            <button>End Call</button>

            {videos.map((video) => (
              <div key={video.socketId}>
                <h2>{video.socketId}</h2>
                <video
                  data-socket={video.socketId}
                  ref={(ref) => {
                    if (ref && video.stream) {
                      ref.srcObject = video.stream;
                    }
                  }}
                  autoPlay
                ></video>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
