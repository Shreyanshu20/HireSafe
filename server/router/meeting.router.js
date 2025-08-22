import express from 'express';
import { createMeeting, joinMeeting, verifyMeeting, endMeetingSession } from '../controller/meeting.controller.js';
import { userAuth } from '../middleware/userAuth.js';

const router = express.Router();

// Create a new meeting
router.post('/create', userAuth, createMeeting);

// Join an existing meeting
router.post('/join', userAuth, joinMeeting);

// Verify meeting exists
router.get('/verify/:meeting_code', userAuth, verifyMeeting);

// End meeting session
router.post('/end-session', userAuth, endMeetingSession);

export default router;