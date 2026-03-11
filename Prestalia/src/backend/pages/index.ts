import {renderFile} from "ejs";
import {
  DEFAULT_EJS_COMPONENT_DIR,
  DEFAULT_EJS_DYNAMIC_PAGE_DIR,
} from "../utils/constants";
import {join} from "path";
import {Context, hasProps} from "../core";
import {cookieToJSON, verfyJWT} from "../utils/functions";
import {DatabaseSync} from "node:sqlite";

export default (async (context, db) => {
  const cookies = cookieToJSON(context.headers.cookie);

  if (!hasProps(cookies, {token: "string"})) throw null;

  const payload = verfyJWT(cookies.token);

  if (payload === false || !hasProps(payload, {userId: "number"})) throw null;

  const user = db
    .prepare("SELECT name, role FROM users WHERE id = ?")
    .get(payload.userId);

  if (!user) throw null;

  return renderFile(
    join(DEFAULT_EJS_DYNAMIC_PAGE_DIR, "index.ejs"),
    {user},
    {root: DEFAULT_EJS_COMPONENT_DIR},
  );

  // eslint-disable-next-line no-unused-vars
}) satisfies (context: Context, db: DatabaseSync) => string | Promise<string>;
