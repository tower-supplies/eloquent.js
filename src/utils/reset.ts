import { TDatabase } from '../types';

type TTableNames = {
  name: string;
}[];

const reset = async (database: TDatabase) => {
  const tables = database.all("SELECT name FROM sqlite_master WHERE type='table'") as TTableNames;
  if (tables.length) {
    tables.map(({ name }) => {
      switch (name) {
        case '__drizzle_migrations':
          /**
           * Responsible for the Drizzle migrations; at some point we might want to do something a little nicer
           * with this, e.g. undo(rollback) a single migration etc. but for now lets delete all rows.
           */
          database.run(`DELETE FROM '${name}'`);
          break;

        case 'sqlite_sequence':
          /**
           * Responsible for maintaining the AUTOINCREMENT values.  If we're resetting all the tables, and
           * '__drizzle_migrations' doesn't use AUTOINCREMENT, then all rows may be deleted.
           */
          database.run(`DELETE FROM '${name}'`);
          break;

        default:
          // Remove other tables
          database.run(`DROP TABLE '${name}'`);
          break;
      }
    });
  }
};

export default reset;
