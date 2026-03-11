import {join} from "path";
import {workingDirPath} from "../core";
import {DatabaseSync} from "node:sqlite";

export default ((pageParams, apiParams) => {
  const db = new DatabaseSync(join(workingDirPath, "database.db"));

  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    PRAGMA foreign_keys = ON;
  `);

  pageParams.push(db);
  apiParams.push(db);

  // eslint-disable-next-line no-unused-vars
}) satisfies (pageParams: any[], apiParams: any[]) => void;
