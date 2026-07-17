import { v4 as uuidv4 } from 'uuid';
import { 
  createTransfer, 
  addReceiverToTransfer, 
  getTransfer,
  removeReceiverFromTransfer 
} from '../stores/transfers.js';
import { getUser } from '../stores/users.js';
import { addOfferToRoom, removeOfferFromRoom } from '../stores/rooms.js';

export const handleFileOffer = (socket, data) => {
  const { roomId, fileName, fileSize, fileId = uuidv4() } = data;
  const transfer = createTransfer(
    fileId,
    fileName,
    fileSize,
    socket.id,
    roomId,
    data.oneTimeDownload || false
  );
  
  // Store the offer metadata in the room
  const offer = {
    fileId,
    fileName,
    fileSize,
    senderId: socket.id,
    senderName: getUser(socket.id)?.name,
    timestamp: Date.now(),
    // Enhancement metadata
    isPasswordProtected: data.isPasswordProtected || false,
    isCompressed: data.isCompressed || false,
    compressionAlgorithm: data.compressionAlgorithm || null,
    fileHash: data.fileHash || null,
    salt: data.salt || null,
    iv: data.iv || null,
    expiresAt: data.expiresAt || null,
    oneTimeDownload: data.oneTimeDownload || false,
    encryptionType: data.encryptionType || null,
    authToken: data.authToken || null,
    authIv: data.authIv || null
  };
  
  addOfferToRoom(roomId, offer);
  
  return offer;
};

export const handleFileRequest = (socket, data) => {
  const { fileId, candidateId } = data;
  const transfer = getTransfer(fileId);
  
  if (transfer) {
    addReceiverToTransfer(fileId, socket.id);
    return {
      fileId,
      requesterId: socket.id,
      candidateId,
      requesterName: getUser(socket.id)?.name,
      senderId: transfer.senderId
    };
  }
  return null;
};

export const handleTransferProgress = (socket, data) => {
  const { fileId, progress, direction } = data;
  const transfer = getTransfer(fileId);
  
  if (transfer) {
    return {
      fileId,
      progress,
      receiverId: socket.id,
      direction
    };
  }
  return null;
};

export const handleTransferComplete = (socket, fileId) => {
  const transfer = getTransfer(fileId);
  if (!transfer) return null;

  removeReceiverFromTransfer(fileId, socket.id);
  
  // If no more receivers, cleanup room offer
  const remaining = getTransfer(fileId);
  if (!remaining) {
    removeOfferFromRoom(transfer.roomId, fileId);
  }

  return {
    fileId,
    receiverId: socket.id,
    roomId: transfer.roomId,
    senderId: transfer.senderId
  };
};