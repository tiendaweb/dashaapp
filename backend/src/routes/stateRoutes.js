import { Router } from 'express';
import { requireAuth, requirePermission } from '../middlewares/authMiddleware.js';

export function createStateRoutes(stateController) {
  const router = Router();

  // Endpoints legacy basados en state.json (no representan entidades SQL del dominio SaaS)
  router.get('/state', requireAuth, requirePermission('state.manage'), stateController.load);
  router.post('/state', requireAuth, requirePermission('state.manage'), stateController.save);
  router.post('/state/reset', requireAuth, requirePermission('state.manage'), stateController.reset);

  // Alias explícito para separar claramente este dominio legacy del resto de endpoints.
  router.get('/legacy/state', requireAuth, requirePermission('state.manage'), stateController.load);
  router.post('/legacy/state', requireAuth, requirePermission('state.manage'), stateController.save);
  router.post('/legacy/state/reset', requireAuth, requirePermission('state.manage'), stateController.reset);

  return router;
}
