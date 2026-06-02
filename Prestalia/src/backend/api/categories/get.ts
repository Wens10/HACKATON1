import {Context, MIME_TYPES} from "../../core";
import {getCategories} from "../../utils/functions";
import {Pool} from "mysql2/promise";

export default (async (context, _headers, db) => {
  context.respond(200, {
    end: false,
    headers: {"content-type": MIME_TYPES[".json"]},
  });

  return context.end(JSON.stringify(await getCategories(db, {})));
}) satisfies (
  // eslint-disable-next-line no-unused-vars
  context: Context,
  // eslint-disable-next-line no-unused-vars
  headers: Context["headers"],
  // eslint-disable-next-line no-unused-vars
  db: Pool,
) => void;
