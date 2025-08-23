import { Interview } from "../model/interview.model.js";
import {
  startSession,
  endSession,
  ACTIVITY_TYPES,
} from "../utils/activityHelper.js";

const createInterview = async (req, res) => {
  try {
    const { session_id, interview_config = {} } = req.body;
    const interviewer_id = req.userId;

    if (!session_id) {
      return res.status(400).json({
        success: false,
        message: "Session ID is required",
      });
    }

    // Check if session already exists
    const existingInterview = await Interview.findOne({ session_id });
    if (existingInterview) {
      return res.status(400).json({
        success: false,
        message: "Interview session already exists. Please try again.",
      });
    }

    const interviewData = {
      session_id,
      interviewer_id,
      start_time: new Date(),
      status: "waiting",
      interview_config: {
        duration_minutes: interview_config.duration_minutes || 60,
        recording_enabled: interview_config.recording_enabled || false,
        face_detection_enabled:
          interview_config.face_detection_enabled !== false, // Default true
        code_editor_enabled: interview_config.code_editor_enabled !== false, // Default true
      },
    };

    const newInterview = new Interview(interviewData);
    await newInterview.save();

    // Log activity for interview creation (interviewer)
    const session = await startSession(
      req,
      ACTIVITY_TYPES.INTERVIEW,
      `Created interview session: ${session_id}`,
      {
        session_id,
        interview_mode: true,
        user_role: "interviewer",
      }
    );

    res.status(201).json({
      success: true,
      message: "Interview session created successfully",
      interview: {
        id: newInterview._id,
        session_id: newInterview.session_id,
        status: newInterview.status,
        start_time: newInterview.start_time,
        interviewer_id: newInterview.interviewer_id,
        interview_config: newInterview.interview_config,
      },
      sessionId: session?._id,
    });
  } catch (error) {
    console.error("Error creating interview:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const joinInterview = async (req, res) => {
  try {
    const { session_id } = req.body;
    const user_id = req.userId;

    if (!session_id) {
      return res.status(400).json({
        success: false,
        message: "Session ID is required",
      });
    }

    const interview = await Interview.findOne({ session_id }).populate(
      "interviewer_id",
      "username email"
    );

    if (!interview) {
      return res.status(404).json({
        success: false,
        message: "Invalid session ID. Please check and try again.",
      });
    }

    // Determine user role
    const isInterviewer =
      interview.interviewer_id._id.toString() === user_id.toString();
    let sessionId = null;

    if (isInterviewer) {
      // Interviewer rejoining their own session
      const session = await startSession(
        req,
        ACTIVITY_TYPES.INTERVIEW,
        `Rejoined interview session: ${session_id}`,
        {
          session_id,
          interview_mode: true,
          user_role: "interviewer",
        }
      );
      sessionId = session?._id;
    } else {
      // Interviewee joining the session
      if (!interview.interviewee_id) {
        // First time interviewee joins
        interview.interviewee_id = user_id;
        interview.status = "active";
        interview.metadata.interviewee_joined_at = new Date();
        await interview.save();
      }

      // Log activity for interviewee
      const session = await startSession(
        req,
        ACTIVITY_TYPES.INTERVIEW,
        `Joined interview session: ${session_id}`,
        {
          session_id,
          interview_mode: true,
          user_role: "interviewee",
        }
      );
      sessionId = session?._id;
    }

    res.status(200).json({
      success: true,
      message: "Interview session found successfully",
      interview: {
        id: interview._id,
        session_id: interview.session_id,
        status: interview.status,
        start_time: interview.start_time,
        interviewer: interview.interviewer_id,
        interview_config: interview.interview_config,
        isInterviewer: isInterviewer,
        userRole: isInterviewer ? "interviewer" : "interviewee",
      },
      sessionId: sessionId,
    });
  } catch (error) {
    console.error("Error joining interview:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const verifyInterview = async (req, res) => {
  try {
    const { session_id } = req.params;

    if (!session_id) {
      return res.status(400).json({
        success: false,
        message: "Session ID is required",
      });
    }

    const interview = await Interview.findOne({ session_id }).populate(
      "interviewer_id",
      "username email"
    );

    if (!interview) {
      return res.status(404).json({
        success: false,
        message: "Interview session not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Interview session exists",
      interview: {
        id: interview._id,
        session_id: interview.session_id,
        status: interview.status,
        start_time: interview.start_time,
        interviewer: interview.interviewer_id,
        interview_config: interview.interview_config,
      },
    });
  } catch (error) {
    console.error("Error verifying interview:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const endInterviewSession = async (req, res) => {
  try {
    const { sessionId, interviewSessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: "Session ID is required",
      });
    }

    // End activity session
    const session = await endSession(sessionId);

    // Update interview status if interview session ID provided
    if (interviewSessionId) {
      const interview = await Interview.findById(interviewSessionId);
      if (interview) {
        interview.end_time = new Date();
        interview.status = "completed";
        await interview.save();
      }
    }

    res.status(200).json({
      success: true,
      message: "Interview session ended successfully",
      duration: session?.duration_minutes || 0,
    });
  } catch (error) {
    console.error("Error ending interview session:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// NEW: Log malpractice detection (different from meetings)
const logMalpractice = async (req, res) => {
  try {
    const { session_id, type, confidence, description } = req.body;

    if (!session_id || !type || confidence === undefined) {
      return res.status(400).json({
        success: false,
        message: "Session ID, type, and confidence are required",
      });
    }

    const interview = await Interview.findOne({ session_id });
    if (!interview) {
      return res.status(404).json({
        success: false,
        message: "Interview session not found",
      });
    }

    // Add anomaly to interview record
    const anomaly = {
      type,
      confidence,
      timestamp: new Date(),
      description:
        description || `${type} detected with confidence ${confidence}`,
    };

    interview.anomalies.push(anomaly);
    interview.metadata.total_anomalies = interview.anomalies.length;
    await interview.save();

    res.status(200).json({
      success: true,
      message: "Malpractice logged successfully",
      anomaly: anomaly,
    });
  } catch (error) {
    console.error("Error logging malpractice:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export {
  createInterview,
  joinInterview,
  verifyInterview,
  endInterviewSession,
  logMalpractice,
};
