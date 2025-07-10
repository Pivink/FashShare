import React, { useState, useEffect, useRef } from 'react';
import { Upload, Download, QrCode, Link, Users, Send, X } from 'lucide-react';
import QRCode from 'qrcode';
import { useTheme } from '../contexts/ThemeContext';
import { useSocket } from '../contexts/SocketContext';

const FileSharePage = () => {
  const { theme } = useTheme();
  const { socket, connected, user, joinAsUser, createRoom, currentRoom } = useSocket();
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [userName, setUserName] = useState('');
  const [roomName, setRoomName] = useState('');
  const [showUserForm, setShowUserForm] = useState(true);
  const [showRoomForm, setShowRoomForm] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [shareUrl, setShareUrl] = useState('');
  const [transferProgress, setTransferProgress] = useState(0);
  const [transferStatus, setTransferStatus] = useState('');
  const [connectedUsers, setConnectedUsers] = useState([]);
  const [fileShared, setFileShared] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (user && !currentRoom) {
      setShowRoomForm(true);
    } else if (currentRoom) {
      setShowRoomForm(false);
    }
  }, [user, currentRoom]);

  useEffect(() => {
    if (socket) {
      console.log('Setting up socket listeners...');
      
      socket.on('connect', () => {
        console.log('Socket connected (FileSharePage)');
      });

      socket.on('disconnect', () => {
        console.log('Socket disconnected (FileSharePage)');
      });

      socket.on('file:offered', (data) => {
        console.log('File offered event:', data);
        setTransferStatus(`File offered: ${data.fileName} from ${data.senderName}`);
      });

      socket.on('file:requested', (data) => {
        console.log('File requested event:', data);
        setTransferStatus(`File requested by ${data.requesterName}`);
      });

      socket.on('transfer:progress', (data) => {
        console.log('Transfer progress:', data.progress);
        setTransferProgress(data.progress);
        setTransferStatus(`Transfer progress: ${data.progress}%`);
      });

      socket.on('transfer:complete', (data) => {
        console.log('Transfer complete');
        setTransferStatus('Transfer completed successfully!');
        setTransferProgress(100);
      });

      socket.on('user:joined', (data) => {
        console.log('User joined:', data.user);
        setConnectedUsers(prev => [...prev, data.user]);
      });

      socket.on('user:left', (data) => {
        console.log('User left:', data.userId);
        setConnectedUsers(prev => prev.filter(u => u.id !== data.userId));
      });

      // Add listener for room updates
      socket.on('room:update', (roomData) => {
        console.log('Room update received (FileSharePage):', roomData);
      });

      return () => {
        console.log('Cleaning up socket listeners');
        socket.off('file:offered');
        socket.off('file:requested');
        socket.off('transfer:progress');
        socket.off('transfer:complete');
        socket.off('user:joined');
        socket.off('user:left');
        socket.off('room:update');
      };
    }
  }, [socket]);

  // Reset sharing state when room changes
  useEffect(() => {
    if (currentRoom) {
      console.log('Current room changed:', currentRoom);
      setShareUrl('');
      setQrCodeUrl('');
      setFileShared(false);
    }
  }, [currentRoom]);

  const generateQRCode = async (url) => {
    try {
      console.log('Generating QR code for URL:', url);
      const qrCodeDataUrl = await QRCode.toDataURL(url);
      setQrCodeUrl(qrCodeDataUrl);
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  };

  const handleUserJoin = (e) => {
    e.preventDefault();
    if (userName.trim() && connected) {
      console.log('Joining as user:', userName.trim());
      joinAsUser(userName.trim());
      setShowUserForm(false);
    }
  };

  const handleCreateRoom = (e) => {
    e.preventDefault();
    if (roomName.trim()) {
      console.log('Creating room:', roomName.trim());
      createRoom(roomName.trim());
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      console.log('File dropped:', file.name);
      setSelectedFile(file);
      setShareUrl('');
      setQrCodeUrl('');
      setFileShared(false);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      console.log('File selected:', file.name);
      setSelectedFile(file);
      setShareUrl('');
      setQrCodeUrl('');
      setFileShared(false);
    }
  };

  const handleFileOffer = () => {
    console.log('Attempting to share file...');
    console.log('Selected file:', selectedFile);
    console.log('Current room:', currentRoom);
    
    if (!selectedFile) {
      setTransferStatus('No file selected');
      return;
    }
    
    if (!socket) {
      setTransferStatus('Not connected to server');
      return;
    }
    
    if (!currentRoom || !currentRoom.id) {
      setTransferStatus('Room is not ready. Please try again.');
      return;
    }
    
    const fileData = {
      roomId: currentRoom.id,
      fileName: selectedFile.name,
      fileSize: selectedFile.size,
      fileId: Date.now().toString()
    };
    
    console.log('Emitting file:offer', fileData);
    socket.emit('file:offer', fileData);
    setTransferStatus(`Offering file: ${selectedFile.name}`);
    
    // Generate share URL and QR code AFTER sharing
    const url = `${window.location.origin}/join/${currentRoom.id}`;
    console.log('Share URL:', url);
    setShareUrl(url);
    generateQRCode(url);
    setFileShared(true);
  };

  const copyShareUrl = () => {
    if (!shareUrl) {
      setTransferStatus('No share URL available');
      return;
    }
    
    console.log('Copying share URL:', shareUrl);
    const tempInput = document.createElement('input');
    tempInput.value = shareUrl;
    document.body.appendChild(tempInput);
    tempInput.select();
    
    try {
      const successful = document.execCommand('copy');
      if (successful) {
        setTransferStatus('Share URL copied to clipboard!');
      } else {
        setTransferStatus('Failed to copy URL');
      }
    } catch (err) {
      setTransferStatus('Failed to copy URL');
    }
    
    document.body.removeChild(tempInput);
  };

  if (!connected) {
    return (
      <div className={`min-h-screen ${theme.background} flex items-center justify-center`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className={`${theme.text} text-lg`}>Connecting to ZepShare...</p>
        </div>
      </div>
    );
  }

  if (showUserForm) {
    return (
      <div className={`min-h-screen ${theme.background} flex items-center justify-center`}>
        <div className={`${theme.card} border rounded-xl p-8 max-w-md w-full mx-4`}>
          <h2 className={`text-2xl font-bold ${theme.text} mb-6 text-center`}>
            Welcome to ZepShare
          </h2>
          <form onSubmit={handleUserJoin} className="space-y-4">
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
              className={`w-full ${theme.primary} ${theme.text} py-3 px-6 rounded-lg font-semibold ${theme.hover} transition-all duration-300`}
            >
              Join ZepShare
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (showRoomForm) {
    return (
      <div className={`min-h-screen ${theme.background} flex items-center justify-center`}>
        <div className={`${theme.card} border rounded-xl p-8 max-w-md w-full mx-4`}>
          <h2 className={`text-2xl font-bold ${theme.text} mb-6 text-center`}>
            Create a Room
          </h2>
          <form onSubmit={handleCreateRoom} className="space-y-4">
            <div>
              <label htmlFor="roomName" className={`block text-sm font-medium ${theme.text} mb-2`}>
                Room Name
              </label>
              <input
                type="text"
                id="roomName"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                className={`w-full px-4 py-3 rounded-lg border ${theme.card} ${theme.text} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                placeholder="Enter room name"
                required
              />
            </div>
            <button
              type="submit"
              className={`w-full ${theme.primary} ${theme.text} py-3 px-6 rounded-lg font-semibold ${theme.hover} transition-all duration-300`}
            >
              Create Room
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme.background} pt-24`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* File Upload Section */}
          <div className="lg:col-span-2">
            <div className={`${theme.card} border rounded-xl p-8`}>
              <h2 className={`text-2xl font-bold ${theme.text} mb-6`}>
                Share Your Files
              </h2>
              
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-300 ${
                  dragActive
                    ? `border-blue-500 bg-blue-50 ${theme.primary}`
                    : `border-gray-300 ${theme.hover}`
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <Upload className={`h-12 w-12 ${theme.textSecondary} mx-auto mb-4`} />
                <p className={`${theme.text} text-lg mb-2`}>
                  Drag and drop your file here
                </p>
                <p className={`${theme.textSecondary} mb-4`}>
                  or click to select a file
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className={`${theme.primary} ${theme.text} px-6 py-2 rounded-lg font-semibold ${theme.hover} transition-all duration-300`}
                >
                  Select File
                </button>
              </div>

              {selectedFile && (
                <div className={`mt-6 p-4 ${theme.secondary} rounded-lg`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`${theme.text} font-semibold`}>
                        {selectedFile.name}
                      </p>
                      <p className={`${theme.textSecondary} text-sm`}>
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={handleFileOffer}
                        className={`${theme.primary} ${theme.text} px-4 py-2 rounded-lg font-semibold ${theme.hover} transition-all duration-300 flex items-center space-x-2`}
                      >
                        <Send className="h-4 w-4" />
                        <span>Share</span>
                      </button>
                      <button
                        onClick={() => {
                          setSelectedFile(null);
                          setShareUrl('');
                          setQrCodeUrl('');
                          setFileShared(false);
                        }}
                        className={`${theme.card} border ${theme.textSecondary} px-4 py-2 rounded-lg ${theme.hover} transition-all duration-300`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {transferProgress > 0 && (
                <div className="mt-6">
                  <div className="flex justify-between text-sm mb-2">
                    <span className={`${theme.text}`}>Transfer Progress</span>
                    <span className={`${theme.textSecondary}`}>{transferProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`${theme.primary} h-2 rounded-full transition-all duration-300`}
                      style={{ width: `${transferProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {transferStatus && (
                <div className={`mt-4 p-3 ${theme.secondary} rounded-lg`}>
                  <p className={`${theme.text} text-sm`}>{transferStatus}</p>
                </div>
              )}
            </div>
          </div>

          {/* Room Info and QR Code Section */}
          <div className="space-y-6">
            {/* Room Info */}
            <div className={`${theme.card} border rounded-xl p-6`}>
              <h3 className={`text-xl font-bold ${theme.text} mb-4`}>
                Room Information
              </h3>
              {currentRoom && (
                <div className="space-y-3">
                  <div>
                    <p className={`${theme.textSecondary} text-sm`}>Room Name</p>
                    <p className={`${theme.text} font-semibold`}>{currentRoom.name}</p>
                  </div>
                  <div>
                    <p className={`${theme.textSecondary} text-sm`}>Room ID</p>
                    <p className={`${theme.text} font-mono text-sm`}>{currentRoom.id || 'Loading...'}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-gray-500" />
                    <span className={`${theme.textSecondary} text-sm`}>
                      {connectedUsers.length + 1} connected
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* QR Code - Only show after file is shared */}
            {fileShared && qrCodeUrl && (
              <div className={`${theme.card} border rounded-xl p-6 text-center`}>
                <h3 className={`text-xl font-bold ${theme.text} mb-4`}>
                  QR Code
                </h3>
                <div className="bg-white p-4 rounded-lg inline-block">
                  <img src={qrCodeUrl} alt="QR Code" className="w-32 h-32" />
                </div>
                <p className={`${theme.textSecondary} text-sm mt-2`}>
                  Scan to join this room
                </p>
              </div>
            )}

            {/* Share URL - Only show after file is shared */}
            {fileShared && shareUrl && (
              <div className={`${theme.card} border rounded-xl p-6`}>
                <h3 className={`text-xl font-bold ${theme.text} mb-4`}>
                  Share Link
                </h3>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={shareUrl}
                    readOnly
                    className={`flex-1 px-3 py-2 rounded-lg border ${theme.card} ${theme.text} text-sm`}
                  />
                  <button
                    onClick={copyShareUrl}
                    className={`${theme.primary} ${theme.text} px-4 py-2 rounded-lg ${theme.hover} transition-all duration-300`}
                  >
                    <Link className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileSharePage;