// Web Crypto API helpers for encryption, hashing, and native compression

// Calculate SHA-256 hash of an ArrayBuffer
export const calculateHash = async (arrayBuffer, forceFallback = false) => {
  if (!crypto.subtle || forceFallback) {
    console.warn('Using fallback hash algorithm.');
    const view = new Uint8Array(arrayBuffer);
    let hash = 2166136261;
    for (let i = 0; i < view.length; i++) {
      hash ^= view[i];
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
  }
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

// Derive key from password using PBKDF2
export const deriveKeyFromPassword = async (password, salt, forceFallback = false) => {
  if (!crypto.subtle || forceFallback) {
    console.warn('Using fallback key derivation.');
    return { isFallback: true, password };
  }
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
export const encryptBuffer = async (arrayBuffer, key, iv, forceFallback = false) => {
  if (!crypto.subtle || key?.isFallback || forceFallback) {
    console.warn('Using fallback encryption cipher.');
    const view = new Uint8Array(arrayBuffer);
    const encrypted = new Uint8Array(view.length);
    const keyStr = key?.password || 'fallback';
    for (let i = 0; i < view.length; i++) {
      encrypted[i] = view[i] ^ keyStr.charCodeAt(i % keyStr.length);
    }
    return encrypted.buffer;
  }
  return crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    arrayBuffer
  );
};

// Decrypt ArrayBuffer using AES-GCM
export const decryptBuffer = async (arrayBuffer, key, iv, forceFallback = false) => {
  if (!crypto.subtle || key?.isFallback || forceFallback) {
    console.warn('Using fallback decryption cipher.');
    const view = new Uint8Array(arrayBuffer);
    const decrypted = new Uint8Array(view.length);
    const keyStr = key?.password || 'fallback';
    for (let i = 0; i < view.length; i++) {
      decrypted[i] = view[i] ^ keyStr.charCodeAt(i % keyStr.length);
    }
    return decrypted.buffer;
  }
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

// Convert a hex string to a Uint8Array (e.g. from stored IV/salt)
export const hexToBuf = (hex) => {
  const buf = new Uint8Array(hex.length / 2);
  for (let i = 0; i < buf.length; i++) {
    buf[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return buf;
};

// Derive a per-chunk IV by XOR-ing the base IV with the chunk index.
// This ensures every chunk is encrypted with a unique nonce while
// the receiver can reproduce the same IV without extra data in the stream.
export const deriveChunkIv = (baseIv, chunkIndex) => {
  const chunkIv = new Uint8Array(baseIv);
  // Write chunkIndex into the last 4 bytes (big-endian XOR)
  chunkIv[8]  ^= (chunkIndex >>> 24) & 0xff;
  chunkIv[9]  ^= (chunkIndex >>> 16) & 0xff;
  chunkIv[10] ^= (chunkIndex >>>  8) & 0xff;
  chunkIv[11] ^=  chunkIndex         & 0xff;
  return chunkIv;
};
