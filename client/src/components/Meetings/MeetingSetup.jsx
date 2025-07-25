import React from "react";
import { toast } from "react-toastify";
import axios from "axios";

const server_url = import.meta.env.VITE_BACKEND_URL || "http://localhost:9000";

const client = axios.create({
  baseURL: server_url,
  withCredentials: true,
});

const generateMeetingCode = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 9; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export default function MeetingSetup({
  meetingCode,
  setMeetingCode,
  meetingState,
  setMeetingState,
  isValidatingCode,
  setIsValidatingCode,
  isCreatingMeeting,
  setIsCreatingMeeting,
  localVideoRef,
  onJoinMeeting
}) {

  const handleCreateMeeting = async () => {
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
    if (!meetingCode) {
      toast.error("Please enter a meeting code");
      return;
    }

    setIsValidatingCode(true);

    try {
      if (meetingState === "create") {
        onJoinMeeting();
      } else {
        const response = await client.post("/meeting/join", {
          meeting_code: meetingCode,
        });

        if (response.data.success) {
          onJoinMeeting();
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

  return (
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
  );
}