// src/pages/JoinRoomPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useSocket } from '../contexts/SocketContext';

const JoinRoomPage = () => {
    console.log("Join route")
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { socket, connected, user, joinAsUser, joinRoom, currentRoom } = useSocket();
  const [userName, setUserName] = useState(user?.name || '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    if (connected) {
      setLoading(false);
      
      // If user is already authenticated, join room immediately
      if (user) {
        handleRoomJoin();
      }
    }
  }, [connected, user]);

  useEffect(() => {
    if (currentRoom?.id === roomId) {
      // Redirect to share page after successful join
      navigate('/share');
    }
  }, [currentRoom, roomId, navigate]);

  const handleRoomJoin = () => {
    if (!roomId) {
      setError('Invalid room ID');
      return;
    }
    
    setIsJoining(true);
    joinRoom(roomId);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!userName.trim()) {
      setError('Please enter your name');
      return;
    }
    
    if (!user) {
      joinAsUser(userName.trim());
    }
    
    handleRoomJoin();
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${theme.background} flex items-center justify-center`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className={`${theme.text} text-lg`}>Connecting to server...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme.background} flex items-center justify-center`}>
      <div className={`${theme.card} border rounded-xl p-8 max-w-md w-full mx-4`}>
        <h2 className={`text-2xl font-bold ${theme.text} mb-6 text-center`}>
          Join Room
        </h2>
        
        {error && (
          <div className={`mb-4 p-3 rounded-lg bg-red-100 text-red-800`}>
            {error}
          </div>
        )}
        
        <p className={`${theme.text} mb-4 text-center`}>
          You're joining room: <span className="font-mono bg-gray-100 px-2 py-1 rounded">{roomId}</span>
        </p>
        
        {!user && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="userName" className={`block text-sm font-medium ${theme.text} mb-2`}>
                Your Name
              </label>
              <input
                type="text"
                id="userName"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className={`w-full px-4 py-3 rounded-lg border ${theme.card} ${theme.text} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                placeholder="Enter your name"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isJoining}
              className={`w-full ${theme.primary} ${theme.text} py-3 px-6 rounded-lg font-semibold ${theme.hover} transition-all duration-300 disabled:opacity-50`}
            >
              {isJoining ? 'Joining...' : 'Join Room'}
            </button>
          </form>
        )}
        
        {user && (
          <div className="text-center">
            <p className={`${theme.text} mb-4`}>
              You're joining as: <span className="font-semibold">{user.name}</span>
            </p>
            <button
              onClick={handleRoomJoin}
              disabled={isJoining}
              className={`w-full ${theme.primary} ${theme.text} py-3 px-6 rounded-lg font-semibold ${theme.hover} transition-all duration-300 disabled:opacity-50`}
            >
              {isJoining ? 'Joining...' : 'Join Room'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default JoinRoomPage;