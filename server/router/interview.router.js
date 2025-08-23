import express from "express";
import {
  createInterview,
  joinInterview,
  verifyInterview,
  endInterviewSession,
  logMalpractice,
} from "../controller/interview.controller.js";
import { userAuth } from "../middleware/userAuth.js";

const router = express.Router();

// Create a new interview session
router.post("/create", userAuth, createInterview);

// Join an existing interview session
router.post("/join", userAuth, joinInterview);

// Verify interview session exists
router.get("/verify/:session_id", userAuth, verifyInterview);

// End interview session
router.post("/end-session", userAuth, endInterviewSession);

// Log malpractice detection (NEW - interview-specific)
router.post("/log-malpractice", userAuth, logMalpractice);

export default router;
