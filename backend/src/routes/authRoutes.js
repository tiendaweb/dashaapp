import { Router } from 'express';
import { requireAuth, requirePermission, requireRole } from '../middlewares/authMiddleware.js';

export function createAuthRoutes(controller) {
  const router = Router();

  router.post('/auth/login', controller.login);
  router.post('/auth/logout', requireAuth, controller.logout);

  router.get('/users', requireAuth, requirePermission('users.manage'), controller.listUsers);
  router.post('/users', requireAuth, requireRole('admin'), controller.createUser);

  router.get('/roles', requireAuth, requirePermission('users.manage'), controller.listRoles);

  return router;
}
