import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import config from './config.js';
import socketRoutes from './routes/socket.js';
import { startRoomCleanup } from './utils/cleanup.js';
import { startListening } from './utils/localDiscovery.js';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: config.CORS_ORIGIN,
    methods: ["GET", "POST"]
  },
  connectionStateRecovery: {
    maxDisconnectionDuration: config.MAX_DISCONNECTION_DURATION,
    skipMiddlewares: true
  }
});

app.use(cors());
app.use(express.json());

// Initialize socket routes
socketRoutes(io);

// Start local UDP discovery listening
startListening(io);

// Start room cleanup background task
startRoomCleanup();

const PORT = config.PORT;
server.listen(PORT, () => {
  console.log(`Signaling server running on port ${PORT}`);
});