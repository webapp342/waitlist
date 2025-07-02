import bcrypt from 'bcryptjs';
import * as jose from 'jose';

// JWT secret key - In production, use environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
const CRYPTO_SECRET = process.env.CRYPTO_SECRET || 'your-crypto-secret-key-change-this-in-production';

export interface AuthToken {
  walletAddress: string;
  timestamp: number;
  exp?: number;
  [key: string]: string | number | undefined; // Add index signature for jose compatibility
}

// Password hashing
export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
};

export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

// JWT token functions using jose
export const generateToken = async (walletAddress: string): Promise<string> => {
  const secret = new TextEncoder().encode(JWT_SECRET);
  const payload: AuthToken = {
    walletAddress: walletAddress.toLowerCase(),
    timestamp: Date.now(),
  };
  
  return await new jose.SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(secret);
};

export const verifyToken = async (token: string): Promise<AuthToken | null> => {
  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jose.jwtVerify(token, secret);
    // Type assertion with unknown first for safety
    return payload as unknown as AuthToken;
  } catch (error) {
    return null;
  }
};

// Simple XOR cipher for encryption/decryption
function xorCipher(text: string, key: string): string {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return result;
}

// Encrypt/Decrypt for localStorage using simple XOR cipher and base64
export const encryptData = (data: string): string => {
  const encrypted = xorCipher(data, CRYPTO_SECRET);
  return btoa(encrypted);
};

export const decryptData = (encryptedData: string): string => {
  const decoded = atob(encryptedData);
  return xorCipher(decoded, CRYPTO_SECRET);
};

// Password strength validation
export const validatePasswordStrength = (password: string): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}; 