import { Meeting } from '../model/meeting.model.js';
import mongoose from 'mongoose';

const createMeeting = async (req, res) => {
    try {
        const { meeting_code } = req.body;
        const user_id = req.userId;

        if (!meeting_code) {
            return res.status(400).json({ 
                success: false,
                message: "Meeting code is required" 
            });
        }

        // Check if meeting code already exists
        const existingMeeting = await Meeting.findOne({ meeting_code });
        if (existingMeeting) {
            return res.status(400).json({ 
                success: false,
                message: "Meeting code already exists. Please try again." 
            });
        }

        const newMeeting = new Meeting({
            user_id,
            meeting_code,
            date: new Date()
        });

        await newMeeting.save();

        res.status(201).json({
            success: true,
            message: "Meeting created successfully",
            meeting: {
                id: newMeeting._id,
                meeting_code: newMeeting.meeting_code,
                date: newMeeting.date,
                user_id: newMeeting.user_id
            }
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

        const meeting = await Meeting.findOne({ meeting_code }).populate('user_id', 'username email');

        if (!meeting) {
            return res.status(404).json({ 
                success: false,
                message: "Invalid meeting code. Please check and try again." 
            });
        }

        res.status(200).json({
            success: true,
            message: "Meeting found successfully",
            meeting: {
                id: meeting._id,
                meeting_code: meeting.meeting_code,
                date: meeting.date,
                host: meeting.user_id,
                isHost: meeting.user_id._id.toString() === user_id.toString()
            }
        });

    } catch (error) {
        console.error("Error joining meeting:", error);
        res.status(500).json({ 
            success: false,
            message: "Internal server error" 
        });
    }
};

// Add new endpoint to verify meeting existence
const verifyMeeting = async (req, res) => {
    try {
        const { meeting_code } = req.params;

        if (!meeting_code) {
            return res.status(400).json({ 
                success: false,
                message: "Meeting code is required" 
            });
        }

        const meeting = await Meeting.findOne({ meeting_code }).populate('user_id', 'username email');

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

export { createMeeting, joinMeeting, verifyMeeting };