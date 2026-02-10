import {createSecureServer} from "http2";
import {MessageTypes} from "../utils/common/enums";
import messageProcessEvent from "../events/workers/process/message";
import {
  createHTTPServer,
  DEFAULT_SECURE_SERVER_OPTIONS,
  Http1Context,
  Http2Context,
  log,
} from "@server/core";
import config from "../config";
import {handleRequest} from "../utils/workers/functions";

export default (() => {
  log("Worker lancé");

  const secureServer = createSecureServer(DEFAULT_SECURE_SERVER_OPTIONS)
    .on("request", (req, res) => {
      if (req.httpVersionMajor < 2)
        handleRequest(new Http1Context(req, res), [], []);
    })
    .on("stream", (stream, headers) =>
      handleRequest(new Http2Context(stream, headers), [], []),
    );

  createHTTPServer(config.httpPort);

  process
    .on("message", messageProcessEvent.bind(null, secureServer))
    .send?.({type: MessageTypes.RequestCert});
}) satisfies () => void;
