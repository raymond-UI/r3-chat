"use node";

import { webcrypto } from "crypto";
import { getEncryptionSecret } from "./env";

// Derive encryption key from the master key
async function deriveKey(salt: Uint8Array): Promise<CryptoKey> {
  const ENCRYPTION_KEY = getEncryptionSecret();
  
  const keyMaterial = await webcrypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(ENCRYPTION_KEY),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  return webcrypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

// Utility function to encrypt API key
export async function encryptApiKey(apiKey: string): Promise<string> {
  if (!apiKey) return "";
  
  try {
    // Generate random salt and IV
    const salt = webcrypto.getRandomValues(new Uint8Array(16));
    const iv = webcrypto.getRandomValues(new Uint8Array(12));
    
    // Derive encryption key
    const key = await deriveKey(salt);
    
    // Encrypt the API key
    const encodedKey = new TextEncoder().encode(apiKey);
    const encrypted = await webcrypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      encodedKey
    );
    
    // Combine salt, IV, and encrypted data
    const combined = new Uint8Array(
      salt.length + iv.length + encrypted.byteLength
    );
    combined.set(salt);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(encrypted), salt.length + iv.length);
    
    // Return base64 encoded result
    return Buffer.from(combined).toString("base64");
  } catch (error) {
    console.error("Failed to encrypt API key:", error);
    throw new Error("Encryption failed");
  }
}

// Utility function to decrypt API key
export async function decryptApiKey(encryptedKey: string): Promise<string> {
  if (!encryptedKey) return "";
  
  try {
    // Decode from base64
    const combined = new Uint8Array(Buffer.from(encryptedKey, "base64"));
    
    // Extract salt, IV, and encrypted data
    const salt = combined.slice(0, 16);
    const iv = combined.slice(16, 28);
    const encrypted = combined.slice(28);
    
    // Derive decryption key
    const key = await deriveKey(salt);
    
    // Decrypt the data
    const decrypted = await webcrypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      encrypted
    );
    
    // Return decrypted string
    return new TextDecoder().decode(decrypted);
  } catch (error) {
    console.error("Failed to decrypt API key:", error);
    throw new Error("Decryption failed - key may be corrupted or invalid");
  }
}

// Utility function to mask API key for display
export function maskApiKey(apiKey: string): string {
  if (!apiKey || apiKey.length < 12) return "***";
  
  const start = apiKey.substring(0, 8);
  const end = apiKey.substring(apiKey.length - 4);
  const middle = "*".repeat(Math.min(12, apiKey.length - 12));
  
  return `${start}${middle}${end}`;
}

// Utility function to validate API key format
export function validateApiKeyFormat(
  provider: "openai" | "anthropic" | "google" | "openrouter",
  apiKey: string
): boolean {
  if (!apiKey || typeof apiKey !== "string") return false;
  
  const trimmedKey = apiKey.trim();
  
  switch (provider) {
    case "openai":
      // OpenAI keys start with "sk-" and are 51+ characters
      return /^sk-[a-zA-Z0-9]{48,}$/.test(trimmedKey);
    
    case "anthropic":
      // Anthropic keys start with "sk-ant-" and are 104+ characters
      return /^sk-ant-[a-zA-Z0-9_\-]{95,}$/.test(trimmedKey);
    
    case "google":
      // Google API keys are 39 characters, alphanumeric with some symbols
      return /^[a-zA-Z0-9_\-]{35,45}$/.test(trimmedKey);
    
    case "openrouter":
      // OpenRouter keys start with "sk-or-" and are 64+ characters
      return /^sk-or-[a-zA-Z0-9_\-]{57,}$/.test(trimmedKey);
    
    default:
      return false;
  }
} 