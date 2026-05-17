import { hashPassword } from '../src/utils/password.js';

/** @param {import('knex').Knex} knex */
export async function seed(knex) {
  await knex('auth_sessions').del();
  await knex('role_permissions').del();
  await knex('subscriptions').del();
  await knex('users').del();
  await knex('plan_modules').del();
  await knex('permissions').del();
  await knex('roles').del();
  await knex('modules').del();
  await knex('plans').del();
  await knex('companies').del();

  const [adminRoleId] = await knex('roles').insert({
    name: 'admin',
    description: 'Administrador global'
  });

  const permissions = [
    { code: 'users.manage', description: 'Gestionar usuarios' },
    { code: 'billing.manage', description: 'Gestionar facturación' },
    { code: 'modules.read', description: 'Ver módulos' },
    { code: 'state.manage', description: 'Gestionar estado legacy' }
  ];
  await knex('permissions').insert(permissions);

  const allPermissions = await knex('permissions').select('id');
  await knex('role_permissions').insert(allPermissions.map((permission) => ({ role_id: adminRoleId, permission_id: permission.id })));

  const [companyId] = await knex('companies').insert({
    name: 'Empresa Demo',
    tax_id: 'DEMO-0001',
    email: 'contacto@demo.local'
  });

  const [planId] = await knex('plans').insert({
    name: 'Pro',
    description: 'Plan profesional',
    price_monthly: 99,
    price_yearly: 999
  });

  const moduleRows = [
    { code: 'crm', name: 'CRM' },
    { code: 'billing', name: 'Facturación' },
    { code: 'analytics', name: 'Analítica' }
  ];
  await knex('modules').insert(moduleRows);
  const modules = await knex('modules').select('id');
  await knex('plan_modules').insert(modules.map((moduleRow) => ({ plan_id: planId, module_id: moduleRow.id })));

  await knex('subscriptions').insert({
    company_id: companyId,
    plan_id: planId,
    starts_at: new Date().toISOString().slice(0, 10),
    status: 'active'
  });

  const passwordHash = hashPassword('Admin12345!');

  await knex('users').insert({
    company_id: companyId,
    role_id: adminRoleId,
    full_name: 'Administrador Demo',
    email: 'admin@example.com',
    password_hash: passwordHash,
    is_active: true
  });
}
