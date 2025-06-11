const rooms = new Map();

export const createRoom = (id, name, creatorId) => {
  const room = {
    id,
    name,
    creator: creatorId,
    users: new Set([creatorId]),
    createdAt: Date.now(),
    lastActive: Date.now()
  };
  rooms.set(id, room);
  return room;
};

export const getRoom = (id) => rooms.get(id);

export const getRoomSummary = (room) => ({
  id: room.id,
  name: room.name,
  creator: room.creator,
  userCount: room.users.size,
  createdAt: room.createdAt
});

export const addUserToRoom = (roomId, userId) => {
  const room = rooms.get(roomId);
  if (room) {
    room.users.add(userId);
    room.lastActive = Date.now();
  }
  return room;
};

export const removeUserFromRoom = (roomId, userId) => {
  const room = rooms.get(roomId);
  if (room && room.users.has(userId)) {
    room.users.delete(userId);
    room.lastActive = Date.now();
  }
  return room;
};

export const deleteRoom = (roomId) => {
  rooms.delete(roomId);
};

export const getAllRooms = () => Array.from(rooms.values());

export const cleanupInactiveRooms = () => {
  const now = Date.now();
  let count = 0;
  
  rooms.forEach((room, id) => {
    if (room.users.size === 0 && (now - room.lastActive) > 3600000) {
      rooms.delete(id);
      count++;
    }
  });
  
  return count;
};