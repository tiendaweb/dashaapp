import crypto from 'node:crypto';
import { db } from './db.js';

const SESSION_HOURS = 8;

export const AuthModel = {
  async createSession({ userId, ipAddress, userAgent }) {
    const token = crypto.randomBytes(48).toString('hex');
    const expiresAt = new Date(Date.now() + SESSION_HOURS * 60 * 60 * 1000).toISOString();
    const [id] = await db('auth_sessions').insert({
      user_id: userId,
      token,
      expires_at: expiresAt,
      ip_address: ipAddress,
      user_agent: userAgent
    });
    return { id, token, expires_at: expiresAt };
  },

  findActiveSessionByToken(token) {
    return db('auth_sessions')
      .where({ token })
      .whereNull('revoked_at')
      .where('expires_at', '>', new Date().toISOString())
      .first();
  },

  revokeSession(token) {
    return db('auth_sessions').where({ token }).update({ revoked_at: new Date().toISOString() });
  }
};
