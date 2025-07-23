import express from 'express';
import { createMeeting, joinMeeting, verifyMeeting } from '../controller/meeting.controller.js';
import { userAuth } from '../middleware/userAuth.js';

const router = express.Router();

router.post('/create', userAuth, createMeeting);
router.post('/join', userAuth, joinMeeting);
router.get('/verify/:meeting_code', userAuth, verifyMeeting);

export default router;