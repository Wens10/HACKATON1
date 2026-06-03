import {MIME_TYPES} from "../../core";
import {getCategories} from "../../utils/functions";
import {APIHandler} from "../../utils/types";

export default (async (context, _headers, db) => {
  context.respond(200, {
    end: false,
    headers: {"content-type": MIME_TYPES[".json"]},
  });

  return context.end(JSON.stringify(await getCategories(db, {})));
}) satisfies APIHandler;
