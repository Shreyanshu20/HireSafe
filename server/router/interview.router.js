import express from 'express';
import { createInterview, joinInterview, verifyInterview, endInterviewSession } from '../controller/interview.controller.js';
import { userAuth } from '../middleware/userAuth.js';

const router = express.Router();

router.post('/create', userAuth, createInterview);
router.post('/join', userAuth, joinInterview);
router.get('/verify/:meeting_code', userAuth, verifyInterview);
router.post('/end-session', userAuth, endInterviewSession);

export default router;