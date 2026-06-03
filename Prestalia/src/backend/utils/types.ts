import {Context} from "../core";
import {Pool} from "mysql2/promise";

export type PageHandler = (
  // eslint-disable-next-line no-unused-vars
  context: Context,
  // eslint-disable-next-line no-unused-vars
  db: Pool,
) => string | null | Promise<string | null>;

export type PageParams = [Pool];

export type APIParams = [Pool];

export type APIHandler = (
  // eslint-disable-next-line no-unused-vars
  context: Context,
  // eslint-disable-next-line no-unused-vars
  headers: Context["headers"],
  // eslint-disable-next-line no-unused-vars
  ...params: [...APIParams, ...id: number[]]
) => void;
