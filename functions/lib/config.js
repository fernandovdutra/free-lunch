'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.config = void 0;
const fs_1 = require('fs');
// Configuration for Enable Banking API
// In emulator mode, reads from environment variables and local files
// In production, uses Firebase Secrets Manager (set via environment)
const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true';
// Helper to get config value from env or default
function getEnvOrDefault(envVar, defaultValue) {
  return process.env[envVar] ?? defaultValue;
}
// Cache for private key
let privateKeyCache = null;
// Config values
exports.config = {
  get enableBankingPrivateKey() {
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
          privateKeyCache = (0, fs_1.readFileSync)(pemPath, 'utf-8');
          return privateKeyCache;
        } catch (e) {
          console.error('Failed to read private key file:', e);
        }
      }
    }
    throw new Error(
      'ENABLE_BANKING_PRIVATE_KEY not configured. Set the environment variable or ENABLE_BANKING_KEY_PATH to point to a .pem file.'
    );
  },
  get enableBankingAppId() {
    const id = process.env.ENABLE_BANKING_APP_ID;
    if (!id) {
      throw new Error('ENABLE_BANKING_APP_ID not configured');
    }
    return id.trim(); // Remove any trailing newlines
  },
  get enableBankingApiUrl() {
    return getEnvOrDefault('ENABLE_BANKING_API_URL', 'https://api.enablebanking.com').trim();
  },
  get appUrl() {
    return getEnvOrDefault(
      'APP_URL',
      isEmulator ? 'http://localhost:5173' : 'https://free-lunch-85447.web.app'
    );
  },
};
//# sourceMappingURL=config.js.map
