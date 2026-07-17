import dgram from 'dgram';
import os from 'os';

const BROADCAST_PORT = 41234;
const BROADCAST_ADDR = '255.255.255.255';

// Map of active local room ads: roomId -> intervalId
const activeAdvertisements = new Map();

// Helper to get local IP address
export const getLocalIp = () => {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
};

// Start advertising a local room over UDP broadcast
export const startAdvertising = (room) => {
  if (activeAdvertisements.has(room.id)) return;

  const client = dgram.createSocket('udp4');
  
  // Enable broadcasting
  client.on('listening', () => {
    client.setBroadcast(true);
  });

  const ip = getLocalIp();
  const port = process.env.PORT || 3001;

  const broadcastMsg = () => {
    try {
      const payload = JSON.stringify({
        type: 'zepshare_room',
        roomId: room.id,
        roomName: room.name,
        hostName: room.creatorName || 'Local Host',
        ip,
        port,
        timestamp: Date.now()
      });

      const message = Buffer.from(payload);
      client.send(message, 0, message.length, BROADCAST_PORT, BROADCAST_ADDR, (err) => {
        if (err) {
          console.error('UDP Broadcast send error:', err);
        }
      });
    } catch (err) {
      console.error('Error generating UDP broadcast payload:', err);
    }
  };

  // Bind and start interval
  client.bind(() => {
    broadcastMsg(); // Initial broadcast
    const interval = setInterval(broadcastMsg, 3000);
    activeAdvertisements.set(room.id, { client, interval });
    console.log(`Started UDP advertising for room ${room.name} (${room.id}) at ${ip}:${port}`);
  });
};

// Stop advertising a local room
export const stopAdvertising = (roomId) => {
  const ad = activeAdvertisements.get(roomId);
  if (ad) {
    clearInterval(ad.interval);
    try {
      ad.client.close();
    } catch (e) {}
    activeAdvertisements.delete(roomId);
    console.log(`Stopped UDP advertising for room: ${roomId}`);
  }
};

// Listen for UDP broadcasts from other nearby devices
let receiverSocket = null;
export const startListening = (io) => {
  if (receiverSocket) return;

  receiverSocket = dgram.createSocket({ type: 'udp4', reuseAddr: true });

  receiverSocket.on('listening', () => {
    console.log(`UDP Discovery listening on port ${BROADCAST_PORT}`);
  });

  receiverSocket.on('message', (msg, rinfo) => {
    try {
      const data = JSON.parse(msg.toString());
      if (data.type === 'zepshare_room') {
        // Discovered a room! Push this discovery event to local clients connected to this signaling server
        io.emit('local:room:discovered', {
          roomId: data.roomId,
          roomName: data.roomName,
          hostName: data.hostName,
          ip: data.ip,
          port: data.port,
          lastSeen: Date.now()
        });
      }
    } catch (e) {
      // Ignore malformed packets
    }
  });

  receiverSocket.on('error', (err) => {
    console.error('UDP receiver error:', err);
  });

  try {
    receiverSocket.bind(BROADCAST_PORT);
  } catch (err) {
    console.error(`Failed to bind UDP discovery receiver on port ${BROADCAST_PORT}:`, err.message);
  }
};
