import express from 'express';
import { createMeeting, joinMeeting } from '../controller/meeting.controller.js';
import { userAuth } from '../middleware/userAuth.js';

const router = express.Router();

router.post('/create', userAuth, createMeeting);
router.post('/join', userAuth, joinMeeting);

export default router;