import {renderFile} from "ejs";
import {
  CLEAR_TOKEN_COOKIE,
  DEFAULT_EJS_COMPONENT_DIR,
  DEFAULT_EJS_DYNAMIC_PAGE_DIR,
} from "../utils/constants";
import {join} from "path";
import {hasProps} from "../core";
import {cookieToJSON, verifyJWT} from "../utils/functions";
import {PageHandler} from "../utils/types";
import {RowDataPacket} from "mysql2";

export default (async (context, db) => {
  const data: Record<string, any> = {};

  const cookies = cookieToJSON(context.headers.cookie);

  if (hasProps(cookies, {token: "string"})) {
    const payload = verifyJWT(cookies.token);

    if (!hasProps(payload, {userId: "number"})) {
      context.respond(307, {
        headers: {
          "location": "/a-propos",
          "set-cookie": CLEAR_TOKEN_COOKIE,
        },
        end: true,
      });
      return null;
    }

    const [rows] = await db.execute<RowDataPacket[]>(
      "SELECT name, role FROM users WHERE id = ?",
      [payload.userId],
    );

    const user = rows[0];

    if (user) data["user"] = user;
  }

  return renderFile(join(DEFAULT_EJS_DYNAMIC_PAGE_DIR, "a-propos.ejs"), data, {
    root: DEFAULT_EJS_COMPONENT_DIR,
  });
}) satisfies PageHandler;
