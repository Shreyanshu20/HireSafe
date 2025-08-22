import { Meeting } from '../model/meeting.model.js';
import { startSession, endSession, ACTIVITY_TYPES } from '../utils/activityHelper.js';

const createInterview = async (req, res) => {
    try {
        const { meeting_code, interview_config = {} } = req.body;
        const user_id = req.userId;

        if (!meeting_code) {
            return res.status(400).json({ 
                success: false,
                message: "Interview code is required" 
            });
        }

        const existingInterview = await Meeting.findOne({ meeting_code });
        if (existingInterview) {
            return res.status(400).json({ 
                success: false,
                message: "Interview code already exists. Please try again." 
            });
        }

        const interviewData = {
            user_id,
            meeting_code,
            date: new Date(),
            meeting_type: 'interview',
            interview_config: {
                interviewer_id: user_id,
                ...interview_config
            }
        };

        const newInterview = new Meeting(interviewData);
        await newInterview.save();

        // ✅ Log activity for interview creation (interviewer)
        const session = await startSession(req, ACTIVITY_TYPES.INTERVIEW, `Created interview session: ${meeting_code}`, {
            meeting_code,
            interview_mode: true,
            user_role: 'interviewer'
        });

        res.status(201).json({
            success: true,
            message: "Interview created successfully",
            interview: {
                id: newInterview._id,
                meeting_code: newInterview.meeting_code,
                meeting_type: newInterview.meeting_type,
                date: newInterview.date,
                user_id: newInterview.user_id,
                interview_config: newInterview.interview_config
            },
            sessionId: session?._id
        });

    } catch (error) {
        console.error("Error creating interview:", error);
        res.status(500).json({ 
            success: false,
            message: "Internal server error" 
        });
    }
};

const joinInterview = async (req, res) => {
    try {
        const { meeting_code } = req.body;
        const user_id = req.userId;

        if (!meeting_code) {
            return res.status(400).json({ 
                success: false,
                message: "Interview code is required" 
            });
        }

        const interview = await Meeting.findOne({ 
            meeting_code,
            meeting_type: 'interview'
        })
        .populate('user_id', 'username email')
        .populate('interview_config.interviewer_id', 'username email');

        if (!interview) {
            return res.status(404).json({ 
                success: false,
                message: "Invalid interview code. Please check and try again." 
            });
        }

        let userRole = 'participant';
        let sessionId = null;

        // ✅ Determine user role and log activity
        if (interview.user_id._id.toString() === user_id.toString()) {
            // This is the interviewer (creator)
            userRole = 'interviewer';
            // Don't log activity - they already logged when creating
        } else {
            // This is the interviewee
            userRole = 'interviewee';
            
            // Set interviewee if not already set
            if (!interview.interview_config.interviewee_id) {
                interview.interview_config.interviewee_id = user_id;
                await interview.save();
            }
            
            // ✅ Log activity only for interviewee joining
            const session = await startSession(req, ACTIVITY_TYPES.INTERVIEW, `Joined interview session: ${meeting_code}`, {
                meeting_code,
                interview_mode: true,
                user_role: 'interviewee'
            });
            
            sessionId = session?._id;
        }

        res.status(200).json({
            success: true,
            message: "Interview found successfully",
            interview: {
                id: interview._id,
                meeting_code: interview.meeting_code,
                meeting_type: interview.meeting_type,
                date: interview.date,
                host: interview.user_id,
                interview_config: interview.interview_config,
                isHost: interview.user_id._id.toString() === user_id.toString(),
                userRole: userRole
            },
            sessionId: sessionId
        });

    } catch (error) {
        console.error("Error joining interview:", error);
        res.status(500).json({ 
            success: false,
            message: "Internal server error" 
        });
    }
};

const verifyInterview = async (req, res) => {
    try {
        const { meeting_code } = req.params;

        if (!meeting_code) {
            return res.status(400).json({ 
                success: false,
                message: "Interview code is required" 
            });
        }

        const interview = await Meeting.findOne({ 
            meeting_code,
            meeting_type: 'interview'
        })
        .populate('user_id', 'username email')
        .populate('interview_config.interviewer_id', 'username email');

        if (!interview) {
            return res.status(404).json({ 
                success: false,
                message: "Interview not found" 
            });
        }

        res.status(200).json({
            success: true,
            message: "Interview exists",
            interview: {
                id: interview._id,
                meeting_code: interview.meeting_code,
                meeting_type: interview.meeting_type,
                date: interview.date,
                host: interview.user_id,
                interview_config: interview.interview_config
            }
        });

    } catch (error) {
        console.error("Error verifying interview:", error);
        res.status(500).json({ 
            success: false,
            message: "Internal server error" 
        });
    }
};

const endInterviewSession = async (req, res) => {
    try {
        const { sessionId, malpracticeCount = 0 } = req.body;

        if (!sessionId) {
            return res.status(400).json({
                success: false,
                message: "Session ID is required"
            });
        }

        const session = await endSession(sessionId, {
            malpractice_count: malpracticeCount,
            malpractice_detected: malpracticeCount > 0
        });

        res.status(200).json({
            success: true,
            message: "Interview session ended successfully",
            duration: session?.duration_minutes || 0
        });

    } catch (error) {
        console.error("Error ending interview session:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

export { createInterview, joinInterview, verifyInterview, endInterviewSession };