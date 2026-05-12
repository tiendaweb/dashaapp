import { UserModel } from '../models/userModel.js';
import { AuthModel } from '../models/authModel.js';
import { RoleModel } from '../models/roleModel.js';
import { hashPassword, verifyPassword } from '../utils/password.js';

export class AuthService {
  async login(email, password, meta) {
    const user = await UserModel.findByEmail(email);
    if (!user || !user.is_active) return null;
    if (!verifyPassword(password, user.password_hash)) return null;

    await UserModel.updateLastLogin(user.id);
    const session = await AuthModel.createSession({ userId: user.id, ...meta });
    return { token: session.token, expires_at: session.expires_at, user: await UserModel.findById(user.id) };
  }

  logout(token) {
    return AuthModel.revokeSession(token);
  }

  async registerUser(payload) {
    const password_hash = hashPassword(payload.password);
    const [id] = await UserModel.create({
      company_id: payload.company_id || null,
      role_id: payload.role_id,
      full_name: payload.full_name,
      email: payload.email,
      password_hash,
      is_active: payload.is_active ?? true
    });
    return UserModel.findById(id);
  }

  listUsers() { return UserModel.list(); }
  listRoles() { return RoleModel.list(); }
}
