import { Meeting } from '../model/meeting.model.js';
import mongoose from 'mongoose';

const createMeeting = async (req, res) => {
    try {
        const { meeting_code } = req.body;
        const user_id = req.userId;

        if (!meeting_code) {
            return res.status(400).json({ message: "Meeting code is required" });
        }

        const existingMeeting = await Meeting.findOne({ meeting_code });
        if (existingMeeting) {
            return res.status(400).json({ message: "Meeting code already exists" });
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
                date: newMeeting.date
            }
        });

    } catch (error) {
        console.error("Error creating meeting:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

const joinMeeting = async (req, res) => {
    try {
        const { meeting_code } = req.body;

        if (!meeting_code) {
            return res.status(400).json({ message: "Meeting code is required" });
        }

        const meeting = await Meeting.findOne({ meeting_code }).populate('user_id', 'username email');

        if (!meeting) {
            return res.status(404).json({ message: "Invalid meeting code" });
        }

        res.status(200).json({
            success: true,
            message: "Meeting found",
            meeting: {
                id: meeting._id,
                meeting_code: meeting.meeting_code,
                date: meeting.date,
                host: meeting.user_id
            }
        });

    } catch (error) {
        console.error("Error joining meeting:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export { createMeeting, joinMeeting };