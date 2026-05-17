import { db } from './db.js';

export class PlanModel {
  static async list() {
    return db('plans')
      .select('id', 'name', 'description', 'price_monthly', 'price_yearly', 'active')
      .orderBy('id', 'asc');
  }
}
