const activeTransfers = new Map();

export const createTransfer = (fileId, fileName, fileSize, senderId, roomId, oneTimeDownload = false) => {
  const transfer = {
    id: fileId,
    fileName,
    fileSize,
    senderId,
    roomId,
    oneTimeDownload,
    timestamp: Date.now(),
    status: 'offered',
    receivers: new Set()
  };
  activeTransfers.set(fileId, transfer);
  return transfer;
};

export const getTransfer = (fileId) => activeTransfers.get(fileId);

export const addReceiverToTransfer = (fileId, receiverId) => {
  const transfer = activeTransfers.get(fileId);
  if (transfer) {
    transfer.receivers.add(receiverId);
    transfer.status = 'requested';
  }
};

export const removeReceiverFromTransfer = (fileId, receiverId) => {
  const transfer = activeTransfers.get(fileId);
  if (transfer) {
    transfer.receivers.delete(receiverId);
    
    // Cleanup ONLY if it's a one-time download
    if (transfer.oneTimeDownload && transfer.receivers.size === 0) {
      activeTransfers.delete(fileId);
    }
  }
};