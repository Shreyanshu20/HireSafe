import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { connectToSocket } from './controller/socketManager.js';

import authRouter from './router/auth.router.js';
import userRouter from './router/user.router.js';
import meetingRouter from './router/meeting.router.js';

const app = express();
const server = createServer(app);
const io = connectToSocket(server);

app.use(cors({
    origin: [
        'http://localhost:5173',
        'https://hiresafe.onrender.com'
    ],
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const main = async () => {
    try {
        mongoose.connect(process.env.MONGODB_URL).then(() => {
            console.log("Connected to MongoDB");
        }).catch((e) => {
            console.error("Error connecting to MongoDB:", e);
        });

        server.listen(process.env.PORT || 9000, () => {
            console.log(`Server is running on port ${process.env.PORT || 9000}`);
        });
    } catch (error) {
        console.error("Error in main function:", error);
    }
}

main();

// auth routes
try {
    app.use("/auth", authRouter);
} catch (error) {
    console.error("XX== Error setting up auth routes ==XX:", error);
}

// user routes
try {
    app.use("/user", userRouter);
} catch (error) {
    console.error("XX== Error setting up user routes ==XX:", error);
}

// meeting routes
try {
    app.use("/meeting", meetingRouter);
} catch (error) {
    console.error("XX== Error setting up meeting routes ==XX:", error);
}

app.get('/', (req, res) => {
    res.send("Server is running");
});