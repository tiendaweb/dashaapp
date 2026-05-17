import { Router } from 'express';
import { requireAuth } from '../middlewares/authMiddleware.js';

export function createEntityRoutes(controller) {
  const r = Router();
  r.get('/saas', requireAuth, controller.saas);
  r.get('/plans', requireAuth, controller.plans);
  r.get('/clients', requireAuth, controller.clients);
  r.get('/subscriptions', requireAuth, controller.subscriptions);
  return r;
}
