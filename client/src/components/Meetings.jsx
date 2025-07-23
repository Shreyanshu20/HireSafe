import React, { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import io from "socket.io-client";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

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
  const { isAuthenticated, isLoading } = useAuth();
  
  var socketRef = useRef();
  let socketIdRef = useRef();
  let localVideoRef = useRef();

  let [videoAvailable, setVideoAvailable] = useState(true);
  let [audioAvailable, setAudioAvailable] = useState(true);
  let [video, setVideo] = useState(false);
  let [audio, setAudio] = useState(false);
  let [screen, setScreen] = useState(false);
  let [showModal, setShowModal] = useState(false);
  let [screenAvailable, setScreenAvailable] = useState();
  let [messages, setMessages] = useState([]);
  let [message, setMessage] = useState("");
  let [newMessage, setNewMessage] = useState(0);
  let [meetingCode, setMeetingCode] = useState();
  let [meetingState, setMeetingState] = useState("join");
  let [askForMeetingCode, setAskForMeetingCode] = useState(true);
  let [isValidatingCode, setIsValidatingCode] = useState(false);
  let [isCreatingMeeting, setIsCreatingMeeting] = useState(false);

  const videoRef = useRef();
  let [videos, setVideos] = useState([]);

  // Separate streams for camera and screen
  let [cameraStream, setCameraStream] = useState(null);
  let [screenStream, setScreenStream] = useState(null);

  // Check authentication on component mount
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast.error("Please log in to access meetings");
      return;
    }
  }, [isAuthenticated, isLoading]);

  const getPermissions = async () => {
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
      if (videoAvailable || audioAvailable) {
        const userMediaStream = await navigator.mediaDevices.getUserMedia({
          video: videoAvailable,
          audio: audioAvailable,
        });

        if (userMediaStream) {
          setCameraStream(userMediaStream);
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
    if (isAuthenticated) {
      getPermissions();
    }
  }, [isAuthenticated]);

  // Function to update the stream sent to peers
  const updatePeerConnections = (streamToSend) => {
    for (let id in connections) {
      if (id === socketIdRef.current) {
        continue;
      }

      // Remove old stream
      const senders = connections[id].getSenders();
      senders.forEach(sender => {
        if (sender.track) {
          connections[id].removeTrack(sender);
        }
      });

      // Add new stream
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

  let getUserMediaSuccess = (stream) => {
    try {
      if (cameraStream && cameraStream.getTracks) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
    } catch (error) {
      console.error("Error stopping previous camera tracks:", error);
    }

    setCameraStream(stream);

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }

    const streamToSend = screen && screenStream ? screenStream : stream;
    window.localStream = streamToSend;

    updatePeerConnections(streamToSend);

    stream.getTracks().forEach(
      (track) =>
        (track.onended = () => {
          setVideo(false);
          setAudio(false);
          setCameraStream(null);

          let blackSilence = (...args) =>
            new MediaStream([black(...args), silence()]);
          
          const fallbackStream = screen && screenStream ? screenStream : blackSilence();
          window.localStream = fallbackStream;
          
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = blackSilence();
          }

          updatePeerConnections(fallbackStream);
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

        const streamToSend = screen && screenStream ? screenStream : (() => {
          let blackSilence = (...args) => new MediaStream([black(...args), silence()]);
          return blackSilence();
        })();
        
        window.localStream = streamToSend;
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = streamToSend;
        }

        updatePeerConnections(streamToSend);
      } catch (error) {
        console.error("Error stopping media tracks:", error);
        toast.error("Failed to stop media tracks. Please try again.");
      }
    }
  };

  let getDisplayMedia = () => {
    if (screen) {
      if (navigator.mediaDevices.getDisplayMedia) {
        navigator.mediaDevices
          .getDisplayMedia({ video: true, audio: true })
          .then(getDisplayMediaSuccess)
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

      const streamToSend = cameraStream || (() => {
        let blackSilence = (...args) => new MediaStream([black(...args), silence()]);
        return blackSilence();
      })();
      
      window.localStream = streamToSend;
      updatePeerConnections(streamToSend);
    }
  };

  let getDisplayMediaSuccess = (stream) => {
    setScreenStream(stream);
    
    window.localStream = stream;
    updatePeerConnections(stream);

    if (localVideoRef.current && cameraStream) {
      localVideoRef.current.srcObject = cameraStream;
    }

    stream.getTracks().forEach(
      (track) =>
        (track.onended = () => {
          setScreen(false);
          setScreenStream(null);

          const streamToSend = cameraStream || (() => {
            let blackSilence = (...args) => new MediaStream([black(...args), silence()]);
            return blackSilence();
          })();
          
          window.localStream = streamToSend;
          updatePeerConnections(streamToSend);
        })
    );
  };

  useEffect(() => {
    if (video !== undefined && audio !== undefined) {
      getUserMedia();
    }
  }, [audio, video]);

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
    socketRef.current = io.connect(server_url, {
      secure: false,
      withCredentials: true,
    });

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
          } else {
            let blackSilence = (...args) =>
              new MediaStream([black(...args), silence()]);
            window.localStream = blackSilence();
            window.localStream.getTracks().forEach(track => {
              connections[socketListId].addTrack(track, window.localStream);
            });
          }
        });

        if (id === socketIdRef.current) {
          for (let id2 in connections) {
            if (id2 === socketIdRef.current) {
              continue;
            }

            try {
              if (window.localStream && window.localStream.getTracks) {
                window.localStream.getTracks().forEach(track => {
                  connections[id2].addTrack(track, window.localStream);
                });
              }
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
    if (!isAuthenticated) {
      toast.error("Please log in to create a meeting");
      return;
    }

    setIsCreatingMeeting(true);
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      const newMeetingCode = generateMeetingCode();
      
      try {
        const response = await client.post("/meeting/create", {
          meeting_code: newMeetingCode,
        });

        if (response.data.success) {
          setMeetingCode(newMeetingCode);
          setMeetingState("create");
          toast.success("Meeting created successfully!");
          break;
        }
      } catch (error) {
        console.error("Error creating meeting:", error);
        if (error.response?.data?.message?.includes("already exists")) {
          attempts++;
          if (attempts >= maxAttempts) {
            toast.error("Failed to generate unique meeting code. Please try again.");
          }
          continue;
        } else {
          const errorMessage = error.response?.data?.message || "Failed to create meeting. Please try again.";
          toast.error(errorMessage);
          break;
        }
      }
    }
    
    setIsCreatingMeeting(false);
  };

  const connectToMeeting = async () => {
    if (!isAuthenticated) {
      toast.error("Please log in to join a meeting");
      return;
    }

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
      const errorMessage = error.response?.data?.message || "Failed to validate meeting code. Please try again.";
      toast.error(errorMessage);
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

  useEffect(() => {
    if (screen !== undefined) {
      getDisplayMedia();
    }
  }, [screen]);

  let handleScreen = () => {
    setScreen(!screen);
  };

  let handleEndCall = () => {
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
    } catch (error) {
      console.error("Error stopping media tracks:", error);
      toast.error("Failed to stop media tracks. Please try again.");
    }
    window.location.href = "/";
  };

  let openChat = () => {
    setShowModal(true);
    setNewMessage(0);
  };

  let closeChat = () => {
    setShowModal(false);
  };

  let handleMessage = (e) => {
    setMessage(e.target.value);
  };

  const addMessage = (data, sender, socketIdSender) => {
    setMessages((prevMessages) => [
      ...prevMessages,
      { sender: sender, data: data },
    ]);
    if (socketIdSender !== socketIdRef.current) {
      setNewMessage((prevNewMessage) => prevNewMessage + 1);
    }
  };

  let sendMessage = () => {
    if (message.trim()) {
      socketRef.current.emit("chat-message", message, "You");
      setMessage("");
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  // Show login message if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl mb-4">Authentication Required</h1>
          <p>Please log in to access meetings.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {askForMeetingCode ? (
        <>
          <h1>Meetings</h1>

          <button 
            onClick={handleCreateMeeting}
            disabled={isCreatingMeeting}
            className="bg-green-500 text-white px-4 py-2 rounded mr-2 disabled:bg-gray-400"
          >
            {isCreatingMeeting ? "Creating..." : "Create a Meeting"}
          </button>

          <button 
            onClick={() => setMeetingState("join")}
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            Join a Meeting
          </button>
          <br />

          {meetingState === "create" ? (
            <div className="mt-4">
              <h2>Create a meeting</h2>
              <div>
                <p>Meeting Code:</p>
                <p className="font-bold text-lg">{meetingCode || "Generating..."}</p>
              </div>
            </div>
          ) : (
            <div className="mt-4">
              <h2>Join a meeting</h2>
              <input
                type="text"
                placeholder="Enter meeting code"
                value={meetingCode || ""}
                onChange={(e) => setMeetingCode(e.target.value.toUpperCase())}
                className="border border-gray-300 p-2 rounded mr-2"
                maxLength="9"
              />
            </div>
          )}

          <div className="mt-4">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              className="w-[300px] h-[200px] bg-gray-800 rounded"
            ></video>
          </div>
          <button
            onClick={connectToMeeting}
            disabled={isValidatingCode || (meetingState === "join" && !meetingCode)}
            className="bg-blue-500 text-white px-4 py-2 rounded mt-2 disabled:bg-gray-400"
          >
            {isValidatingCode ? "Validating..." : "Connect"}
          </button>
        </>
      ) : (
        <>
          <div className="mb-4">
            <strong>Meeting Code: {meetingCode}</strong>
          </div>

          <div>
            <video
              ref={localVideoRef}
              autoPlay
              muted
              className="w-[400px] h-[300px] bg-gray-800 rounded"
            ></video>

            {screen && screenStream && (
              <div className="mt-4">
                <h3>Your Screen Share</h3>
                <video
                  ref={(ref) => {
                    if (ref && screenStream) {
                      ref.srcObject = screenStream;
                    }
                  }}
                  autoPlay
                  muted
                  className="w-[400px] h-[300px] bg-gray-800 rounded"
                ></video>
              </div>
            )}

            <br />
            <button
              onClick={handleVideo}
              className="mr-2 p-2 bg-blue-500 text-white rounded"
            >
              {video ? "Video On" : "Video Off"}
            </button>
            <button
              onClick={handleAudio}
              className="mr-2 p-2 bg-green-500 text-white rounded"
            >
              {audio ? "Audio On" : "Audio Off"}
            </button>
            <button
              onClick={openChat}
              className="mr-2 p-2 bg-purple-500 text-white rounded"
            >
              Chat {newMessage > 0 && `(${newMessage})`}
            </button>
            <button
              onClick={handleScreen}
              className="mr-2 p-2 bg-orange-500 text-white rounded"
            >
              {screen ? "Stop Share" : "Screen Share"}
            </button>
            <button
              onClick={handleEndCall}
              className="mr-2 p-2 bg-red-500 text-white rounded"
            >
              End Call
            </button>

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
                  className="w-[400px] h-[300px] bg-gray-800 rounded"
                ></video>
              </div>
            ))}
          </div>

          {showModal && (
            <div className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 flex justify-center items-center z-[1000]">
              <div className="bg-white w-[400px] h-[500px] rounded-lg flex flex-col">
                <div className="p-[15px] border-b border-gray-300 flex justify-between items-center">
                  <h3 className="m-0">Chat</h3>
                  <button
                    onClick={closeChat}
                    className="bg-none border-none text-xl cursor-pointer"
                  >
                    ×
                  </button>
                </div>

                <div className="flex-1 p-[10px] overflow-y-auto max-h-[350px]">
                  {messages.length === 0 ? (
                    <p className="text-center text-gray-600">No messages yet</p>
                  ) : (
                    messages.map((msg, index) => (
                      <div
                        key={index}
                        className="mb-[10px] p-2 bg-gray-100 rounded"
                      >
                        <strong>{msg.sender}: </strong>
                        <span>{msg.data}</span>
                      </div>
                    ))
                  )
                }</div>

                <div className="p-[15px] border-t border-gray-300 flex gap-[10px]">
                  <input
                    type="text"
                    value={message}
                    onChange={handleMessage}
                    placeholder="Type a message..."
                    className="flex-1 p-2 border border-gray-300 rounded"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        sendMessage();
                      }
                    }}
                  />
                  <button
                    onClick={sendMessage}
                    className="px-4 py-2 bg-blue-600 text-white border-none rounded cursor-pointer"
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}