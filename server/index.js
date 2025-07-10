import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Adjust for production
    methods: ["GET", "POST"]
  },
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
    skipMiddlewares: true
  }
});

app.use(cors());
app.use(express.json());

// Data stores
const rooms = new Map();       // roomId -> room object
const users = new Map();       // socket.id -> user object
const activeTransfers = new Map(); // transferId -> transfer info

// Room utilities
const createRoom = (id, name, creatorId) => ({
  id,
  name,
  creator: creatorId,
  users: new Set([creatorId]),
  createdAt: Date.now(),
  lastActive: Date.now()
});

const getRoomSummary = (room) => ({
  id: room.id,
  name: room.name,
  creator: room.creator,
  userCount: room.users.size,
  createdAt: room.createdAt
});

// Transfer management
const createTransfer = (fileId, fileName, fileSize, senderId, roomId) => ({
  id: fileId,
  fileName,
  fileSize,
  senderId,
  roomId,
  timestamp: Date.now(),
  status: 'offered',
  receivers: new Set()
});

// Connection quality tracking
const connectionQuality = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  // Heartbeat monitoring
  const heartbeatInterval = setInterval(() => {
    socket.emit('heartbeat');
  }, 5000);
  
  socket.on('heartbeat-ack', () => {
    connectionQuality.set(socket.id, {
      lastAck: Date.now(),
      quality: 'good'
    });
  });

  // User initialization
  socket.on('user:join', (userData) => {
    const user = {
      id: socket.id,
      name: userData.name,
      joinedAt: Date.now(),
      lastSeen: Date.now(),
      rooms: new Set()
    };
    
    users.set(socket.id, user);
    socket.emit('user:joined', user);
  });

  // Room creation
  socket.on('room:create', (roomData) => {
    const roomId = uuidv4();
    const room = createRoom(roomId, roomData.name, socket.id);
    rooms.set(roomId, room);
    
    socket.join(roomId);
    users.get(socket.id).rooms.add(roomId);
    
    socket.emit('room:created', getRoomSummary(room));
    socket.emit('room:joined', {
      room: getRoomSummary(room),
      users: [users.get(socket.id)]
    });
  });

  // Room joining
  socket.on('room:join', (roomId) => {
    const room = rooms.get(roomId);
    
    if (!room) {
      socket.emit('room:error', { message: 'Room not found' });
      return;
    }
    
    socket.join(roomId);
    room.users.add(socket.id);
    room.lastActive = Date.now();
    users.get(socket.id).rooms.add(roomId);
    
    // Send room state to joiner
    const roomUsers = Array.from(room.users)
      .filter(id => users.has(id))
      .map(id => users.get(id));
    
    socket.emit('room:joined', {
      room: getRoomSummary(room),
      users: roomUsers
    });
    
    // Notify existing members
    socket.to(roomId).emit('user:joined', {
      user: users.get(socket.id),
      roomId
    });
  });

  // File offer (metadata only)
  socket.on('file:offer', (data) => {
    const { roomId, fileName, fileSize, fileId = uuidv4() } = data;
    console.log("File offered by client: ",data);
    const room = rooms.get(roomId);
    
    if (room && room.users.has(socket.id)) {
      const transfer = createTransfer(
        fileId,
        fileName,
        fileSize,
        socket.id,
        roomId
      );
      
      activeTransfers.set(fileId, transfer);
      
      // Broadcast to room except sender
      socket.to(roomId).emit('file:offered', {
        fileId,
        fileName,
        fileSize,
        senderId: socket.id,
        senderName: users.get(socket.id)?.name
      });
    }
  });

  // File request
  socket.on('file:request', (data) => {
    const { fileId, candidateId } = data;
    const transfer = activeTransfers.get(fileId);
    
    if (transfer && users.has(transfer.senderId)) {
      // Notify sender about request
      socket.to(transfer.senderId).emit('file:requested', {
        fileId,
        requesterId: socket.id,
        candidateId,
        requesterName: users.get(socket.id)?.name
      });
      
      // Update transfer status
      transfer.receivers.add(socket.id);
      transfer.status = 'requested';
    }
  });

  // WebRTC signaling relay with validation
  const handleSignaling = (event) => {
    socket.on(event, (data) => {
      // Validate target exists
      if (users.has(data.target)) {
        socket.to(data.target).emit(event, {
          ...data,
          sender: socket.id
        });
      } else {
        socket.emit('signaling:error', {
          message: `Target user not available`,
          type: event,
          target: data.target
        });
      }
    });
  };

  // Signaling events
  handleSignaling('rtc:offer');
  handleSignaling('rtc:answer');
  handleSignaling('rtc:ice-candidate');
  handleSignaling('rtc:renegotiate');
  
  // Transfer progress reporting
  socket.on('transfer:progress', (data) => {
    const { fileId, progress, direction } = data;
    const transfer = activeTransfers.get(fileId);
    
    if (transfer) {
      socket.to(transfer.senderId).emit('transfer:progress', {
        fileId,
        progress,
        receiverId: socket.id,
        direction
      });
    }
  });
  
  // Transfer completion
  socket.on('transfer:complete', (data) => {
    const { fileId } = data;
    const transfer = activeTransfers.get(fileId);
    
    if (transfer) {
      transfer.receivers.delete(socket.id);
      
      // Notify sender
      socket.to(transfer.senderId).emit('transfer:complete', {
        fileId,
        receiverId: socket.id
      });
      
      // Cleanup if no more receivers
      if (transfer.receivers.size === 0) {
        activeTransfers.delete(fileId);
      }
    }
  });

  // Disconnection handling
  socket.on('disconnect', (reason) => {
    console.log(`User disconnected (${reason}):`, socket.id);
    clearInterval(heartbeatInterval);
    
    // Update user presence
    if (users.has(socket.id)) {
      const user = users.get(socket.id);
      user.lastSeen = Date.now();
      
      // Remove from rooms
      user.rooms.forEach(roomId => {
        const room = rooms.get(roomId);
        if (room) {
          room.users.delete(socket.id);
          
          // Notify room members
          socket.to(roomId).emit('user:left', {
            userId: socket.id,
            roomId
          });
          
          // Clean empty rooms after 1 hour
          if (room.users.size === 0) {
            setTimeout(() => {
              if (rooms.get(roomId)?.users.size === 0) {
                rooms.delete(roomId);
                console.log(`Room ${roomId} cleaned up`);
              }
            }, 3600000); // 1 hour delay
          }
        }
      });
    }
    
    // Clean connection quality data
    connectionQuality.delete(socket.id);
  });
});

// Room cleanup cron (every hour)
setInterval(() => {
  const now = Date.now();
  let count = 0;
  
  rooms.forEach((room, id) => {
    if (room.users.size === 0 && (now - room.lastActive) > 3600000) {
      rooms.delete(id);
      count++;
    }
  });
  
  console.log(`Cleaned ${count} inactive rooms`);
}, 3600000); // 1 hour

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Signaling server running on port ${PORT}`);
});