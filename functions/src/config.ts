import { readFileSync } from 'fs';
import { join } from 'path';

// Configuration for Enable Banking API
// In emulator mode, reads from environment variables and local files
// In production, uses Firebase Secrets Manager (set via environment)

const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true';

// Helper to get config value from env or default
function getEnvOrDefault(envVar: string, defaultValue: string): string {
  return process.env[envVar] ?? defaultValue;
}

// Cache for private key
let privateKeyCache: string | null = null;

// Config values
export const config = {
  get enableBankingPrivateKey(): string {
    // Return cached value if available
    if (privateKeyCache) {
      return privateKeyCache;
    }

    // Try environment variable first
    const key = process.env.ENABLE_BANKING_PRIVATE_KEY;
    if (key) {
      privateKeyCache = key;
      return key;
    }

    // For local development, try reading from PEM file
    if (isEmulator) {
      const pemPath = process.env.ENABLE_BANKING_KEY_PATH;
      if (pemPath) {
        try {
          privateKeyCache = readFileSync(pemPath, 'utf-8');
          return privateKeyCache;
        } catch (e) {
          console.error('Failed to read private key file:', e);
        }
      }
    }

    throw new Error('ENABLE_BANKING_PRIVATE_KEY not configured. Set the environment variable or ENABLE_BANKING_KEY_PATH to point to a .pem file.');
  },
  get enableBankingAppId(): string {
    const id = process.env.ENABLE_BANKING_APP_ID;
    if (!id) {
      throw new Error('ENABLE_BANKING_APP_ID not configured');
    }
    return id.trim(); // Remove any trailing newlines
  },
  get enableBankingApiUrl(): string {
    return getEnvOrDefault('ENABLE_BANKING_API_URL', 'https://api.enablebanking.com').trim();
  },
  get appUrl(): string {
    return getEnvOrDefault('APP_URL', isEmulator ? 'http://localhost:5173' : 'https://free-lunch-85447.web.app');
  },
};
