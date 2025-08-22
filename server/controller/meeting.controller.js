import { Meeting } from '../model/meeting.model.js';
import { startSession, endSession, ACTIVITY_TYPES } from '../utils/activityHelper.js';

const createMeeting = async (req, res) => {
    try {
        const { meeting_code, meeting_type = 'meeting' } = req.body;
        const user_id = req.userId;

        if (!meeting_code) {
            return res.status(400).json({ 
                success: false,
                message: "Meeting code is required" 
            });
        }

        const existingMeeting = await Meeting.findOne({ meeting_code });
        if (existingMeeting) {
            return res.status(400).json({ 
                success: false,
                message: "Meeting code already exists. Please try again." 
            });
        }

        const meetingData = {
            user_id,
            meeting_code,
            date: new Date(),
            meeting_type: 'meeting' // Always meeting for this controller
        };

        const newMeeting = new Meeting(meetingData);
        await newMeeting.save();

        // ✅ Log activity for meeting creation (host)
        const session = await startSession(req, ACTIVITY_TYPES.MEETING, `Created meeting session: ${meeting_code}`, {
            meeting_code,
            interview_mode: false,
            user_role: 'host'
        });

        res.status(201).json({
            success: true,
            message: "Meeting created successfully",
            meeting: {
                id: newMeeting._id,
                meeting_code: newMeeting.meeting_code,
                meeting_type: newMeeting.meeting_type,
                date: newMeeting.date,
                user_id: newMeeting.user_id
            },
            sessionId: session?._id
        });

    } catch (error) {
        console.error("Error creating meeting:", error);
        res.status(500).json({ 
            success: false,
            message: "Internal server error" 
        });
    }
};

const joinMeeting = async (req, res) => {
    try {
        const { meeting_code } = req.body;
        const user_id = req.userId;

        if (!meeting_code) {
            return res.status(400).json({ 
                success: false,
                message: "Meeting code is required" 
            });
        }

        const meeting = await Meeting.findOne({ 
            meeting_code,
            meeting_type: 'meeting'
        })
        .populate('user_id', 'username email');

        if (!meeting) {
            return res.status(404).json({ 
                success: false,
                message: "Invalid meeting code. Please check and try again." 
            });
        }

        let sessionId = null;

        // ✅ Only log activity if not the host
        if (meeting.user_id._id.toString() !== user_id.toString()) {
            const session = await startSession(req, ACTIVITY_TYPES.MEETING, `Joined meeting session: ${meeting_code}`, {
                meeting_code,
                interview_mode: false,
                user_role: 'participant'
            });
            sessionId = session?._id;
        }

        res.status(200).json({
            success: true,
            message: "Meeting found successfully",
            meeting: {
                id: meeting._id,
                meeting_code: meeting.meeting_code,
                meeting_type: meeting.meeting_type,
                date: meeting.date,
                host: meeting.user_id,
                isHost: meeting.user_id._id.toString() === user_id.toString(),
                userRole: meeting.user_id._id.toString() === user_id.toString() ? 'host' : 'participant'
            },
            sessionId: sessionId
        });

    } catch (error) {
        console.error("Error joining meeting:", error);
        res.status(500).json({ 
            success: false,
            message: "Internal server error" 
        });
    }
};

const verifyMeeting = async (req, res) => {
    try {
        const { meeting_code } = req.params;

        if (!meeting_code) {
            return res.status(400).json({ 
                success: false,
                message: "Meeting code is required" 
            });
        }

        const meeting = await Meeting.findOne({ 
            meeting_code,
            meeting_type: 'meeting'
        })
        .populate('user_id', 'username email');

        if (!meeting) {
            return res.status(404).json({ 
                success: false,
                message: "Meeting not found" 
            });
        }

        res.status(200).json({
            success: true,
            message: "Meeting exists",
            meeting: {
                id: meeting._id,
                meeting_code: meeting.meeting_code,
                meeting_type: meeting.meeting_type,
                date: meeting.date,
                host: meeting.user_id
            }
        });

    } catch (error) {
        console.error("Error verifying meeting:", error);
        res.status(500).json({ 
            success: false,
            message: "Internal server error" 
        });
    }
};

const endMeetingSession = async (req, res) => {
    try {
        const { sessionId } = req.body;

        if (!sessionId) {
            return res.status(400).json({
                success: false,
                message: "Session ID is required"
            });
        }

        const session = await endSession(sessionId);

        res.status(200).json({
            success: true,
            message: "Meeting session ended successfully",
            duration: session?.duration_minutes || 0
        });

    } catch (error) {
        console.error("Error ending meeting session:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

export { createMeeting, joinMeeting, verifyMeeting, endMeetingSession };