import {DatabaseSync} from "node:sqlite";
import {Context} from "../core";

export type PageHandler = (
  // eslint-disable-next-line no-unused-vars
  context: Context,
  // eslint-disable-next-line no-unused-vars
  db: DatabaseSync,
) => string | null | Promise<string | null>;
