import {createPool} from "mysql2/promise";
import {APIParams, PageParams} from "../utils/types";
import config from "../config";

export default (() => {
  const db = createPool({
    host: config.mysqlHost,
    user: config.mysqlUser,
    password: config.mysqlPassword,
    database: "prestalia",
  });

  return [[db], [db]];
}) satisfies () => [PageParams, APIParams];
