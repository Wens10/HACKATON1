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
  const cookies = cookieToJSON(context.headers.cookie),
    to = context.url?.searchParams.get("to");

  if (!hasProps(cookies, {token: "string"}))
    return renderFile(
      join(DEFAULT_EJS_DYNAMIC_PAGE_DIR, "auth.ejs"),
      {user: undefined, to},
      {
        root: DEFAULT_EJS_COMPONENT_DIR,
      },
    );

  const payload = verifyJWT(cookies.token);

  if (payload === false || !hasProps(payload, {userId: "number"})) {
    context.respond(307, {
      headers: {
        "location": context.url?.href ?? "/auth",
        "set-cookie":
          "token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Secure; HttpOnly; SameSite=Strict;",
      },
      end: true,
    });

    return null;
  }

  const user = (
    await db.execute<RowDataPacket[]>(
      "SELECT name, role FROM users WHERE id = ?",
      [payload.userId],
    )
  )[0][0];

  return renderFile(
    join(DEFAULT_EJS_DYNAMIC_PAGE_DIR, "auth.ejs"),
    {user, to},
    {
      root: DEFAULT_EJS_COMPONENT_DIR,
    },
  );
}) satisfies PageHandler;
