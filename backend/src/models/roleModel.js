import { db } from './db.js';

export const RoleModel = {
  list() {
    return db('roles').select('*').orderBy('id', 'asc');
  },

  permissionsByRoleId(roleId) {
    return db('permissions as p')
      .join('role_permissions as rp', 'rp.permission_id', 'p.id')
      .where('rp.role_id', roleId)
      .select('p.code');
  }
};
