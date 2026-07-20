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
  // Track when the disconnect is intentionally caused by switching server URL (local mode)
  const switchingServerRef = React.useRef(false);

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
        // Room join will happen inside user:joined callback after server confirms registration
      } else if (pendingRoomIdRef.current) {
        // No existing user — just join the room (anonymous edge case)
        console.log('No user, joining pending room directly:', pendingRoomIdRef.current);
        newSocket.emit('room:join', pendingRoomIdRef.current);
        pendingRoomIdRef.current = null;
      }
    });

    newSocket.on('disconnect', () => {
      setConnected(false);
      // Only reset user/room if this is a genuine disconnect, not a local-mode server switch
      if (!switchingServerRef.current) {
        setUser(null);
        setCurrentRoom(null);
        setRoomUsers([]);
        setRoomError(null);
      }
      switchingServerRef.current = false;
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
        // It's the current user's own confirmation — update user state
        setUser(data);
        // If we were waiting to join a local room, do it now (after user is registered)
        if (pendingRoomIdRef.current) {
          console.log('User registered, now joining pending local room:', pendingRoomIdRef.current);
          newSocket.emit('room:join', pendingRoomIdRef.current);
          pendingRoomIdRef.current = null;
        }
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

    // Room was destroyed (closed by creator or one-time download)
    newSocket.on('room:destroyed', () => {
      console.log('Room destroyed by server');
      setCurrentRoom(null);
      setRoomUsers([]);
      setRoomError(null);
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
    const targetUrl = `http://${ip}:${port}`;

    if (targetUrl === serverUrl && socket && connected) {
      // Already on the correct server — emit room:join directly (no reconnect needed)
      console.log('Already on target server, joining room directly:', roomId);
      setRoomError(null);
      socket.emit('room:join', roomId);
    } else if (targetUrl === serverUrl && socket && !connected) {
      // Same URL but temporarily disconnected — queue the join
      console.log('Same server, queuing room join for reconnect:', roomId);
      pendingRoomIdRef.current = roomId;
    } else {
      // Need to switch to a different server
      console.log(`Switching server to ${targetUrl} then joining room:`, roomId);
      pendingRoomIdRef.current = roomId;
      switchingServerRef.current = true;
      setCurrentRoom(null);
      setServerUrl(targetUrl);
    }
  };

  const leaveRoom = () => {
    if (socket && currentRoom) {
      socket.emit('room:leave', currentRoom.id);
    }
    setCurrentRoom(null);
    setRoomUsers([]);
  };

  const closeRoom = () => {
    if (socket && currentRoom) {
      socket.emit('room:close', currentRoom.id);
    }
    setCurrentRoom(null);
    setRoomUsers([]);
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
    leaveRoom,
    closeRoom,
    serverUrl,
    setServerUrl
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};