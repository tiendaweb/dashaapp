import { db } from './db.js';

export const UserModel = {
  findByEmail(email) {
    return db('users').where({ email }).first();
  },
  create(user) {
    return db('users').insert(user);
  }
};
