import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import cookieParser from "cookie-parser";
import { createServer } from "node:http";

import authRouter from "./router/auth.router.js";
import userRouter from "./router/user.router.js";
import meetingRouter from "./router/meeting.router.js";
import interviewRouter from "./router/interview.router.js";
import { connectToSocket } from "./controller/socketManager.js";

const app = express();
const server = createServer(app);

app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Origin",
      "X-Requested-With",
      "Content-Type",
      "Accept",
      "Authorization",
      "x-auth-token",
      "Cookie",
      "Set-Cookie",
    ],
    exposedHeaders: ["Set-Cookie"],
    preflightContinue: false,
    optionsSuccessStatus: 200,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const main = async () => {
  try {
    mongoose
      .connect(process.env.MONGODB_URL)
      .then(() => {
        console.log("Connected to MongoDB");
      })
      .catch((e) => {
        console.error("Error connecting to MongoDB:", e);
      });

    const io = connectToSocket(server);
    console.log("Socket.IO initialized");

    server.listen(process.env.PORT || 9000, () => {
      console.log(`Server is running on port ${process.env.PORT || 9000}`);
    });
  } catch (error) {
    console.error("Error in main function:", error);
  }
};

main();

// Routes
app.use("/auth", authRouter);
app.use("/user", userRouter);
app.use("/meeting", meetingRouter);
app.use("/interview", interviewRouter);

app.get("/", (req, res) => {
  res.send("Server is running");
});
