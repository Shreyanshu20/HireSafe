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
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

const generateInterviewCode = () => {
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
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      const newInterviewCode = generateInterviewCode();
      
      try {
        const response = await client.post("/interview/create", {
          meeting_code: newInterviewCode,
          interview_config: {
            recording_enabled: true,
            monitoring_enabled: true
          }
        });

        if (response.data.success) {
          setMeetingCode(newInterviewCode);
          setMeetingState("create");
          toast.success("Interview created successfully!");
          break;
        }
      } catch (error) {
        console.error("Error creating interview:", error);
        if (error.response?.data?.message?.includes("already exists")) {
          attempts++;
          if (attempts >= maxAttempts) {
            toast.error("Failed to generate unique interview code. Please try again.");
          }
          continue;
        } else {
          const errorMessage = error.response?.data?.message || "Failed to create interview. Please try again.";
          toast.error(errorMessage);
          break;
        }
      }
    }
    
    setIsCreatingMeeting(false);
  };

  const connectToInterview = async () => {
    if (!meetingCode) {
      toast.error("Please enter interview code");
      return;
    }

    setIsValidatingCode(true);

    try {
      if (meetingState === "create") {
        const response = await client.post("/interview/join", {
          meeting_code: meetingCode,
        });

        if (response.data.success) {
          onJoinInterview(response.data.interview);
          toast.success("Joining interview...");
        }
      } else {
        const response = await client.post("/interview/join", {
          meeting_code: meetingCode,
        });

        if (response.data.success) {
          onJoinInterview(response.data.interview);
          toast.success("Joining interview...");
        }
      }
    } catch (error) {
      console.error("Error joining interview:", error);
      const errorMessage = error.response?.data?.message || "Failed to join interview. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsValidatingCode(false);
    }
  };

  return (
    <div className="meet">
      <div className="header">
        <div className="logo">
          <h2>Interview Session</h2>
        </div>
      </div>

      <div className="meetingtype">
        <div className="meetingtype-content">
          <h3>Create or Join Interview</h3>
          <div className="meet-join-wrapper">
            <button 
              onClick={handleCreateInterview}
              disabled={isCreatingMeeting}
              className="btn-no-mic"
            >
              {isCreatingMeeting ? "Creating Interview..." : "Create New Interview"}
            </button>
            
            <button 
              onClick={() => setMeetingState("join")}
              className="btn-no-mic"
            >
              Join Existing Interview
            </button>
          </div>

          {meetingState === "create" && (
            <div className="meeting-created">
              <h3>Interview Created Successfully!</h3>
              <p>Share this code with the interviewee:</p>
              <div className="meeting-code">
                {meetingCode || "Generating..."}
              </div>
              <p>You will be the <strong>interviewer</strong></p>
            </div>
          )}

          {meetingState === "join" && (
            <div className="meeting-join">
              <h3>Join Interview</h3>
              <input
                type="text"
                placeholder="Enter interview code (e.g. INT123456)"
                value={meetingCode || ""}
                onChange={(e) => setMeetingCode(e.target.value.toUpperCase())}
                maxLength="9"
              />
              <p>You will be the <strong>interviewee</strong></p>
            </div>
          )}

          <div className="meet-video">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
            ></video>
          </div>
        </div>

        <div className="btn-meet-join-wrapper">
          <button
            onClick={connectToInterview}
            disabled={isValidatingCode || (meetingState === "join" && !meetingCode)}
            className="btn-meet-join"
          >
            {isValidatingCode ? "Connecting..." : "Start Interview"}
          </button>
          
          <p className="warning">⚠️ This session will be monitored for malpractice detection</p>
        </div>
      </div>
    </div>
  );
}