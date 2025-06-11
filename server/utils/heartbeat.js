import { updateConnectionQuality } from '../stores/users.js';

export const startHeartbeat = (socket) => {
  const interval = setInterval(() => {
    socket.emit('heartbeat');
  }, 5000);
  
  socket.on('heartbeat-ack', () => {
    updateConnectionQuality(socket.id);
  });
  
  return interval;
};