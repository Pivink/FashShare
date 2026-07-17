import { stopAdvertising, getLocalIp } from '../utils/localDiscovery.js';

const rooms = new Map();

export const createRoom = (id, name, creatorId, options = {}) => {
  const room = {
    id,
    name,
    creator: creatorId,
    creatorName: options.creatorName || 'Local Host',
    users: new Set([creatorId]),
    offers: [], // Store file offers inside the room object
    createdAt: Date.now(),
    lastActive: Date.now(),
    expiresAt: options.expiresAfter ? Date.now() + options.expiresAfter * 60 * 1000 : null,
    oneTimeDownload: options.oneTimeDownload || false,
    isLocal: options.isLocal || false
  };
  rooms.set(id, room);
  return room;
};

export const getRoom = (id) => {
  const room = rooms.get(id);
  if (!room) return null;
  // Check if room has expired
  if (room.expiresAt && Date.now() > room.expiresAt) {
    rooms.delete(id);
    return null;
  }
  return room;
};

export const getRoomSummary = (room) => ({
  id: room.id,
  name: room.name,
  creator: room.creator,
  creatorName: room.creatorName,
  userCount: room.users.size,
  createdAt: room.createdAt,
  expiresAt: room.expiresAt,
  oneTimeDownload: room.oneTimeDownload,
  isLocal: room.isLocal,
  hostIp: room.isLocal ? getLocalIp() : null
});

export const addUserToRoom = (roomId, userId) => {
  const room = getRoom(roomId);
  if (room) {
    room.users.add(userId);
    room.lastActive = Date.now();
  }
  return room;
};

export const removeUserFromRoom = (roomId, userId) => {
  const room = getRoom(roomId);
  if (room && room.users.has(userId)) {
    room.users.delete(userId);
    room.lastActive = Date.now();
  }
  return room;
};

export const addOfferToRoom = (roomId, offer) => {
  const room = getRoom(roomId);
  if (room) {
    room.offers.push(offer);
    room.lastActive = Date.now();
  }
};

export const removeOfferFromRoom = (roomId, fileId) => {
  const room = getRoom(roomId);
  if (room) {
    room.offers = room.offers.filter(o => o.fileId !== fileId);
    room.lastActive = Date.now();
  }
};



export const deleteRoom = (roomId) => {
  const room = rooms.get(roomId);
  if (room && room.isLocal) {
    stopAdvertising(roomId);
  }
  rooms.delete(roomId);
};

export const getAllRooms = () => Array.from(rooms.values());

export const cleanupInactiveRooms = () => {
  const now = Date.now();
  let count = 0;
  
  rooms.forEach((room, id) => {
    // Clean room if empty for more than 1 hour OR if it has expired
    const isExpired = room.expiresAt && now > room.expiresAt;
    const isEmptyAndInactive = room.users.size === 0 && (now - room.lastActive) > 3600000;
    
    if (isExpired || isEmptyAndInactive) {
      if (room.isLocal) {
        stopAdvertising(id);
      }
      rooms.delete(id);
      count++;
    }
  });
  
  return count;
};
