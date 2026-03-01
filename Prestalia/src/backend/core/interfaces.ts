import {Site} from "./types.js";

export interface Types {
  array: unknown[];
  buffer: Buffer;
  cert: Cert;
  null: null;
  object: Record<string | number | symbol, unknown>;
  site: Site;
  unknown: unknown;
  // Types par défaut avec typeof (sauf object)
  bigint: bigint;
  boolean: boolean;
  // eslint-disable-next-line no-unused-vars
  function: (...args: unknown[]) => unknown;
  number: number;
  string: string;
  symbol: symbol;
  undefined: undefined;
}

export interface Cert {
  key: Buffer;
  cert: Buffer;
}
