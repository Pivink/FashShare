import { createTransfer, addReceiverToTransfer, getTransfer } from '../stores/transfers.js';
import { getUser } from '../stores/users.js';

export const handleFileOffer = (socket, data) => {
  const { roomId, fileName, fileSize, fileId = uuidv4() } = data;
  const transfer = createTransfer(
    fileId,
    fileName,
    fileSize,
    socket.id,
    roomId
  );
  
  return {
    fileId,
    fileName,
    fileSize,
    senderId: socket.id,
    senderName: getUser(socket.id)?.name
  };
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
      requesterName: getUser(socket.id)?.name
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
  removeReceiverFromTransfer(fileId, socket.id);
  return {
    fileId,
    receiverId: socket.id
  };
};