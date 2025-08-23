import { io } from "socket.io-client";

// Interview-specific socket utilities (separate from meetings)
let socket = null;

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:9000";

export const interviewService = {
  // Create a new interview session
  createInterview: async (sessionId, interviewConfig = {}) => {
    try {
      const response = await fetch(`${API_BASE}/interview/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          session_id: sessionId,
          interview_config: interviewConfig,
        }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error creating interview:", error);
      throw error;
    }
  },

  // Join an existing interview session
  joinInterview: async (sessionId) => {
    try {
      const response = await fetch(`${API_BASE}/interview/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          session_id: sessionId,
        }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error joining interview:", error);
      throw error;
    }
  },

  // Verify interview session exists
  verifyInterview: async (sessionId) => {
    try {
      const response = await fetch(
        `${API_BASE}/interview/verify/${sessionId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        }
      );

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error verifying interview:", error);
      throw error;
    }
  },

  // End interview session
  endInterviewSession: async (sessionId, interviewSessionId = null) => {
    try {
      const response = await fetch(`${API_BASE}/interview/end-session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          sessionId,
          interviewSessionId,
        }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error ending interview session:", error);
      throw error;
    }
  },

  // Log malpractice detection (NEW - interview-specific)
  logMalpractice: async (sessionId, type, confidence, description = "") => {
    try {
      const response = await fetch(`${API_BASE}/interview/log-malpractice`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          session_id: sessionId,
          type,
          confidence,
          description,
        }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error logging malpractice:", error);
      throw error;
    }
  },
};

export const connectToInterviewServer = (sessionId, userRole) => {
  if (socket) {
    socket.disconnect();
  }

  // Use interview-specific namespace or room
  socket = io("/", {
    transports: ["websocket", "polling"],
    upgrade: true,
    rememberUpgrade: true,
  });

  socket.emit("join-interview-room", {
    sessionId,
    userRole, // 'interviewer' or 'interviewee'
    timestamp: new Date().toISOString(),
  });

  return socket;
};

export const sendInterviewMessage = (message, sessionId, sender) => {
  if (socket) {
    socket.emit("interview-message", {
      message,
      sessionId,
      sender,
      timestamp: new Date().toISOString(),
    });
  }
};

export const sendCodeChange = (code, language, sessionId) => {
  if (socket) {
    socket.emit("code-editor-change", {
      code,
      language,
      sessionId,
      timestamp: new Date().toISOString(),
    });
  }
};

// Interview-specific: Report malpractice (only interviewer can send)
export const reportMalpractice = (
  type,
  confidence,
  sessionId,
  description = ""
) => {
  if (socket) {
    socket.emit("interview-malpractice-event", {
      type,
      confidence,
      sessionId,
      description,
      timestamp: new Date().toISOString(),
    });
  }
};

export const endInterviewSession = (sessionId) => {
  if (socket) {
    socket.emit("end-interview", {
      sessionId,
      endTime: new Date().toISOString(),
    });
  }
};

export const leaveInterviewRoom = (sessionId) => {
  if (socket) {
    socket.emit("leave-interview-room", { sessionId });
    socket.disconnect();
    socket = null;
  }
};

export const getInterviewSocket = () => socket;
