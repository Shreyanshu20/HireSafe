import { Server } from 'socket.io';

// Separate data structures for meetings and interviews
let meetingConnections = {};
let interviewConnections = {};
let meetingMessages = {};
let interviewMessages = {};
let timeOnline = {};

// NEW: Track user states for meetings
let meetingUserStates = {}; // { roomCode: { socketId: { video: true, audio: true, screen: false } } }

export const connectToSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: true,
      methods: ['GET', 'POST'],
      credentials: true
    },
    transports: ['websocket', 'polling'],
    allowEIO3: true
  });

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    timeOnline[socket.id] = new Date();
    
    // =================== MEETING EVENTS (FIXED) ===================
    socket.on('join-call', (meetingCode) => {
      console.log(`User ${socket.id} joining MEETING room: ${meetingCode}`);
      
      if (meetingConnections[meetingCode] === undefined) {
        meetingConnections[meetingCode] = [];
        meetingUserStates[meetingCode] = {};
      }
      
      meetingConnections[meetingCode].push(socket.id);
      socket.join(`meeting-${meetingCode}`);
      
      // Initialize user state
      meetingUserStates[meetingCode][socket.id] = {
        video: true,
        audio: true,
        screen: false
      };
      
      const clients = Array.from(io.sockets.adapter.rooms.get(`meeting-${meetingCode}`) || []);
      
      // CRITICAL: Send current user states to new user IMMEDIATELY
      socket.emit('user-states', meetingUserStates[meetingCode]);
      
      // Notify others about new user
      socket.to(`meeting-${meetingCode}`).emit('user-joined', socket.id, clients);
      socket.emit('user-joined', socket.id, clients);
      
      console.log(`📊 Sent user states to ${socket.id}:`, meetingUserStates[meetingCode]);
    });

    socket.on('signal', (toId, message) => {
      console.log(`Signal from ${socket.id} to ${toId}`);
      io.to(toId).emit('signal', socket.id, message);
    });

    // NEW: Camera toggle event
    socket.on('toggle-camera', (isEnabled) => {
      console.log(`User ${socket.id} ${isEnabled ? 'enabled' : 'disabled'} camera`);
      
      // Find meeting room and update state
      for (const [roomCode, clients] of Object.entries(meetingConnections)) {
        if (clients.includes(socket.id)) {
          if (meetingUserStates[roomCode] && meetingUserStates[roomCode][socket.id]) {
            meetingUserStates[roomCode][socket.id].video = isEnabled;
          }
          
          // Broadcast to all other users in the room
          socket.to(`meeting-${roomCode}`).emit('user-camera-toggled', socket.id, isEnabled);
          break;
        }
      }
    });

    // NEW: Microphone toggle event
    socket.on('toggle-microphone', (isEnabled) => {
      console.log(`User ${socket.id} ${isEnabled ? 'enabled' : 'disabled'} microphone`);
      
      // Find meeting room and update state
      for (const [roomCode, clients] of Object.entries(meetingConnections)) {
        if (clients.includes(socket.id)) {
          if (meetingUserStates[roomCode] && meetingUserStates[roomCode][socket.id]) {
            meetingUserStates[roomCode][socket.id].audio = isEnabled;
          }
          
          // Broadcast to all other users in the room
          socket.to(`meeting-${roomCode}`).emit('user-microphone-toggled', socket.id, isEnabled);
          break;
        }
      }
    });

    socket.on('chat-message', (message, sender) => {
      console.log(`Chat message from ${socket.id}: ${message}`);
      
      // Find meeting room
      let roomCode = null;
      for (const [room, clients] of Object.entries(meetingConnections)) {
        if (clients.includes(socket.id)) {
          roomCode = room;
          break;
        }
      }
      
      if (roomCode) {
        if (meetingMessages[roomCode] === undefined) {
          meetingMessages[roomCode] = [];
        }
        meetingMessages[roomCode].push({ sender, message, time: new Date() });
        io.to(`meeting-${roomCode}`).emit('chat-message', message, sender, socket.id);
      }
    });

    socket.on('end-call', () => {
      console.log(`User ${socket.id} ending MEETING call`);
      handleMeetingDisconnect(socket);
    });

    // =================== INTERVIEW EVENTS (UNCHANGED) ===================
    socket.on('join-interview', (interviewCode) => {
      console.log(`User ${socket.id} joining INTERVIEW room: ${interviewCode}`);
      
      if (interviewConnections[interviewCode] === undefined) {
        interviewConnections[interviewCode] = [];
        interviewMessages[interviewCode] = [];
      }
      
      interviewConnections[interviewCode].push(socket.id);
      socket.join(`interview-${interviewCode}`);
      
      const clients = Array.from(io.sockets.adapter.rooms.get(`interview-${interviewCode}`) || []);
      console.log(`Interview room ${interviewCode} clients:`, clients);
      
      socket.to(`interview-${interviewCode}`).emit('user-joined', socket.id, clients);
      socket.emit('user-joined', socket.id, clients);
    });

    socket.on('interview-chat-message', (message, sender) => {
      console.log(`Interview chat from ${socket.id}: ${message}`);
      
      // Find interview room
      let roomCode = null;
      for (const [room, clients] of Object.entries(interviewConnections)) {
        if (clients.includes(socket.id)) {
          roomCode = room;
          break;
        }
      }
      
      if (roomCode) {
        interviewMessages[roomCode].push({ sender, message, time: new Date() });
        io.to(`interview-${roomCode}`).emit('interview-chat-message', message, sender, socket.id);
      }
    });

    socket.on('code-change', (data) => {
      console.log(`Code change from ${socket.id}:`, data);
      
      // Find interview room
      let roomCode = null;
      for (const [room, clients] of Object.entries(interviewConnections)) {
        if (clients.includes(socket.id)) {
          roomCode = room;
          break;
        }
      }
      
      if (roomCode) {
        socket.to(`interview-${roomCode}`).emit('code-change', data);
      }
    });

    socket.on('language-change', (data) => {
      console.log(`Language change from ${socket.id}:`, data);
      
      // Find interview room
      let roomCode = null;
      for (const [room, clients] of Object.entries(interviewConnections)) {
        if (clients.includes(socket.id)) {
          roomCode = room;
          break;
        }
      }
      
      if (roomCode) {
        socket.to(`interview-${roomCode}`).emit('language-change', data);
      }
    });

    socket.on('output-change', (data) => {
      console.log(`Output change from ${socket.id}:`, data);
      
      // Find interview room
      let roomCode = null;
      for (const [room, clients] of Object.entries(interviewConnections)) {
        if (clients.includes(socket.id)) {
          roomCode = room;
          break;
        }
      }
      
      if (roomCode) {
        socket.to(`interview-${roomCode}`).emit('output-change', data);
      }
    });

    socket.on('malpractice-detected', (data) => {
      console.log(`Malpractice detected from ${socket.id}:`, data);
      
      // Find interview room
      let roomCode = null;
      for (const [room, clients] of Object.entries(interviewConnections)) {
        if (clients.includes(socket.id)) {
          roomCode = room;
          break;
        }
      }
      
      if (roomCode) {
        // Send to ALL clients in the room (including the sender for now, we'll filter on client)
        io.to(`interview-${roomCode}`).emit('malpractice-detected', {
          ...data,
          socketId: socket.id,
          timestamp: new Date().toISOString(),
          fromUser: socket.id !== data.reporterId ? 'interviewee' : 'interviewer' // Add role info
        });
        console.log(`Malpractice event sent to room interview-${roomCode}`);
      }
    });

    socket.on('end-interview', () => {
      console.log(`User ${socket.id} ending INTERVIEW`);
      handleInterviewDisconnect(socket);
    });

    // =================== SCREEN SHARING EVENTS (FIXED) ===================
    socket.on('screen-share-started', () => {
      console.log(`User ${socket.id} started screen sharing`);
      
      // Find meeting room and update state
      for (const [roomCode, clients] of Object.entries(meetingConnections)) {
        if (clients.includes(socket.id)) {
          if (meetingUserStates[roomCode] && meetingUserStates[roomCode][socket.id]) {
            meetingUserStates[roomCode][socket.id].screen = true;
          }
          
          socket.to(`meeting-${roomCode}`).emit('screen-share-started', socket.id);
          break;
        }
      }
    });

    socket.on('screen-share-stopped', () => {
      console.log(`User ${socket.id} stopped screen sharing`);
      
      // Find meeting room and update state
      for (const [roomCode, clients] of Object.entries(meetingConnections)) {
        if (clients.includes(socket.id)) {
          if (meetingUserStates[roomCode] && meetingUserStates[roomCode][socket.id]) {
            meetingUserStates[roomCode][socket.id].screen = false;
          }
          
          socket.to(`meeting-${roomCode}`).emit('screen-share-stopped', socket.id);
          break;
        }
      }
    });

    // =================== COMMON DISCONNECT HANDLER ===================
    socket.on('disconnect', () => {
      console.log(`User ${socket.id} disconnected`);
      const timeDisconnected = new Date();
      const timeDiff = timeDisconnected - timeOnline[socket.id];
      const timeDiffMinutes = Math.floor(timeDiff / (1000 * 60));
      console.log(`User ${socket.id} was online for ${timeDiffMinutes} minutes`);
      
      handleMeetingDisconnect(socket);
      handleInterviewDisconnect(socket);
      
      delete timeOnline[socket.id];
    });

    // =================== HELPER FUNCTIONS ===================
    const handleMeetingDisconnect = (socket) => {
      for (const [roomCode, clients] of Object.entries(meetingConnections)) {
        const index = clients.indexOf(socket.id);
        if (index !== -1) {
          clients.splice(index, 1);
          
          // Clean up user state
          if (meetingUserStates[roomCode] && meetingUserStates[roomCode][socket.id]) {
            delete meetingUserStates[roomCode][socket.id];
          }
          
          socket.to(`meeting-${roomCode}`).emit('user-left', socket.id);
          
          if (clients.length === 0) {
            delete meetingConnections[roomCode];
            delete meetingMessages[roomCode];
            delete meetingUserStates[roomCode];
          }
          break;
        }
      }
    };

    const handleInterviewDisconnect = (socket) => {
      for (const [roomCode, clients] of Object.entries(interviewConnections)) {
        const index = clients.indexOf(socket.id);
        if (index !== -1) {
          clients.splice(index, 1);
          socket.to(`interview-${roomCode}`).emit('user-left', socket.id);
          
          if (clients.length === 0) {
            delete interviewConnections[roomCode];
            delete interviewMessages[roomCode];
          }
          break;
        }
      }
    };
  });

  console.log('Socket.IO server initialized with separate meeting and interview handlers');
  return io;
};