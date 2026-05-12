import { ok } from '../utils/http.js';

export class EntityController {
  constructor(stateService) { this.stateService = stateService; }
  list = (key) => async (_req, res, next) => {
    try {
      const state = await this.stateService.load();
      return ok(res, state[key] || []);
    } catch (e) { return next(e); }
  };
  subscriptions = async (_req, res, next) => {
    try {
      const state = await this.stateService.load();
      const data = (state.clients || []).map((c) => ({ id: c.id, clientId: c.id, planId: c.planId, extraIds: c.extraIds || [], status: 'active' }));
      return ok(res, data);
    } catch (e) { return next(e); }
  };
}
