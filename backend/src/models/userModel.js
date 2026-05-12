import { db } from './db.js';

export const UserModel = {
  findByEmail(email) {
    return db('users').where({ email }).first();
  },

  findById(id) {
    return db('users as u')
      .leftJoin('roles as r', 'r.id', 'u.role_id')
      .where('u.id', id)
      .select('u.id', 'u.full_name', 'u.email', 'u.role_id', 'u.company_id', 'u.is_active', 'r.name as role_name')
      .first();
  },

  list() {
    return db('users as u')
      .leftJoin('roles as r', 'r.id', 'u.role_id')
      .select('u.id', 'u.full_name', 'u.email', 'u.role_id', 'u.company_id', 'u.is_active', 'r.name as role_name')
      .orderBy('u.id', 'asc');
  },

  create(user) {
    return db('users').insert(user);
  },

  updateLastLogin(id) {
    return db('users').where({ id }).update({ last_login_at: new Date().toISOString() });
  }
};
