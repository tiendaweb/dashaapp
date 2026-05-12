import { ok, fail } from '../utils/http.js';
import { validate } from '../utils/validation.js';

export class AuthController {
  constructor(authService) {
    this.authService = authService;
  }

  login = async (req, res, next) => {
    try {
      const errors = validate({ email: { required: true, type: 'string', email: true }, password: { required: true, type: 'string', min: 8 } }, req.body || {});
      if (errors.length) return fail(res, 'Validación fallida', 422, errors);

      const auth = await this.authService.login(req.body.email, req.body.password, {
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });
      if (!auth) return fail(res, 'Credenciales inválidas', 401);
      return ok(res, auth, 'Login exitoso');
    } catch (e) { return next(e); }
  };

  logout = async (req, res, next) => {
    try {
      await this.authService.logout(req.auth.token);
      return ok(res, null, 'Logout exitoso');
    } catch (e) { return next(e); }
  };

  listUsers = async (_req, res, next) => {
    try { return ok(res, await this.authService.listUsers()); } catch (e) { return next(e); }
  };

  createUser = async (req, res, next) => {
    try {
      const errors = validate({
        full_name: { required: true, type: 'string', min: 3, max: 120 },
        email: { required: true, type: 'string', email: true },
        password: { required: true, type: 'string', min: 8, max: 128 },
        role_id: { required: true },
      }, req.body || {});
      if (errors.length) return fail(res, 'Validación fallida', 422, errors);
      const user = await this.authService.registerUser(req.body);
      return ok(res, user, 'Usuario creado', 201);
    } catch (e) { return next(e); }
  };

  listRoles = async (_req, res, next) => {
    try { return ok(res, await this.authService.listRoles()); } catch (e) { return next(e); }
  };
}
