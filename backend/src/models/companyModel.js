import { db } from './db.js';

export class CompanyModel {
  static async list() {
    return db('companies').select('id', 'name', 'tax_id', 'email', 'phone', 'status').orderBy('id', 'asc');
  }
}
