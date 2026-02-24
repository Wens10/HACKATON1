import {createSecureServer} from "http2";
import {MessageTypes} from "../utils/common/enums";
import messageProcessEvent from "../events/workers/process/message";
import {
  createHTTPServer,
  DEFAULT_SECURE_SERVER_OPTIONS,
  Http1Context,
  Http2Context,
  log,
  workingDirPath,
} from "@server/core";
import config from "../config";
import {handleRequest} from "../utils/workers/functions";
import {join} from "path";
import {DatabaseSync} from "node:sqlite";

export default (() => {
  const db = new DatabaseSync(join(workingDirPath, "database.db"));

  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    PRAGMA foreign_keys = ON;
  `);

  log("Worker lancé");

  const secureServer = createSecureServer(DEFAULT_SECURE_SERVER_OPTIONS)
    .on("request", (req, res) => {
      if (req.httpVersionMajor < 2)
        handleRequest(new Http1Context(req, res), [], [db]);
    })
    .on("stream", (stream, headers) =>
      handleRequest(new Http2Context(stream, headers), [], [db]),
    );

  createHTTPServer(config.httpPort);

  process
    .on("message", messageProcessEvent.bind(null, secureServer))
    .send?.({type: MessageTypes.RequestCert});
}) satisfies () => void;
