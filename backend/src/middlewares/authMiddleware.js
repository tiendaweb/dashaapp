import { AuthModel } from '../models/authModel.js';
import { UserModel } from '../models/userModel.js';
import { RoleModel } from '../models/roleModel.js';
import { fail } from '../utils/http.js';

export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export async function requireAuth(req, res, next) {
  try {
    const auth = req.headers.authorization || '';
    const [, token] = auth.split(' ');
    if (!token) return fail(res, 'No autenticado', 401);

    const session = await AuthModel.findActiveSessionByToken(token);
    if (!session) return fail(res, 'Token inválido o expirado', 401);

    const user = await UserModel.findById(session.user_id);
    if (!user || !user.is_active) return fail(res, 'Usuario no disponible', 401);

    const permissions = await RoleModel.permissionsByRoleId(user.role_id);
    req.auth = { user, token, permissions: permissions.map((p) => p.code) };
    return next();
  } catch (error) {
    return next(error);
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.auth?.user) return fail(res, 'No autenticado', 401);
    if (!roles.includes(req.auth.user.role_name)) return fail(res, 'No autorizado', 403);
    return next();
  };
}

export function requirePermission(...codes) {
  return (req, res, next) => {
    if (!req.auth?.user) return fail(res, 'No autenticado', 401);
    const has = codes.every((code) => req.auth.permissions.includes(code));
    if (!has) return fail(res, 'Permisos insuficientes', 403);
    return next();
  };
}
