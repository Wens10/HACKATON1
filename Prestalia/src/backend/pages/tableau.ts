import {renderFile} from "ejs";
import {
  DEFAULT_EJS_COMPONENT_DIR,
  DEFAULT_EJS_DYNAMIC_PAGE_DIR,
} from "../utils/constants";
import {join} from "path";
import {hasProps} from "../core";
import {cookieToJSON, verfyJWT} from "../utils/functions";
import {PageHandler} from "../utils/types";

export default (async (context, db) => {
  const cookies = cookieToJSON(context.headers.cookie);

  if (!hasProps(cookies, {token: "string"})) throw null;

  const payload = verfyJWT(cookies.token);

  if (payload === false || !hasProps(payload, {userId: "number"})) throw null;

  const user = db
    .prepare("SELECT name, role, email FROM users WHERE id = ?")
    .get(payload.userId);

  if (!user) throw null;

  return renderFile(
    join(DEFAULT_EJS_DYNAMIC_PAGE_DIR, "tableau.ejs"),
    {user},
    {root: DEFAULT_EJS_COMPONENT_DIR},
  );
}) satisfies PageHandler;
