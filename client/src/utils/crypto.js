// Web Crypto API helpers for encryption, hashing, and native compression

// Calculate SHA-256 hash of an ArrayBuffer
export const calculateHash = async (arrayBuffer) => {
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

// Derive key from password using PBKDF2
export const deriveKeyFromPassword = async (password, salt) => {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
};

// Encrypt ArrayBuffer using AES-GCM
export const encryptBuffer = async (arrayBuffer, key, iv) => {
  return crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    arrayBuffer
  );
};

// Decrypt ArrayBuffer using AES-GCM
export const decryptBuffer = async (arrayBuffer, key, iv) => {
  return crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    arrayBuffer
  );
};

// Compress ArrayBuffer using browser native CompressionStream
export const compressBuffer = async (arrayBuffer) => {
  const stream = new Response(arrayBuffer).body.pipeThrough(new CompressionStream('gzip'));
  return new Response(stream).arrayBuffer();
};

// Decompress ArrayBuffer using browser native DecompressionStream
export const decompressBuffer = async (arrayBuffer) => {
  const stream = new Response(arrayBuffer).body.pipeThrough(new DecompressionStream('gzip'));
  return new Response(stream).arrayBuffer();
};

// Check if file is compressible based on its extension
export const shouldCompress = (fileName) => {
  const extension = fileName.split('.').pop().toLowerCase();
  const uncompressible = ['zip', 'rar', '7z', 'jpg', 'jpeg', 'png', 'gif', 'mp4', 'avi', 'mp3', 'wav', 'pdf', 'gz'];
  return !uncompressible.includes(extension);
};
