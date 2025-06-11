const users = new Map();
const connectionQuality = new Map();

export const createUser = (socketId, name) => {
  const user = {
    id: socketId,
    name,
    joinedAt: Date.now(),
    lastSeen: Date.now(),
    rooms: new Set()
  };
  users.set(socketId, user);
  return user;
};

export const getUser = (id) => users.get(id);

export const updateLastSeen = (userId) => {
  const user = users.get(userId);
  if (user) user.lastSeen = Date.now();
};

export const deleteUser = (id) => {
  users.delete(id);
  connectionQuality.delete(id);
};

export const addRoomToUser = (userId, roomId) => {
  const user = users.get(userId);
  if (user) user.rooms.add(roomId);
};

export const removeRoomFromUser = (userId, roomId) => {
  const user = users.get(userId);
  if (user) user.rooms.delete(roomId);
};

export const updateConnectionQuality = (userId) => {
  connectionQuality.set(userId, {
    lastAck: Date.now(),
    quality: 'good'
  });
};

export const getConnectionQuality = (userId) => connectionQuality.get(userId);