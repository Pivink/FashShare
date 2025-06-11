export default {
  PORT: process.env.PORT || 3001,
  CORS_ORIGIN: process.env.CORS_ORIGIN || "*",
  HEARTBEAT_INTERVAL: 5000,
  ROOM_CLEANUP_DELAY: 3600000, // 1 hour
  MAX_DISCONNECTION_DURATION: 120000, // 2 minutes
};