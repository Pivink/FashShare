import { cleanupInactiveRooms } from '../stores/rooms.js';

export const startRoomCleanup = () => {
  setInterval(() => {
    const count = cleanupInactiveRooms();
    console.log(`Cleaned ${count} inactive rooms`);
  }, 3600000);
};