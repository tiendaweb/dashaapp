import { Router } from 'express';

export function createStateRoutes(stateController) {
  const router = Router();

  // Endpoints legacy basados en state.json (no representan entidades SQL del dominio SaaS)
  router.get('/state', stateController.load);
  router.post('/state', stateController.save);
  router.post('/state/reset', stateController.reset);

  // Alias explícito para separar claramente este dominio legacy del resto de endpoints.
  router.get('/legacy/state', stateController.load);
  router.post('/legacy/state', stateController.save);
  router.post('/legacy/state/reset', stateController.reset);

  return router;
}
