import React, { useEffect } from "react";
import { toast } from "react-toastify";
import axios from "axios";

const server_url = import.meta.env.VITE_BACKEND_URL || "http://localhost:9000";

const client = axios.create({
  baseURL: server_url,
  withCredentials: true,
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem("userToken");
  if (token) {
    config.headers["x-auth-token"] = token;
    config.headers["Authorization"] = `Bearer ${token}`;
  }
  return config;
});

const generateInterviewCode = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export default function InterviewSetup({
  interviewCode,
  setInterviewCode,
  interviewState,
  setInterviewState,
  isValidatingCode,
  setIsValidatingCode,
  isCreatingInterview,
  setIsCreatingInterview,
  localVideoRef,
  onJoinInterview,
}) {
  // Start camera preview on component mount
  useEffect(() => {
    const startPreview = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error("Error accessing camera:", error);
        toast.error("Please allow camera and microphone access");
      }
    };

    startPreview();

    // Cleanup on unmount
    return () => {
      if (localVideoRef.current && localVideoRef.current.srcObject) {
        const tracks = localVideoRef.current.srcObject.getTracks();
        tracks.forEach((track) => track.stop());
      }
    };
  }, []);

  const handleCreateInterview = async () => {
    setIsCreatingInterview(true);
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      const newInterviewCode = generateInterviewCode();

      try {
        const response = await client.post("/interview/create", {
          session_id: newInterviewCode,
          interview_config: {
            duration_minutes: 60,
            face_detection_enabled: true,
            code_editor_enabled: true,
            recording_enabled: false,
          },
        });

        if (response.data.success) {
          setInterviewCode(newInterviewCode);
          setInterviewState("create");
          toast.success("Interview session created successfully!");
          break;
        }
      } catch (error) {
        console.error("Error creating interview:", error);
        if (error.response?.data?.message?.includes("already exists")) {
          attempts++;
          if (attempts >= maxAttempts) {
            toast.error(
              "Failed to generate unique interview code. Please try again."
            );
          }
          continue;
        } else {
          const errorMessage =
            error.response?.data?.message ||
            "Failed to create interview. Please try again.";
          toast.error(errorMessage);
          break;
        }
      }
    }

    setIsCreatingInterview(false);
  };

  const connectToInterview = async () => {
    if (!interviewCode) {
      toast.error("Please enter an interview code");
      return;
    }

    setIsValidatingCode(true);

    try {
      if (interviewState === "create") {
        onJoinInterview();
      } else {
        const response = await client.post("/interview/join", {
          session_id: interviewCode,
        });

        if (response.data.success) {
          onJoinInterview();
          toast.success("Joining interview...");
        }
      }
    } catch (error) {
      console.error("Error validating interview code:", error);
      const errorMessage =
        error.response?.data?.message ||
        "Failed to validate interview code. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsValidatingCode(false);
    }
  };

  return (
    <>
      <h1>Interviews</h1>

      <button
        onClick={handleCreateInterview}
        disabled={isCreatingInterview}
        className="bg-green-500 text-white px-4 py-2 rounded mr-2 disabled:bg-gray-400"
      >
        {isCreatingInterview ? "Creating..." : "Create an Interview"}
      </button>

      <button
        onClick={() => setInterviewState("join")}
        className="bg-blue-500 text-white px-4 py-2 rounded"
      >
        Join an Interview
      </button>
      <br />

      {interviewState === "create" ? (
        <div className="mt-4">
          <h2>Create an interview</h2>
          <div>
            <p>Interview Code:</p>
            <p className="font-bold text-lg">
              {interviewCode || "Generating..."}
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-4">
          <h2>Join an interview</h2>
          <input
            type="text"
            placeholder="Enter interview code"
            value={interviewCode || ""}
            onChange={(e) => setInterviewCode(e.target.value.toUpperCase())}
            className="border border-gray-300 p-2 rounded mr-2"
            maxLength="6"
          />
        </div>
      )}

      <div className="mt-4">
        <video
          ref={localVideoRef}
          autoPlay
          muted
          playsInline
          className="w-[300px] h-[200px] bg-gray-800 rounded"
        ></video>
      </div>

      <button
        onClick={connectToInterview}
        disabled={
          isValidatingCode || (interviewState === "join" && !interviewCode)
        }
        className="bg-blue-500 text-white px-4 py-2 rounded mt-2 disabled:bg-gray-400"
      >
        {isValidatingCode ? "Validating..." : "Connect"}
      </button>
    </>
  );
}
