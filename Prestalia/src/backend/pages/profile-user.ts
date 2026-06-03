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
  const cookies = cookieToJSON(context.headers.cookie);

  if (!hasProps(cookies, {token: "string"})) {
    context.respond(307, {
      headers: {
        "location": "/",
        "set-cookie": CLEAR_TOKEN_COOKIE,
      },
      end: true,
    });

    return null;
  }

  const payload = verifyJWT(cookies.token);

  if (payload === false || !hasProps(payload, {userId: "number"})) {
    context.respond(307, {
      headers: {
        "location": "/",
        "set-cookie": CLEAR_TOKEN_COOKIE,
      },
      end: true,
    });

    return null;
  }

  const [rows] = await db.execute<RowDataPacket[]>(
    "SELECT name, role, email, created_at FROM users WHERE id = ?",
    [payload.userId],
  );

  const user = rows[0];

  if (!user) {
    context.respond(307, {
      headers: {
        "location": "/",
        "set-cookie": CLEAR_TOKEN_COOKIE,
      },
      end: true,
    });

    return null;
  }

  return renderFile(
    join(DEFAULT_EJS_DYNAMIC_PAGE_DIR, "profile-user.ejs"),
    {user},
    {root: DEFAULT_EJS_COMPONENT_DIR},
  );
}) satisfies PageHandler;
