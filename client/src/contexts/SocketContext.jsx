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
      console.log('Disconnected from server');
    });

    newSocket.on('user:joined', (userData) => {
      setUser(userData);
    });

    // Add more detailed logging for room events
    newSocket.on('room:created', (roomData) => {
      console.log('Room created event received:', roomData);
      setCurrentRoom(roomData);
    });

    newSocket.on('room:joined', (roomData) => {
      console.log('Room joined event received:', roomData);
      setCurrentRoom(roomData);
    });

    newSocket.on('room:join:error', (error) => {
      console.error('Room join error:', error);
    });

    // Add this new event for room updates
    newSocket.on('room:update', (roomData) => {
      console.log('Room update event received:', roomData);
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

  const createRoom = (roomName) => {
    if (socket && connected) {
      console.log('Creating room:', roomName);
      socket.emit('room:create', { name: roomName });
    }
  };

  const joinRoom = (roomId) => {
    if (socket && connected) {
      console.log('Joining room:', roomId);
      socket.emit('room:join', { roomId });
    }
  };

  const value = {
    socket,
    connected,
    user,
    currentRoom,
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