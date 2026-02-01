"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateJWT = generateJWT;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
function generateJWT(config) {
    const now = Math.floor(Date.now() / 1000);
    // Enable Banking uses the same issuer/audience for sandbox and production
    const payload = {
        iss: 'enablebanking.com',
        aud: 'api.enablebanking.com',
        iat: now,
        exp: now + 3600, // 1 hour
    };
    const options = {
        algorithm: 'RS256',
        header: {
            typ: 'JWT',
            alg: 'RS256',
            kid: config.applicationId,
        },
    };
    return jsonwebtoken_1.default.sign(payload, config.privateKey, options);
}
//# sourceMappingURL=auth.js.map