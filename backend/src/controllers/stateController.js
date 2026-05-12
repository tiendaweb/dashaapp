import { ok } from '../utils/http.js';

export class StateController {
  constructor(stateService) {
    this.stateService = stateService;
  }

  load = async (_req, res, next) => {
    try {
      const state = await this.stateService.load();
      return ok(res, state, 'Estado cargado');
    } catch (err) {
      return next(err);
    }
  };

  save = async (req, res, next) => {
    try {
      const state = await this.stateService.save(req.body || {});
      return ok(res, state, 'Estado guardado');
    } catch (err) {
      return next(err);
    }
  };

  reset = async (_req, res, next) => {
    try {
      const state = await this.stateService.reset();
      return ok(res, state, 'Estado reiniciado');
    } catch (err) {
      return next(err);
    }
  };
}
