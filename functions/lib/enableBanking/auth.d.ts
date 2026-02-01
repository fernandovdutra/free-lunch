export interface JWTConfig {
  privateKey: string;
  applicationId: string;
}
export declare function generateJWT(config: JWTConfig): string;
