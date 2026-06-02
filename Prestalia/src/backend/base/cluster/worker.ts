import {createSecureServer, ServerHttp2Stream} from "http2";
import {MessageTypes} from "../utils/common/enums";
import messageProcessEvent from "../events/workers/process/message";
import {
  createHTTPServer,
  DEFAULT_SECURE_SERVER_OPTIONS,
  Http1Context,
  Http2Context,
  log,
} from "../../core";
import config from "../../config";
import {handleRequest} from "../utils/workers/functions";
import {isAdminExists, isDataRequest} from "../../utils/functions";
import start from "../../start/worker";
export default (() => {
  log("Worker lancé");

  const [pageParams, apiParams] = start();

  const secureServer = createSecureServer(DEFAULT_SECURE_SERVER_OPTIONS)
    .on("request", async (req, res) => {
      if (req.httpVersionMajor < 2) {
        const context = new Http1Context(req, res);

        if (
          (await isAdminExists(context, apiParams)) &&
          !isDataRequest(context)
        )
          handleRequest(context, pageParams, apiParams);
      }
    })
    .on("stream", async (stream, headers) => {
      const context = new Http2Context(stream as ServerHttp2Stream, headers);

      if ((await isAdminExists(context, apiParams)) && !isDataRequest(context))
        handleRequest(context, pageParams, apiParams);
    });

  createHTTPServer(config.httpPort, config.httpsPort);

  process
    .on("message", messageProcessEvent.bind(null, secureServer))
    .send?.({type: MessageTypes.RequestCert});
}) satisfies () => void;
