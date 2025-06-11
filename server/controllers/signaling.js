import { getUser } from '../stores/users.js';

export const handleSignaling = (socket, event) => {
  socket.on(event, (data) => {
    if (getUser(data.target)) {
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

export const setupSignaling = (socket) => {
  const events = [
    'rtc:offer',
    'rtc:answer',
    'rtc:ice-candidate',
    'rtc:renegotiate'
  ];
  
  events.forEach(event => handleSignaling(socket, event));
};