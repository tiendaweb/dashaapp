/** @param {import('knex').Knex} knex */
export async function up(knex) {
  await knex.schema.createTable('roles', (table) => {
    table.increments('id').primary();
    table.string('name', 80).notNullable().unique();
    table.string('description', 255);
    table.timestamps(true, true);
  });

  await knex.schema.createTable('permissions', (table) => {
    table.increments('id').primary();
    table.string('code', 100).notNullable().unique();
    table.string('description', 255);
    table.timestamps(true, true);
  });

  await knex.schema.createTable('role_permissions', (table) => {
    table.increments('id').primary();
    table.integer('role_id').notNullable().references('id').inTable('roles').onDelete('CASCADE');
    table.integer('permission_id').notNullable().references('id').inTable('permissions').onDelete('CASCADE');
    table.unique(['role_id', 'permission_id']);
  });

  await knex.schema.createTable('companies', (table) => {
    table.increments('id').primary();
    table.string('name', 160).notNullable();
    table.string('tax_id', 50).unique();
    table.string('email', 120);
    table.string('phone', 40);
    table.string('status', 30).notNullable().defaultTo('active');
    table.timestamps(true, true);
  });

  await knex.schema.createTable('plans', (table) => {
    table.increments('id').primary();
    table.string('name', 100).notNullable().unique();
    table.text('description');
    table.decimal('price_monthly', 10, 2).notNullable().defaultTo(0);
    table.decimal('price_yearly', 10, 2).notNullable().defaultTo(0);
    table.boolean('active').notNullable().defaultTo(true);
    table.timestamps(true, true);
  });

  await knex.schema.createTable('modules', (table) => {
    table.increments('id').primary();
    table.string('code', 80).notNullable().unique();
    table.string('name', 120).notNullable();
    table.text('description');
    table.timestamps(true, true);
  });

  await knex.schema.createTable('plan_modules', (table) => {
    table.increments('id').primary();
    table.integer('plan_id').notNullable().references('id').inTable('plans').onDelete('CASCADE');
    table.integer('module_id').notNullable().references('id').inTable('modules').onDelete('CASCADE');
    table.unique(['plan_id', 'module_id']);
  });

  await knex.schema.createTable('users', (table) => {
    table.increments('id').primary();
    table.integer('company_id').references('id').inTable('companies').onDelete('SET NULL');
    table.integer('role_id').notNullable().references('id').inTable('roles');
    table.string('full_name', 120).notNullable();
    table.string('email', 120).notNullable().unique();
    table.string('password_hash', 255).notNullable();
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('last_login_at');
    table.timestamps(true, true);
  });

  await knex.schema.createTable('subscriptions', (table) => {
    table.increments('id').primary();
    table.integer('company_id').notNullable().references('id').inTable('companies').onDelete('CASCADE');
    table.integer('plan_id').notNullable().references('id').inTable('plans');
    table.date('starts_at').notNullable();
    table.date('ends_at');
    table.string('status', 30).notNullable().defaultTo('active');
    table.timestamps(true, true);
  });

  await knex.schema.createTable('auth_sessions', (table) => {
    table.increments('id').primary();
    table.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('token', 255).notNullable().unique();
    table.string('refresh_token', 255).unique();
    table.datetime('expires_at').notNullable();
    table.datetime('revoked_at');
    table.string('ip_address', 50);
    table.string('user_agent', 255);
    table.timestamps(true, true);
  });
}

/** @param {import('knex').Knex} knex */
export async function down(knex) {
  await knex.schema.dropTableIfExists('auth_sessions');
  await knex.schema.dropTableIfExists('subscriptions');
  await knex.schema.dropTableIfExists('users');
  await knex.schema.dropTableIfExists('plan_modules');
  await knex.schema.dropTableIfExists('modules');
  await knex.schema.dropTableIfExists('plans');
  await knex.schema.dropTableIfExists('companies');
  await knex.schema.dropTableIfExists('role_permissions');
  await knex.schema.dropTableIfExists('permissions');
  await knex.schema.dropTableIfExists('roles');
}
