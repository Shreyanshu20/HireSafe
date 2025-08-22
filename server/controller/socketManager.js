import { Server } from "socket.io";

let connections = {};
let messages = {};
let timeOnline = {};

export const connectToSocket = (server) => {
    const io = new Server(server, {
        cors: {
            origin: true, 
            methods: ["GET", "POST"],
            allowedHeaders: ["*"],
            credentials: true,
        },
        transports: ['websocket', 'polling'],
        allowEIO3: true,
        pingTimeout: 60000,
        pingInterval: 25000
    });

    io.on("connection", (socket) => {
        console.log(`User connected: ${socket.id}`);

        socket.on("join-call", (path) => {
            console.log(`User ${socket.id} joining call: ${path}`);
            
            if (connections[path] === undefined) {
                connections[path] = [];
            }
            connections[path].push(socket.id);
            timeOnline[socket.id] = new Date();

            for (let i = 0; i < connections[path].length; i++) {
                io.to(connections[path][i]).emit("user-joined", socket.id, connections[path]);
            }

            if (messages[path] !== undefined) {
                for (let i = 0; i < messages[path].length; i++) {
                    io.to(socket.id).emit("chat-message", 
                        messages[path][i]['data'], 
                        messages[path][i]['sender'], 
                        messages[path][i]['socket-id-sender']
                    );
                }
            }
        });

        socket.on("signal", (toId, message) => {
            console.log(`Signal from ${socket.id} to ${toId}`);
            io.to(toId).emit("signal", socket.id, message);
        });

        socket.on("chat-message", (data, sender) => {
            const [matchingRoom, found] = Object.entries(connections)
                .reduce(([room, isFound], [roomKey, roomValue]) => {
                    if (!isFound && roomValue.includes(socket.id)) {
                        return [roomKey, true];
                    }
                    return [room, isFound];
                }, ['', false]);

            if (found === true) {
                if (messages[matchingRoom] === undefined) {
                    messages[matchingRoom] = [];
                }

                messages[matchingRoom].push({ 
                    "sender": sender, 
                    "data": data, 
                    "socket-id-sender": socket.id 
                });

                connections[matchingRoom].forEach((elem) => {
                    io.to(elem).emit("chat-message", data, sender, socket.id);
                });
            }
        });

        // ✅ ADD: Interview-specific socket events (without breaking existing)
        socket.on("code-change", (data) => {
            const { meetingCode, code, userRole } = data;
            console.log(`Code changed in ${meetingCode} by ${userRole}`);
            
            // Find the room this socket belongs to
            const [matchingRoom, found] = Object.entries(connections)
                .reduce(([room, isFound], [roomKey, roomValue]) => {
                    if (!isFound && roomValue.includes(socket.id)) {
                        return [roomKey, true];
                    }
                    return [room, isFound];
                }, ['', false]);

            if (found && matchingRoom === meetingCode) {
                // Broadcast to all users in the same room except sender
                connections[matchingRoom].forEach((socketId) => {
                    if (socketId !== socket.id) {
                        io.to(socketId).emit("code-change", { code, userRole });
                    }
                });
            }
        });

        socket.on("language-change", (data) => {
            const { meetingCode, language, userRole } = data;
            console.log(`Language changed to ${language} in ${meetingCode} by ${userRole}`);
            
            const [matchingRoom, found] = Object.entries(connections)
                .reduce(([room, isFound], [roomKey, roomValue]) => {
                    if (!isFound && roomValue.includes(socket.id)) {
                        return [roomKey, true];
                    }
                    return [room, isFound];
                }, ['', false]);

            if (found && matchingRoom === meetingCode) {
                connections[matchingRoom].forEach((socketId) => {
                    if (socketId !== socket.id) {
                        io.to(socketId).emit("language-change", { language, userRole });
                    }
                });
            }
        });

        socket.on("malpractice-detected", (data) => {
            const { meetingCode, type, confidence, message } = data;
            console.log(`Malpractice detected in ${meetingCode}: ${type}`);
            
            const [matchingRoom, found] = Object.entries(connections)
                .reduce(([room, isFound], [roomKey, roomValue]) => {
                    if (!isFound && roomValue.includes(socket.id)) {
                        return [roomKey, true];
                    }
                    return [room, isFound];
                }, ['', false]);

            if (found && matchingRoom === meetingCode) {
                // Send to all participants in the interview
                connections[matchingRoom].forEach((socketId) => {
                    io.to(socketId).emit("malpractice-detected", {
                        type,
                        confidence,
                        message,
                        timestamp: new Date().toISOString()
                    });
                });
            }
        });

        socket.on("disconnect", () => {
            console.log(`User disconnected: ${socket.id}`);
            
            var diffTime = Math.abs(timeOnline[socket.id] - new Date());
            var key;

            for (const [k, v] of JSON.parse(JSON.stringify(Object.entries(connections)))) {
                for (let i = 0; i < v.length; i++) {
                    if (v[i] === socket.id) {
                        key = k;
                        for (let j = 0; j < connections[key].length; j++) {
                            io.to(connections[key][j]).emit('user-left', socket.id);
                        }

                        var index = connections[key].indexOf(socket.id);
                        connections[key].splice(index, 1);

                        if (connections[key].length === 0) {
                            delete connections[key];
                        }
                    }
                }
            }
            
            delete timeOnline[socket.id];
        });
    });

    return io;
};