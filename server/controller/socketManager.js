import { Server } from 'socket.io';

// Separate data structures for meetings and interviews
let meetingConnections = {};
let interviewConnections = {};
let meetingMessages = {};
let interviewMessages = {};
let timeOnline = {};

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
    
    // =================== MEETING EVENTS (EXISTING) ===================
    socket.on('join-call', (meetingCode) => {
      console.log(`User ${socket.id} joining MEETING room: ${meetingCode}`);
      
      if (meetingConnections[meetingCode] === undefined) {
        meetingConnections[meetingCode] = [];
      }
      
      meetingConnections[meetingCode].push(socket.id);
      socket.join(`meeting-${meetingCode}`);
      
      const clients = Array.from(io.sockets.adapter.rooms.get(`meeting-${meetingCode}`) || []);
      socket.to(`meeting-${meetingCode}`).emit('user-joined', socket.id, clients);
      socket.emit('user-joined', socket.id, clients);
    });

    socket.on('signal', (toId, message) => {
      console.log(`Signal from ${socket.id} to ${toId}`);
      io.to(toId).emit('signal', socket.id, message);
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

    // =================== INTERVIEW EVENTS (NEW) ===================
    socket.on('join-interview', (interviewCode) => {
      console.log(`User ${socket.id} joining INTERVIEW room: ${interviewCode}`);
      
      if (interviewConnections[interviewCode] === undefined) {
        interviewConnections[interviewCode] = [];
      }
      
      interviewConnections[interviewCode].push(socket.id);
      socket.join(`interview-${interviewCode}`);
      
      const clients = Array.from(io.sockets.adapter.rooms.get(`interview-${interviewCode}`) || []);
      socket.to(`interview-${interviewCode}`).emit('user-joined', socket.id, clients);
      socket.emit('user-joined', socket.id, clients);
    });

    socket.on('interview-chat-message', (message, sender) => {
      console.log(`Interview chat message from ${socket.id}: ${message}`);
      
      // Find interview room
      let roomCode = null;
      for (const [room, clients] of Object.entries(interviewConnections)) {
        if (clients.includes(socket.id)) {
          roomCode = room;
          break;
        }
      }
      
      if (roomCode) {
        if (interviewMessages[roomCode] === undefined) {
          interviewMessages[roomCode] = [];
        }
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
        socket.to(`interview-${roomCode}`).emit('code-change', {
          ...data,
          socketId: socket.id
        });
      }
    });

    socket.on('language-change', (data) => {
      console.log(`Language change from ${socket.id}:`, data);
      
      let roomCode = null;
      for (const [room, clients] of Object.entries(interviewConnections)) {
        if (clients.includes(socket.id)) {
          roomCode = room;
          break;
        }
      }
      
      if (roomCode) {
        socket.to(`interview-${roomCode}`).emit('language-change', {
          ...data,
          socketId: socket.id
        });
      }
    });

    socket.on('malpractice-detected', (data) => {
      console.log(`Malpractice detected from ${socket.id}:`, data);
      
      let roomCode = null;
      for (const [room, clients] of Object.entries(interviewConnections)) {
        if (clients.includes(socket.id)) {
          roomCode = room;
          break;
        }
      }
      
      if (roomCode) {
        io.to(`interview-${roomCode}`).emit('malpractice-detected', {
          ...data,
          socketId: socket.id,
          timestamp: new Date().toISOString()
        });
      }
    });

    socket.on('end-interview', () => {
      console.log(`User ${socket.id} ending INTERVIEW`);
      handleInterviewDisconnect(socket);
    });

    // =================== COMMON DISCONNECT HANDLER ===================
    socket.on('disconnect', () => {
      console.log(`User ${socket.id} disconnected`);
      handleMeetingDisconnect(socket);
      handleInterviewDisconnect(socket);
    });

    // =================== HELPER FUNCTIONS ===================
    const handleMeetingDisconnect = (socket) => {
      for (const [roomCode, clients] of Object.entries(meetingConnections)) {
        const index = clients.indexOf(socket.id);
        if (index !== -1) {
          clients.splice(index, 1);
          socket.to(`meeting-${roomCode}`).emit('user-left', socket.id);
          
          if (clients.length === 0) {
            delete meetingConnections[roomCode];
            delete meetingMessages[roomCode];
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