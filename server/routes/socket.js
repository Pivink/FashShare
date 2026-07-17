import * as roomController from '../controllers/room.js';
import * as transferController from '../controllers/transfer.js';
import * as signalingController from '../controllers/signaling.js';
import { startHeartbeat } from '../utils/heartbeat.js';
import { createUser, deleteUser, getUser, getAllUsers } from '../stores/users.js';
import { getRoom, deleteRoom } from '../stores/rooms.js';

export default (io) => {
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    
    // Initialize heartbeat
    const heartbeatInterval = startHeartbeat(socket);
    
    // User management
    socket.on('user:join', (userData) => {
      if (userData.uuid) {
        const existing = getAllUsers().find(u => u.uuid === userData.uuid);
        if (existing) {
          console.log(`Cleaning up stale duplicate user session: id=${existing.id}, name=${existing.name}`);
          // Make the stale user leave all active rooms they were in
          existing.rooms.forEach(roomId => {
            const leaveResult = roomController.handleLeaveRoom(
              io.sockets.sockets.get(existing.id) || { id: existing.id, leave: () => {} },
              roomId
            );
            io.to(roomId).emit('user:left', leaveResult);
          });
          deleteUser(existing.id);
        }
      }
      const user = createUser(socket.id, userData.name, userData.uuid);
      socket.emit('user:joined', user);
    });
    
    // Room management
    socket.on('room:create', (roomData) => {
      const result = roomController.handleCreateRoom(socket, roomData);
      socket.emit('room:created', result.room);
      socket.emit('room:joined', result);
    });
    
    socket.on('room:join', (roomId) => {
      const result = roomController.handleJoinRoom(socket, roomId);
      if (result) {
        socket.emit('room:joined', result);
        socket.to(roomId).emit('user:joined', {
          user: getUser(socket.id),
          roomId
        });
      } else {
        socket.emit('room:error', { message: 'Room not found or expired' });
      }
    });
    
    // File transfer
    socket.on('file:offer', (data) => {
      const result = transferController.handleFileOffer(socket, data);
      if (result) {
        socket.to(data.roomId).emit('file:offered', result);
      }
    });
    
    socket.on('file:request', (data) => {
      const result = transferController.handleFileRequest(socket, data);
      if (result) {
        socket.to(result.senderId).emit('file:requested', {
          ...result,
          senderId: result.senderId
        });
      }
    });
    
    socket.on('transfer:progress', (data) => {
      const result = transferController.handleTransferProgress(socket, data);
      if (result) {
        socket.to(result.senderId).emit('transfer:progress', result);
      }
    });
    
    socket.on('transfer:complete', (data) => {
      const result = transferController.handleTransferComplete(socket, data.fileId);
      if (result) {
        socket.to(result.senderId).emit('transfer:complete', result);
        
        // One-time download cleanup:
        const room = getRoom(result.roomId);
        if (room && room.oneTimeDownload) {
          io.to(result.roomId).emit('room:destroyed', { message: 'One-time download completed. Room destroyed.' });
          deleteRoom(result.roomId);
        }
      }
    });
    
    // WebRTC signaling
    signalingController.setupSignaling(socket);
    
    // Disconnect handler
    socket.on('disconnect', (reason) => {
      console.log(`User disconnected (${reason}):`, socket.id);
      clearInterval(heartbeatInterval);
      
      const user = getUser(socket.id);
      if (user) {
        user.rooms.forEach(roomId => {
          const leaveResult = roomController.handleLeaveRoom(socket, roomId);
          socket.to(roomId).emit('user:left', leaveResult);
        });
      }
      
      deleteUser(socket.id);
    });
  });
};