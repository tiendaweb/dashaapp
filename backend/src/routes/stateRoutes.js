import { Router } from 'express';

export function createStateRoutes(stateController) {
  const router = Router();

  router.get('/state', stateController.load);
  router.post('/state', stateController.save);
  router.post('/state/reset', stateController.reset);

  return router;
}
