import { Router } from 'express';
import { requireAuth } from '../middlewares/authMiddleware.js';

export function createEntityRoutes(controller) {
  const r = Router();
  r.get('/saas', requireAuth, controller.list('saas'));
  r.get('/plans', requireAuth, controller.list('plans'));
  r.get('/clients', requireAuth, controller.list('clients'));
  r.get('/subscriptions', requireAuth, controller.subscriptions);
  return r;
}
