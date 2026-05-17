import { db } from './db.js';

export class SubscriptionModel {
  static async list() {
    return db('subscriptions as s')
      .join('companies as c', 'c.id', 's.company_id')
      .join('plans as p', 'p.id', 's.plan_id')
      .select(
        's.id',
        's.company_id as clientId',
        's.plan_id as planId',
        's.status',
        's.starts_at',
        's.ends_at',
        'c.name as clientName',
        'p.name as planName'
      )
      .orderBy('s.id', 'asc');
  }
}
