import jwt from 'jsonwebtoken';

export interface JWTConfig {
  privateKey: string;
  applicationId: string;
  apiUrl?: string;
}

export function generateJWT(config: JWTConfig): string {
  const now = Math.floor(Date.now() / 1000);

  // Enable Banking uses the same issuer/audience for sandbox and production
  const payload = {
    iss: 'enablebanking.com',
    aud: 'api.enablebanking.com',
    iat: now,
    exp: now + 3600, // 1 hour
  };

  const options: jwt.SignOptions = {
    algorithm: 'RS256',
    header: {
      typ: 'JWT',
      alg: 'RS256',
      kid: config.applicationId,
    },
  };

  return jwt.sign(payload, config.privateKey, options);
}
