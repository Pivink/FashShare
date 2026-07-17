import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [serverUrl, setServerUrl] = useState(() => {
    const serverHost = window.location.hostname || 'localhost';
    return `http://${serverHost}:3001`;
  });
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [user, setUser] = useState(null);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [roomUsers, setRoomUsers] = useState([]);
  const [roomError, setRoomError] = useState(null);

  const pendingRoomIdRef = React.useRef(null);
  const userRef = React.useRef(null);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    console.log('Connecting to signaling server:', serverUrl);
    const newSocket = io(serverUrl);

    newSocket.on('connect', () => {
      setConnected(true);
      console.log('Connected to server:', serverUrl);
      
      // Auto-re-register user on the new signaling connection if already joined
      if (userRef.current && userRef.current.name) {
        console.log('Auto-registering user on new server:', userRef.current.name);
        newSocket.emit('user:join', { name: userRef.current.name, uuid: getPersistentUuid() });
      }
      
      if (pendingRoomIdRef.current) {
        console.log('Automatically joining pending local room:', pendingRoomIdRef.current);
        newSocket.emit('room:join', pendingRoomIdRef.current);
        pendingRoomIdRef.current = null;
      }
    });

    newSocket.on('disconnect', () => {
      setConnected(false);
      setUser(null);
      setCurrentRoom(null);
      setRoomUsers([]);
      setRoomError(null);
      console.log('Disconnected from server');
    });

    // Current user's own data after joining
    newSocket.on('user:joined', (data) => {
      // If data contains roomId, it's another user joining the room
      if (data && data.user && data.roomId) {
        setRoomUsers(prev => {
          if (prev.some(u => u.id === data.user.id)) return prev;
          return [...prev, data.user];
        });
      } else {
        // It's the current user's own data
        setUser(data);
      }
    });

    // Another user left
    newSocket.on('user:left', (data) => {
      setRoomUsers(prev => prev.filter(u => u.id !== data.userId));
    });

    // Room created (own room)
    newSocket.on('room:created', (roomData) => {
      console.log('Room created:', roomData);
      setCurrentRoom(roomData);
      setRoomUsers([]);
    });

    // Room joined successfully – EXTRACT THE NESTED ROOM OBJECT
    newSocket.on('room:joined', (roomData) => {
      console.log('Room joined:', roomData);
      setCurrentRoom(roomData.room);      // ✅ this is the actual room summary
      setRoomUsers(roomData.users || []);
      setRoomError(null);
    });

    // Room error events
    newSocket.on('room:error', (error) => {
      console.error('Room error:', error);
      setRoomError(error);
    });
    newSocket.on('room:join:error', (error) => {
      console.error('Room join error:', error);
      setRoomError(error);
    });

    // Optional room updates
    newSocket.on('room:update', (roomData) => {
      console.log('Room update:', roomData);
      setCurrentRoom(roomData);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [serverUrl]);

  const getPersistentUuid = () => {
    let id = localStorage.getItem('zepshare_user_uuid');
    if (!id) {
      id = 'usr_' + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('zepshare_user_uuid', id);
    }
    return id;
  };

  const joinAsUser = (name) => {
    if (socket && connected) {
      console.log('Joining as user:', name);
      socket.emit('user:join', { name, uuid: getPersistentUuid() });
    }
  };

  const createRoom = (roomData) => {
    if (socket && connected) {
      console.log('Creating room:', roomData);
      if (typeof roomData === 'object' && roomData !== null) {
        socket.emit('room:create', roomData);
      } else {
        socket.emit('room:create', { name: roomData });
      }
    }
  };

  const joinRoom = (roomId) => {
    if (socket && connected) {
      console.log('Joining room:', roomId);
      setRoomError(null);
      socket.emit('room:join', roomId); // ✅ send as string, not object
    }
  };

  const joinLocalRoom = (roomId, ip, port = 3001) => {
    console.log(`Setting up local join: room=${roomId} at ${ip}:${port}`);
    pendingRoomIdRef.current = roomId;
    setServerUrl(`http://${ip}:${port}`);
  };

  const value = {
    socket,
    connected,
    user,
    currentRoom,
    roomUsers,
    roomError,
    joinAsUser,
    createRoom,
    joinRoom,
    joinLocalRoom,
    serverUrl,
    setServerUrl
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};