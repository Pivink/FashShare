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
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [user, setUser] = useState(null);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [roomUsers, setRoomUsers] = useState([]);
  const [roomError, setRoomError] = useState(null);

  useEffect(() => {
    const newSocket = io('http://localhost:3001');

    newSocket.on('connect', () => {
      setConnected(true);
      console.log('Connected to server');
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
        setRoomUsers(prev => [...prev, data.user]);
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
  }, []);

  const joinAsUser = (name) => {
    if (socket && connected) {
      console.log('Joining as user:', name);
      socket.emit('user:join', { name });
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

  const value = {
    socket,
    connected,
    user,
    currentRoom,
    roomUsers,
    roomError,
    joinAsUser,
    createRoom,
    joinRoom
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};