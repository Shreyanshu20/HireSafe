import React from "react";
import { toast } from "react-toastify";
import axios from "axios";

const server_url = import.meta.env.VITE_BACKEND_URL || "http://localhost:9000";

const client = axios.create({
  baseURL: server_url,
  withCredentials: true,
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('userToken');
  if (token) {
    config.headers['x-auth-token'] = token;
  }
  return config;
});

const generateMeetingCode = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "INT";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export default function InterviewSetup({
  meetingCode,
  setMeetingCode,
  meetingState,
  setMeetingState,
  isValidatingCode,
  setIsValidatingCode,
  isCreatingMeeting,
  setIsCreatingMeeting,
  localVideoRef,
  onJoinInterview
}) {

  const handleCreateInterview = async () => {
    setIsCreatingMeeting(true);
    const newMeetingCode = generateMeetingCode();
    
    try {
      const response = await client.post("/meeting/create", {
        meeting_code: newMeetingCode,
        meeting_type: "interview",
        interview_config: {
          recording_enabled: true,
          monitoring_enabled: true
        }
      });

      if (response.data.success) {
        setMeetingCode(newMeetingCode);
        setMeetingState("create");
        toast.success("Interview created!");
      }
    } catch (error) {
      console.error("Error creating interview:", error);
      toast.error("Failed to create interview");
    } finally {
      setIsCreatingMeeting(false);
    }
  };

  const connectToInterview = async () => {
    if (!meetingCode) {
      toast.error("Please enter interview code");
      return;
    }

    setIsValidatingCode(true);

    try {
      const response = await client.post("/meeting/join", {
        meeting_code: meetingCode,
      });

      if (response.data.success) {
        if (response.data.meeting.meeting_type !== 'interview') {
          toast.error("Not an interview session");
          return;
        }
        
        onJoinInterview(response.data.meeting);
        toast.success("Joining interview...");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to join interview");
    } finally {
      setIsValidatingCode(false);
    }
  };

  return (
    <>
      <h1>Interview Session</h1>

      <button 
        onClick={handleCreateInterview}
        disabled={isCreatingMeeting}
        className="bg-purple-500 text-white px-4 py-2 rounded mr-2 disabled:bg-gray-400"
      >
        {isCreatingMeeting ? "Creating..." : "Create Interview"}
      </button>

      <button 
        onClick={() => setMeetingState("join")}
        className="bg-blue-500 text-white px-4 py-2 rounded"
      >
        Join Interview
      </button>
      <br />

      {meetingState === "create" ? (
        <div className="mt-4">
          <h2>Create Interview</h2>
          <div>
            <p>Interview Code:</p>
            <p className="font-bold text-lg">{meetingCode || "Generating..."}</p>
          </div>
        </div>
      ) : (
        <div className="mt-4">
          <h2>Join Interview</h2>
          <input
            type="text"
            placeholder="Enter interview code"
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
          playsInline
          className="w-[300px] h-[200px] bg-gray-800 rounded"
        ></video>
      </div>
      
      <button
        onClick={connectToInterview}
        disabled={isValidatingCode || (meetingState === "join" && !meetingCode)}
        className="bg-green-500 text-white px-4 py-2 rounded mt-2 disabled:bg-gray-400"
      >
        {isValidatingCode ? "Connecting..." : "Start Interview"}
      </button>
    </>
  );
}