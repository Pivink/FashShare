import { v4 as uuidv4 } from 'uuid';
import {
  createRoom,
  addUserToRoom,
  getRoomSummary,
  getRoom,
  removeUserFromRoom
} from '../stores/rooms.js';
import { getUser, addRoomToUser, removeRoomFromUser } from '../stores/users.js';
import { startAdvertising, stopAdvertising } from '../utils/localDiscovery.js';

export const handleCreateRoom = (socket, roomData) => {
  const roomId = uuidv4();
  const user = getUser(socket.id);
  const room = createRoom(roomId, roomData.name, socket.id, {
    expiresAfter: roomData.expiresAfter,
    oneTimeDownload: roomData.oneTimeDownload,
    isLocal: roomData.isLocal,
    creatorName: user ? user.name : 'Local Host'
  });
  
  socket.join(roomId);
  addRoomToUser(socket.id, roomId);
  
  if (room.isLocal) {
    startAdvertising(room);
  }
  
  return {
    room: getRoomSummary(room),
    users: [getUser(socket.id)]
  };
};

export const handleJoinRoom = (socket, roomId) => {
  const room = getRoom(roomId);
  if (!room) return null;
  
  socket.join(roomId);
  addUserToRoom(roomId, socket.id);
  addRoomToUser(socket.id, roomId);
  
  const roomUsers = Array.from(room.users)
    .filter(id => getUser(id))
    .map(id => getUser(id));
  
  return {
    room: getRoomSummary(room),
    users: roomUsers,
    offers: room.offers || []
  };
};

export const handleLeaveRoom = (socket, roomId) => {
  removeUserFromRoom(roomId, socket.id);
  removeRoomFromUser(socket.id, roomId);
  socket.leave(roomId);
  
  const room = getRoom(roomId);
  if (room && room.users.size === 0) {
    if (room.isLocal) {
      stopAdvertising(roomId);
    }
  }
  
  return {
    userId: socket.id,
    roomId
  };
};