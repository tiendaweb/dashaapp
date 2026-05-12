import knex from 'knex';

const DEFAULT_DB_PATH = 'backend/data/app.sqlite';

export const createDb = (dbFile = process.env.SQLITE_FILE || DEFAULT_DB_PATH) =>
  knex({
    client: 'sqlite3',
    connection: { filename: dbFile },
    useNullAsDefault: true,
    pool: {
      afterCreate: (conn, done) => {
        conn.run('PRAGMA foreign_keys = ON', done);
      }
    }
  });

export const db = createDb();
