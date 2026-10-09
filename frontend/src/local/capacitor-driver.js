// Low-level driver for the app: the Capacitor SQLite plugin (native SQLite on the terminal).
import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite';

const DB_NAME = 'fortunetiles';

export async function createCapacitorDriver() {
  const sqlite = new SQLiteConnection(CapacitorSQLite);
  const consistent = (await sqlite.checkConnectionsConsistency()).result;
  const exists = (await sqlite.isConnection(DB_NAME, false)).result;
  const db = consistent && exists
    ? await sqlite.retrieveConnection(DB_NAME, false)
    : await sqlite.createConnection(DB_NAME, false, 'no-encryption', 1, false);
  await db.open();

  return {
    // transaction=false everywhere: Sequelize issues its own BEGIN/COMMIT through begin()/commit().
    run: async (sql, values) => {
      const r = await db.run(sql, values, false, 'no');
      const c = (r && r.changes) || {};
      return { changes: c.changes || 0, lastId: c.lastId || 0 };
    },
    all: async (sql, values) => {
      const r = await db.query(sql, values);
      return (r && r.values) || [];
    },
    begin: async () => { await db.beginTransaction(); },
    commit: async () => { await db.commitTransaction(); },
    rollback: async () => { await db.rollbackTransaction(); },
  };
}
