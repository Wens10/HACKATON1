import {Context, MIME_TYPES} from "../../core";
import {DatabaseSync} from "node:sqlite";
import {getCategories} from "../../utils/functions";

export default ((context, _headers, db) => {
  context.respond(200, {
    end: false,
    headers: {"content-type": MIME_TYPES[".json"]},
  });

  return context.end(JSON.stringify(getCategories(db, {})));
}) satisfies (
  // eslint-disable-next-line no-unused-vars
  context: Context,
  // eslint-disable-next-line no-unused-vars
  headers: Context["headers"],
  // eslint-disable-next-line no-unused-vars
  db: DatabaseSync,
) => void;
