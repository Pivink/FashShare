import React, { useState, useEffect, useRef } from 'react';
import { Upload, Link, Users, Send, X, Download, Check, XCircle, Shield, Key, Clock, Sparkles, Globe, Wifi, Plus, Search } from 'lucide-react';
import QRCode from 'qrcode';
import { useTheme } from '../contexts/ThemeContext';
import { useSocket } from '../contexts/SocketContext';
import {
  calculateHash,
  deriveKeyFromPassword,
  encryptBuffer,
  decryptBuffer,
  compressBuffer,
  decompressBuffer,
  shouldCompress
} from '../utils/crypto';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ]
};

const CHUNK_SIZE = 250 * 1024; // 250KB chunks (leaves room for header under 256KB max-message-size)

// Convert ArrayBuffer to Hex String
const bufToHex = (buffer) => {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

// Convert Hex String to ArrayBuffer
const hexToBuf = (hex) => {
  if (!hex || typeof hex !== 'string') return new ArrayBuffer(0);
  const bytes = new Uint8Array(hex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
  return bytes.buffer;
};

const FileSharePage = () => {
  const { theme } = useTheme();
  const {
    socket,
    connected,
    user,
    joinAsUser,
    createRoom,
    joinRoom,
    joinLocalRoom,
    currentRoom,
    roomUsers
  } = useSocket();

  // UI state
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [userName, setUserName] = useState('');
  const [roomName, setRoomName] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [shareUrl, setShareUrl] = useState('');
  const [transferProgress, setTransferProgress] = useState(0);
  const [transferStatus, setTransferStatus] = useState('');
  const [fileShared, setFileShared] = useState(false);
  const [offeredFiles, setOfferedFiles] = useState([]);
  const [myOfferedFiles, setMyOfferedFiles] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);

  // Local Mode & Discovery states
  const [sharingMode, setSharingMode] = useState('internet'); // 'internet' or 'local'
  const [discoveredRooms, setDiscoveredRooms] = useState([]);
  const [joinRoomId, setJoinRoomId] = useState('');

  // Room enhancements state
  const [expiresAfter, setExpiresAfter] = useState('0'); // '0' = Never, '5' = 5 min, '10' = 10 min, '60' = 1 Hour
  const [oneTimeDownload, setOneTimeDownload] = useState(false);

  // Encryption / Password state
  const [password, setPassword] = useState('');
  const [isPasswordProtected, setIsPasswordProtected] = useState(false);
  const [receiverPassword, setReceiverPassword] = useState('');
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [selectedFileToDownload, setSelectedFileToDownload] = useState(null);
  const [passwordError, setPasswordError] = useState('');

  const fileInputRef = useRef(null);
  const pcRef = useRef(null);           // RTCPeerConnection
  const dcRef = useRef(null);           // RTCDataChannel
  const receivingFileRef = useRef(null);
  const receivedChunksRef = useRef([]);
  const candidateQueueRef = useRef([]);
  const socketRef = useRef(socket);

  // Encryption keys & prepared send buffer
  const senderBufferRef = useRef(null); // holds final encrypted ArrayBuffer to send
  const fileMetaRef = useRef(null);     // holds current metadata of file being sent/received

  // Speed, remaining time, and pause/resume states
  const [transferSpeed, setTransferSpeed] = useState('');
  const [timeRemaining, setTimeRemaining] = useState('');
  const [timeElapsed, setTimeElapsed] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef(false);
  const startTimeRef = useRef(null);
  const pauseTimeRef = useRef(null);
  const [isTransferring, setIsTransferring] = useState(false);

  // Keep socketRef current
  useEffect(() => { socketRef.current = socket; }, [socket]);

  // Keep refs for event listener closures updated
  const currentRoomRef = useRef(currentRoom);
  const receiverPasswordRef = useRef(receiverPassword);

  useEffect(() => {
    currentRoomRef.current = currentRoom;
  }, [currentRoom]);

  useEffect(() => {
    receiverPasswordRef.current = receiverPassword;
  }, [receiverPassword]);

  // Helper: close any existing peer connection
  const closePc = () => {
    if (dcRef.current) { try { dcRef.current.close(); } catch(e){} dcRef.current = null; }
    if (pcRef.current) { try { pcRef.current.close(); } catch(e){} pcRef.current = null; }
    candidateQueueRef.current = [];
    resetTransferStats();
  };

  const resetTransferStats = () => {
    setTransferSpeed('');
    setTimeRemaining('');
    setTimeElapsed('');
    setIsPaused(false);
    isPausedRef.current = false;
    startTimeRef.current = null;
    pauseTimeRef.current = null;
    setIsTransferring(false);
    setTransferProgress(0);
  };

  const handlePauseToggle = () => {
    const dc = dcRef.current;
    if (!dc || dc.readyState !== 'open') return;
    
    const nextState = !isPausedRef.current;
    isPausedRef.current = nextState;
    setIsPaused(nextState);
    
    if (nextState) {
      pauseTimeRef.current = Date.now();
    } else {
      if (pauseTimeRef.current && startTimeRef.current) {
        const pauseDuration = Date.now() - pauseTimeRef.current;
        startTimeRef.current += pauseDuration;
      }
    }
    
    dc.send(JSON.stringify({
      type: nextState ? 'pause' : 'resume'
    }));
  };

  const showUserForm = !user;
  const showRoomForm = user && !currentRoom;

  // --- Socket listeners ---
  useEffect(() => {
    if (!socket) return;
    console.log('Setting up file transfer listeners...');

    const onFileOffered = (data) => {
      setOfferedFiles(prev => {
        if (prev.some(f => f.id === data.fileId)) return prev;
        return [...prev, {
          id: data.fileId,
          name: data.fileName,
          size: data.fileSize,
          senderId: data.senderId,
          senderName: data.senderName,
          isPasswordProtected: data.isPasswordProtected,
          isCompressed: data.isCompressed,
          fileHash: data.fileHash,
          salt: data.salt,
          iv: data.iv,
          encryptionType: data.encryptionType,
          authToken: data.authToken,
          authIv: data.authIv
        }];
      });
      setTransferStatus(`New file available: ${data.fileName} from ${data.senderName}`);
    };

    const onFileRequested = (data) => {
      console.log('File requested:', data);
      setTransferStatus(`File requested by ${data.requesterName}`);
      setPendingRequests(prev => {
        if (prev.some(r => r.fileId === data.fileId && r.requesterId === data.requesterId)) return prev;
        return [...prev, {
          fileId: data.fileId,
          requesterId: data.requesterId,
          requesterName: data.requesterName,
        }];
      });
    };

    // Receiver gets the WebRTC offer from sender
    const onRtcOffer = async (data) => {
      console.log('RTC offer received from', data.sender);
      const receivingFile = receivingFileRef.current;
      if (!receivingFile) {
        console.warn('Got RTC offer but not waiting for any file – ignoring');
        return;
      }

      closePc();
      
      // Restore the active file ref and clear the chunks buffer for the new connection
      receivingFileRef.current = receivingFile;
      receivedChunksRef.current = [];

      const pc = new RTCPeerConnection(ICE_SERVERS);
      pcRef.current = pc;

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          socketRef.current?.emit('rtc:ice-candidate', { target: data.sender, candidate: e.candidate });
        }
      };

      pc.ondatachannel = (e) => {
        const dc = e.channel;
        dc.binaryType = 'arraybuffer';
        dcRef.current = dc;
        console.log('Data channel received:', dc.label);

        dc.onmessage = async (evt) => {
          if (typeof evt.data === 'string') {
            try {
              const msg = JSON.parse(evt.data);
              
              if (msg.type === 'meta') {
                console.log('Received file metadata via WebRTC:', msg);
                fileMetaRef.current = msg;
                
                // Initialize chunks array if empty
                if (receivedChunksRef.current.length === 0) {
                  receivedChunksRef.current = new Array(msg.totalChunks);
                }
                
                // Request next chunk index (support resume transfer)
                // Scan array to find first missing index (0 for new, or first gap if resuming)
                let firstMissingIdx = 0;
                while (firstMissingIdx < msg.totalChunks && receivedChunksRef.current[firstMissingIdx] !== undefined) {
                  firstMissingIdx++;
                }
                
                dc.send(JSON.stringify({
                  type: 'ready',
                  nextChunkIndex: firstMissingIdx
                }));
                
                setTransferStatus(`Connected. Starting download from chunk ${firstMissingIdx}...`);
                return;
              }
              
              if (msg.type === 'check_complete') {
                console.log('Sender finished sending. Verifying chunk integrity...');
                // Check if any chunks are missing
                const missingIndices = [];
                const total = receivedChunksRef.current.length;
                for (let i = 0; i < total; i++) {
                  if (receivedChunksRef.current[i] === undefined) {
                    missingIndices.push(i);
                  }
                }
                
                if (missingIndices.length > 0) {
                  console.warn('Missing chunks found:', missingIndices);
                  setTransferStatus(`Recovering ${missingIndices.length} missing chunks...`);
                  dc.send(JSON.stringify({
                    type: 'resend_chunks',
                    indices: missingIndices
                  }));
                } else {
                  console.log('All chunks verified. Assembling file...');
                  setTransferStatus('Decrypting and verifying file integrity...');
                  dc.send(JSON.stringify({ type: 'transfer_complete' }));
                  
                  // Start Decryption / Decompression / Download
                  await assembleAndSaveFile();
                }
                return;
              }
            } catch (err) {
              console.error('Error parsing text channel message:', err);
            }
          } else {
            // Binary chunk received
            const view = new DataView(evt.data);
            const chunkIndex = view.getUint32(0);
            const totalChunks = view.getUint32(4);
            const chunkData = evt.data.slice(8);

            receivedChunksRef.current[chunkIndex] = chunkData;

            // Calculate progress based on actual non-undefined chunks
            const receivedCount = receivedChunksRef.current.filter(c => c !== undefined).length;
            const progress = Math.round((receivedCount / totalChunks) * 100);
            setTransferProgress(progress);
            setTransferStatus(`Downloading: ${progress}% (${receivedCount}/${totalChunks} chunks)`);
          }
        };

        dc.onopen = () => {
          console.log('Data channel open – ready to receive');
          setTransferStatus('Connected – exchanging metadata…');
        };

        dc.onerror = (err) => {
          if (dcRef.current !== dc) return;
          console.error('Data channel error:', err);
          setTransferStatus('Transfer error');
          closePc();
        };

        dc.onclose = () => {
          if (dcRef.current !== dc) return;
          console.log('Data channel closed');
          setTransferStatus('Connection closed');
          closePc();
        };
      };

      await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));

      // Flush queued candidates
      for (const c of candidateQueueRef.current) {
        await pc.addIceCandidate(new RTCIceCandidate(c)).catch(console.warn);
      }
      candidateQueueRef.current = [];

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socketRef.current?.emit('rtc:answer', { target: data.sender, sdp: pc.localDescription });
    };

    // Sender gets the WebRTC answer from receiver
    const onRtcAnswer = async (data) => {
      console.log('RTC answer received from', data.sender);
      const pc = pcRef.current;
      if (!pc) { console.warn('Got answer but no peer connection exists'); return; }
      await pc.setRemoteDescription(new RTCSessionDescription(data.sdp)).catch(console.error);

      // Flush queued candidates
      for (const c of candidateQueueRef.current) {
        await pc.addIceCandidate(new RTCIceCandidate(c)).catch(console.warn);
      }
      candidateQueueRef.current = [];
    };

    const onRtcIceCandidate = async (data) => {
      const pc = pcRef.current;
      if (pc && pc.remoteDescription) {
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate)).catch(console.warn);
      } else {
        candidateQueueRef.current.push(data.candidate);
      }
    };

    const onTransferProgress = (data) => {
      setTransferProgress(data.progress);
      setTransferStatus(`Transfer progress: ${data.progress}%`);
    };

    const onLocalRoomDiscovered = (roomData) => {
      setDiscoveredRooms(prev => {
        const filtered = prev.filter(r => r.roomId !== roomData.roomId);
        return [...filtered, roomData];
      });
    };

    socket.on('file:offered', onFileOffered);
    socket.on('file:requested', onFileRequested);
    socket.on('transfer:progress', onTransferProgress);
    socket.on('rtc:offer', onRtcOffer);
    socket.on('rtc:answer', onRtcAnswer);
    socket.on('rtc:ice-candidate', onRtcIceCandidate);
    socket.on('local:room:discovered', onLocalRoomDiscovered);

    return () => {
      socket.off('file:offered', onFileOffered);
      socket.off('file:requested', onFileRequested);
      socket.off('transfer:progress', onTransferProgress);
      socket.off('rtc:offer', onRtcOffer);
      socket.off('rtc:answer', onRtcAnswer);
      socket.off('rtc:ice-candidate', onRtcIceCandidate);
      socket.off('local:room:discovered', onLocalRoomDiscovered);
    };
  }, [socket]);

  // Local rooms discovery pruning interval
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setDiscoveredRooms(prev => prev.filter(r => now - r.lastSeen < 7000));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Reset state and generate URLs when room changes
  useEffect(() => {
    if (currentRoom) {
      setOfferedFiles([]);
      setMyOfferedFiles([]);
      setPendingRequests([]);
      closePc();
      receivingFileRef.current = null;
      receivedChunksRef.current = [];

      // Generate join URL and QR Code immediately using host IP for local rooms
      const origin = currentRoom.isLocal && currentRoom.hostIp
        ? `http://${currentRoom.hostIp}:5173`
        : window.location.origin;
      const url = `${origin}/join/${currentRoom.id}`;
      setShareUrl(url);
      generateQRCode(url);
      setFileShared(true);
    } else {
      setShareUrl('');
      setQrCodeUrl('');
      setFileShared(false);
    }
  }, [currentRoom]);

  // Generate QR code
  const generateQRCode = async (url) => {
    try {
      const qrCodeDataUrl = await QRCode.toDataURL(url);
      setQrCodeUrl(qrCodeDataUrl);
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  };

  // --- File Assembly & Decryption (Receiver) ---
  const assembleAndSaveFile = async () => {
    try {
      const file = receivingFileRef.current;
      const chunks = receivedChunksRef.current;
      
      // Calculate total size of chunks
      const totalLength = chunks.reduce((acc, c) => acc + c.byteLength, 0);
      const combinedBuffer = new Uint8Array(totalLength);
      
      let offset = 0;
      for (const chunk of chunks) {
        combinedBuffer.set(new Uint8Array(chunk), offset);
        offset += chunk.byteLength;
      }
      
      let finalBuffer = combinedBuffer.buffer;
      
      // 1. Decrypt
      setTransferStatus('Decrypting secure file end-to-end...');
      const iv = hexToBuf(file.iv);
      let key;
      const forceFallback = !crypto.subtle || file.encryptionType === 'fallback' || currentRoomRef.current?.isLocal;
      
      if (file.isPasswordProtected) {
        const salt = hexToBuf(file.salt);
        key = await deriveKeyFromPassword(receiverPasswordRef.current, salt, forceFallback);
      } else {
        const dummySalt = new Uint8Array(16);
        key = await deriveKeyFromPassword('fashshare-session-key-fallback-direct-webrtc-e2e', dummySalt, forceFallback);
      }
      
      try {
        finalBuffer = await decryptBuffer(finalBuffer, key, iv, forceFallback);
      } catch (err) {
        console.error('Decryption failed:', err);
        setTransferStatus('Error: Incorrect password or corrupted data. Decryption failed.');
        setTransferProgress(0);
        return;
      }
      
      // 2. Decompress (DecompressionStream)
      if (file.isCompressed) {
        setTransferStatus('Decompressing file contents...');
        try {
          finalBuffer = await decompressBuffer(finalBuffer);
        } catch (err) {
          console.error('Decompression failed:', err);
          setTransferStatus('Error: Decompression failed.');
          return;
        }
      }
      
      // 3. Verify SHA-256 Hash
      setTransferStatus('Verifying file integrity...');
      const receivedHash = await calculateHash(finalBuffer, forceFallback);
      if (receivedHash !== file.fileHash) {
        console.error('Hash mismatch! File integrity compromised.');
        setTransferStatus('Error: Integrity check failed (SHA-256 mismatch). The file may be corrupted.');
        return;
      }
      
      // 4. Download File
      setTransferStatus('Saving file...');

      // Chrome blocks blob: URL downloads over insecure HTTP (local mode).
      // Use a base64 data URI in that case – it is never blocked.
      const isSecureContext = window.isSecureContext;
      const blob = new Blob([finalBuffer]);
      const a = document.createElement('a');
      a.download = file.name || 'downloaded_file';
      a.style.display = 'none';
      document.body.appendChild(a);

      if (isSecureContext) {
        const blobUrl = URL.createObjectURL(blob);
        a.href = blobUrl;
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(blobUrl);
        }, 1000);
      } else {
        // Local HTTP (e.g. http://172.16.x.x) — convert to data URI
        const reader = new FileReader();
        reader.onload = () => {
          a.href = reader.result;
          a.click();
          setTimeout(() => {
            try { document.body.removeChild(a); } catch(e) {}
          }, 1000);
        };
        reader.readAsDataURL(blob);
      }

      setTransferProgress(100);
      setTransferStatus(`✅ Downloaded: ${file.name}`);
      setIsTransferring(false); // Hide progress bar immediately
      socketRef.current?.emit('transfer:complete', { fileId: file.id });
      console.log('Receiver successfully assembled and downloaded the file.');

      // Clean up chunk state immediately after download triggered
      receivedChunksRef.current = [];
      receivingFileRef.current = null;

      setTimeout(() => {
        setTransferProgress(0);
        setTransferStatus('');
        // Close peer connection after brief delay (let transfer_complete signal through)
        closePc();
      }, 2000);

    } catch (error) {
      console.error('Assemble file error:', error);
      setTransferStatus('Error during file assembly: ' + error.message);
    }
  };

  // --- User actions ---
  const handleUserJoin = (e) => {
    e.preventDefault();
    if (userName.trim() && connected) joinAsUser(userName.trim());
  };

  const handleCreateRoom = (e) => {
    e.preventDefault();
    if (roomName.trim()) {
      createRoom({
        name: roomName.trim(),
        expiresAfter: expiresAfter === '0' ? null : parseInt(expiresAfter),
        oneTimeDownload: oneTimeDownload,
        isLocal: sharingMode === 'local'
      });
    }
  };

  const handleManualJoin = (e) => {
    e.preventDefault();
    if (joinRoomId.trim()) {
      joinRoom(joinRoomId.trim());
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
      setShareUrl(''); setQrCodeUrl(''); setFileShared(false);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files?.[0]) {
      setSelectedFile(e.target.files[0]);
      setShareUrl(''); setQrCodeUrl(''); setFileShared(false);
    }
  };

  // Sender: Prepare & Share file
  const handleFileOffer = async () => {
    if (!selectedFile) { setTransferStatus('No file selected'); return; }
    if (!socket) { setTransferStatus('Not connected to server'); return; }
    if (!currentRoom?.id) { setTransferStatus('Room is not ready. Please try again.'); return; }

    setTransferStatus('Encrypting and compressing file...');
    setTransferProgress(10);
    
    try {
      const originalBuffer = await selectedFile.arrayBuffer();
      
      // 1. Determine if we must use fallback encryption (e.g. Local Mode rooms)
      const forceFallback = !crypto.subtle || currentRoom?.isLocal;

      // 2. Calculate Hash
      const fileHash = await calculateHash(originalBuffer, forceFallback);
      
      // 3. Compression check
      let finalBuffer = originalBuffer;
      let isCompressed = false;
      
      if (shouldCompress(selectedFile.name)) {
        const compressed = await compressBuffer(originalBuffer);
        if (compressed.byteLength < originalBuffer.byteLength * 0.95) {
          finalBuffer = compressed;
          isCompressed = true;
          console.log(`Adaptive Compression applied: ${(compressed.byteLength / 1024).toFixed(1)}KB (Original: ${(originalBuffer.byteLength / 1024).toFixed(1)}KB)`);
        } else {
          console.log('Compression skipped: size decrease was negligible');
        }
      }
      
      // 4. Encrypt Buffer
      let salt = null;
      let key;
      const iv = crypto.getRandomValues(new Uint8Array(12));
      let authToken = null;
      let authIv = null;
      
      if (isPasswordProtected && password) {
        salt = crypto.getRandomValues(new Uint8Array(16));
        key = await deriveKeyFromPassword(password, salt, forceFallback);
        
        // Encrypt the static validation string to create a password verifier
        authIv = crypto.getRandomValues(new Uint8Array(12));
        const verifierBuffer = new TextEncoder().encode('fashshare-auth-verification-token');
        const encryptedVerifier = await encryptBuffer(verifierBuffer.buffer, key, authIv, forceFallback);
        authToken = bufToHex(encryptedVerifier);
      } else {
        const dummySalt = new Uint8Array(16);
        key = await deriveKeyFromPassword('fashshare-session-key-fallback-direct-webrtc-e2e', dummySalt, forceFallback);
      }
      
      const encryptedBuffer = await encryptBuffer(finalBuffer, key, iv, forceFallback);
      senderBufferRef.current = encryptedBuffer;

      const fileId = Date.now().toString();
      
      // Store locally
      setMyOfferedFiles(prev => [...prev, {
        id: fileId,
        file: selectedFile,
        name: selectedFile.name,
        size: selectedFile.size
      }]);
      
      // Emit details
      const offerPayload = {
        roomId: currentRoom.id,
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        fileId,
        isPasswordProtected: isPasswordProtected && !!password,
        salt: salt ? bufToHex(salt) : null,
        iv: bufToHex(iv),
        isCompressed,
        fileHash,
        oneTimeDownload,
        encryptionType: forceFallback ? 'fallback' : 'aes-gcm',
        authToken,
        authIv: authIv ? bufToHex(authIv) : null
      };
      
      socket.emit('file:offer', offerPayload);
      
      setTransferProgress(100);
      setTransferStatus(`File ready for sharing: ${selectedFile.name}`);
      const origin = currentRoom.isLocal && currentRoom.hostIp
        ? `http://${currentRoom.hostIp}:5173`
        : window.location.origin;
      const url = `${origin}/join/${currentRoom.id}`;
      setShareUrl(url);
      generateQRCode(url);
      setFileShared(true);
      
    } catch (err) {
      console.error('File encryption / preparation failed:', err);
      setTransferStatus('Failed to prepare and encrypt file: ' + err.message);
      setTransferProgress(0);
    }
  };

  // Receiver: Click Download
  const handleFileRequest = (fileId, senderId) => {
    if (!socket) return;
    const file = offeredFiles.find(f => f.id === fileId);
    if (!file) return;
    
    if (file.isPasswordProtected) {
      setSelectedFileToDownload(file);
      setReceiverPassword('');
      setShowPasswordPrompt(true);
    } else {
      startDownloadRequest(file);
    }
  };

  const startDownloadRequest = (file) => {
    receivedChunksRef.current = [];
    receivingFileRef.current = file;
    socket.emit('file:request', { fileId: file.id, candidateId: socket.id });
    setTransferStatus(`Requesting connection to sender for ${file.name}...`);
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!receiverPassword.trim()) return;
    
    const file = selectedFileToDownload;
    if (!file) return;

    setPasswordError('');

    // --- Pre-verify password BEFORE sending the download request ---
    if (file.authToken && file.authIv && file.salt) {
      try {
        const forceFallback = !crypto.subtle || file.encryptionType === 'fallback' || currentRoomRef.current?.isLocal;
        const salt = hexToBuf(file.salt);
        const testKey = await deriveKeyFromPassword(receiverPassword, salt, forceFallback);
        const authIvBuf = hexToBuf(file.authIv);
        const encryptedTokenBuf = hexToBuf(file.authToken);
        
        let decrypted;
        try {
          decrypted = await decryptBuffer(encryptedTokenBuf, testKey, authIvBuf, forceFallback);
        } catch {
          setPasswordError('Incorrect password. Please try again.');
          setReceiverPassword('');
          return;
        }
        
        const decoded = new TextDecoder().decode(decrypted);
        if (decoded !== 'fashshare-auth-verification-token') {
          setPasswordError('Incorrect password. Please try again.');
          setReceiverPassword('');
          return;
        }
      } catch (err) {
        console.error('Password pre-verification error:', err);
        setPasswordError('Incorrect password. Please try again.');
        setReceiverPassword('');
        return;
      }
    }

    setPasswordError('');
    setShowPasswordPrompt(false);
    startDownloadRequest(file);
  };

  // Sender: accept a download request
  const handleAcceptRequest = async (request) => {
    const myFile = myOfferedFiles.find(f => f.id === request.fileId);
    if (!myFile) { setTransferStatus('File not found in your offered files'); return; }

    setPendingRequests(prev => prev.filter(r => !(r.fileId === request.fileId && r.requesterId === request.requesterId)));

    console.log('Creating native RTCPeerConnection as initiator for', request.requesterName);
    closePc();

    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socket.emit('rtc:ice-candidate', { target: request.requesterId, candidate: e.candidate });
      }
    };

    // Create data channel
    const dc = pc.createDataChannel('fileTransfer', { ordered: true });
    dcRef.current = dc;
    dc.binaryType = 'arraybuffer';

    dc.onopen = () => {
      console.log('Data channel open – sending file metadata');
      setTransferStatus('Connected – exchanging protocol meta…');
      
      const buffer = senderBufferRef.current;
      if (buffer) {
        const totalChunks = Math.ceil(buffer.byteLength / CHUNK_SIZE);
        console.log(`Sending meta to receiver: fileId=${request.fileId}, totalChunks=${totalChunks}`);
        dc.send(JSON.stringify({
          type: 'meta',
          fileId: request.fileId,
          totalChunks
        }));
      } else {
        console.error('No prepared encrypted buffer found to send in onopen');
      }
    };

    dc.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        if (msg.type === 'ready') {
          console.log(`Receiver is ready! Starting chunk send from index: ${msg.nextChunkIndex}`);
          setTransferStatus('Sending file chunks...');
          sendFileChunks(dc, msg.nextChunkIndex, request.fileId);
        }
        if (msg.type === 'resend_chunks') {
          console.log('Receiver requested resend of chunks:', msg.indices);
          resendChunks(dc, msg.indices);
        }
        if (msg.type === 'transfer_complete') {
          console.log('Receiver successfully assembled and downloaded the file.');
          setTransferStatus('File transferred successfully!');
          setTransferProgress(100);
          closePc();
          setTimeout(() => {
            setTransferStatus('');
            setTransferProgress(0);
          }, 2000);
        }
        if (msg.type === 'pause') {
          console.log('Pause requested by remote peer');
          isPausedRef.current = true;
          setIsPaused(true);
          pauseTimeRef.current = Date.now();
        }
        if (msg.type === 'resume') {
          console.log('Resume requested by remote peer');
          isPausedRef.current = false;
          setIsPaused(false);
          if (pauseTimeRef.current && startTimeRef.current) {
            const pauseDuration = Date.now() - pauseTimeRef.current;
            startTimeRef.current += pauseDuration;
          }
        }
      } catch (err) {
        console.error('Error parsing client ready state:', err);
      }
    };

    dc.onerror = (err) => {
      if (dcRef.current !== dc) return;
      const errorMsg = err?.error?.message || err?.message || '';
      if (errorMsg.includes('Close called') || errorMsg.includes('User-Initiated Abort')) {
        console.log('Data channel closed cleanly by user cancellation.');
      } else {
        console.error('Data channel error:', err);
        setTransferStatus('Transfer error');
      }
      closePc();
    };

    dc.onclose = () => {
      if (dcRef.current !== dc) return;
      console.log('Data channel closed');
      setTransferStatus('Connection closed');
      closePc();
    };

    // Create and send the offer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit('rtc:offer', { target: request.requesterId, sdp: pc.localDescription });
    setTransferStatus('Waiting for receiver to accept WebRTC connection…');
  };

  const sendFileChunks = async (dc, startIndex, fileId) => {
    const buffer = senderBufferRef.current;
    if (!buffer) {
      console.error('No prepared encrypted buffer found to send');
      return;
    }
    
    setIsTransferring(true);
    startTimeRef.current = Date.now();
    
    const totalChunks = Math.ceil(buffer.byteLength / CHUNK_SIZE);
    
    const LOW_WATER = 256 * 1024; // 256KB
    const waitForDrain = () => new Promise(resolve => {
      if (dc.bufferedAmount <= LOW_WATER) { resolve(); return; }
      const check = () => {
        if (dc.readyState !== 'open') { resolve(); return; }
        if (dc.bufferedAmount <= LOW_WATER) { resolve(); }
        else { setTimeout(check, 50); }
      };
      setTimeout(check, 50);
    });

    for (let index = startIndex; index < totalChunks; index++) {
      while (isPausedRef.current) {
        if (dc.readyState !== 'open') return;
        await new Promise(resolve => setTimeout(resolve, 100));
        if (startTimeRef.current) {
          startTimeRef.current += 100;
        }
      }

      if (dc.readyState !== 'open') {
        console.warn('Channel closed during send loop');
        return;
      }
      
      await waitForDrain();
      if (dc.readyState !== 'open') return;
      
      const offset = index * CHUNK_SIZE;
      const size = Math.min(CHUNK_SIZE, buffer.byteLength - offset);
      const chunkData = buffer.slice(offset, offset + size);
      
      const messageBuffer = new ArrayBuffer(8 + chunkData.byteLength);
      const view = new DataView(messageBuffer);
      view.setUint32(0, index);
      view.setUint32(4, totalChunks);
      
      const payload = new Uint8Array(messageBuffer);
      payload.set(new Uint8Array(chunkData), 8);
      
      dc.send(messageBuffer);
      
      // Calculate & update speed/stats
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      if (elapsed > 0.1 && index % 5 === 0) {
        const bytesSent = (index - startIndex) * CHUNK_SIZE;
        const speedBytes = bytesSent / elapsed;
        
        let speedStr = '';
        if (speedBytes > 1024 * 1024) {
          speedStr = `${(speedBytes / (1024 * 1024)).toFixed(2)} MB/s`;
        } else {
          speedStr = `${(speedBytes / 1024).toFixed(1)} KB/s`;
        }
        setTransferSpeed(speedStr);
        setTimeElapsed(`${Math.round(elapsed)}s elapsed`);
        
        if (speedBytes > 0) {
          const remainingBytes = (totalChunks - index) * CHUNK_SIZE;
          const remSecs = Math.round(remainingBytes / speedBytes);
          setTimeRemaining(`${remSecs}s remaining`);
        }
      }

      const progress = Math.round((index / totalChunks) * 100);
      setTransferProgress(prev => prev !== progress ? progress : prev);
      
      if (progress % 5 === 0 && index % 10 === 0) {
        socketRef.current?.emit('transfer:progress', { fileId, progress, direction: 'upload' });
      }
      
      if (index % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
    
    // Send check_complete packet
    if (dc.readyState === 'open') {
      console.log('Finished sending all contiguous chunks, sending check_complete...');
      dc.send(JSON.stringify({ type: 'check_complete' }));
    }
  };

  // Resend specific chunk indices asked by receiver
  const resendChunks = async (dc, indices) => {
    const buffer = senderBufferRef.current;
    if (!buffer) return;
    
    const totalChunks = Math.ceil(buffer.byteLength / CHUNK_SIZE);
    
    for (const index of indices) {
      if (dc.readyState !== 'open') return;
      
      const offset = index * CHUNK_SIZE;
      const size = Math.min(CHUNK_SIZE, buffer.byteLength - offset);
      const chunkData = buffer.slice(offset, offset + size);
      
      const messageBuffer = new ArrayBuffer(8 + chunkData.byteLength);
      const view = new DataView(messageBuffer);
      view.setUint32(0, index);
      view.setUint32(4, totalChunks);
      
      const payload = new Uint8Array(messageBuffer);
      payload.set(new Uint8Array(chunkData), 8);
      
      dc.send(messageBuffer);
      await new Promise(resolve => setTimeout(resolve, 10)); // tiny gap
    }
    
    // Send check_complete again
    if (dc.readyState === 'open') {
      dc.send(JSON.stringify({ type: 'check_complete' }));
    }
  };

  // Sender: reject a download request
  const handleRejectRequest = (request) => {
    setPendingRequests(prev => prev.filter(r => !(r.fileId === request.fileId && r.requesterId === request.requesterId)));
    setTransferStatus(`Rejected request from ${request.requesterName}`);
  };

  // Copy share URL
  const copyShareUrl = () => {
    if (!shareUrl) return;
    navigator.clipboard?.writeText(shareUrl).catch(() => {
      const tmp = document.createElement('input');
      tmp.value = shareUrl;
      document.body.appendChild(tmp);
      tmp.select();
      document.execCommand('copy');
      document.body.removeChild(tmp);
    });
    setTransferStatus('Share URL copied to clipboard!');
  };

  // Loading screen
  if (!connected) {
    return (
      <div className={`min-h-screen ${theme.background} flex items-center justify-center`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
          <p className={`${theme.text} text-lg`}>Connecting to ZepShare...</p>
        </div>
      </div>
    );
  }

  if (showUserForm) {
    return (
      <div className={`min-h-screen ${theme.background} flex items-center justify-center`}>
        <div className={`${theme.card} border rounded-xl p-8 max-w-md w-full mx-4 shadow-2xl`}>
          <h2 className={`text-2xl font-bold ${theme.text} mb-6 text-center flex items-center justify-center gap-2`}>
            <Sparkles className="text-blue-500" /> ZepShare
          </h2>
          <form onSubmit={handleUserJoin} className="space-y-4">
            <div>
              <label className={`block text-sm font-medium ${theme.text} mb-2`}>Your Name</label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className={`w-full px-4 py-3 rounded-lg border ${theme.card} ${theme.text} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                placeholder="Enter your name"
                required
              />
            </div>
            <button
              type="submit"
              className={`w-full ${theme.primary} ${theme.text} py-3 px-6 rounded-lg font-semibold ${theme.hover}`}
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
      <div className={`min-h-screen ${theme.background} flex items-center justify-center pt-24 pb-12`}>
        <div className={`${theme.card} border rounded-xl p-8 max-w-lg w-full mx-4 shadow-2xl space-y-6 bg-slate-900/40 backdrop-blur-md`}>
          
          {/* Tabs for Sharing Mode Selection */}
          <div className="flex bg-black/40 p-1.5 rounded-xl border border-white/5">
            <button
              onClick={() => setSharingMode('internet')}
              className={`flex-1 py-3 px-4 rounded-lg font-bold flex items-center justify-center space-x-2 transition-all text-sm ${
                sharingMode === 'internet'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Globe className="h-4 w-4" />
              <span>Internet Mode</span>
            </button>
            <button
              onClick={() => setSharingMode('local')}
              className={`flex-1 py-3 px-4 rounded-lg font-bold flex items-center justify-center space-x-2 transition-all text-sm ${
                sharingMode === 'local'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Wifi className="h-4 w-4" />
              <span>Local Mode</span>
            </button>
          </div>

          <div className="space-y-6">
            {/* Create Room Section */}
            <div className="space-y-4">
              <h3 className={`text-lg font-bold ${theme.text} flex items-center gap-2`}>
                <Plus className="h-5 w-5 text-blue-500" />
                <span>{sharingMode === 'local' ? 'Start Local Room Manager' : 'Create a Secure Room'}</span>
              </h3>
              
              <form onSubmit={handleCreateRoom} className="space-y-4">
                <div>
                  <label className={`block text-xs font-semibold ${theme.textSecondary} mb-2 uppercase tracking-wider`}>Room Name</label>
                  <input
                    type="text"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    className={`w-full px-4 py-3 rounded-lg border ${theme.card} ${theme.text} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    placeholder="e.g. My Workspace Share"
                    required
                  />
                </div>

                {sharingMode === 'internet' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-xs font-semibold ${theme.textSecondary} mb-2 uppercase tracking-wider flex items-center gap-1`}>
                        <Clock className="h-4 w-4 text-blue-500" /> Link Expiry
                      </label>
                      <select
                        value={expiresAfter}
                        onChange={(e) => setExpiresAfter(e.target.value)}
                        className={`w-full px-3 py-2.5 rounded-lg border ${theme.card} ${theme.text} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                      >
                        <option value="0">Never</option>
                        <option value="5">5 Minutes</option>
                        <option value="10">10 Minutes</option>
                        <option value="60">1 Hour</option>
                      </select>
                    </div>
                    <div className="flex flex-col justify-end">
                      <label className={`flex items-center gap-2 cursor-pointer text-sm font-medium ${theme.text} mb-3`}>
                        <input
                          type="checkbox"
                          checked={oneTimeDownload}
                          onChange={(e) => setOneTimeDownload(e.target.checked)}
                          className="h-4 w-4 text-blue-500 border-gray-300 rounded focus:ring-blue-500"
                        />
                        One-time Room
                      </label>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  className={`w-full ${sharingMode === 'local' ? 'bg-purple-600 hover:bg-purple-700 text-white' : `${theme.primary} ${theme.hover} ${theme.text}`} py-3 px-6 rounded-lg font-bold flex items-center justify-center space-x-2 shadow-lg transition-all transform active:scale-95`}
                >
                  {sharingMode === 'local' ? (
                    <>
                      <Wifi className="h-5 w-5 animate-pulse" />
                      <span>Start Advertising local room</span>
                    </>
                  ) : (
                    <>
                      <Globe className="h-5 w-5" />
                      <span>Create room</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Separator */}
            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-gray-700/50"></div>
              <span className="flex-shrink mx-4 text-gray-500 text-xs font-bold uppercase tracking-wider">or</span>
              <div className="flex-grow border-t border-gray-700/50"></div>
            </div>

            {/* Interactive Join Section */}
            {sharingMode === 'internet' ? (
              <div className="space-y-4">
                <h3 className={`text-lg font-bold ${theme.text} flex items-center gap-2`}>
                  <Link className="h-5 w-5 text-indigo-500" />
                  <span>Join Room via Code</span>
                </h3>
                <form onSubmit={handleManualJoin} className="flex space-x-2">
                  <input
                    type="text"
                    value={joinRoomId}
                    onChange={(e) => setJoinRoomId(e.target.value)}
                    placeholder="Enter Room Code (UUID)"
                    required
                    className={`flex-1 px-4 py-3 rounded-lg border ${theme.card} ${theme.text} focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm`}
                  />
                  <button
                    type="submit"
                    className={`px-5 py-3 ${theme.primary} ${theme.text} rounded-lg font-bold ${theme.hover} transition-all transform active:scale-95 text-sm flex items-center space-x-1`}
                  >
                    <Search className="h-4 w-4" />
                    <span>Join</span>
                  </button>
                </form>
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className={`text-lg font-bold ${theme.text} flex items-center gap-2`}>
                  <Wifi className="h-5 w-5 text-purple-500 animate-pulse" />
                  <span>Discovered Nearby Rooms</span>
                </h3>
                
                {discoveredRooms.length === 0 ? (
                  <div className="p-6 border border-dashed border-gray-700 rounded-xl text-center bg-black/20">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500 mx-auto mb-3" />
                    <p className={`${theme.textSecondary} text-sm font-semibold`}>Scanning local network for rooms...</p>
                    <p className="text-gray-500 text-xs mt-1">Make sure you are connected to the same Wi-Fi</p>
                  </div>
                ) : (
                  <div className="space-y-3.5 max-h-48 overflow-y-auto pr-1">
                    {discoveredRooms.map((room) => (
                      <div
                        key={room.roomId}
                        className="p-4 bg-black/40 border border-white/5 hover:border-purple-500/30 rounded-xl flex items-center justify-between transition-all"
                      >
                        <div className="space-y-1">
                          <p className={`font-bold text-sm ${theme.text}`}>{room.roomName}</p>
                          <p className="text-gray-400 text-xs flex items-center gap-1">
                            <span>👤 Host:</span>
                            <span className="text-white font-medium">{room.hostName}</span>
                            <span className="text-gray-600">•</span>
                            <span className="font-mono text-purple-400">{room.ip}</span>
                          </p>
                        </div>
                        <button
                          onClick={() => joinLocalRoom(room.roomId, room.ip, room.port)}
                          className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-4 py-2 rounded-lg shadow-md transition-all transform active:scale-95"
                        >
                          Join
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      </div>
    );
  }

  // Main secure sharing interface
  return (
    <div className={`min-h-screen ${theme.background} pt-24 pb-12`}>
      {/* Password Prompt modal */}
      {showPasswordPrompt && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`${theme.card} border rounded-xl p-8 max-w-md w-full shadow-2xl relative space-y-4`}>
            <button
              onClick={() => setShowPasswordPrompt(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className={`text-xl font-bold ${theme.text} flex items-center gap-2`}>
              <Shield className="text-red-500 h-5 w-5" /> Password Required
            </h3>
            <p className={`${theme.textSecondary} text-sm`}>
              This file is protected with end-to-end encryption. Please enter the password to derive the decryption key.
            </p>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <input
                type="password"
                value={receiverPassword}
                onChange={(e) => { setReceiverPassword(e.target.value); setPasswordError(''); }}
                className={`w-full px-4 py-3 rounded-lg border ${passwordError ? 'border-red-500 ring-2 ring-red-500/40' : ''} ${theme.card} ${theme.text} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                placeholder="Enter password"
                required
                autoFocus
              />
              {passwordError && (
                <p className="text-red-400 text-sm font-medium flex items-center gap-1.5">
                  <Shield className="h-4 w-4 flex-shrink-0" />
                  {passwordError}
                </p>
              )}
              <button
                type="submit"
                className={`w-full ${theme.primary} ${theme.text} py-3 rounded-lg font-semibold ${theme.hover}`}
              >
                Decrypt & Connect
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Upload, Available Files, and Pending Requests */}
          <div className="lg:col-span-2 space-y-6">
            {/* Sender Section */}
            <div className={`${theme.card} border rounded-xl p-8 shadow-md`}>
              <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
                <h2 className={`text-2xl font-bold ${theme.text} flex items-center gap-2`}>
                  <Sparkles className="text-blue-500 h-6 w-6" /> E2E Encrypted File Share
                </h2>
                {currentRoom && (
                  <span className={`text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm border ${
                    currentRoom.isLocal 
                      ? 'bg-purple-500/10 text-purple-400 border-purple-500/30 shadow-purple-950/20' 
                      : 'bg-blue-500/10 text-blue-400 border-blue-500/30 shadow-blue-950/20'
                  }`}>
                    {currentRoom.isLocal ? (
                      <>
                        <Wifi className="h-3.5 w-3.5 animate-pulse" /> Local LAN Mode
                      </>
                    ) : (
                      <>
                        <Globe className="h-3.5 w-3.5" /> Internet Mode
                      </>
                    )}
                  </span>
                )}
              </div>
              
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-300 ${
                  dragActive ? `border-blue-500 bg-blue-50 ${theme.primary}` : `border-gray-300 ${theme.hover}`
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <Upload className={`h-12 w-12 ${theme.textSecondary} mx-auto mb-4`} />
                <p className={`${theme.text} text-lg mb-2`}>Drag and drop your file here</p>
                <p className={`${theme.textSecondary} mb-4`}>or click to select a file</p>
                <input ref={fileInputRef} type="file" onChange={handleFileSelect} className="hidden" />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className={`${theme.primary} ${theme.text} px-6 py-2 rounded-lg font-semibold ${theme.hover}`}
                >
                  Select File
                </button>
              </div>

              {/* Encryption & Password Options */}
              {selectedFile && (
                <div className={`mt-6 p-6 ${theme.secondary} rounded-lg space-y-4`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`${theme.text} font-semibold`}>{selectedFile.name}</p>
                      <p className={`${theme.textSecondary} text-sm`}>
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <button
                      onClick={() => { setSelectedFile(null); setShareUrl(''); setQrCodeUrl(''); setFileShared(false); }}
                      className={`${theme.card} border ${theme.textSecondary} p-2 rounded-lg ${theme.hover}`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="border-t border-gray-700/50 pt-4 space-y-3">
                    <label className={`flex items-center gap-2 cursor-pointer text-sm font-semibold ${theme.text}`}>
                      <input
                        type="checkbox"
                        checked={isPasswordProtected}
                        onChange={(e) => setIsPasswordProtected(e.target.checked)}
                        className="h-4 w-4 text-blue-500 border-gray-300 rounded focus:ring-blue-500"
                      />
                      Add Password Security (E2E Decryption Key)
                    </label>

                    {isPasswordProtected && (
                      <div className="relative">
                        <Key className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Set file decryption password"
                          className={`w-full pl-9 pr-4 py-2 rounded-lg border ${theme.card} ${theme.text} text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                        />
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleFileOffer}
                    className={`w-full ${theme.primary} ${theme.text} py-2.5 rounded-lg font-semibold ${theme.hover} flex items-center justify-center space-x-2`}
                  >
                    <Send className="h-4 w-4" />
                    <span>Secure & Share File</span>
                  </button>
                </div>
              )}
            </div>

            {/* Receiver Section: Available Files (from others) */}
            {offeredFiles.filter(file => file.senderId !== socket?.id).length > 0 && (
              <div className={`${theme.card} border rounded-xl p-8 shadow-md`}>
                <h2 className={`text-2xl font-bold ${theme.text} mb-6`}>Available Secure Downloads</h2>
                <div className="space-y-4">
                  {offeredFiles.filter(file => file.senderId !== socket?.id).map(file => (
                    <div key={file.id} className={`p-4 ${theme.secondary} rounded-lg flex items-center justify-between`}>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className={`${theme.text} font-semibold`}>{file.name}</p>
                          {file.isPasswordProtected && (
                            <span className="bg-red-500/20 text-red-400 text-xs px-2 py-0.5 rounded-full flex items-center gap-1 font-medium">
                              <Shield className="h-3 w-3" /> Password Protected
                            </span>
                          )}
                        </div>
                        <p className={`${theme.textSecondary} text-sm`}>
                          {(file.size / 1024 / 1024).toFixed(2)} MB · from {file.senderName}
                        </p>
                      </div>
                      <button
                        onClick={() => handleFileRequest(file.id, file.senderId)}
                        className={`${theme.primary} ${theme.text} px-4 py-2 rounded-lg font-semibold ${theme.hover} flex items-center space-x-2`}
                      >
                        <Download className="h-4 w-4" />
                        <span>Download</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pending Requests (only visible to sender) */}
            {pendingRequests.length > 0 && (
              <div className={`${theme.card} border rounded-xl p-8 shadow-md`}>
                <h2 className={`text-2xl font-bold ${theme.text} mb-6`}>Pending Download Requests</h2>
                <div className="space-y-4">
                  {pendingRequests.map((req, idx) => (
                    <div key={idx} className={`p-4 ${theme.secondary} rounded-lg flex items-center justify-between`}>
                      <div>
                        <p className={`${theme.text} font-semibold`}>
                          {req.requesterName} wants to download a file
                        </p>
                        <p className={`${theme.textSecondary} text-sm`}>
                          {myOfferedFiles.find(f => f.id === req.fileId)?.name || req.fileId}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleAcceptRequest(req)}
                          className="bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 flex items-center space-x-2"
                        >
                          <Check className="h-4 w-4" />
                          <span>Accept</span>
                        </button>
                        <button
                          onClick={() => handleRejectRequest(req)}
                          className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700 flex items-center space-x-2"
                        >
                          <XCircle className="h-4 w-4" />
                          <span>Reject</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Transfer Progress & Status — only visible while a transfer is actually in progress */}
            {isTransferring && (
              <div className="mt-6 p-6 rounded-2xl bg-gradient-to-br from-indigo-950/80 via-slate-900/90 to-purple-950/80 border border-indigo-500/30 backdrop-blur-xl shadow-2xl relative overflow-hidden">
                {/* Glow decorations */}
                <div className="absolute -top-12 -left-12 w-24 h-24 bg-indigo-500/20 rounded-full blur-2xl" />
                <div className="absolute -bottom-12 -right-12 w-24 h-24 bg-purple-500/20 rounded-full blur-2xl" />

                <div className="flex justify-between items-center text-sm mb-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
                    <span className="font-semibold text-indigo-200 tracking-wide uppercase text-xs">E2E Secure Link</span>
                  </div>
                  <span className="font-mono text-lg font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-300">
                    {transferProgress}%
                  </span>
                </div>
                
                {/* Glowing thin luxury progress bar */}
                <div className="w-full bg-slate-950/60 rounded-full h-1.5 mb-5 overflow-hidden border border-white/5 shadow-inner">
                  <div
                    className="bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-600 h-1.5 rounded-full transition-all duration-300 relative"
                    style={{ width: `${transferProgress}%` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-pulse" />
                  </div>
                </div>

                {/* Inline Luxury Metrics */}
                <div className="flex flex-wrap items-center justify-between gap-y-2 text-xs text-slate-300 py-3 px-4 rounded-xl bg-black/45 border border-white/5 shadow-inner mb-5 font-medium">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-cyan-400">⚡</span>
                    <span>Speed: <strong className="text-white font-semibold">{transferSpeed || 'Connecting...'}</strong></span>
                  </div>
                  <div className="w-[1px] h-3 bg-white/10 hidden sm:block" />
                  <div className="flex items-center space-x-1.5">
                    <span className="text-indigo-400">⏱️</span>
                    <span>Elapsed: <strong className="text-white font-semibold">{timeElapsed || '0s'}</strong></span>
                  </div>
                  <div className="w-[1px] h-3 bg-white/10 hidden sm:block" />
                  <div className="flex items-center space-x-1.5">
                    <span className="text-purple-400">⏳</span>
                    <span>Time Left: <strong className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-cyan-300 font-bold">{timeRemaining || 'Estimating...'}</strong></span>
                  </div>
                </div>

                {/* Control Actions */}
                {transferProgress < 100 && (
                  <div className="flex space-x-3 justify-center">
                    <button
                      onClick={handlePauseToggle}
                      className={`px-5 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all shadow-md transform active:scale-95 ${
                        isPaused 
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-950/20' 
                          : 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-950/20'
                      }`}
                    >
                      {isPaused ? (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          <span>Resume Link</span>
                        </>
                      ) : (
                        <>
                          <X className="h-3.5 w-3.5" />
                          <span>Pause Link</span>
                        </>
                      )}
                    </button>
                    
                    <button
                      onClick={closePc}
                      className="px-5 py-2 bg-rose-600/90 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center space-x-2 transition-all shadow-md shadow-rose-950/20 transform active:scale-95"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      <span>Disconnect</span>
                    </button>
                  </div>
                )}
              </div>
            )}
            {transferStatus && (
              <div className={`mt-4 p-3 ${theme.secondary} rounded-lg`}>
                <p className={`${theme.text} text-sm`}>{transferStatus}</p>
              </div>
            )}
          </div>

          {/* Right Column: Room Info, QR, Share Link */}
          <div className="space-y-6">
            <div className={`${theme.card} border rounded-xl p-6 shadow-md`}>
              <h3 className={`text-xl font-bold ${theme.text} mb-4`}>Room Information</h3>
              {currentRoom && (
                <div className="space-y-3">
                  <div>
                    <p className={`${theme.textSecondary} text-sm`}>Room Name</p>
                    <p className={`${theme.text} font-semibold`}>{currentRoom.name}</p>
                  </div>
                  <div>
                    <p className={`${theme.textSecondary} text-sm`}>Room ID</p>
                    <p className={`${theme.text} font-mono text-sm break-all`}>{currentRoom.id}</p>
                  </div>
                  <div>
                    <p className={`${theme.textSecondary} text-sm`}>Sharing Mode</p>
                    <p className={`font-semibold text-sm ${currentRoom.isLocal ? 'text-purple-400' : 'text-blue-400'}`}>
                      {currentRoom.isLocal ? '🏠 Local Network (LAN)' : '🌐 Internet (Global)'}
                    </p>
                  </div>
                  {currentRoom.expiresAt && (
                    <div>
                      <p className={`${theme.textSecondary} text-sm`}>Expires At</p>
                      <p className="text-amber-500 font-semibold text-sm">
                        {new Date(currentRoom.expiresAt).toLocaleTimeString()}
                      </p>
                    </div>
                  )}
                  {currentRoom.oneTimeDownload && (
                    <div className="bg-blue-500/10 text-blue-400 text-xs px-2.5 py-1.5 rounded-lg font-medium inline-block">
                      One-Time Download Active
                    </div>
                  )}
                  <div className="flex items-center space-x-2 pt-2 border-t border-gray-700/50">
                    <Users className="h-4 w-4 text-gray-500" />
                    <span className={`${theme.textSecondary} text-sm`}>{roomUsers.length} connected</span>
                  </div>
                </div>
              )}
            </div>

            {fileShared && qrCodeUrl && (
              <div className={`${theme.card} border rounded-xl p-6 text-center shadow-md`}>
                <h3 className={`text-xl font-bold ${theme.text} mb-4`}>QR Code</h3>
                <div className="bg-white p-4 rounded-lg inline-block">
                  <img src={qrCodeUrl} alt="QR Code" className="w-32 h-32" />
                </div>
                <p className={`${theme.textSecondary} text-sm mt-2`}>Scan to join this secure room</p>
              </div>
            )}

            {fileShared && shareUrl && (
              <div className={`${theme.card} border rounded-xl p-6 shadow-md`}>
                <h3 className={`text-xl font-bold ${theme.text} mb-4`}>Share Link</h3>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={shareUrl}
                    readOnly
                    className={`flex-1 px-3 py-2 rounded-lg border ${theme.card} ${theme.text} text-sm`}
                  />
                  <button
                    onClick={copyShareUrl}
                    className={`${theme.primary} ${theme.text} px-4 py-2 rounded-lg ${theme.hover}`}
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