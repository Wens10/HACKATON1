import {createSecureServer} from "http2";
import {MessageTypes} from "../utils/common/enums";
import messageProcessEvent from "../events/workers/process/message";
import {
  createHTTPServer,
  DEFAULT_SECURE_SERVER_OPTIONS,
  hasProps,
  Http1Context,
  Http2Context,
  log,
  workingDirPath,
} from "../../core";
import config from "../config";
import {handleRequest} from "../utils/workers/functions";
import {join} from "path";
import {isAdminExists} from "../../utils/functions";

export default (() => {
  log("Worker lancé");

  const pageParams: any[] = [],
    apiParams: any[] = [];

  try {
    const start: unknown = require(join(workingDirPath, "dist/start/worker"));

    log("START", start);

    if (hasProps(start, {default: "function"}))
      start.default(pageParams, apiParams);
  } catch (error) {
    /* empty */
  }

  log(pageParams, apiParams);

  const secureServer = createSecureServer(DEFAULT_SECURE_SERVER_OPTIONS)
    .on("request", (req, res) => {
      if (req.httpVersionMajor < 2) {
        const context = new Http1Context(req, res);

        if (isAdminExists(context, apiParams))
          handleRequest(context, pageParams, apiParams);
      }
    })
    .on("stream", (stream, headers) => {
      const context = new Http2Context(stream, headers);

      if (isAdminExists(context, apiParams))
        handleRequest(context, pageParams, apiParams);
    });

  createHTTPServer(config.httpPort);

  process
    .on("message", messageProcessEvent.bind(null, secureServer))
    .send?.({type: MessageTypes.RequestCert});
}) satisfies () => void;
