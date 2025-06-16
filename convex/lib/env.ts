// Environment variables utility for Convex
// This can be imported in both regular and Node.js runtime contexts

export function getEncryptionSecret(): string {
  // In Node.js runtime (actions), use process.env
  if (typeof process !== 'undefined' && process.env) {
    return process.env.API_KEY_ENCRYPTION_SECRET || "fallback-dev-key-32chars-minimum!";
  }
  
  // Fallback for other contexts
  return "fallback-dev-key-32chars-minimum!";
} 