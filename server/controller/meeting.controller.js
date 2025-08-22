import { Meeting } from '../model/meeting.model.js';
import mongoose from 'mongoose';
import { startSession, endSession, ACTIVITY_TYPES } from '../utils/activityHelper.js';

const createMeeting = async (req, res) => {
    try {
        const { meeting_code, meeting_type = 'meeting', interview_config = {} } = req.body;
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
            meeting_type
        };

        if (meeting_type === 'interview') {
            meetingData.interview_config = {
                interviewer_id: user_id,
                ...interview_config
            };
        }

        const newMeeting = new Meeting(meetingData);
        await newMeeting.save();

        // Start session
        const activityType = meeting_type === 'interview' ? ACTIVITY_TYPES.INTERVIEW : ACTIVITY_TYPES.MEETING;
        const description = meeting_type === 'interview' 
            ? `Interview session: ${meeting_code}`
            : `Meeting session: ${meeting_code}`;

        const session = await startSession(req, activityType, description, { 
            meeting_code,
            interview_mode: meeting_type === 'interview',
            user_role: meeting_type === 'interview' ? 'interviewer' : 'host'
        });

        res.status(201).json({
            success: true,
            message: `${meeting_type === 'interview' ? 'Interview' : 'Meeting'} created successfully`,
            meeting: {
                id: newMeeting._id,
                meeting_code: newMeeting.meeting_code,
                meeting_type: newMeeting.meeting_type,
                date: newMeeting.date,
                user_id: newMeeting.user_id,
                interview_config: newMeeting.interview_config
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

        const meeting = await Meeting.findOne({ meeting_code })
            .populate('user_id', 'username email')
            .populate('interview_config.interviewer_id', 'username email');

        if (!meeting) {
            return res.status(404).json({ 
                success: false,
                message: "Invalid meeting code. Please check and try again." 
            });
        }

        let userRole = 'participant';
        if (meeting.meeting_type === 'interview') {
            if (meeting.user_id._id.toString() === user_id.toString()) {
                userRole = 'interviewer';
            } else {
                userRole = 'interviewee';
                if (!meeting.interview_config.interviewee_id) {
                    meeting.interview_config.interviewee_id = user_id;
                    await meeting.save();
                }
            }
        }

        // Start session for joiner
        const activityType = meeting.meeting_type === 'interview' ? ACTIVITY_TYPES.INTERVIEW : ACTIVITY_TYPES.MEETING;
        const description = meeting.meeting_type === 'interview' 
            ? `Interview session: ${meeting_code}`
            : `Meeting session: ${meeting_code}`;

        const session = await startSession(req, activityType, description, { 
            meeting_code,
            interview_mode: meeting.meeting_type === 'interview',
            user_role: userRole
        });

        res.status(200).json({
            success: true,
            message: "Meeting found successfully",
            meeting: {
                id: meeting._id,
                meeting_code: meeting.meeting_code,
                meeting_type: meeting.meeting_type,
                date: meeting.date,
                host: meeting.user_id,
                interview_config: meeting.interview_config,
                isHost: meeting.user_id._id.toString() === user_id.toString(),
                userRole: userRole
            },
            sessionId: session?._id
        });

    } catch (error) {
        console.error("Error joining meeting:", error);
        res.status(500).json({ 
            success: false,
            message: "Internal server error" 
        });
    }
};

const endMeetingSession = async (req, res) => {
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
            message: "Session ended successfully",
            duration: session.duration_minutes
        });

    } catch (error) {
        console.error("Error ending meeting session:", error);
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

        const meeting = await Meeting.findOne({ meeting_code })
            .populate('user_id', 'username email')
            .populate('interview_config.interviewer_id', 'username email');

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
                host: meeting.user_id,
                interview_config: meeting.interview_config
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

export { createMeeting, joinMeeting, verifyMeeting, endMeetingSession };