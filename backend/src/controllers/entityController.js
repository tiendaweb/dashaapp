import { ok } from '../utils/http.js';

export class EntityController {
  constructor({ companyModel, planModel, subscriptionModel }) {
    this.companyModel = companyModel;
    this.planModel = planModel;
    this.subscriptionModel = subscriptionModel;
  }

  saas = async (_req, res, next) => {
    try {
      const data = await this.companyModel.list();
      return ok(res, data);
    } catch (e) { return next(e); }
  };

  plans = async (_req, res, next) => {
    try {
      const data = await this.planModel.list();
      return ok(res, data);
    } catch (e) { return next(e); }
  };

  clients = async (_req, res, next) => {
    try {
      const data = await this.companyModel.list();
      return ok(res, data);
    } catch (e) { return next(e); }
  };

  subscriptions = async (_req, res, next) => {
    try {
      const rows = await this.subscriptionModel.list();
      const data = rows.map(({ id, clientId, planId, status }) => ({ id, clientId, planId, extraIds: [], status }));
      return ok(res, data);
    } catch (e) { return next(e); }
  };
}
