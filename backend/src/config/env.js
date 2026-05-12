export const env = {
  port: Number(process.env.PORT || 3000),
  stateFile: process.env.STATE_FILE || 'backend/data/state.json',
  sqliteFile: process.env.SQLITE_FILE || 'backend/data/app.sqlite'
};
