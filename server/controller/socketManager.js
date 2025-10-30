import { Server } from 'socket.io';

// Separate data structures for meetings and interviews
let meetingConnections = {};
let interviewConnections = {};
let meetingMessages = {};
let interviewMessages = {};
let timeOnline = {};

// NEW: Track user states for meetings
let meetingUserStates = {}; // { roomCode: { socketId: { video: true, audio: true, screen: false } } }
let meetingUserNames = {}; // ✅ ADD THIS - Track usernames { roomCode: { socketId: "username" } }
let interviewUserNames = {}; // ✅ ADD THIS - Track usernames { interviewCode: { socketId: "username" } }

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
    socket.on('join-call', (meetingCode, userName) => { // ✅ ADD userName PARAMETER
      console.log(`User ${socket.id} (${userName}) joining MEETING room: ${meetingCode}`);
      
      if (meetingConnections[meetingCode] === undefined) {
        meetingConnections[meetingCode] = [];
        meetingUserStates[meetingCode] = {};
        meetingUserNames[meetingCode] = {}; // ✅ INITIALIZE USERNAME TRACKING
      }
      
      meetingConnections[meetingCode].push(socket.id);
      socket.join(`meeting-${meetingCode}`);
      
      // Initialize user state
      meetingUserStates[meetingCode][socket.id] = {
        video: true,
        audio: true,
        screen: false
      };
      
      // ✅ STORE USERNAME
      meetingUserNames[meetingCode][socket.id] = userName || 'Anonymous';
      
      const clients = Array.from(io.sockets.adapter.rooms.get(`meeting-${meetingCode}`) || []);
      
      // CRITICAL: Send current user states to new user IMMEDIATELY
      socket.emit('user-states', meetingUserStates[meetingCode]);
      
      // ✅ SEND USERNAMES TO NEW USER
      socket.emit('user-names', meetingUserNames[meetingCode]);
      
      // Notify others about new user (✅ ADD USERNAME)
      socket.to(`meeting-${meetingCode}`).emit('user-joined', socket.id, clients, userName);
      socket.emit('user-joined', socket.id, clients, userName);
      
      console.log(`📊 Sent user states and names to ${socket.id}`);
    });

    socket.on('signal', (toId, message) => {
      console.log(`Signal from ${socket.id} to ${toId}`);
      io.to(toId).emit('signal', socket.id, message);
    });

    // ✅ FIXED: Camera toggle event - DON'T affect audio state
    socket.on('toggle-camera', (isEnabled) => {
      console.log(`User ${socket.id} ${isEnabled ? 'enabled' : 'disabled'} camera`);
      
      // Find meeting room and update ONLY VIDEO state
      for (const [roomCode, clients] of Object.entries(meetingConnections)) {
        if (clients.includes(socket.id)) {
          if (meetingUserStates[roomCode] && meetingUserStates[roomCode][socket.id]) {
            meetingUserStates[roomCode][socket.id].video = isEnabled;
            // ✅ DON'T TOUCH AUDIO STATE HERE
          }
          
          // Broadcast ONLY camera state change
          socket.to(`meeting-${roomCode}`).emit('user-camera-toggled', socket.id, isEnabled);
          console.log(`📹 Sent camera toggle to room ${roomCode}: ${socket.id} = ${isEnabled}`);
          break;
        }
      }
    });

    // ✅ FIXED: Microphone toggle event - DON'T affect video state  
    socket.on('toggle-microphone', (isEnabled) => {
      console.log(`User ${socket.id} ${isEnabled ? 'enabled' : 'disabled'} microphone`);
      
      // Find meeting room and update ONLY AUDIO state
      for (const [roomCode, clients] of Object.entries(meetingConnections)) {
        if (clients.includes(socket.id)) {
          if (meetingUserStates[roomCode] && meetingUserStates[roomCode][socket.id]) {
            meetingUserStates[roomCode][socket.id].audio = isEnabled;
            // ✅ DON'T TOUCH VIDEO STATE HERE
          }
          
          // Broadcast ONLY microphone state change
          socket.to(`meeting-${roomCode}`).emit('user-microphone-toggled', socket.id, isEnabled);
          console.log(`🎤 Sent microphone toggle to room ${roomCode}: ${socket.id} = ${isEnabled}`);
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
    socket.on('join-interview', (data) => { // ✅ NOW ACCEPTS { interviewCode, userName }
      const interviewCode = typeof data === 'string' ? data : data.interviewCode;
      const userName = typeof data === 'object' ? data.userName : 'Anonymous';
      
      console.log(`User ${socket.id} (${userName}) joining INTERVIEW room: ${interviewCode}`);
      
      if (interviewConnections[interviewCode] === undefined) {
        interviewConnections[interviewCode] = [];
        interviewMessages[interviewCode] = [];
        interviewUserNames[interviewCode] = {}; // ✅ INITIALIZE USERNAME TRACKING
      }
      
      interviewConnections[interviewCode].push(socket.id);
      socket.join(`interview-${interviewCode}`);
      
      // ✅ STORE USERNAME
      interviewUserNames[interviewCode][socket.id] = userName;
      
      const clients = Array.from(io.sockets.adapter.rooms.get(`interview-${interviewCode}`) || []);
      console.log(`Interview room ${interviewCode} clients:`, clients);
      
      // ✅ SEND USERNAMES TO NEW USER
      socket.emit('user-names', interviewUserNames[interviewCode]);
      
      // ✅ NOTIFY OTHERS WITH USERNAME
      socket.to(`interview-${interviewCode}`).emit('user-joined', socket.id, clients, userName);
      socket.emit('user-joined', socket.id, clients, userName);
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
          
          // ✅ SEND USERNAME WITH SCREEN SHARE EVENT
          const userName = meetingUserNames[roomCode]?.[socket.id] || socket.username || 'Anonymous';
          socket.to(`meeting-${roomCode}`).emit('screen-share-started', socket.id, userName);
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
          
          // ✅ CLEAN UP USERNAME
          if (meetingUserNames[roomCode] && meetingUserNames[roomCode][socket.id]) {
            delete meetingUserNames[roomCode][socket.id];
          }
          
          socket.to(`meeting-${roomCode}`).emit('user-left', socket.id);
          
          if (clients.length === 0) {
            delete meetingConnections[roomCode];
            delete meetingMessages[roomCode];
            delete meetingUserStates[roomCode];
            delete meetingUserNames[roomCode]; // ✅ CLEAN UP USERNAMES
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
          
          // ✅ CLEAN UP USERNAME
          if (interviewUserNames[roomCode] && interviewUserNames[roomCode][socket.id]) {
            delete interviewUserNames[roomCode][socket.id];
          }
          
          socket.to(`interview-${roomCode}`).emit('user-left', socket.id);
          
          if (clients.length === 0) {
            delete interviewConnections[roomCode];
            delete interviewMessages[roomCode];
            delete interviewUserNames[roomCode]; // ✅ CLEAN UP USERNAMES
          }
          break;
        }
      }
    };
  });

  console.log('Socket.IO server initialized with separate meeting and interview handlers');
  return io;
};