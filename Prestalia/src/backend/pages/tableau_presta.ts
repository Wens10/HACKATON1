import {renderFile} from "ejs";
import {
  DEFAULT_EJS_COMPONENT_DIR,
  DEFAULT_EJS_DYNAMIC_PAGE_DIR,
} from "../utils/constants";
import {join} from "path";
import {hasProps} from "../core";
import {cookieToJSON, verifyJWT} from "../utils/functions";
import {PageHandler} from "../utils/types";
import {RowDataPacket} from "mysql2";

export default (async (context, db) => {
  const cookies = cookieToJSON(context.headers.cookie);

  if (!hasProps(cookies, {token: "string"})) throw null;

  const payload = verifyJWT(cookies.token);

  if (payload === false || !hasProps(payload, {userId: "number"})) throw null;

  const [rows] = await db.execute<RowDataPacket[]>(
    "SELECT name, role FROM users WHERE id = ?",
    [payload.userId],
  );

  const user = rows[0];

  if (!user) throw null;
  if (user["role"] !== "provider") throw null;

  return renderFile(
    join(DEFAULT_EJS_DYNAMIC_PAGE_DIR, "tableau_presta.ejs"),
    {user},
    {root: DEFAULT_EJS_COMPONENT_DIR},
  );
}) satisfies PageHandler;
